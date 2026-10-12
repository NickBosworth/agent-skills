/** Local-only workbench. Host, origin and session checks apply before any API handler. */
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createServer, type IncomingMessage } from "node:http";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";
import { z } from "zod";
import { explainError } from "./messages.ts";
import { errorCode } from "./domain.ts";
import { Workbench } from "./app.ts";
import { ComparisonMapping } from "./intelligence.ts";

const startSchema = z.strictObject({
  config: z.unknown(),
  projectId: z.string().uuid().optional(),
});
const controlSchema = z.strictObject({
  auditId: z.string().uuid(),
  action: z.enum(["pause", "cancel", "resume"]),
});
const compareSchema = z.strictObject({
  before: z.string().uuid(),
  after: z.string().uuid(),
  mapping: ComparisonMapping.optional(),
});
async function body(req: IncomingMessage): Promise<unknown> {
  const pieces: Buffer[] = [];
  let n = 0;
  for await (const chunk of req) {
    n += chunk.length;
    if (n > 5000000) throw new Error("request-body-budget");
    pieces.push(chunk);
  }
  return JSON.parse(
    new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(pieces)),
  );
}
export async function serve(app: Workbench, port = 4173) {
  const session = randomBytes(32).toString("hex");
  let origin = "";
  const assets = new Map(
    [
      ["/", "index.html"],
      ["/app.js", "app.js"],
      ["/style.css", "style.css"],
    ].map(
      ([path, name]) =>
        [
          path,
          readFileSync(new URL("../web/" + name, import.meta.url)),
        ] as const,
    ),
  );
  const server = createServer(async (req, res) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
    );
    const respond = (status: number, value: unknown) => {
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify(
          value && typeof value === "object" && "error" in value
            ? { ...value, message: explainError(String(value.error)) }
            : value,
        ),
      );
    };
    try {
      if (req.headers.host !== new URL(origin).host) {
        respond(403, { error: "host-blocked" });
        return;
      }
      if (req.headers.origin && req.headers.origin !== origin) {
        respond(403, { error: "origin-blocked" });
        return;
      }
      if (req.headers["sec-fetch-site"] === "cross-site") {
        respond(403, { error: "cross-site-blocked" });
        return;
      }
      const url = new URL(req.url ?? "/", origin);
      if (req.method === "GET" && assets.has(url.pathname)) {
        if (url.pathname === "/")
          res.setHeader(
            "Set-Cookie",
            `workbench=${session}; HttpOnly; SameSite=Strict; Path=/`,
          );
        res.writeHead(200, {
          "Content-Type": url.pathname.endsWith(".js")
            ? "text/javascript"
            : url.pathname.endsWith(".css")
              ? "text/css"
              : "text/html",
        });
        res.end(assets.get(url.pathname));
        return;
      }
      const cookie =
        (req.headers.cookie ?? "")
          .split(";")
          .map((c) => c.trim())
          .find((c) => c.startsWith("workbench="))
          ?.slice(10) ?? "";
      if (
        !/^[a-f0-9]{64}$/.test(cookie) ||
        !timingSafeEqual(Buffer.from(cookie), Buffer.from(session))
      ) {
        respond(403, { error: "session-required" });
        return;
      }
      if (req.method === "GET" && url.pathname === "/api/projects") {
        respond(200, {
          projects: app.store.projects(),
          audits: app.store.audits().map((a) => ({ ...a, config: undefined })),
        });
        return;
      }
      if (req.method === "GET" && url.pathname === "/api/view") {
        const audit = z.string().uuid().parse(url.searchParams.get("audit"));
        respond(
          200,
          app.view(audit, url.searchParams.get("view") ?? "status", {
            offset: z.coerce
              .number()
              .int()
              .min(0)
              .parse(url.searchParams.get("offset") ?? 0),
            limit: 100,
            search: (url.searchParams.get("search") ?? "").slice(0, 500),
            sort: z
              .enum(["url", "state", "depth"])
              .parse(url.searchParams.get("sort") ?? "url"),
            url: url.searchParams.get("url") ?? undefined,
            outcome: url.searchParams.get("outcome") || undefined,
            importId: url.searchParams.get("importId") ?? undefined,
            baselineImportId:
              url.searchParams.get("baselineImportId") ?? undefined,
            currentImportId:
              url.searchParams.get("currentImportId") ?? undefined,
          }),
        );
        return;
      }
      if (req.method === "GET" && url.pathname === "/api/report") {
        const id = z.string().uuid().parse(url.searchParams.get("audit")),
          format = z
            .enum(["json", "markdown", "html", "csv"])
            .parse(url.searchParams.get("format") ?? "html"),
          profile = z
            .enum(["private", "shareable"])
            .parse(url.searchParams.get("profile") ?? "shareable");
        const chunks = app.reportChunks(id, format, profile),
          first = chunks.next();
        function* content() {
          if (!first.done) yield first.value;
          yield* chunks;
        }
        res.setHeader(
          "Content-Security-Policy",
          "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; sandbox",
        );
        res.writeHead(200, {
          "Content-Type":
            format === "html"
              ? "text/html"
              : format === "json"
                ? "application/json"
                : format === "csv"
                  ? "text/csv"
                  : "text/plain",
          "Content-Disposition": `attachment; filename="seo-workbench-${profile}.${format === "markdown" ? "md" : format}"`,
        });
        await pipeline(Readable.from(content(), { objectMode: false }), res);
        return;
      }
      if (req.method === "POST") {
        if (
          req.headers.origin !== origin ||
          !/^application\/json(?:\s*;\s*charset\s*=\s*(?:utf-8|"utf-8"))?\s*$/i.test(
            req.headers["content-type"] ?? "",
          )
        ) {
          respond(403, { error: "same-origin-json-required" });
          return;
        }
        const value = await body(req);
        if (url.pathname === "/api/performance") {
          const controller = new AbortController(),
            cancel = () => controller.abort();
          res.once("close", cancel);
          try {
            const measurement = await app.measurePerformance(
              value,
              controller.signal,
            );
            if (!res.destroyed) respond(201, measurement);
          } finally {
            res.removeListener("close", cancel);
          }
          return;
        }
        if (url.pathname === "/api/start") {
          const parsed = startSchema.parse(value);
          respond(201, app.start(parsed.config, parsed.projectId));
          return;
        }
        if (url.pathname === "/api/control") {
          const parsed = controlSchema.parse(value);
          app.control(parsed.auditId, parsed.action);
          respond(200, { ok: true });
          return;
        }
        if (url.pathname === "/api/compare") {
          const parsed = compareSchema.parse(value);
          respond(
            200,
            app.compare(parsed.before, parsed.after, parsed.mapping),
          );
          return;
        }
        if (url.pathname === "/api/verify") {
          const parsed = z
            .strictObject({ auditId: z.string().uuid() })
            .parse(value);
          respond(201, app.verify(parsed.auditId));
          return;
        }
        if (url.pathname === "/api/reanalyze") {
          const parsed = z
            .strictObject({ auditId: z.string().uuid() })
            .parse(value);
          respond(201, { analysisId: app.reanalyze(parsed.auditId) });
          return;
        }
        if (url.pathname === "/api/verification") {
          const parsed = z
            .discriminatedUnion("action", [
              z.strictObject({
                action: z.literal("plan"),
                auditId: z.string().uuid(),
                groupId: z.string().regex(/^[a-f0-9]{24}$/),
                maxAgeSeconds: z.number().int().min(1).max(86400).optional(),
              }),
              z.strictObject({
                action: z.literal("start"),
                planId: z.string().uuid(),
              }),
              z.strictObject({
                action: z.literal("evaluate"),
                planId: z.string().uuid(),
                afterId: z.string().uuid(),
              }),
            ])
            .parse(value);
          respond(
            201,
            parsed.action === "plan"
              ? app.planVerification({
                  auditId: parsed.auditId,
                  groupId: parsed.groupId,
                  maxAgeSeconds: parsed.maxAgeSeconds,
                })
              : parsed.action === "start"
                ? app.startVerification(parsed.planId)
                : app.evaluateVerification(parsed.planId, parsed.afterId),
          );
          return;
        }
        if (url.pathname === "/api/action-review") {
          respond(201, { reviewId: app.reviewAction(value) });
          return;
        }
        if (url.pathname === "/api/content-review") {
          respond(201, { reviewId: app.reviewContent(value) });
          return;
        }
        if (url.pathname === "/api/import") {
          const parsed = z
            .strictObject({
              projectId: z.string().uuid(),
              kind: z.enum([
                "search-console",
                "performance",
                "search-visibility",
                "external-research",
                "site-data",
              ]),
              data: z.unknown(),
            })
            .parse(value);
          respond(201, {
            importId: app.import(parsed.projectId, parsed.kind, parsed.data),
          });
          return;
        }
      }
      respond(404, { error: "route-not-found" });
    } catch (error) {
      if (res.headersSent || res.destroyed) {
        res.destroy();
        return;
      }
      respond(400, {
        error: errorCode(error),
        hint: "Check the configuration or input format; private values are omitted from diagnostics.",
      });
    }
  });
  server.requestTimeout = 30000;
  server.headersTimeout = 15000;
  await new Promise<void>((resolve, reject) => {
    const failed = () => reject(new Error("local-server-start-failed"));
    server.once("error", failed);
    server.listen(port, "127.0.0.1", () => {
      server.off("error", failed);
      resolve();
    });
  });
  origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  return {
    server,
    origin,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

/** Sandboxed local Chromium worker with host-brokered page requests. */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline";
import { z } from "zod";
import {
  errorCode,
  fetchKey,
  scopeReason,
  hash,
  type Config,
  type Observation,
  type ResponseEvidence,
} from "./domain.ts";
import { LabResultSchema, type LabResult } from "./lab-contract.ts";
import { Transport } from "./network.ts";
import { resourceRobotsPolicy } from "./robots.ts";
const Message = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("request"),
    id: z.number().int().min(1).max(10000),
    url: z.string().url().max(4096),
    method: z.literal("GET"),
  }),
  z.strictObject({ kind: z.literal("result"), result: z.unknown() }),
  z.strictObject({ kind: z.literal("error"), reason: z.string().max(100) }),
]);
/** Launch only the installed browser worker; imported configuration cannot select executable code. */
export async function renderBrowser(
  response: ResponseEvidence,
  config: Config,
  transport: Transport,
  measurement?: {
    device: "desktop" | "mobile";
    allowRequest?: (url: string, signal?: AbortSignal) => Promise<boolean>;
  },
  allowRequest = measurement?.allowRequest ??
    resourceRobotsPolicy(config, transport),
): Promise<
  (NonNullable<Observation["render"]> & { measurement?: LabResult }) | null
> {
  if (transport.signal?.aborted)
    return { status: "error", reason: "render-cancelled" };
  const auditDeadline = transport.started + config.maxSeconds * 1000;
  if (Date.now() >= auditDeadline)
    return { status: "timeout", reason: "time-budget" };
  const allow = new Set([
    ...config.origins,
    ...config.renderResources.map((u) => new URL(u).origin),
  ]);
  const child = spawn(
    process.execPath,
    [
      fileURLToPath(
        new URL(
          `./${measurement ? "lighthouse-worker" : "render-worker"}.${import.meta.url.endsWith(".ts") ? "ts" : "js"}`,
          import.meta.url,
        ),
      ),
    ],
    { stdio: ["pipe", "pipe", "pipe"] },
  );
  const init = {
    kind: "init",
    url: response.url,
    htmlBase64:
      response.bodyBase64 ?? Buffer.from(response.body).toString("base64"),
    status: response.status,
    headers: Object.fromEntries(
      Object.entries(response.headers).filter(
        ([key]) => key !== "content-encoding",
      ),
    ),
    timeoutMs: config.renderTimeoutMs,
    maxBytes: config.maxBytes,
    maxRequests: Math.min(
      10000,
      Math.max(1, config.maxRequests - transport.requests),
    ),
    viewport: config.viewport,
    locale: config.locale,
    readySelector: config.renderReadySelector,
    ...(measurement ? { measurement: { device: measurement.device } } : {}),
  };
  child.stdin.on("error", () => {});
  child.stdin.write(JSON.stringify(init) + "\n");
  const reader = createInterface({ input: child.stdout });
  let total = 0,
    finished = false;
  const resourceEvidence: {
    url: string;
    status?: number;
    hash?: string;
    contentType?: string;
    error?: string;
  }[] = [];
  const start = Date.now();
  const abort = new AbortController();
  return new Promise((resolve) => {
    const finish = (
      result:
        | (NonNullable<Observation["render"]> & { measurement?: LabResult })
        | null,
    ) => {
      if (finished) return;
      finished = true;
      abort.abort();
      transport.signal?.removeEventListener("abort", cancel);
      clearTimeout(timer);
      reader.close();
      if (child.exitCode !== null || child.signalCode !== null) {
        resolve(result);
        return;
      }
      child.once("close", () => {
        clearTimeout(cleanupDeadline);
        resolve(result);
      });
      const cleanupDeadline = setTimeout(() => {
        child.kill("SIGKILL");
        resolve(result);
      }, 5000);
      child.kill("SIGTERM");
      return;
    };
    const rendererAllowance = config.renderTimeoutMs * 3 + 15000,
      auditAllowance = auditDeadline - Date.now();
    const timer = setTimeout(
      () =>
        finish({
          status: "timeout",
          reason:
            auditAllowance <= rendererAllowance || Date.now() >= auditDeadline
              ? "time-budget"
              : "render-deadline",
          elapsedMs: Date.now() - start,
        }),
      Math.max(1, Math.min(rendererAllowance, auditAllowance)),
    );
    const cancel = () =>
      finish({
        status: "error",
        reason: "render-cancelled",
        elapsedMs: Date.now() - start,
      });
    transport.signal?.addEventListener("abort", cancel, { once: true });
    if (transport.signal?.aborted) cancel();
    // Count chunks before readline can accumulate an unterminated message.
    child.stdout.prependListener("data", (chunk: Buffer) => {
      total += chunk.length;
      if (total > config.maxBytes * 3 + 500000)
        finish({ status: "error", reason: "render-output-budget" });
    });
    child.stderr.on("data", () => {}); // Browser diagnostics may contain private URLs; never forward them.
    child.on("error", () =>
      finish({
        status: "error",
        reason: "browser-worker-unavailable",
      }),
    );
    child.on("exit", () => {
      if (!finished) finish({ status: "error", reason: "browser-exited" });
    });
    reader.on("line", async (line) => {
      if (finished) return;
      try {
        const message = Message.parse(JSON.parse(line));
        if (message.kind === "error") {
          finish({ status: "error", reason: "browser-render-failed" });
          return;
        }
        if (message.kind === "result") {
          if (measurement) {
            const result = z
              .strictObject({
                status: z.literal("observed"),
                measurement: LabResultSchema,
              })
              .parse(message.result);
            finish({
              ...result,
              profile: {
                browserMode: "local",
                resourceEvidence,
              },
            });
            return;
          }
          const result = message.result as NonNullable<Observation["render"]>;
          if (
            !["observed", "timeout"].includes(result.status) ||
            typeof result.dom !== "string" ||
            Buffer.byteLength(result.dom) > config.maxBytes ||
            [
              result.facts?.renderedMainText,
              result.facts?.renderedPageText,
            ].some(
              (snapshot) =>
                snapshot !== undefined &&
                (!snapshot ||
                  typeof snapshot.text !== "string" ||
                  snapshot.text.length > 500000 ||
                  typeof snapshot.truncated !== "boolean"),
            )
          ) {
            finish({ status: "error", reason: "invalid-render-result" });
            return;
          }
          const policyBlocked = resourceEvidence.some((resource) =>
            ["render-robots-blocked", "lab-robots-unavailable"].includes(
              resource.error ?? "",
            ),
          );
          finish({
            ...result,
            ...(policyBlocked
              ? { status: "blocked" as const, reason: "render-robots-blocked" }
              : {}),
            profile: {
              ...(result.profile as object),
              browserMode: "local",
              resourceEvidence,
            },
          });
          return;
        }
        if (finished) return;
        const url = fetchKey(message.url);
        let payload: unknown;
        try {
          if (!allow.has(new URL(url).origin))
            throw new Error("resource-origin-blocked");
          const resourceConfig = {
            ...config,
            recheckUrls: undefined,
            origins: [...allow],
            include: ["/"],
            exclude: [],
          };
          if (scopeReason(resourceConfig, url))
            throw new Error("resource-scope-blocked");
          if (!(await allowRequest(url, abort.signal)))
            throw new Error("render-robots-blocked");
          const resource = await transport.request(url, abort.signal);
          // Redirects are not blindly forwarded into a browser; it must request a new approved hop.
          payload = {
            kind: "response",
            id: message.id,
            status: resource.status,
            headers: Object.fromEntries(
              Object.entries(resource.headers).filter(
                ([key]) => key !== "content-encoding",
              ),
            ),
            body:
              resource.bodyBase64 ??
              Buffer.from(resource.body).toString("base64"),
          };
          resourceEvidence.push({
            url,
            status: resource.status,
            hash: hash(resource.bodyBase64 ?? resource.body),
            contentType: resource.headers["content-type"],
          });
        } catch (error) {
          const reason = errorCode(error);
          payload = { kind: "response", id: message.id, error: reason };
          resourceEvidence.push({ url, error: reason });
        }
        if (!finished && child.stdin.writable)
          child.stdin.write(JSON.stringify(payload) + "\n");
      } catch {
        finish({ status: "error", reason: "invalid-render-protocol" });
      }
    });
  });
}

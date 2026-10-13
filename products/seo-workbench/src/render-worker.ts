/** Sandboxed Chromium worker. Stdio messages carry data, never executable commands. */
import { createInterface } from "node:readline";
import { chromium } from "playwright";
import { z } from "zod";
import { extract } from "./extract.ts";
import { visibleTextSnapshots } from "./visible-text.ts";
const Init = z.strictObject({
  kind: z.literal("init"),
  url: z.string().url(),
  htmlBase64: z.string(),
  status: z.number().int(),
  headers: z.record(z.string(), z.string()),
  timeoutMs: z.number().int().min(100).max(30000),
  maxBytes: z.number().int().max(10000000),
  maxRequests: z.number().int().min(1).max(10000),
  viewport: z.strictObject({ width: z.number(), height: z.number() }),
  locale: z.string(),
  readySelector: z.string().optional(),
});
const Response = z.strictObject({
  kind: z.literal("response"),
  id: z.number().int(),
  status: z.number().int().optional(),
  body: z.string().optional(),
  headers: z.record(z.string(), z.string()).optional(),
  error: z.string().optional(),
});
const input = createInterface({ input: process.stdin });
const pending = new Map<number, (value: z.infer<typeof Response>) => void>();
let initialized = false;
const send = (value: unknown) =>
  process.stdout.write(JSON.stringify(value) + "\n");
input.on("line", (line) => {
  if (Buffer.byteLength(line) > 15000000) {
    process.exitCode = 2;
    input.close();
    return;
  }
  try {
    const value = JSON.parse(line);
    if (!initialized) {
      initialized = true;
      void run(Init.parse(value));
    } else {
      const parsed = Response.parse(value);
      pending.get(parsed.id)?.(parsed);
      pending.delete(parsed.id);
    }
  } catch {
    send({ kind: "error", reason: "invalid-render-message" });
    input.close();
  }
});
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
const stop = async () => {
  try {
    await browser?.close();
  } catch {
    /* The browser may already have stopped. */
  } finally {
    process.exit();
  }
};
process.once("SIGTERM", () => {
  void stop();
});
// A terminated host closes the pipe; do not leave its browser waiting for resources.
input.once("close", () => {
  void stop();
});

async function run(config: z.infer<typeof Init>) {
  const failures: string[] = [];
  let requests = 0;
  const start = Date.now();
  try {
    browser = await chromium.launch({
      headless: true,
      chromiumSandbox: true,
      // Unintercepted child targets must fail rather than fetch outside the host broker.
      args: [
        "--proxy-server=http://127.0.0.1:0",
        "--proxy-bypass-list=<-loopback>",
      ],
    });
    const context = await browser.newContext({
      viewport: config.viewport,
      locale: config.locale,
      userAgent: "SEO-Workbench/0.1",
      serviceWorkers: "block",
      acceptDownloads: false,
    });
    const page = await context.newPage();
    await page.routeWebSocket("**/*", (socket) => socket.close());
    // Fetch pauses every redirect hop; Playwright routes only the first URL of a redirect.
    const session = await context.newCDPSession(page);
    session.on(
      "Fetch.requestPaused",
      async ({ requestId, request, resourceType }) => {
        const abort = () =>
          session
            .send("Fetch.failRequest", {
              requestId,
              errorReason: "BlockedByClient",
            })
            .catch(() => {});
        try {
          const id = ++requests;
          if (request.method !== "GET" || id > config.maxRequests) {
            failures.push("resource-method-or-budget-blocked");
            await abort();
            return;
          }
          const response =
            resourceType === "Document" &&
            request.url === config.url &&
            id === 1
              ? {
                  error: undefined,
                  status: config.status,
                  headers: config.headers,
                  body: config.htmlBase64,
                }
              : await new Promise<z.infer<typeof Response>>((resolve) => {
                  pending.set(id, resolve);
                  send({
                    kind: "request",
                    id,
                    url: request.url,
                    method: "GET",
                  });
                });
          if (response.error || response.body === undefined) {
            failures.push(response.error ?? "resource-unavailable");
            await abort();
            return;
          }
          if (Buffer.from(response.body, "base64").length > config.maxBytes) {
            failures.push("resource-size-budget");
            await abort();
            return;
          }
          await session.send("Fetch.fulfillRequest", {
            requestId,
            responseCode: response.status ?? 200,
            responseHeaders: Object.entries(response.headers ?? {}).map(
              ([name, value]) => ({ name, value }),
            ),
            body: response.body,
          });
        } catch {
          failures.push("resource-unavailable");
          await abort();
        }
      },
    );
    await session.send("Fetch.enable", {
      patterns: [{ urlPattern: "*", requestStage: "Request" }],
    });
    page.on("pageerror", () => failures.push("page-script-error"));
    page.on("requestfailed", () => failures.push("resource-failed"));
    let status: "observed" | "timeout" = "observed";
    try {
      await page.goto(config.url, {
        waitUntil: "domcontentloaded",
        timeout: config.timeoutMs,
      });
      if (config.readySelector)
        await page
          .locator(config.readySelector)
          .first()
          .waitFor({ state: "attached", timeout: config.timeoutMs });
      let previous = "",
        stable = 0;
      const deadline = Date.now() + config.timeoutMs;
      while (Date.now() < deadline && stable < 3) {
        const signal = await page.evaluate(() =>
          JSON.stringify([
            document.title,
            document.querySelector("main")?.textContent,
            document
              .querySelector("meta[name=robots]")
              ?.getAttribute("content"),
            document.querySelector("link[rel=canonical]")?.getAttribute("href"),
          ]),
        );
        stable = signal === previous ? stable + 1 : 0;
        previous = signal;
        await page.waitForTimeout(100);
      }
      if (stable < 3) status = "timeout";
    } catch {
      status = "timeout";
    }
    const dom = await page.content();
    if (Buffer.byteLength(dom) > config.maxBytes)
      throw new Error("render-response-budget");
    const textSnapshots = await page.evaluate(visibleTextSnapshots);
    send({
      kind: "result",
      result: {
        status,
        dom,
        facts: {
          ...extract(dom, config.url),
          renderedMainText: textSnapshots.main,
          renderedPageText: textSnapshots.page,
        },
        runtime: browser.version(),
        elapsedMs: Date.now() - start,
        failures,
        profile: {
          viewport: config.viewport,
          locale: config.locale,
          readiness: "DOM + optional selector + 3 stable 100ms content samples",
          interaction: "none",
          requests,
          isolation:
            "Local sandboxed Chromium with host-brokered page requests",
          sameNavigationRawHTML: true,
          extractionLimits: [
            "Shadow DOM",
            "Cross-origin iframe text",
            "Scroll-triggered content",
            "Changes after stable observation",
          ],
        },
      },
    });
  } catch {
    send({ kind: "error", reason: "isolated-browser-failed" });
  } finally {
    await browser?.close();
    input.close();
    process.exit();
  }
}

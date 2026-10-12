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
    browser = await chromium.launch({ headless: true, chromiumSandbox: true });
    const context = await browser.newContext({
      viewport: config.viewport,
      locale: config.locale,
      userAgent: "SEO-Workbench/0.1",
      serviceWorkers: "block",
      acceptDownloads: false,
    });
    const page = await context.newPage();
    await page.routeWebSocket("**/*", (socket) => socket.close());
    await page.route("**/*", async (route) => {
      const request = route.request();
      requests++;
      if (request.method() !== "GET" || requests > config.maxRequests) {
        failures.push("resource-method-or-budget-blocked");
        await route.abort();
        return;
      }
      if (
        request.isNavigationRequest() &&
        request.frame() === page.mainFrame() &&
        request.url() === config.url &&
        requests === 1
      ) {
        await route.fulfill({
          status: config.status,
          headers: config.headers,
          body: Buffer.from(config.htmlBase64, "base64"),
        });
        return;
      }
      const id = requests;
      const response = await new Promise<z.infer<typeof Response>>(
        (resolve) => {
          pending.set(id, resolve);
          send({
            kind: "request",
            id,
            url: request.url(),
            method: request.method(),
          });
        },
      );
      if (response.error || !response.body) {
        failures.push(response.error ?? "resource-unavailable");
        await route.abort();
        return;
      }
      const bytes = Buffer.from(response.body, "base64");
      if (bytes.length > config.maxBytes) {
        failures.push("resource-size-budget");
        await route.abort();
        return;
      }
      await route.fulfill({
        status: response.status ?? 200,
        headers: response.headers ?? {},
        body: bytes,
      });
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

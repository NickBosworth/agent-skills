/** Sandboxed Lighthouse worker. Browser control uses a pipe, not a listening endpoint. */
import { createInterface } from "node:readline";
import { z } from "zod";
import puppeteer from "puppeteer-core";
import lighthouse, { desktopConfig } from "lighthouse";
import { chromium } from "playwright";
import { LabResultSchema } from "./lab-contract.ts";
const Init = z.strictObject({
  kind: z.literal("init"),
  url: z.string().url().max(4096),
  htmlBase64: z.string(),
  status: z.number().int(),
  headers: z.record(z.string(), z.string()),
  timeoutMs: z.number().int().min(100).max(30000),
  maxBytes: z.number().int().min(1).max(10000000),
  maxRequests: z.number().int().min(1).max(10000),
  viewport: z.strictObject({ width: z.number(), height: z.number() }),
  locale: z.string(),
  readySelector: z.string().optional(),
  measurement: z.strictObject({ device: z.enum(["desktop", "mobile"]) }),
});
const Response = z.strictObject({
  kind: z.literal("response"),
  id: z.number().int(),
  status: z.number().int().optional(),
  body: z.string().optional(),
  headers: z.record(z.string(), z.string()).optional(),
  error: z.string().optional(),
});
const input = createInterface({ input: process.stdin }),
  pending = new Map<number, (value: z.infer<typeof Response>) => void>();
const send = (value: unknown) =>
  process.stdout.write(JSON.stringify(value) + "\n");
let initialized = false;
input.on("line", (line) => {
  if (Buffer.byteLength(line) > 15000000) {
    input.close();
    process.exitCode = 2;
    return;
  }
  try {
    const value = JSON.parse(line);
    if (!initialized) {
      initialized = true;
      void run(Init.parse(value));
    } else {
      const response = Response.parse(value);
      pending.get(response.id)?.(response);
      pending.delete(response.id);
    }
  } catch {
    send({ kind: "error", reason: "invalid-lighthouse-message" });
    input.close();
  }
});
let browser: Awaited<ReturnType<typeof puppeteer.launch>> | undefined;
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
  let requests = 0,
    failed = 0;
  try {
    browser = await puppeteer.launch({
      executablePath: chromium.executablePath(),
      browser: "chrome",
      headless: true,
      pipe: true,
      defaultViewport: null,
      ignoreDefaultArgs: ["--enable-automation"],
      args: ["--lang=" + config.locale],
      dumpio: false,
    });
    const page = await browser.newPage();
    await page.setBypassServiceWorker(true);
    await page.setRequestInterception(true);
    page.on("request", async (request) => {
      if (request.isInterceptResolutionHandled()) return;
      const id = ++requests;
      if (request.method() !== "GET" || id > config.maxRequests) {
        failed++;
        await request.abort().catch(() => {});
        return;
      }
      try {
        const response = await new Promise<z.infer<typeof Response>>(
          (resolve) => {
            pending.set(id, resolve);
            send({ kind: "request", id, url: request.url(), method: "GET" });
          },
        );
        if (
          response.error ||
          response.body === undefined ||
          response.status === undefined
        )
          throw new Error("resource-unavailable");
        const body = Buffer.from(response.body, "base64");
        if (body.length > config.maxBytes)
          throw new Error("resource-size-budget");
        if (!request.isInterceptResolutionHandled())
          await request.respond({
            status: response.status,
            headers: response.headers,
            body,
          });
      } catch {
        failed++;
        if (!request.isInterceptResolutionHandled())
          await request.abort().catch(() => {});
      }
    });
    const flags = {
      onlyAudits: [
        "largest-contentful-paint",
        "cumulative-layout-shift",
        "total-blocking-time",
      ],
      logLevel: "silent" as const,
      output: "json" as const,
      throttlingMethod: "provided" as const,
      maxWaitForLoad: config.timeoutMs,
      maxWaitForFcp: config.timeoutMs,
      formFactor: config.measurement.device,
    };
    const result = await lighthouse(
      config.url,
      flags,
      config.measurement.device === "desktop" ? desktopConfig : undefined,
      page,
    );
    if (!result || result.lhr.runtimeError)
      throw new Error("local-lighthouse-unavailable");
    const number = (id: string) => {
      const value = result.lhr.audits[id]?.numericValue;
      return typeof value === "number" && Number.isFinite(value) && value >= 0
        ? value
        : null;
    };
    const measurement = LabResultSchema.parse({
      toolVersion: result.lhr.lighthouseVersion,
      browserVersion: await browser.version(),
      requestedUrl: config.url,
      finalUrl: result.lhr.finalDisplayedUrl,
      device: config.measurement.device,
      timestamp: result.lhr.fetchTime,
      emulation: {
        width: result.lhr.configSettings.screenEmulation.width,
        height: result.lhr.configSettings.screenEmulation.height,
        deviceScaleFactor:
          result.lhr.configSettings.screenEmulation.deviceScaleFactor,
        mobile: result.lhr.configSettings.screenEmulation.mobile,
        userAgent: result.lhr.userAgent,
      },
      metrics: {
        lcpMs: number("largest-contentful-paint"),
        cls: number("cumulative-layout-shift"),
        tbtMs: number("total-blocking-time"),
      },
      failedRequests: Math.min(failed, 10000),
      requestCount: Math.min(requests, 10000),
    });
    send({ kind: "result", result: { status: "observed", measurement } });
  } catch {
    send({ kind: "error", reason: "local-lighthouse-failed" });
  } finally {
    if (browser) await browser.close().catch(() => {});
    input.close();
  }
}

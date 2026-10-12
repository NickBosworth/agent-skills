/** Local lab measurements use the same sandboxed browser and host request broker as rendering. */
import { z } from "zod";
import { fetchKey, scopeReason } from "./domain.ts";
import { Transport, type NetworkPolicy } from "./network.ts";
import { renderBrowser } from "./browser-runner.ts";
import { parseRobots } from "./robots.ts";
import { parsePerformance } from "./imports.ts";
import type { Store } from "./store.ts";

export const LocalLabRequest = z.strictObject({
  projectId: z.string().uuid(),
  url: z.string().url().max(4096),
  device: z.enum(["desktop", "mobile"]).default("mobile"),
  repeats: z.number().int().min(1).max(5).default(5),
});
export async function measureLocalPerformance(
  store: Store,
  policy: NetworkPolicy,
  value: unknown,
  signal?: AbortSignal,
) {
  const request = LocalLabRequest.parse(value),
    config = { ...store.project(request.projectId), recheckUrls: undefined },
    target = fetchKey(request.url);
  if (scopeReason(config, target)) throw new Error("lab-target-scope");
  const release = store.reserveWorkerSlot();
  try {
    if (store.hasActiveJobs()) throw new Error("lab-audit-concurrency-blocked");
    const transport = new Transport(config, policy, signal),
      origins = new Set([
        ...config.origins,
        ...config.renderResources.map((url) => new URL(url).origin),
      ]),
      robots = new Map<
        string,
        Promise<ReturnType<typeof parseRobots> | null>
      >();
    const allowed = async (url: string, requestSignal?: AbortSignal) => {
      const origin = new URL(url).origin;
      if (!origins.has(origin)) return false;
      if (!robots.has(origin))
        robots.set(
          origin,
          (async () => {
            let address = origin + "/robots.txt";
            const seen = new Set<string>();
            for (let hop = 0; hop <= 5; hop++) {
              if (seen.has(address)) throw new Error("lab-robots-unavailable");
              seen.add(address);
              const response = await transport.request(address, requestSignal);
              if (response.status >= 300 && response.status < 400) {
                if (!response.headers.location || hop === 5)
                  throw new Error("lab-robots-unavailable");
                address = fetchKey(response.headers.location, address);
                if (
                  !origins.has(new URL(address).origin) ||
                  scopeReason(
                    {
                      ...config,
                      origins: [...origins],
                      include: ["/"],
                      exclude: [],
                    },
                    address,
                  )
                )
                  throw new Error("lab-robots-unavailable");
                continue;
              }
              if (response.status >= 200 && response.status < 300) {
                const parsed = parseRobots(
                    origin + "/robots.txt",
                    response.body,
                  ),
                  delay = parsed.getCrawlDelay("SEO-Workbench");
                if (delay !== undefined && Number.isFinite(delay) && delay > 0)
                  transport.originDelays.set(origin, delay * 1000);
                return parsed;
              }
              if (
                response.status >= 400 &&
                response.status < 500 &&
                ![401, 403, 429].includes(response.status)
              )
                return null;
              throw new Error("lab-robots-unavailable");
            }
            throw new Error("lab-robots-unavailable");
          })(),
        );
      return (
        (await robots.get(origin))?.isAllowed(url, "SEO-Workbench") !== false
      );
    };
    if (!(await allowed(target))) throw new Error("lab-robots-blocked");
    const response = await transport.scoped(target);
    if (
      response.status < 200 ||
      response.status >= 300 ||
      !/text\/html|application\/xhtml\+xml/i.test(
        response.headers["content-type"] ?? "",
      )
    )
      throw new Error("lab-page-unavailable");
    const samples: {
      measurement: ReturnType<typeof parsePerformance>;
      requests: number;
      browserVersion: string;
      emulation: import("./lab-contract.ts").LabResult["emulation"];
    }[] = [];
    for (let run = 0; run < request.repeats; run++) {
      const result = await renderBrowser(response, config, transport, {
        device: request.device,
        allowRequest: allowed,
      });
      if (signal?.aborted) throw new Error("cancelled");
      const measurement = result?.measurement;
      if (result?.status !== "observed" || !measurement)
        throw new Error("lab-measurement-incomplete");
      const resources =
        (
          result.profile as
            | {
                resourceEvidence?: {
                  url: string;
                  status?: number;
                  error?: string;
                }[];
              }
            | undefined
        )?.resourceEvidence ?? [];
      if (
        measurement.failedRequests ||
        measurement.emulation.mobile !== (request.device === "mobile") ||
        resources.some(
          (resource) =>
            resource.error ||
            (resource.status !== undefined &&
              resource.status >= 400 &&
              new URL(resource.url).pathname !== "/favicon.ico"),
        ) ||
        Object.values(measurement.metrics).some((metric) => metric === null) ||
        fetchKey(measurement.requestedUrl) !== target ||
        scopeReason(config, measurement.finalUrl)
      )
        throw new Error("lab-measurement-incomplete");
      const data = parsePerformance({
        schemaVersion: 1,
        provider: "Lighthouse",
        method: "local runner",
        scope: "url",
        url: target,
        device: request.device,
        toolVersion: measurement.toolVersion,
        timestamp: measurement.timestamp,
        collectionStart: null,
        collectionEnd: null,
        metrics: { ...measurement.metrics, inpMs: null },
        percentile: null,
        sampling: `Run ${run + 1} of ${request.repeats}. Fresh ${measurement.browserVersion} browser on this computer with Chromium sandboxing enabled; local workload affects results. Provided throttling; host-broker buffering and request pacing affect timing. The initial page request warms the server. Robots rules apply to every fetched resource. This is a controlled lab test, not real-visitor data.`,
      });
      samples.push({
        measurement: data,
        requests: measurement.requestCount,
        browserVersion: measurement.browserVersion,
        emulation: measurement.emulation,
      });
    }
    const summary = Object.fromEntries(
      ["lcpMs", "cls", "tbtMs"].map((name) => {
        const values = samples
            .map(
              (sample) =>
                sample.measurement.metrics[name as "lcpMs" | "cls" | "tbtMs"]!,
            )
            .sort((a, b) => a - b),
          middle = Math.floor(values.length / 2);
        return [
          name,
          {
            median:
              values.length % 2
                ? values[middle]
                : (values[middle - 1] + values[middle]) / 2,
            min: values[0],
            max: values.at(-1),
          },
        ];
      }),
    );
    // Save the complete series together; a failed repeat must not leave a partial success record.
    store.project(request.projectId);
    store.db.exec("BEGIN IMMEDIATE");
    try {
      const importIds = samples.map((sample) =>
          store.addImport(request.projectId, "performance", sample.measurement),
        ),
        seriesId = store.addImport(request.projectId, "local-lab-series", {
          schemaVersion: 1,
          target,
          device: request.device,
          browserMode: "local",
          repeats: request.repeats,
          importIds,
          samples,
          summary,
          configuredLocale: config.locale,
          delayMs: config.delayMs,
          limitations: [
            "These runs use a sandboxed browser and request broker. They do not reproduce a visitor's device or connection.",
            "Median and range describe this series only; they do not establish a ranking effect or the cause of a change.",
          ],
        });
      store.db.exec("COMMIT");
      return { seriesId, importIds, samples, summary };
    } catch (error) {
      if (store.db.isTransaction) store.db.exec("ROLLBACK");
      throw error;
    }
  } finally {
    release();
  }
}

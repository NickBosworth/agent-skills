/** Local lab measurements use the same sandboxed browser and host request broker as rendering. */
import { z } from "zod";
import { fetchKey, scopeReason } from "./domain.ts";
import { Transport, type NetworkPolicy } from "./network.ts";
import { renderBrowser } from "./browser-runner.ts";
import { resourceRobotsPolicy } from "./robots.ts";
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
      allowed = resourceRobotsPolicy(config, transport);
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

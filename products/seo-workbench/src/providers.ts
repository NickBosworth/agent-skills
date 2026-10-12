/** Optional official Google APIs. Calls require user transfer consent; no credentials persist. */
import https from "node:https";
import { z } from "zod";
import { NetworkPolicy } from "./network.ts";
import { fetchKey } from "./domain.ts";
import {
  SearchImport,
  PerformanceImport,
  parsePerformance,
} from "./imports.ts";

export interface ProviderRequest {
  url: string;
  method: "GET" | "POST";
  headers: Record<string, string>;
  body?: unknown;
  signal?: AbortSignal;
}
export interface ProviderResponse {
  status: number;
  data: unknown;
}
export type ProviderTransport = (
  request: ProviderRequest,
) => Promise<ProviderResponse>;
const hosts = new Set([
  "www.googleapis.com",
  "searchconsole.googleapis.com",
  "chromeuxreport.googleapis.com",
]);
/** Fixed supported endpoints, validated pinned DNS, bounded JSON, no redirects or diagnostic values. */
export const googleTransport: ProviderTransport = async (input) => {
  const url = new URL(input.url);
  const supported =
    (url.hostname === "www.googleapis.com" &&
      ((input.method === "POST" &&
        /^\/webmasters\/v3\/sites\/[^/]+\/searchAnalytics\/query$/.test(
          url.pathname,
        )) ||
        (input.method === "GET" &&
          url.pathname === "/pagespeedonline/v5/runPagespeed"))) ||
    (url.hostname === "searchconsole.googleapis.com" &&
      input.method === "POST" &&
      url.pathname === "/v1/urlInspection/index:inspect") ||
    (url.hostname === "chromeuxreport.googleapis.com" &&
      input.method === "POST" &&
      url.pathname === "/v1/records:queryRecord");
  if (
    !supported ||
    url.protocol !== "https:" ||
    !hosts.has(url.hostname) ||
    url.port ||
    url.username ||
    url.password
  )
    throw new Error("provider-endpoint-blocked");
  const expires = Date.now() + 60000;
  const address = await new NetworkPolicy().address(
      url.href,
      input.signal,
      60000,
    ),
    body = input.body ? JSON.stringify(input.body) : undefined;
  if (body && Buffer.byteLength(body) > 100000)
    throw new Error("provider-input-budget");
  if (input.signal?.aborted) throw new Error("cancelled");
  if (Date.now() >= expires) throw new Error("provider-timeout");
  return new Promise((resolve, reject) => {
    const request = https.request(
      url,
      {
        method: input.method,
        agent: false,
        family: address.family,
        lookup: (_hostname, _options, callback) =>
          callback(null, address.address, address.family),
        signal: input.signal,
        headers: {
          ...input.headers,
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(body ? { "Content-Length": Buffer.byteLength(body) } : {}),
        },
      },
      (response) => {
        const chunks: Buffer[] = [];
        let n = 0;
        response.on("data", (chunk: Buffer) => {
          n += chunk.length;
          if (n > 5000000) {
            reject(new Error("provider-response-budget"));
            request.destroy();
            return;
          }
          chunks.push(chunk);
        });
        response.on("error", () =>
          reject(new Error("provider-response-failed")),
        );
        response.on("aborted", () =>
          reject(new Error("provider-response-aborted")),
        );
        response.on("end", () => {
          try {
            resolve({
              status: response.statusCode ?? 0,
              data: JSON.parse(
                new TextDecoder("utf-8", { fatal: true }).decode(
                  Buffer.concat(chunks),
                ),
              ),
            });
          } catch {
            reject(new Error("provider-json-invalid"));
          }
        });
      },
    );
    const timer = setTimeout(
      () => {
        reject(new Error("provider-timeout"));
        request.destroy();
      },
      Math.max(1, expires - Date.now()),
    );
    request.on("close", () => clearTimeout(timer));
    request.on("error", () => reject(new Error("provider-connection-failed")));
    request.end(body);
  });
};
function consent(value: boolean): void {
  if (!value) throw new Error("provider-transfer-consent-required");
}
function keyHeaders(key: string | undefined): Record<string, string> {
  return key ? { "X-Goog-Api-Key": key } : {};
}
const metric = z.number().finite().nonnegative();
const searchResponse = z.object({
  rows: z
    .array(
      z.object({
        keys: z.array(z.string()),
        clicks: metric,
        impressions: metric,
        position: metric,
      }),
    )
    .optional(),
  responseAggregationType: z.string().optional(),
});
/** GSC returns top rows, never a complete market or indexed inventory. */
export async function collectSearchConsole(
  options: {
    property: string;
    startDate: string;
    endDate: string;
    token: string;
    authorizedTransfer: boolean;
    searchType?: "web" | "image" | "video" | "news" | "discover" | "googleNews";
    maxRows?: number;
    signal?: AbortSignal;
  },
  transport: ProviderTransport = googleTransport,
) {
  consent(options.authorizedTransfer);
  if (!options.token) throw new Error("provider-credential-unavailable");
  z.string().date().parse(options.startDate);
  z.string().date().parse(options.endDate);
  if (options.startDate > options.endDate)
    throw new Error("provider-date-window");
  if (!options.property.startsWith("sc-domain:")) fetchKey(options.property);
  const max = Math.min(10000, Math.max(1, options.maxRows ?? 1000)),
    rows: z.infer<typeof SearchImport>["rows"] = [];
  let aggregation = "byPage";
  for (let startRow = 0; startRow < max; startRow += 1000) {
    const result = await transport({
      url:
        "https://www.googleapis.com/webmasters/v3/sites/" +
        encodeURIComponent(options.property) +
        "/searchAnalytics/query",
      method: "POST",
      headers: { Authorization: "Bearer " + options.token },
      body: {
        startDate: options.startDate,
        endDate: options.endDate,
        dimensions: ["page", "query", "country", "device"],
        type: options.searchType ?? "web",
        aggregationType: "auto",
        rowLimit: Math.min(1000, max - startRow),
        startRow,
      },
      signal: options.signal,
    });
    if (result.status !== 200)
      throw new Error(
        result.status === 401 || result.status === 403
          ? "provider-access-blocked"
          : result.status === 429
            ? "provider-rate-limited"
            : "provider-query-failed",
      );
    const data = searchResponse.parse(result.data);
    aggregation = data.responseAggregationType ?? "byPage";
    for (const row of data.rows ?? []) {
      if (row.keys.length !== 4) throw new Error("provider-dimensions-invalid");
      rows.push({
        page: fetchKey(row.keys[0]),
        query: row.keys[1],
        country: row.keys[2],
        device: z
          .enum(["DESKTOP", "MOBILE", "TABLET"])
          .parse(row.keys[3].toUpperCase()),
        clicks: row.clicks,
        impressions: row.impressions,
        position: row.position,
      });
    }
    if ((data.rows?.length ?? 0) < 1000) break;
  }
  return SearchImport.parse({
    schemaVersion: 1,
    provider: "Google Search Console",
    method: "API import",
    startDate: options.startDate,
    endDate: options.endDate,
    searchType: options.searchType ?? "web",
    aggregation,
    complete: false,
    filters: [],
    limitations:
      "Official API returns top rows and may omit anonymized/other rows; bounded collection is not full demand or indexed inventory.",
    rows: rows.slice(0, max),
  });
}
/** Indexed-version inspection; it neither crawls live nor enumerates all indexed URLs. */
export async function inspectIndexedURL(
  options: {
    property: string;
    url: string;
    token: string;
    authorizedTransfer: boolean;
    signal?: AbortSignal;
  },
  transport: ProviderTransport = googleTransport,
) {
  consent(options.authorizedTransfer);
  fetchKey(options.url);
  if (!options.token) throw new Error("provider-credential-unavailable");
  const result = await transport({
    url: "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect",
    method: "POST",
    headers: { Authorization: "Bearer " + options.token },
    body: { inspectionUrl: options.url, siteUrl: options.property },
    signal: options.signal,
  });
  if (result.status !== 200) throw new Error("provider-inspection-unavailable");
  const data = z
    .object({
      inspectionResult: z.object({
        indexStatusResult: z
          .object({
            verdict: z.string().optional(),
            coverageState: z.string().optional(),
            googleCanonical: z.string().optional(),
            userCanonical: z.string().optional(),
            lastCrawlTime: z.string().optional(),
          })
          .optional(),
      }),
    })
    .parse(result.data);
  return {
    schemaVersion: 1,
    provider: "Google URL Inspection",
    method: "API import",
    url: options.url,
    property: options.property,
    timestamp: new Date().toISOString(),
    observation: "indexed version, not live test",
    data: data.inspectionResult.indexStatusResult ?? null,
    limitations: [
      "One inspected URL, not indexed inventory",
      "Authorization and per-site quotas apply",
      "Stored engine state may be older than this audit",
    ],
  };
}
const date = z.object({
  year: z.number().int(),
  month: z.number().int(),
  day: z.number().int(),
});
const p75 = z.object({
  percentiles: z.object({ p75: z.union([metric, z.string()]) }),
});
const cruxResponse = z.object({
  urlNormalizationDetails: z
    .object({ originalUrl: z.string(), normalizedUrl: z.string() })
    .optional(),
  record: z.object({
    key: z.object({
      url: z.string().optional(),
      origin: z.string().optional(),
      formFactor: z.string().optional(),
    }),
    collectionPeriod: z.object({ firstDate: date, lastDate: date }),
    metrics: z.record(z.string(), p75),
  }),
});
function iso(value: z.infer<typeof date>): string {
  return `${value.year}-${String(value.month).padStart(2, "0")}-${String(value.day).padStart(2, "0")}`;
}
/** Field measurements retain URL/origin scope; fallback is explicit and labelled. */
export async function collectCrUX(
  options: {
    url: string;
    apiKey: string;
    authorizedTransfer: boolean;
    device?: "mobile" | "desktop" | "all";
    originFallback?: boolean;
    signal?: AbortSignal;
  },
  transport: ProviderTransport = googleTransport,
) {
  consent(options.authorizedTransfer);
  const url = fetchKey(options.url);
  if (!options.apiKey) throw new Error("provider-credential-unavailable");
  const device = options.device ?? "mobile";
  let scope: "url" | "origin" = "url";
  const query = async () =>
    transport({
      url: "https://chromeuxreport.googleapis.com/v1/records:queryRecord",
      method: "POST",
      headers: keyHeaders(options.apiKey),
      body: {
        [scope]: scope === "origin" ? new URL(url).origin : url,
        ...(device === "all"
          ? {}
          : { formFactor: device === "mobile" ? "PHONE" : "DESKTOP" }),
        metrics: [
          "largest_contentful_paint",
          "cumulative_layout_shift",
          "interaction_to_next_paint",
        ],
      },
      signal: options.signal,
    });
  let result = await query();
  if (result.status === 404 && options.originFallback) {
    scope = "origin";
    result = await query();
  }
  if (result.status === 404)
    return {
      status: "unavailable" as const,
      provider: "CrUX",
      url,
      scope,
      reason: "insufficient field coverage; no good/bad inference",
    };
  if (result.status !== 200) throw new Error("provider-field-query-failed");
  const parsed = cruxResponse.parse(result.data),
    data = parsed.record;
  if (
    (scope === "url" && (!data.key.url || data.key.origin)) ||
    (scope === "origin" && (!data.key.origin || data.key.url))
  )
    throw new Error("provider-field-scope-mismatch");
  const expectedDevice =
    device === "all" ? undefined : device === "mobile" ? "PHONE" : "DESKTOP";
  if (data.key.formFactor !== expectedDevice)
    throw new Error("provider-field-device-mismatch");
  const returned = fetchKey(scope === "url" ? data.key.url! : data.key.origin!);
  const normalization = parsed.urlNormalizationDetails;
  if (scope === "origin") {
    if (new URL(returned).origin !== new URL(url).origin)
      throw new Error("provider-field-identity-mismatch");
  } else if (
    returned !== url &&
    (!normalization ||
      fetchKey(normalization.originalUrl) !== url ||
      fetchKey(normalization.normalizedUrl) !== returned ||
      new URL(returned).origin !== new URL(url).origin)
  )
    throw new Error("provider-field-identity-mismatch");
  const get = (name: string) => {
    const raw = data.metrics[name]?.percentiles.p75;
    if (raw === undefined) return null;
    const value = Number(raw);
    return metric.parse(value);
  };
  return {
    status: "observed" as const,
    requestedUrl: url,
    normalization:
      scope === "url" && returned !== url
        ? { originalUrl: url, normalizedUrl: returned }
        : null,
    measurement: parsePerformance({
      schemaVersion: 1,
      provider: "CrUX",
      method: "API import",
      scope,
      url:
        scope === "origin"
          ? (data.key.origin ?? new URL(url).origin)
          : (data.key.url ?? url),
      device,
      toolVersion: "CrUX API v1",
      timestamp: new Date().toISOString(),
      collectionStart: iso(data.collectionPeriod.firstDate),
      collectionEnd: iso(data.collectionPeriod.lastDate),
      metrics: {
        lcpMs: get("largest_contentful_paint"),
        cls: get("cumulative_layout_shift"),
        inpMs: get("interaction_to_next_paint"),
        tbtMs: null,
      },
      percentile: 75,
      sampling:
        "CrUX eligible field population; no traffic representativeness guarantee" +
        (scope === "origin" ? "; explicit origin fallback" : ""),
    }),
  };
}
const lighthouseResponse = z.object({
  lighthouseResult: z.object({
    lighthouseVersion: z.string(),
    requestedUrl: z.string(),
    finalUrl: z.string(),
    fetchTime: z.string(),
    audits: z.record(
      z.string(),
      z.object({
        numericValue: z.number().optional(),
        errorMessage: z.string().optional(),
      }),
    ),
    configSettings: z.record(z.string(), z.unknown()).optional(),
    runWarnings: z.array(z.string()).optional(),
    runtimeError: z.unknown().optional(),
  }),
});
/** Remote PSI lab runner, separate from local crawl contention and CrUX field data. */
export async function collectPageSpeed(
  options: {
    url: string;
    apiKey?: string;
    authorizedTransfer: boolean;
    device?: "mobile" | "desktop";
    repeats?: number;
    signal?: AbortSignal;
  },
  transport: ProviderTransport = googleTransport,
) {
  consent(options.authorizedTransfer);
  const url = fetchKey(options.url),
    device = options.device ?? "mobile",
    repeats = z
      .number()
      .int()
      .min(1)
      .max(3)
      .parse(options.repeats ?? 3);
  const measurements: z.infer<typeof PerformanceImport>[] = [];
  const diagnostics: unknown[] = [];
  for (let index = 0; index < repeats; index++) {
    const endpoint = new URL(
      "https://www.googleapis.com/pagespeedonline/v5/runPagespeed",
    );
    endpoint.searchParams.set("url", url);
    endpoint.searchParams.set("strategy", device);
    endpoint.searchParams.set("category", "PERFORMANCE");
    const result = await transport({
      url: endpoint.href,
      method: "GET",
      headers: keyHeaders(options.apiKey),
      signal: options.signal,
    });
    if (result.status !== 200) throw new Error("provider-lab-query-failed");
    const lhr = lighthouseResponse.parse(result.data).lighthouseResult;
    if (lhr.runtimeError) throw new Error("provider-lab-run-failed");
    if (fetchKey(lhr.requestedUrl) !== url)
      throw new Error("provider-lab-identity-mismatch");
    if (lhr.configSettings?.formFactor !== device)
      throw new Error("provider-lab-device-mismatch");
    const get = (id: string) =>
      lhr.audits[id]?.errorMessage
        ? null
        : (lhr.audits[id]?.numericValue ?? null);
    measurements.push(
      parsePerformance({
        schemaVersion: 1,
        provider: "Lighthouse",
        method: "API import",
        scope: "url",
        url: lhr.finalUrl,
        device,
        toolVersion: lhr.lighthouseVersion,
        timestamp: lhr.fetchTime,
        collectionStart: null,
        collectionEnd: null,
        metrics: {
          lcpMs: get("largest-contentful-paint"),
          cls: get("cumulative-layout-shift"),
          inpMs: null,
          tbtMs: get("total-blocking-time"),
        },
        percentile: null,
        sampling: `PageSpeed Insights remote navigation lab; run ${index + 1}/${repeats}; PSI environment distinct from local crawl; settings retained in diagnostics`,
      }),
    );
    diagnostics.push({
      requestedUrl: lhr.requestedUrl,
      finalUrl: lhr.finalUrl,
      warnings: lhr.runWarnings ?? [],
      configSettings: lhr.configSettings ?? null,
    });
  }
  const values = measurements
    .map((m) => m.metrics.lcpMs)
    .filter((n): n is number => n !== null)
    .sort((a, b) => a - b);
  return {
    measurements,
    diagnostics,
    variability: {
      lcpMs: values.length
        ? {
            minimum: values[0],
            maximum: values.at(-1),
            median: values[Math.floor(values.length / 2)],
          }
        : null,
      method: "bounded repeat sample; no calibrated population confidence",
    },
    limitations: [
      "Navigation lab is not field INP",
      "No causal ranking inference",
      "Provider capabilities exercised with synthetic contract tests; live service unverified",
    ],
  };
}

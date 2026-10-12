/** Explicit, validated manual imports. No dashboard-only endpoint is invented. */
import { z } from "zod";
import { fetchKey } from "./domain.ts";
import { SiteDataImport } from "./site-data.ts";
import type { Store } from "./store.ts";
const httpURL = z
  .string()
  .max(4096)
  .url()
  .refine((s) => {
    try {
      fetchKey(s);
      return true;
    } catch {
      return false;
    }
  });
const finite = z.number().finite().nonnegative();
export const SearchImport = z
  .strictObject({
    schemaVersion: z.literal(1),
    provider: z.literal("Google Search Console"),
    method: z.enum(["manual import", "API import"]),
    startDate: z.string().date(),
    endDate: z.string().date(),
    searchType: z.enum([
      "web",
      "image",
      "video",
      "news",
      "discover",
      "googleNews",
    ]),
    aggregation: z.enum(["byPage", "byProperty", "auto"]),
    complete: z.boolean(),
    filters: z
      .array(
        z.strictObject({
          dimension: z.enum([
            "page",
            "query",
            "country",
            "device",
            "searchAppearance",
          ]),
          operator: z.enum([
            "equals",
            "notEquals",
            "contains",
            "notContains",
            "includingRegex",
            "excludingRegex",
          ]),
          expression: z.string().max(1000),
        }),
      )
      .max(20)
      .optional(),
    limitations: z.string().min(1).max(2000),
    rows: z
      .array(
        z.strictObject({
          page: httpURL,
          query: z.string().max(1000),
          country: z.string().max(10),
          device: z.enum(["DESKTOP", "MOBILE", "TABLET"]),
          clicks: finite,
          impressions: finite,
          position: finite.nullable(),
        }),
      )
      .max(10000),
  })
  .refine((v) => v.startDate <= v.endDate, "Invalid date window");
export const PerformanceImport = z
  .strictObject({
    schemaVersion: z.literal(1),
    provider: z.enum(["CrUX", "Lighthouse"]),
    method: z.enum(["manual import", "API import", "local runner"]),
    scope: z.enum(["url", "origin"]),
    url: httpURL,
    device: z.enum(["mobile", "desktop", "all"]),
    toolVersion: z.string().min(1).max(100),
    timestamp: z.string().datetime(),
    collectionStart: z.string().date().nullable(),
    collectionEnd: z.string().date().nullable(),
    metrics: z.strictObject({
      lcpMs: finite.nullable(),
      cls: finite.nullable(),
      inpMs: finite.nullable(),
      tbtMs: finite.nullable(),
    }),
    percentile: z.number().min(0).max(100).nullable(),
    sampling: z.string().min(1).max(1000),
  })
  .superRefine((v, ctx) => {
    if (
      v.method === "local runner" &&
      (v.provider !== "Lighthouse" || v.scope !== "url" || v.device === "all")
    )
      ctx.addIssue({
        code: "custom",
        message:
          "Local lab runs require a Lighthouse page measurement and one device profile",
      });
    if (v.provider === "Lighthouse" && v.metrics.inpMs !== null)
      ctx.addIssue({
        code: "custom",
        message: "Navigation lab data must not claim field INP",
      });
    if (
      v.provider === "CrUX" &&
      (!v.collectionStart ||
        !v.collectionEnd ||
        v.percentile !== 75 ||
        v.metrics.tbtMs !== null)
    )
      ctx.addIssue({
        code: "custom",
        message: "CrUX needs field window and p75; TBT is a lab metric",
      });
  });
/** Retained legacy records remain readable; new input must satisfy provenance checks. */
export function performanceProvenance(
  data: z.infer<typeof PerformanceImport>,
): string[] {
  const issues: string[] = [];
  if ((data.collectionStart === null) !== (data.collectionEnd === null))
    issues.push("Provide both dates for the measurement period, or neither.");
  if (
    data.collectionStart &&
    data.collectionEnd &&
    data.collectionStart > data.collectionEnd
  )
    issues.push("The measurement period ends before it begins.");
  if (data.scope === "origin") {
    const url = new URL(data.url);
    if (url.pathname !== "/" || url.search || url.hash)
      issues.push(
        "An origin measurement must identify the website origin without a page path, query or fragment.",
      );
  }
  return issues;
}
export function parsePerformance(
  value: unknown,
): z.infer<typeof PerformanceImport> {
  const data = PerformanceImport.parse(value);
  if (performanceProvenance(data).length)
    throw new Error("performance-provenance-invalid");
  return data;
}
export function importData(
  store: Store,
  project: string,
  kind:
    | "search-console"
    | "performance"
    | "search-visibility"
    | "external-research"
    | "site-data",
  value: unknown,
): string {
  z.enum([
    "search-console",
    "performance",
    "search-visibility",
    "external-research",
    "site-data",
  ]).parse(kind);
  if (Buffer.byteLength(JSON.stringify(value)) > 5000000)
    throw new Error("import-size-budget");
  if (kind === "site-data") {
    const data = SiteDataImport.parse(value);
    if (!store.project(project).origins.includes(data.origin))
      throw new Error("import-project-scope");
    return store.addImport(project, kind, data);
  }
  const parsed =
    kind === "search-console"
      ? SearchImport.parse(value)
      : kind === "performance"
        ? parsePerformance(value)
        : kind === "search-visibility"
          ? VisibilityImport.parse(value)
          : ExternalResearchImport.parse(value);
  const origins = store.project(project).origins;
  const urls =
    "dataset" in parsed
      ? [
          parsed.url,
          ...parsed.rows.flatMap((r) => (r.targetPage ? [r.targetPage] : [])),
        ]
      : "rows" in parsed
        ? parsed.rows.map((r) => r.page)
        : [parsed.url];
  if (urls.some((url) => !origins.includes(new URL(url).origin)))
    throw new Error("import-project-scope");
  if ("rows" in parsed && !("dataset" in parsed)) {
    const keys = parsed.rows.map((r) =>
      "sampleId" in r
        ? r.sampleId
        : [r.page, r.query, r.country, r.device].join("\0"),
    );
    if (new Set(keys).size !== keys.length)
      throw new Error("duplicate-import-row");
  }
  return store.addImport(project, kind, parsed);
}
/** Recompute CTR from totals, preserving reporting windows and dimensions. */
export function demandReview(value: unknown) {
  const data = SearchImport.parse(value),
    pages = new Map<
      string,
      { clicks: number; impressions: number; queries: string[] }
    >();
  for (const row of data.rows) {
    const key = [row.page, row.country, row.device].join("\0"),
      record = pages.get(key) ?? { clicks: 0, impressions: 0, queries: [] };
    record.clicks += row.clicks;
    record.impressions += row.impressions;
    record.queries.push(row.query);
    pages.set(key, record);
  }
  return {
    provenance: { ...data, rows: undefined },
    pages: [...pages].map(([key, r]) => ({
      page: key.split("\0")[0],
      country: key.split("\0")[1],
      device: key.split("\0")[2],
      ...r,
      ctr: r.impressions ? r.clicks / r.impressions : null,
      decision: "review existing destination",
      interpretation:
        "Measured first-party demand; CTR alone does not establish poor content or ranking cause",
    })),
  };
}

/** Recorded samples/referrals only; there is no universal visibility denominator. */
export const VisibilityImport = z.strictObject({
  schemaVersion: z.literal(1),
  provider: z.string().min(1).max(100),
  method: z.literal("manual import"),
  methodology: z.string().min(10).max(2000),
  limitations: z.string().min(10).max(2000),
  rows: z
    .array(
      z
        .strictObject({
          sampleId: z.string().min(1).max(100),
          page: httpURL,
          observedAt: z.string().datetime(),
          market: z.string().min(1).max(100),
          language: z.string().min(1).max(50),
          kind: z.enum([
            "citation-observed",
            "citation-not-observed-in-sample",
            "referral-observed",
          ]),
          prompt: z.string().min(1).max(2000).nullable(),
          reference: httpURL.nullable(),
          referrals: finite.nullable(),
          evidenceNotes: z.string().min(1).max(2000),
        })
        .superRefine((row, ctx) => {
          if (row.kind !== "referral-observed" && !row.prompt)
            ctx.addIssue({
              code: "custom",
              message: "Citation samples require the recorded prompt",
            });
          if (row.kind !== "referral-observed" && row.referrals !== null)
            ctx.addIssue({
              code: "custom",
              message: "Citations are not referral counts",
            });
          if (row.kind === "referral-observed" && row.referrals === null)
            ctx.addIssue({
              code: "custom",
              message: "Referral observations require an actual count",
            });
        }),
    )
    .max(10000),
});

/** Supplier estimates and sampled observations remain separate from crawl outcomes. */
const researchBasis = {
  schemaVersion: z.literal(1),
  provider: z.string().min(1).max(100),
  method: z.literal("manual import"),
  url: httpURL.refine((value) => {
    const url = new URL(value);
    return url.pathname === "/" && !url.search && !url.hash;
  }, "Identify the project origin without a page path, query or fragment"),
  collectedAt: z.string().datetime(),
  market: z.string().min(1).max(100),
  language: z.string().min(1).max(50),
  device: z.enum(["desktop", "mobile", "all", "unknown"]),
  methodology: z.string().min(10).max(2000),
  limitations: z.string().min(10).max(2000),
};
const sampleId = z.string().min(1).max(100);
const keyword = z.string().min(1).max(1000);
export const ExternalResearchImport = z
  .discriminatedUnion("dataset", [
    z
      .strictObject({
        ...researchBasis,
        dataset: z.literal("keywords"),
        periodStart: z.string().date(),
        periodEnd: z.string().date(),
        volumeUnit: z.string().min(1).max(100),
        rows: z
          .array(
            z.strictObject({
              sampleId,
              keyword,
              targetPage: httpURL.nullable(),
              estimatedVolume: finite.nullable(),
              evidenceNotes: z.string().min(1).max(2000),
            }),
          )
          .min(1)
          .max(10000),
      })
      .refine((v) => v.periodStart <= v.periodEnd, "Invalid estimate period"),
    z.strictObject({
      ...researchBasis,
      dataset: z.literal("serp"),
      searchEngine: z.string().min(1).max(100),
      rows: z
        .array(
          z
            .strictObject({
              sampleId,
              keyword,
              targetPage: httpURL.nullable(),
              observedAt: z.string().datetime(),
              observedUrl: httpURL.nullable(),
              position: z.number().int().min(1).max(1000000).nullable(),
              resultType: z.string().min(1).max(100),
              evidenceNotes: z.string().min(1).max(2000),
            })
            .refine(
              (r) => r.observedUrl !== null || r.position === null,
              "An absent result cannot have a position",
            ),
        )
        .min(1)
        .max(10000),
    }),
    z.strictObject({
      ...researchBasis,
      dataset: z.literal("backlinks"),
      rows: z
        .array(
          z.strictObject({
            sampleId,
            targetPage: httpURL,
            sourcePage: httpURL,
            observedAt: z.string().datetime(),
            anchorText: z.string().max(2000).nullable(),
            relationship: z
              .array(z.enum(["nofollow", "sponsored", "ugc"]))
              .max(3),
            status: z.enum(["observed", "not-observed-in-sample"]),
            evidenceNotes: z.string().min(1).max(2000),
          }),
        )
        .min(1)
        .max(10000),
    }),
  ])
  .superRefine((data, ctx) => {
    if (new Set(data.rows.map((r) => r.sampleId)).size !== data.rows.length)
      ctx.addIssue({
        code: "custom",
        message: "Sample identifiers must be unique within an import",
      });
  });

/** Owner-normalised imports remain provider evidence, never Workbench page captures. */
import { z } from "zod";
import { fetchKey } from "./domain.ts";
const url = z
  .string()
  .url()
  .max(4096)
  .refine((value) => {
    try {
      fetchKey(value);
      return true;
    } catch {
      return false;
    }
  });
const count = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).nullable();
const amount = z.number().finite().nonnegative().nullable();
const text = z.string().min(1).max(1000).regex(/\S/).nullable();
const base = {
  schemaVersion: z.literal(1),
  method: z.literal("manual import"),
  provider: z.string().min(1).max(100).regex(/\S/),
  toolVersion: z.string().min(1).max(100).regex(/\S/).nullable(),
  origin: url,
  collectedAt: z.string().datetime(),
  startDate: z.string().date(),
  endDate: z.string().date(),
  timeZone: z.string().min(1).max(100).regex(/\S/).nullable(),
  filters: z.string().min(1).max(2000).regex(/\S/),
  sampling: z.string().min(10).max(2000).regex(/\S/),
  complete: z.boolean(),
  limitations: z.string().min(10).max(2000).regex(/\S/),
};
const row = {
  sampleId: z.string().min(1).max(100).regex(/\S/),
  page: url,
  evidenceNotes: z.string().min(1).max(2000).regex(/\S/),
};
export const SiteDataImport = z
  .discriminatedUnion("dataset", [
    z.strictObject({
      ...base,
      dataset: z.literal("bing-search"),
      provider: z.literal("Bing Webmaster Tools"),
      searchType: text,
      aggregation: z.enum(["page", "query", "page-query", "unknown"]),
      rows: z
        .array(
          z.strictObject({
            ...row,
            page: url.nullable(),
            query: z.string().max(1000).nullable(),
            country: z.string().max(100).nullable(),
            device: z.string().max(100).nullable(),
            clicks: count,
            impressions: count,
            averagePosition: amount,
          }),
        )
        .max(10000),
    }),
    z.strictObject({
      ...base,
      dataset: z.literal("analytics"),
      rows: z
        .array(
          z.strictObject({
            ...row,
            channel: text,
            country: text,
            device: text,
            sessions: count,
            users: count,
            keyEvents: amount,
            keyEventDefinition: text,
            revenue: amount,
            currency: z
              .string()
              .regex(/^[A-Z]{3}$/)
              .nullable(),
          }),
        )
        .max(10000),
    }),
    z.strictObject({
      ...base,
      dataset: z.literal("access-log"),
      rows: z
        .array(
          z.strictObject({
            ...row,
            requestMethod: z.enum([
              "GET",
              "HEAD",
              "POST",
              "PUT",
              "PATCH",
              "DELETE",
              "OPTIONS",
            ]),
            responseStatus: z.number().int().min(100).max(599).nullable(),
            requests: count,
            agentClass: z.enum([
              "human",
              "claimed-search-bot",
              "verified-search-bot",
              "other-bot",
              "unknown",
            ]),
            verificationMethod: text,
          }),
        )
        .max(10000),
    }),
    z.strictObject({
      ...base,
      dataset: z.literal("third-party-crawl"),
      rows: z
        .array(
          z.strictObject({
            ...row,
            observedAt: z.string().datetime().nullable(),
            responseStatus: z.number().int().min(100).max(599).nullable(),
            title: z.string().max(10000).nullable(),
            canonical: url.nullable(),
            renderMode: z.enum(["http", "javascript", "unknown"]),
          }),
        )
        .max(10000),
    }),
  ])
  .superRefine((data, ctx) => {
    const issue = (message: string) =>
      ctx.addIssue({ code: "custom", message });
    const origin = new URL(data.origin);
    if (origin.origin !== data.origin)
      issue("Provide an origin without a path, query or fragment.");
    if (data.startDate > data.endDate)
      issue("The collection window ends before it begins.");
    if (new Set(data.rows.map((row) => row.sampleId)).size !== data.rows.length)
      issue("Sample identifiers must be unique within the file.");
    for (const row of data.rows) {
      if (row.page !== null && new URL(row.page).origin !== data.origin)
        issue("Every observed page must belong to the supplied origin.");
      if (
        "clicks" in row &&
        row.clicks !== null &&
        row.impressions !== null &&
        row.clicks > row.impressions
      )
        issue("Clicks cannot exceed known impressions.");
      if (
        "keyEvents" in row &&
        row.keyEvents !== null &&
        row.keyEventDefinition === null
      )
        issue("Explain which events the supplied key-event count measures.");
      if (
        "revenue" in row &&
        (row.revenue === null) !== (row.currency === null)
      )
        issue(
          "Revenue and currency must both be supplied, or both be unknown.",
        );
      if (
        "agentClass" in row &&
        row.agentClass === "verified-search-bot" &&
        row.verificationMethod === null
      )
        issue(
          "A verified bot needs a recorded verification method; a user-agent claim alone is insufficient.",
        );
    }
  });

export const unavailableCrawlEvidence = [
  "Original response bytes and headers",
  "Rendered DOM and runtime errors",
  "Robots rules and redirect hops",
  "Workbench request profile and current page state",
];
export function siteDataReview(value: unknown) {
  const data = SiteDataImport.parse(value);
  const interpretation =
    data.dataset === "bing-search"
      ? "These are supplied Bing search records, not a complete indexed inventory or an explanation of ranking changes. Missing dimensions and metrics remain unknown."
      : data.dataset === "analytics"
        ? "These are supplied analytics records. Consent, filtering, sampling, attribution and metric definitions may affect them; they do not establish the cause of a crawl finding."
        : data.dataset === "access-log"
          ? "These are supplied aggregate request records. Request counts are not visitors, and a claimed bot identity is not proof of a verified search-engine visit. All classifications and verification methods are supplied by the owner, not independently verified by Workbench."
          : "These are supplied crawl facts, not Workbench captures. Missing original responses, browser evidence and collection settings prevent treating them as verified Workbench rule outcomes.";
  return {
    ...data,
    rowCount: data.rows.length,
    interpretation,
    unavailableEvidence:
      data.dataset === "third-party-crawl" ? unavailableCrawlEvidence : [],
  };
}

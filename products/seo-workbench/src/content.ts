/** Demand observations suggest review tasks; they never establish missing intent or harmful overlap. */
import { z } from "zod";
import { SearchImport } from "./imports.ts";
import { activeFacts } from "./rules.ts";
import {
  hash,
  fetchKey,
  scopeReason,
  type Config,
  type Observation,
} from "./domain.ts";
import type { Store } from "./store.ts";
const terms = (text: string) =>
  new Set(text.toLocaleLowerCase().match(/[\p{L}\p{N}]{2,}/gu) ?? []);
export function demandOpportunities(
  observations: Observation[],
  config: Config,
  imports: unknown[],
) {
  const pages = new Map(observations.map((o) => [o.url, o]));
  return imports.slice(-20).flatMap((value) => {
    const data = SearchImport.parse(value),
      queries = new Map<string, typeof data.rows>();
    for (const row of data.rows) {
      if (scopeReason(config, row.page) || !row.query.trim()) continue;
      const key = [row.query, row.country, row.device].join("\0"),
        rows = queries.get(key) ?? [];
      rows.push(row);
      queries.set(key, rows);
    }
    return [...queries.values()].map((rows) => {
      const query = rows[0].query,
        queryTerms = terms(query),
        destinations = rows.map((row) => {
          const o = pages.get(fetchKey(row.page)),
            f = o ? activeFacts(o) : null;
          const observedTerms = f
            ? terms(f.title + " " + f.headings.join(" ") + " " + f.text)
            : new Set<string>();
          return {
            ...row,
            evidenceIds: o ? [o.id] : [],
            sourcePassage: f?.text.slice(0, 750) ?? null,
            lexicalCoverage: f
              ? queryTerms.size
                ? [...queryTerms].filter((t) => observedTerms.has(t)).length /
                  queryTerms.size
                : null
              : null,
            collection: f ? "observed" : "not-observed",
          };
        });
      const missing = destinations.some((d) => d.collection === "not-observed"),
        weak = destinations.some(
          (d) => d.lexicalCoverage !== null && d.lexicalCoverage < 0.5,
        );
      return {
        id: hash(
          JSON.stringify([
            data.startDate,
            data.endDate,
            data.searchType,
            data.aggregation,
            query,
            rows[0].country,
            rows[0].device,
          ]),
        ).slice(0, 24),
        query,
        country: rows[0].country,
        device: rows[0].device,
        window: { start: data.startDate, end: data.endDate },
        provenance: {
          provider: data.provider,
          method: data.method,
          complete: data.complete,
          limitations: data.limitations,
          searchType: data.searchType,
          aggregation: data.aggregation,
        },
        destinations,
        review: missing
          ? "collect missing destination evidence"
          : destinations.length > 1
            ? "review distinct intent or justified consolidation"
            : weak
              ? "review existing page against observed question"
              : "validate existing answer usefulness",
        proposedDecision:
          "Review whether to improve the existing page or reject the idea. Propose a distinct page only after the owner confirms a different reader need that remains unanswered.",
        metrics: {
          impressions: rows.reduce((n, r) => n + r.impressions, 0),
          clicks: rows.reduce((n, r) => n + r.clicks, 0),
          estimatedSearchVolume: null,
          businessValue: null,
        },
        limitations: [
          "Impressions are added across the supplied query and page rows, using their original dates and filters. They are not deduplicated totals for the whole site.",
          "Several pages appearing for the same query does not establish that they compete harmfully with each other.",
          "Matching words can help guide a review, but their meaning depends on the language and context. Word overlap does not establish a complete answer or predict rankings.",
          "Treat repeated or overlapping imports as separate observations. Do not add their totals together.",
          "No estimates of total market demand or competitor search queries are supplied.",
        ],
      };
    });
  });
}
const referenceURL = z
  .string()
  .url()
  .max(4096)
  .refine((value) => {
    const url = new URL(value);
    return (
      ["http:", "https:"].includes(url.protocol) &&
      !url.username &&
      !url.password
    );
  });
export const ContentBriefSchema = z.strictObject({
  distinctUnmetNeed: z.string().trim().min(1).max(2000).optional(),
  reviewedExistingPages: z.array(referenceURL).min(1).max(20),
  factsAndSources: z
    .array(
      z.strictObject({
        claim: z.string().trim().min(1).max(2000),
        sourceURL: referenceURL,
      }),
    )
    .min(1)
    .max(50),
  proposedStructure: z.array(z.string().trim().min(1).max(200)).min(1).max(30),
  terminology: z.array(z.string().trim().min(1).max(100)).max(50),
  internalLinks: z.array(referenceURL).max(50),
  reviewRequirements: z
    .array(z.string().trim().min(1).max(1000))
    .min(1)
    .max(20),
  protectedConstraints: z.string().trim().min(1).max(2000),
});
export const ContentReviewSchema = z.strictObject({
  auditId: z.string().uuid(),
  url: z.string().url(),
  evidenceIds: z.array(z.string().uuid()).min(1).max(20),
  decision: z.enum([
    "improve-existing",
    "create-distinct",
    "review-consolidation",
    "reject",
  ]),
  rationale: z.string().min(10).max(3000),
  ownerRole: z.string().min(1).max(100),
  intent: z.string().min(1).max(1000),
  audience: z.string().min(1).max(1000),
  originalContribution: z.string().min(1).max(2000),
  successMeasures: z.string().min(1).max(1000),
  topic: z.string().min(1).max(200).optional(),
  cluster: z.string().min(1).max(200).optional(),
  brief: ContentBriefSchema.optional(),
});
/** Append reviewed intent independently of collected facts and rules. No publishing action follows. */
export function reviewContent(store: Store, value: unknown): string {
  const review = ContentReviewSchema.parse(value);
  if (review.decision === "create-distinct" && !review.brief?.distinctUnmetNeed)
    throw new Error("content-distinct-need-required");
  if (store.db.isTransaction) throw new Error("database-transaction-active");
  store.db.exec("BEGIN IMMEDIATE");
  try {
    const audit = store.audit(review.auditId),
      url = fetchKey(review.url),
      o = store.observation(review.auditId, url);
    if (!o || review.evidenceIds.some((id) => id !== o.id))
      throw new Error("content-review-evidence-mismatch");
    const reviewedExistingEvidence: { url: string; evidenceId: string }[] = [];
    if (review.brief) {
      for (const page of new Set(
        review.brief.reviewedExistingPages.map((url) => fetchKey(url)),
      )) {
        if (scopeReason(audit.config, page))
          throw new Error("content-brief-page-unavailable");
        const row = store.db
          .prepare(
            "SELECT id FROM observations WHERE audit_id=? AND url=? AND json_extract(data,'$.response.status')=200 AND json_type(data,'$.facts')='object'",
          )
          .get(audit.id, page);
        if (!row) throw new Error("content-brief-page-unavailable");
        reviewedExistingEvidence.push({
          url: page,
          evidenceId: String(row.id),
        });
      }
      if (
        review.brief.internalLinks.some((url) =>
          scopeReason(audit.config, fetchKey(url)),
        )
      )
        throw new Error("content-brief-link-scope");
    }
    const id = store.addImport(audit.projectId, "content-review", {
      ...review,
      url,
      reviewedAt: new Date().toISOString(),
      reviewedExistingEvidence,
      briefCompleteness: review.brief ? "complete-owner-draft" : "incomplete",
      sourceReview:
        "References were supplied by the owner. They were not fetched or independently verified.",
      status:
        "The owner saved a proposed decision. No content was published and no project requirements were changed.",
    });
    store.db.exec("COMMIT");
    return id;
  } catch (error) {
    if (store.db.isTransaction) store.db.exec("ROLLBACK");
    throw error;
  }
}

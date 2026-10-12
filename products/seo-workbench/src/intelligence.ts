/** Graph/content review uses collected evidence only. No fabricated demand or revenue. */
import { z } from "zod";
import {
  hash,
  contractFor,
  type Config,
  type Observation,
  type RuleResult,
} from "./domain.ts";
import { activeFacts, rules } from "./rules.ts";
import type { Store } from "./store.ts";
import { ContentReviewSchema } from "./content.ts";

export function graph(
  observations: Observation[],
  seeds: string[],
  config?: Config,
) {
  const nodes = new Map(
    observations.map((o) => [
      o.url,
      {
        url: o.url,
        template: config
          ? (contractFor(config, o.url)?.template ?? "unclassified")
          : "unclassified",
        language: activeFacts(o)?.language || "unknown",
        section: "/" + (new URL(o.url).pathname.split("/")[1] ?? ""),
        depth: null as number | null,
        inlinks: 0,
        outlinks: 0,
        edges: activeFacts(o)?.edges ?? [],
      },
    ]),
  );
  for (const node of nodes.values()) {
    for (const edge of node.edges.filter((e) =>
      ["hyperlink", "navigation"].includes(e.kind),
    )) {
      node.outlinks++;
      const target = nodes.get(edge.target);
      if (target) target.inlinks++;
    }
  }
  const queue = seeds.filter((url) => nodes.has(url));
  queue.forEach((url) => {
    nodes.get(url)!.depth = 0;
  });
  for (let i = 0; i < queue.length; i++) {
    const node = nodes.get(queue[i])!;
    for (const edge of node.edges.filter((e) =>
      ["hyperlink", "navigation"].includes(e.kind),
    )) {
      const target = nodes.get(edge.target);
      if (target && target.depth === null) {
        target.depth = node.depth! + 1;
        queue.push(target.url);
      }
    }
  }
  return [...nodes.values()];
}
/** Group symptoms by rule and declared template; shared cause remains explicitly inferred. */
export function groups(
  results: Iterable<RuleResult>,
  config: Config,
  reviews: unknown[] = [],
  analysisId?: string,
  sourceMappings: unknown[] = [],
) {
  const grouped = new Map<
    string,
    {
      first: RuleResult;
      affected: string[];
      evidenceIds: string[];
      activeCount: number;
      important: boolean;
      failed: boolean;
    }
  >();
  let retainedBytes = 0;
  for (const result of results) {
    if (
      !["fail", "warning"].includes(result.outcome) &&
      !(
        result.ruleId === "http-status" &&
        ["error", "blocked"].includes(result.outcome)
      )
    )
      continue;
    const contract = contractFor(config, result.url),
      template = contract?.template ?? "unclassified",
      key = result.ruleId + "\0" + template;
    const item = grouped.get(key) ?? {
      first: result,
      affected: [],
      evidenceIds: [],
      activeCount: 0,
      important: false,
      failed: false,
    };
    retainedBytes +=
      Buffer.byteLength(result.url) +
      Buffer.byteLength(JSON.stringify(result.evidenceIds)) +
      128;
    if (!grouped.has(key))
      retainedBytes += Buffer.byteLength(JSON.stringify(result));
    if (retainedBytes > config.maxMemoryBytes / 4)
      throw new Error("results-memory-budget");
    item.affected.push(result.url);
    for (const evidence of result.evidenceIds) item.evidenceIds.push(evidence);
    if (!result.exception) {
      item.activeCount++;
      item.important ||= contract?.importance === "important";
      item.failed ||= result.outcome === "fail";
    }
    grouped.set(key, item);
  }
  return [...grouped.entries()]
    .map(([key, items]) => {
      const { first, activeCount, important, failed } = items;
      const priority = !activeCount
        ? "excepted"
        : failed && important
          ? "P1"
          : failed
            ? "P2"
            : "review";
      const groupId = hash(key).slice(0, 24),
        sourceMapping =
          sourceMappings.findLast(
            (r: any) =>
              analysisId &&
              r.groupId === groupId &&
              r.analysisId === analysisId,
          ) ?? null,
        review = reviews.findLast(
          (r: any) =>
            analysisId && r.groupId === groupId && r.analysisId === analysisId,
        ) as
          | {
              priority: string;
              rationale: string;
              ownerRole: string;
              effort: string;
              changeRisk: string;
              dependencies: string;
              basis: string;
              reviewedAt: string;
            }
          | undefined;
      return {
        id: groupId,
        analysisId: analysisId ?? null,
        computedPriority: priority,
        ownerReview: review ?? null,
        sourceMapping,
        ruleId: first.ruleId,
        title: rules.find((r) => r.id === first.ruleId)?.title ?? first.ruleId,
        template: key.split("\0")[1],
        priority: review?.priority ?? priority,
        severity: first.severity,
        affected: items.affected,
        activeCount: activeCount,
        exceptedCount: items.affected.length - activeCount,
        cause: sourceMapping
          ? "The owner linked a checked source-file version to these findings. A shared cause still needs to be confirmed against the website evidence."
          : "These pages may share a template problem. No source-code mapping was supplied, so a common cause still needs to be confirmed.",
        impact:
          "Business impact is unknown because no business measurements were supplied.",
        priorityInputs: {
          importantPage: important,
          contractFailure: failed,
          activePages: activeCount,
          methodology:
            "0.1: prioritize important contract failures, then other contract failures, then contextual review; no symptom-count multiplier",
        },
        action: {
          issue: first.reason,
          evidenceIds: items.evidenceIds,
          solution: first.remediation,
          alternatives:
            "Confirm intended exclusion or update the approved expectation only through a reviewed decision.",
          risks:
            "Preserve user journeys, accessibility and intentional exclusions.",
          dependencies:
            "Review intent and source ownership before applying changes.",
          ownerRole: review?.ownerRole ?? "site maintainer",
          acceptance: first.verification,
          verification: first.verification,
          effort: review?.effort ?? "unknown",
          changeRisk: review?.changeRisk ?? "requires review",
          ownerDependencies: review?.dependencies ?? null,
        },
      };
    })
    .sort(
      (a, b) =>
        a.priority.localeCompare(b.priority) ||
        a.ruleId.localeCompare(b.ruleId),
    );
}
/** Lexical topic inventory is inspectable and bounded, not keyword demand research. */
export function opportunities(
  observations: Observation[],
  config: Config,
  queryImports: unknown[] = [],
  contentReviews: unknown[] = [],
) {
  const reviewed = new Map<string, z.infer<typeof ContentReviewSchema>>();
  for (const value of contentReviews) {
    const parsed = ContentReviewSchema.passthrough().safeParse(value);
    if (!parsed.success) throw new Error("content-review-record-invalid");
    reviewed.set(parsed.data.url, parsed.data);
  }
  const firstParty = new Map<string, unknown[]>();
  for (const value of queryImports) {
    const data = value as {
      rows?: {
        page: string;
        query: string;
        country: string;
        device: string;
        clicks: number;
        impressions: number;
      }[];
      startDate: string;
      endDate: string;
      complete: boolean;
      searchType: string;
      aggregation: string;
      method: string;
    };
    for (const row of data.rows ?? []) {
      const list = firstParty.get(row.page) ?? [];
      list.push({
        ...row,
        startDate: data.startDate,
        endDate: data.endDate,
        complete: data.complete,
        searchType: data.searchType,
        aggregation: data.aggregation,
        provenance: "Google Search Console " + data.method,
      });
      firstParty.set(row.page, list);
    }
  }
  const stop = new Set([
    "the",
    "and",
    "for",
    "with",
    "this",
    "that",
    "from",
    "are",
    "you",
    "your",
    "into",
    "our",
    "not",
  ]);
  const frequencies = new Map<string, number>();
  for (const o of observations)
    for (const word of activeFacts(o)?.words ?? [])
      if (!stop.has(word))
        frequencies.set(word, (frequencies.get(word) ?? 0) + 1);
  return observations
    .filter((o) => activeFacts(o)?.text)
    .map((o) => {
      const f = activeFacts(o)!;
      const saved = reviewed.get(o.url),
        ownerReview = saved?.evidenceIds.includes(o.id) ? saved : null;
      const terms = f.words
        .filter((w) => !stop.has(w))
        .sort(
          (a, b) =>
            (frequencies.get(a) ?? 0) - (frequencies.get(b) ?? 0) ||
            a.localeCompare(b),
        )
        .slice(0, 8);
      return {
        id: hash("content\0" + o.url).slice(0, 24),
        url: o.url,
        title: f.title,
        terms,
        sourcePassage: f.text.slice(0, 750),
        evidenceIds: [o.id],
        intent:
          ownerReview?.intent ??
          "Review what the reader wants to do on this page.",
        topic: ownerReview?.topic ?? null,
        cluster: ownerReview?.cluster ?? null,
        ownerReview,
        decision: ownerReview?.decision ?? "review existing page",
        demand: null,
        businessFit: null,
        firstPartyDataAvailable: firstParty.has(o.url),
        firstPartyEvidence: (firstParty.get(o.url) ?? []).slice(0, 100),
        brief: {
          draftState: ownerReview?.brief
            ? "complete-owner-draft"
            : "incomplete",
          audience: ownerReview?.audience ?? "Define the intended audience.",
          existingDestination: o.url,
          originalContribution:
            ownerReview?.originalContribution ??
            "Identify the useful original information to add.",
          factsAndSources: ownerReview?.brief?.factsAndSources ?? [o.id],
          sourceReview:
            "Supplied references and claims require human verification; the workbench does not certify their truth.",
          distinctUnmetNeed: ownerReview?.brief?.distinctUnmetNeed ?? null,
          reviewedExistingPages:
            ownerReview?.brief?.reviewedExistingPages ?? [],
          protectedConstraints:
            ownerReview?.brief?.protectedConstraints ?? null,
          proposedStructure:
            ownerReview?.brief?.proposedStructure ?? f.headings,
          terminology: ownerReview?.brief?.terminology ?? terms,
          internalLinks:
            ownerReview?.brief?.internalLinks ??
            f.edges.filter((e) => e.kind === "hyperlink").slice(0, 10),
          reviewRequirements: ownerReview?.brief?.reviewRequirements ?? [
            "Confirm what the reader needs and whether the page provides useful original information.",
            "Do not create a new page just because a word appears in the collected text.",
            "Advice that could affect health, finances or safety needs review by a qualified person.",
          ],
          successMeasures:
            ownerReview?.successMeasures ??
            "Define how to judge the result. No ranking improvement is predicted.",
        },
      };
    });
}
export interface ComparisonMap {
  fromOrigin?: string;
  toOrigin?: string;
  urls?: Record<string, string>;
}
const comparisonUrl = z
  .string()
  .url()
  .refine((value) => {
    try {
      const url = new URL(value);
      return (
        ["http:", "https:"].includes(url.protocol) &&
        !url.username &&
        !url.password &&
        !url.hash
      );
    } catch {
      return false;
    }
  });
const comparisonOrigin = comparisonUrl
  .refine((value) => {
    try {
      const url = new URL(value);
      return url.pathname === "/" && !url.search;
    } catch {
      return false;
    }
  })
  .transform((value) => new URL(value).origin);
export const ComparisonMapping = z
  .strictObject({
    fromOrigin: comparisonOrigin.optional(),
    toOrigin: comparisonOrigin.optional(),
    urls: z.record(comparisonUrl, comparisonUrl).optional(),
  })
  .refine((value) => Boolean(value.fromOrigin) === Boolean(value.toOrigin));
/** Resolution requires a newly observed applicable pass under compatible expectations. */
export function compare(
  store: Store,
  before: string,
  after: string,
  mapping: ComparisonMap = {},
) {
  const parsed = ComparisonMapping.safeParse(mapping);
  if (!parsed.success) throw new Error("comparison-mapping-invalid");
  mapping = parsed.data;
  const old = store.audit(before),
    next = store.audit(after);
  const mapped = (url: string) =>
    mapping.urls?.[url] ??
    (mapping.fromOrigin &&
    mapping.toOrigin &&
    new URL(url).origin === mapping.fromOrigin
      ? mapping.toOrigin + url.slice(mapping.fromOrigin.length)
      : url);
  store.assertCompleteResults(before);
  store.assertCompleteResults(after);
  const a = store.results(before, { limit: 1000000 }),
    b = store.results(after, { limit: 1000000 });
  const sources = new Map<string, Set<string>>();
  for (const r of a) {
    const target = mapped(r.url);
    const urls = sources.get(target) ?? new Set<string>();
    urls.add(r.url);
    sources.set(target, urls);
  }
  const ambiguous = (url: string) => (sources.get(url)?.size ?? 0) > 1;
  const previousById = new Map(
    a.map((r) => [r.ruleId + "\0" + mapped(r.url), r]),
  );
  const byId = new Map(b.map((r) => [r.ruleId + "\0" + r.url, r]));
  const configComparable =
    JSON.stringify({
      ...old.config,
      name: undefined,
      seeds: old.config.seeds.map(mapped),
      origins: old.config.origins.map(mapped),
      inventory: old.config.inventory.map(mapped),
      sitemaps: old.config.sitemaps.map(mapped),
      contracts: old.config.contracts.map((c) => ({
        ...c,
        canonical: c.canonical ? mapped(c.canonical) : undefined,
        requiredLinks: c.requiredLinks.map(mapped),
        requiredAlternates: c.requiredAlternates.map((a) => ({
          ...a,
          target: mapped(a.target),
        })),
      })),
    }) ===
    JSON.stringify({
      ...next.config,
      name: undefined,
      contracts: next.config.contracts.map((c) => ({
        ...c,
        canonical: c.canonical,
      })),
    });
  const changes: {
    ruleId: string;
    url: string;
    state: string;
    before: RuleResult | null;
    after: RuleResult | null;
    reason: string;
  }[] = [];
  for (const r of a.filter(
    (r) =>
      ["fail", "warning"].includes(r.outcome) ||
      (r.ruleId === "http-status" && ["error", "blocked"].includes(r.outcome)),
  )) {
    const latest = byId.get(r.ruleId + "\0" + mapped(r.url));
    const comparable =
      configComparable &&
      !ambiguous(mapped(r.url)) &&
      latest?.ruleVersion === r.ruleVersion;
    const state =
      !latest ||
      !comparable ||
      ["not-tested", "blocked", "error", "not-applicable"].includes(
        latest.outcome,
      )
        ? "not-verifiable"
        : latest.outcome === "pass"
          ? "resolved"
          : latest.outcome === r.outcome
            ? "persisting"
            : "changed";
    changes.push({
      ruleId: r.ruleId,
      url: mapped(r.url),
      state,
      before: r,
      after: latest ?? null,
      reason:
        state === "not-verifiable"
          ? "The issue cannot be verified because evidence is missing, several old pages map to one new page, the rule version differs or the project settings changed."
          : "This compares the saved page evidence. It does not establish later changes in search rankings or traffic.",
    });
  }
  const oldKeys = new Set(
    a
      .filter(
        (r) =>
          ["fail", "warning"].includes(r.outcome) ||
          (r.ruleId === "http-status" &&
            ["error", "blocked"].includes(r.outcome)),
      )
      .map((r) => r.ruleId + "\0" + mapped(r.url)),
  );
  for (const r of b.filter(
    (r) => r.outcome === "fail" || r.outcome === "warning",
  ))
    if (!oldKeys.has(r.ruleId + "\0" + r.url)) {
      const previous = previousById.get(r.ruleId + "\0" + r.url);
      const comparable =
        configComparable &&
        !ambiguous(r.url) &&
        previous?.outcome === "pass" &&
        previous.ruleVersion === r.ruleVersion;
      changes.push({
        ruleId: r.ruleId,
        url: r.url,
        state: comparable ? "introduced" : "not-verifiable",
        before: null,
        after: r,
        reason: comparable
          ? "The newer audit contains a finding that was not present under the same settings and rule version."
          : "The issue cannot be compared because its earlier evidence is missing or its page mapping, settings or rule version changed.",
      });
    }
  return {
    before,
    after,
    configComparable,
    mapping,
    changes,
    coverageBefore: store.coverage(before),
    coverageAfter: store.coverage(after),
    limitations: [
      "Resolution applies to tested observation, not indexing or traffic",
      "Missing URLs and changed contracts do not resolve findings",
      "This compares saved analyses. Use a saved recheck plan for dependency coverage, evidence freshness and a recorded fix-verification decision.",
    ],
  };
}

/** Operator performance budgets are diagnostic expectations, separate from SEO/index/ranking outcomes. */
import { PerformanceImport, performanceProvenance } from "./imports.ts";
import { scopeReason, type Config } from "./domain.ts";
export function performanceReview(values: unknown[], config: Config) {
  return values.slice(-100).map((value) => {
    const data = PerformanceImport.parse(value),
      kind = data.provider === "CrUX" ? "field" : "lab",
      budget = config.performanceBudgets?.[kind],
      provenanceIssues = performanceProvenance(data),
      scopeIssue =
        data.scope === "origin"
          ? config.origins.includes(new URL(data.url).origin)
            ? null
            : "origin"
          : scopeReason(config, data.url);
    const metrics = Object.entries(data.metrics).map(([name, observed]) => {
      const threshold = budget?.[name as keyof typeof budget];
      return {
        name,
        observed,
        threshold: threshold ?? null,
        outcome: provenanceIssues.length
          ? "invalid-provenance"
          : scopeIssue
            ? "outside-audit-scope"
            : observed === null
              ? "unavailable"
              : threshold === undefined
                ? "no-approved-budget"
                : observed > threshold
                  ? "above-approved-budget"
                  : "within-approved-budget",
      };
    });
    return {
      measurement: data,
      budgetVersion: config.performanceBudgets?.version ?? null,
      kind,
      provenanceIssues,
      auditScope: { withinScope: scopeIssue === null, reason: scopeIssue },
      metrics,
      collectionTiming:
        "Measurement dates and real-visitor reporting periods are separate from the crawl date. This does not establish that a speed test ran at the same time as the crawl.",
      limitations: [
        "Speed limits reflect the owner’s requirements. They are not direct search-ranking or accessibility requirements.",
        "Real-visitor data for an entire website origin does not describe an individual page.",
        "Total Blocking Time (TBT) from a test is different from Interaction to Next Paint (INP) measured from real visitors. Missing measurements remain unknown.",
        "Changes in provider measurements or reporting periods do not by themselves establish what caused a performance change.",
      ],
    };
  });
}

import { siteDataReview } from "./site-data.ts";
/** Portable exports never embed captured HTML or fetch third-party resources. */
import { rules } from "./rules.ts";
import { performanceReview } from "./performance.ts";
import { searchControls } from "./search-controls.ts";
import { demandOpportunities } from "./content.ts";
import { groups, opportunities } from "./intelligence.ts";
import { VERSION } from "./domain.ts";
import { modelUsage } from "./model-allowance.ts";
import type { Store } from "./store.ts";
import type { RuleResult } from "./domain.ts";

export function escapeHTML(value: unknown): string {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
}
export function csvCell(value: unknown): string {
  let text = safeText(value);
  if (/^[\s\p{Cf}]*[=+\-@＝＋－＠\t\r\n]/u.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}
export function safeText(value: unknown): string {
  return String(value ?? "").replace(
    /[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/g,
    "",
  );
}
/** Shareable exports omit URLs, page passages, observations and project-specific expectations. */
function reportContext(
  store: Store,
  id: string,
  profile: "private" | "shareable",
  analysisId: string | null,
  results: Iterable<RuleResult>,
) {
  const audit = store.audit(id),
    findingGroups = groups(
      results,
      audit.config,
      store
        .imports(audit.projectId, "action-review")
        .filter((r: any) => r.auditId === id),
      analysisId ?? undefined,
      store
        .imports(audit.projectId, "source-mapping")
        .filter((r: any) => r.auditId === id),
    );
  const summary = {
    formatVersion: 1,
    productVersion: VERSION,
    auditId: id,
    analysisId,
    generatedAt: new Date().toISOString(),
    synthetic: audit.config.environment === "synthetic",
    profile,
    state: audit.state,
    coverage: store.coverage(id),
    limitations: [
      "These checks do not produce an SEO score or predict search rankings.",
      "Indexing, rankings and traffic remain unknown unless you import relevant measurements.",
      "Warnings need a person to review the page’s purpose and intended behaviour.",
      "Browser checks run only when a permitted browser environment is configured. Inspect each page to see whether its browser check completed.",
    ],
  };
  if (profile === "shareable")
    return {
      ...summary,
      coverage: {
        knownInventory: summary.coverage.knownInventory,
        totalSiteSize: null,
        states: summary.coverage.states,
        render: summary.coverage.render,
        pageResponseStatuses: summary.coverage.pageResponseStatuses,
        analysisAvailable: summary.coverage.analysisAvailable,
        requests: summary.coverage.requests,
        bytes: summary.coverage.bytes,
        storageBytes: summary.coverage.storageBytes,
        state: summary.coverage.state,
        stopExplanation: summary.coverage.stopExplanation,
        completeDiscoveredQueue: summary.coverage.completeDiscoveredQueue,
        limitations: summary.coverage.limitations,
        scope: ["redacted"],
        httpRequestIdentity: "Anonymous crawler; profile details redacted",
      },
      project: "Redacted project",
      groups: findingGroups.map((g) => ({
        ruleId: g.ruleId,
        priority: g.priority,
        severity: g.severity,
        affectedCount: g.affected.length,
        remediation:
          "Read the private report for the affected pages, evidence and recommended steps.",
      })),
      opportunities: [],
      demandOpportunities: [],
      contentReviews: [],
      searchControls: [],
      searchVisibility: [],
      externalResearch: [],
      siteData: [],
      extractorFacts: [],
      verification: [],
      performance: [],
      localLabSeries: [],
      modelUsage: null,
    };
  const observations = store.analysisObservations(id);
  return {
    ...summary,
    project: audit.config.name,
    config: audit.config,
    groups: findingGroups,
    demandOpportunities: demandOpportunities(
      observations,
      audit.config,
      store.imports(audit.projectId, "search-console"),
    ),
    performance: performanceReview(
      store.imports(audit.projectId, "performance"),
      audit.config,
    ),
    localLabSeries: store.imports(audit.projectId, "local-lab-series"),
    modelUsage: modelUsage(store, id),
    searchVisibility: store.imports(audit.projectId, "search-visibility"),
    externalResearch: store.imports(audit.projectId, "external-research"),
    siteData: store.imports(audit.projectId, "site-data").map(siteDataReview),
    extractorFacts: observations.flatMap((page) => page.extensionFacts ?? []),
    verification: store
      .imports(audit.projectId, "verification-run")
      .filter((r: any) => r.auditId === id || r.baselineAuditId === id),
    searchControls: searchControls(observations),
    contentReviews: store
      .imports(audit.projectId, "content-review")
      .filter((r: any) => r.auditId === id),
    opportunities: opportunities(
      observations,
      audit.config,
      store.imports(audit.projectId, "search-console"),
      store
        .imports(audit.projectId, "content-review")
        .filter((r: any) => r.auditId === id),
    ),
  };
}
function sharedResult(result: RuleResult) {
  return {
    ruleId: result.ruleId,
    ruleVersion: result.ruleVersion,
    outcome: result.outcome,
    sourceIds: result.sourceIds,
  };
}
export function reportData(
  store: Store,
  id: string,
  profile: "private" | "shareable" = "private",
) {
  store.assertCompleteResults(id);
  const analysis = store.latestAnalysis(id),
    results = analysis ? store.results(id, { limit: 1_000_000, analysis }) : [];
  return {
    ...reportContext(store, id, profile, analysis, results),
    results: profile === "shareable" ? results.map(sharedResult) : results,
  };
}
/** Stream the same JSON contract; no complete result set or report string is retained. */
export function* jsonReport(
  store: Store,
  id: string,
  profile: "private" | "shareable" = "private",
): Generator<string> {
  const analysis = store.latestAnalysis(id);
  const expected = analysis
    ? Number(
        store.db
          .prepare("SELECT COUNT(*) AS n FROM results WHERE analysis_id=?")
          .get(analysis)!.n,
      )
    : 0;
  const context = reportContext(
    store,
    id,
    profile,
    analysis,
    analysis ? store.allResults(id, analysis) : [],
  );
  const results = analysis ? store.allResults(id, analysis) : [];
  function* projected() {
    for (const result of results)
      yield profile === "shareable" ? sharedResult(result) : result;
  }
  yield* jsonFields(context, projected(), expected);
}
function* jsonFields(
  context: Record<string, unknown>,
  results: Iterable<unknown>,
  expected: number,
): Generator<string> {
  yield "{\n";
  for (const [key, value] of Object.entries(context)) {
    if (value === undefined) continue;
    yield JSON.stringify(key) + ":";
    if (Array.isArray(value)) {
      yield "[";
      for (let i = 0; i < value.length; i++)
        yield (i ? "," : "") + JSON.stringify(value[i]);
      yield "]";
    } else yield JSON.stringify(value);
    yield ",\n";
  }
  yield '"results":[';
  let count = 0;
  for (const result of results) {
    yield (count ? "," : "") + JSON.stringify(result);
    count++;
  }
  if (count !== expected) throw new Error("report-analysis-changed");
  yield "]\n}\n";
}

function csvRow(result: RuleResult, profile: "private" | "shareable"): string {
  return (
    [
      result.ruleId,
      result.outcome,
      profile === "private" ? result.url : "redacted",
      profile === "private" ? result.reason : "See private evidence",
    ]
      .map(csvCell)
      .join(",") + "\n"
  );
}
/** Complete CSV output without retaining the full result set or output string. */
export function* csvReport(
  store: Store,
  id: string,
  profile: "private" | "shareable" = "private",
): Generator<string> {
  store.audit(id);
  const analysis = store.latestAnalysis(id);
  const expected = analysis
    ? Number(
        store.db
          .prepare("SELECT COUNT(*) AS n FROM results WHERE analysis_id=?")
          .get(analysis)!.n,
      )
    : 0;
  let count = 0;
  yield ["rule", "outcome", "url", "reason"].map(csvCell).join(",") + "\n";
  if (analysis)
    for (const result of store.allResults(id, analysis)) {
      yield csvRow(result, profile);
      count++;
    }
  if (count !== expected) throw new Error("report-analysis-changed");
}

export function* reportChunks(
  store: Store,
  id: string,
  format: "json" | "markdown" | "html" | "csv",
  profile: "private" | "shareable" = "private",
): Generator<string> {
  if (format === "csv") {
    yield* csvReport(store, id, profile);
    return;
  }
  if (format === "json") {
    yield* jsonReport(store, id, profile);
    return;
  }
  const analysis = store.latestAnalysis(id);
  const counts = new Map<
    string,
    { ruleId: string; outcome: string; count: number }
  >();
  let expected = 0,
    detailedCount = 0;
  function* counted() {
    if (analysis)
      for (const result of store.allResults(id, analysis)) {
        const key = result.ruleId + "\0" + result.outcome,
          entry = counts.get(key) ?? {
            ruleId: result.ruleId,
            outcome: result.outcome,
            count: 0,
          };
        entry.count++;
        counts.set(key, entry);
        expected++;
        if (result.outcome !== "pass" && result.outcome !== "not-applicable")
          detailedCount++;
        yield result;
      }
  }
  const data = {
    ...reportContext(store, id, profile, analysis, counted()),
    resultSummary: [...counts.values()],
  };
  function* detailed() {
    let read = 0;
    if (analysis)
      for (const result of store.allResults(id, analysis)) {
        read++;
        if (result.outcome !== "pass" && result.outcome !== "not-applicable")
          yield profile === "shareable" ? sharedResult(result) : result;
      }
    if (read !== expected) throw new Error("report-analysis-changed");
  }
  const resultExplanation =
    "Passed checks and checks that do not apply are counted in the summary below. Other results retain their individual explanations and saved evidence. Export JSON or CSV for every individual check result.";

  const ruleTitle = (id: string) => rules.find((r) => r.id === id)?.title ?? id;
  const coverage = data.coverage as Record<string, any>;
  const number = (value: number) => value.toLocaleString("en-GB");
  const status: Record<string, string> = {
    queued: "This audit is waiting to start.",
    running: "Page collection is in progress.",
    analyzing: "The collected pages are being analysed.",
    complete: "Page collection and analysis have finished.",
    partial: "Page collection stopped before it could finish.",
    paused: "This audit is paused.",
    cancelled: "This audit was cancelled.",
    error: "This audit stopped after an error.",
  };
  const summary = `${data.synthetic ? "SYNTHETIC DEMONSTRATION. These results come from a fictional test site.\n" : ""}${data.project}\n${status[data.state] ?? "The audit status is unavailable."} It found ${number(coverage.knownInventory)} page URLs; the total number of pages on the site is unknown.\nThis is a ${profile === "private" ? "report containing private page evidence" : "summary with page URLs and captured content removed"}.\n`;
  const extractionCounts = (coverage.extractors ?? []).reduce(
    (counts: Record<string, number>, row: any) => {
      counts[row.status] = (counts[row.status] ?? 0) + row.count;
      return counts;
    },
    {} as Record<string, number>,
  );
  const extractionText = coverage.extractors?.length
    ? ` Custom extractors returned facts ${number(extractionCounts.observed ?? 0)} times. ${number(extractionCounts["not-tested"] ?? 0)} attempts lacked the required evidence, and ${number(extractionCounts.error ?? 0)} failed. These results are separate from the built-in rule outcomes.`
    : "";
  const coverageText = `The crawler fetched ${number(coverage.states.fetched ?? 0)} pages. ${number(coverage.states.queued ?? 0)} are still waiting, ${number(coverage.states.excluded ?? 0)} were excluded and ${number(coverage.states.blocked ?? 0)} could not be accessed.${coverage.stopExplanation ? " " + coverage.stopExplanation : ""}${!coverage.analysisAvailable ? " No analysis is available. Review coverage before drawing conclusions." : ""}${extractionText}`;
  const actionText = (g: any): string =>
    g.action
      ? `${g.title}. ${number(g.affected.length)} page URLs are affected. Priority: ${g.priority}.\nWhat to do: ${g.action.solution}\nHow to check the fix: ${g.action.verification}\nOwner role: ${g.action.ownerRole}. Estimated effort: ${g.action.effort}. Estimated change risk: ${g.action.changeRisk}.\nBefore changing the page: ${g.action.ownerDependencies ?? g.action.dependencies}\nWhat to watch for: ${g.action.risks}${g.sourceMapping ? `\nOwner source reference: ${g.sourceMapping.file}, lines ${g.sourceMapping.startLine}–${g.sourceMapping.endLine}. Checked on ${g.sourceMapping.verifiedAt}. The owner supplied this connection; a common cause still needs to be confirmed.` : ""}`
      : `${number(g.affectedCount)} page URLs need review for this check: ${ruleTitle(g.ruleId)}. Priority: ${g.priority}. ${g.remediation}`;
  const contentText = (o: any): string =>
    `${o.title || "Untitled page"}\nPage: ${o.url}\n${o.firstPartyDataAvailable ? "Search-query data has been imported. Review its date range and coverage." : "No search-query data has been imported, so search demand is unknown."} Review the existing page before proposing another.\nCollected passage: ${o.sourcePassage ?? "No passage was collected."}`;
  const researchText = (data.externalResearch as any[]).map((record) => {
    const label =
      record.dataset === "keywords"
        ? "keyword estimates"
        : record.dataset === "serp"
          ? "search-result samples"
          : "backlink samples";
    return `${record.provider}: ${number(record.rows.length)} ${label}, collected on ${record.collectedAt}. Market: ${record.market}. Language: ${record.language}. Device: ${record.device}.\nCollection method: ${record.methodology}\nLimitations: ${record.limitations}\nThese imported records do not establish total demand, a permanent ranking, all links to the site or the cause of a crawl finding. Review individual records in the technical details or JSON export.`;
  });
  const siteDataText = (
    data.siteData as ReturnType<typeof siteDataReview>[]
  ).map((record) => {
    const labels = {
      "bing-search": "Bing search",
      analytics: "analytics",
      "access-log": "aggregate access-log",
      "third-party-crawl": "third-party crawl",
    };
    return `${record.provider}: ${number(record.rows.length)} ${labels[record.dataset]} records for ${record.startDate} to ${record.endDate}.\nFilters: ${record.filters}\nSampling: ${record.sampling}\nLimitations: ${record.limitations}\n${record.interpretation}${record.unavailableEvidence.length ? "\nUnavailable evidence: " + record.unavailableEvidence.join("; ") + "." : ""}`;
  });
  const labels: Record<string, string> = {
    fail: "Needs a fix",
    warning: "Needs review",
    pass: "Passed",
    "not-tested": "Not tested",
    "not-applicable": "Does not apply",
    blocked: "Could not access",
    error: "Check failed",
  };
  const resultSummary = data.resultSummary
    .map(
      (row) =>
        `${ruleTitle(row.ruleId)}: ${labels[row.outcome] ?? row.outcome}, ${number(row.count)} ${row.count === 1 ? "check result" : "check results"}.`,
    )
    .join("\n");
  if (format === "markdown") {
    // Indented passages prevent page-supplied Markdown from loading remote content.
    const block = (value: unknown) =>
      "\n    " + safeText(value).replace(/\n/g, "\n    ");
    yield "# SEO Workbench report\n\n" +
      block(summary) +
      "\n\n## What was checked\n" +
      block(coverageText) +
      "\n\n" +
      data.limitations.map((l) => "- " + l).join("\n") +
      "\n\n## What needs attention\n";
    for (const group of data.groups) yield block(actionText(group)) + "\n";
    if (!data.groups.length)
      yield "\nNo actions were identified in the evidence checked. Review the check results below: some checks may still need more evidence.\n";
    yield "\n\n## Check results\n" +
      block(resultExplanation) +
      block(resultSummary);
    for (const result of detailed())
      yield block(
        `${ruleTitle(result.ruleId)}: ${labels[result.outcome] ?? result.outcome}.\n${"url" in result ? result.url : "Page URL removed."}\n${"reason" in result ? result.reason : "Read the private report for the evidence and explanation."}`,
      ) + "\n";
    yield "\n\n## Content to review\n";
    for (const opportunity of data.opportunities)
      yield block(contentText(opportunity)) + "\n";
    if (!data.opportunities.length)
      yield "\nNo page passages are included in this report.\n";
    if (siteDataText.length) {
      yield "## Imported site data\n\n";
      for (const text of siteDataText) yield block(text) + "\n";
    }
    if (researchText.length) {
      yield "\n\n## Imported research\n";
      for (const text of researchText) yield block(text) + "\n";
    }
    yield "\n\n## Technical details\n\nThese saved details let you trace the conclusions back to the evidence. JSON field names and identifiers are kept unchanged.\n";
    for (const chunk of jsonFields(data, detailed(), detailedCount))
      yield block(chunk);
    yield "\n";
    return;
  }
  const paragraph = (value: unknown) => "<p>" + escapeHTML(value) + "</p>";
  yield `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>SEO Workbench report</title><style>body{font:16px/1.6 system-ui,sans-serif;color:#182c30;max-width:1100px;margin:auto;padding:2rem}h1,h2,h3{line-height:1.3}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#f1f4f3;padding:1rem}table{border-collapse:collapse;width:100%}th,td{border:1px solid #cbd4d1;padding:.6rem;text-align:left;vertical-align:top;overflow-wrap:anywhere}article{border-top:1px solid #cbd4d1;margin-top:1.5rem}details{margin:1rem 0} .print-only{display:none}@media print{.individual-results,.content-evidence,.technical-evidence{display:none}.print-only{display:block}}</style><header><h1>SEO Workbench</h1>${summary.trim().split("\n").map(paragraph).join("")}<p class="print-only">This printout includes coverage, actions and the counts for every check outcome. Individual page results, content passages and technical evidence remain in the HTML file and machine exports.</p></header><main><h2>Pages checked</h2>${paragraph(coverageText)}<ul>${data.limitations.map((l) => "<li>" + escapeHTML(l) + "</li>").join("")}</ul><h2>What needs attention</h2>`;
  for (const group of data.groups)
    yield "<article><h3>" +
      escapeHTML("title" in group ? group.title : ruleTitle(group.ruleId)) +
      "</h3>" +
      actionText(group).split("\n").map(paragraph).join("") +
      "</article>";
  if (!data.groups.length)
    yield paragraph(
      "No actions were identified in the evidence checked. Review the check results below: some checks may still need more evidence.",
    );
  yield `<h2>Check results</h2>${paragraph(resultExplanation)}<pre>${escapeHTML(resultSummary)}</pre><table class="individual-results"><thead><tr><th>Check</th><th>Result</th><th>Explanation</th></tr></thead><tbody>`;
  for (const result of detailed())
    yield "<tr><td>" +
      escapeHTML(ruleTitle(result.ruleId)) +
      "</td><td>" +
      escapeHTML(labels[result.outcome] ?? result.outcome) +
      "</td><td>" +
      paragraph("url" in result ? result.url : "Page URL removed.") +
      paragraph(
        "reason" in result
          ? result.reason
          : "Read the private report for the evidence and explanation.",
      ) +
      "</td></tr>";
  yield `</tbody></table><section class="content-evidence"><h2>Content to review</h2>`;
  for (const opportunity of data.opportunities)
    yield "<article><h3>" +
      escapeHTML(opportunity.title || "Untitled page") +
      "</h3>" +
      contentText(opportunity).split("\n").map(paragraph).join("") +
      "</article>";
  if (!data.opportunities.length)
    yield paragraph("No page passages are included in this report.");
  yield "</section>";
  if (siteDataText.length) {
    yield "<h2>Imported site data</h2>";
    for (const text of siteDataText)
      yield "<article>" +
        text.split("\n").map(paragraph).join("") +
        "</article>";
  }
  if (researchText.length) {
    yield "<h2>Imported research</h2>";
    for (const text of researchText)
      yield "<article>" +
        text.split("\n").map(paragraph).join("") +
        "</article>";
  }
  yield `<details class="technical-evidence"><summary>Technical details and saved evidence</summary><p>These details let you trace each conclusion back to its evidence. JSON field names and identifiers are kept unchanged.</p><pre>`;
  for (const chunk of jsonFields(data, detailed(), detailedCount))
    yield escapeHTML(chunk);
  yield `</pre></details></main></html>`;
}
/** String callers have an output allowance; file callers can consume reportChunks. */
export function exportReport(
  store: Store,
  id: string,
  format: "json" | "markdown" | "html" | "csv",
  profile: "private" | "shareable" = "private",
): string {
  store.assertCompleteResults(id);
  const budget = Math.min(
      32 * 2 ** 20,
      store.audit(id).config.maxMemoryBytes / 4,
    ),
    chunks: string[] = [];
  let bytes = 0,
    pending = "";
  for (const chunk of reportChunks(store, id, format, profile)) {
    bytes += Buffer.byteLength(chunk);
    if (bytes > budget) throw new Error("results-memory-budget");
    pending += chunk;
    if (pending.length >= 65536) {
      chunks.push(pending);
      pending = "";
    }
  }
  chunks.push(pending);
  return chunks.join("");
}

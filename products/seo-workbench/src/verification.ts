/** Plans collect fresh dependency evidence; they never relabel older captures as fresh. */
import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  contractFor,
  fetchKey,
  hash,
  parseConfig,
  scopeReason,
  type Config,
  RULESET,
} from "./domain.ts";
import { headerCanonicals, headerAlternates } from "./response-directives.ts";
import { activeFacts, rules } from "./rules.ts";
import { groups } from "./intelligence.ts";
import type { Store } from "./store.ts";
const identifier = z.string().uuid();
const selection = z.strictObject({
  ruleId: z.string().min(1).max(101),
  ruleVersion: z.string().min(1).max(100),
  url: z.string().url().max(4096),
  evidenceIds: z.array(identifier).max(100),
});
export const VerificationRequest = z.strictObject({
  auditId: identifier,
  groupId: z.string().regex(/^[a-f0-9]{24}$/),
  maxAgeSeconds: z.number().int().min(1).max(86400).default(86400),
});
export interface VerificationPlan {
  schemaVersion: 1;
  planId: string;
  auditId: string;
  baselineAuditId: string;
  baselineAnalysisId: string;
  baselineRuleset: string;
  groupId: string;
  createdAt: string;
  maxAgeSeconds: number;
  mode: "targeted" | "full";
  config: Config;
  configHash: string;
  selected: z.infer<typeof selection>[];
  dependencies: { url: string; reasons: string[] }[];
  unavailableDependencies: { url: string; reason: string }[];
  olderEvidence: {
    auditId: string;
    analysisId: string;
    count: number;
    oldestTimestamp: string | null;
    newestTimestamp: string | null;
  };
  explanation: string;
}
export function verificationPlan(
  store: Store,
  value: unknown,
): VerificationPlan {
  store.db.exec("BEGIN IMMEDIATE");
  try {
    const request = VerificationRequest.parse(value),
      audit = store.audit(request.auditId);
    if (audit.owner || ["queued", "running", "analyzing"].includes(audit.state))
      throw new Error("verification-baseline-active");
    const analysis = store.latestAnalysis(audit.id);
    if (!analysis) throw new Error("verification-group-not-found");
    if (
      String(
        store.db
          .prepare("SELECT ruleset FROM analyses WHERE id=?")
          .get(analysis)!.ruleset,
      ) !== RULESET
    )
      throw new Error("verification-ruleset-mismatch");
    const all = store.allResults(audit.id, analysis),
      group = groups(all, audit.config).find((g) => g.id === request.groupId);
    if (!group) throw new Error("verification-group-not-found");
    const selected: z.infer<typeof selection>[] = [],
      groupUrls = new Set(group.affected);
    for (const r of store.allResults(audit.id, analysis))
      if (r.ruleId === group.ruleId && groupUrls.has(r.url))
        selected.push(
          selection.parse({
            ruleId: r.ruleId,
            ruleVersion: r.ruleVersion,
            url: r.url,
            evidenceIds: r.evidenceIds,
          }),
        );
    const original = parseConfig({ ...audit.config, recheckUrls: undefined });
    const observations = store.analysisObservations(audit.id),
      affected = new Set(selected.map((r) => r.url)),
      dependencies = new Map<string, Set<string>>(),
      unavailable = new Map<string, string>();
    const add = (value: string, reason: string) => {
      const url = fetchKey(value),
        excluded = scopeReason(original, url);
      if (excluded) {
        unavailable.set(url, excluded);
        return;
      }
      const reasons = dependencies.get(url) ?? new Set<string>();
      reasons.add(reason);
      dependencies.set(url, reasons);
    };
    for (const url of affected) add(url, "affected page");
    const templates = new Set(
      selected
        .map((r) => contractFor(original, r.url)?.template)
        .filter((t) => t && t !== "unclassified"),
    );
    const scope =
      rules.find((r) => r.id === group.ruleId)?.verificationScope ??
      "inventory";
    for (const o of observations) {
      if (templates.has(contractFor(original, o.url)?.template))
        add(o.url, "shared declared template");
      if (
        activeFacts(o)?.edges.some((e) => affected.has(e.target)) ||
        [
          ...headerCanonicals(o.response?.headers.link, o.finalUrl).targets,
          ...headerAlternates(o.response?.headers.link, o.finalUrl).links.map(
            (link) => link.target,
          ),
        ].some((url) => affected.has(url))
      )
        add(o.url, "recorded inbound relationship");
    }
    for (const row of store.db
      .prepare("SELECT url FROM urls WHERE audit_id=?")
      .iterate(audit.id)) {
      const url = String(row.url);
      if (templates.has(contractFor(original, url)?.template))
        add(url, "shared declared template inventory");
    }
    if (scope === "relationships") {
      // Expand canonical/alternate chains; hyperlink destinations need one fresh response.
      const expanded = new Set<string>();
      for (const o of observations.filter((o) => dependencies.has(o.url))) {
        for (const edge of activeFacts(o)?.edges ?? [])
          if (
            ["hyperlink", "navigation", "canonical", "alternate"].includes(
              edge.kind,
            )
          )
            add(edge.target, "recorded relationship destination");
        for (const target of headerCanonicals(
          o.response?.headers.link,
          o.finalUrl,
        ).targets)
          add(target, "HTTP canonical destination");
        for (const link of headerAlternates(
          o.response?.headers.link,
          o.finalUrl,
        ).links)
          add(link.target, "HTTP language alternative destination");
        const contract = contractFor(original, o.url);
        if (contract?.canonical)
          add(contract.canonical, "required canonical destination");
        for (const alternate of contract?.requiredAlternates ?? [])
          add(alternate.target, "required alternate destination");
      }
      const byUrl = new Map(observations.map((o) => [o.url, o]));
      const pending = [...dependencies.keys()];
      for (let index = 0; index < pending.length; index++) {
        const url = pending[index];
        if (expanded.has(url)) continue;
        expanded.add(url);
        const o = byUrl.get(url);
        if (!o) continue;
        for (const target of [
          o.finalUrl,
          ...headerCanonicals(o.response?.headers.link, o.finalUrl).targets,
          ...headerAlternates(o.response?.headers.link, o.finalUrl).links.map(
            (link) => link.target,
          ),
          ...(activeFacts(o)
            ?.edges.filter((e) => ["canonical", "alternate"].includes(e.kind))
            .map((e) => e.target) ?? []),
        ]) {
          const existed = dependencies.has(fetchKey(target));
          add(target, "canonical, alternate or redirect chain");
          if (!existed && dependencies.has(fetchKey(target)))
            pending.push(fetchKey(target));
        }
      }
    }
    const mode =
      scope === "inventory" ||
      dependencies.size >
        Math.min(10000, original.maxPages, original.maxDiscoveries)
        ? "full"
        : "targeted";
    if (mode === "full") {
      for (const o of observations)
        add(o.url, "baseline inventory observation");
      for (const url of original.inventory)
        add(url, "declared baseline inventory");
    }
    const urls = [...dependencies.keys()].sort(),
      config =
        mode === "targeted"
          ? parseConfig({ ...original, recheckUrls: urls })
          : parseConfig({
              ...original,
              inventory:
                dependencies.size <= 10000
                  ? [
                      ...new Set([
                        ...original.inventory,
                        ...dependencies.keys(),
                      ]),
                    ].slice(0, 10000)
                  : original.inventory,
            });
    const older = observations.filter(
        (o) => mode === "targeted" && !dependencies.has(o.url),
      ),
      timestamps = older.map((o) => o.timestamp).sort();
    const plan: VerificationPlan = {
      schemaVersion: 1,
      planId: randomUUID(),
      auditId: audit.id,
      baselineAuditId: audit.id,
      baselineAnalysisId: analysis,
      baselineRuleset: String(
        store.db
          .prepare("SELECT ruleset FROM analyses WHERE id=?")
          .get(analysis)!.ruleset,
      ),
      groupId: group.id,
      createdAt: new Date().toISOString(),
      maxAgeSeconds: request.maxAgeSeconds,
      mode,
      config,
      configHash: hash(JSON.stringify(config)),
      selected,
      dependencies: [...dependencies].map(([url, reasons]) => ({
        url,
        reasons: [...reasons],
      })),
      unavailableDependencies: [...unavailable].map(([url, reason]) => ({
        url,
        reason,
      })),
      olderEvidence: {
        auditId: audit.id,
        analysisId: analysis,
        count: older.length,
        oldestTimestamp: timestamps[0] ?? null,
        newestTimestamp: timestamps.at(-1) ?? null,
      },
      explanation:
        mode === "full"
          ? "This check needs inventory-wide evidence, or its dependency set exceeds the targeted allowance. The plan uses a full fresh crawl under the saved permissions and limits."
          : "This plan fetches affected pages, recorded inbound relationships, declared template peers and relevant destinations afresh. Other captures remain only in the baseline audit. New relationships may require another plan.",
    };
    if (Buffer.byteLength(JSON.stringify(plan)) > 5_000_000)
      throw new Error("verification-plan-budget");
    store.addImport(audit.projectId, "verification-plan", plan);
    store.db.exec("COMMIT");
    return plan;
  } catch (error) {
    if (store.db.isTransaction) store.db.exec("ROLLBACK");
    throw error;
  }
}
export function savedVerificationPlan(
  store: Store,
  planId: string,
): VerificationPlan {
  identifier.parse(planId);
  const rows = store.db
    .prepare(
      "SELECT project_id FROM imports WHERE kind='verification-plan' AND json_extract(data,'$.planId')=? LIMIT 2",
    )
    .all(planId);
  if (rows.length !== 1) throw new Error("verification-plan-not-found");
  const plan = store
    .imports(String(rows[0].project_id), "verification-plan")
    .find((p: any) => p.planId === planId) as VerificationPlan;
  if (store.latestAnalysis(plan.baselineAuditId) !== plan.baselineAnalysisId)
    throw new Error("verification-plan-stale");
  if (hash(JSON.stringify(parseConfig(plan.config))) !== plan.configHash)
    throw new Error("verification-audit-mismatch");
  return plan;
}
export function verifyRun(store: Store, planId: string, afterId: string) {
  store.db.exec("BEGIN IMMEDIATE");
  try {
    identifier.parse(afterId);
    const plan = savedVerificationPlan(store, planId),
      baseline = store.audit(plan.baselineAuditId),
      after = store.audit(afterId),
      analysis = store.latestAnalysis(afterId);
    if (
      after.id === baseline.id ||
      after.projectId !== baseline.projectId ||
      hash(JSON.stringify(after.config)) !== plan.configHash ||
      Date.parse(after.createdAt) < Date.parse(plan.createdAt)
    )
      throw new Error("verification-audit-mismatch");
    const keys = new Set(plan.selected.map((r) => r.ruleId + "\0" + r.url));
    const current = new Map<string, import("./domain.ts").RuleResult>();
    if (analysis)
      for (const r of store.allResults(afterId, analysis))
        if (keys.has(r.ruleId + "\0" + r.url))
          current.set(r.ruleId + "\0" + r.url, r);
    const observed = new Map(
      store.analysisObservations(afterId).map((o) => [o.url, o]),
    );
    const now = Date.now(),
      fresh = (url: string) => {
        const o = observed.get(url);
        const timestamp = o ? Date.parse(o.timestamp) : NaN;
        return (
          !!o?.response &&
          Number.isFinite(timestamp) &&
          timestamp >= Date.parse(plan.createdAt) &&
          timestamp <= now &&
          [o.response, ...o.attempts].every(
            (r) =>
              Number.isFinite(Date.parse(r.requestedAt)) &&
              Date.parse(r.requestedAt) >= Date.parse(plan.createdAt) &&
              Date.parse(r.requestedAt) <= timestamp,
          ) &&
          now - timestamp <= plan.maxAgeSeconds * 1000
        );
      };
    const dependencies = plan.dependencies.map((d) => ({
      ...d,
      fresh: fresh(d.url),
    }));
    const complete =
      after.state === "complete" &&
      !after.owner &&
      !!analysis &&
      String(
        store.db
          .prepare("SELECT ruleset FROM analyses WHERE id=?")
          .get(analysis)!.ruleset,
      ) === plan.baselineRuleset;
    const dependenciesComplete =
      !plan.unavailableDependencies.length &&
      dependencies.every((d) => d.fresh);
    const changes = plan.selected.map((before) => {
      const result = current.get(before.ruleId + "\0" + before.url),
        source = observed.get(before.url);
      const reusable =
        complete &&
        dependenciesComplete &&
        fresh(before.url) &&
        !!source &&
        !before.evidenceIds.includes(source.id) &&
        result?.evidenceIds.includes(source.id) &&
        result.ruleVersion === before.ruleVersion;
      const state =
        !reusable ||
        !result ||
        ["blocked", "error", "not-tested", "not-applicable"].includes(
          result.outcome,
        )
          ? "not-verifiable"
          : result.outcome === "pass"
            ? "resolved"
            : "persisting";
      return {
        ruleId: before.ruleId,
        url: before.url,
        state,
        beforeEvidenceIds: before.evidenceIds,
        after: result ?? null,
        reason:
          state === "not-verifiable"
            ? "The planned fresh evidence, dependency coverage, rule identity or completed analysis is unavailable. Older evidence cannot verify this fix."
            : "This verifies the newly collected page evidence under the saved plan. It does not establish search indexing, rankings, traffic or a common source-code cause.",
      };
    });
    const previous = new Map<string, { outcome: string; version: string }>();
    for (const r of store.allResults(baseline.id, plan.baselineAnalysisId))
      previous.set(r.ruleId + "\0" + r.url, {
        outcome: r.outcome,
        version: r.ruleVersion,
      });
    const regressions: {
      ruleId: string;
      url: string;
      state: string;
      evidenceIds: string[];
    }[] = [];
    if (analysis)
      for (const r of store.allResults(afterId, analysis)) {
        if (
          !["fail", "warning"].includes(r.outcome) ||
          keys.has(r.ruleId + "\0" + r.url)
        )
          continue;
        const old = previous.get(r.ruleId + "\0" + r.url);
        if (
          old?.outcome === "pass" &&
          old.version === r.ruleVersion &&
          fresh(r.url)
        )
          regressions.push({
            ruleId: r.ruleId,
            url: r.url,
            state: "introduced",
            evidenceIds: r.evidenceIds,
          });
        else if (!old)
          regressions.push({
            ruleId: r.ruleId,
            url: r.url,
            state: "newly-observed",
            evidenceIds: r.evidenceIds,
          });
      }
    const record = {
      schemaVersion: 1,
      verificationId: randomUUID(),
      planId: plan.planId,
      auditId: afterId,
      baselineAuditId: baseline.id,
      baselineAnalysisId: plan.baselineAnalysisId,
      analysisId: analysis,
      evaluatedAt: new Date(now).toISOString(),
      mode: plan.mode,
      maxAgeSeconds: plan.maxAgeSeconds,
      complete,
      dependenciesComplete,
      dependencies,
      unavailableDependencies: plan.unavailableDependencies,
      olderEvidence: plan.olderEvidence,
      changes,
      regressions,
      state:
        changes.length &&
        changes.every((c) => c.state === "resolved") &&
        !regressions.some((r) => r.state === "introduced")
          ? "verified"
          : "not-verified",
      limitations: [
        "Only the selected findings are verified. Other new results remain available in the newer audit.",
        "No older observation is copied into the recheck. A changed or new relationship may require an expanded plan or full audit.",
      ],
    };
    if (Buffer.byteLength(JSON.stringify(record)) > 5_000_000)
      throw new Error("verification-plan-budget");
    store.addImport(baseline.projectId, "verification-run", record);
    store.db.exec("COMMIT");
    return record;
  } catch (error) {
    if (store.db.isTransaction) store.db.exec("ROLLBACK");
    throw error;
  }
}

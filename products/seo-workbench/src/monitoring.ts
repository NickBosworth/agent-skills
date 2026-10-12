/** One reviewed audit per invocation; the operator owns scheduling and notifications. */
import { z } from "zod";
import { hash, type Outcome } from "./domain.ts";
import type { Store } from "./store.ts";
import type { Workbench } from "./app.ts";

export function monitoringPlan(store: Store, projectId: string) {
  z.string().uuid().parse(projectId);
  const config = store.project(projectId);
  return {
    projectId,
    selection: hash(JSON.stringify({ projectId, config })),
    scope: {
      origins: config.origins,
      include: config.include,
      exclude: config.exclude,
    },
    seeds: config.seeds,
    render: config.render,
    limits: {
      maxPages: config.maxPages,
      maxRequests: config.maxRequests,
      maxSeconds: config.maxSeconds,
      maxDownloadBytes: config.maxDownloadBytes,
      maxStorageBytes: config.maxStorageBytes,
    },
    explanation:
      "This is a private preview. Approve its selection to run one fresh audit. No scheduler, retention job or outbound notification is installed.",
  };
}

export async function runMonitoring(
  app: Workbench,
  projectId: string,
  selection: unknown,
) {
  const plan = monitoringPlan(app.store, projectId);
  if (typeof selection !== "string" || selection !== plan.selection)
    throw new Error("monitor-selection-changed");
  const config = app.store.project(projectId);
  if (hash(JSON.stringify({ projectId, config })) !== selection)
    throw new Error("monitor-selection-changed");
  const { auditId } = await app.run(config, projectId);
  const audit = app.store.audit(auditId),
    analysisId = app.store.latestAnalysis(auditId);
  const outcomes: Partial<Record<Outcome, number>> = {};
  if (analysisId)
    for (const result of app.store.allResults(auditId, analysisId))
      outcomes[result.outcome] = (outcomes[result.outcome] ?? 0) + 1;
  return {
    auditId,
    analysisId,
    state: audit.state,
    requests: audit.requests,
    downloadedBytes: audit.bytes,
    outcomes,
    explanation:
      "This summary contains counts and local run identifiers. It omits page addresses and captured content. Coverage applies to this audit's discovered inventory; it cannot establish total site size or search-engine indexing.",
  };
}

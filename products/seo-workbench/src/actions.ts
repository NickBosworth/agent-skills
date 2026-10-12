/** Owner triage appends a decision; it cannot suppress evidence, exceptions or acceptance failures. */
import { z } from "zod";
import { groups } from "./intelligence.ts";
import type { Store } from "./store.ts";
export const ActionReviewSchema = z.strictObject({
  auditId: z.string().uuid(),
  analysisId: z.string().uuid(),
  groupId: z.string().regex(/^[a-f0-9]{24}$/),
  priority: z.enum(["P1", "P2", "review"]),
  rationale: z.string().min(10).max(2000),
  ownerRole: z.string().min(1).max(100),
  effort: z.enum(["unknown", "small", "medium", "large"]),
  changeRisk: z.enum(["unknown", "low", "medium", "high"]),
  dependencies: z.string().min(1).max(1000),
});
export function reviewAction(store: Store, value: unknown): string {
  const review = ActionReviewSchema.parse(value);
  store.db.exec("BEGIN IMMEDIATE");
  try {
    const audit = store.audit(review.auditId);
    if (store.latestAnalysis(review.auditId) !== review.analysisId)
      throw new Error("action-review-analysis-changed");
    if (
      !groups(
        store.allResults(review.auditId, review.analysisId),
        audit.config,
      ).some((g) => g.id === review.groupId)
    )
      throw new Error("action-review-group-not-found");
    const id = store.addImport(audit.projectId, "action-review", {
      ...review,
      reviewedAt: new Date().toISOString(),
      basis:
        "Owner triage; business impact and effort are estimates, not measured SEO effects",
    });
    store.db.exec("COMMIT");
    return id;
  } catch (error) {
    if (store.db.isTransaction) store.db.exec("ROLLBACK");
    throw error;
  }
}

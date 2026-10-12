import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Store } from "../src/store.ts";
import { Crawler } from "../src/crawler.ts";
import { NetworkPolicy } from "../src/network.ts";
import { fixtureSite } from "../src/fixtures.ts";
import { Workbench } from "../src/app.ts";
import { reviewAction } from "../src/actions.ts";
import { reportData } from "../src/reports.ts";
import { gate } from "../src/cli.ts";
test("owner priorities retain original triage and evidence and cannot green-light a failed contract", async () => {
  const directory = mkdtempSync(join(tmpdir(), "seo-workbench-actions-")),
    store = new Store(directory),
    fixture = await fixtureSite();
  try {
    const project = store.createProject(fixture.config),
      id = store.createAudit(project),
      app = new Workbench(store);
    await new Crawler(
      store,
      new NetworkPolicy({ localOrigins: [fixture.origin] }),
    ).run(id);
    const group = (app.view(id, "groups") as any[]).find(
        (g) => g.priority === "P1",
      ),
      before = store.latestAnalysis(id);
    assert.ok(group);
    const value = {
      auditId: id,
      analysisId: before!,
      groupId: group.id,
      priority: "review",
      rationale:
        "Owner prioritizes an upcoming supported template migration first",
      ownerRole: "frontend maintainer",
      effort: "medium",
      changeRisk: "high",
      dependencies: "Review the migration rollout before applying",
    };
    reviewAction(store, value);
    const after = (app.view(id, "groups") as any[]).find(
      (g) => g.id === group.id,
    );
    assert.equal(after.priority, "review");
    assert.equal(after.computedPriority, "P1");
    assert.equal(after.action.effort, "medium");
    assert.equal(gate(store, id), 1);
    assert.equal(store.latestAnalysis(id), before);
    assert.throws(() =>
      reviewAction(store, { ...value, groupId: "0".repeat(24) }),
    );
    assert.ok(
      reportData(store, id, "private").groups.some((g: any) => g.ownerReview),
    );
    assert.ok(
      reportData(store, id, "shareable").groups.every(
        (g: any) => !g.ownerReview,
      ),
    );
    const findings = store.results(id, { limit: 10000 });
    const newer = store.saveAnalysis(id, "0.1.0", findings);
    assert.notEqual(newer, before);
    assert.equal(
      (app.view(id, "groups") as any[]).find((g) => g.id === group.id)
        .ownerReview,
      null,
    );
    assert.equal(
      reportData(store, id, "private").groups.find((g) => g.id === group.id)!
        .ownerReview,
      null,
    );
    assert.throws(
      () => reviewAction(store, value),
      /action-review-analysis-changed/,
    );
    assert.equal(store.imports(project, "action-review").length, 1);
    reviewAction(store, { ...value, analysisId: newer });
    assert.equal(
      (app.view(id, "groups") as any[]).find((g) => g.id === group.id).priority,
      "review",
    );
    assert.equal(store.imports(project, "action-review").length, 2);
    store.addImport(project, "action-review", {
      ...value,
      analysisId: undefined,
      priority: "P2",
    });
    assert.equal(
      (app.view(id, "groups") as any[]).find((g) => g.id === group.id).priority,
      "review",
    );
    const latest = store.latestAnalysis.bind(store);
    let reads = 0;
    store.latestAnalysis = () => (++reads === 1 ? before : newer);
    const snapshot = (app.view(id, "groups") as any[]).find(
      (g) => g.id === group.id,
    );
    assert.equal(snapshot.analysisId, before);
    assert.equal(snapshot.ownerReview.analysisId, before);
    reads = 0;
    const report = reportData(store, id, "private");
    assert.ok(report.groups.every((g) => g.analysisId === report.analysisId));
    store.latestAnalysis = latest;
    store.deleteAudit(id);
    assert.equal(store.imports(project, "action-review").length, 0);
  } finally {
    store.close();
    await fixture.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

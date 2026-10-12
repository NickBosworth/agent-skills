import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { Store } from "../src/store.ts";
import { Workbench } from "../src/app.ts";
import { NetworkPolicy } from "../src/network.ts";
import { fixtureSite } from "../src/fixtures.ts";
import { parseConfig } from "../src/domain.ts";
import { monitoringPlan, runMonitoring } from "../src/monitoring.ts";
import { gate } from "../src/cli.ts";

async function setup(maxPages = 20) {
  const fixture = await fixtureSite();
  const directory = mkdtempSync(join(tmpdir(), "seo-workbench-monitor-"));
  const store = new Store(directory);
  const project = store.createProject(
    parseConfig({ ...fixture.config, maxPages }),
  );
  const app = new Workbench(
    store,
    new NetworkPolicy({ localOrigins: [fixture.origin] }),
  );
  return {
    fixture,
    directory,
    store,
    project,
    app,
    async close() {
      store.close();
      await fixture.close();
      rmSync(directory, { recursive: true, force: true });
    },
  };
}

test("monitoring preview creates no job and stale or absent consent makes no request", async () => {
  const s = await setup();
  try {
    const plan = monitoringPlan(s.store, s.project);
    assert.equal(plan.render, "none");
    assert.equal(s.store.audits(s.project).length, 0);
    for (const selection of [undefined, "", "old-selection"])
      await assert.rejects(
        runMonitoring(s.app, s.project, selection),
        /monitor-selection-changed/,
      );
    const revised = { ...s.store.project(s.project), maxPages: 1 };
    s.store.db
      .prepare("UPDATE projects SET config=? WHERE id=?")
      .run(JSON.stringify(revised), s.project);
    await assert.rejects(
      runMonitoring(s.app, s.project, plan.selection),
      /monitor-selection-changed/,
    );
    assert.equal(s.store.audits(s.project).length, 0);
  } finally {
    await s.close();
  }
});

test("reviewed monitoring preserves history, uses current contracts and emits no captured addresses", async () => {
  const s = await setup();
  try {
    const selection = monitoringPlan(s.store, s.project).selection;
    const before = await runMonitoring(s.app, s.project, selection);
    assert.equal(before.state, "complete");
    const observation = s.store.observations(before.auditId)[0];
    s.fixture.setFixed(true);
    const after = await runMonitoring(s.app, s.project, selection);
    assert.notEqual(before.auditId, after.auditId);
    assert.equal(s.store.audits(s.project).length, 2);
    assert.deepEqual(
      s.store.observation(before.auditId, observation.url),
      observation,
    );
    assert(!JSON.stringify(after).includes(s.fixture.origin));
    assert.equal(after.outcomes.fail ?? 0, 0);
    s.store.results = () => {
      throw new Error("buffered read forbidden");
    };
    assert.equal(gate(s.store, before.auditId), 1);
    assert.equal(gate(s.store, after.auditId), 0);
  } finally {
    await s.close();
  }
});

test("monitoring refuses concurrent work before creating a second queued audit", async () => {
  const s = await setup();
  try {
    s.store.createAudit(s.project);
    await assert.rejects(
      runMonitoring(
        s.app,
        s.project,
        monitoringPlan(s.store, s.project).selection,
      ),
      /audit-worker-capacity/,
    );
    assert.equal(s.store.audits(s.project).length, 1);
  } finally {
    await s.close();
  }
});

test("foreground CLI audits share the worker admission check and leave no extra project", async () => {
  const s = await setup();
  try {
    s.store.createAudit(s.project);
    const cli = fileURLToPath(new URL("../src/cli.ts", import.meta.url));
    await assert.rejects(
      promisify(execFile)(process.execPath, [
        cli,
        "audit",
        s.fixture.origin,
        "--data",
        s.directory,
        "--allow-local-origin",
        s.fixture.origin,
      ]),
      (error: any) =>
        error.code === 2 &&
        JSON.parse(error.stderr).error === "audit-worker-capacity",
    );
    assert.equal(s.store.projects().length, 1);
    assert.equal(s.store.audits().length, 1);
  } finally {
    await s.close();
  }
});

test("monitoring cannot turn a page-budget stop into success", async () => {
  const s = await setup(1);
  try {
    const summary = await runMonitoring(
      s.app,
      s.project,
      monitoringPlan(s.store, s.project).selection,
    );
    assert.equal(summary.state, "partial");
    assert.equal(gate(s.store, summary.auditId), 3);
  } finally {
    await s.close();
  }
});

test("actual CLI preview and execution use one project and report gate failure honestly", async () => {
  const s = await setup();
  try {
    const cli = fileURLToPath(new URL("../src/cli.ts", import.meta.url));
    const args = [
      cli,
      "monitor",
      s.project,
      "--data",
      s.directory,
      "--allow-local-origin",
      s.fixture.origin,
    ];
    const preview = JSON.parse(
      (await promisify(execFile)(process.execPath, args)).stdout,
    );
    assert.equal(s.store.audits(s.project).length, 0);
    try {
      await promisify(execFile)(process.execPath, [
        ...args,
        "--execute",
        "--selection",
        preview.selection,
      ]);
      assert.fail("fixture defects must produce a nonzero gate");
    } catch (error: any) {
      assert.equal(error.code, 1);
      const summary = JSON.parse(error.stdout);
      assert.equal(summary.exitCode, 1);
      assert.equal(summary.state, "complete");
      assert(!error.stdout.includes(s.fixture.origin));
    }
    assert.equal(s.store.audits(s.project).length, 1);
  } finally {
    await s.close();
  }
});

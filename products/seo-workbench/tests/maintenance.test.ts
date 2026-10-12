import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  rmSync,
  existsSync,
  writeFileSync,
  readFileSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Store } from "../src/store.ts";
import { Crawler } from "../src/crawler.ts";
import { NetworkPolicy } from "../src/network.ts";
import { fixtureSite } from "../src/fixtures.ts";
import { parseConfig } from "../src/domain.ts";
import {
  backupStore,
  retentionPlan,
  applyRetention,
} from "../src/maintenance.ts";

test("verified backups preserve immutable histories, imports and independent recovery without overwriting", async () => {
  const root = mkdtempSync(join(tmpdir(), "seo-workbench-backup-")),
    store = new Store(join(root, "original")),
    fixture = await fixtureSite();
  try {
    const project = store.createProject(fixture.config),
      audit = store.createAudit(project),
      target = join(root, "recovery with spaces #");
    await assert.rejects(backupStore(store, target), /backup-jobs-active/);
    assert.equal(existsSync(target), false);
    await new Crawler(
      store,
      new NetworkPolicy({ localOrigins: [fixture.origin] }),
    ).run(audit);
    store.addImport(project, "performance", { synthetic: true });
    const original = store.results(audit, { limit: 10000 });
    assert.equal((await backupStore(store, target)).verified, true);
    if (process.platform !== "win32") {
      assert.equal(statSync(target).mode & 0o777, 0o700);
      assert.equal(
        statSync(join(target, "workbench.sqlite")).mode & 0o777,
        0o600,
      );
    }
    const recovered = new Store(target);
    try {
      assert.deepEqual(recovered.results(audit, { limit: 10000 }), original);
      assert.deepEqual(
        recovered.observations(audit),
        store.observations(audit),
      );
      assert.deepEqual(recovered.imports(project, "performance"), [
        { synthetic: true },
      ]);
      recovered.deleteAudit(audit);
      assert.equal(store.audit(audit).state, "complete");
    } finally {
      recovered.close();
    }
    writeFileSync(join(target, "preserved.txt"), "Synthetic original file.");
    await assert.rejects(backupStore(store, target));
    assert.equal(
      readFileSync(join(target, "preserved.txt"), "utf8"),
      "Synthetic original file.",
    );
    await assert.rejects(
      backupStore(
        store,
        join(import.meta.dirname, "../synthetic-forbidden-backup"),
      ),
      /backup-inside-repository/,
    );
  } finally {
    store.close();
    await fixture.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("retention is previewed, scoped, transactional and preserves active jobs and provider imports", () => {
  const root = mkdtempSync(join(tmpdir(), "seo-workbench-retention-")),
    store = new Store(root);
  try {
    const config = parseConfig({
        seeds: ["https://www.example.com/"],
        origins: ["https://www.example.com/"],
      }),
      project = store.createProject(config),
      other = store.createProject(config);
    const stopped = store.createAudit(project),
      paused = store.createAudit(project),
      active = store.createAudit(project),
      untouched = store.createAudit(other);
    store.state(stopped, "complete");
    store.state(paused, "paused");
    store.state(untouched, "complete");
    store.db
      .prepare("UPDATE audits SET updated=?")
      .run("2020-01-01T00:00:00.000Z");
    store.addImport(project, "performance", { synthetic: true });
    store.addImport(project, "action-review", {
      auditId: stopped,
      synthetic: true,
    });
    const cutoff = "2025-01-01T00:00:00Z",
      preview = retentionPlan(store, project, cutoff);
    assert.deepEqual(
      preview.audits.map((a) => a.id),
      [stopped],
    );
    assert.equal(preview.retainedProjectImports, 1);
    assert.equal(store.audit(stopped).state, "complete");
    assert.throws(
      () => retentionPlan(store, project, "2099-01-01T00:00:00Z"),
      /retention-future-cutoff/,
    );
    assert.throws(() => retentionPlan(store, project, "not-a-date"));
    store.state(stopped, "cancelled");
    assert.throws(
      () => applyRetention(store, project, cutoff, preview.selection),
      /retention-selection-changed/,
    );
    assert.equal(store.imports(project, "action-review").length, 1);
    store.db
      .prepare("UPDATE audits SET updated=? WHERE id=?")
      .run("2020-02-01T00:00:00.000Z", stopped);
    const next = retentionPlan(store, project, cutoff);
    assert.equal(
      applyRetention(store, project, cutoff, next.selection).deletedAudits,
      1,
    );
    assert.throws(() => store.audit(stopped));
    assert.equal(store.audit(paused).state, "paused");
    assert.equal(store.audit(active).state, "queued");
    assert.equal(store.audit(untouched).state, "complete");
    assert.equal(store.imports(project, "performance").length, 1);
    assert.equal(store.imports(project, "action-review").length, 0);
    assert.throws(
      () => applyRetention(store, project, cutoff, next.selection),
      /retention-selection-changed/,
    );
  } finally {
    store.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("failed backup validation removes only its new snapshot and preserves the original", async () => {
  const root = mkdtempSync(join(tmpdir(), "seo-workbench-bad-backup-")),
    store = new Store(join(root, "original")),
    target = join(root, "failed");
  try {
    store.db.exec("PRAGMA foreign_keys=OFF");
    store.db
      .prepare("INSERT INTO imports VALUES(?,?,?,?,?)")
      .run(
        "synthetic-import",
        "synthetic-missing-project",
        "performance",
        "2020-01-01T00:00:00.000Z",
        "{}",
      );
    store.db.exec("PRAGMA foreign_keys=ON");
    await assert.rejects(backupStore(store, target), /backup-integrity-failed/);
    assert.equal(existsSync(target), false);
    assert.equal(
      store.db.prepare("SELECT COUNT(*) AS n FROM imports").get()!.n,
      1,
    );
  } finally {
    store.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("retention rolls back histories and reviews if any selected deletion fails", () => {
  const root = mkdtempSync(join(tmpdir(), "seo-workbench-retention-fault-")),
    store = new Store(root);
  try {
    const project = store.createProject(
      parseConfig({
        seeds: ["https://www.example.com/"],
        origins: ["https://www.example.com/"],
      }),
    );
    const ids = [store.createAudit(project), store.createAudit(project)].sort();
    for (const id of ids) {
      store.state(id, "complete");
      store.addImport(project, "action-review", {
        auditId: id,
        synthetic: true,
      });
    }
    store.db
      .prepare("UPDATE audits SET updated=?")
      .run("2020-01-01T00:00:00.000Z");
    store.db.exec(
      `CREATE TRIGGER synthetic_delete_failure BEFORE DELETE ON audits WHEN OLD.id='${ids[1]}' BEGIN SELECT RAISE(ABORT,'synthetic failure'); END`,
    );
    const preview = retentionPlan(store, project, "2025-01-01T00:00:00Z");
    assert.throws(() =>
      applyRetention(store, project, preview.before, preview.selection),
    );
    assert.equal(store.imports(project, "action-review").length, 2);
    assert.ok(ids.every((id) => store.audit(id).state === "complete"));
    store.db.exec("DROP TRIGGER synthetic_delete_failure");
    assert.equal(
      applyRetention(store, project, preview.before, preview.selection)
        .deletedAudits,
      2,
    );
  } finally {
    store.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("interrupted backup markers refuse recovery before modifying a database", () => {
  const root = mkdtempSync(join(tmpdir(), "seo-workbench-interrupted-backup-")),
    store = new Store(root);
  store.close();
  try {
    const before = readFileSync(join(root, "workbench.sqlite"));
    writeFileSync(join(root, ".backup-incomplete"), "");
    assert.throws(() => new Store(root), /backup-incomplete/);
    assert.deepEqual(readFileSync(join(root, "workbench.sqlite")), before);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

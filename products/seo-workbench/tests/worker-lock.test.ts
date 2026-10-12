import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import {
  mkdtempSync,
  rmSync,
  writeFileSync,
  symlinkSync,
  linkSync,
  mkdirSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { Store } from "../src/store.ts";
import { backupStore } from "../src/maintenance.ts";
import { parseConfig } from "../src/domain.ts";
const config = parseConfig({
  seeds: ["https://www.example.com/"],
  origins: ["https://www.example.com/"],
});

test("a released lifetime lock permits recovery despite a still-live reused process ID", () => {
  const root = mkdtempSync(join(tmpdir(), "seo-workbench-owner-identity-"));
  let store = new Store(root);
  try {
    const project = store.createProject(config),
      first = store.createAudit(project),
      second = store.createAudit(project);
    store.claim(first);
    store.state(first, "paused", "user-pause");
    store.close(); // Leave owner metadata; the OS lock is gone while this PID remains alive.
    store = new Store(root);
    store.claim(second);
    assert.equal(store.audit(first).owner, null);
    assert.equal(store.audit(first).state, "paused");
    assert.equal(store.audit(first).reason, "user-pause");
    assert.equal(store.audit(second).owner, process.pid);
    store.release(first); // A different audit must not release the current worker lock.
    const competitor = new Store(root);
    try {
      assert.throws(() => competitor.resume(first), /audit-worker-active/);
    } finally {
      competitor.close();
    }
    store.release(second);
    store.resume(first);
    assert.equal(store.audit(first).state, "queued");
    assert.equal(store.audit(first).owner, null);
    store.claim(first);
    store.release(first);
  } finally {
    store.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test(
  "a real worker holds ownership through controls and death releases only its lock",
  { timeout: 15000 },
  async () => {
    const root = mkdtempSync(join(tmpdir(), "seo-workbench-worker-death-")),
      store = new Store(root);
    let worker: ReturnType<typeof spawn> | undefined;
    try {
      const project = store.createProject(config),
        first = store.createAudit(project),
        second = store.createAudit(project);
      // Keep the connection reachable: an idle process alone does not retain a SQLite lock.
      const script = `import { Store } from ${JSON.stringify(import.meta.resolve("../src/store.ts"))}; const store = new Store(process.argv[1]); store.claim(process.argv[2]); setInterval(() => { if (!store.db.isOpen) process.exit(2); }, 1000); setImmediate(() => { global.gc(); console.log("ready"); });`;
      worker = spawn(
        process.execPath,
        ["--expose-gc", "--input-type=module", "-e", script, root, first],
        { stdio: ["ignore", "pipe", "pipe"] },
      );
      const ready = await Promise.race([
        once(worker.stdout!, "data").then(([data]) => String(data)),
        once(worker, "exit").then(() => "exited"),
      ]);
      assert.equal(ready.trim(), "ready");
      assert.throws(() => store.claim(second), /audit-worker-active/);
      store.state(first, "cancelled", "user-cancel");
      assert.throws(() => store.resume(first), /audit-worker-active/);
      store.release(first);
      assert.throws(() => store.claim(second), /audit-worker-active/);
      assert.ok(store.createAudit(project)); // The lifetime lock does not block normal database writes.
      const exited = once(worker, "exit");
      worker.kill("SIGKILL");
      await exited;
      store.claim(second);
      assert.equal(store.audit(first).owner, null);
      assert.equal(store.audit(first).state, "cancelled");
      assert.equal(store.audit(first).reason, "user-cancel");
      store.release(second);
    } finally {
      if (worker && worker.exitCode === null && worker.signalCode === null) {
        const exited = once(worker, "exit");
        worker.kill("SIGKILL");
        await exited;
      }
      store.close();
      rmSync(root, { recursive: true, force: true });
    }
  },
);

test("legacy live owners block the atomic upgrade; stopped legacy owners remain recoverable", () => {
  const root = mkdtempSync(join(tmpdir(), "seo-workbench-owner-upgrade-"));
  const store = new Store(root);
  const project = store.createProject(config),
    audit = store.createAudit(project);
  store.db
    .prepare("UPDATE audits SET owner=?,state='running' WHERE id=?")
    .run(process.pid, audit);
  store.db.exec("DROP TABLE worker_claims; PRAGMA user_version=4");
  store.close();
  try {
    assert.throws(() => new Store(root), /database-upgrade-worker-active/);
    const check = new DatabaseSync(join(root, "workbench.sqlite"));
    assert.equal(check.prepare("PRAGMA user_version").get()!.user_version, 4);
    assert.equal(
      check
        .prepare("SELECT name FROM sqlite_master WHERE name='worker_claims'")
        .get(),
      undefined,
    );
    check.prepare("UPDATE audits SET owner=? WHERE id=?").run(99999999, audit);
    check.close();
    const upgraded = new Store(root);
    try {
      assert.equal(
        upgraded.db.prepare("PRAGMA user_version").get()!.user_version,
        5,
      );
      upgraded.resume(audit);
      upgraded.claim(audit);
      assert.equal(upgraded.audit(audit).owner, process.pid);
      upgraded.release(audit);
    } finally {
      upgraded.close();
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("worker lock files and side files reject links and non-files without changing their targets", () => {
  const root = mkdtempSync(join(tmpdir(), "seo-workbench-lock-files-")),
    store = new Store(root);
  try {
    const project = store.createProject(config),
      audit = store.createAudit(project),
      target = join(root, "synthetic-target");
    writeFileSync(target, "preserve synthetic target");
    for (const suffix of ["", "-wal", "-shm", "-journal"]) {
      const filename = join(root, "worker-lock.sqlite" + suffix);
      if (process.platform !== "win32") {
        symlinkSync(target, filename);
        assert.throws(() => store.claim(audit), /database-symlink-blocked/);
        rmSync(filename);
      }
      linkSync(target, filename);
      assert.throws(() => store.claim(audit), /database-file-blocked/);
      rmSync(filename);
      mkdirSync(filename);
      assert.throws(() => store.claim(audit), /database-file-blocked/);
      rmSync(filename, { recursive: true });
      assert.equal(store.audit(audit).owner, null);
    }
  } finally {
    store.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("a backup refuses an active snapshot even when its initial source preflight was clear", async (t) => {
  const root = mkdtempSync(join(tmpdir(), "seo-workbench-backup-race-")),
    store = new Store(join(root, "data"));
  try {
    const project = store.createProject(config),
      target = join(root, "backup");
    const prepare = store.db.prepare.bind(store.db);
    t.mock.method(store.db, "prepare", (sql: string) => {
      const statement = prepare(sql);
      if (!sql.startsWith("SELECT 1 FROM audits WHERE owner IS NOT NULL"))
        return statement;
      return {
        get() {
          const before = statement.get();
          store.createAudit(project);
          return before;
        },
      };
    });
    await assert.rejects(backupStore(store, target), /backup-jobs-active/);
    t.mock.restoreAll();
    assert.equal(store.hasActiveJobs(), true);
    const { existsSync } = await import("node:fs");
    assert.equal(existsSync(target), false);
  } finally {
    t.mock.restoreAll();
    store.close();
    rmSync(root, { recursive: true, force: true });
  }
});

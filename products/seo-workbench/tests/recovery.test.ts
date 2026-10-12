import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Store } from "../src/store.ts";
import { parseConfig, errorCode } from "../src/domain.ts";

function legacy(directory: string, version: number): string {
  const store = new Store(directory);
  try {
    const project = store.createProject(
      parseConfig({
        seeds: ["https://www.example.com/"],
        origins: ["https://www.example.com/"],
      }),
    );
    const triggers = store.db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='trigger' AND (name LIKE 'storage_%' OR name='immutable_analysis_dictionaries')",
      )
      .all();
    for (const row of triggers)
      store.db.exec('DROP TRIGGER "' + row.name + '"');
    store.db.exec("DROP TABLE analysis_dictionaries");
    if (version === 1) store.db.exec("DROP TABLE audit_storage");
    store.db.exec("DROP TABLE worker_claims; PRAGMA user_version=" + version);
    return project;
  } finally {
    store.close();
  }
}

function child(directory: string, script: string) {
  return spawn(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `import { Store } from ${JSON.stringify(import.meta.resolve("../src/store.ts"))}; ${script}`,
      directory,
    ],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
}

test("late migration failures roll back every earlier upgrade and release the connection for retry", () => {
  const directory = mkdtempSync(
    join(tmpdir(), "seo-workbench-migration-fault-"),
  );
  try {
    const project = legacy(directory, 1),
      db = new DatabaseSync(join(directory, "workbench.sqlite"));
    db.exec("CREATE TABLE analysis_dictionaries(synthetic TEXT)");
    const before = db
      .prepare("SELECT type,name,sql FROM sqlite_master ORDER BY type,name")
      .all();
    const saved = db.prepare("SELECT * FROM projects").all();
    db.close();
    assert.throws(() => new Store(directory), /already exists/);
    const check = new DatabaseSync(join(directory, "workbench.sqlite"));
    try {
      assert.equal(check.prepare("PRAGMA user_version").get()!.user_version, 1);
      assert.deepEqual(
        check
          .prepare("SELECT type,name,sql FROM sqlite_master ORDER BY type,name")
          .all(),
        before,
      );
      assert.deepEqual(check.prepare("SELECT * FROM projects").all(), saved);
      check.exec("BEGIN IMMEDIATE; DROP TABLE analysis_dictionaries; COMMIT");
    } finally {
      check.close();
    }
    const recovered = new Store(directory);
    try {
      assert.equal(
        recovered.db.prepare("PRAGMA user_version").get()!.user_version,
        5,
      );
      assert.deepEqual(
        recovered.db.prepare("SELECT * FROM projects").all(),
        saved,
      );
      assert.equal(
        recovered.project(project).seeds[0],
        "https://www.example.com/",
      );
    } finally {
      recovered.close();
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test(
  "a killed writer loses only its uncommitted change and recovered evidence remains usable",
  { timeout: 15000 },
  async () => {
    const directory = mkdtempSync(
      join(tmpdir(), "seo-workbench-killed-writer-"),
    );
    const project = legacy(directory, 3);
    const worker = child(
      directory,
      `const store = new Store(process.argv[1]); store.db.exec("BEGIN IMMEDIATE; DELETE FROM projects"); console.log("ready"); setInterval(() => { if (!store.db.isOpen) process.exit(2); }, 1000);`,
    );
    const exited = once(worker, "exit");
    try {
      await Promise.race([
        once(worker.stdout, "data"),
        exited.then(() => {
          throw new Error("Synthetic writer exited before readiness.");
        }),
      ]);
      worker.kill("SIGKILL");
      await exited;
      const recovered = new Store(directory);
      try {
        assert.equal(
          recovered.project(project).seeds[0],
          "https://www.example.com/",
        );
        assert.equal(
          recovered.db.prepare("PRAGMA integrity_check").get()!.integrity_check,
          "ok",
        );
        assert.deepEqual(
          recovered.db.prepare("PRAGMA foreign_key_check").all(),
          [],
        );
        recovered.createAudit(project);
      } finally {
        recovered.close();
      }
    } finally {
      if (worker.exitCode === null && worker.signalCode === null)
        worker.kill("SIGKILL");
      await exited;
      rmSync(directory, { recursive: true, force: true });
    }
  },
);

test(
  "simultaneous native openers complete one legacy migration without duplicate schema changes",
  { timeout: 15000 },
  async () => {
    const directory = mkdtempSync(
      join(tmpdir(), "seo-workbench-migration-openers-"),
    );
    const project = legacy(directory, 1);
    const workers = Array.from({ length: 3 }, () =>
      child(
        directory,
        "const store = new Store(process.argv[1]); store.close();",
      ),
    );
    try {
      const codes = await Promise.all(
        workers.map(async (worker) => {
          let error = "";
          worker.stderr.on("data", (chunk) => {
            error += chunk.toString();
          });
          const [code] = await once(worker, "exit");
          assert.equal(code, 0, error);
          return code;
        }),
      );
      assert.equal(codes.length, 3);
      const recovered = new Store(directory);
      try {
        assert.equal(
          recovered.project(project).seeds[0],
          "https://www.example.com/",
        );
      } finally {
        recovered.close();
      }
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  },
);

test(
  "opening waits for an existing exclusive writer before its first schema read",
  { timeout: 15000 },
  async () => {
    const directory = mkdtempSync(
      join(tmpdir(), "seo-workbench-opening-lock-"),
    );
    const project = legacy(directory, 3);
    const worker = child(
      directory,
      `const store = new Store(process.argv[1]); store.db.exec("PRAGMA journal_mode=DELETE; BEGIN EXCLUSIVE"); console.log("ready"); setTimeout(() => { store.db.exec("COMMIT"); store.close(); }, 300);`,
    );
    const exited = once(worker, "exit");
    try {
      await Promise.race([
        once(worker.stdout, "data"),
        exited.then(() => {
          throw new Error("Synthetic lock holder exited before readiness.");
        }),
      ]);
      const reopened = new Store(directory);
      try {
        assert.equal(
          reopened.project(project).seeds[0],
          "https://www.example.com/",
        );
      } finally {
        reopened.close();
      }
      const [code] = await exited;
      assert.equal(code, 0);
    } finally {
      if (worker.exitCode === null && worker.signalCode === null)
        worker.kill("SIGKILL");
      await exited;
      rmSync(directory, { recursive: true, force: true });
    }
  },
);

test("a real SQLite capacity failure preserves committed analysis and permits a successful retry", () => {
  const directory = mkdtempSync(join(tmpdir(), "seo-workbench-disk-capacity-")),
    store = new Store(directory);
  try {
    const id = store.createAudit(
      store.createProject(
        parseConfig({
          seeds: ["https://www.example.com/"],
          origins: ["https://www.example.com"],
        }),
      ),
    );
    const previous = store.saveAnalysis(id, "synthetic-previous", []);
    const committed = store.db.prepare("SELECT * FROM analyses").all();
    const pages = Number(
      store.db.prepare("PRAGMA page_count").get()?.page_count,
    );
    store.db.exec("PRAGMA max_page_count=" + (pages + 1));
    const data = Buffer.alloc(700000);
    // Synthetic deterministic noise avoids compression concealing the actual allocation failure.
    let state = 1;
    for (let i = 0; i < data.length; i++) {
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      data[i] = state & 255;
    }
    const result = {
      id: "synthetic-result",
      ruleId: "title-review",
      ruleVersion: "1",
      url: "https://www.example.com/",
      outcome: "not-tested",
      reason: "Synthetic fault record.",
      observed: data.toString("base64"),
      evidenceIds: [],
      sourceIds: [],
    } as any;
    assert.throws(
      () => store.saveAnalysis(id, "synthetic-full", [result]),
      (error: any) =>
        error.code === "ERR_SQLITE_ERROR" &&
        error.errcode === 13 &&
        errorCode(error) === "storage-full",
    );
    assert.equal(store.db.isTransaction, false);
    assert.equal(store.latestAnalysis(id), previous);
    assert.deepEqual(
      store.db.prepare("SELECT * FROM analyses").all(),
      committed,
    );
    assert.equal(
      store.db.prepare("SELECT COUNT(*) AS n FROM results").get()?.n,
      0,
    );
    assert.equal(
      store.db.prepare("SELECT COUNT(*) AS n FROM analysis_dictionaries").get()
        ?.n,
      1,
    );
    assert.equal(
      store.db.prepare("PRAGMA integrity_check").get()?.integrity_check,
      "ok",
    );
    store.db.exec("PRAGMA max_page_count=1000000");
    const retried = store.saveAnalysis(id, "synthetic-retry", [result]);
    assert.equal(store.latestAnalysis(id), retried);
    assert.deepEqual(store.results(id), [result]);
  } finally {
    store.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test("an automatic transaction rollback preserves its original error and earlier committed data", () => {
  const directory = mkdtempSync(
      join(tmpdir(), "seo-workbench-automatic-rollback-"),
    ),
    store = new Store(directory);
  try {
    const id = store.createAudit(
      store.createProject(
        parseConfig({
          seeds: ["https://www.example.com/"],
          origins: ["https://www.example.com"],
        }),
      ),
    );
    const previous = store.saveAnalysis(id, "synthetic-previous", []);
    store.db.exec(
      "CREATE TRIGGER synthetic_fault BEFORE INSERT ON results BEGIN SELECT RAISE(ROLLBACK,'synthetic-capacity-rollback'); END",
    );
    const result = {
      id: "synthetic-result",
      ruleId: "title-review",
      url: "https://www.example.com/",
      outcome: "not-tested",
    } as any;
    assert.throws(
      () => store.saveAnalysis(id, "synthetic-fault", [result]),
      /synthetic-capacity-rollback/,
    );
    assert.equal(store.db.isTransaction, false);
    assert.equal(store.latestAnalysis(id), previous);
    assert.equal(
      store.db.prepare("SELECT COUNT(*) AS n FROM analysis_dictionaries").get()
        ?.n,
      1,
    );
    store.db.exec("DROP TRIGGER synthetic_fault");
    assert.ok(store.saveAnalysis(id, "synthetic-retry", []));
  } finally {
    store.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test("storage errors use fixed categories without disclosing private diagnostics", () => {
  const error = Object.assign(new Error("Synthetic private diagnostic"), {
    code: "ENOSPC",
  });
  assert.equal(errorCode(error), "storage-full");
  assert.equal(
    errorCode(
      Object.assign(new Error("Synthetic private diagnostic"), {
        code: "ERR_SQLITE_ERROR",
        errcode: 13,
      }),
    ),
    "storage-full",
  );
  assert.equal(
    errorCode(new Error("Synthetic private diagnostic")),
    "operation-failed",
  );
});

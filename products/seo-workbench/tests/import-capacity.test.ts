import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { Store } from "../src/store.ts";
import { parseConfig } from "../src/domain.ts";

test("import reads preserve complete ordered records and reject cumulative UTF-8 size without decoding a partial set", () => {
  const root = mkdtempSync(join(tmpdir(), "seo-workbench-import-capacity-")),
    store = new Store(root);
  try {
    const project = store.createProject(
      parseConfig({
        seeds: ["https://www.example.com/"],
        origins: ["https://www.example.com"],
        maxMemoryBytes: 33554432,
      }),
    );
    store.addImport(project, "synthetic-small", { order: 1, label: "First" });
    store.addImport(project, "synthetic-small", { order: 2, label: "Second" });
    assert.deepEqual(store.imports(project, "synthetic-small"), [
      { order: 1, label: "First" },
      { order: 2, label: "Second" },
    ]);
    assert.deepEqual(store.imports(project, "absent"), []);
    const large = { text: "\u754c".repeat(1500000) };
    store.addImport(project, "synthetic-large", large);
    assert.deepEqual(store.imports(project, "synthetic-large"), [large]);
    store.addImport(project, "synthetic-large", large);
    // A corrupt first row proves the complete encoded size is checked before parsing.
    store.db
      .prepare(
        "UPDATE imports SET data='invalid synthetic JSON' WHERE project_id=? AND kind=? AND rowid=(SELECT MIN(rowid) FROM imports WHERE project_id=? AND kind=?)",
      )
      .run(project, "synthetic-large", project, "synthetic-large");
    store.addImport(project, "synthetic-large", large);
    assert.throws(
      () => store.imports(project, "synthetic-large"),
      /imports-memory-budget/,
    );
    assert.deepEqual(
      store.imports(project, "synthetic-small").map((r: any) => r.order),
      [1, 2],
    );
    assert.equal(
      store.db.prepare("SELECT COUNT(*) AS n FROM imports").get()?.n,
      5,
    );
  } finally {
    store.close();
    rmSync(root, { recursive: true, force: true });
  }
});

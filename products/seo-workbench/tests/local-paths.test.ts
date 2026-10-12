import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  rmSync,
  symlinkSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { within } from "../src/store.ts";

test("source containment distinguishes descendants, siblings and directory aliases by actual filesystem identity", () => {
  const root = mkdtempSync(join(tmpdir(), "seo-workbench-source-boundary-")),
    source = join(root, "SyntheticRepository"),
    sibling = join(root, "SyntheticRepository-backup");
  mkdirSync(source);
  mkdirSync(sibling);
  mkdirSync(join(source, "nested"));
  try {
    assert.equal(within(source, source), true);
    assert.equal(within(join(source, "nested"), source), true);
    assert.equal(within(join(source, "future-export.html"), source), true);
    assert.equal(within(sibling, source), false);
    assert.equal(within(join(sibling, "future-export.html"), source), false);
    const caseAlias = join(root, "syntheticrepository");
    if (existsSync(caseAlias)) {
      assert.equal(within(caseAlias, source), true);
      assert.equal(within(join(caseAlias, "future-export.html"), source), true);
    } else assert.equal(within(caseAlias, source), false);
    if (process.platform !== "win32") {
      const alias = join(root, "linked-source");
      symlinkSync(source, alias);
      assert.equal(within(alias, source), true);
      assert.equal(within(join(alias, "future-export.html"), source), true);
      assert.equal(within(join(alias, "nested"), source), true);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

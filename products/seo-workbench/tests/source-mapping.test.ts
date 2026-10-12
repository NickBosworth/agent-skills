import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  rmSync,
  writeFileSync,
  mkdirSync,
  readFileSync,
  symlinkSync,
  linkSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { Store } from "../src/store.ts";
import { Workbench } from "../src/app.ts";
import { Crawler } from "../src/crawler.ts";
import { NetworkPolicy } from "../src/network.ts";
import { fixtureSite } from "../src/fixtures.ts";
import { mapSource } from "../src/source-mapping.ts";
import { exportReport } from "../src/reports.ts";
import { retentionPlan, applyRetention } from "../src/maintenance.ts";

async function setup() {
  execFileSync("git", ["--version"], { stdio: "ignore" });
  const root = mkdtempSync(join(tmpdir(), "seo-workbench-source-map-")),
    repository = join(root, "repository"),
    store = new Store(join(root, "state")),
    fixture = await fixtureSite();
  mkdirSync(repository);
  const git = (...args: string[]) =>
    execFileSync("git", ["-C", repository, ...args], { stdio: "ignore" });
  git("init", "--quiet");
  mkdirSync(join(repository, "templates"));
  const content =
    "<main>Wholly synthetic source passage.</main>\n<title>Synthetic template</title>\n";
  writeFileSync(join(repository, "templates/page.html"), content);
  git("add", "--", "templates/page.html");
  const auditId = store.createAudit(store.createProject(fixture.config));
  await new Crawler(
    store,
    new NetworkPolicy({ localOrigins: [fixture.origin] }),
  ).run(auditId);
  const app = new Workbench(store),
    group = app.view(auditId, "groups")[0];
  const mapping = {
    auditId,
    analysisId: group.analysisId,
    groupId: group.id,
    file: "templates/page.html",
    sha256: createHash("sha256").update(content).digest("hex"),
    startLine: 1,
    endLine: 2,
    rationale: "The owner confirms that this template renders these pages.",
  };
  return {
    root,
    repository,
    store,
    fixture,
    app,
    mapping,
    content,
    git,
    cleanup: async () => {
      store.close();
      await fixture.close();
      rmSync(root, { recursive: true, force: true });
    },
  };
}

test("real CLI verifies an explicit tracked source version and private handoffs retain no source text or absolute path", async () => {
  const s = await setup();
  try {
    const input = join(s.root, "mapping.json");
    writeFileSync(input, JSON.stringify(s.mapping));
    const run = spawnSync(
      process.execPath,
      [
        "src/cli.ts",
        "map-source",
        input,
        "--repository",
        s.repository,
        "--data",
        join(s.root, "state"),
      ],
      { encoding: "utf8", timeout: 10000 },
    );
    assert.equal(run.status, 0, run.stderr);
    assert.match(JSON.parse(run.stdout).mappingId, /^[a-f0-9-]{36}$/);
    const group = s.app
      .view(s.mapping.auditId, "groups")
      .find((g: any) => g.id === s.mapping.groupId);
    assert.equal(group.sourceMapping.sha256, s.mapping.sha256);
    assert.equal(group.sourceMapping.file, s.mapping.file);
    assert.match(group.cause, /shared cause still needs to be confirmed/);
    const retained = JSON.stringify(
      s.store.imports(
        s.store.audit(s.mapping.auditId).projectId,
        "source-mapping",
      ),
    );
    assert.ok(!retained.includes(s.repository));
    assert.ok(!retained.includes("Wholly synthetic source passage"));
    for (const format of ["html", "markdown", "json"] as const) {
      const privateReport = exportReport(s.store, s.mapping.auditId, format);
      assert.ok(privateReport.includes(s.mapping.sha256));
      assert.ok(privateReport.includes(s.mapping.file));
      assert.ok(!privateReport.includes("Wholly synthetic source passage"));
      const shared = exportReport(
        s.store,
        s.mapping.auditId,
        format,
        "shareable",
      );
      assert.ok(!shared.includes(s.mapping.sha256));
      assert.ok(!shared.includes(s.mapping.file));
    }
    s.app.reanalyze(s.mapping.auditId);
    assert.equal(
      s.app
        .view(s.mapping.auditId, "groups")
        .find((g: any) => g.id === s.mapping.groupId).sourceMapping,
      null,
    );
    assert.throws(
      () => mapSource(s.store, s.repository, s.mapping),
      /action-review-analysis-changed/,
    );
    assert.equal(
      s.store.imports(
        s.store.audit(s.mapping.auditId).projectId,
        "source-mapping",
      ).length,
      1,
    );
  } finally {
    await s.cleanup();
  }
});

test("source mappings reject untracked, escaped, binary, oversized, changed and invalid-line sources without saving", async () => {
  const s = await setup();
  try {
    for (const file of [
      "../outside.html",
      "/absolute.html",
      "templates/../page.html",
      ".env",
      "templates\\page.html",
      "templates//page.html",
    ])
      assert.throws(
        () => mapSource(s.store, s.repository, { ...s.mapping, file }),
        /source-mapping-invalid/,
      );
    writeFileSync(join(s.repository, "untracked.html"), s.content);
    assert.throws(
      () =>
        mapSource(s.store, s.repository, {
          ...s.mapping,
          file: "untracked.html",
        }),
      /source-mapping-file-invalid/,
    );
    assert.throws(
      () =>
        mapSource(s.store, s.repository, {
          ...s.mapping,
          sha256: "0".repeat(64),
        }),
      /source-mapping-fingerprint-changed/,
    );
    assert.throws(
      () => mapSource(s.store, s.repository, { ...s.mapping, endLine: 20 }),
      /source-mapping-lines-invalid/,
    );
    for (const [file, content] of [
      ["binary.html", Buffer.from([0xff, 0x00])],
      ["large.html", Buffer.alloc(2000001, 120)],
    ] as const) {
      writeFileSync(join(s.repository, file), content);
      s.git("add", "--", file);
      assert.throws(
        () => mapSource(s.store, s.repository, { ...s.mapping, file }),
        /source-mapping-file-invalid/,
      );
    }
    assert.deepEqual(
      s.store.imports(
        s.store.audit(s.mapping.auditId).projectId,
        "source-mapping",
      ),
      [],
    );
  } finally {
    await s.cleanup();
  }
});

test(
  "source mappings refuse symbolic and hard-link escapes and deletion removes audit-bound references",
  { skip: process.platform === "win32" },
  async () => {
    const s = await setup();
    try {
      const outside = join(s.root, "outside.html");
      writeFileSync(outside, s.content);
      symlinkSync(outside, join(s.repository, "linked.html"));
      s.git("add", "--", "linked.html");
      linkSync(outside, join(s.repository, "hard.html"));
      s.git("add", "--", "hard.html");
      symlinkSync(s.root, join(s.repository, "linked-directory"));
      s.git("add", "--", "linked-directory");
      for (const file of [
        "linked.html",
        "hard.html",
        "linked-directory/outside.html",
      ])
        assert.throws(
          () => mapSource(s.store, s.repository, { ...s.mapping, file }),
          /source-mapping-file-invalid/,
        );
      mapSource(s.store, s.repository, s.mapping);
      const project = s.store.audit(s.mapping.auditId).projectId;
      s.store.db
        .prepare("UPDATE audits SET updated=? WHERE id=?")
        .run("2000-01-01T00:00:00.000Z", s.mapping.auditId);
      const before = "2001-01-01T00:00:00.000Z";
      const plan = retentionPlan(s.store, project, before);
      assert.equal(plan.audits.length, 1);
      applyRetention(s.store, project, before, plan.selection);
      assert.deepEqual(s.store.imports(project, "source-mapping"), []);
      assert.equal(
        readFileSync(join(s.repository, s.mapping.file), "utf8"),
        s.content,
      );
    } finally {
      await s.cleanup();
    }
  },
);

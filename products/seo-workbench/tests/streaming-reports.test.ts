import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  rmSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { Workbench } from "../src/app.ts";
import { serve } from "../src/server.ts";
import { Store } from "../src/store.ts";
import { Crawler } from "../src/crawler.ts";
import { NetworkPolicy } from "../src/network.ts";
import { fixtureSite } from "../src/fixtures.ts";
import {
  csvReport,
  jsonReport,
  reportChunks,
  exportReport,
} from "../src/reports.ts";
import { groups } from "../src/intelligence.ts";
import { parseConfig } from "../src/domain.ts";

function cli(
  data: string,
  audit: string,
  out: string,
  profile = "private",
  format = "csv",
) {
  return spawnSync(
    process.execPath,
    [
      fileURLToPath(new URL("../src/cli.ts", import.meta.url)),
      "report",
      audit,
      "--format",
      format,
      "--profile",
      profile,
      "--out",
      out,
      "--data",
      data,
    ],
    { encoding: "utf8", timeout: 15000 },
  );
}

test("CSV iterator matches buffered exports and pins its historical analysis before yielding", async () => {
  const root = mkdtempSync(join(tmpdir(), "seo-workbench-stream-csv-")),
    store = new Store(join(root, "state")),
    fixture = await fixtureSite();
  try {
    const id = store.createAudit(store.createProject(fixture.config));
    await new Crawler(
      store,
      new NetworkPolicy({ localOrigins: [fixture.origin] }),
    ).run(id);
    for (const profile of ["private", "shareable"] as const)
      assert.equal(
        [...csvReport(store, id, profile)].join(""),
        exportReport(store, id, "csv", profile),
      );
    const expected = exportReport(store, id, "csv"),
      stream = csvReport(store, id),
      header = stream.next().value;
    store.saveAnalysis(id, "synthetic-new", []);
    assert.equal(header + [...stream].join(""), expected);
    assert.equal(store.results(id).length, 0);
    assert.throws(
      () => [...store.iterateResults(id, { limit: 0 })],
      /invalid-result-pagination/,
    );
  } finally {
    store.close();
    await fixture.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("real CLI streams a complete CSV above the accumulated-read allowance and protects existing files", async () => {
  const root = mkdtempSync(join(tmpdir(), "seo-workbench-large-csv-")),
    state = join(root, "state"),
    store = new Store(state),
    fixture = await fixtureSite();
  try {
    const project = store.createProject(fixture.config),
      basis = store.createAudit(project);
    await new Crawler(
      store,
      new NetworkPolicy({ localOrigins: [fixture.origin] }),
    ).run(basis);
    const id = store.createAudit(
      project,
      parseConfig({ ...fixture.config, maxMemoryBytes: 33554432 }),
    );
    const seed = store.results(basis)[0],
      records = Array.from({ length: 9 }, (_, i) => ({
        ...seed,
        id: randomUUID(),
        url: fixture.origin + "/row/" + i,
        outcome: "warning" as const,
        reason: "Synthetic bounded result. ".repeat(45000),
      }));
    store.saveAnalysis(id, "synthetic-large", records);
    assert.throws(
      () => exportReport(store, id, "csv"),
      /results-memory-budget/,
    );
    assert.equal([...store.iterateResults(id, { limit: 9 })].length, 9);
    const grouped = new Workbench(store).view(id, "groups");
    assert.equal(grouped.length, 1);
    assert.equal(grouped[0].affected.length, 9);
    const out = join(root, "complete.csv"),
      run = cli(state, id, out);
    assert.equal(run.status, 0, run.stderr);
    const text = readFileSync(out, "utf8");
    assert.equal(text.trim().split("\n").length, 10);
    for (const record of records) assert.ok(text.includes(record.url));
    if (process.platform !== "win32")
      assert.equal(statSync(out).mode & 0o777, 0o600);
    const before = readFileSync(out);
    assert.equal(cli(state, id, out).status, 2);
    assert.deepEqual(readFileSync(out), before);
    const json = join(root, "complete.json");
    assert.equal(cli(state, id, json, "private", "json").status, 0);
    const parsed = JSON.parse(readFileSync(json, "utf8"));
    assert.equal(parsed.results.length, 9);
    assert.equal(parsed.groups[0].affected.length, 9);
    const shared = join(root, "shared.csv");
    assert.equal(cli(state, id, shared, "shareable").status, 0);
    assert.ok(!readFileSync(shared, "utf8").includes(fixture.origin));
    assert.ok(readdirSync(root).every((name) => !name.includes(".partial-")));
  } finally {
    store.close();
    await fixture.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("a late corrupt record removes an unfinished CSV and never replaces an existing destination", async () => {
  const root = mkdtempSync(join(tmpdir(), "seo-workbench-csv-fault-")),
    state = join(root, "state"),
    store = new Store(state),
    fixture = await fixtureSite();
  try {
    const id = store.createAudit(store.createProject(fixture.config));
    await new Crawler(
      store,
      new NetworkPolicy({ localOrigins: [fixture.origin] }),
    ).run(id);
    const analysis = store.latestAnalysis(id)!;
    store.db
      .prepare("INSERT INTO results VALUES(?,?,?,?,?,?)")
      .run(
        analysis,
        randomUUID(),
        "title-review",
        fixture.origin + "/zz-last",
        "warning",
        "synthetic malformed JSON",
      );
    const out = join(root, "refused.csv");
    assert.equal(cli(state, id, out).status, 2);
    assert.equal(existsSync(out), false);
    assert.ok(readdirSync(root).every((name) => !name.includes(".partial-")));
    writeFileSync(out, "Synthetic original content.");
    assert.equal(cli(state, id, out).status, 2);
    assert.equal(readFileSync(out, "utf8"), "Synthetic original content.");
  } finally {
    store.close();
    await fixture.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("streamed JSON preserves the report contract, grouped ground truth and refuses removed results", async () => {
  const root = mkdtempSync(join(tmpdir(), "seo-workbench-stream-json-")),
    store = new Store(root),
    fixture = await fixtureSite();
  try {
    const id = store.createAudit(store.createProject(fixture.config));
    await new Crawler(
      store,
      new NetworkPolicy({ localOrigins: [fixture.origin] }),
    ).run(id);
    for (const profile of ["private", "shareable"] as const) {
      const expected = JSON.parse(exportReport(store, id, "json", profile)),
        actual = JSON.parse([...jsonReport(store, id, profile)].join(""));
      delete expected.generatedAt;
      delete actual.generatedAt;
      assert.deepEqual(actual, expected);
    }
    const seed = store.results(id)[0],
      config = parseConfig({
        ...fixture.config,
        contracts: [
          { pathPrefix: "/", template: "synthetic", importance: "important" },
        ],
      });
    const samples = [
      {
        ...seed,
        ruleId: "title-review",
        outcome: "warning" as const,
        exception: undefined,
        reason: "First synthetic reason.",
        url: fixture.origin + "/a",
        evidenceIds: ["synthetic-a"],
      },
      {
        ...seed,
        ruleId: "title-review",
        outcome: "fail" as const,
        exception: undefined,
        url: fixture.origin + "/b",
        evidenceIds: ["synthetic-b"],
      },
      {
        ...seed,
        ruleId: "title-review",
        outcome: "fail" as const,
        exception: {
          reason: "Synthetic reviewed exclusion.",
          ownerRole: "site maintainer",
        },
        url: fixture.origin + "/c",
        evidenceIds: ["synthetic-c"],
      },
      {
        ...seed,
        ruleId: "title-review",
        outcome: "not-tested" as const,
        exception: undefined,
        url: fixture.origin + "/d",
        evidenceIds: [],
      },
    ];
    const result = groups(samples.values(), config)[0];
    assert.equal(result.priority, "P1");
    assert.equal(result.activeCount, 2);
    assert.equal(result.exceptedCount, 1);
    assert.deepEqual(
      result.affected,
      samples.slice(0, 3).map((sample) => sample.url),
    );
    assert.deepEqual(result.action.evidenceIds, [
      "synthetic-a",
      "synthetic-b",
      "synthetic-c",
    ]);
    assert.equal(result.action.issue, "First synthetic reason.");
    const stream = jsonReport(store, id);
    assert.equal(stream.next().value, "{\n");
    store.db
      .prepare("DELETE FROM results WHERE analysis_id=?")
      .run(store.latestAnalysis(id)!);
    assert.throws(() => [...stream], /report-analysis-changed/);
  } finally {
    store.close();
    await fixture.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("all streamed human formats preserve explanations, evidence, redaction and valid technical JSON", async () => {
  const root = mkdtempSync(join(tmpdir(), "seo-workbench-stream-human-")),
    store = new Store(root),
    fixture = await fixtureSite();
  try {
    const id = store.createAudit(store.createProject(fixture.config));
    await new Crawler(
      store,
      new NetworkPolicy({ localOrigins: [fixture.origin] }),
    ).run(id);
    for (const profile of ["private", "shareable"] as const)
      for (const format of ["html", "markdown"] as const) {
        const actual = [...reportChunks(store, id, format, profile)].join(""),
          expected = exportReport(store, id, format, profile);
        const normalize = (value: string) =>
          value
            .replaceAll(
              /"generatedAt":\s*"[^"]+"/g,
              '"generatedAt":"synthetic"',
            )
            .replaceAll(
              /&quot;generatedAt&quot;:&quot;[^&]+&quot;/g,
              "&quot;generatedAt&quot;:&quot;synthetic&quot;",
            );
        assert.equal(normalize(actual), normalize(expected));
        if (profile === "shareable")
          assert.ok(!actual.includes(fixture.origin));
        assert.ok(!actual.includes("<script"));
        if (format === "html") assert.ok(actual.endsWith("</html>"));
        else {
          const technical = actual
            .split("## Technical details")[1]
            .split("JSON field names and identifiers are kept unchanged.\n")[1];
          const parsed = JSON.parse(technical.replace(/^    /gm, ""));
          assert.equal(parsed.analysisId, store.latestAnalysis(id));
          assert.ok(parsed.resultSummary.length);
        }
      }
    const original = store.results(id),
      records = Array.from({ length: 20 }, (_, i) => ({
        ...original[0],
        id: randomUUID(),
        url: fixture.origin + "/large/" + i,
        outcome: "not-tested" as const,
        reason: "Synthetic unknown record. ".repeat(80000),
      }));
    store.saveAnalysis(id, "synthetic-output-limit", records);
    assert.equal(store.results(id, { limit: 20 }).length, 20);
    assert.throws(
      () => exportReport(store, id, "json"),
      /results-memory-budget/,
    );
    const out = join(root, "complete-large.html");
    assert.equal(cli(root, id, out, "private", "html").status, 0);
    assert.ok(statSync(out).size > 32 * 2 ** 20);
    assert.ok(readFileSync(out, "utf8").endsWith("</html>"));
  } finally {
    store.close();
    await fixture.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("local HTTP streams reports above the string limit and terminates a late failed CSV instead of completing it", async () => {
  const root = mkdtempSync(join(tmpdir(), "seo-workbench-http-stream-")),
    store = new Store(root),
    fixture = await fixtureSite(),
    app = new Workbench(store),
    server = await serve(app, 0);
  try {
    const id = store.createAudit(
      store.createProject(
        parseConfig({ ...fixture.config, maxMemoryBytes: 2147483648 }),
      ),
    );
    await new Crawler(
      store,
      new NetworkPolicy({ localOrigins: [fixture.origin] }),
    ).run(id);
    const original = store.results(id)[0],
      records = Array.from({ length: 20 }, (_, i) => ({
        ...original,
        id: randomUUID(),
        url: fixture.origin + "/large/" + i,
        outcome: "not-tested" as const,
        reason: "Synthetic HTTP record. ".repeat(80000),
      }));
    const analysis = store.saveAnalysis(id, "synthetic-http", records);
    assert.throws(() => app.report(id, "json"), /results-memory-budget/);
    const home = await fetch(server.origin + "/"),
      cookie = home.headers.get("set-cookie")!.split(";")[0];
    await home.text();
    const response = await fetch(
      server.origin +
        "/api/report?audit=" +
        id +
        "&format=json&profile=private",
      { headers: { Cookie: cookie } },
    );
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.results.length, 20);
    assert.equal(data.analysisId, analysis);
    store.db
      .prepare("INSERT INTO results VALUES(?,?,?,?,?,?)")
      .run(
        analysis,
        randomUUID(),
        "title-review",
        fixture.origin + "/zz-last",
        "warning",
        "synthetic corrupt record",
      );
    await assert.rejects(async () => {
      const failed = await fetch(
        server.origin +
          "/api/report?audit=" +
          id +
          "&format=csv&profile=private",
        { headers: { Cookie: cookie } },
      );
      await failed.text();
    });
    const unauthorized = await fetch(
      server.origin + "/api/report?audit=" + id + "&format=csv",
    );
    assert.equal(unauthorized.status, 403);
    await unauthorized.text();
  } finally {
    await server.close();
    store.close();
    await fixture.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test(
  "whole-record streaming includes the record beyond one million while buffered reads still refuse the ceiling",
  { timeout: 60000 },
  () => {
    const root = mkdtempSync(join(tmpdir(), "seo-workbench-whole-stream-")),
      store = new Store(root);
    try {
      const id = store.createAudit(
          store.createProject(
            parseConfig({
              seeds: ["https://www.example.com/"],
              origins: ["https://www.example.com/"],
            }),
          ),
        ),
        analysis = store.saveAnalysis(id, "synthetic-whole", []);
      const raw = JSON.stringify({
        id: "synthetic",
        ruleId: "title-review",
        ruleVersion: "1",
        url: "https://www.example.com/",
        outcome: "pass",
        observed: null,
        expected: null,
        evidenceIds: [],
        denominator: 1,
        applicability: "synthetic",
        engine: "synthetic",
        severity: "info",
        observationConfidence: "synthetic",
        interpretationConfidence: "synthetic",
        causeConfidence: "unknown",
        reason: "Synthetic record.",
        remediation: "No change.",
        verification: "Synthetic check.",
        sourceIds: [],
      });
      store.db.exec(
        `CREATE TEMP VIEW results AS WITH RECURSIVE n(x) AS (VALUES(1) UNION ALL SELECT x+1 FROM n WHERE x<1000001) SELECT '${analysis}' AS analysis_id, 'https://www.example.com/page/'||x AS url, 'title-review' AS rule_id, json_set('${raw}', '$.id', CAST(x AS TEXT), '$.url', 'https://www.example.com/page/'||x) AS data FROM n`,
      );
      assert.throws(
        () => store.results(id, { limit: 1_000_000 }),
        /results-count-budget/,
      );
      assert.throws(
        () => exportReport(store, id, "csv"),
        /results-count-budget/,
      );
      let count = 0,
        beyond = false;
      for (const record of store.allResults(id, analysis)) {
        count++;
        if (record.id === "1000001") beyond = true;
      }
      assert.equal(count, 1000001);
      assert.equal(beyond, true);
    } finally {
      store.close();
      rmSync(root, { recursive: true, force: true });
    }
  },
);

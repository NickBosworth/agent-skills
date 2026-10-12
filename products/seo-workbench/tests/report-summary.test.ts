import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { load } from "cheerio";
import { Store } from "../src/store.ts";
import { Crawler } from "../src/crawler.ts";
import { NetworkPolicy } from "../src/network.ts";
import { fixtureSite } from "../src/fixtures.ts";
import { exportReport } from "../src/reports.ts";

test("human reports count successful/inapplicable checks and preserve every failure and unknown; machine exports stay complete", async () => {
  const directory = mkdtempSync(
      join(tmpdir(), "seo-workbench-report-summary-"),
    ),
    store = new Store(directory),
    fixture = await fixtureSite();
  try {
    const audit = store.createAudit(store.createProject(fixture.config));
    await new Crawler(
      store,
      new NetworkPolicy({ localOrigins: [fixture.origin] }),
    ).run(audit);
    const outcomes = [
      "pass",
      "not-applicable",
      "fail",
      "not-tested",
      "blocked",
    ] as const;
    const results = store
      .results(audit)
      .slice(0, 5)
      .map((result, index) => ({
        ...result,
        outcome: outcomes[index],
        reason: "Synthetic individual explanation " + index,
      }));
    assert.equal(results.length, 5);
    const analysis = store.saveAnalysis(audit, "0.1.0", results);
    for (const profile of ["private", "shareable"] as const) {
      const machine = JSON.parse(exportReport(store, audit, "json", profile));
      assert.equal(machine.results.length, 5);
      const csv = exportReport(store, audit, "csv", profile);
      assert.equal(csv.trim().split("\n").length, 6);
      const html = exportReport(store, audit, "html", profile),
        $ = load(html);
      assert.ok(
        $.text().includes(
          "Export JSON or CSV for every individual check result.",
        ),
      );
      const details = JSON.parse($("details pre").text());
      assert.equal(
        details.resultSummary.reduce(
          (sum: number, row: any) => sum + row.count,
          0,
        ),
        5,
      );
      assert.deepEqual(
        details.results.map((result: any) => result.outcome),
        ["fail", "not-tested", "blocked"],
      );
      assert.equal($("tbody tr").length, 3);
      const markdown = exportReport(store, audit, "markdown", profile);
      assert.ok(
        markdown.includes(
          "Passed checks and checks that do not apply are counted",
        ),
      );
      if (profile === "private") {
        assert.ok(!html.includes(results[0].reason));
        assert.ok(!markdown.includes(results[1].reason));
        for (const result of results.slice(2)) {
          assert.ok(html.includes(result.reason));
          assert.ok(markdown.includes(result.reason));
        }
      } else {
        for (const result of results) assert.ok(!html.includes(result.reason));
        assert.ok(
          details.results.every((result: any) => !result.url && !result.reason),
        );
      }
    }
    assert.equal(store.latestAnalysis(audit), analysis);
    assert.deepEqual(store.results(audit), results);
  } finally {
    store.close();
    await fixture.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

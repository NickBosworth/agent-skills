import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { compareSearchPeriods } from "../src/search-comparison.ts";
import { SearchImport, importData } from "../src/imports.ts";
import { Store } from "../src/store.ts";
import { Workbench } from "../src/app.ts";
import { parseConfig } from "../src/domain.ts";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { serve } from "../src/server.ts";

function period(current = false) {
  return SearchImport.parse({
    schemaVersion: 1,
    provider: "Google Search Console",
    method: "manual import",
    startDate: current ? "2026-09-08" : "2026-09-01",
    endDate: current ? "2026-09-14" : "2026-09-07",
    searchType: "web",
    aggregation: "byPage",
    complete: true,
    filters: [],
    limitations: "Synthetic query sample; site totals are unknown.",
    rows: [
      {
        page: "https://www.example.com/guide",
        query: "fictional guide",
        country: "gbr",
        device: "DESKTOP",
        clicks: current ? 5 : 10,
        impressions: current ? 200 : 100,
        position: null,
      },
      {
        page: "https://www.example.com/guide",
        query: current ? "later sample" : "earlier sample",
        country: "gbr",
        device: "DESKTOP",
        clicks: 50,
        impressions: 100,
        position: 1,
      },
      {
        page: "https://www.example.com/guide",
        query: "fictional guide",
        country: "gbr",
        device: "MOBILE",
        clicks: 0,
        impressions: 0,
        position: null,
      },
    ],
  });
}
test("selected search periods compare matching query samples, preserve dimensions and recompute CTR", () => {
  const result = compareSearchPeriods(period(), period(true));
  assert.equal(result.status, "sample-comparison");
  const desktop = result.pages.find((page) => page.device === "DESKTOP")!;
  assert.deepEqual(desktop.baseline, {
    clicks: 10,
    impressions: 100,
    ctr: 0.1,
  });
  assert.deepEqual(desktop.current, {
    clicks: 5,
    impressions: 200,
    ctr: 0.025,
  });
  assert.equal(desktop.change?.clicks, -5);
  assert.equal(desktop.change?.clicksPercent, -50);
  assert.ok(Math.abs(desktop.change!.ctrPercentagePoints! + 7.5) < 1e-10);
  assert.equal(desktop.baselineOnlyQueries, 1);
  assert.equal(desktop.currentOnlyQueries, 1);
  assert.match(desktop.review, /do not establish/);
  const mobile = result.pages.find((page) => page.device === "MOBILE")!;
  assert.equal(mobile.change?.clicksPercent, null);
  assert.equal(mobile.change?.ctrPercentagePoints, null);
});

test("compiled CLI and official MCP read the same selected sample comparison without provider calls", async () => {
  const directory = mkdtempSync(join(tmpdir(), "search-period-adapters-")),
    store = new Store(directory);
  const client = new Client({
    name: "synthetic-search-comparison",
    version: "0.1.0",
  });
  try {
    const project = store.createProject(
        parseConfig({
          origins: ["https://www.example.com"],
          seeds: ["https://www.example.com/"],
        }),
      ),
      audit = store.createAudit(project);
    const baseline = importData(store, project, "search-console", period()),
      current = importData(store, project, "search-console", period(true));
    const args = [
      fileURLToPath(new URL("../dist/cli.js", import.meta.url)),
      "--data",
      directory,
    ];
    const cli = await promisify(execFile)(process.execPath, [
      ...args,
      "compare-search",
      audit,
      baseline,
      current,
    ]);
    assert.equal(JSON.parse(cli.stdout).pages[0].change.clicks, -5);
    await client.connect(
      new StdioClientTransport({
        command: process.execPath,
        args: [...args, "mcp"],
        stderr: "pipe",
      }),
      { mode: "auto" },
    );
    const result: any = await client.callTool({
      name: "audit_results",
      arguments: {
        auditId: audit,
        view: "search-comparison",
        baselineImportId: baseline,
        currentImportId: current,
      },
    });
    assert.notEqual(result.isError, true);
    assert.equal(JSON.parse(result.content[0].text).pages[0].change.clicks, -5);
    const list: any = await client.callTool({
      name: "audit_results",
      arguments: { auditId: audit, view: "search-periods" },
    });
    assert.deepEqual(
      JSON.parse(list.content[0].text).map((record: any) => record.id),
      [baseline, current],
    );
  } finally {
    await client.close();
    store.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test(
  "browser selects periods, reads protected comparisons and pages through matched groups",
  { skip: process.env.WORKBENCH_BROWSER_TESTS !== "1" },
  async () => {
    const { chromium } = await import("playwright");
    const directory = mkdtempSync(join(tmpdir(), "search-period-ui-")),
      store = new Store(directory);
    const project = store.createProject(
        parseConfig({
          origins: ["https://www.example.com"],
          seeds: ["https://www.example.com/"],
        }),
      ),
      audit = store.createAudit(project);
    const before = period(),
      after = period(true);
    before.rows = Array.from({ length: 101 }, (_, index) => ({
      ...before.rows[0],
      page: `https://www.example.com/guide-${index}`,
    }));
    after.rows = before.rows.map((row) => ({ ...row, clicks: 5 }));
    const baseline = importData(store, project, "search-console", before);
    for (let index = 0; index < 99; index++)
      importData(store, project, "search-console", before);
    const current = importData(store, project, "search-console", after);
    const server = await serve(new Workbench(store), 0),
      browser = await chromium.launch({
        headless: true,
        chromiumSandbox: true,
      });
    try {
      const page = await browser.newPage(),
        errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(server.origin);
      await page
        .getByRole("link", { name: "Export & imports", exact: true })
        .click();
      await page
        .getByLabel("Earlier period", { exact: true })
        .selectOption(baseline);
      await page
        .getByRole("button", { name: "Load more saved periods", exact: true })
        .click();
      await page
        .getByLabel("Later period", { exact: true })
        .selectOption(current);
      await page
        .getByRole("button", { name: "Compare periods", exact: true })
        .click();
      await page
        .getByText("Showing 100 of 101 page groups.", { exact: false })
        .waitFor();
      await page
        .getByRole("button", { name: "Next page groups", exact: true })
        .click();
      await page
        .getByText("Showing 1 of 101 page groups.", { exact: false })
        .waitFor();
      await page
        .getByRole("button", { name: "Previous page groups", exact: true })
        .click();
      await page
        .getByText("Showing 100 of 101 page groups.", { exact: false })
        .waitFor();
      const protectedResponse = await fetch(
        server.origin +
          `/api/view?audit=${audit}&view=search-comparison&baselineImportId=${baseline}&currentImportId=${current}`,
      );
      assert.equal(protectedResponse.status, 403);
      await page
        .getByLabel("Later period", { exact: true })
        .selectOption(baseline);
      await page
        .getByRole("button", { name: "Compare periods", exact: true })
        .click();
      await page
        .getByText(
          "Choose two different saved periods, with an earlier baseline and a later comparison period.",
          { exact: true },
        )
        .waitFor();
      await page.getByLabel("Choose a data file (JSON)").setInputFiles({
        name: "synthetic-period.json",
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify(period(true))),
      });
      await page
        .getByRole("button", { name: "Import into this project", exact: true })
        .click();
      await page
        .getByText(
          "Data imported. The original date range, filters and measurement method have been kept.",
          { exact: true },
        )
        .waitFor();
      assert.equal(await page.locator("#search-current option").count(), 103);
      assert.equal(store.imports(project, "search-console").length, 102);
      assert.deepEqual(errors, []);
    } finally {
      await browser.close();
      await server.close();
      store.close();
      rmSync(directory, { recursive: true, force: true });
    }
  },
);
test("incompatible windows, methods, filters and corrupt metrics are refused without guessed deltas", () => {
  for (const change of [
    { startDate: "2026-09-07" },
    { endDate: "2026-09-15" },
    { method: "API import" },
    { searchType: "image" },
    { aggregation: "auto" },
    { filters: undefined },
    {
      filters: [
        { dimension: "query", operator: "contains", expression: "fictional" },
      ],
    },
    { rows: [period(true).rows[0], period(true).rows[0]] },
    { rows: [{ ...period(true).rows[0], clicks: 201 }] },
  ]) {
    const result = compareSearchPeriods(period(), {
      ...period(true),
      ...change,
    });
    assert.equal(result.status, "not-comparable");
    assert.equal(result.pages.length, 0);
    assert.ok(result.issues.length);
  }
  const result = compareSearchPeriods(
    { ...period(), complete: false },
    period(true),
  );
  assert.equal(result.status, "sample-comparison");
  assert.ok(result.limitations.some((text) => text.includes("incomplete")));
});
test("missing query records remain unknown; empty periods and large numeric totals never invent traffic", () => {
  const before = period(),
    after = period(true);
  after.rows = after.rows.map((row) => ({
    ...row,
    query: row.query + " unmatched",
  }));
  const result = compareSearchPeriods(before, after);
  assert.equal(result.status, "no-matched-data");
  assert.ok(
    result.pages.every(
      (page) =>
        page.change === null && page.baseline === null && page.current === null,
    ),
  );
  assert.equal(
    compareSearchPeriods({ ...before, rows: [] }, { ...after, rows: [] })
      .status,
    "no-matched-data",
  );
  const tinyBaseline = {
    ...before,
    rows: [{ ...before.rows[0], clicks: 1e-308, impressions: 1 }],
  };
  const regularCurrent = {
    ...after,
    rows: [{ ...before.rows[0], clicks: 1, impressions: 1 }],
  };
  assert.equal(
    compareSearchPeriods(tinyBaseline, regularCurrent).pages[0].change
      ?.clicksPercent,
    null,
  );
  const huge = {
    ...before,
    rows: [{ ...before.rows[0], clicks: 1e308, impressions: 1e308 }],
  };
  assert.throws(
    () => compareSearchPeriods(huge, { ...after, rows: huge.rows }),
    /search-period-metrics-invalid/,
  );
});
test("saved period selection is project-scoped, paginated and read-only; legacy imports stay readable", () => {
  const directory = mkdtempSync(join(tmpdir(), "search-period-test-")),
    store = new Store(directory);
  try {
    const config = parseConfig({
      origins: ["https://www.example.com"],
      seeds: ["https://www.example.com/"],
    });
    const project = store.createProject(config),
      other = store.createProject(config),
      audit = store.createAudit(project),
      app = new Workbench(store);
    const baseline = importData(store, project, "search-console", period()),
      current = importData(store, project, "search-console", period(true)),
      foreign = importData(store, other, "search-console", period(true));
    const original = JSON.stringify(store.imports(project, "search-console"));
    const options = {
      baselineImportId: baseline,
      currentImportId: current,
      limit: 1,
    };
    const first = app.view(audit, "search-comparison", options) as any;
    assert.equal(first.totalPages, 2);
    assert.equal(first.pages.length, 1);
    assert.equal(
      (app.view(audit, "search-comparison", { ...options, offset: 1 }) as any)
        .pages[0].device,
      "MOBILE",
    );
    assert.throws(
      () =>
        app.view(audit, "search-comparison", {
          ...options,
          currentImportId: foreign,
        }),
      /import-not-found/,
    );
    assert.throws(
      () =>
        app.view(audit, "search-comparison", {
          ...options,
          currentImportId: baseline,
        }),
      /search-period-selection-invalid/,
    );
    assert.equal(
      JSON.stringify(store.imports(project, "search-console")),
      original,
    );
    const legacy = { ...period(), filters: undefined };
    importData(store, project, "search-console", legacy);
    assert.equal(
      (app.view(audit, "search-periods") as any[])[2].filtersKnown,
      false,
    );
    assert.equal(store.imports(project, "search-console").length, 3);
  } finally {
    store.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

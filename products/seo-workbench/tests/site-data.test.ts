import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { Store } from "../src/store.ts";
import { Workbench } from "../src/app.ts";
import { parseConfig } from "../src/domain.ts";
import { importData } from "../src/imports.ts";
import { SiteDataImport, siteDataReview } from "../src/site-data.ts";
import { exportReport } from "../src/reports.ts";
import { serve } from "../src/server.ts";

const base = {
  schemaVersion: 1,
  method: "manual import",
  provider: "Fictional local supplier",
  toolVersion: null,
  origin: "https://www.example.com",
  collectedAt: "2026-10-12T00:00:00Z",
  startDate: "2026-09-01",
  endDate: "2026-09-30",
  timeZone: null,
  filters: "No filters were applied to this fictional sample.",
  sampling: "One wholly synthetic sample; this is not visitor data.",
  complete: false,
  limitations:
    "Fictional records, with no independent provider or identity verification.",
};
const row = {
  sampleId: "fictional-1",
  page: "https://www.example.com/guide",
  evidenceNotes: "A fictional record for local tests.",
};
const samples = [
  {
    ...base,
    dataset: "bing-search",
    provider: "Bing Webmaster Tools",
    searchType: null,
    aggregation: "query",
    rows: [
      {
        ...row,
        page: null,
        query: "fictional guide",
        country: null,
        device: null,
        clicks: 0,
        impressions: null,
        averagePosition: null,
      },
    ],
  },
  {
    ...base,
    dataset: "analytics",
    rows: [
      {
        ...row,
        channel: null,
        country: null,
        device: null,
        sessions: 10,
        users: null,
        keyEvents: 1,
        keyEventDefinition:
          "A fictional newsletter-completion event, counted by the owner.",
        revenue: null,
        currency: null,
      },
    ],
  },
  {
    ...base,
    dataset: "access-log",
    rows: [
      {
        ...row,
        requestMethod: "GET",
        responseStatus: 200,
        requests: 10,
        agentClass: "claimed-search-bot",
        verificationMethod: null,
      },
    ],
  },
  {
    ...base,
    dataset: "third-party-crawl",
    rows: [
      {
        ...row,
        observedAt: null,
        responseStatus: null,
        title: null,
        canonical: "https://www.example.org/declared",
        renderMode: "unknown",
      },
    ],
  },
];
test("four supplied datasets preserve missing metrics, dimensions, bot claims and unavailable crawl evidence", () => {
  for (const sample of samples) {
    const data = SiteDataImport.parse(sample),
      review = siteDataReview(data);
    assert.deepEqual(data, sample);
    assert.equal(review.rowCount, 1);
    assert.ok(review.interpretation.length > 50);
  }
  const crawl = siteDataReview(samples[3]);
  assert.equal(crawl.unavailableEvidence.length, 4);
  const bing = SiteDataImport.parse(samples[0]) as any;
  assert.equal(bing.rows[0].page, null);
  assert.equal(bing.rows[0].clicks, 0);
  assert.equal(bing.rows[0].impressions, null);
});
test("invalid provenance, scope, duplicate IDs, invented metrics and raw log fields are rejected atomically", () => {
  const directory = mkdtempSync(join(tmpdir(), "site-data-validation-")),
    store = new Store(directory);
  try {
    const project = store.createProject(
      parseConfig({ origins: [base.origin], seeds: [base.origin + "/"] }),
    );
    const invalid = [
      { ...samples[0], origin: base.origin + "/guide" },
      { ...samples[1], provider: "   " },
      { ...samples[1], sampling: " ".repeat(20) },
      { ...samples[0], startDate: "2026-10-01" },
      { ...samples[0], rows: [samples[0].rows[0], samples[0].rows[0]] },
      {
        ...samples[0],
        rows: [{ ...samples[0].rows[0], clicks: 2, impressions: 1 }],
      },
      { ...samples[0], rows: [{ ...samples[0].rows[0], clicks: -1 }] },
      {
        ...samples[0],
        rows: [
          { ...samples[0].rows[0], page: "https://www.example.org/guide" },
        ],
      },
      {
        ...samples[1],
        rows: [{ ...samples[1].rows[0], keyEventDefinition: null }],
      },
      {
        ...samples[1],
        rows: [{ ...samples[1].rows[0], revenue: 0, currency: null }],
      },
      { ...samples[1], rows: [{ ...samples[1].rows[0], sessions: 1.5 }] },
      {
        ...samples[2],
        rows: [
          {
            ...samples[2].rows[0],
            agentClass: "verified-search-bot",
            verificationMethod: null,
          },
        ],
      },
      {
        ...samples[2],
        rows: [
          {
            ...samples[2].rows[0],
            agentClass: "verified-search-bot",
            verificationMethod: "   ",
          },
        ],
      },
      {
        ...samples[2],
        rows: [{ ...samples[2].rows[0], clientAddress: "192.0.2.1" }],
      },
      { ...samples[3], rows: [{ ...samples[3].rows[0], responseStatus: 0 }] },
      {
        ...samples[3],
        rows: [{ ...samples[3].rows[0], canonical: "file:///fictional" }],
      },
    ];
    for (const sample of invalid)
      assert.throws(() => importData(store, project, "site-data", sample));
    assert.throws(
      () =>
        importData(store, project, "site-data", {
          ...samples[0],
          origin: "https://www.example.org",
        }),
      /import-project-scope/,
    );
    assert.throws(
      () =>
        importData(store, project, "site-data", {
          ...samples[0],
          limitations: "x".repeat(5000001),
        }),
      /import-size-budget/,
    );
    assert.equal(store.imports(project, "site-data").length, 0);
    assert.ok(importData(store, project, "site-data", samples[2]));
  } finally {
    store.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
test("imports remain separate from Workbench observations and shareable reports omit all supplied data", () => {
  const directory = mkdtempSync(join(tmpdir(), "site-data-reports-")),
    store = new Store(directory);
  try {
    const project = store.createProject(
        parseConfig({ origins: [base.origin], seeds: [base.origin + "/"] }),
      ),
      audit = store.createAudit(project),
      app = new Workbench(store);
    for (const sample of samples) app.import(project, "site-data", sample);
    const hostile = {
      ...samples[1],
      provider: "<script>fictional-provider</script>",
      limitations: "Fictional private phrase: only in private reports.",
    };
    app.import(project, "site-data", hostile);
    assert.equal(store.observations(audit).length, 0);
    for (const format of ["json", "html", "markdown"] as const) {
      const privateReport = exportReport(store, audit, format, "private"),
        shared = exportReport(store, audit, format, "shareable");
      assert.ok(privateReport.includes("only in private reports"));
      assert.ok(!shared.includes("only in private reports"));
      assert.ok(!shared.includes("fictional-provider"));
      if (format === "html")
        assert.ok(
          !privateReport.includes("<script>fictional-provider</script>"),
        );
      if (format === "markdown") {
        const suppliedLines = privateReport
          .split("\n")
          .filter((line) =>
            line.includes("<script>fictional-provider</script>"),
          );
        assert.ok(suppliedLines.length > 0);
        assert.ok(suppliedLines.every((line) => line.startsWith("    ")));
      }
    }
    const json = JSON.parse(exportReport(store, audit, "json", "private"));
    assert.equal(json.siteData.length, 5);
    assert.equal(json.siteData[0].rows[0].impressions, null);
    assert.equal(json.siteData[3].unavailableEvidence.length, 4);
    assert.deepEqual(
      JSON.parse(exportReport(store, audit, "json", "shareable")).siteData,
      [],
    );
  } finally {
    store.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
test("compiled imports, bounded row views and official MCP preserve project scope and manual provenance", async () => {
  const directory = mkdtempSync(join(tmpdir(), "site-data-adapter-")),
    store = new Store(directory),
    client = new Client({ name: "synthetic-site-data", version: "0.1.0" });
  try {
    const config = parseConfig({
        origins: [base.origin],
        seeds: [base.origin + "/"],
      }),
      project = store.createProject(config),
      other = store.createProject(config),
      audit = store.createAudit(project);
    const value = {
        ...samples[2],
        method: "API import",
        rows: Array.from({ length: 101 }, (_, index) => ({
          ...samples[2].rows[0],
          sampleId: `fictional-${index}`,
        })),
      },
      file = join(directory, "synthetic.json");
    writeFileSync(file, JSON.stringify(value));
    const args = [
      fileURLToPath(new URL("../dist/cli.js", import.meta.url)),
      "--data",
      directory,
    ];
    const imported = await promisify(execFile)(process.execPath, [
        ...args,
        "import",
        project,
        "site-data",
        file,
      ]),
      id = JSON.parse(imported.stdout).importId;
    const listed = await promisify(execFile)(process.execPath, [
      ...args,
      "site-data",
      audit,
    ]);
    assert.equal(JSON.parse(listed.stdout)[0].rowCount, 101);
    assert.equal(JSON.parse(listed.stdout)[0].rows, undefined);
    const rows = await promisify(execFile)(process.execPath, [
      ...args,
      "site-data",
      audit,
      id,
      "--offset",
      "100",
    ]);
    assert.equal(JSON.parse(rows.stdout).rows.length, 1);
    assert.equal(JSON.parse(rows.stdout).metadata.method, "manual import");
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
        view: "site-data",
        importId: id,
        offset: 99,
        limit: 1,
      },
    });
    assert.notEqual(result.isError, true);
    assert.equal(
      JSON.parse(result.content[0].text).rows[0].sampleId,
      "fictional-99",
    );
    const foreign = importData(store, other, "site-data", samples[2]);
    const refused: any = await client.callTool({
      name: "audit_results",
      arguments: { auditId: audit, view: "site-data", importId: foreign },
    });
    assert.equal(refused.isError, true);
    assert.equal(JSON.parse(refused.content[0].text).error, "import-not-found");
    assert.equal(store.observations(audit).length, 0);
  } finally {
    await client.close();
    store.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
test(
  "browser uploads site data, displays limits and reads paginated records without executing supplied text",
  { skip: process.env.WORKBENCH_BROWSER_TESTS !== "1" },
  async () => {
    const { chromium } = await import("playwright"),
      directory = mkdtempSync(join(tmpdir(), "site-data-ui-")),
      store = new Store(directory);
    const project = store.createProject(
        parseConfig({ origins: [base.origin], seeds: [base.origin + "/"] }),
      ),
      audit = store.createAudit(project);
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
      const value = {
        ...samples[2],
        provider: "<script>globalThis.fictionalInjected=true</script>",
        rows: Array.from({ length: 101 }, (_, index) => ({
          ...samples[2].rows[0],
          sampleId: `fictional-${index}`,
        })),
      };
      await page.getByLabel("Import type").selectOption("site-data");
      await page.getByLabel("Choose a data file (JSON)").setInputFiles({
        name: "synthetic-site-data.json",
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify(value)),
      });
      await page
        .getByRole("button", { name: "Import into this project", exact: true })
        .click();
      await page
        .getByRole("heading", {
          name: `${value.provider}: imported site data`,
          exact: true,
        })
        .waitFor();
      await page
        .getByRole("button", { name: "Read supplied records", exact: true })
        .click();
      await page
        .getByText("Showing records 1 to 100 of 101.", { exact: false })
        .waitFor();
      await page
        .getByRole("button", { name: "Next supplied records", exact: true })
        .click();
      await page
        .getByText("Showing records 101 to 101 of 101.", { exact: false })
        .waitFor();
      const id = store.importRecords(project, "site-data")[0].id;
      assert.equal(
        (
          await fetch(
            server.origin +
              `/api/view?audit=${audit}&view=site-data&importId=${id}`,
          )
        ).status,
        403,
      );
      assert.equal(store.observations(audit).length, 0);
      assert.equal(
        await page.evaluate(() =>
          Object.hasOwn(globalThis, "fictionalInjected"),
        ),
        false,
      );
      assert.equal(await page.locator("h3 script").count(), 0);
      assert.equal(await page.getByLabel("Import type").isDisabled(), false);
      assert.deepEqual(errors, []);
    } finally {
      await browser.close();
      await server.close();
      store.close();
      rmSync(directory, { recursive: true, force: true });
    }
  },
);

test("the four shipped site-data examples satisfy the public schema and contain fictional records", () => {
  for (const name of [
    "bing-search-import",
    "analytics-import",
    "access-log-import",
    "crawl-import",
  ]) {
    const data = SiteDataImport.parse(
      JSON.parse(
        readFileSync(
          new URL(`../examples/${name}.json`, import.meta.url),
          "utf8",
        ),
      ),
    );
    assert.equal(data.complete, false);
    assert.match(data.rows[0].evidenceNotes, /fictional/i);
  }
});

import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { Store } from "../src/store.ts";
import { Workbench } from "../src/app.ts";
import { parseConfig } from "../src/domain.ts";
import { ExternalResearchImport, importData } from "../src/imports.ts";
import { exportReport } from "../src/reports.ts";

const basis = {
  schemaVersion: 1,
  provider: "Synthetic research supplier",
  method: "manual import",
  url: "https://www.example.com/",
  collectedAt: "2026-10-11T00:00:00Z",
  market: "Synthetic market",
  language: "en",
  device: "desktop",
  methodology: "One fictional provider sample for a local regression check.",
  limitations:
    "This fictional sample does not represent all searches or backlinks.",
};
const keyword = {
  ...basis,
  dataset: "keywords",
  periodStart: "2026-09-01",
  periodEnd: "2026-09-30",
  volumeUnit: "estimated searches per month",
  rows: [
    {
      sampleId: "keyword-1",
      keyword: "synthetic topic",
      targetPage: null,
      estimatedVolume: null,
      evidenceNotes: "No estimate was supplied.",
    },
  ],
};
const serp = {
  ...basis,
  dataset: "serp",
  searchEngine: "Synthetic search engine",
  rows: [
    {
      sampleId: "serp-1",
      keyword: "synthetic topic",
      targetPage: "https://www.example.com/guide",
      observedAt: basis.collectedAt,
      observedUrl: "https://other.example/result",
      position: 2,
      resultType: "organic",
      evidenceNotes: "One recorded result in this synthetic sample.",
    },
  ],
};
const backlinks = {
  ...basis,
  dataset: "backlinks",
  rows: [
    {
      sampleId: "link-1",
      targetPage: "https://www.example.com/guide",
      sourcePage: "https://other.example/source",
      observedAt: basis.collectedAt,
      anchorText: "<script>synthetic text</script>",
      relationship: ["nofollow"],
      status: "observed",
      evidenceNotes: "One fictional incoming link; its source is not fetched.",
    },
  ],
};

test("the shipped keyword example satisfies the public import contract", () => {
  const value = JSON.parse(
    readFileSync(
      new URL("../examples/keyword-import.json", import.meta.url),
      "utf8",
    ),
  );
  assert.equal(ExternalResearchImport.parse(value).dataset, "keywords");
});

test("research imports preserve unknown estimates, sample provenance, external references and private-only reports without changing findings", () => {
  const root = mkdtempSync(join(tmpdir(), "seo-workbench-research-")),
    store = new Store(root);
  try {
    const project = store.createProject(
        parseConfig({ seeds: [basis.url], origins: [basis.url] }),
      ),
      audit = store.createAudit(project),
      app = new Workbench(store);
    for (const data of [keyword, serp, backlinks])
      assert.ok(importData(store, project, "external-research", data));
    const records: any = app.view(audit, "external-research");
    assert.deepEqual(records, [keyword, serp, backlinks]);
    assert.equal(records[0].rows[0].estimatedVolume, null);
    assert.equal(
      (
        app.view(audit, "external-research", { offset: 1, limit: 1 }) as any[]
      )[0].dataset,
      "serp",
    );
    assert.equal(store.results(audit).length, 0);
    assert.equal(store.observations(audit).length, 0);
    for (const format of ["json", "markdown", "html"] as const) {
      const privateReport = exportReport(store, audit, format);
      assert.ok(privateReport.includes("Synthetic research supplier"));
      const shared = exportReport(store, audit, format, "shareable");
      assert.ok(!shared.includes("Synthetic research supplier"));
      assert.ok(!shared.includes("synthetic topic"));
      assert.ok(!shared.includes("other.example"));
    }
    assert.ok(
      exportReport(store, audit, "html").includes(
        "&lt;script&gt;synthetic text&lt;/script&gt;",
      ),
    );
  } finally {
    store.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("invalid, ambiguous and out-of-project research inputs are rejected atomically", () => {
  const root = mkdtempSync(join(tmpdir(), "seo-workbench-research-invalid-")),
    store = new Store(root);
  try {
    const project = store.createProject(
      parseConfig({ seeds: [basis.url], origins: [basis.url] }),
    );
    const invalid = [
      { ...keyword, periodEnd: "2026-08-01" },
      { ...keyword, methodology: "" },
      { ...keyword, rows: [{ ...keyword.rows[0], estimatedVolume: -1 }] },
      { ...keyword, rows: [...keyword.rows, ...keyword.rows] },
      { ...keyword, rows: [] },
      { ...keyword, globalDemand: 100 },
      { ...serp, rows: [{ ...serp.rows[0], observedUrl: null }] },
      { ...serp, rows: [{ ...serp.rows[0], position: 1.5 }] },
      {
        ...backlinks,
        rows: [{ ...backlinks.rows[0], sourcePage: "file:///path/to/private" }],
      },
      {
        ...backlinks,
        rows: [
          {
            ...backlinks.rows[0],
            sourcePage: "https://name:secret@shop.example/",
          },
        ],
      },
      { ...keyword, url: "https://www.example.com/page" },
    ];
    for (const data of invalid)
      assert.throws(() =>
        importData(store, project, "external-research", data),
      );
    for (const data of [
      { ...keyword, url: "https://outside.example/" },
      {
        ...backlinks,
        rows: [
          { ...backlinks.rows[0], targetPage: "https://outside.example/" },
        ],
      },
    ])
      assert.throws(
        () => importData(store, project, "external-research", data),
        /import-project-scope/,
      );
    assert.throws(() =>
      importData(store, project, "unsupported" as any, keyword),
    );
    assert.deepEqual(store.imports(project, "external-research"), []);
    assert.ok(
      ExternalResearchImport.parse({
        ...serp,
        rows: [{ ...serp.rows[0], observedUrl: null, position: null }],
      }),
    );
    assert.throws(() =>
      ExternalResearchImport.parse({
        ...keyword,
        rows: [{ ...keyword.rows[0], estimatedVolume: Infinity }],
      }),
    );
  } finally {
    store.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("actual CLI imports supplier research without granting network or filesystem access through models", () => {
  const root = mkdtempSync(join(tmpdir(), "seo-workbench-research-cli-")),
    dataDirectory = join(root, "data"),
    input = join(root, "synthetic.json"),
    store = new Store(dataDirectory);
  try {
    const project = store.createProject(
      parseConfig({ seeds: [basis.url], origins: [basis.url] }),
    );
    writeFileSync(input, JSON.stringify(keyword), { mode: 0o600 });
    const result = JSON.parse(
      execFileSync(
        process.execPath,
        [
          "src/cli.ts",
          "import",
          project,
          "external-research",
          input,
          "--data",
          dataDirectory,
        ],
        { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
      ),
    );
    assert.match(result.importId, /^[a-f0-9-]{36}$/);
    assert.deepEqual(store.imports(project, "external-research"), [keyword]);
  } finally {
    store.close();
    rmSync(root, { recursive: true, force: true });
  }
});

import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Store } from "../src/store.ts";
import { Crawler } from "../src/crawler.ts";
import { NetworkPolicy } from "../src/network.ts";
import { fixtureSite } from "../src/fixtures.ts";
import { parseConfig } from "../src/domain.ts";
import { searchControls, controlDefinitions } from "../src/search-controls.ts";
import { importData, VisibilityImport } from "../src/imports.ts";
import { reportData } from "../src/reports.ts";
test("search and training controls are independent observations and never publisher restriction defects", async () => {
  const directory = mkdtempSync(join(tmpdir(), "seo-workbench-controls-")),
    store = new Store(directory),
    fixture = await fixtureSite({
      routes: {
        "/robots.txt": {
          status: 200,
          body: "User-agent: GPTBot\nDisallow: /\nUser-agent: OAI-SearchBot\nAllow: /\nUser-agent: Google-Extended\nDisallow: /\nUser-agent: *\nAllow: /",
        },
        "/": {
          status: 200,
          body: '<html lang="en"><title>Synthetic publisher</title><meta name="robots" content="nosnippet"><meta name="bingbot" content="nocache"><main><span data-nosnippet>Original details</span></main></html>',
        },
      },
    });
  try {
    const config = parseConfig({
        ...fixture.config,
        seeds: [fixture.origin + "/"],
        inventory: [],
        sitemaps: [],
        contracts: [],
      }),
      id = store.createAudit(store.createProject(config));
    await new Crawler(
      store,
      new NetworkPolicy({ localOrigins: [fixture.origin] }),
    ).run(id);
    const [view] = searchControls(store.observations(id));
    assert.equal(
      view.publisherControls.find((c) => c.token === "GPTBot")?.permission,
      "disallowed-by-observed-policy",
    );
    assert.equal(
      view.publisherControls.find((c) => c.token === "OAI-SearchBot")
        ?.permission,
      "allowed-by-observed-policy",
    );
    assert.ok(
      view.publisherControls
        .find((c) => c.token === "ChatGPT-User")
        ?.interpretation.includes("may not follow"),
    );
    assert.deepEqual(view.metaDirectives?.bingbot, ["nocache"]);
    assert.equal(view.snippetMarkup?.dataNosnippetElements, 1);
    assert.ok(view.outcome.startsWith("informational"));
    assert.equal(
      store.results(id, { limit: 1000 }).filter((r) => r.outcome === "fail")
        .length,
      0,
    );
    const sources = JSON.parse(
      readFileSync(new URL("../data/sources.json", import.meta.url), "utf8"),
    ).sources;
    for (const d of controlDefinitions)
      assert.ok(
        sources.some(
          (s: any) =>
            s.id === d.sourceId && !s.reviewStatus.startsWith("unverified"),
        ),
      );
  } finally {
    store.close();
    await fixture.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
test("visibility samples require actual provenance, distinguish citations from referrals and stay private", () => {
  const directory = mkdtempSync(join(tmpdir(), "seo-workbench-visibility-")),
    store = new Store(directory);
  const data = {
    schemaVersion: 1,
    provider: "Synthetic answer provider",
    method: "manual import",
    methodology: "One manually reviewed synthetic prompt in a declared market",
    limitations: "This one sample does not describe global visibility",
    rows: [
      {
        sampleId: "synthetic-sample-1",
        page: "https://www.example.com/",
        observedAt: "2026-10-11T00:00:00Z",
        market: "United Kingdom",
        language: "en",
        kind: "citation-not-observed-in-sample",
        prompt: "What explains the synthetic topic?",
        reference: null,
        referrals: null,
        evidenceNotes: "Synthetic bounded sample only",
      },
    ],
  };
  try {
    const config = parseConfig({
        seeds: ["https://www.example.com/"],
        origins: ["https://www.example.com/"],
      }),
      project = store.createProject(config),
      id = store.createAudit(project);
    importData(store, project, "search-visibility", data);
    assert.equal(reportData(store, id, "private").searchVisibility.length, 1);
    assert.equal(reportData(store, id, "shareable").searchVisibility.length, 0);
    assert.throws(() =>
      VisibilityImport.parse({
        ...data,
        rows: [{ ...data.rows[0], referrals: 20 }],
      }),
    );
    assert.throws(() =>
      VisibilityImport.parse({
        ...data,
        rows: [{ ...data.rows[0], prompt: null }],
      }),
    );
    assert.throws(() =>
      importData(store, project, "search-visibility", {
        ...data,
        rows: [...data.rows, ...data.rows],
      }),
    );
    assert.throws(() =>
      importData(store, project, "search-visibility", {
        ...data,
        rows: [{ ...data.rows[0], page: "https://other.example/" }],
      }),
    );
    assert.throws(() =>
      VisibilityImport.parse({ ...data, globalVisibilityScore: 100 }),
    );
  } finally {
    store.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

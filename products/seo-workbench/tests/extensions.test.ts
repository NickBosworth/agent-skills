import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { analyze, type RuleContext } from "../src/rules.ts";
import { parseConfig, type Observation } from "../src/domain.ts";
import { extract } from "../src/extract.ts";
import { supportNavigation } from "../examples/trusted-rule.ts";
import { Store } from "../src/store.ts";
import { Crawler } from "../src/crawler.ts";
import { NetworkPolicy } from "../src/network.ts";
import { fixtureSite } from "../src/fixtures.ts";
import { exportReport } from "../src/reports.ts";

function context(html: string): RuleContext {
  const url = "https://www.example.com/",
    body =
      '<html lang="en"><title>Synthetic guide</title><main>' +
      html +
      "</main></html>",
    timestamp = "2026-01-01T00:00:00.000Z";
  const response = {
    url,
    status: 200,
    headers: { "content-type": "text/html" },
    body,
    requestedAt: timestamp,
    durationMs: 1,
    bytes: Buffer.byteLength(body),
    address: "192.0.2.1",
  };
  const page: Observation = {
    id: randomUUID(),
    url,
    originalUrl: url,
    finalUrl: url,
    attempts: [response],
    response,
    facts: extract(body, url),
    render: null,
    error: null,
    timestamp,
  };
  return {
    config: parseConfig({ seeds: [url], origins: [url] }),
    observations: [page],
    sitemapUrls: new Set(),
    inventoryUrls: new Set(),
  };
}
const custom = (c: RuleContext, extension = supportNavigation) =>
  analyze(c, [extension]).find((r) => r.ruleId === extension.definition.id)!;

test("the executable owner-rule example distinguishes a defect, valid counterexample and missing prerequisite evidence", () => {
  const bad = context("<p>Synthetic guide.</p>"),
    good = context('<nav><a href="/help">Get help</a></nav>');
  assert.equal(custom(bad).outcome, "fail");
  assert.equal(custom(good).outcome, "pass");
  assert.equal(
    custom(good).interpretationConfidence,
    "deterministic within stated prerequisites",
  );
  const missing = context("Synthetic page.");
  missing.observations[0].response = null;
  missing.observations[0].facts = null;
  assert.equal(custom(missing).outcome, "not-tested");
  assert.match(custom(missing).interpretationConfidence, /^unavailable/);
  const rendered = context('<nav><a href="/help">Get help</a></nav>');
  rendered.observations[0].render = {
    status: "observed",
    facts: rendered.observations[0].facts,
    dom: "Synthetic rendered fixture.",
    runtime: "synthetic-browser",
    elapsedMs: 1,
    failures: [],
  };
  assert.equal(
    custom(rendered).observationConfidence,
    "direct HTTP and browser observations",
  );
  assert.equal(
    custom(missing, {
      ...supportNavigation,
      definition: { ...supportNavigation.definition, prerequisite: "response" },
      evaluate: () => ({
        outcome: "pass",
        observed: true,
        expected: true,
        reason: "Synthetic response check.",
      }),
    }).outcome,
    "not-tested",
  );
  const blocked = context("Synthetic page.");
  blocked.config = parseConfig({ ...blocked.config, render: "all" });
  assert.equal(custom(blocked).outcome, "not-tested");
  const result = custom(good);
  assert.equal(result.ruleVersion, "1.0.0");
  assert.deepEqual(result.evidenceIds, [good.observations[0].id]);
  assert.match(result.id, /^[a-f0-9]{24}$/);
  assert.equal(result.causeConfidence, "unknown");
});

test("duplicate, built-in and malformed definitions are refused before extension execution", () => {
  const c = context("Synthetic guide.");
  let calls = 0;
  const extension = {
    ...supportNavigation,
    evaluate: () => {
      calls++;
      return {
        outcome: "pass",
        observed: true,
        expected: true,
        reason: "Synthetic valid observation.",
      } as any;
    },
  };
  assert.throws(
    () => analyze(c, [extension, extension]),
    /rule-extension-id-conflict/,
  );
  assert.throws(
    () =>
      analyze(c, [
        {
          ...extension,
          definition: { ...extension.definition, id: "http-status" },
        },
      ]),
    /rule-extension-id-conflict/,
  );
  for (const definition of [
    { ...extension.definition, prerequisite: "unknown" },
    { ...extension.definition, version: "" },
    { ...extension.definition, extra: "unknown" },
  ])
    assert.throws(
      () => analyze(c, [{ ...extension, definition } as any]),
      /rule-extension-invalid/,
    );
  assert.throws(
    () =>
      analyze(
        c,
        Array.from({ length: 101 }, () => extension),
      ),
    /rule-extension-invalid/,
  );
  assert.equal(calls, 0);
});

test("malformed evaluator output and private exceptions become bounded explicit errors without identity overrides", () => {
  const c = context("Synthetic guide.");
  for (const output of [
    {
      outcome: "pass",
      observed: 1n,
      expected: true,
      reason: "Synthetic unsupported JSON value.",
    },
    {
      outcome: "pass",
      observed: "x".repeat(5000001),
      expected: true,
      reason: "Synthetic oversized evaluation.",
    },
    {
      outcome: "healthy",
      observed: true,
      expected: true,
      reason: "Synthetic invalid outcome.",
    },
    {
      outcome: "pass",
      observed: null,
      expected: true,
      reason: "Synthetic missing observation.",
    },
    { outcome: "pass", reason: "Synthetic missing fields." },
    {
      outcome: "pass",
      observed: true,
      expected: true,
      reason: "Synthetic invalid count.",
      denominator: Infinity,
    },
    {
      outcome: "pass",
      observed: true,
      expected: true,
      reason: "Synthetic override.",
      ruleId: "http-status",
    },
    {
      outcome: "pass",
      observed: true,
      expected: true,
      reason: "x".repeat(10001),
    },
  ]) {
    const result = custom(c, {
      ...supportNavigation,
      evaluate: (() => output) as any,
    });
    assert.equal(result.outcome, "error");
    assert.match(result.interpretationConfidence, /^unavailable/);
    assert.equal(result.ruleId, supportNavigation.definition.id);
    assert.equal(result.observed, null);
    assert.equal(result.reason, "The check could not be completed.");
  }
  const thrown = custom(c, {
    ...supportNavigation,
    evaluate: () => {
      throw new Error("Synthetic private diagnostic");
    },
  });
  assert.equal(thrown.outcome, "error");
  assert.ok(!JSON.stringify(thrown).includes("Synthetic private diagnostic"));
});

test("an actual collected site supports an appended versioned extension analysis and private handoff without rewriting history", async () => {
  const root = mkdtempSync(join(tmpdir(), "seo-workbench-extension-")),
    store = new Store(root),
    fixture = await fixtureSite();
  try {
    const id = store.createAudit(store.createProject(fixture.config));
    await new Crawler(
      store,
      new NetworkPolicy({ localOrigins: [fixture.origin] }),
    ).run(id);
    const original = store.latestAnalysis(id),
      before = store.results(id, { limit: 10000 });
    const basis = {
      config: store.audit(id).config,
      observations: store.analysisObservations(id),
      sitemapUrls: new Set<string>(),
      inventoryUrls: new Set<string>(),
    };
    const first = analyze(basis, [supportNavigation]);
    const firstId = store.saveAnalysis(id, "owner-rules-1", first);
    const second = analyze(basis, [
      {
        ...supportNavigation,
        definition: { ...supportNavigation.definition, version: "2.0.0" },
      },
    ]);
    const secondId = store.saveAnalysis(id, "owner-rules-2", second);
    assert.notEqual(firstId, secondId);
    assert.deepEqual(
      store.results(id, { analysis: original!, limit: 10000 }),
      before,
    );
    assert.deepEqual(
      store
        .results(id, { analysis: firstId, limit: 10000 })
        .sort((a, b) => a.id.localeCompare(b.id)),
      [...first].sort((a, b) => a.id.localeCompare(b.id)),
    );
    const old = first.find(
        (r) => r.ruleId === supportNavigation.definition.id,
      )!,
      latest = second.find(
        (r) => r.ruleId === supportNavigation.definition.id,
      )!;
    assert.equal(old.id, latest.id);
    assert.equal(old.ruleVersion, "1.0.0");
    assert.equal(latest.ruleVersion, "2.0.0");
    const report = JSON.parse(exportReport(store, id, "json"));
    assert.equal(report.analysisId, secondId);
    assert.ok(
      report.results.some(
        (r: any) =>
          r.ruleId === supportNavigation.definition.id && r.outcome === "fail",
      ),
    );
  } finally {
    store.close();
    await fixture.close();
    rmSync(root, { recursive: true, force: true });
  }
});

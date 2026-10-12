import test from "node:test";
import assert from "node:assert/strict";
import { parseConfig } from "../src/domain.ts";
import { performanceReview } from "../src/performance.ts";
import { importData, parsePerformance } from "../src/imports.ts";
import { Store } from "../src/store.ts";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const config = parseConfig({
  seeds: ["https://www.example.com/"],
  origins: ["https://www.example.com/"],
  performanceBudgets: {
    version: "owner-policy-1",
    field: { lcpMs: 2500, inpMs: 200, cls: 0.1 },
    lab: { tbtMs: 300 },
  },
});
const field = {
  schemaVersion: 1,
  provider: "CrUX",
  method: "manual import",
  scope: "origin",
  url: "https://www.example.com/",
  device: "mobile",
  toolVersion: "CrUX API",
  timestamp: "2026-10-11T00:00:00Z",
  collectionStart: "2026-09-01",
  collectionEnd: "2026-09-28",
  metrics: { lcpMs: 2800, cls: 0.08, inpMs: null, tbtMs: null },
  percentile: 75,
  sampling: "Synthetic p75 field sample",
};
test("new measurements reject inconsistent periods and origin paths while old evidence remains inspectable", () => {
  const directory = mkdtempSync(join(tmpdir(), "seo-workbench-measurement-")),
    store = new Store(directory);
  try {
    const project = store.createProject(config);
    for (const invalid of [
      { ...field, collectionStart: "2026-10-01" },
      { ...field, url: "https://www.example.com/page" },
      { ...field, url: "https://www.example.com/?sample=1" },
      { ...field, url: "https://www.example.com/#sample" },
      {
        ...field,
        provider: "Lighthouse",
        scope: "url",
        collectionEnd: null,
        percentile: null,
      },
    ]) {
      assert.throws(
        () => parsePerformance(invalid),
        /performance-provenance-invalid/,
      );
      assert.throws(
        () => importData(store, project, "performance", invalid),
        /performance-provenance-invalid/,
      );
      const saved = store.addImport(project, "performance", invalid);
      assert.ok(saved);
      const [review] = performanceReview([invalid], config);
      assert.deepEqual(review.measurement, invalid);
      assert.ok(review.provenanceIssues.length);
      assert.ok(
        review.metrics.every(
          (metric) => metric.outcome === "invalid-provenance",
        ),
      );
    }
    assert.deepEqual(parsePerformance(field), field);
    assert.ok(importData(store, project, "performance", field));
    assert.deepEqual(
      performanceReview([field], config)[0].provenanceIssues,
      [],
    );
  } finally {
    store.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
test("approved performance budgets keep absent field data and origin scope explicit", () => {
  const [review] = performanceReview([field], config);
  assert.equal(review.measurement.scope, "origin");
  assert.equal(review.kind, "field");
  assert.equal(review.budgetVersion, "owner-policy-1");
  assert.equal(
    review.metrics.find((m) => m.name === "lcpMs")?.outcome,
    "above-approved-budget",
  );
  assert.equal(
    review.metrics.find((m) => m.name === "cls")?.outcome,
    "within-approved-budget",
  );
  assert.equal(
    review.metrics.find((m) => m.name === "inpMs")?.outcome,
    "unavailable",
  );
  const unapproved = performanceReview(
    [field],
    parseConfig({ ...config, performanceBudgets: undefined }),
  )[0];
  assert.equal(
    unapproved.metrics.find((m) => m.name === "lcpMs")?.outcome,
    "no-approved-budget",
  );
});
test("lab data and policy cannot fabricate field INP or accept unsafe thresholds", () => {
  assert.throws(() =>
    parseConfig({
      ...config,
      performanceBudgets: { version: "1", lab: { inpMs: 100 } },
    }),
  );
  assert.throws(() =>
    parseConfig({
      ...config,
      performanceBudgets: { version: "1", field: { lcpMs: -1 } },
    }),
  );
  assert.throws(() =>
    performanceReview(
      [
        {
          ...field,
          provider: "Lighthouse",
          metrics: { ...field.metrics, inpMs: 10 },
        },
      ],
      config,
    ),
  );
  const [review] = performanceReview(
    [
      {
        ...field,
        provider: "Lighthouse",
        scope: "url",
        collectionStart: null,
        collectionEnd: null,
        percentile: null,
        metrics: { lcpMs: 2400, cls: 0.1, inpMs: null, tbtMs: 350 },
      },
    ],
    config,
  );
  assert.equal(review.kind, "lab");
  assert.equal(
    review.metrics.find((m) => m.name === "tbtMs")?.outcome,
    "above-approved-budget",
  );
});

test("measurement comparisons preserve imports outside the current audit scope without assigning a speed result", () => {
  const section = parseConfig({
    ...config,
    include: ["/guides"],
    exclude: ["/guides/private"],
  });
  for (const url of [
    "https://other.example.com/",
    "https://www.example.com/shop",
    "https://www.example.com/guides/private/page",
  ]) {
    const input = { ...field, scope: "url", url };
    const review = performanceReview([input], section)[0];
    assert.deepEqual(review.measurement, input);
    assert.equal(review.auditScope.withinScope, false);
    assert.ok(review.metrics.every((m) => m.outcome === "outside-audit-scope"));
  }
  assert.equal(
    performanceReview([field], section)[0].auditScope.withinScope,
    true,
  );
  const relevant = performanceReview(
    [{ ...field, scope: "url", url: "https://www.example.com/guides/page" }],
    section,
  )[0];
  assert.equal(relevant.auditScope.withinScope, true);
  assert.equal(
    relevant.metrics.find((m) => m.name === "lcpMs")!.outcome,
    "above-approved-budget",
  );
});

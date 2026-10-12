import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Store } from "../src/store.ts";
import { Crawler } from "../src/crawler.ts";
import { NetworkPolicy } from "../src/network.ts";
import { fixtureSite } from "../src/fixtures.ts";
import { demandOpportunities, reviewContent } from "../src/content.ts";
import { reportData } from "../src/reports.ts";
const source = {
  schemaVersion: 1,
  provider: "Google Search Console",
  method: "API import",
  startDate: "2026-09-01",
  endDate: "2026-09-30",
  searchType: "web",
  aggregation: "byPage",
  complete: false,
  limitations: "Synthetic truncated query sample",
  rows: [],
};
test("query opportunities retain dimensions/windows and never infer harmful overlap or market volume", () => {
  const config = {
    seeds: ["https://www.example.com/"],
    origins: ["https://www.example.com/"],
  };
  // Use the public configuration parser rather than weakening the runtime contract.
  return import("../src/domain.ts").then(({ parseConfig }) => {
    const row = {
      page: "https://www.example.com/a",
      query: "synthetic question",
      country: "gbr",
      device: "MOBILE",
      clicks: 1,
      impressions: 10,
      position: 4,
    };
    const results = demandOpportunities([], parseConfig(config), [
      {
        ...source,
        rows: [
          row,
          { ...row, page: "https://www.example.com/b" },
          { ...row, device: "DESKTOP" },
          { ...row, page: "https://www.example.com/c", query: "" },
        ],
      },
    ]);
    assert.equal(results.length, 2);
    assert.equal(results[0].destinations.length, 2);
    assert.equal(results[0].metrics.estimatedSearchVolume, null);
    assert.equal(results[0].metrics.impressions, 20);
    assert.equal(results[0].provenance.method, "API import");
    assert.equal(results[0].review, "collect missing destination evidence");
    assert.ok(
      results[0].limitations.some((l) =>
        l.includes("does not establish that they compete harmfully"),
      ),
    );
    assert.equal(results[0].window.end, "2026-09-30");
  });
});
test("owner content decisions append verified evidence, remain private and are removed with the selected audit", async () => {
  const directory = mkdtempSync(join(tmpdir(), "seo-workbench-content-")),
    store = new Store(directory),
    fixture = await fixtureSite();
  try {
    const project = store.createProject(fixture.config),
      id = store.createAudit(project);
    await new Crawler(
      store,
      new NetworkPolicy({ localOrigins: [fixture.origin] }),
    ).run(id);
    const o = store.observation(id, fixture.origin + "/product")!;
    const value = {
      auditId: id,
      url: o.url,
      evidenceIds: [o.id],
      decision: "improve-existing",
      rationale: "Clarify the synthetic product warranty for users.",
      ownerRole: "content editor",
      intent: "Understand product warranty",
      audience: "Prospective users",
      originalContribution: "Explain original warranty terms",
      successMeasures: "User comprehension reviewed by the owner",
    };
    const previous = store.latestAnalysis(id);
    reviewContent(store, value);
    reviewContent(store, { ...value, decision: "reject" });
    assert.equal(store.imports(project, "content-review").length, 2);
    assert.equal(store.latestAnalysis(id), previous);
    assert.throws(() =>
      reviewContent(store, {
        ...value,
        evidenceIds: ["00000000-0000-4000-8000-000000000001"],
      }),
    );
    assert.equal(reportData(store, id, "private").contentReviews.length, 2);
    assert.equal(reportData(store, id, "shareable").contentReviews.length, 0);
    assert.equal(
      (reportData(store, id, "shareable").coverage as any).breakdowns,
      undefined,
    );
    store.deleteAudit(id);
    assert.equal(store.imports(project, "content-review").length, 0);
  } finally {
    store.close();
    await fixture.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test("complete owner briefs require a distinct unmet need, saved existing evidence, bounded sources and scoped internal links", async () => {
  const { parseConfig } = await import("../src/domain.ts"),
    { Workbench } = await import("../src/app.ts"),
    directory = mkdtempSync(join(tmpdir(), "seo-workbench-editorial-")),
    store = new Store(directory),
    fixture = await fixtureSite({ fixed: true });
  try {
    const config = parseConfig({ ...fixture.config, render: "none" }),
      project = store.createProject(config),
      audit = store.createAudit(project),
      app = new Workbench(
        store,
        new NetworkPolicy({ localOrigins: [fixture.origin] }),
      );
    await app.crawler.run(audit);
    const page = store.observation(audit, fixture.origin + "/product")!,
      previous = store.latestAnalysis(audit),
      original = JSON.stringify(page),
      base = {
        auditId: audit,
        url: page.url,
        evidenceIds: [page.id],
        decision: "create-distinct",
        rationale:
          "A different reader task needs a separately reviewed worked guide.",
        ownerRole: "content editor",
        topic: "Synthetic setup",
        cluster: "Getting started",
        intent: "Complete a first setup",
        audience: "New users",
        originalContribution: "Original tested worked instructions",
        successMeasures: "Review user comprehension and task completion",
      },
      brief = {
        distinctUnmetNeed:
          "The reviewed overview explains warranty but does not explain the first setup task.",
        reviewedExistingPages: [page.url],
        factsAndSources: [
          {
            claim: "The synthetic product has an owner-defined setup sequence.",
            sourceURL: "https://www.example.com/editorial-source",
          },
        ],
        proposedStructure: ["Before you start", "Complete the setup"],
        terminology: ["setup"],
        internalLinks: [page.url],
        reviewRequirements: [
          "The product maintainer must verify every instruction before publication.",
        ],
        protectedConstraints:
          "Keep the existing product route, warranty and accessibility controls unchanged.",
      };
    assert.throws(
      () => reviewContent(store, base),
      /content-distinct-need-required/,
    );
    for (const changed of [
      { ...brief, distinctUnmetNeed: undefined },
      { ...brief, reviewedExistingPages: [fixture.origin + "/not-observed"] },
      { ...brief, internalLinks: ["https://outside.example.org/setup"] },
      { ...brief, factsAndSources: [] },
      { ...brief, proposedStructure: [] },
    ])
      assert.throws(() => reviewContent(store, { ...base, brief: changed }));
    assert.equal(store.db.isTransaction, false);
    assert.deepEqual(store.imports(project, "content-review"), []);
    reviewContent(store, { ...base, brief });
    const record = store.imports(project, "content-review")[0] as any;
    assert.equal(record.briefCompleteness, "complete-owner-draft");
    assert.deepEqual(record.reviewedExistingEvidence, [
      { url: page.url, evidenceId: page.id },
    ]);
    assert.match(record.sourceReview, /not fetched or independently verified/);
    let projected = (app.view(audit, "content") as any[]).find(
      (p) => p.url === page.url,
    );
    assert.equal(projected.topic, "Synthetic setup");
    assert.equal(projected.cluster, "Getting started");
    assert.equal(projected.intent, base.intent);
    assert.equal(projected.brief.draftState, "complete-owner-draft");
    assert.deepEqual(projected.brief.factsAndSources, brief.factsAndSources);
    const input = join(directory, "synthetic-editorial-review.json");
    writeFileSync(input, JSON.stringify({ ...base, brief }));
    const savedCLI = JSON.parse(
      execFileSync(
        process.execPath,
        ["src/cli.ts", "--data", directory, "review-content", input],
        { encoding: "utf8" },
      ),
    );
    assert.match(savedCLI.reviewId, /^[a-f0-9-]{36}$/);
    reviewContent(store, {
      ...base,
      decision: "improve-existing",
      topic: "Warranty explanation",
      cluster: "Product guidance",
    });
    projected = (app.view(audit, "content") as any[]).find(
      (p) => p.url === page.url,
    );
    assert.equal(projected.cluster, "Product guidance");
    assert.equal(projected.brief.draftState, "incomplete");
    assert.equal(JSON.stringify(store.observation(audit, page.url)), original);
    assert.equal(store.latestAnalysis(audit), previous);
    assert.equal(
      reportData(store, audit, "private").opportunities.find(
        (p) => p.url === page.url,
      )?.topic,
      "Warranty explanation",
    );
    assert.deepEqual(reportData(store, audit, "shareable").opportunities, []);
  } finally {
    store.close();
    await fixture.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test("older decisions remain explicitly incomplete and failed or nested editorial saves cannot leave orphan reviews", async () => {
  const directory = mkdtempSync(
      join(tmpdir(), "seo-workbench-editorial-fault-"),
    ),
    store = new Store(directory),
    fixture = await fixtureSite({ fixed: true });
  try {
    const project = store.createProject(fixture.config),
      audit = store.createAudit(project);
    await new Crawler(
      store,
      new NetworkPolicy({ localOrigins: [fixture.origin] }),
    ).run(audit);
    const page = store.observation(audit, fixture.origin + "/product")!,
      value = {
        auditId: audit,
        url: page.url,
        evidenceIds: [page.id],
        decision: "improve-existing",
        rationale: "The owner wants a clearer worked explanation.",
        ownerRole: "content editor",
        intent: "Understand the warranty",
        audience: "New users",
        originalContribution: "Original examples",
        successMeasures: "Owner checks comprehension",
      },
      original = store.addImport.bind(store);
    store.db.exec("BEGIN IMMEDIATE");
    assert.throws(
      () => reviewContent(store, value),
      /database-transaction-active/,
    );
    assert.equal(store.db.isTransaction, true);
    store.db.exec("ROLLBACK");
    store.addImport = () => {
      throw new Error("synthetic-editorial-save-failed");
    };
    assert.throws(
      () => reviewContent(store, value),
      /synthetic-editorial-save-failed/,
    );
    assert.equal(store.db.isTransaction, false);
    assert.deepEqual(store.imports(project, "content-review"), []);
    store.addImport = original;
    reviewContent(store, value);
    assert.equal(
      (store.imports(project, "content-review")[0] as any).briefCompleteness,
      "incomplete",
    );
    // A historical new-page proposal remains historical; it cannot acquire a complete draft retroactively.
    original(project, "content-review", {
      ...value,
      decision: "create-distinct",
      reviewedAt: "2026-10-01T00:00:00Z",
      status: "Historical owner proposal",
    });
    const { Workbench } = await import("../src/app.ts"),
      projected = (new Workbench(store).view(audit, "content") as any[]).find(
        (p) => p.url === page.url,
      );
    assert.equal(projected.decision, "create-distinct");
    assert.equal(projected.brief.draftState, "incomplete");
  } finally {
    store.close();
    await fixture.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

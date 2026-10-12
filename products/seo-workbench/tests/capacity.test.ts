import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { parseConfig } from "../src/domain.ts";
import { Store } from "../src/store.ts";
import { Crawler } from "../src/crawler.ts";
import { NetworkPolicy } from "../src/network.ts";
import { fixtureSite } from "../src/fixtures.ts";

const input = {
  seeds: ["https://www.example.com/"],
  origins: ["https://www.example.com/"],
};
test("new configurations use maximum allowances while saved partial configurations retain historical limits", () => {
  const config = parseConfig(input);
  assert.equal(config.maxPages, 100000);
  assert.equal(config.maxDiscoveries, 200000);
  assert.equal(config.maxRequests, 300000);
  assert.equal(config.maxDepth, 100000);
  assert.equal(config.maxSeconds, 86400);
  assert.equal(config.maxBytes, 10_000_000);
  assert.equal(config.maxMemoryBytes, 2147483648);
  assert.equal(config.maxStorageBytes, 1_000_000_000);
  assert.equal(config.maxDownloadBytes, 1_000_000_000);
  assert.equal(config.timeoutMs, 60000);
  assert.equal(config.renderTimeoutMs, 30000);
  assert.equal(config.retries, 3);
  assert.equal(config.delayMs, 500);
  assert.equal(config.render, "none");
  assert.deepEqual(config.viewport, { width: 1280, height: 800 });
  for (const field of [
    "maxPages",
    "maxDiscoveries",
    "maxRequests",
    "maxDepth",
    "maxSeconds",
    "maxBytes",
    "maxMemoryBytes",
    "maxStorageBytes",
    "maxDownloadBytes",
    "timeoutMs",
    "renderTimeoutMs",
    "retries",
  ] as const)
    assert.throws(() => parseConfig({ ...input, [field]: config[field] + 1 }));
  const directory = mkdtempSync(join(tmpdir(), "seo-workbench-saved-limits-")),
    store = new Store(directory);
  try {
    const project = store.createProject(config),
      raw = JSON.stringify(input);
    store.db
      .prepare("UPDATE projects SET config=? WHERE id=?")
      .run(raw, project);
    const saved = store.project(project);
    assert.equal(saved.maxPages, 250);
    assert.equal(saved.maxMemoryBytes, 536870912);
    assert.equal(saved.maxStorageBytes, 250_000_000);
    assert.equal(saved.maxDownloadBytes, 250_000_000);
    assert.equal(saved.maxDepth, 8);
    assert.equal(saved.timeoutMs, 15000);
    assert.equal(
      store.db.prepare("SELECT config FROM projects WHERE id=?").get(project)!
        .config,
      raw,
    );
  } finally {
    store.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test("the iterative crawl follows a real link chain beyond fifty levels without a depth exclusion", async () => {
  const count = 60,
    routes = Object.fromEntries(
      Array.from({ length: count }, (_, i) => [
        i ? "/level/" + i : "/",
        {
          status: 200,
          body: `<html lang="en"><title>Fictional page ${i}</title><main><h1>Fictional page ${i}</h1>${i + 1 < count ? `<a href="/level/${i + 1}">Next fictional page</a>` : "End of the fictional chain."}</main></html>`,
        },
      ]),
    );
  routes["/robots.txt"] = { status: 200, body: "User-agent: *\n" };
  const fixture = await fixtureSite({ routes }),
    directory = mkdtempSync(join(tmpdir(), "seo-workbench-depth-capacity-")),
    store = new Store(directory);
  try {
    const config = parseConfig({
      ...fixture.config,
      maxDepth: parseConfig(input).maxDepth,
      maxPages: count,
      inventory: [],
      sitemaps: [],
      contracts: [],
      profile: "general",
    });
    const id = store.createAudit(store.createProject(config));
    await new Crawler(
      store,
      new NetworkPolicy({ localOrigins: [fixture.origin] }),
    ).run(id);
    assert.equal(store.audit(id).state, "complete");
    assert.equal(
      (store.coverage(id).states as Record<string, number>).fetched,
      count,
    );
    assert.equal(
      store.db
        .prepare("SELECT depth FROM urls WHERE audit_id=? AND url=?")
        .get(id, fixture.origin + "/level/59")!.depth,
      59,
    );
    assert.equal(
      store.db
        .prepare(
          "SELECT COUNT(*) AS n FROM urls WHERE audit_id=? AND reason='depth-budget'",
        )
        .get(id)!.n,
      0,
    );
  } finally {
    store.close();
    await fixture.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test("discovery gaps survive stopped runs, pause/restart and legacy known stop reasons without inventing omitted counts", async () => {
  for (const pauseAtLimit of [false, true]) {
    const routes = {
        "/robots.txt": { status: 404, body: "" },
        "/seed": {
          status: 200,
          body: '<title>Original seed</title><main><a href="/a">A</a><a href="/b">B</a></main>',
        },
      },
      fixture = await fixtureSite({ routes }),
      directory = mkdtempSync(
        join(tmpdir(), "seo-workbench-discovery-recovery-"),
      ),
      store = new Store(directory);
    let reopened: Store | undefined;
    try {
      const config = parseConfig({
          seeds: [fixture.origin + "/seed"],
          origins: [fixture.origin],
          delayMs: 0,
          maxDiscoveries: 1,
          maxPages: 10,
          maxSeconds: 30,
        }),
        project = store.createProject(config),
        audit = store.createAudit(project),
        crawler = new Crawler(
          store,
          new NetworkPolicy({ localOrigins: [fixture.origin] }),
        ),
        event = store.event.bind(store);
      if (pauseAtLimit)
        store.event = (id, kind, detail) => {
          event(id, kind, detail);
          if (kind === "discovery-truncated") crawler.pause(id);
        };
      await crawler.run(audit);
      assert.equal(
        store.audit(audit).state,
        pauseAtLimit ? "paused" : "partial",
      );
      assert.equal(store.discoveryTruncated(audit), true);
      assert.equal(store.count(audit), 1);
      const firstRequests = store.audit(audit).requests;
      store.close();
      reopened = new Store(directory);
      reopened.resume(audit);
      assert.equal(reopened.audit(audit).reason, null);
      await new Crawler(
        reopened,
        new NetworkPolicy({ localOrigins: [fixture.origin] }),
      ).run(audit);
      assert.equal(reopened.audit(audit).state, "partial");
      assert.equal(reopened.audit(audit).reason, "discovery-budget");
      const coverage = reopened.coverage(audit);
      assert.equal(coverage.discoveryTruncated, true);
      assert.equal(coverage.omittedDiscoveryCount, null);
      assert.equal(coverage.completeDiscoveredQueue, false);
      // Resuming refreshes robots policy; it does not refetch the completed page.
      assert.equal(reopened.audit(audit).requests, firstRequests + 1);
      assert.equal(reopened.observations(audit).length, 1);
      assert.equal(
        reopened
          .events(audit)
          .filter((event: any) => event.kind === "discovery-truncated").length,
        1,
      );
      // An older explicit discovery stop can be preserved, without guessing an unrecorded pause cause.
      reopened.db
        .prepare(
          "DELETE FROM events WHERE audit_id=? AND kind='discovery-truncated'",
        )
        .run(audit);
      reopened.state(audit, "partial", "discovery-budget");
      reopened.resume(audit);
      assert.equal(reopened.discoveryTruncated(audit), true);
    } finally {
      reopened?.close();
      if (store.db.isOpen) store.close();
      await fixture.close();
      rmSync(directory, { recursive: true, force: true });
    }
  }
});

test("reaching the exact discovery allowance without omitting a candidate keeps coverage complete", async () => {
  const fixture = await fixtureSite({
    routes: {
      "/robots.txt": { status: 404, body: "" },
      "/seed": {
        status: 200,
        body: '<title>Original seed</title><main><a href="/a">A</a><a href="/b">B</a></main>',
      },
      "/a": {
        status: 200,
        body: '<title>Original A</title><main><a href="/seed">Seed</a></main>',
      },
      "/b": {
        status: 200,
        body: '<title>Original B</title><main><a href="/a">A</a></main>',
      },
    },
  });
  const root = mkdtempSync(join(tmpdir(), "seo-workbench-exact-discovery-")),
    store = new Store(root);
  try {
    const config = parseConfig({
      seeds: [fixture.origin + "/seed"],
      origins: [fixture.origin],
      delayMs: 0,
      maxDiscoveries: 3,
      maxPages: 3,
      maxSeconds: 30,
    });
    const audit = store.createAudit(store.createProject(config));
    await new Crawler(
      store,
      new NetworkPolicy({ localOrigins: [fixture.origin] }),
    ).run(audit);
    assert.equal(store.count(audit), 3);
    assert.equal(store.audit(audit).state, "complete");
    assert.equal(store.discoveryTruncated(audit), false);
    assert.equal(store.coverage(audit).completeDiscoveredQueue, true);
    assert.equal(store.observations(audit).length, 3);
  } finally {
    store.close();
    await fixture.close();
    rmSync(root, { recursive: true, force: true });
  }
});

import test from "node:test";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { fixtureSite } from "../src/fixtures.ts";
import { Store } from "../src/store.ts";
import { Workbench } from "../src/app.ts";
import { parseConfig, RULESET, scopeReason } from "../src/domain.ts";
import { NetworkPolicy } from "../src/network.ts";
import { rules } from "../src/rules.ts";
import {
  verificationPlan,
  savedVerificationPlan,
  verifyRun,
} from "../src/verification.ts";
import { exportReport } from "../src/reports.ts";

async function setup() {
  const routes = {
    "/robots.txt": {
      status: 200,
      headers: { "Content-Type": "text/plain" },
      body: "User-agent: *\nAllow: /",
    },
    "/": {
      status: 200,
      body: '<title>Home</title><main>Fictional home <a href="/a">A</a><a href="/peer">Peer</a><a href="/other">Other</a></main>',
    },
    "/a": {
      status: 200,
      body: '<title>Incorrect title</title><link rel="canonical" href="/destination"><main>Fictional page A <a href="/destination">Destination</a></main>',
    },
    "/peer": {
      status: 200,
      body: "<title>Correct title</title><main>Fictional template peer</main>",
    },
    "/other": {
      status: 200,
      body: "<title>Other</title><main>Unrelated fictional content</main>",
    },
    "/destination": {
      status: 404,
      body: "<title>Missing</title><main>Fictional missing destination</main>",
    },
  };
  const fixture = await fixtureSite({ routes }),
    root = mkdtempSync(join(tmpdir(), "seo-workbench-verification-")),
    store = new Store(root);
  const config = parseConfig({
    ...fixture.config,
    inventory: [],
    sitemaps: [],
    render: "none",
    contracts: [
      { pathPrefix: "/a", title: "Correct title", template: "shared" },
      { pathPrefix: "/peer", title: "Correct title", template: "shared" },
    ],
  });
  const project = store.createProject(config),
    before = store.createAudit(project),
    app = new Workbench(
      store,
      new NetworkPolicy({ localOrigins: [fixture.origin] }),
    );
  await app.crawler.run(before);
  const group = (rule: string) =>
    (app.view(before, "groups") as any[]).find(
      (g) => g.ruleId === rule && g.affected.includes(fixture.origin + "/a"),
    );
  return {
    routes,
    fixture,
    root,
    store,
    config,
    project,
    before,
    app,
    group,
    async close() {
      store.close();
      await fixture.close();
      rmSync(root, { recursive: true, force: true });
    },
  };
}

test("a real targeted crawl refreshes affected, inbound and template pages, retains no old captures, and keeps inventory checks unknown", async () => {
  const s = await setup();
  try {
    const plan = verificationPlan(s.store, {
      auditId: s.before,
      groupId: s.group("title-review").id,
    });
    assert.equal(plan.mode, "targeted");
    assert.deepEqual(plan.config.recheckUrls, [
      s.fixture.origin + "/",
      s.fixture.origin + "/a",
      s.fixture.origin + "/peer",
    ]);
    assert.equal(plan.olderEvidence.count, 2);
    assert.ok(
      plan.dependencies
        .find((d) => d.url.endsWith("/peer"))
        ?.reasons.includes("shared declared template"),
    );
    s.routes["/a"].body = s.routes["/a"].body.replace(
      "Incorrect title",
      "Correct title",
    );
    const after = s.store.createAudit(s.project, plan.config);
    await s.app.crawler.run(after);
    assert.equal(s.store.audit(after).state, "complete");
    assert.deepEqual(
      s.store
        .observations(after)
        .map((o) => o.url)
        .sort(),
      plan.config.recheckUrls,
    );
    const oldIds = new Set(s.store.observations(s.before).map((o) => o.id));
    assert.ok(s.store.observations(after).every((o) => !oldIds.has(o.id)));
    for (const r of s.store
      .results(after, { limit: 10000 })
      .filter((r) =>
        ["exact-duplicate", "inventory-orphan", "sitemap-intent"].includes(
          r.ruleId,
        ),
      ))
      assert.equal(r.outcome, "not-tested");
    const record = verifyRun(s.store, plan.planId, after);
    assert.equal(record.state, "verified");
    assert.ok(record.dependencies.every((d) => d.fresh));
    assert.equal(record.changes[0].state, "resolved");
    assert.ok(
      s.store
        .coverage(after)
        .limitations.some((l) => l.includes("selected URLs")),
    );
    assert.equal(s.store.latestAnalysis(s.before), plan.baselineAnalysisId);
    assert.ok(exportReport(s.store, after, "json").includes(plan.planId));
    assert.ok(
      !exportReport(s.store, after, "json", "shareable").includes(plan.planId),
    );
    assert.ok(
      !exportReport(s.store, after, "html", "shareable").includes(
        s.fixture.origin,
      ),
    );
  } finally {
    await s.close();
  }
});

test("relationship checks plan fresh destinations and a new unknown destination cannot verify the fix", async () => {
  const s = await setup();
  try {
    const plan = s.app.planVerification({
      auditId: s.before,
      groupId: s.group("canonical-target").id,
    });
    assert.equal(plan.mode, "targeted");
    assert.ok(plan.dependencies.some((d) => d.url.endsWith("/destination")));
    s.routes["/destination"].status = 200;
    s.routes["/a"].body = s.routes["/a"].body.replace(
      '/destination"',
      '/new-destination"',
    );
    const after = s.store.createAudit(s.project, plan.config);
    await s.app.crawler.run(after);
    const record = verifyRun(s.store, plan.planId, after);
    assert.equal(record.state, "not-verified");
    assert.equal(record.changes[0].state, "not-verifiable");
    assert.ok(
      s.store
        .pages(after, 0, 200)
        .some(
          (p) =>
            p.url.endsWith("/new-destination") &&
            p.reason === "verification-scope",
        ),
    );
  } finally {
    await s.close();
  }
});

test("a fresh fix with a new template regression does not receive successful verification", async () => {
  const s = await setup();
  try {
    const plan = s.app.planVerification({
      auditId: s.before,
      groupId: s.group("title-review").id,
    });
    s.routes["/a"].body = s.routes["/a"].body.replace(
      "Incorrect title",
      "Correct title",
    );
    s.routes["/peer"].body = s.routes["/peer"].body.replace(
      "Correct title",
      "New incorrect title",
    );
    const after = s.store.createAudit(s.project, plan.config);
    await s.app.crawler.run(after);
    const record = verifyRun(s.store, plan.planId, after);
    assert.equal(record.changes[0].state, "resolved");
    assert.ok(
      record.regressions.some(
        (r) =>
          r.ruleId === "title-review" &&
          r.url.endsWith("/peer") &&
          r.state === "introduced",
      ),
    );
    assert.equal(record.state, "not-verified");
  } finally {
    await s.close();
  }
});

test("reused, stale, partial, mismatched and expired evidence cannot verify a fix and failed appends roll back", async (t) => {
  const s = await setup();
  try {
    const plan = s.app.planVerification({
      auditId: s.before,
      groupId: s.group("title-review").id,
      maxAgeSeconds: 1,
    });
    assert.throws(
      () => verifyRun(s.store, plan.planId, s.before),
      /verification-audit-mismatch/,
    );
    const old = s.store.createAudit(s.project, plan.config);
    for (const o of s.store
      .observations(s.before)
      .filter((o) => plan.config.recheckUrls!.includes(o.url))) {
      s.store.putObservation(old, {
        ...o,
        id: randomUUID(),
        timestamp: new Date(Date.parse(plan.createdAt) - 60000).toISOString(),
      });
    }
    s.app.reanalyze(old);
    s.store.state(old, "complete");
    assert.equal(
      verifyRun(s.store, plan.planId, old).changes[0].state,
      "not-verifiable",
    );
    s.routes["/a"].body = s.routes["/a"].body.replace(
      "Incorrect title",
      "Correct title",
    );
    const after = s.store.createAudit(s.project, plan.config);
    await s.app.crawler.run(after);
    s.store.state(after, "partial", "synthetic-partial");
    assert.equal(verifyRun(s.store, plan.planId, after).state, "not-verified");
    s.store.state(after, "complete");
    const clock = Date.now();
    t.mock.method(Date, "now", () => clock + 2000);
    assert.equal(
      verifyRun(s.store, plan.planId, after).changes[0].state,
      "not-verifiable",
    );
    t.mock.restoreAll();
    const count = s.store.imports(s.project, "verification-run").length;
    t.mock.method(s.store, "addImport", () => {
      throw new Error("synthetic-append-failure");
    });
    assert.throws(
      () => verifyRun(s.store, plan.planId, after),
      /synthetic-append-failure/,
    );
    t.mock.restoreAll();
    assert.equal(s.store.db.isTransaction, false);
    assert.equal(s.store.imports(s.project, "verification-run").length, count);
    s.app.reanalyze(s.before);
    assert.throws(
      () => savedVerificationPlan(s.store, plan.planId),
      /verification-plan-stale/,
    );
    s.store.saveAnalysis(
      s.before,
      "0.1.3",
      s.store.results(s.before, { limit: 10000 }),
    );
    assert.throws(
      () =>
        s.app.planVerification({
          auditId: s.before,
          groupId: s.group("title-review").id,
        }),
      /verification-ruleset-mismatch/,
    );
  } finally {
    t.mock.restoreAll();
    await s.close();
  }
});

test("all rules declare verification scope, config cannot expand access, CLI plans persist beyond project pagination, and cleanup removes both ends", async () => {
  const s = await setup();
  try {
    assert.ok(
      rules.every((r) =>
        ["page", "relationships", "inventory"].includes(r.verificationScope!),
      ),
    );
    assert.throws(
      () =>
        parseConfig({ ...s.config, recheckUrls: ["https://outside.example/"] }),
      /out-of-scope-config-url/,
    );
    assert.throws(
      () =>
        parseConfig({
          ...s.config,
          recheckUrls: [s.fixture.origin + "/delete"],
        }),
      /verification-scope-invalid/,
    );
    const stdout = execFileSync(
      process.execPath,
      [
        "src/cli.ts",
        "plan-verification",
        s.before,
        s.group("title-review").id,
        "--data",
        s.root,
      ],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
    const plan = JSON.parse(stdout);
    for (let i = 0; i < 110; i++) s.store.createProject(s.config);
    assert.equal(
      savedVerificationPlan(s.store, plan.planId).baselineAuditId,
      s.before,
    );
    assert.equal(
      scopeReason(plan.config, s.fixture.origin + "/other"),
      "verification-scope",
    );
    const after = s.store.createAudit(s.project, plan.config);
    await s.app.crawler.run(after);
    verifyRun(s.store, plan.planId, after);
    s.store.deleteAudit(s.before);
    assert.deepEqual(s.store.imports(s.project, "verification-plan"), []);
    assert.deepEqual(s.store.imports(s.project, "verification-run"), []);
    assert.ok(s.store.audit(after));
  } finally {
    await s.close();
  }
});

test("inventory-wide issues use full fresh evidence and preserve saved budgets", async () => {
  const s = await setup();
  try {
    s.routes["/other"].body = s.routes["/peer"].body;
    const baseline = s.store.createAudit(s.project);
    await s.app.crawler.run(baseline);
    const group = (s.app.view(baseline, "groups") as any[]).find(
      (g) => g.ruleId === "exact-duplicate",
    );
    assert.ok(group);
    const plan = s.app.planVerification({
      auditId: baseline,
      groupId: group.id,
    });
    assert.equal(plan.mode, "full");
    assert.equal(plan.config.recheckUrls, undefined);
    assert.equal(plan.config.maxPages, s.config.maxPages);
    assert.equal(plan.dependencies.length, 5);
    assert.ok(plan.config.inventory.includes(s.fixture.origin + "/other"));
    s.routes["/destination"].status = 200;
    s.routes["/other"].body =
      "<title>Other</title><main>Different fictional purpose and text</main>";
    const after = s.store.createAudit(s.project, plan.config);
    await s.app.crawler.run(after);
    assert.equal(verifyRun(s.store, plan.planId, after).state, "verified");
  } finally {
    await s.close();
  }
});

test("recorded unobserved template peers are included and a tight budget is never silently raised", async () => {
  const s = await setup();
  try {
    const config = parseConfig({ ...s.config, maxPages: 2 }),
      project = s.store.createProject(config),
      baseline = s.store.createAudit(project);
    await s.app.crawler.run(baseline);
    assert.equal(s.store.observations(baseline).length, 2);
    const group = (s.app.view(baseline, "groups") as any[]).find(
      (g) => g.ruleId === "title-review",
    );
    assert.ok(group);
    const plan = s.app.planVerification({
      auditId: baseline,
      groupId: group.id,
    });
    assert.ok(plan.dependencies.some((d) => d.url.endsWith("/peer")));
    assert.equal(plan.mode, "full");
    assert.equal(plan.config.maxPages, 2);
    const after = s.store.createAudit(project, plan.config);
    await s.app.crawler.run(after);
    assert.equal(verifyRun(s.store, plan.planId, after).state, "not-verified");
  } finally {
    await s.close();
  }
});

test(
  "HTTP canonical relationships are planned and CLI start/evaluate exercise the actual detached worker",
  { timeout: 15000 },
  async () => {
    const s = await setup();
    try {
      s.routes["/a"].body =
        "<title>Incorrect title</title><main>Fictional HTTP canonical page</main>";
      (s.routes["/a"] as any).headers = {
        Link: '</destination>; rel="canonical"',
      };
      const baseline = s.store.createAudit(s.project);
      await s.app.crawler.run(baseline);
      const group = (s.app.view(baseline, "groups") as any[]).find(
        (g) => g.ruleId === "canonical-target",
      );
      assert.ok(group);
      const plan = s.app.planVerification({
        auditId: baseline,
        groupId: group.id,
      });
      assert.ok(
        plan.dependencies.some(
          (d) =>
            d.url.endsWith("/destination") &&
            d.reasons.includes("HTTP canonical destination"),
        ),
      );
      s.routes["/destination"].status = 200;
      const started = JSON.parse(
        execFileSync(
          process.execPath,
          [
            "src/cli.ts",
            "start-verification",
            plan.planId,
            "--data",
            s.root,
            "--allow-local-origin",
            s.fixture.origin,
          ],
          { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
        ),
      );
      const deadline = Date.now() + 10000;
      while (
        ["queued", "running", "analyzing"].includes(
          s.store.audit(started.auditId).state,
        ) &&
        Date.now() < deadline
      )
        await new Promise((resolve) => setTimeout(resolve, 25));
      assert.equal(s.store.audit(started.auditId).state, "complete");
      const record = JSON.parse(
        execFileSync(
          process.execPath,
          [
            "src/cli.ts",
            "evaluate-verification",
            plan.planId,
            started.auditId,
            "--data",
            s.root,
          ],
          { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
        ),
      );
      assert.equal(record.state, "verified");
    } finally {
      await s.close();
    }
  },
);

test(
  "official stdio MCP plans, starts and evaluates a dependency-aware recheck without adding execution tools",
  { timeout: 15000 },
  async () => {
    const s = await setup(),
      client = new Client({
        name: "synthetic-verification-client",
        version: "0.1.0",
      });
    try {
      await client.connect(
        new StdioClientTransport({
          command: process.execPath,
          args: [
            fileURLToPath(new URL("../src/cli.ts", import.meta.url)),
            "mcp",
            "--data",
            s.root,
            "--allow-local-origin",
            s.fixture.origin,
          ],
          stderr: "pipe",
        }),
        { mode: "auto" },
      );
      const invoke = async (name: string, args: Record<string, unknown>) => {
        const result: any = await client.callTool({ name, arguments: args });
        assert.ok(!result.isError);
        return JSON.parse(result.content[0].text);
      };
      const plan = await invoke("verify_audit", {
        action: "plan",
        auditId: s.before,
        groupId: s.group("title-review").id,
      });
      assert.equal(plan.mode, "targeted");
      s.routes["/a"].body = s.routes["/a"].body.replace(
        "Incorrect title",
        "Correct title",
      );
      const job = await invoke("verify_audit", {
        action: "start",
        planId: plan.planId,
      });
      const deadline = Date.now() + 10000;
      while (
        ["queued", "running", "analyzing"].includes(
          s.store.audit(job.auditId).state,
        ) &&
        Date.now() < deadline
      )
        await new Promise((resolve) => setTimeout(resolve, 25));
      assert.equal(s.store.audit(job.auditId).state, "complete");
      const record = await invoke("verify_audit", {
        action: "evaluate",
        planId: plan.planId,
        afterId: job.auditId,
      });
      assert.equal(record.state, "verified");
      const view = await invoke("audit_results", {
        auditId: job.auditId,
        view: "verification",
      });
      assert.equal(view.runs[0].verificationId, record.verificationId);
      const invalid: any = await client.callTool({
        name: "verify_audit",
        arguments: { action: "evaluate", planId: plan.planId },
      });
      assert.equal(invalid.isError, true);
      assert.equal((await client.listTools()).tools.length, 10);
    } finally {
      await client.close();
      await s.close();
    }
  },
);

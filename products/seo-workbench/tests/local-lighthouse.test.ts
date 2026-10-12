import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Store } from "../src/store.ts";
import { Workbench } from "../src/app.ts";
import { fixtureSite } from "../src/fixtures.ts";
import { NetworkPolicy } from "../src/network.ts";
import {
  measureLocalPerformance,
  LocalLabRequest,
} from "../src/local-lighthouse.ts";
import { parseConfig } from "../src/domain.ts";
import { parsePerformance } from "../src/imports.ts";
const config = parseConfig({
  origins: ["https://www.example.com"],
  seeds: ["https://www.example.com/"],
});

test("measurement reservations block other clients and release without losing a caller transaction", () => {
  const root = mkdtempSync(join(tmpdir(), "seo-workbench-lab-lock-")),
    store = new Store(root),
    other = new Store(root);
  try {
    const release = store.reserveWorkerSlot();
    assert.throws(() => other.reserveWorkerSlot(), /audit-worker-active/);
    assert.throws(
      () => new Workbench(other).start(config),
      /audit-worker-capacity/,
    );
    release();
    release();
    const second = other.reserveWorkerSlot();
    release();
    assert.throws(() => store.reserveWorkerSlot(), /audit-worker-active/);
    second();
    store.db.exec("BEGIN IMMEDIATE");
    assert.throws(
      () => store.reserveWorkerSlot(),
      /database-transaction-active/,
    );
    assert.equal(store.db.isTransaction, true);
    store.db.exec("ROLLBACK");
    store.reserveWorkerSlot()();
  } finally {
    other.close();
    store.close();
    rmSync(root, { recursive: true, force: true });
  }
});

test("local performance validates scope, provenance and worker availability before running", async () => {
  const root = mkdtempSync(join(tmpdir(), "seo-workbench-lab-input-")),
    store = new Store(root);
  try {
    const projectId = store.createProject(config),
      url = config.seeds[0],
      policy = new NetworkPolicy();
    assert.equal(LocalLabRequest.parse({ projectId, url }).repeats, 5);
    assert.throws(() => LocalLabRequest.parse({ projectId, url, repeats: 6 }));
    await assert.rejects(
      measureLocalPerformance(store, policy, {
        projectId,
        url: "https://other.example.com/",
      }),
      /lab-target-scope/,
    );
    const audit = store.createAudit(projectId);
    await assert.rejects(
      measureLocalPerformance(store, new NetworkPolicy(), { projectId, url }),
      /lab-audit-concurrency-blocked/,
    );
    store.state(audit, "cancelled");
    store.reserveWorkerSlot()();
    assert.throws(() =>
      parsePerformance({
        schemaVersion: 1,
        provider: "CrUX",
        method: "local runner",
        scope: "origin",
        url,
        device: "all",
        toolVersion: "fixture",
        timestamp: new Date().toISOString(),
        collectionStart: "2026-01-01",
        collectionEnd: "2026-01-28",
        percentile: 75,
        metrics: { lcpMs: 1, cls: 0, inpMs: 1, tbtMs: null },
        sampling: "Synthetic fixture",
      }),
    );
  } finally {
    store.close();
    rmSync(root, { recursive: true, force: true });
  }
});

for (const device of ["desktop", "mobile"] as const)
  test(
    `local sandboxed ${device} Lighthouse repeats save complete private measurements`,
    {
      skip: process.env.WORKBENCH_BROWSER_TESTS !== "1",
      timeout: 120000,
    },
    async () => {
      const fixture = await fixtureSite({
          routes: {
            "/measure": {
              status: 200,
              body: "<!doctype html><html lang='en'><head><title>Synthetic speed fixture</title></head><body><h1>Workshop guide</h1><p>An original fixture for a controlled local speed measurement.</p></body></html>",
            },
          },
        }),
        root = mkdtempSync(join(tmpdir(), "seo-workbench-lab-series-")),
        store = new Store(root);
      try {
        const projectId = store.createProject(fixture.config),
          policy = new NetworkPolicy({
            localOrigins: [fixture.origin],
          }),
          result = await new Workbench(store, policy).measurePerformance({
            projectId,
            url: fixture.origin + "/measure",
            device,
            repeats: device === "desktop" ? 5 : 2,
          });
        assert.equal(result.importIds.length, device === "desktop" ? 5 : 2);
        assert.equal(store.imports(projectId, "local-lab-series").length, 1);
        assert.equal(
          (store.imports(projectId, "local-lab-series")[0] as any).browserMode,
          "local",
        );
        assert.equal(
          store.imports(projectId, "performance").length,
          result.samples.length,
        );
        const lcp = result.samples
          .map((sample) => sample.measurement.metrics.lcpMs!)
          .sort((a, b) => a - b);
        assert.equal(result.summary.lcpMs.min, lcp[0]);
        assert.equal(result.summary.lcpMs.max, lcp.at(-1));
        assert.equal(
          result.summary.lcpMs.median,
          device === "desktop" ? lcp[2] : (lcp[0] + lcp[1]) / 2,
        );
        for (const { measurement, emulation } of result.samples) {
          assert.equal(emulation.mobile, device === "mobile");
          assert.ok(emulation.width > 0);
          assert.match(emulation.userAgent, /Chrome/);
          assert.equal(measurement.device, device);
          assert.equal(measurement.method, "local runner");
          assert.equal(measurement.metrics.inpMs, null);
          assert.equal(measurement.toolVersion, "13.5.0");
          assert.ok(
            measurement.metrics.lcpMs !== null &&
              measurement.metrics.lcpMs >= 0,
          );
          assert.match(measurement.sampling, /host-broker buffering/);
        }
        store.reserveWorkerSlot()();
      } finally {
        store.close();
        await fixture.close();
        rmSync(root, { recursive: true, force: true });
      }
    },
  );

test(
  "crawl policy and failed resources cannot become a successful local lab series",
  { skip: process.env.WORKBENCH_BROWSER_TESTS !== "1", timeout: 90000 },
  async () => {
    const fixture = await fixtureSite({
        routes: {
          "/blocked-resource": {
            status: 200,
            body: "<!doctype html><h1>Synthetic measurement</h1><script src='/private/script.js'></script>",
          },
        },
      }),
      root = mkdtempSync(join(tmpdir(), "seo-workbench-lab-rejection-")),
      store = new Store(root);
    try {
      const projectId = store.createProject(fixture.config),
        policy = new NetworkPolicy({
          localOrigins: [fixture.origin],
        });
      await assert.rejects(
        measureLocalPerformance(store, policy, {
          projectId,
          url: fixture.origin + "/private",
          repeats: 1,
        }),
        /lab-robots-blocked/,
      );
      await assert.rejects(
        measureLocalPerformance(store, policy, {
          projectId,
          url: fixture.origin + "/blocked-resource",
          repeats: 1,
        }),
        /lab-measurement-incomplete/,
      );
      assert.deepEqual(store.imports(projectId, "performance"), []);
      assert.deepEqual(store.imports(projectId, "local-lab-series"), []);
      const abort = new AbortController();
      abort.abort();
      await assert.rejects(
        measureLocalPerformance(
          store,
          policy,
          { projectId, url: fixture.origin + "/product", repeats: 1 },
          abort.signal,
        ),
      );
      store.reserveWorkerSlot()();
    } finally {
      store.close();
      await fixture.close();
      rmSync(root, { recursive: true, force: true });
    }
  },
);

test(
  `HTTP, compiled CLI and official stdio MCP collect the same local lab records`,
  {
    skip: process.env.WORKBENCH_BROWSER_TESTS !== "1",
    timeout: 120000,
  },
  async () => {
    const { serve } = await import("../src/server.ts"),
      { execFile } = await import("node:child_process"),
      { promisify } = await import("node:util"),
      { fileURLToPath } = await import("node:url"),
      { Client } = await import("@modelcontextprotocol/client"),
      { StdioClientTransport } =
        await import("@modelcontextprotocol/client/stdio");
    const fixture = await fixtureSite({
        routes: {
          "/measure": {
            status: 200,
            body: "<!doctype html><title>Original speed fixture</title><h1>Workshop guide</h1><p>Read this original synthetic guide.</p>",
          },
        },
      }),
      root = mkdtempSync(join(tmpdir(), "seo-workbench-lab-adapters-")),
      store = new Store(root),
      projectId = store.createProject(fixture.config),
      url = fixture.origin + "/measure",
      app = new Workbench(
        store,
        new NetworkPolicy({
          localOrigins: [fixture.origin],
        }),
      ),
      server = await serve(app, 0);
    let client: InstanceType<typeof Client> | undefined;
    try {
      assert.equal(
        (
          await fetch(server.origin + "/api/performance", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              origin: server.origin,
            },
            body: JSON.stringify({ projectId, url, repeats: 1 }),
          })
        ).status,
        403,
      );
      const rootResponse = await fetch(server.origin),
        cookie = rootResponse.headers.get("set-cookie")!.split(";")[0];
      const measured = await fetch(server.origin + "/api/performance", {
        method: "POST",
        headers: {
          cookie,
          "Content-Type": "application/json",
          origin: server.origin,
        },
        body: JSON.stringify({
          projectId,
          url,
          repeats: 1,
          device: "desktop",
        }),
      });
      assert.equal(measured.status, 201);
      assert.equal((await measured.json()).samples.length, 1);
      const args = [
        fileURLToPath(new URL("../dist/cli.js", import.meta.url)),
        "--data",
        root,
        "--allow-local-origin",
        fixture.origin,
      ];
      const cli = await promisify(execFile)(
        process.execPath,
        [
          ...args,
          "lighthouse",
          projectId,
          url,
          "--repeats",
          "1",
          "--device",
          "desktop",
        ],
        { timeout: 60000 },
      );
      assert.equal(
        JSON.parse(cli.stdout).samples[0].measurement.method,
        "local runner",
      );
      client = new Client({ name: "synthetic-lab-client", version: "0.1.0" });
      await client.connect(
        new StdioClientTransport({
          command: process.execPath,
          args: [...args, "mcp"],
          stderr: "pipe",
        }),
        { mode: "auto" },
      );
      const tool = (await client.listTools()).tools.find(
        (tool) => tool.name === "measure_performance",
      );
      assert.equal(tool?.annotations?.openWorldHint, true);
      const result: any = await client.callTool(
        {
          name: "measure_performance",
          arguments: { projectId, url, repeats: 1, device: "mobile" },
        },
        undefined,
        { timeout: 60000 },
      );
      assert.notEqual(result.isError, true);
      assert.equal(
        JSON.parse(result.content[0].text).samples[0].measurement.device,
        "mobile",
      );
      assert.equal(store.imports(projectId, "local-lab-series").length, 3);
      const abort = new AbortController();
      const cancelled = fetch(server.origin + "/api/performance", {
        method: "POST",
        headers: {
          cookie,
          "Content-Type": "application/json",
          origin: server.origin,
        },
        body: JSON.stringify({ projectId, url, repeats: 5 }),
        signal: abort.signal,
      });
      const deadline = Date.now() + 10000;
      let held = false;
      while (Date.now() < deadline) {
        try {
          store.reserveWorkerSlot()();
        } catch (error) {
          if ((error as Error).message === "audit-worker-active") {
            held = true;
            break;
          }
          throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
      assert.equal(held, true);
      abort.abort();
      await assert.rejects(
        cancelled,
        (error: Error) => error.name === "AbortError",
      );
      let released = false;
      while (Date.now() < deadline) {
        try {
          store.reserveWorkerSlot()();
          released = true;
          break;
        } catch (error) {
          if ((error as Error).message !== "audit-worker-active") throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
      assert.equal(released, true);
      assert.equal(store.imports(projectId, "performance").length, 3);
      const original = store.addImport.bind(store);
      store.addImport = (project, kind, data) => {
        if (kind === "local-lab-series")
          throw new Error("synthetic-series-save-failure");
        return original(project, kind, data);
      };
      await assert.rejects(
        app.measurePerformance({ projectId, url, repeats: 1 }),
        /synthetic-series-save-failure/,
      );
      assert.equal(store.imports(projectId, "performance").length, 3);
      assert.equal(store.imports(projectId, "local-lab-series").length, 3);
      assert.equal(store.db.isTransaction, false);
      store.reserveWorkerSlot()();
    } finally {
      await client?.close();
      await server.close();
      store.close();
      await fixture.close();
      rmSync(root, { recursive: true, force: true });
    }
  },
);

for (const [status, headers] of [
  [503, {}],
  [403, {}],
  [302, { location: "/robots.txt" }],
] as const)
  test(`unavailable crawl policy ${status} stops collection before a browser starts`, async () => {
    const fixture = await fixtureSite({
        routes: {
          "/robots.txt": { status, headers, body: "Synthetic policy response" },
        },
      }),
      root = mkdtempSync(join(tmpdir(), "seo-workbench-lab-policy-")),
      store = new Store(root);
    try {
      const projectId = store.createProject(fixture.config),
        policy = new NetworkPolicy({
          localOrigins: [fixture.origin],
        });
      await assert.rejects(
        measureLocalPerformance(store, policy, {
          projectId,
          url: fixture.origin + "/product",
          repeats: 1,
        }),
        /lab-robots-unavailable/,
      );
      assert.deepEqual(store.imports(projectId, "performance"), []);
      store.reserveWorkerSlot()();
    } finally {
      store.close();
      await fixture.close();
      rmSync(root, { recursive: true, force: true });
    }
  });

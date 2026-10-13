import test from "node:test";
import assert from "node:assert/strict";
import { fixtureSite } from "../src/fixtures.ts";
import { NetworkPolicy, Transport } from "../src/network.ts";
import { parseConfig } from "../src/domain.ts";
import { renderBrowser } from "../src/browser-runner.ts";
test(
  "sandboxed delayed rendering preserves viewport and locale while separating browser storage",
  { skip: process.env.WORKBENCH_BROWSER_TESTS !== "1" },
  async () => {
    const fixture = await fixtureSite({
      routes: {
        "/profile": {
          status: 200,
          body: `<html><title>Waiting</title><main id="content">Waiting</main><script>
      setTimeout(() => {
        document.title = navigator.language + ':' + innerWidth + ':' + (localStorage.getItem('previous') ?? 'empty');
        localStorage.setItem('previous', 'captured');
        document.querySelector('main').textContent = 'Delayed fictional content';
        document.documentElement.dataset.ready = 'yes';
      }, 30);
      </script></html>`,
        },
      },
    });
    try {
      for (const profile of [
        { locale: "en-GB", viewport: { width: 1280, height: 720 } },
        { locale: "fr-FR", viewport: { width: 375, height: 812 } },
        { locale: "en-GB", viewport: { width: 1280, height: 720 } },
      ]) {
        const config = parseConfig({
          ...fixture.config,
          ...profile,
          render: "all",
          renderReadySelector: "html[data-ready]",
        });
        const transport = new Transport(
          config,
          new NetworkPolicy({ localOrigins: [fixture.origin] }),
        );
        const result = await renderBrowser(
          await transport.request(fixture.origin + "/profile"),
          config,
          transport,
        );
        assert.equal(result?.status, "observed");
        assert.equal(
          result?.facts?.title,
          `${profile.locale}:${profile.viewport.width}:empty`,
        );
        assert(result?.dom?.includes("Delayed fictional content"));
      }
    } finally {
      await fixture.close();
    }
  },
);
test(
  "sandboxed readiness cannot outlive the audit's remaining time allowance",
  { skip: process.env.WORKBENCH_BROWSER_TESTS !== "1" },
  async () => {
    const fixture = await fixtureSite();
    try {
      const config = parseConfig({
        ...fixture.config,
        render: "all",
        renderTimeoutMs: 30000,
        renderReadySelector: "#never-present",
      });
      const transport = new Transport(
        config,
        new NetworkPolicy({
          localOrigins: [fixture.origin],
        }),
        undefined,
        undefined,
        Date.now() - config.maxSeconds * 1000 + 4000,
      );
      const response = await transport.request(fixture.origin + "/client");
      const start = Date.now();
      const result = await renderBrowser(response, config, transport);
      assert.equal(result?.status, "timeout");
      assert.equal(result?.reason, "time-budget");
      assert.ok(Date.now() - start < 10000);
    } finally {
      await fixture.close();
    }
  },
);
test("rendering refuses pre-cancellation and exhausted audit time before starting Chromium", async () => {
  const controller = new AbortController();
  controller.abort();
  const config = parseConfig({
    origins: ["https://www.example.com"],
    seeds: ["https://www.example.com/"],
  });
  const response = { url: config.seeds[0] } as any;
  const policy = new NetworkPolicy();
  assert.deepEqual(
    await renderBrowser(
      response,
      config,
      new Transport(config, policy, controller.signal),
    ),
    { status: "error", reason: "render-cancelled" },
  );
  assert.deepEqual(
    await renderBrowser(
      response,
      config,
      new Transport(
        config,
        policy,
        undefined,
        undefined,
        Date.now() - config.maxSeconds * 1000 - 1,
      ),
    ),
    { status: "timeout", reason: "time-budget" },
  );
});
test(
  "cancellation stops an in-flight sandboxed browser without waiting for its readiness timeout",
  { skip: process.env.WORKBENCH_BROWSER_TESTS !== "1" },
  async () => {
    const fixture = await fixtureSite();
    try {
      const controller = new AbortController();
      const config = parseConfig({
        ...fixture.config,
        render: "all",
        renderTimeoutMs: 30000,
        renderReadySelector: "#never-present",
      });
      const transport = new Transport(
        config,
        new NetworkPolicy({
          localOrigins: [fixture.origin],
        }),
        controller.signal,
      );
      const response = await transport.request(fixture.origin + "/client");
      const start = Date.now();
      const timer = setTimeout(() => controller.abort(), 2000);
      try {
        const result = await renderBrowser(response, config, transport);
        assert.equal(result?.reason, "render-cancelled");
        assert.ok(Date.now() - start < 10000);
      } finally {
        clearTimeout(timer);
      }
    } finally {
      await fixture.close();
    }
  },
);
test(
  "real sandboxed Chromium renders same raw response using bounded host-brokered resources",
  { skip: process.env.WORKBENCH_BROWSER_TESTS !== "1" },
  async () => {
    const fixture = await fixtureSite();
    try {
      const config = parseConfig({
        ...fixture.config,
        render: "all",
        recheckUrls: [fixture.origin + "/client"],
        renderReadySelector: "html[data-ready]",
        renderTimeoutMs: 5000,
      });
      const policy = new NetworkPolicy({
        localOrigins: [fixture.origin],
      });
      const transport = new Transport(config, policy);
      const response = await transport.request(fixture.origin + "/client");
      assert.ok(response.body.includes("noindex"));
      const rendered = await renderBrowser(response, config, transport);
      assert.equal(rendered?.status, "observed");
      assert.equal(rendered?.facts?.title, "Client guide");
      assert.deepEqual(rendered?.facts?.robots, []);
      assert.ok(rendered?.profile);
      assert.ok(transport.requests >= 2);
    } finally {
      await fixture.close();
    }
  },
);

test(
  "hostile page cannot broker requests to a different local origin or fetch transactional routes",
  { skip: process.env.WORKBENCH_BROWSER_TESTS !== "1" },
  async () => {
    let hits = 0;
    const http = await import("node:http");
    const target = http.createServer((_req, res) => {
      hits++;
      res.end("forbidden service");
    });
    await new Promise<void>((resolve) =>
      target.listen(0, "127.0.0.1", resolve),
    );
    const port = (target.address() as { port: number }).port;
    const html = `<html><title>Adversarial fixture</title><main>Fixture evidence</main><script>fetch('http://127.0.0.1:${port}/').catch(()=>{});fetch('/checkout').catch(()=>{});new WebSocket('ws://127.0.0.1:${port}/');</script><iframe src="http://127.0.0.1:${port}/"></iframe><img src="http://127.0.0.1:${port}/image"></html>`;
    const fixture = await fixtureSite({
      routes: { "/attack": { status: 200, body: html } },
    });
    try {
      const config = parseConfig({
        ...fixture.config,
        render: "all",
        renderTimeoutMs: 3000,
      });
      const transport = new Transport(
        config,
        new NetworkPolicy({
          localOrigins: [fixture.origin],
        }),
      );
      const observed = await renderBrowser(
        await transport.request(fixture.origin + "/attack"),
        config,
        transport,
      );
      assert.equal(observed?.status, "observed");
      assert.equal(hits, 0);
      const profile = observed?.profile as {
        resourceEvidence: { error?: string }[];
      };
      assert.ok(
        profile.resourceEvidence.some(
          (e) => e.error === "resource-origin-blocked",
        ),
      );
      assert.ok(
        profile.resourceEvidence.some(
          (e) => e.error === "resource-scope-blocked",
        ),
      );
    } finally {
      await fixture.close();
      await new Promise<void>((resolve) => target.close(() => resolve()));
    }
  },
);

test(
  "renderer output is bounded before an oversized unterminated result can accumulate",
  { skip: process.env.WORKBENCH_BROWSER_TESTS !== "1" },
  async () => {
    const fixture = await fixtureSite({
      routes: {
        "/output": {
          status: 200,
          body: "<title>Original output fixture</title><main>Small initial response</main><script>document.querySelector('main').textContent=String.fromCharCode(1).repeat(600000)</script>",
        },
      },
    });
    try {
      const config = parseConfig({
        ...fixture.config,
        maxBytes: 1000000,
        renderTimeoutMs: 5000,
      });
      const transport = new Transport(
        config,
        new NetworkPolicy({ localOrigins: [fixture.origin] }),
      );
      const result = await renderBrowser(
        await transport.request(fixture.origin + "/output"),
        config,
        transport,
      );
      assert.equal(result?.reason, "render-output-budget");
    } finally {
      await fixture.close();
    }
  },
);

test("removed image options are rejected instead of silently changing the requested execution mode", async () => {
  assert.throws(
    () =>
      new NetworkPolicy({ rendererImage: "sha256:" + "0".repeat(64) } as any),
    /network-policy-option-unsupported/,
  );
  const { execFile } = await import("node:child_process"),
    { promisify } = await import("node:util"),
    { fileURLToPath } = await import("node:url");
  await assert.rejects(
    promisify(execFile)(process.execPath, [
      fileURLToPath(new URL("../dist/cli.js", import.meta.url)),
      "doctor",
      "--renderer-image",
      "sha256:" + "0".repeat(64),
    ]),
    (error: any) =>
      error.code === 2 && JSON.parse(error.stderr).error === "operation-failed",
  );
});

test(
  "rendered text follows open shadow roots, slots and hidden host ancestors",
  { skip: process.env.WORKBENCH_BROWSER_TESTS !== "1" },
  async () => {
    const fixture = await fixtureSite({
      routes: {
        "/shadow": {
          status: 200,
          body: `<title>Fictional soup</title><main><recipe-card><span slot="ingredients">Fictional soup ingredients</span><span>Unassigned light text</span></recipe-card><recipe-card hidden></recipe-card></main>
      <script>customElements.define('recipe-card', class extends HTMLElement { connectedCallback() { this.attachShadow({mode:'open'}).innerHTML = '<p>Fictional soup instructions</p><slot name="ingredients"></slot><nested-card></nested-card>'; }});
      customElements.define('nested-card', class extends HTMLElement { connectedCallback() { this.attachShadow({mode:'open'}).innerHTML = 'Direct shadow text<p>Nested fictional content</p><nav>Shadow navigation</nav>'; }});</script>`,
        },
      },
    });
    try {
      const config = parseConfig({ ...fixture.config, render: "all" });
      const transport = new Transport(
        config,
        new NetworkPolicy({ localOrigins: [fixture.origin] }),
      );
      const response = await transport.request(fixture.origin + "/shadow");
      const result = await renderBrowser(response, config, transport);
      assert.equal(result?.status, "observed");
      const text = result?.facts?.renderedMainText;
      assert.equal(text?.truncated, false);
      assert.equal(
        text?.text,
        "Fictional soup instructions Fictional soup ingredients Direct shadow text Nested fictional content",
      );
      assert.match(result!.facts!.renderedPageText!.text, /Shadow navigation/);
      const { analyze } = await import("../src/rules.ts");
      const outcome = analyze({
        config: parseConfig({
          ...config,
          contracts: [
            { pathPrefix: "/", criticalText: ["Fictional soup instructions"] },
          ],
        }),
        observations: [
          {
            id: "synthetic-shadow",
            url: response.url,
            originalUrl: response.url,
            finalUrl: response.url,
            response,
            attempts: [response],
            facts: (await import("../src/extract.ts")).extract(
              response.body,
              response.url,
            ),
            render: result,
            error: null,
            timestamp: new Date().toISOString(),
          },
        ],
        sitemapUrls: new Set(),
        inventoryUrls: new Set(),
      });
      assert.equal(
        outcome.find((item) => item.ruleId === "critical-content")?.outcome,
        "pass",
      );
    } finally {
      await fixture.close();
    }
  },
);

test(
  "crawler rendering applies cached robots rules to resources and redirected resource hops",
  { skip: process.env.WORKBENCH_BROWSER_TESTS !== "1" },
  async () => {
    const { mkdtempSync, rmSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const { Store } = await import("../src/store.ts");
    const { Workbench } = await import("../src/app.ts");
    const resource = await fixtureSite({
      routes: {
        "/robots.txt": {
          status: 200,
          body: "User-agent: *\nDisallow: /blocked.js\n",
        },
        "/allowed-redirect.js": {
          status: 301,
          headers: { location: "/allowed.js" },
          body: "",
        },
        "/redirect.js": {
          status: 302,
          headers: { location: "/blocked.js" },
          body: "",
        },
        "/blocked.js": {
          status: 200,
          headers: { "content-type": "application/javascript" },
          body: "document.title='Disallowed script ran';",
        },
        "/allowed.js": {
          status: 200,
          headers: { "content-type": "application/javascript" },
          body: "document.title='Allowed script ran';",
        },
      },
    });
    const fixture = await fixtureSite({
      routes: {
        "/robots.txt": {
          status: 200,
          body: "User-agent: *\nDisallow: /blocked.js\n",
        },
        "/sitemap.xml": { status: 404, body: "" },
        "/blocked.js": {
          status: 200,
          headers: { "content-type": "application/javascript" },
          body: "document.title='Disallowed script ran';",
        },
        "/": {
          status: 200,
          body: `<title>Original fictional page</title><main>Original fictional content</main><script src="/blocked.js"></script><script src="${resource.origin}/allowed.js"></script><script src="${resource.origin}/allowed-redirect.js"></script><script src="${resource.origin}/redirect.js"></script>`,
        },
      },
    });
    const directory = mkdtempSync(join(tmpdir(), "seo-render-policy-"));
    const store = new Store(directory);
    try {
      const app = new Workbench(
        store,
        new NetworkPolicy({ localOrigins: [fixture.origin, resource.origin] }),
      );
      const { auditId } = await app.run({
        ...fixture.config,
        render: "all",
        renderResources: [resource.origin],
        contracts: [
          { pathPrefix: "/", criticalText: ["Missing fictional phrase"] },
        ],
      });
      const observation = store.observation(auditId, fixture.origin + "/")!;
      assert.equal(observation.render?.status, "blocked");
      assert.equal(observation.render?.facts?.title, "Allowed script ran");
      const evidence = (observation.render?.profile as any).resourceEvidence;
      for (const url of [
        fixture.origin + "/blocked.js",
        resource.origin + "/blocked.js",
      ])
        assert.ok(
          evidence.some(
            (item: any) =>
              item.url === url && item.error === "render-robots-blocked",
          ),
        );
      assert.ok(
        evidence.some(
          (item: any) =>
            item.url === resource.origin + "/allowed.js" && item.status === 200,
        ),
      );
      assert.ok(
        evidence.some(
          (item: any) =>
            item.url === resource.origin + "/allowed-redirect.js" &&
            item.status === 301,
        ),
      );
      assert.equal(
        store.results(auditId, { ruleId: "critical-content" })[0].outcome,
        "not-tested",
      );
      assert.equal(
        (store.events(auditId) as any[]).filter(
          (event) =>
            event.kind === "robots-observation" &&
            event.detail.origin === resource.origin,
        ).length,
        1,
      );
    } finally {
      store.close();
      rmSync(directory, { recursive: true, force: true });
      await fixture.close();
      await resource.close();
    }
  },
);

test(
  "browser child targets cannot fetch outside the broker",
  { skip: process.env.WORKBENCH_BROWSER_TESTS !== "1" },
  async () => {
    const { createServer } = await import("node:http");
    let childRequests = 0;
    const site = createServer((req, res) => {
      if (req.url === "/robots.txt") {
        res.writeHead(404);
        res.end();
        return;
      }
      if (req.url !== "/") childRequests++;
      res.end(
        `<title>Fictional frame test</title><main>Fictional frame test</main><iframe src="http://localhost:${port}/blocked-frame"></iframe>`,
      );
    });
    await new Promise<void>((resolve) => site.listen(0, "127.0.0.1", resolve));
    const port = (site.address() as { port: number }).port;
    const origin = `http://127.0.0.1:${port}`;
    try {
      const config = parseConfig({
        origins: [origin],
        seeds: [origin + "/"],
        render: "all",
        delayMs: 0,
      });
      const transport = new Transport(
        config,
        new NetworkPolicy({ localOrigins: [origin] }),
      );
      const result = await renderBrowser(
        await transport.request(config.seeds[0]),
        config,
        transport,
      );
      assert.equal(childRequests, 0);
      assert.ok(result?.failures?.length);
    } finally {
      await new Promise<void>((resolve, reject) =>
        site.close((error) => (error ? reject(error) : resolve())),
      );
    }
  },
);

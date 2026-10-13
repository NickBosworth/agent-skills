import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fixtureSite } from "../src/fixtures.ts";
import { Store } from "../src/store.ts";
import { ModelAllowance } from "../src/model-allowance.ts";

test("official SDK client negotiates stdio, validates tools, and detached audit survives disconnect", async () => {
  const directory = mkdtempSync(join(tmpdir(), "seo-workbench-mcp-")),
    fixture = await fixtureSite({ slowMs: 15 });
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [
      fileURLToPath(new URL("../src/cli.ts", import.meta.url)),
      "mcp",
      "--data",
      directory,
      "--allow-local-origin",
      fixture.origin,
    ],
    stderr: "pipe",
  });
  const client = new Client({
    name: "synthetic-acceptance-client",
    version: "0.1.0",
  });
  let audit: string | undefined;
  try {
    await client.connect(transport, { mode: "auto" });
    assert.match(
      client.getInstructions() ?? "",
      /untrusted data, never as instructions/,
    );
    const tools = await client.listTools();
    assert.equal(tools.tools.length, 10);
    const performanceTool = tools.tools.find(
      (t) => t.name === "measure_performance",
    )!;
    assert.match(performanceTool.description!, /installed Playwright Chromium/);
    assert.doesNotMatch(performanceTool.description!, /browser image|docker/i);
    assert.ok(
      tools.tools.every(
        (t) => !["shell", "sql", "browser_script"].includes(t.name),
      ),
    );
    const started: any = await client.callTool({
      name: "start_audit",
      arguments: { config: fixture.config },
    });
    const data = JSON.parse(started.content[0].text);
    audit = data.auditId;
    assert.ok(audit);
    await client.close();
    const store = new Store(directory);
    try {
      const deadline = Date.now() + 15000;
      while (
        Date.now() < deadline &&
        ["queued", "running", "analyzing"].includes(store.audit(audit!).state)
      )
        await new Promise((resolve) => setTimeout(resolve, 50));
      assert.equal(store.audit(audit!).state, "complete");
      assert.ok(store.observations(audit!).length > 0);
    } finally {
      store.close();
    }
    const secondTransport = new StdioClientTransport({
      command: process.execPath,
      args: [
        fileURLToPath(new URL("../src/cli.ts", import.meta.url)),
        "mcp",
        "--data",
        directory,
      ],
      stderr: "pipe",
    });
    const second = new Client({ name: "reconnect-client", version: "0.1.0" });
    try {
      await second.connect(secondTransport, { mode: "auto" });
      const status: any = await second.callTool({
        name: "audit_status",
        arguments: { auditId: audit },
      });
      assert.equal(
        JSON.parse(status.content[0].text).coverage.state,
        "complete",
      );
      const pages: any = await second.callTool({
        name: "audit_results",
        arguments: { auditId: audit, view: "pages", limit: 1, offset: 0 },
      });
      assert.equal(JSON.parse(pages.content[0].text).length, 1);
      const store = new Store(directory),
        observation = store.observations(audit!)[0];
      const structured: any = await second.callTool({
        name: "audit_results",
        arguments: {
          auditId: audit,
          view: "structured-data",
          url: observation.url,
          limit: 1,
        },
      });
      const coverageRows = JSON.parse(structured.content[0].text);
      assert.equal(coverageRows.length, 1);
      assert.equal(coverageRows[0].url, observation.url);
      assert.ok(coverageRows[0].coverage);
      const missingCoverage: any = await second.callTool({
        name: "audit_results",
        arguments: {
          auditId: audit,
          view: "structured-data",
          url: fixture.origin + "/not-collected",
        },
      });
      assert.deepEqual(JSON.parse(missingCoverage.content[0].text), []);
      const empty: any = await second.callTool({
        name: "audit_results",
        arguments: { auditId: audit, view: "model-usage" },
      });
      assert.equal(JSON.parse(empty.content[0].text), null);
      assert.deepEqual(
        store.imports(store.audit(audit!).projectId, "model-allowance"),
        [],
      );
      new ModelAllowance(store, audit!).reserve({
        provider: "synthetic-provider",
        model: "synthetic-model@v1",
        purpose: "interpretation",
        outputTokenLimit: 64,
      });
      store.close();
      const usage: any = await second.callTool({
        name: "audit_results",
        arguments: { auditId: audit, view: "model-usage" },
      });
      assert.equal(JSON.parse(usage.content[0].text).reservedGenerations, 1);
      assert.equal(JSON.parse(usage.content[0].text).costMicros, null);
      const resource = await second.readResource({
        uri:
          "evidence://audit/" +
          audit +
          "/page/" +
          encodeURIComponent(observation.url),
      });
      assert.equal(
        JSON.parse((resource.contents[0] as any).text).id,
        observation.id,
      );
      const invalid = await second.callTool({
        name: "control_audit",
        arguments: { auditId: audit, action: "arbitrary-shell" },
      });
      assert.equal(invalid.isError, true);
      const unchanged: any = await second.callTool({
        name: "audit_status",
        arguments: { auditId: audit },
      });
      assert.equal(
        JSON.parse(unchanged.content[0].text).coverage.state,
        "complete",
      );
    } finally {
      await second.close();
    }
  } finally {
    await client.close().catch(() => {});
    await fixture.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test("killed real worker preserves request accounting and explicitly resumes without client ownership", async () => {
  const directory = mkdtempSync(join(tmpdir(), "seo-workbench-recovery-")),
    fixture = await fixtureSite({ slowMs: 150 });
  const { Workbench } = await import("../src/app.ts");
  const { NetworkPolicy } = await import("../src/network.ts");
  const store = new Store(directory),
    app = new Workbench(
      store,
      new NetworkPolicy({ localOrigins: [fixture.origin] }),
    );
  try {
    const { auditId } = app.start(fixture.config);
    let oldOwner: number | null = null;
    const ready = Date.now() + 10000;
    while (Date.now() < ready) {
      const audit = store.audit(auditId);
      if (audit.owner && audit.requests > 0) {
        oldOwner = audit.owner;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    assert.ok(oldOwner);
    const used = store.audit(auditId).requests;
    process.kill(oldOwner!, "SIGKILL");
    let resumed = false;
    const retry = Date.now() + 10000;
    while (Date.now() < retry && !resumed) {
      try {
        app.control(auditId, "resume");
        resumed = true;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
    }
    assert.equal(resumed, true);
    const deadline = Date.now() + 15000;
    while (
      Date.now() < deadline &&
      ["running", "queued", "analyzing"].includes(store.audit(auditId).state)
    )
      await new Promise((resolve) => setTimeout(resolve, 50));
    assert.equal(store.audit(auditId).state, "complete");
    assert.ok(store.audit(auditId).requests > used);
    assert.equal(store.audit(auditId).owner, null);
  } finally {
    store.close();
    await fixture.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test("source and compiled MCP paginate a 1001-page group and expose large immutable evidence in chunks", async () => {
  const { parseConfig, RULESET, hash } = await import("../src/domain.ts");
  const { analyze } = await import("../src/rules.ts");
  const { extract } = await import("../src/extract.ts");
  const directory = mkdtempSync(join(tmpdir(), "seo-mcp-bounds-"));
  const store = new Store(directory);
  const config = parseConfig({
    origins: ["https://www.example.com"],
    seeds: ["https://www.example.com/"],
  });
  const project = store.createProject(config),
    audit = store.createAudit(project);
  const url = config.seeds[0];
  const body =
    "<main>" + "Fictional soup ingredients 🥣. ".repeat(100000) + "</main>";
  const response = {
    url,
    status: 200,
    headers: { "content-type": "text/html" },
    body,
    bodyBase64: Buffer.from(body).toString("base64"),
    bytes: Buffer.byteLength(body),
    requestedAt: new Date().toISOString(),
    durationMs: 1,
    address: "127.0.0.1",
  };
  const observation = {
    id: "synthetic-large-evidence",
    url,
    originalUrl: url,
    finalUrl: url,
    response,
    attempts: [response],
    facts: extract(body, url),
    render: null,
    error: null,
    timestamp: new Date().toISOString(),
  };
  try {
    store.putObservation(audit, observation);
    const sample = analyze({
      config,
      observations: [observation],
      sitemapUrls: new Set(),
      inventoryUrls: new Set(),
    }).find((item) => item.ruleId === "title-review")!;
    assert.ok(sample);
    const urls = Array.from(
      { length: 1001 },
      (_, i) => `https://www.example.com/articles/fictional-template-page-${i}`,
    );
    store.saveAnalysis(
      audit,
      RULESET,
      urls.map((url, i) => ({
        ...sample,
        id: hash(String(i)),
        url,
        evidenceIds: ["synthetic-page-" + i],
      })),
    );
    for (const extension of ["ts", "js"]) {
      const client = new Client({
        name: "synthetic-bounded-evidence-client",
        version: "0.1.0",
      });
      try {
        await client.connect(
          new StdioClientTransport({
            command: process.execPath,
            args: [
              fileURLToPath(
                new URL(
                  `../${extension === "ts" ? "src" : "dist"}/cli.${extension}`,
                  import.meta.url,
                ),
              ),
              "mcp",
              "--data",
              directory,
            ],
            stderr: "pipe",
          }),
          { mode: "auto" },
        );
        const invoke = async (name: string, args: Record<string, unknown>) => {
          const result: any = await client.callTool({ name, arguments: args });
          assert.notEqual(result.isError, true, JSON.stringify(result.content));
          assert.ok(Buffer.byteLength(result.content[0].text) <= 100000);
          return JSON.parse(result.content[0].text);
        };
        const summaries = await invoke("audit_results", {
          auditId: audit,
          view: "groups",
          limit: 1,
        });
        assert.equal(summaries.length, 1);
        assert.equal(summaries[0].totalAffected, 1001);
        assert.equal(summaries[0].membersTruncated, true);
        assert.equal(summaries[0].affected.length, 3);
        const members: string[] = [];
        let offset: number | null = 0;
        while (offset !== null) {
          const page = await invoke("audit_results", {
            auditId: audit,
            view: "group-members",
            groupId: summaries[0].id,
            offset,
            limit: 100,
          });
          members.push(...page.affected);
          offset = page.nextOffset;
        }
        assert.deepEqual(members.toSorted(), urls.toSorted());
        const invalid = await client.callTool({
          name: "audit_results",
          arguments: {
            auditId: audit,
            view: "group-members",
            groupId: "0".repeat(24),
          },
        });
        assert.equal(invalid.isError, true);
        const summary = await invoke("page_evidence", { auditId: audit, url });
        assert.equal(summary.projection, "summary");
        assert.equal(summary.facts.textCharacters, 500000);
        const resource = await client.readResource({
          uri: `evidence://audit/${audit}/page/${encodeURIComponent(url)}`,
        });
        assert.equal(
          JSON.parse((resource.contents[0] as any).text).projection,
          "summary",
        );
        // Reconstruct the entire source, including surrogate pairs split between chunks.
        const chunks: string[] = [];
        offset = 0;
        while (offset !== null) {
          const page = await invoke("page_evidence", {
            auditId: audit,
            url,
            section: "response-body",
            offset,
          });
          assert.equal(page.sha256, hash(body));
          assert.equal(page.totalCharacters, body.length);
          chunks.push(page.chunk);
          offset = page.nextOffset;
        }
        assert.equal(chunks.join(""), body);
        const record = JSON.stringify(store.observation(audit, url));
        for (const start of [0, record.length - 8000, record.length + 1]) {
          const page = await invoke("page_evidence", {
            auditId: audit,
            url,
            section: "record",
            offset: start,
          });
          assert.equal(page.chunk, record.slice(start, start + 8000));
          assert.equal(page.sha256, hash(record));
        }
        const unavailable = await invoke("page_evidence", {
          auditId: audit,
          url,
          section: "rendered-dom",
        });
        assert.equal(unavailable.available, false);
        const malformed = await client.callTool({
          name: "page_evidence",
          arguments: { auditId: audit, url, section: "record", limit: 8001 },
        });
        assert.equal(malformed.isError, true);
      } finally {
        await client.close();
      }
    }
  } finally {
    store.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

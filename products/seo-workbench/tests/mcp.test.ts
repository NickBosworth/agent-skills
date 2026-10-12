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

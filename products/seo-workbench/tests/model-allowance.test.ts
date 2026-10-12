import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn, execFileSync } from "node:child_process";
import { once } from "node:events";
import { Store } from "../src/store.ts";
import { ModelAllowance } from "../src/model-allowance.ts";
import { OllamaProvider } from "../src/ollama.ts";
import { Enrichment } from "../src/enrichment.ts";
import { parseConfig, type Observation } from "../src/domain.ts";
import { extract } from "../src/extract.ts";
import { reportData } from "../src/reports.ts";
import { retentionPlan, applyRetention } from "../src/maintenance.ts";
const input = {
  provider: "synthetic-provider",
  model: "synthetic-model@version-1",
  purpose: "interpretation" as const,
  outputTokenLimit: 64,
};
function setup() {
  const directory = mkdtempSync(
      join(tmpdir(), "seo-workbench-model-allowance-"),
    ),
    store = new Store(directory),
    project = store.createProject(
      parseConfig({
        seeds: ["https://www.example.com/"],
        origins: ["https://www.example.com"],
      }),
    ),
    audit = store.createAudit(project);
  return {
    directory,
    store,
    project,
    audit,
    close() {
      if (store.db.isOpen) store.close();
      rmSync(directory, { recursive: true, force: true });
    },
  };
}
test("audit model limits persist across clients and restarts, consume failures and preserve caller transactions", () => {
  const s = setup();
  try {
    const allowance = new ModelAllowance(s.store, s.audit, {
        maxGenerations: 2,
        maxOutputTokens: 128,
      }),
      first = allowance.reserve(input);
    allowance.finish(first, "failed", null, null);
    const other = new Store(s.directory);
    try {
      const second = new ModelAllowance(other, s.audit).reserve(input);
      assert.throws(
        () => allowance.reserve(input),
        /model-audit-allowance-exhausted/,
      );
      assert.throws(
        () => new ModelAllowance(other, s.audit, {}),
        /model-allowance-change-refused/,
      );
      assert.equal(allowance.summary().reservedOutputTokens, 128);
      assert.equal(allowance.summary().inputTokens, null);
      assert.equal(
        allowance.summary().records.find((r) => r.reservationId === second)
          ?.status,
        "unsettled",
      );
      assert.throws(
        () => allowance.finish(first, "complete", 1, 1),
        /model-reservation-settlement-invalid/,
      );
      s.store.db.exec("BEGIN IMMEDIATE");
      assert.throws(
        () => allowance.reserve(input),
        /database-transaction-active/,
      );
      assert.equal(s.store.db.isTransaction, true);
      s.store.db.exec("ROLLBACK");
    } finally {
      other.close();
    }
    s.store.close();
    const reopened = new Store(s.directory);
    try {
      assert.equal(
        new ModelAllowance(reopened, s.audit).summary().reservedGenerations,
        2,
      );
    } finally {
      reopened.close();
    }
  } finally {
    s.close();
  }
});
test("token caps, unpriced monetary caps, invalid input and provider limit violations fail closed", () => {
  const s = setup();
  try {
    for (const value of [
      { maxGenerations: -1 },
      { maxGenerations: 101 },
      { maxOutputTokens: Infinity },
      { maxOutputTokens: 0.5 },
      { maxCostMicros: -1 },
      { unexpected: true },
    ])
      assert.throws(() => new ModelAllowance(s.store, s.audit, value));
    assert.equal(s.store.imports(s.project, "model-allowance").length, 0);
    const allowance = new ModelAllowance(s.store, s.audit, {
      maxOutputTokens: 64,
    });
    assert.throws(
      () => allowance.reserve({ ...input, outputTokenLimit: 65 }),
      /model-audit-allowance-exhausted/,
    );
    const reserved = allowance.reserve(input);
    allowance.finish(reserved, "complete", 20, 65);
    assert.equal(allowance.summary().records[0].status, "failed");
    assert.throws(
      () => allowance.reserve(input),
      /model-provider-limit-violated/,
    );
    const next = s.store.createAudit(s.project),
      money = new ModelAllowance(s.store, next, { maxCostMicros: 0 });
    assert.throws(() => money.reserve(input), /model-price-unavailable/);
    assert.equal(money.summary().reservedGenerations, 0);
    assert.equal(money.summary().costMicros, null);
  } finally {
    s.close();
  }
});
test("concurrent processes cannot overspend a shared audit allowance", async () => {
  const s = setup(),
    storeURL = new URL("../src/store.ts", import.meta.url).href,
    allowanceURL = new URL("../src/model-allowance.ts", import.meta.url).href;
  try {
    new ModelAllowance(s.store, s.audit, { maxGenerations: 3 });
    const script = `import {Store} from ${JSON.stringify(storeURL)}; import {ModelAllowance} from ${JSON.stringify(allowanceURL)}; const store=new Store(process.argv[1]); try { new ModelAllowance(store, process.argv[2]).reserve(${JSON.stringify(input)}); console.log('reserved'); } catch(error) { if(error.message !== 'model-audit-allowance-exhausted') process.exitCode=1; console.log('blocked'); } finally {store.close();}`;
    const results = await Promise.all(
      Array.from(
        { length: 8 },
        () =>
          new Promise<string>((resolve, reject) => {
            const child = spawn(process.execPath, [
              "--input-type=module",
              "-e",
              script,
              s.directory,
              s.audit,
            ]);
            let output = "";
            child.stdout.on("data", (chunk) => (output += chunk));
            child.on("error", reject);
            child.on("close", (code) =>
              code === 0
                ? resolve(output.trim())
                : reject(new Error("synthetic-reservation-child-failed")),
            );
          }),
      ),
    );
    assert.equal(results.filter((r) => r === "reserved").length, 3);
    assert.equal(
      new ModelAllowance(s.store, s.audit).summary().reservedGenerations,
      3,
    );
  } finally {
    s.close();
  }
});
test("a killed process leaves its committed reservation charged and audit cleanup removes its records", async () => {
  const s = setup(),
    storeURL = new URL("../src/store.ts", import.meta.url).href,
    allowanceURL = new URL("../src/model-allowance.ts", import.meta.url).href;
  let child;
  try {
    new ModelAllowance(s.store, s.audit, { maxGenerations: 1 });
    const script = `import {Store} from ${JSON.stringify(storeURL)}; import {ModelAllowance} from ${JSON.stringify(allowanceURL)}; const store=new Store(process.argv[1]); new ModelAllowance(store, process.argv[2]).reserve(${JSON.stringify(input)}); console.log('reserved'); setInterval(()=>{if(!store.db.isOpen)process.exit(2)},1000);`;
    child = spawn(process.execPath, [
      "--input-type=module",
      "-e",
      script,
      s.directory,
      s.audit,
    ]);
    const [output] = await once(child.stdout, "data");
    assert.equal(String(output).trim(), "reserved");
    const stopped = once(child, "exit");
    child.kill("SIGKILL");
    await stopped;
    const allowance = new ModelAllowance(s.store, s.audit);
    assert.equal(allowance.summary().records[0].status, "unsettled");
    assert.throws(
      () => allowance.reserve(input),
      /model-audit-allowance-exhausted/,
    );
    s.store.deleteAudit(s.audit);
    for (const kind of [
      "model-allowance",
      "model-reservation",
      "model-settlement",
    ])
      assert.deepEqual(s.store.imports(s.project, kind), []);
  } finally {
    child?.kill();
    s.close();
  }
});
test("Ollama probes, interpretation, process cache hits, failures and cancellation use the durable output allowance", async () => {
  const s = setup();
  try {
    const allowance = new ModelAllowance(s.store, s.audit, {
        maxGenerations: 3,
        maxOutputTokens: 128,
      }),
      observation: Observation = {
        id: "00000000-0000-4000-8000-000000000001",
        url: "https://www.example.com/",
        originalUrl: "https://www.example.com/",
        finalUrl: "https://www.example.com/",
        attempts: [],
        response: null,
        facts: extract(
          "<main>Original synthetic guide.</main>",
          "https://www.example.com/",
        ),
        render: null,
        error: null,
        timestamp: new Date().toISOString(),
      };
    const provider = new OllamaProvider(
        "http://127.0.0.1:11434",
        "synthetic-model",
        async (request) => {
          if (request.url.endsWith("/show"))
            return {
              status: 200,
              data: {
                capabilities: ["completion"],
                manifests: [{ selected: true, digest: "synthetic-version-1" }],
              },
            };
          const probe = (request.body as any).options.num_predict === 32;
          return {
            status: 200,
            data: {
              model: "synthetic-model",
              done: true,
              response: JSON.stringify(
                probe
                  ? { supported: true }
                  : {
                      decision: "abstain",
                      rationale: "Synthetic answer needs owner review.",
                      evidenceIds: [],
                      destination: null,
                      reviewRequired: true,
                    },
              ),
              prompt_eval_count: 10,
              eval_count: 5,
            },
          };
        },
        { maxGenerations: 100, allowance },
      ),
      enrichment = new Enrichment(),
      options = {
        consent: true,
        maxCalls: 10,
        maxInputBytes: 24000,
        maxOutputTokens: 64,
        timeoutMs: 1000,
      };
    const first = await enrichment.suggest(provider, [observation], options),
      second = await enrichment.suggest(provider, [observation], options);
    assert.equal(first, second);
    assert.equal(enrichment.usedCalls, 1);
    assert.equal(allowance.summary().reservedGenerations, 3);
    assert.equal(allowance.summary().reservedOutputTokens, 128);
    assert.equal(allowance.summary().outputTokens, 15);
    assert.ok(
      allowance
        .summary()
        .records.every((r) => r.model.endsWith("@synthetic-version-1")),
    );
    await assert.rejects(
      enrichment.suggest(provider, [observation], options),
      /model-audit-allowance-exhausted/,
    );
    const nextAudit = s.store.createAudit(s.project),
      next = new ModelAllowance(s.store, nextAudit, { maxGenerations: 1 });
    const cancelled = new AbortController();
    const stopped = new OllamaProvider(
      "http://127.0.0.1:11434",
      "synthetic-model",
      async (request) => {
        if (request.url.endsWith("/show"))
          return { status: 200, data: { capabilities: ["completion"] } };
        cancelled.abort();
        throw new Error("synthetic-provider-cancelled");
      },
      { allowance: next },
    );
    await assert.rejects(
      stopped.capabilities(cancelled.signal),
      /synthetic-provider-cancelled/,
    );
    assert.equal(next.summary().records[0].status, "failed");
    assert.equal(next.summary().outputTokens, null);
  } finally {
    s.close();
  }
});
test("failed settlement appends roll back without refunding a reservation; actual CLI reads durable usage", () => {
  const s = setup();
  try {
    const allowance = new ModelAllowance(s.store, s.audit),
      reserved = allowance.reserve(input),
      original = s.store.addImport.bind(s.store);
    s.store.addImport = (project, kind, data) => {
      if (kind === "model-settlement")
        throw new Error("synthetic-settlement-failed");
      return original(project, kind, data);
    };
    assert.throws(
      () => allowance.finish(reserved, "complete", 10, 5),
      /synthetic-settlement-failed/,
    );
    assert.equal(s.store.db.isTransaction, false);
    assert.equal(allowance.summary().records[0].status, "unsettled");
    const output = JSON.parse(
      execFileSync(
        process.execPath,
        ["src/cli.ts", "--data", s.directory, "model-usage", s.audit],
        { encoding: "utf8" },
      ),
    );
    assert.equal(output.reservedGenerations, 1);
    assert.equal(output.outputTokens, null);
    assert.equal(output.costMicros, null);
    s.store.addImport = original;
    allowance.finish(reserved, "complete", 10, 5);
    assert.equal(allowance.summary().outputTokens, 5);
  } finally {
    s.close();
  }
});
test("private reports retain bounded usage, shareable reports redact it and retention preserves unbound older advice", () => {
  const s = setup();
  try {
    const allowance = new ModelAllowance(s.store, s.audit),
      reserved = allowance.reserve(input);
    allowance.finish(reserved, "complete", 10, 5);
    s.store.state(s.audit, "complete");
    assert.equal(
      reportData(s.store, s.audit, "private").modelUsage?.reservedGenerations,
      1,
    );
    assert.equal(reportData(s.store, s.audit, "shareable").modelUsage, null);
    s.store.addImport(s.project, "ai-suggestion", { synthetic: true });
    s.store.addImport(s.project, "ai-suggestion", {
      auditId: s.audit,
      synthetic: true,
    });
    s.store.db
      .prepare("UPDATE audits SET updated=? WHERE id=?")
      .run("2020-01-01T00:00:00Z", s.audit);
    const before = "2021-01-01T00:00:00Z",
      plan = retentionPlan(s.store, s.project, before);
    assert.equal(plan.retainedProjectImports, 1);
    applyRetention(s.store, s.project, before, plan.selection);
    assert.deepEqual(s.store.imports(s.project, "model-reservation"), []);
    assert.deepEqual(s.store.imports(s.project, "ai-suggestion"), [
      { synthetic: true },
    ]);
  } finally {
    s.close();
  }
});

test("actual CLI enrichment preserves its first audit allowance and cannot reset it on another invocation", async () => {
  const { createServer } = await import("node:http"),
    { promisify } = await import("node:util"),
    { fixtureSite } = await import("../src/fixtures.ts"),
    { Workbench } = await import("../src/app.ts"),
    { NetworkPolicy } = await import("../src/network.ts"),
    execute = promisify((await import("node:child_process")).execFile),
    s = setup(),
    fixture = await fixtureSite({ fixed: true });
  let generations = 0;
  const service = createServer(async (req, res) => {
    let body = "";
    for await (const chunk of req) body += chunk;
    const value = JSON.parse(body);
    res.setHeader("Content-Type", "application/json");
    if (req.url === "/api/show") {
      res.end(
        JSON.stringify({
          capabilities: ["completion"],
          manifests: [{ selected: true, digest: "synthetic-cli-version" }],
        }),
      );
      return;
    }
    generations++;
    res.end(
      JSON.stringify({
        model: "synthetic-model",
        done: true,
        prompt_eval_count: 10,
        eval_count: 5,
        response: JSON.stringify(
          value.options.num_predict === 32
            ? { supported: true }
            : {
                decision: "abstain",
                rationale: "Synthetic model needs owner review.",
                evidenceIds: [],
                destination: null,
                reviewRequired: true,
              },
        ),
      }),
    );
  });
  await new Promise<void>((resolve) => service.listen(0, "127.0.0.1", resolve));
  try {
    const project = s.store.createProject(
        parseConfig({ ...fixture.config, render: "none" }),
      ),
      audit = s.store.createAudit(project);
    await new Workbench(
      s.store,
      new NetworkPolicy({ localOrigins: [fixture.origin] }),
    ).crawler.run(audit);
    const args = [
      "src/cli.ts",
      "--data",
      s.directory,
      "enrich",
      audit,
      "--authorize-transfer",
      "--model",
      "synthetic-model",
      "--provider-origin",
      "http://127.0.0.1:" + (service.address() as { port: number }).port,
    ];
    const output = await execute(
      process.execPath,
      [...args, "--max-model-generations", "3"],
      { timeout: 10000 },
    );
    const record = JSON.parse(output.stdout).suggestion;
    assert.equal(record.auditId, audit);
    assert.equal(record.auditUsage.reservedGenerations, 2);
    const repeated = JSON.parse(
      (await execute(process.execPath, args, { timeout: 10000 })).stdout,
    ).suggestion;
    assert.equal(repeated.cacheHit, true);
    assert.equal(repeated.usage, null);
    assert.equal(repeated.providerUsage.reservedGenerations, 1);
    assert.equal(repeated.providerUsage.records[0].purpose, "schema-probe");
    assert.equal(repeated.auditUsage.reservedGenerations, 3);
    await assert.rejects(
      execute(process.execPath, args, { timeout: 10000 }),
      (error: any) =>
        error.stderr.includes(
          "This audit has used its generation or output allowance.",
        ),
    );
    await assert.rejects(
      execute(process.execPath, [...args, "--max-model-generations", "4"], {
        timeout: 10000,
      }),
      (error: any) =>
        error.stderr.includes("This audit already has different model limits."),
    );
    assert.equal(generations, 3);
    assert.equal(
      new ModelAllowance(s.store, audit).summary().reservedGenerations,
      3,
    );
  } finally {
    await new Promise<void>((resolve) => service.close(() => resolve()));
    await fixture.close();
    s.close();
  }
});

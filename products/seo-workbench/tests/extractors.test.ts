import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  extractCustomFacts,
  type TrustedExtractor,
} from "../src/extractors.ts";
import { supportLinkFacts } from "../examples/trusted-extractor.ts";
import { localContractProvider } from "../examples/trusted-provider.ts";
import { extract } from "../src/extract.ts";
import { parseConfig, type Observation } from "../src/domain.ts";
import { Crawler } from "../src/crawler.ts";
import { Workbench } from "../src/app.ts";
import { Store } from "../src/store.ts";
import { NetworkPolicy } from "../src/network.ts";
import { fixtureSite } from "../src/fixtures.ts";
import { exportReport } from "../src/reports.ts";
import { Enrichment } from "../src/enrichment.ts";

function page(html = '<nav><a href="/help">Help</a></nav>'): Observation {
  const url = "https://www.example.com/",
    timestamp = "2026-09-01T00:00:00Z",
    body = "<title>Fictional page</title><main>" + html + "</main>";
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
  return {
    id: randomUUID(),
    url,
    originalUrl: url,
    finalUrl: url,
    timestamp,
    response,
    attempts: [response],
    facts: extract(body, url),
    render: null,
    error: null,
  };
}
test("the trusted extractor example returns concrete facts with deterministic versioned capture identities", () => {
  const observation = page(),
    original = JSON.stringify(observation),
    first = extractCustomFacts(observation, [supportLinkFacts]);
  assert.equal(first[0].status, "observed");
  assert.equal(first[0].facts?.supportLinkPresent, true);
  assert.deepEqual(extractCustomFacts(observation, [supportLinkFacts]), first);
  assert.equal(JSON.stringify(observation), original);
  assert.notEqual(
    extractCustomFacts(observation, [
      {
        ...supportLinkFacts,
        definition: { ...supportLinkFacts.definition, version: "2.0.0" },
      },
    ])[0].id,
    first[0].id,
  );
  assert.equal(
    extractCustomFacts(page("No support link was collected."), [
      supportLinkFacts,
    ])[0].facts?.supportLinkPresent,
    false,
  );
});
test("missing, projected, redirected or failed requested evidence never runs the extractor", () => {
  let calls = 0;
  const extractor = {
    ...supportLinkFacts,
    extract: () => {
      calls++;
      return {
        status: "observed",
        facts: { present: true },
        reason: "Synthetic output.",
      };
    },
  };
  const original = page();
  for (const missing of [
    { ...original, response: null, facts: null },
    { ...original, evidenceProjection: "facts-only" as const },
    { ...original, finalUrl: original.url + "destination" },
    { ...original, response: { ...original.response!, status: 404 } },
  ])
    assert.equal(
      extractCustomFacts(missing, [extractor])[0].status,
      "not-tested",
    );
  for (const render of [
    null,
    { status: "error" as const, reason: "synthetic-render-error" },
    { status: "observed" as const },
  ])
    assert.equal(
      extractCustomFacts({ ...original, render }, [
        {
          ...extractor,
          definition: { ...extractor.definition, prerequisite: "rendered" },
        },
      ])[0].status,
      "not-tested",
    );
  assert.equal(calls, 0);
  assert.equal(
    extractCustomFacts(
      {
        ...original,
        facts: null,
        render: {
          status: "observed",
          dom: "<main>Fictional browser content</main>",
        },
      },
      [
        {
          ...extractor,
          definition: { ...extractor.definition, prerequisite: "rendered" },
        },
      ],
    )[0].status,
    "observed",
  );
});
test("bad definitions and duplicate IDs are refused before callbacks; copies preserve original evidence", () => {
  const observation = page();
  let calls = 0;
  const extractor = {
    ...supportLinkFacts,
    extract: () => {
      calls++;
      throw new Error("fictional private diagnostic");
    },
  };
  assert.throws(
    () => extractCustomFacts(observation, [extractor, extractor]),
    /extractor-id-conflict/,
  );
  for (const definition of [
    { ...extractor.definition, id: "" },
    { ...extractor.definition, prerequisite: "unknown" },
    { ...extractor.definition, extra: "unknown" },
  ])
    assert.throws(
      () =>
        extractCustomFacts(observation, [{ ...extractor, definition } as any]),
      /extractor-definition-invalid/,
    );
  assert.throws(
    () =>
      extractCustomFacts(
        observation,
        Array.from({ length: 101 }, () => extractor),
      ),
    /extractor-definition-invalid/,
  );
  assert.equal(calls, 0);
  const original = JSON.stringify(observation);
  const result = extractCustomFacts(observation, [
    {
      ...supportLinkFacts,
      extract: (copy) => {
        copy.url = "https://www.example.org/changed";
        copy.facts!.text = "Changed fictional text";
        return {
          status: "observed",
          facts: { present: true },
          reason: "A fictional detached-copy test.",
        };
      },
    },
  ]);
  assert.equal(result[0].observationId, observation.id);
  assert.equal(JSON.stringify(observation), original);
});
test("invalid, asynchronous, oversized and throwing output becomes an explicit error without private diagnostics", async () => {
  const observation = page(),
    cyclic: any = {};
  cyclic.self = cyclic;
  for (const output of [
    { status: "observed", facts: null, reason: "Nothing." },
    { status: "observed", facts: {}, reason: "Empty facts." },
    {
      status: "observed",
      facts: { present: true },
      reason: "Output.",
      observationId: "invented",
    },
    { status: "observed", facts: { value: Infinity }, reason: "Nonfinite." },
    { status: "observed", facts: { value: cyclic }, reason: "Cyclic." },
    {
      status: "observed",
      facts: { text: "x".repeat(100001) },
      reason: "Oversized.",
    },
    Promise.reject(new Error("fictional private diagnostic")),
  ]) {
    const result = extractCustomFacts(observation, [
      { ...supportLinkFacts, extract: () => output },
    ]);
    assert.equal(result[0].status, "error");
    assert.equal(result[0].facts, null);
    assert.ok(!JSON.stringify(result).includes("fictional private diagnostic"));
  }
  const result = extractCustomFacts(observation, [
    {
      ...supportLinkFacts,
      extract: () => {
        throw new Error("fictional private diagnostic");
      },
    },
  ]);
  assert.equal(result[0].status, "error");
  await new Promise((resolve) => setImmediate(resolve));
});
test("actual crawling persists extractor facts once; reanalysis retains captures and private/shareable boundaries", async () => {
  const directory = mkdtempSync(join(tmpdir(), "extractor-crawl-")),
    store = new Store(directory),
    fixture = await fixtureSite({ fixed: true });
  try {
    const config = parseConfig({ ...fixture.config, render: "none" }),
      project = store.createProject(config),
      audit = store.createAudit(project),
      crawler = new Crawler(
        store,
        new NetworkPolicy({ localOrigins: [fixture.origin] }),
        [supportLinkFacts],
      );
    await crawler.run(audit);
    const observed = store.observation(audit, fixture.origin + "/")!,
      original = JSON.stringify(observed);
    assert.equal(
      observed.extensionFacts![0].extractorId,
      "owner-support-links",
    );
    assert.deepEqual(
      store
        .analysisObservations(audit)
        .find((record) => record.id === observed.id)?.extensionFacts,
      observed.extensionFacts,
    );
    crawler.reevaluate(audit);
    assert.equal(
      JSON.stringify(store.observation(audit, fixture.origin + "/")),
      original,
    );
    const privateReport = JSON.parse(
        exportReport(store, audit, "json", "private"),
      ),
      shared = JSON.parse(exportReport(store, audit, "json", "shareable"));
    assert.ok(privateReport.extractorFacts.length > 0);
    assert.ok(
      (store.coverage(audit).extractors as any[]).some(
        (record) =>
          record.extractorId === "owner-support-links" &&
          record.status === "observed",
      ),
    );
    assert.ok(
      exportReport(store, audit, "html", "private").includes(
        "Custom extractors returned facts",
      ),
    );
    assert.ok(
      !exportReport(store, audit, "html", "shareable").includes(
        "owner-support-links",
      ),
    );
    assert.deepEqual(shared.extractorFacts, []);
  } finally {
    store.close();
    await fixture.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
test("extractor namespaces are charged before decoding projected analysis, even without initial HTML facts", () => {
  const directory = mkdtempSync(join(tmpdir(), "extractor-budget-")),
    store = new Store(directory);
  try {
    const config = parseConfig({
        origins: ["https://www.example.com"],
        seeds: ["https://www.example.com/"],
        maxMemoryBytes: 33554432,
      }),
      project = store.createProject(config),
      audit = store.createAudit(project),
      observation = { ...page(), facts: null };
    const extractors: TrustedExtractor[] = Array.from(
      { length: 100 },
      (_, index) => ({
        definition: {
          ...supportLinkFacts.definition,
          id: `fictional-extractor-${index}`,
          prerequisite: "response",
        },
        extract: () => ({
          status: "observed",
          facts: { text: "界".repeat(30000) },
          reason: "A wholly synthetic UTF-8 capacity fixture.",
        }),
      }),
    );
    observation.extensionFacts = extractCustomFacts(observation, extractors);
    store.putObservation(audit, observation);
    assert.throws(
      () => store.analysisObservations(audit),
      /analysis-memory-budget/,
    );
  } finally {
    store.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
test("trusted provider definitions require literal consent and valid identities before callbacks", async () => {
  const observations = [
      page("<p>Fictional explanatory content for the contract test.</p>"),
    ],
    options = {
      consent: true,
      maxCalls: 1,
      maxInputBytes: 32768,
      maxOutputTokens: 100,
      timeoutMs: 1000,
    };
  let calls = 0;
  const provider = {
    ...localContractProvider,
    capabilities: async (signal: AbortSignal) => {
      calls++;
      return localContractProvider.capabilities(signal);
    },
  };
  for (const consent of [false, "yes", 1, null])
    await assert.rejects(
      new Enrichment().suggest(provider, observations, {
        ...options,
        consent,
      } as any),
      /provider-transfer-consent-required/,
    );
  for (const id of ["", "   ", "fictional\u0000provider", "x".repeat(501)])
    await assert.rejects(
      new Enrichment().suggest({ ...provider, id }, observations, options),
      /provider-definition-invalid/,
    );
  assert.equal(calls, 0);
  const record: any = await new Enrichment().suggest(
    provider,
    observations,
    options,
  );
  assert.equal(record.suggestion.decision, "abstain");
  assert.equal(record.model, "synthetic-contract-1");
  assert.equal(record.cost, null);
});

test("provider provenance is fixed at validation and probe even if a trusted adapter mutates its own fields", async () => {
  const observation = page(
      "<p>Fictional explanatory content for the contract test.</p>",
    ),
    options = {
      consent: true,
      maxCalls: 1,
      maxInputBytes: 32768,
      maxOutputTokens: 100,
      timeoutMs: 1000,
    };
  const capability = {
    model: "synthetic-probed-1",
    json: true,
    maxInputBytes: 32768,
  };
  const provider = {
    ...localContractProvider,
    id: "synthetic-original-provider",
    async capabilities() {
      this.id = "synthetic-later-provider";
      return capability;
    },
    async interpret(packet: any, parameters: any) {
      capability.model = "synthetic-later-model";
      return localContractProvider.interpret(packet, parameters);
    },
  };
  const result: any = await new Enrichment().suggest(
    provider,
    [observation],
    options,
  );
  assert.equal(result.provider, "synthetic-original-provider");
  assert.equal(result.model, "synthetic-probed-1");
  for (const model of ["   ", "fictional\u0000model"])
    await assert.rejects(
      new Enrichment().suggest(
        {
          ...localContractProvider,
          capabilities: async () => ({
            model,
            json: true,
            maxInputBytes: 32768,
          }),
        },
        [observation],
        options,
      ),
      /provider-capability-invalid/,
    );
});

test("extractor object methods keep their trusted receiver while input mutations stay detached", () => {
  const extractor = {
    definition: supportLinkFacts.definition,
    calls: 0,
    extract(copy: Observation) {
      this.calls++;
      copy.facts!.title = "Changed fictional title";
      return {
        status: "observed",
        facts: { extractor: this.definition.id },
        reason: "A fictional method-receiver check.",
      };
    },
  };
  const observation = page(),
    original = JSON.stringify(observation),
    result = extractCustomFacts(observation, [extractor]);
  assert.equal(extractor.calls, 1);
  assert.equal(result[0].facts?.extractor, extractor.definition.id);
  assert.equal(JSON.stringify(observation), original);
});

test("project JSON and serialised definitions cannot select extractor modules or executable callbacks", () => {
  const config = {
    origins: ["https://www.example.com"],
    seeds: ["https://www.example.com/"],
  };
  assert.throws(() =>
    parseConfig({
      ...config,
      extractors: ["../examples/trusted-extractor.ts"],
    }),
  );
  const imported = JSON.parse(JSON.stringify([supportLinkFacts]));
  assert.throws(
    () => extractCustomFacts(page(), imported),
    /extractor-definition-invalid/,
  );
  assert.throws(
    () =>
      extractCustomFacts(page(), [
        {
          definition: supportLinkFacts.definition,
          extract: "../examples/trusted-extractor.ts",
        },
      ] as any),
    /extractor-definition-invalid/,
  );
});

test("paused extraction resumes only with the original registered definitions; refusal preserves state and ownership", () => {
  const directory = mkdtempSync(join(tmpdir(), "extractor-resume-")),
    store = new Store(directory);
  try {
    const config = parseConfig({
        origins: ["https://www.example.com"],
        seeds: ["https://www.example.com/"],
      }),
      project = store.createProject(config),
      audit = store.createAudit(project),
      definitions = [supportLinkFacts.definition];
    store.claim(audit, definitions);
    store.state(audit, "paused", "user-paused");
    store.release(audit);
    assert.throws(
      () => new Workbench(store).control(audit, "resume"),
      /extractor-manifest-mismatch/,
    );
    assert.equal(store.audit(audit).state, "paused");
    store.resume(audit);
    const before = JSON.stringify(store.audit(audit));
    assert.throws(() => store.claim(audit), /extractor-manifest-mismatch/);
    assert.equal(JSON.stringify(store.audit(audit)), before);
    assert.equal(store.ownedAudits().length, 0);
    assert.throws(
      () =>
        store.claim(audit, [
          { ...supportLinkFacts.definition, version: "2.0.0" },
        ]),
      /extractor-manifest-mismatch/,
    );
    const reordered = Object.fromEntries(
      Object.entries(supportLinkFacts.definition).reverse(),
    ) as typeof supportLinkFacts.definition;
    store.claim(audit, [reordered]);
    store.state(audit, "paused", "user-paused");
    store.release(audit);
    assert.equal(
      (store.events(audit) as any[]).filter(
        (event) => event.kind === "extractor-manifest",
      ).length,
      1,
    );
    const old = store.createAudit(project);
    store.putObservation(old, page());
    assert.throws(
      () => store.claim(old, definitions),
      /extractor-manifest-missing/,
    );
    assert.equal(store.audit(old).owner, null);
  } finally {
    store.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

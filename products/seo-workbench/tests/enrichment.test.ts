import test from "node:test";
import assert from "node:assert/strict";
import { Enrichment, type EnrichmentProvider } from "../src/enrichment.ts";
import { extract } from "../src/extract.ts";
import type { Observation } from "../src/domain.ts";
const o: Observation = {
  id: "00000000-0000-4000-8000-000000000001",
  url: "https://www.example.com/",
  originalUrl: "https://www.example.com/",
  finalUrl: "https://www.example.com/",
  timestamp: "2026-10-11T00:00:00Z",
  response: null,
  attempts: [],
  render: null,
  error: null,
  facts: extract(
    "<main>Original synthetic evidence</main>",
    "https://www.example.com/",
  ),
};
const options = {
  consent: true,
  maxCalls: 2,
  maxInputBytes: 10000,
  maxOutputTokens: 100,
  timeoutMs: 100,
};
const response = {
  decision: "improve-existing",
  rationale: "Synthetic contract example, not live AI advice",
  evidenceIds: [o.id],
  destination: o.url,
  reviewRequired: true,
};
const mock = (value: unknown): EnrichmentProvider => ({
  id: "mock-provider",
  capabilities: async () => ({
    model: "mock-model",
    json: true,
    maxInputBytes: 10000,
  }),
  interpret: async () => value,
});
test("optional enrichment requires explicit transfer consent and caches bounded evidence", async () => {
  const enrichment = new Enrichment();
  await assert.rejects(
    enrichment.suggest(mock(response), [o], { ...options, consent: false }),
  );
  const first = await enrichment.suggest(mock(response), [o], options),
    second = await enrichment.suggest(mock(response), [o], options);
  assert.deepEqual(first, second);
  assert.equal(enrichment.usedCalls, 1);
});
test("optional enrichment rejects invented evidence, destinations and invalid schema", async () => {
  for (const value of [
    { ...response, evidenceIds: ["00000000-0000-4000-8000-000000000002"] },
    { ...response, destination: "https://other.example/" },
    { ...response, removeFindings: true },
    { ...response, evidenceIds: [] },
  ])
    await assert.rejects(new Enrichment().suggest(mock(value), [o], options));
});
test("optional enrichment times out stalled provider; no fallback is selected", async () => {
  const provider = {
    ...mock(response),
    interpret: () => new Promise(() => {}),
  };
  await assert.rejects(
    new Enrichment().suggest(provider, [o], options),
    /provider-timeout/,
  );
});
test("optional enrichment supports abstention, capability refusal and budgets", async () => {
  const abstain = await new Enrichment().suggest(
    mock({
      ...response,
      decision: "abstain",
      destination: null,
      evidenceIds: [],
    }),
    [o],
    options,
  );
  assert.ok(abstain);
  await assert.rejects(
    new Enrichment().suggest(
      {
        ...mock(response),
        capabilities: async () => ({
          model: "mock",
          json: false,
          maxInputBytes: 1000,
        }),
      },
      [o],
      options,
    ),
  );
  await assert.rejects(
    new Enrichment().suggest(mock(response), [o], {
      ...options,
      maxInputBytes: 1,
    }),
  );
  await assert.rejects(
    new Enrichment().suggest(mock(response), [o], { ...options, maxCalls: 0 }),
  );
});

test("optional model budgets reject invalid numbers before probing or transferring evidence", async () => {
  let probes = 0,
    transfers = 0;
  const provider = {
    ...mock(response),
    capabilities: async () => {
      probes++;
      return { model: "mock", json: true, maxInputBytes: 10000 };
    },
    interpret: async () => {
      transfers++;
      return response;
    },
  };
  for (const [name, values] of Object.entries({
    maxCalls: [NaN, Infinity, -1, 0.5],
    maxInputBytes: [NaN, Infinity, 0, -1, 0.5],
    timeoutMs: [NaN, Infinity, 99, 60001, 100.5],
  }))
    for (const value of values)
      await assert.rejects(
        new Enrichment().suggest(provider, [o], { ...options, [name]: value }),
      );
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    new Enrichment().suggest(provider, [o], {
      ...options,
      signal: controller.signal,
    }),
    /provider-timeout-or-cancelled/,
  );
  assert.equal(probes, 0);
  assert.equal(transfers, 0);
  for (const maxInputBytes of [NaN, Infinity, 0, -1, 0.5]) {
    await assert.rejects(
      new Enrichment().suggest(
        {
          ...provider,
          capabilities: async () => ({
            model: "mock",
            json: true,
            maxInputBytes,
          }),
        },
        [o],
        options,
      ),
      /provider-capability-invalid/,
    );
  }
  assert.equal(transfers, 0);
});

test("concurrent optional model requests cannot exceed the interpretation allowance", async () => {
  const enrichment = new Enrichment();
  let release!: () => void,
    transfers = 0;
  const ready = new Promise<void>((resolve) => {
    release = resolve;
  });
  const provider = {
    ...mock(response),
    capabilities: async () => {
      await ready;
      return { model: "mock", json: true, maxInputBytes: 10000 };
    },
    interpret: async () => {
      transfers++;
      await new Promise((resolve) => setTimeout(resolve, 10));
      return response;
    },
  };
  const first = enrichment.suggest(provider, [o], { ...options, maxCalls: 1 });
  const second = enrichment.suggest(provider, [o], { ...options, maxCalls: 1 });
  release();
  const outcomes = await Promise.allSettled([first, second]);
  assert.equal(outcomes.filter((r) => r.status === "fulfilled").length, 1);
  const refusal = outcomes.find(
    (r) => r.status === "rejected",
  ) as PromiseRejectedResult;
  assert.match(refusal.reason.message, /provider-call-budget/);
  assert.equal(transfers, 1);
  assert.equal(enrichment.usedCalls, 1);
});

test("cached model advice cannot silently reuse a different output allowance", async () => {
  const enrichment = new Enrichment();
  let transfers = 0;
  const provider = {
    ...mock(response),
    interpret: async () => {
      transfers++;
      return response;
    },
  };
  await enrichment.suggest(provider, [o], options);
  await enrichment.suggest(provider, [o], { ...options, maxOutputTokens: 50 });
  assert.equal(transfers, 2);
});

test("saved advice can seed a fresh process cache only when its complete identity and cited evidence still match", async () => {
  const first = (await new Enrichment().suggest(
    mock(response),
    [o],
    options,
  )) as any;
  let calls = 0;
  const provider = {
    ...mock(response),
    interpret: async () => {
      calls++;
      return response;
    },
  };
  const restored = new Enrichment();
  restored.cache.set(first.evidenceHash, first);
  assert.equal(await restored.suggest(provider, [o], options), first);
  assert.equal(restored.cacheHits, 1);
  assert.equal(calls, 0);
  await restored.suggest(provider, [o], {
    ...options,
    maxOutputTokens: options.maxOutputTokens + 1,
  });
  assert.equal(calls, 1);
  const changed = {
    ...provider,
    capabilities: async () => ({
      model: "mock-version-2",
      json: true,
      maxInputBytes: 10000,
    }),
  };
  await restored.suggest(changed, [o], { ...options, maxCalls: 5 });
  assert.equal(calls, 2);
  for (const patch of [
    { provider: "wrong-provider" },
    { model: "wrong-version" },
    { promptVersion: "wrong-prompt" },
    { status: "approved" },
    { evidenceIds: [] },
    {
      suggestion: {
        ...response,
        evidenceIds: ["00000000-0000-4000-8000-000000000099"],
      },
    },
  ]) {
    const corrupted = new Enrichment();
    corrupted.cache.set(first.evidenceHash, { ...first, ...patch });
    await assert.rejects(corrupted.suggest(provider, [o], options));
  }
  assert.equal(calls, 2);
});

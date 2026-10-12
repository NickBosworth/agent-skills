import test from "node:test";
import assert from "node:assert/strict";
import {
  collectSearchConsole,
  inspectIndexedURL,
  collectCrUX,
  collectPageSpeed,
  type ProviderTransport,
} from "../src/providers.ts";
const url = "https://www.example.com/";
const token = "unusable-synthetic-credential";
test("provider records cannot substitute another page or device; CrUX normalization needs matching evidence", async () => {
  const record = {
    key: { url, formFactor: "PHONE" },
    collectionPeriod: {
      firstDate: { year: 2026, month: 9, day: 1 },
      lastDate: { year: 2026, month: 9, day: 28 },
    },
    metrics: { largest_contentful_paint: { percentiles: { p75: 1500 } } },
  };
  const run = (data: unknown) =>
    collectCrUX({ url, apiKey: token, authorizedTransfer: true }, async () => ({
      status: 200,
      data,
    }));
  for (const key of [
    { url: "https://www.example.com/other", formFactor: "PHONE" },
    { url, formFactor: "DESKTOP" },
    { url },
    { url, origin: "https://www.example.com", formFactor: "PHONE" },
  ])
    await assert.rejects(run({ record: { ...record, key } }));
  const normalized = "https://www.example.com/normalized";
  const accepted = await run({
    record: { ...record, key: { url: normalized, formFactor: "PHONE" } },
    urlNormalizationDetails: { originalUrl: url, normalizedUrl: normalized },
  });
  assert.equal(accepted.status, "observed");
  if (accepted.status === "observed") {
    assert.equal(accepted.requestedUrl, url);
    assert.equal(accepted.measurement.url, normalized);
    assert.deepEqual(accepted.normalization, {
      originalUrl: url,
      normalizedUrl: normalized,
    });
  }
  await assert.rejects(
    run({
      record: {
        ...record,
        key: { url: "https://other.example/", formFactor: "PHONE" },
      },
      urlNormalizationDetails: {
        originalUrl: url,
        normalizedUrl: "https://other.example/",
      },
    }),
  );
  await assert.rejects(
    run({
      record: {
        ...record,
        collectionPeriod: {
          firstDate: { year: 2026, month: 10, day: 1 },
          lastDate: { year: 2026, month: 9, day: 28 },
        },
      },
    }),
    /performance-provenance-invalid/,
  );
  const lhr = {
    lighthouseVersion: "synthetic",
    requestedUrl: url,
    finalUrl: url + "redirected",
    fetchTime: "2026-10-11T00:00:00Z",
    configSettings: { formFactor: "mobile" },
    audits: {},
  };
  const lab = (value: unknown) =>
    collectPageSpeed(
      { url, authorizedTransfer: true, repeats: 1 },
      async () => ({ status: 200, data: { lighthouseResult: value } }),
    );
  await assert.rejects(
    lab({ ...lhr, requestedUrl: url + "other" }),
    /provider-lab-identity-mismatch/,
  );
  await assert.rejects(
    lab({ ...lhr, configSettings: { formFactor: "desktop" } }),
    /provider-lab-device-mismatch/,
  );
  const redirected = await lab(lhr);
  assert.equal(redirected.measurements[0].url, lhr.finalUrl);
});
test("Search Console adapter preserves dimensions, scope and top-row limitations without persisting token", async () => {
  const calls: unknown[] = [];
  const transport: ProviderTransport = async (request) => {
    calls.push(request);
    assert.equal(
      (request.body as Record<string, unknown>).aggregationType,
      "auto",
    );
    assert.deepEqual((request.body as Record<string, unknown>).dimensions, [
      "page",
      "query",
      "country",
      "device",
    ]);
    assert.ok(
      request.url.startsWith("https://www.googleapis.com/webmasters/v3/"),
    );
    return {
      status: 200,
      data: {
        responseAggregationType: "byPage",
        rows: [
          {
            keys: [url, "synthetic guide", "gbr", "DESKTOP"],
            clicks: 5,
            impressions: 50,
            position: 3,
          },
        ],
      },
    };
  };
  const result = await collectSearchConsole(
    {
      property: url,
      startDate: "2026-09-01",
      endDate: "2026-09-30",
      token,
      authorizedTransfer: true,
      maxRows: 10,
    },
    transport,
  );
  assert.equal(result.rows[0].device, "DESKTOP");
  assert.equal(result.rows[0].clicks, 5);
  assert.equal(result.complete, false);
  assert.equal(result.method, "API import");
  assert.ok(!JSON.stringify(result).includes(token));
  assert.equal(calls.length, 1);
  await assert.rejects(
    collectSearchConsole(
      {
        property: url,
        startDate: "2026-09-01",
        endDate: "2026-09-30",
        token,
        authorizedTransfer: false,
      },
      transport,
    ),
  );
});
test("Search Console authorization/quota errors never yield absent-feature or healthy results", async () => {
  for (const status of [401, 403, 429, 500])
    await assert.rejects(
      collectSearchConsole(
        {
          property: url,
          startDate: "2026-09-01",
          endDate: "2026-09-30",
          token,
          authorizedTransfer: true,
        },
        async () => ({ status, data: {} }),
      ),
    );
});
test("URL Inspection adapter labels indexed snapshot, not live crawl or full inventory", async () => {
  const result = await inspectIndexedURL(
    { property: url, url, token, authorizedTransfer: true },
    async (request) => {
      assert.ok(request.url.endsWith("/v1/urlInspection/index:inspect"));
      return {
        status: 200,
        data: {
          inspectionResult: {
            indexStatusResult: {
              verdict: "PASS",
              coverageState: "Synthetic indexed snapshot",
              googleCanonical: url,
              lastCrawlTime: "2026-09-10T00:00:00Z",
            },
          },
        },
      };
    },
  );
  assert.equal(result.observation, "indexed version, not live test");
  assert.equal(result.data?.googleCanonical, url);
  assert.ok(!JSON.stringify(result).includes(token));
});
test("CrUX missing coverage stays unavailable; explicit fallback remains origin-scoped", async () => {
  const unavailable = await collectCrUX(
    { url, apiKey: token, authorizedTransfer: true },
    async () => ({ status: 404, data: {} }),
  );
  assert.equal(unavailable.status, "unavailable");
  let calls = 0;
  const result = await collectCrUX(
    { url, apiKey: token, authorizedTransfer: true, originFallback: true },
    async (request) => {
      calls++;
      if (calls === 1) return { status: 404, data: {} };
      assert.ok("origin" in (request.body as any));
      return {
        status: 200,
        data: {
          record: {
            key: { origin: "https://www.example.com", formFactor: "PHONE" },
            collectionPeriod: {
              firstDate: { year: 2026, month: 9, day: 1 },
              lastDate: { year: 2026, month: 9, day: 28 },
            },
            metrics: {
              largest_contentful_paint: { percentiles: { p75: 1500 } },
              cumulative_layout_shift: { percentiles: { p75: "0.05" } },
            },
          },
        },
      };
    },
  );
  assert.equal(result.status, "observed");
  if (result.status === "observed") {
    assert.equal(result.measurement.scope, "origin");
    assert.equal(result.measurement.metrics.inpMs, null);
    assert.equal(result.measurement.metrics.lcpMs, 1500);
    assert.equal(result.measurement.percentile, 75);
  }
  assert.equal(calls, 2);
});
test("PageSpeed lab repeats expose variability and never substitute TBT for field INP", async () => {
  let calls = 0;
  const result = await collectPageSpeed(
    { url, authorizedTransfer: true, repeats: 3 },
    async (request) => {
      calls++;
      assert.ok(
        request.url.startsWith(
          "https://www.googleapis.com/pagespeedonline/v5/runPagespeed?",
        ),
      );
      return {
        status: 200,
        data: {
          lighthouseResult: {
            lighthouseVersion: "synthetic-13",
            requestedUrl: url,
            finalUrl: url,
            fetchTime: "2026-10-11T00:00:00Z",
            configSettings: { formFactor: "mobile" },
            audits: {
              "largest-contentful-paint": { numericValue: 1000 + calls * 100 },
              "total-blocking-time": { numericValue: 30 },
              "cumulative-layout-shift": { numericValue: 0.02 },
            },
            runWarnings: [],
          },
        },
      };
    },
  );
  assert.equal(result.measurements.length, 3);
  assert.equal(result.variability.lcpMs?.minimum, 1100);
  assert.equal(result.variability.lcpMs?.median, 1200);
  assert.equal(result.measurements[0].metrics.inpMs, null);
  assert.equal(result.measurements[0].metrics.tbtMs, 30);
  assert.equal(result.measurements[0].collectionStart, null);
});
test("provider malformed metrics and runtime failures do not create successful measurements", async () => {
  await assert.rejects(
    collectCrUX({ url, apiKey: token, authorizedTransfer: true }, async () => ({
      status: 200,
      data: { record: {} },
    })),
  );
  await assert.rejects(
    collectPageSpeed(
      { url, authorizedTransfer: true, repeats: 1 },
      async () => ({
        status: 200,
        data: {
          lighthouseResult: {
            lighthouseVersion: "synthetic",
            requestedUrl: url,
            finalUrl: url,
            fetchTime: "2026-10-11T00:00:00Z",
            audits: {},
            runtimeError: { code: "fixture-error" },
          },
        },
      }),
    ),
  );
});

test("native Google transport rejects pre-cancelled requests before resolving or sending credentials", async () => {
  const { googleTransport } = await import("../src/providers.ts");
  await assert.rejects(
    googleTransport({
      url: "https://www.googleapis.com/pagespeedonline/v5/runPagespeed",
      method: "GET",
      headers: {},
      signal: AbortSignal.abort(),
    }),
    /cancelled/,
  );
});

test("native provider transport rejects unrelated Google routes and methods before network access", async () => {
  const { googleTransport } = await import("../src/providers.ts");
  for (const [url, method] of [
    ["https://www.googleapis.com/drive/v3/files", "GET"],
    ["https://www.googleapis.com/pagespeedonline/v5/runPagespeed", "POST"],
    [
      "https://chromeuxreport.googleapis.com/pagespeedonline/v5/runPagespeed",
      "GET",
    ],
    [
      "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect",
      "GET",
    ],
  ] as const)
    await assert.rejects(
      googleTransport({
        url,
        method,
        headers: { Authorization: "Bearer unusable-synthetic-credential" },
        signal: AbortSignal.abort(),
      }),
      /provider-endpoint-blocked/,
    );
});

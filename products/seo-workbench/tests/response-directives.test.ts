import test from "node:test";
import assert from "node:assert/strict";
import { headerCanonicals, headerNoindex } from "../src/response-directives.ts";
import { fixtureSite } from "../src/fixtures.ts";
import { NetworkPolicy, Transport } from "../src/network.ts";
import { parseConfig } from "../src/domain.ts";

test("canonical response fields preserve commas, quoted parameters and relation tokens", () => {
  const base = "https://www.example.com/document";
  assert.deepEqual(
    headerCanonicals(
      '</preferred?a=1,b=2>; title="A comma, semicolon; rel=\\"alternate\\""; rel="alternate canonical", </asset>; rel=preload',
      base,
    ),
    { targets: ["https://www.example.com/preferred?a=1,b=2"], complete: true },
  );
  assert.deepEqual(headerCanonicals(undefined, base), {
    targets: [],
    complete: true,
  });
  assert.deepEqual(headerCanonicals('</preferred>; rel="canoni\\cal"', base), {
    targets: ["https://www.example.com/preferred"],
    complete: true,
  });
  for (const value of [
    '</preferred>; rel="canonical"; anchor="/other"',
    "</preferred>; rel*=canonical",
    "</preferred>; rel=canonical; rel=alternate",
    '</preferred>; rel="canonical',
    "<file:///path/to/synthetic>; rel=canonical",
    "not a link",
  ])
    assert.equal(headerCanonicals(value, base).complete, false, value);
  assert.deepEqual(
    headerCanonicals(
      '</preferred>; title="Text mentioning rel=canonical"',
      base,
    ),
    { targets: [], complete: true },
  );
});

test("indexing headers preserve crawler scopes and do not mistake preview settings for noindex", () => {
  assert.equal(headerNoindex(["otherbot: noindex, nofollow"]), false);
  assert.equal(
    headerNoindex(["googlebot: nofollow", "otherbot: noindex"]),
    false,
  );
  assert.equal(headerNoindex(["otherbot: noindex", "noindex"]), true);
  assert.equal(headerNoindex(["GOOGLEBOT: NOINDEX, nofollow"]), true);
  assert.equal(headerNoindex(["bingbot: noindex"]), false);
  assert.equal(headerNoindex(["bingbot: noindex"], "bingbot"), true);
  assert.equal(
    headerNoindex(["max-image-preview: none, max-snippet: 0"]),
    false,
  );
  assert.equal(headerNoindex(["noimageindex, nosnippet"]), false);
  assert.equal(headerNoindex(["none"]), true);
});

test("native response capture retains separate indexing fields without authentication headers", async () => {
  const fixture = await fixtureSite({
    routes: {
      "/headers": {
        status: 200,
        headers: {
          "X-Robots-Tag": ["otherbot: noindex", "noindex"],
          "Set-Cookie": "synthetic-only=never-retain",
        },
        body: "Synthetic response",
      },
    },
  });
  try {
    const config = parseConfig({
      seeds: [fixture.origin + "/headers"],
      origins: [fixture.origin],
      delayMs: 0,
    });
    const response = await new Transport(
      config,
      new NetworkPolicy({ localOrigins: [fixture.origin] }),
    ).request(fixture.origin + "/headers");
    assert.deepEqual(response.robotsTags, ["otherbot: noindex", "noindex"]);
    assert.equal(response.headers["set-cookie"], undefined);
    assert.equal(headerNoindex(response.robotsTags!), true);
  } finally {
    await fixture.close();
  }
});

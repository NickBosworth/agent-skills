import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { deflateRawSync } from "node:zlib";
import http from "node:http";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  rmSync,
  symlinkSync,
  linkSync,
  existsSync,
  writeFileSync,
  readFileSync,
  openSync,
  closeSync,
  ftruncateSync,
  mkdirSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fixtureSite } from "../src/fixtures.ts";
import { Store } from "../src/store.ts";
import { Crawler } from "../src/crawler.ts";
import { NetworkPolicy, Transport } from "../src/network.ts";
import { parseConfig, fetchKey, scopeReason } from "../src/domain.ts";
import { extract, sitemapLocations } from "../src/extract.ts";
import { schemaNodes } from "../src/schema.ts";
import { analyze, rules } from "../src/rules.ts";
import { compare, graph, groups } from "../src/intelligence.ts";
import { explainError } from "../src/messages.ts";
import { exportReport, csvCell } from "../src/reports.ts";
import { importData, demandReview, PerformanceImport } from "../src/imports.ts";
import { serve } from "../src/server.ts";
import { Workbench } from "../src/app.ts";
import { gate, readJSON } from "../src/cli.ts";
import { randomUUID } from "node:crypto";
import type { Observation, RuleResult } from "../src/domain.ts";
const temporary = () => mkdtempSync(join(tmpdir(), "seo-workbench-test-"));
test("a newer database is refused without changing its journal mode or schema", () => {
  const root = temporary(),
    path = join(root, "workbench.sqlite");
  const future = new DatabaseSync(path);
  future.exec(
    "CREATE TABLE future_record(value TEXT); INSERT INTO future_record VALUES('synthetic'); PRAGMA user_version=99; PRAGMA journal_mode=DELETE",
  );
  future.close();
  try {
    assert.throws(() => new Store(root), /database-version-newer-than-product/);
    const check = new DatabaseSync(path);
    try {
      assert.equal(
        check.prepare("PRAGMA user_version").get()!.user_version,
        99,
      );
      assert.equal(
        check.prepare("PRAGMA journal_mode").get()!.journal_mode,
        "delete",
      );
      assert.equal(
        check.prepare("SELECT value FROM future_record").get()!.value,
        "synthetic",
      );
    } finally {
      check.close();
    }
    assert.equal(existsSync(path + "-wal"), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
test("database and side files reject dangling links without creating their targets", () => {
  const root = temporary();
  try {
    for (const suffix of ["", "-wal", "-shm", "-journal"]) {
      const directory = join(root, "data" + (suffix || "-main"));
      mkdirSync(directory);
      const target = join(root, "absent" + suffix);
      symlinkSync(target, join(directory, "workbench.sqlite" + suffix));
      assert.throws(() => new Store(directory), /database-symlink-blocked/);
      assert.equal(existsSync(target), false);
      if (suffix)
        assert.equal(existsSync(join(directory, "workbench.sqlite")), false);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
test("database paths reject hard links and directories without changing unrelated files", () => {
  const root = temporary();
  try {
    const target = join(root, "original");
    writeFileSync(target, "synthetic content");
    for (const suffix of ["", "-wal", "-shm", "-journal"]) {
      const directory = join(root, "data" + (suffix || "-main"));
      mkdirSync(directory);
      const path = join(directory, "workbench.sqlite" + suffix);
      linkSync(target, path);
      assert.throws(() => new Store(directory), /database-file-blocked/);
      rmSync(path);
      mkdirSync(path);
      assert.throws(() => new Store(directory), /database-file-blocked/);
    }
    assert.equal(readFileSync(target, "utf8"), "synthetic content");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
test("JSON inputs reject large sparse files before reading and require ordinary files", () => {
  const root = temporary();
  try {
    const path = join(root, "input.json");
    writeFileSync(path, '{"synthetic":true}');
    assert.deepEqual(readJSON(path), { synthetic: true });
    writeFileSync(
      path,
      Buffer.concat([
        Buffer.from('{"label":"'),
        Buffer.from([0xff]),
        Buffer.from('"}'),
      ]),
    );
    assert.throws(() => readJSON(path));
    writeFileSync(path, '{"label":"Café guide"}');
    assert.deepEqual(readJSON(path), { label: "Café guide" });
    const fd = openSync(path, "r+");
    try {
      ftruncateSync(fd, 1_000_000_000);
    } finally {
      closeSync(fd);
    }
    assert.throws(() => readJSON(path), /input-size-budget/);
    assert.throws(() => readJSON(root), /input-file-required|EISDIR/);
    writeFileSync(path, "invalid synthetic JSON");
    assert.throws(() => readJSON(path), SyntaxError);
    writeFileSync(path, "{}" + " ".repeat(4_999_998));
    assert.deepEqual(readJSON(path), {});
    writeFileSync(path, "{}" + " ".repeat(4_999_999));
    assert.throws(() => readJSON(path), /input-size-budget/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
test("local server startup reports an occupied port without an uncaught error", async () => {
  const root = temporary(),
    store = new Store(root);
  const app = new Workbench(store),
    first = await serve(app, 0);
  try {
    await assert.rejects(
      serve(app, Number(new URL(first.origin).port)),
      /local-server-start-failed/,
    );
  } finally {
    await first.close();
    store.close();
    rmSync(root, { recursive: true, force: true });
  }
});
const base = parseConfig({
  seeds: ["https://www.example.com/"],
  origins: ["https://www.example.com/"],
});
function observation(
  url = "https://www.example.com/",
  html = '<html lang="en"><title>Useful page</title><main><h1>Guide</h1><p>Original useful page content.</p></main></html>',
): Observation {
  const response = {
    url,
    status: 200,
    headers: { "content-type": "text/html" },
    body: html,
    requestedAt: new Date().toISOString(),
    durationMs: 1,
    bytes: html.length,
    address: "93.184.216.34",
  };
  return {
    id: randomUUID(),
    url,
    originalUrl: url,
    finalUrl: url,
    attempts: [response],
    response,
    facts: extract(html, url),
    render: null,
    error: null,
    timestamp: response.requestedAt,
  };
}
const result = (
  id: string,
  o: Observation,
  config = base,
  others: Observation[] = [],
  maps = new Set<string>(),
) =>
  analyze({
    config,
    observations: [o, ...others],
    sitemapUrls: maps,
    inventoryUrls: new Set(config.inventory),
  }).find((r) => r.ruleId === id && r.url === o.url)!;

test("URL keys preserve meaningful distinctions", () => {
  assert.equal(
    fetchKey("https://EXAMPLE.com/A/?b=2&a=1#x"),
    "https://example.com/A/?b=2&a=1",
  );
  assert.notEqual(
    fetchKey("https://example.com/a"),
    fetchKey("https://example.com/A"),
  );
  assert.notEqual(
    fetchKey("https://example.com/a"),
    fetchKey("https://example.com/a/"),
  );
  assert.notEqual(
    fetchKey("https://example.com/?a=1&a=2"),
    fetchKey("https://example.com/?a=2&a=1"),
  );
  assert.throws(() => fetchKey("file:///etc/passwd"));
  assert.throws(() => fetchKey("https://name:secret@shop.example/"));
});
test("strict configuration rejects policy injection and bad scope", () => {
  assert.throws(() => parseConfig({ ...base, allowPrivateNetworks: true }));
  assert.throws(() => parseConfig({ ...base, maxPages: 0 }));
  assert.throws(() =>
    parseConfig({ ...base, seeds: ["https://other.example/"] }),
  );
  assert.equal(
    scopeReason(base, "https://www.example.com/checkout"),
    "state-changing-route",
  );
  assert.equal(
    scopeReason(base, "https://www.example.com/?token=dummy"),
    "sensitive-query",
  );
});
test("connection policy rejects private, mapped, obfuscated and mixed DNS answers", async () => {
  const policy = new NetworkPolicy();
  for (const url of [
    "http://127.0.0.1/",
    "http://2130706433/",
    "http://0x7f000001/",
    "http://169.254.169.254/",
    "http://[::1]/",
    "http://[::ffff:127.0.0.1]/",
    "http://10.0.0.1/",
    "http://[fc00::1]/",
  ])
    await assert.rejects(policy.address(url));
  const mixed = new NetworkPolicy({
    resolver: async () => [
      { address: "93.184.216.34", family: 4 },
      { address: "127.0.0.1", family: 4 },
    ],
  });
  await assert.rejects(mixed.address("https://www.example.com/"));
  assert.throws(
    () => new NetworkPolicy({ localOrigins: ["http://127.0.0.1"] }),
  );
});
test("every new connection re-resolves and pins the actual socket", async () => {
  let calls = 0;
  const policy = new NetworkPolicy({
    resolver: async () => {
      calls++;
      return [
        { address: calls === 1 ? "93.184.216.34" : "127.0.0.1", family: 4 },
      ];
    },
  });
  assert.equal(
    (await policy.address("https://www.example.com/")).address,
    "93.184.216.34",
  );
  await assert.rejects(policy.address("https://www.example.com/"));
  assert.equal(calls, 2);
});
test("real HTTP denies local origin until exact operator authorization; response budget enforced", async () => {
  const fixture = await fixtureSite();
  try {
    const config = parseConfig({ ...fixture.config, maxBytes: 1024 });
    await assert.rejects(
      new Transport(config, new NetworkPolicy()).request(fixture.origin + "/"),
    );
    const transport = new Transport(
      config,
      new NetworkPolicy({ localOrigins: [fixture.origin] }),
    );
    assert.equal((await transport.request(fixture.origin + "/")).status, 200);
    await assert.rejects(transport.request(fixture.origin + "/oversize"));
    await assert.rejects(transport.policy.address("http://127.0.0.1:1/"));
  } finally {
    await fixture.close();
  }
});
test("HTML extraction preserves base, typed references and decorative alternatives", () => {
  const f = extract(
    '<base href="/section/"><main><a href="../Guide?b=2&a=1">Read</a><img src="x" alt=""><img src="y"><link rel="canonical" href="preferred"><link rel="alternate" href="fr" hreflang="fr"><script type="application/ld+json">{"@graph":[{"@id":"#x"}]}</script></main>',
    "https://www.example.com/",
  );
  assert.equal(f.edges[0].target, "https://www.example.com/Guide?b=2&a=1");
  assert.equal(
    f.edges.find((e) => e.kind === "canonical")?.target,
    "https://www.example.com/section/preferred",
  );
  assert.equal(f.images[0].alt, "");
  assert.equal(f.images[1].alt, null);
  assert.equal(f.jsonldErrors, 0);
});
test("sitemaps use safe XML parsing and reject external entities", () => {
  assert.deepEqual(
    sitemapLocations(
      "<urlset><url><loc>https://www.example.com/</loc></url></urlset>",
    ).locations,
    ["https://www.example.com/"],
  );
  assert.equal(
    sitemapLocations(
      "<sitemapindex><sitemap><loc>https://www.example.com/sitemap.xml</loc></sitemap></sitemapindex>",
    ).index,
    true,
  );
  assert.throws(() =>
    sitemapLocations(
      '<!DOCTYPE x [<!ENTITY data SYSTEM "file:///etc/passwd">]><urlset/>',
    ),
  );
  assert.throws(() => sitemapLocations("<urlset><url>"));
});
test("sitemaps decode escaped URLs, namespace prefixes and empty inventories", () => {
  const parsed = sitemapLocations(
    '<?xml version="1.0"?><s:urlset xmlns:s="http://www.sitemaps.org/schemas/sitemap/0.9"><s:url><s:loc>https://www.example.com/search?a=1&amp;b=2&#38;c=3&#x26;d=4</s:loc><image:image xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"><image:loc>https://www.example.com/image.png</image:loc></image:image></s:url></s:urlset>',
  );
  assert.deepEqual(parsed, {
    index: false,
    locations: ["https://www.example.com/search?a=1&b=2&c=3&d=4"],
  });
  assert.deepEqual(
    sitemapLocations(
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"/>',
    ),
    { index: false, locations: [] },
  );
  assert.deepEqual(sitemapLocations("<sitemapindex/>"), {
    index: true,
    locations: [],
  });
  assert.deepEqual(
    sitemapLocations(
      "<urlset><url><loc><![CDATA[https://www.example.com/?literal=&amp;]]></loc></url></urlset>",
    ).locations,
    ["https://www.example.com/?literal=&amp;"],
  );
});
test("malformed sitemap roots and location records never silently become empty inventories", () => {
  for (const xml of [
    "<urlset/><sitemapindex/>",
    "<urlset>Unexpected text</urlset>",
    "<urlset><URL/></urlset>",
    "<urlset/><urlset/>",
    "<html/>",
    "<urlset><url/></urlset>",
    "<urlset><url><loc/></url></urlset>",
    "<urlset><url><loc>/relative</loc></url></urlset>",
    "<urlset><url><loc>file:///path/to/synthetic</loc></url></urlset>",
    "<urlset><url><loc>https://www.example.com/a</loc><loc>https://www.example.com/b</loc></url></urlset>",
    "<urlset><url><loc><nested>https://www.example.com/</nested></loc></url></urlset>",
    '<!DOCTYPE urlset [<!ENTITY x "synthetic">]><urlset><url><loc>&x;</loc></url></urlset>',
  ])
    assert.throws(() => sitemapLocations(xml));
});
test("escaped sitemap query parameters reach the correct page and malformed entries leave partial coverage", async () => {
  for (const malformed of [false, true]) {
    const routes = {
      "/robots.txt": { status: 404, body: "" },
      "/map.xml": {
        status: 200,
        headers: { "content-type": "application/xml" },
        body: malformed
          ? "<urlset><url/></urlset>"
          : "<urlset><url><loc>ORIGIN/search?a=1&amp;b=2</loc></url></urlset>",
      },
      "/search": {
        status: 200,
        body: "<title>Synthetic search</title><main>Original test content.</main>",
      },
      "/seed": {
        status: 200,
        body: "<title>Synthetic seed</title><main>Original test content.</main>",
      },
    };
    const fixture = await fixtureSite({ routes });
    routes["/map.xml"].body = routes["/map.xml"].body.replace(
      "ORIGIN",
      fixture.origin,
    );
    const directory = temporary(),
      store = new Store(directory);
    try {
      const config = parseConfig({
        seeds: [fixture.origin + "/seed"],
        origins: [fixture.origin],
        sitemaps: [fixture.origin + "/map.xml"],
        render: "none",
        delayMs: 0,
      });
      const project = store.createProject(config),
        id = store.createAudit(project);
      await new Crawler(
        store,
        new NetworkPolicy({ localOrigins: [fixture.origin] }),
      ).run(id);
      if (malformed) {
        assert.equal(store.audit(id).state, "partial");
        assert.equal(store.audit(id).reason, "sitemap-incomplete");
        assert.equal(gate(store, id), 3);
      } else {
        assert.equal(
          store.observation(id, fixture.origin + "/search?a=1&b=2")?.response
            ?.status,
          200,
        );
        assert.equal(
          store.observation(id, fixture.origin + "/search?a=1&amp;b=2"),
          null,
        );
        assert.equal(store.audit(id).state, "complete");
      }
    } finally {
      store.close();
      await fixture.close();
      rmSync(directory, { recursive: true, force: true });
    }
  }
});

// Each shipped rule gets a defect/review case, a legitimate counterexample, and absent-evidence check.
const cases: Record<
  string,
  { defect: () => RuleResult; valid: () => RuleResult }
> = {
  "navigation-contract": {
    defect: () =>
      result(
        "navigation-contract",
        observation(),
        parseConfig({
          ...base,
          contracts: [
            {
              pathPrefix: "/",
              requiredLinks: ["https://www.example.com/help"],
            },
          ],
        }),
      ),
    valid: () =>
      result(
        "navigation-contract",
        observation(undefined, '<main><a href="/help">Help</a></main>'),
        parseConfig({
          ...base,
          contracts: [
            {
              pathPrefix: "/",
              requiredLinks: ["https://www.example.com/help"],
            },
          ],
        }),
      ),
  },
  "alternate-contract": {
    defect: () =>
      result(
        "alternate-contract",
        observation(),
        parseConfig({
          ...base,
          contracts: [
            {
              pathPrefix: "/",
              requiredAlternates: [
                { language: "fr", target: "https://www.example.com/fr" },
              ],
            },
          ],
        }),
      ),
    valid: () =>
      result(
        "alternate-contract",
        observation(
          undefined,
          '<link rel="alternate" hreflang="FR" href="/fr"><main>Guide</main>',
        ),
        parseConfig({
          ...base,
          contracts: [
            {
              pathPrefix: "/",
              requiredAlternates: [
                { language: "fr", target: "https://www.example.com/fr" },
              ],
            },
          ],
        }),
      ),
  },
  "structured-contract": {
    defect: () =>
      result(
        "structured-contract",
        observation(),
        parseConfig({
          ...base,
          contracts: [
            { pathPrefix: "/", requiredStructuredTypes: ["Product"] },
          ],
        }),
      ),
    valid: () =>
      result(
        "structured-contract",
        observation(
          undefined,
          '<script type="application/ld+json">{"@context":"https://schema.org", "@graph":[{"@type":"Product","@id":"#product"}]}</script><main>Product</main>',
        ),
        parseConfig({
          ...base,
          contracts: [
            { pathPrefix: "/", requiredStructuredTypes: ["Product"] },
          ],
        }),
      ),
  },
  "google-product-basics": {
    defect: () =>
      result(
        "google-product-basics",
        observation(
          undefined,
          '<script type="application/ld+json">{"@context":"https://schema.org", "@type":"Product"}</script>',
        ),
        parseConfig({
          ...base,
          contracts: [{ pathPrefix: "/", googleFeatures: ["product-snippet"] }],
        }),
      ),
    valid: () =>
      result(
        "google-product-basics",
        observation(
          undefined,
          '<script type="application/ld+json">{"@context":"https://schema.org", "@type":"Product","name":"Synthetic object","offers":{"@type":"Offer","price":"10","priceCurrency":"USD"}}</script>',
        ),
        parseConfig({
          ...base,
          contracts: [{ pathPrefix: "/", googleFeatures: ["product-snippet"] }],
        }),
      ),
  },
  "http-status": {
    defect: () => {
      const o = observation();
      o.response!.status = 404;
      return result(
        "http-status",
        o,
        parseConfig({
          ...base,
          contracts: [{ pathPrefix: "/", indexability: "indexable" }],
        }),
      );
    },
    valid: () => result("http-status", observation()),
  },
  "redirect-path": {
    defect: () => {
      const o = observation();
      o.error = "redirect-loop";
      return result("redirect-path", o);
    },
    valid: () => result("redirect-path", observation()),
  },
  "index-intent": {
    defect: () =>
      result(
        "index-intent",
        observation(
          undefined,
          '<title>Guide</title><meta name="robots" content="noindex"><main>Guide</main>',
        ),
        parseConfig({
          ...base,
          contracts: [{ pathPrefix: "/", indexability: "indexable" }],
        }),
      ),
    valid: () =>
      result(
        "index-intent",
        observation(
          undefined,
          '<meta name="robots" content="noindex"><main>Account</main>',
        ),
        parseConfig({
          ...base,
          contracts: [{ pathPrefix: "/", indexability: "excluded" }],
        }),
      ),
  },
  "initial-noindex-js": {
    defect: () => {
      const o = observation(
        undefined,
        '<meta name="robots" content="noindex"><main>Guide</main>',
      );
      o.render = {
        status: "observed",
        facts: extract("<main>Guide</main>", o.url),
      };
      return result("initial-noindex-js", o);
    },
    valid: () => {
      const o = observation();
      o.render = { status: "observed", facts: o.facts! };
      return result("initial-noindex-js", o);
    },
  },
  "canonical-consistency": {
    defect: () =>
      result(
        "canonical-consistency",
        observation(
          undefined,
          '<link rel="canonical" href="/a"><link rel="canonical" href="/b"><main>Guide</main>',
        ),
      ),
    valid: () => result("canonical-consistency", observation()),
  },
  "canonical-target": {
    defect: () => {
      const target = observation("https://www.example.com/target");
      target.response!.status = 404;
      return result(
        "canonical-target",
        observation(
          undefined,
          '<link rel="canonical" href="/target"><main>Guide</main>',
        ),
        base,
        [target],
      );
    },
    valid: () =>
      result(
        "canonical-target",
        observation(
          undefined,
          '<link rel="canonical" href="/target"><main>Guide</main>',
        ),
        base,
        [observation("https://www.example.com/target")],
      ),
  },
  "canonical-contract": {
    defect: () =>
      result(
        "canonical-contract",
        observation(),
        parseConfig({
          ...base,
          contracts: [
            { pathPrefix: "/", canonical: "https://www.example.com/" },
          ],
        }),
      ),
    valid: () =>
      result(
        "canonical-contract",
        observation(
          undefined,
          '<link rel="canonical" href="/"><main>Guide</main>',
        ),
        parseConfig({
          ...base,
          contracts: [
            { pathPrefix: "/", canonical: "https://www.example.com/" },
          ],
        }),
      ),
  },
  "title-review": {
    defect: () =>
      result("title-review", observation(undefined, "<main>Guide</main>")),
    valid: () => result("title-review", observation()),
  },
  "critical-content": {
    defect: () =>
      result(
        "critical-content",
        observation(),
        parseConfig({
          ...base,
          contracts: [{ pathPrefix: "/", criticalText: ["Required warranty"] }],
        }),
      ),
    valid: () =>
      result(
        "critical-content",
        observation(),
        parseConfig({
          ...base,
          contracts: [{ pathPrefix: "/", criticalText: ["Original useful"] }],
        }),
      ),
  },
  "language-contract": {
    defect: () =>
      result(
        "language-contract",
        observation(),
        parseConfig({
          ...base,
          contracts: [{ pathPrefix: "/", language: "fr" }],
        }),
      ),
    valid: () =>
      result(
        "language-contract",
        observation(),
        parseConfig({
          ...base,
          contracts: [{ pathPrefix: "/", language: "en" }],
        }),
      ),
  },
  "sitemap-intent": {
    defect: () =>
      result(
        "sitemap-intent",
        observation(),
        parseConfig({
          ...base,
          contracts: [{ pathPrefix: "/", sitemap: true }],
        }),
      ),
    valid: () =>
      result(
        "sitemap-intent",
        observation(),
        parseConfig({
          ...base,
          contracts: [{ pathPrefix: "/", sitemap: true }],
        }),
        [],
        new Set([base.seeds[0]]),
      ),
  },
  "broken-links": {
    defect: () => {
      const target = observation("https://www.example.com/missing");
      target.response!.status = 404;
      return result(
        "broken-links",
        observation(undefined, '<main><a href="/missing">Read</a></main>'),
        base,
        [target],
      );
    },
    valid: () =>
      result(
        "broken-links",
        observation(undefined, '<main><a href="/target">Read</a></main>'),
        base,
        [observation("https://www.example.com/target")],
      ),
  },
  "exact-duplicate": {
    defect: () =>
      result("exact-duplicate", observation(), base, [
        observation("https://www.example.com/other"),
      ]),
    valid: () => result("exact-duplicate", observation()),
  },
  "product-variant-review": {
    defect: () =>
      result(
        "product-variant-review",
        observation(
          undefined,
          '<script type="application/ld+json">' +
            JSON.stringify({
              "@context": "https://schema.org",
              "@type": "ProductGroup",
              name: "Workshop coat",
              hasVariant: [{ "@type": "Product", name: "Blue coat" }],
            }) +
            "</script>",
        ),
        parseConfig({ ...base, profile: "ecommerce" }),
      ),
    valid: () =>
      result(
        "product-variant-review",
        observation(
          undefined,
          '<script type="application/ld+json">' +
            JSON.stringify({
              "@context": "https://schema.org",
              "@type": "ProductGroup",
              name: "Workshop coat",
              productGroupID: "synthetic-group",
              hasVariant: [
                {
                  "@type": "Product",
                  name: "Blue coat",
                  sku: "synthetic-blue",
                },
              ],
            }) +
            "</script>",
        ),
        parseConfig({ ...base, profile: "ecommerce" }),
      ),
  },
  "google-feature-fields": {
    defect: () =>
      result(
        "google-feature-fields",
        observation(
          undefined,
          '<script type="application/ld+json">' +
            JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Product",
              name: "Workshop lamp",
              offers: { "@type": "Offer" },
            }) +
            "</script>",
        ),
        parseConfig({
          ...base,
          contracts: [{ pathPrefix: "/", googleFeatures: ["product-snippet"] }],
        }),
      ),
    valid: () =>
      result(
        "google-feature-fields",
        observation(
          undefined,
          '<script type="application/ld+json">' +
            JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Product",
              name: "Workshop lamp",
              offers: { "@type": "Offer", price: 12, priceCurrency: "GBP" },
            }) +
            "</script>",
        ),
        parseConfig({
          ...base,
          contracts: [{ pathPrefix: "/", googleFeatures: ["product-snippet"] }],
        }),
      ),
  },
  "structured-visible-text": {
    defect: () => {
      const o = observation(
        undefined,
        '<script type="application/ld+json">' +
          JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: "Workshop lamp",
          }) +
          "</script>",
      );
      o.render = {
        status: "observed",
        facts: {
          ...o.facts!,
          renderedPageText: { text: "Workshop guide", truncated: false },
        },
      };
      return result("structured-visible-text", o);
    },
    valid: () => {
      const o = observation(
        undefined,
        '<script type="application/ld+json">' +
          JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: "Workshop lamp",
          }) +
          "</script>",
      );
      o.render = {
        status: "observed",
        facts: {
          ...o.facts!,
          renderedPageText: { text: "Workshop lamp", truncated: false },
        },
      };
      return result("structured-visible-text", o);
    },
  },
  "structured-vocabulary": {
    defect: () =>
      result(
        "structured-vocabulary",
        observation(
          undefined,
          '<script type="application/ld+json">{"@context":"https://schema.org","@type":"Prodcut","prcie":12}</script><main>Workshop lamp</main>',
        ),
      ),
    valid: () =>
      result(
        "structured-vocabulary",
        observation(
          undefined,
          '<script type="application/ld+json">{"@context":"https://schema.org","@type":"Product","name":"Workshop lamp"}</script><main>Workshop lamp</main>',
        ),
      ),
  },
  "jsonld-syntax": {
    defect: () =>
      result(
        "jsonld-syntax",
        observation(
          undefined,
          '<script type="application/ld+json">{broken</script><main>Guide</main>',
        ),
      ),
    valid: () =>
      result(
        "jsonld-syntax",
        observation(
          undefined,
          '<script type="application/ld+json">{"@type":"Article"}</script><main>Guide</main>',
        ),
      ),
  },
  "image-alt": {
    defect: () =>
      result(
        "image-alt",
        observation(undefined, '<main><img src="/image"></main>'),
      ),
    valid: () =>
      result(
        "image-alt",
        observation(undefined, '<main><img src="/image" alt=""></main>'),
      ),
  },
  "soft404-review": {
    defect: () =>
      result(
        "soft404-review",
        observation(
          undefined,
          "<title>Not found</title><main>Not found</main>",
        ),
      ),
    valid: () => result("soft404-review", observation()),
  },
  "hreflang-return": {
    defect: () =>
      result(
        "hreflang-return",
        observation(
          undefined,
          '<link rel="alternate" hreflang="fr" href="/fr"><main>Guide</main>',
        ),
        base,
        [observation("https://www.example.com/fr")],
      ),
    valid: () =>
      result(
        "hreflang-return",
        observation(
          undefined,
          '<link rel="alternate" hreflang="fr" href="/fr"><main>Guide</main>',
        ),
        base,
        [
          observation(
            "https://www.example.com/fr",
            '<link rel="alternate" hreflang="en" href="/"><main>French guide</main>',
          ),
        ],
      ),
  },
  "hreflang-cluster": {
    defect: () =>
      result(
        "hreflang-cluster",
        observation(
          undefined,
          '<link rel="alternate" hreflang="en_UK" href="/"><main>Guide</main>',
        ),
      ),
    valid: () =>
      result(
        "hreflang-cluster",
        observation(
          undefined,
          '<link rel="alternate" hreflang="en" href="https://www.example.com/"><main>Guide</main>',
        ),
      ),
  },
  "inventory-orphan": {
    defect: () =>
      result(
        "inventory-orphan",
        observation("https://www.example.com/target"),
        parseConfig({ ...base, inventory: ["https://www.example.com/target"] }),
      ),
    valid: () =>
      result(
        "inventory-orphan",
        observation("https://www.example.com/target"),
        parseConfig({ ...base, inventory: ["https://www.example.com/target"] }),
        [observation(undefined, '<main><a href="/target">Read</a></main>')],
      ),
  },
};
for (const rule of rules) {
  test(rule.id + ": defect/review", () =>
    assert.ok(["fail", "warning"].includes(cases[rule.id].defect().outcome)),
  );
  test(rule.id + ": valid counterexample", () =>
    assert.ok(
      ["pass", "not-applicable"].includes(cases[rule.id].valid().outcome),
    ),
  );
  test(rule.id + ": missing evidence never passes", () => {
    const o = observation();
    o.response = null;
    o.facts = null;
    o.error = "request-timeout";
    assert.ok(["error", "not-tested"].includes(result(rule.id, o).outcome));
  });
}

test("actual crawl -> saved findings -> corrected site -> verified compatible comparison", async () => {
  const directory = temporary(),
    store = new Store(directory),
    fixture = await fixtureSite();
  try {
    const crawler = new Crawler(
      store,
      new NetworkPolicy({ localOrigins: [fixture.origin] }),
    );
    const project = store.createProject(fixture.config),
      before = store.createAudit(project);
    await crawler.run(before);
    const results = store.results(before, { limit: 10000 });
    assert.equal(
      results.find(
        (r) =>
          r.url === fixture.origin + "/product" && r.ruleId === "index-intent",
      )?.outcome,
      "fail",
    );
    assert.equal(
      results.find(
        (r) =>
          r.url === fixture.origin + "/account" && r.ruleId === "index-intent",
      )?.outcome,
      "pass",
    );
    assert.equal(
      results.find(
        (r) =>
          r.url === fixture.origin + "/product" && r.ruleId === "image-alt",
      )?.outcome,
      "pass",
    );
    assert.equal(store.audit(before).state, "complete");
    assert.equal(store.coverage(before).totalSiteSize, null);
    fixture.setFixed(true);
    const after = store.createAudit(project);
    await crawler.run(after);
    const comparison = compare(store, before, after);
    assert.equal(comparison.configComparable, true);
    assert.equal(
      comparison.changes.find(
        (c) =>
          c.url === fixture.origin + "/product" && c.ruleId === "index-intent",
      )?.state,
      "resolved",
    );
    assert.equal(
      comparison.changes.find(
        (c) =>
          c.url === fixture.origin + "/missing" && c.ruleId === "http-status",
      )?.state,
      "not-verifiable",
    );
    assert.ok(groups(results, fixture.config).some((g) => g.priority === "P1"));
    const oldAnalysis = store.latestAnalysis(before);
    const original = store.observation(before, fixture.origin + "/product");
    crawler.reevaluate(before);
    assert.notEqual(store.latestAnalysis(before), oldAnalysis);
    assert.deepEqual(
      store.observation(before, fixture.origin + "/product"),
      original,
    );
    assert.throws(() =>
      store.db
        .prepare("UPDATE observations SET data=? WHERE id=?")
        .run("{}", original!.id),
    );
    const report = exportReport(store, before, "html");
    assert.ok(report.includes("SYNTHETIC DEMONSTRATION"));
    assert.ok(!report.includes("<script"));
    const shareable = exportReport(store, before, "json", "shareable");
    assert.ok(!shareable.includes(fixture.origin));
    assert.ok(!shareable.includes("Workshop lamp"));
    assert.equal(
      graph(store.observations(before), fixture.config.seeds).find(
        (n) => n.url === fixture.origin + "/inventory-only",
      )?.depth,
      null,
    );
  } finally {
    store.close();
    await fixture.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
test("page limits yield partial results; restart resumes durable queue", async () => {
  const directory = temporary(),
    store = new Store(directory),
    fixture = await fixtureSite();
  try {
    const config = parseConfig({ ...fixture.config, maxPages: 1 });
    const project = store.createProject(config),
      id = store.createAudit(project);
    await new Crawler(
      store,
      new NetworkPolicy({ localOrigins: [fixture.origin] }),
    ).run(id);
    assert.equal(store.audit(id).state, "partial");
    assert.equal(store.audit(id).reason, "page-budget");
    assert.equal(gate(store, id), 3);
    assert.ok(store.next(id));
    store.close();
    const reopened = new Store(directory);
    try {
      assert.equal(reopened.audit(id).state, "partial");
      assert.ok(reopened.next(id));
    } finally {
      reopened.close();
    }
  } finally {
    await fixture.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
test("cancel interrupts HTTP and leaves evidence/queue honest", async () => {
  const directory = temporary(),
    store = new Store(directory),
    fixture = await fixtureSite({ slowMs: 100 });
  try {
    const project = store.createProject(fixture.config),
      id = store.createAudit(project),
      crawler = new Crawler(
        store,
        new NetworkPolicy({ localOrigins: [fixture.origin] }),
      );
    const running = crawler.run(id);
    setTimeout(() => crawler.cancel(id), 20);
    await running;
    assert.equal(store.audit(id).state, "cancelled");
    assert.equal(store.coverage(id).completeDiscoveredQueue, false);
  } finally {
    store.close();
    await fixture.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
test("changed intent contract cannot resolve the old defect", () => {
  const directory = temporary(),
    store = new Store(directory);
  try {
    const badConfig = parseConfig({
        ...base,
        contracts: [{ pathPrefix: "/", title: "Required" }],
      }),
      project = store.createProject(badConfig),
      before = store.createAudit(project),
      after = store.createAudit(project, base),
      o = observation();
    store.putObservation(before, o);
    store.saveAnalysis(before, "0.1.0", [result("title-review", o, badConfig)]);
    const newer = observation();
    store.putObservation(after, newer);
    store.saveAnalysis(after, "0.1.0", [result("title-review", newer)]);
    assert.equal(
      compare(store, before, after).changes[0].state,
      "not-verifiable",
    );
  } finally {
    store.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
test("imports preserve dimensions, aggregate CTR, reject duplicate and false lab INP", () => {
  const data = {
    schemaVersion: 1,
    provider: "Google Search Console",
    method: "manual import",
    startDate: "2026-09-01",
    endDate: "2026-09-30",
    searchType: "web",
    aggregation: "byPage",
    complete: false,
    limitations: "Top rows only; synthetic example",
    rows: [
      {
        page: base.seeds[0],
        query: "synthetic guide",
        country: "GBR",
        device: "DESKTOP",
        clicks: 4,
        impressions: 100,
        position: 5,
      },
    ],
  };
  assert.equal(demandReview(data).pages[0].ctr, 0.04);
  const directory = temporary(),
    store = new Store(directory);
  try {
    const project = store.createProject(base);
    assert.ok(importData(store, project, "search-console", data));
    assert.throws(() =>
      importData(store, project, "search-console", {
        ...data,
        rows: [data.rows[0], data.rows[0]],
      }),
    );
  } finally {
    store.close();
    rmSync(directory, { recursive: true, force: true });
  }
  assert.throws(() =>
    PerformanceImport.parse({
      schemaVersion: 1,
      provider: "Lighthouse",
      method: "manual import",
      scope: "url",
      url: base.seeds[0],
      device: "mobile",
      toolVersion: "synthetic",
      timestamp: new Date().toISOString(),
      collectionStart: null,
      collectionEnd: null,
      metrics: { lcpMs: 1000, cls: 0, inpMs: 1, tbtMs: 20 },
      percentile: null,
      sampling: "One synthetic navigation",
    }),
  );
});
test("report hostile content is escaped; CSV formula and control characters are neutralized", () => {
  assert.equal(csvCell('=HYPERLINK("dummy")'), '"\'=HYPERLINK(""dummy"")"');
  for (const value of [
    "\u0000=1+1",
    "\u0008+1",
    "\u200b@sample",
    "＝1+1",
    "＋1",
    "－1",
    "＠sample",
    "\nplain text",
  ])
    assert.ok(csvCell(value).startsWith("\"'"), JSON.stringify(value));
  assert.equal(csvCell("Plain\u0000 text"), '"Plain text"');
  assert.equal(csvCell('Plain, "quoted" text'), '"Plain, ""quoted"" text"');
  const directory = temporary(),
    store = new Store(directory);
  try {
    const project = store.createProject(base),
      id = store.createAudit(project),
      o = observation();
    o.facts!.title = '<img src="https://evil.example/x" onerror="alert(1)">';
    store.putObservation(id, o);
    store.saveAnalysis(id, "0.1.0", [result("title-review", o)]);
    const html = exportReport(store, id, "html");
    assert.ok(!html.includes("<img src="));
    assert.ok(html.includes("&lt;img"));
    assert.ok(
      html.indexOf("What needs attention") <
        html.indexOf("Technical details and saved evidence"),
    );
    assert.ok(html.includes("The crawler fetched"));
    assert.ok(
      !/evidence before advice|coverage comes first|take the evidence with you/i.test(
        html,
      ),
    );
    assert.ok(
      html.includes(
        "These checks do not produce an SEO score or predict search rankings.",
      ),
    );
    const markdown = exportReport(store, id, "markdown");
    assert.ok(markdown.includes("## What was checked"));
    assert.ok(markdown.includes("The crawler fetched"));
    assert.ok(markdown.includes("## Technical details"));
  } finally {
    store.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
test("local HTTP UI protects host, origin, session and strict JSON mutation", async () => {
  const directory = temporary(),
    store = new Store(directory),
    server = await serve(new Workbench(store), 0);
  try {
    assert.equal((await fetch(server.origin + "/api/projects")).status, 403);
    const root = await fetch(server.origin);
    assert.equal(root.status, 200);
    const cookie = root.headers.get("set-cookie")!.split(";")[0];
    const malformedSession = await new Promise((resolve, reject) => {
      const req = http.get(
        server.origin + "/api/projects",
        { headers: { cookie: "workbench=" + "é".repeat(64) } },
        (res) => {
          res.resume();
          resolve(res.statusCode);
        },
      );
      req.on("error", reject);
    });
    assert.equal(malformedSession, 403);
    assert.equal(
      (await fetch(server.origin + "/api/projects", { headers: { cookie } }))
        .status,
      200,
    );
    assert.equal(
      (
        await fetch(server.origin + "/api/projects", {
          headers: { cookie, origin: "https://hostile.example" },
        })
      ).status,
      403,
    );
    const hostStatus = await new Promise((resolve) => {
      const req = http.get(
        server.origin + "/api/projects",
        { headers: { cookie, Host: "hostile.example" } },
        (res) => {
          res.resume();
          resolve(res.statusCode);
        },
      );
      req.on("error", () => resolve(0));
    });
    assert.equal(hostStatus, 403);
    assert.equal(
      (
        await fetch(server.origin + "/api/start", {
          method: "POST",
          headers: { cookie, "Content-Type": "application/json" },
          body: "{}",
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await fetch(server.origin + "/api/start", {
          method: "POST",
          headers: {
            cookie,
            origin: server.origin,
            "Content-Type": "application/json",
          },
          body: "{}",
        })
      ).status,
      400,
    );
    const audit = store.createAudit(store.createProject(base));
    const project = store.audit(audit).projectId;
    const [prefix, suffix] = JSON.stringify({
      projectId: project,
      kind: "performance",
      data: {
        schemaVersion: 1,
        provider: "Lighthouse",
        method: "manual import",
        scope: "url",
        url: base.seeds[0],
        device: "mobile",
        toolVersion: "synthetic",
        timestamp: new Date().toISOString(),
        collectionStart: null,
        collectionEnd: null,
        metrics: { lcpMs: 1000, cls: 0, inpMs: null, tbtMs: 10 },
        percentile: null,
        sampling: "SYNTHETIC_BAD_UTF8",
      },
    }).split("SYNTHETIC_BAD_UTF8");
    const invalidUtf8 = await fetch(server.origin + "/api/import", {
      method: "POST",
      headers: {
        cookie,
        origin: server.origin,
        "content-type": "application/json",
      },
      body: Buffer.concat([
        Buffer.from(prefix),
        Buffer.from([0xff]),
        Buffer.from(suffix),
      ]),
    });
    assert.equal(invalidUtf8.status, 400);
    assert.equal(store.imports(project, "performance").length, 0);
    assert.equal(store.audit(audit).state, "queued");
    for (const contentType of [
      "text/plain",
      "application/json; charset=utf-16",
    ]) {
      const response = await fetch(server.origin + "/api/control", {
        method: "POST",
        headers: { cookie, origin: server.origin, "content-type": contentType },
        body: JSON.stringify({ auditId: audit, action: "pause" }),
      });
      assert.equal(response.status, 403);
      assert.equal(store.audit(audit).state, "queued");
    }
    const utf8 = await fetch(server.origin + "/api/control", {
      method: "POST",
      headers: {
        cookie,
        origin: server.origin,
        "content-type": 'Application/JSON; charset="UTF-8"',
      },
      body: JSON.stringify({ auditId: audit, action: "pause" }),
    });
    assert.equal(utf8.status, 200);
    assert.equal(store.audit(audit).state, "paused");
  } finally {
    await server.close();
    store.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test("actual hostname socket uses the validated address, not an independent lookup", async () => {
  const fixture = await fixtureSite();
  const port = new URL(fixture.origin).port;
  let decisions = 0;
  // Trusted test policy supplies a local destination for a fake hostname, exercising the real socket lookup.
  class FixturePolicy extends NetworkPolicy {
    async address(_value: string) {
      decisions++;
      return { address: "127.0.0.1", family: 4 };
    }
  }
  try {
    const config = parseConfig({
      seeds: [`http://fixture.test:${port}/`],
      origins: [`http://fixture.test:${port}`],
      delayMs: 0,
    });
    const response = await new Transport(config, new FixturePolicy()).request(
      config.seeds[0],
    );
    assert.equal(response.status, 200);
    assert.equal(response.address, "127.0.0.1");
    assert.equal(decisions, 1);
  } finally {
    await fixture.close();
  }
});
test("concurrent resource requests cannot exceed the shared request budget", async () => {
  const fixture = await fixtureSite();
  try {
    const transport = new Transport(
      parseConfig({ ...fixture.config, maxRequests: 1 }),
      new NetworkPolicy({ localOrigins: [fixture.origin] }),
    );
    const outcomes = await Promise.allSettled([
      transport.request(fixture.origin + "/guide"),
      transport.request(fixture.origin + "/product"),
    ]);
    assert.equal(outcomes.filter((o) => o.status === "fulfilled").length, 1);
    assert.equal(transport.requests, 1);
  } finally {
    await fixture.close();
  }
});
test("redirect escape is recorded and never fetched", async () => {
  const fixture = await fixtureSite();
  const directory = temporary(),
    store = new Store(directory);
  try {
    const config = parseConfig({
      ...fixture.config,
      seeds: [fixture.origin + "/scope-escape"],
      inventory: [],
      sitemaps: [],
    });
    const project = store.createProject(config),
      id = store.createAudit(project);
    await new Crawler(
      store,
      new NetworkPolicy({ localOrigins: [fixture.origin] }),
    ).run(id);
    const o = store.observation(id, fixture.origin + "/scope-escape")!;
    assert.equal(o.error, "redirect-scope-blocked");
    assert.equal(o.attempts.length, 1);
    assert.equal(o.attempts[0].status, 302);
  } finally {
    store.close();
    await fixture.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
test("retry exhaustion preserves each attempted response; interrupted queue recovers without duplicate workers", async () => {
  const fixture = await fixtureSite({
      routes: {
        "/failure": { status: 503, body: "Synthetic service failure" },
        "/robots.txt": { status: 404, body: "" },
      },
    }),
    directory = temporary(),
    store = new Store(directory);
  try {
    const config = parseConfig({
      ...fixture.config,
      seeds: [fixture.origin + "/failure"],
      inventory: [],
      sitemaps: [],
      retries: 1,
    });
    const project = store.createProject(config),
      id = store.createAudit(project);
    store.discover(
      id,
      fixture.origin + "/failure",
      fixture.origin + "/failure",
      "seed",
      null,
      0,
      "fetching",
    );
    await new Crawler(
      store,
      new NetworkPolicy({ localOrigins: [fixture.origin] }),
    ).run(id);
    assert.equal(
      store.observation(id, fixture.origin + "/failure")!.attempts.length,
      2,
    );
    assert.equal(
      store.observation(id, fixture.origin + "/failure")!.response!.status,
      503,
    );
    assert.equal(store.audit(id).owner, null);
  } finally {
    store.close();
    await fixture.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
test("precise expiring exceptions retain original findings and grouping", () => {
  const config = parseConfig({
    ...base,
    contracts: [{ pathPrefix: "/", title: "Required" }],
    exceptions: [
      {
        ruleId: "title-review",
        url: base.seeds[0],
        reason: "Synthetic temporary review exception",
        ownerRole: "maintainer",
        expires: "2099-01-01",
      },
    ],
  });
  const o = observation(),
    r = result("title-review", o, config);
  assert.equal(r.outcome, "fail");
  assert.ok(r.exception);
  assert.equal(groups([r], config)[0].exceptedCount, 1);
  const expired = parseConfig({
    ...config,
    exceptions: [{ ...config.exceptions[0], expires: "2000-01-01" }],
  });
  assert.equal(result("title-review", o, expired).exception, undefined);
});
test("unreachable robots blocks page fetching and exposes untested coverage", async () => {
  const fixture = await fixtureSite({
      routes: {
        "/robots.txt": { status: 503, body: "Synthetic robots failure" },
      },
    }),
    directory = temporary(),
    store = new Store(directory);
  try {
    const config = parseConfig({
      ...fixture.config,
      seeds: [fixture.origin + "/guide"],
      inventory: [],
      sitemaps: [],
    });
    const project = store.createProject(config),
      id = store.createAudit(project);
    await new Crawler(
      store,
      new NetworkPolicy({ localOrigins: [fixture.origin] }),
    ).run(id);
    const o = store.observation(id, fixture.origin + "/guide")!;
    assert.equal(o.error, "robots-unreachable-blocked");
    assert.equal(o.attempts.length, 0);
    assert.equal(store.audit(id).requests, 1);
    assert.equal(store.coverage(id).completeDiscoveredQueue, false);
    assert.ok(
      store.results(id, { limit: 100 }).every((r) => r.outcome !== "pass"),
    );
  } finally {
    store.close();
    await fixture.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
test("persistent database budget cannot silently produce a complete analysis", async () => {
  const directory = temporary(),
    store = new Store(directory),
    fixture = await fixtureSite();
  try {
    const config = parseConfig({ ...fixture.config, maxStorageBytes: 10000 }),
      project = store.createProject(config),
      id = store.createAudit(project);
    await new Crawler(
      store,
      new NetworkPolicy({ localOrigins: [fixture.origin] }),
    ).run(id);
    assert.equal(store.audit(id).state, "partial");
    assert.equal(store.audit(id).reason, "persistent-storage-budget");
    assert.equal(store.latestAnalysis(id), null);
    assert.equal(gate(store, id), 3);
  } finally {
    store.close();
    await fixture.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
test("actual response encoding preserves non-ASCII content and original bytes", async () => {
  const http = await import("node:http");
  const raw = Buffer.from(
    "<html><title>Caf\u00e9 guide</title><main>Caf\u00e9 evidence</main></html>",
    "latin1",
  );
  const server = http.createServer((_req, res) => {
    res.writeHead(200, { "Content-Type": "text/html; charset=windows-1252" });
    res.end(raw);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  try {
    const config = parseConfig({
        seeds: [origin + "/"],
        origins: [origin],
        delayMs: 0,
      }),
      response = await new Transport(
        config,
        new NetworkPolicy({ localOrigins: [origin] }),
      ).request(origin + "/");
    assert.equal(extract(response.body, response.url).title, "Caf\u00e9 guide");
    assert.deepEqual(Buffer.from(response.bodyBase64!, "base64"), raw);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
test("atomic worker claim rejects overlap and memory ceilings leave a partial audit", async () => {
  const directory = temporary(),
    store = new Store(directory),
    fixture = await fixtureSite();
  try {
    const project = store.createProject(fixture.config),
      first = store.createAudit(project),
      second = store.createAudit(project);
    store.claim(first);
    assert.throws(() => store.claim(second));
    store.release(first);
    store.state(first, "complete");
    const config = parseConfig({ ...fixture.config, maxMemoryBytes: 33554432 }),
      third = store.createAudit(project, config);
    await new Crawler(
      store,
      new NetworkPolicy({ localOrigins: [fixture.origin] }),
    ).run(third);
    assert.equal(store.audit(third).state, "partial");
    assert.ok(
      ["memory-budget", "analysis-memory-budget"].includes(
        store.audit(third).reason!,
      ),
    );
    assert.equal(gate(store, third), 3);
  } finally {
    store.close();
    await fixture.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test("late workers cannot undo stopped states or modify completed audits", async () => {
  const { execFileSync } = await import("node:child_process");
  const directory = temporary(),
    store = new Store(directory);
  try {
    const project = store.createProject(base);
    for (const state of [
      "paused",
      "cancelled",
      "complete",
      "partial",
      "error",
    ]) {
      const id = store.createAudit(project);
      store.state(id, state, "synthetic-stop");
      assert.throws(() => store.claim(id), /audit-not-runnable/);
      await assert.rejects(new Crawler(store).run(id));
      store.failUnclaimed(id, "synthetic-startup-failure");
      assert.throws(() =>
        execFileSync(
          process.execPath,
          ["src/cli.ts", "worker", id, "--data", directory],
          { stdio: "pipe", timeout: 10000 },
        ),
      );
      assert.equal(store.audit(id).state, state);
      assert.equal(store.audit(id).reason, "synthetic-stop");
      assert.equal(store.audit(id).owner, null);
      assert.equal(store.audit(id).requests, 0);
      if (state === "complete") {
        const app = new Workbench(store);
        for (const action of ["pause", "cancel", "resume"] as const)
          assert.throws(
            () => app.control(id, action),
            /audit-already-complete/,
          );
        assert.throws(() => app.crawler.pause(id), /audit-already-complete/);
        assert.throws(() => app.crawler.cancel(id), /audit-already-complete/);
      }
    }
    const active = store.createAudit(project);
    store.claim(active);
    assert.throws(() =>
      execFileSync(
        process.execPath,
        ["src/cli.ts", "worker", active, "--data", directory],
        { stdio: "pipe", timeout: 10000 },
      ),
    );
    assert.equal(store.audit(active).state, "running");
    assert.equal(store.audit(active).owner, process.pid);
    store.failUnclaimed(active, "synthetic-startup-failure");
    assert.equal(store.audit(active).state, "running");
    store.release(active);
    const queued = store.createAudit(project);
    store.failUnclaimed(queued, "synthetic-startup-failure");
    assert.equal(store.audit(queued).state, "error");
    assert.equal(store.audit(queued).reason, "synthetic-startup-failure");
  } finally {
    store.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test("structured types preserve graphs, nested nodes and IDs without interpreting unknown contexts", () => {
  const data = schemaNodes([
    {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@id": "#product",
          "@type": ["Product", "Thing"],
          offers: { "@type": "Offer" },
        },
      ],
    },
    { "@type": "https://schema.org/Article" },
  ]);
  assert.deepEqual(
    new Set(data.nodes.flatMap((n) => n.types)),
    new Set(["Product", "Thing", "Offer", "Article"]),
  );
  assert.equal(
    data.nodes.find((n) => n.types.includes("Product"))?.id,
    "#product",
  );
  assert.equal(data.unresolvedContext, false);
  assert.equal(
    schemaNodes([
      { "@context": { p: "https://schema.org/Product" }, "@type": "p" },
    ]).unresolvedContext,
    true,
  );
  assert.equal(
    schemaNodes([
      Array.from({ length: 5100 }, () => ({
        "@type": "https://schema.org/Thing",
      })),
    ]).truncated,
    true,
  );
});

test("unknown structured contexts and missing requested render cannot establish contract absence", () => {
  const config = parseConfig({
    ...base,
    contracts: [
      {
        pathPrefix: "/",
        requiredStructuredTypes: ["Product"],
        googleFeatures: ["product-snippet"],
      },
    ],
  });
  const unknown = observation(
    undefined,
    '<script type="application/ld+json">{"@context":"https://www.example.com/context", "@type":"Something"}</script>',
  );
  assert.equal(
    result("structured-contract", unknown, config).outcome,
    "not-tested",
  );
  assert.equal(
    result("google-product-basics", unknown, config).outcome,
    "not-tested",
  );
  for (const rule of [
    "navigation-contract",
    "alternate-contract",
    "structured-contract",
    "google-product-basics",
  ]) {
    const required = parseConfig({
      ...config,
      render: "all",
      contracts: [
        {
          pathPrefix: "/",
          requiredLinks: ["https://www.example.com/help"],
          requiredAlternates: [
            { language: "fr", target: "https://www.example.com/fr" },
          ],
          requiredStructuredTypes: ["Product"],
          googleFeatures: ["product-snippet"],
        },
      ],
    });
    assert.equal(result(rule, observation(), required).outcome, "not-tested");
  }
});

test("reanalysis remembers sitemap collection failures beyond the event display window", async () => {
  const directory = temporary(),
    store = new Store(directory),
    fixture = await fixtureSite();
  try {
    const project = store.createProject(fixture.config),
      id = store.createAudit(project);
    await new Crawler(
      store,
      new NetworkPolicy({ localOrigins: [fixture.origin] }),
    ).run(id);
    store.event(id, "sitemap-unavailable", { reason: "synthetic-test" });
    for (let i = 0; i < 110; i++) store.event(id, "progress", { step: i });
    assert.equal(store.events(id).length, 100);
    new Crawler(store).reevaluate(id);
    assert.equal(
      store
        .results(id, { limit: 10000 })
        .find(
          (r) =>
            r.ruleId === "sitemap-intent" &&
            r.url === fixture.origin + "/product",
        )?.outcome,
      "not-tested",
    );
    const coverage = store.coverage(id) as any;
    assert.equal(
      coverage.breakdowns.template.reduce(
        (n: number, v: any) => n + v.known,
        0,
      ),
      coverage.knownInventory,
    );
    assert.ok(
      coverage.breakdowns.language.some((v: any) => v.label === "unknown"),
    );
    assert.equal(coverage.breakdowns.profile[0].label, fixture.config.profile);
  } finally {
    store.close();
    await fixture.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test("robots redirects apply to the original authority, block escapes, and honor declared delay", async () => {
  for (const escape of [false, true]) {
    const directory = temporary(),
      store = new Store(directory),
      fixture = await fixtureSite({
        routes: {
          "/robots.txt": {
            status: 302,
            headers: {
              location: escape
                ? "http://169.254.169.254/robots.txt"
                : "/robots-policy",
            },
            body: "",
          },
          "/robots-policy": {
            status: 200,
            body: "User-agent: SEO-Workbench\nDisallow: /private\nCrawl-delay: 0.1\n",
          },
        },
      });
    try {
      const config = parseConfig({
        ...fixture.config,
        seeds: [fixture.origin + "/private", fixture.origin + "/guide"],
        inventory: [],
        sitemaps: [],
        maxDepth: 0,
      });
      const id = store.createAudit(store.createProject(config));
      await new Crawler(
        store,
        new NetworkPolicy({ localOrigins: [fixture.origin] }),
      ).run(id);
      assert.equal(
        store.pages(id, 0, 100).find((p) => p.url.endsWith("/private"))?.state,
        escape ? "blocked" : "excluded",
      );
      if (!escape) {
        const robots = (store.events(id) as any[]).find(
          (e) => e.kind === "robots-observation",
        ).detail;
        assert.equal(robots.redirects.length, 1);
        assert.equal(robots.crawlDelaySeconds, 0.1);
        const guide = store.observation(id, fixture.origin + "/guide")!;
        assert.ok(
          Date.parse(guide.response!.requestedAt) -
            Date.parse(robots.timestamp) >=
            85,
        );
      } else assert.equal(store.audit(id).state, "partial");
    } finally {
      store.close();
      await fixture.close();
      rmSync(directory, { recursive: true, force: true });
    }
  }
});

test("migration comparison maps approved navigation and alternate destinations", async () => {
  const directory = temporary(),
    store = new Store(directory);
  try {
    const old = parseConfig({
      ...base,
      contracts: [
        {
          pathPrefix: "/",
          requiredLinks: ["https://www.example.com/help"],
          requiredAlternates: [
            { language: "fr", target: "https://www.example.com/fr" },
          ],
        },
      ],
    });
    const next = parseConfig({
      ...old,
      seeds: ["https://staging.example.com/"],
      origins: ["https://staging.example.com/"],
      contracts: [
        {
          ...old.contracts[0],
          requiredLinks: ["https://staging.example.com/help"],
          requiredAlternates: [
            { language: "fr", target: "https://staging.example.com/fr" },
          ],
        },
      ],
    });
    const before = store.createAudit(store.createProject(old)),
      after = store.createAudit(store.createProject(next));
    assert.equal(
      compare(store, before, after, {
        fromOrigin: "https://www.example.com",
        toOrigin: "https://staging.example.com",
      }).configComparable,
      true,
    );
  } finally {
    store.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test("page/result sorting is allowlisted and URL search treats wildcard characters literally", () => {
  const directory = temporary(),
    store = new Store(directory);
  try {
    const id = store.createAudit(store.createProject(base));
    for (const path of ["/ordinary", "/with_under", "/percent%25"])
      store.discover(
        id,
        "https://www.example.com" + path,
        path,
        "inventory",
        null,
        null,
      );
    assert.equal(store.pages(id, 0, 100, "_").length, 1);
    assert.equal(store.pages(id, 0, 100, "%").length, 1);
    assert.throws(() => store.pages(id, 0, 100, "", "url; DELETE FROM urls"));
    store.saveAnalysis(
      id,
      "0.1.0",
      analyze({
        config: base,
        observations: [
          observation("https://www.example.com/with_under"),
          observation(),
        ],
        sitemapUrls: new Set(),
        inventoryUrls: new Set(),
      }),
    );
    assert.ok(
      store
        .results(id, { search: "_", sort: "state" })
        .every((r) => r.url.includes("_")),
    );
    assert.throws(() => store.results(id, { sort: "arbitrary" }));
  } finally {
    store.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test("CI gate cannot green-light missing structured contract prerequisites", () => {
  const directory = temporary(),
    store = new Store(directory);
  try {
    const config = parseConfig({
      ...base,
      contracts: [{ pathPrefix: "/", requiredStructuredTypes: ["Product"] }],
    });
    const id = store.createAudit(store.createProject(config)),
      o = observation(
        undefined,
        '<script type="application/ld+json">{"@context":{"p":"https://schema.org/Product"},"@type":"p"}</script>',
      );
    store.putObservation(id, o);
    store.saveAnalysis(
      id,
      "0.1.0",
      analyze({
        config,
        observations: [o],
        sitemapUrls: new Set(),
        inventoryUrls: new Set(),
      }),
    );
    store.state(id, "complete");
    assert.equal(gate(store, id), 3);
  } finally {
    store.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test("Product field checks abstain on unsupported property mappings instead of inventing missing fields", () => {
  const config = parseConfig({
    ...base,
    contracts: [{ pathPrefix: "/", googleFeatures: ["product-snippet"] }],
  });
  const html =
    '<script type="application/ld+json">{"@type":"https://schema.org/Product", "https://schema.org/name":"Synthetic object","https://schema.org/offers":{"@type":"https://schema.org/Offer"}}</script>';
  assert.equal(
    result("google-product-basics", observation(undefined, html), config)
      .outcome,
    "not-tested",
  );
});

test("Product basics reject empty details and distinguish graph references from missing data", () => {
  const config = parseConfig({
    ...base,
    contracts: [{ pathPrefix: "/", googleFeatures: ["product-snippet"] }],
  });
  const check = (details: unknown, extra: unknown[] = []) => {
    const markup = {
      "@context": "https://schema.org",
      "@graph": [
        { "@type": "Product", name: "Synthetic object", offers: details },
        ...extra,
      ],
    };
    return result(
      "google-product-basics",
      observation(
        undefined,
        '<script type="application/ld+json">' +
          JSON.stringify(markup) +
          "</script>",
      ),
      config,
    );
  };
  for (const empty of [
    null,
    false,
    0,
    "Offer",
    {},
    [],
    { "@type": "Offer" },
    { "@type": "Offer", price: "" },
    { "@type": "Offer", priceSpecification: {} },
  ])
    assert.equal(check(empty).outcome, "warning", JSON.stringify(empty));
  for (const populated of [
    { "@type": "Offer", price: 0 },
    [{ "@type": "Offer", price: "10" }],
  ])
    assert.equal(check(populated).outcome, "pass");
  assert.equal(
    check({ "@id": "#offer" }, [
      { "@id": "#offer", "@type": "Offer", price: 10 },
    ]).outcome,
    "pass",
  );
  assert.equal(check({ "@id": "#missing" }).outcome, "not-tested");
  assert.equal(
    check({ "@set": [{ "@type": "Offer", price: 10 }] }).outcome,
    "not-tested",
  );
  assert.equal(
    check({ "@id": "#offer" }, [
      { "@id": "#offer", "@type": "Offer", price: 10 },
      { "@id": "#offer", "@type": "Offer", price: 20 },
    ]).outcome,
    "not-tested",
  );
  assert.equal(
    check({ "@context": "https://www.example.com/context", price: 10 }).outcome,
    "not-tested",
  );
});

test("fact projections reduce body duplication and preserve immutable full evidence", () => {
  const directory = temporary(),
    store = new Store(directory);
  try {
    const id = store.createAudit(store.createProject(base)),
      o = observation();
    o.response!.bodyBase64 = Buffer.from(o.response!.body).toString("base64");
    o.render = {
      status: "observed",
      dom: "<main>Rendered synthetic guide</main>",
      facts: extract("<main>Rendered synthetic guide</main>", o.url),
    };
    store.putObservation(id, o);
    const projected = store.analysisObservations(id)[0];
    assert.equal(projected.evidenceProjection, "facts-only");
    assert.equal(projected.response!.body, "");
    assert.equal(projected.response!.bodyBase64, undefined);
    assert.equal(projected.render!.dom, undefined);
    assert.deepEqual(projected.facts, o.facts);
    assert.equal(
      store.observation(id, o.url)!.response!.body,
      o.response!.body,
    );
    assert.equal(store.observation(id, o.url)!.render!.dom, o.render.dom);
    const failed = observation("https://www.example.com/failed");
    failed.response = null;
    failed.attempts = [];
    failed.facts = null;
    failed.error = "request-timeout";
    store.putObservation(id, failed);
    assert.equal(
      store.analysisObservations(id).find((v) => v.url === failed.url)!
        .response,
      null,
    );
  } finally {
    store.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test("a job remains owned and analyzing until its immutable analysis is saved", async () => {
  const directory = temporary(),
    store = new Store(directory),
    fixture = await fixtureSite();
  try {
    const id = store.createAudit(store.createProject(fixture.config));
    const save = store.saveAnalysis.bind(store);
    let verified = false;
    store.saveAnalysis = (audit, ruleset, results) => {
      assert.equal(store.audit(id).state, "analyzing");
      assert.equal(store.audit(id).owner, process.pid);
      verified = true;
      return save(audit, ruleset, results);
    };
    await new Crawler(
      store,
      new NetworkPolicy({ localOrigins: [fixture.origin] }),
    ).run(id);
    assert.equal(verified, true);
    assert.equal(store.audit(id).state, "complete");
    assert.equal(store.audit(id).owner, null);
    assert.ok(store.latestAnalysis(id));
  } finally {
    store.close();
    await fixture.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test("explicit project cleanup removes imports and histories atomically while preserving other projects", () => {
  const directory = temporary(),
    store = new Store(directory);
  try {
    const first = store.createProject(base),
      second = store.createProject({
        ...base,
        name: "Other synthetic project",
      }),
      audit = store.createAudit(first);
    store.putObservation(audit, observation());
    store.addImport(first, "synthetic-private-record", { synthetic: true });
    store.createAudit(second);
    store.claim(audit);
    assert.throws(() => store.deleteProject(first));
    assert.equal(store.imports(first, "synthetic-private-record").length, 1);
    store.release(audit);
    store.deleteProject(first);
    assert.throws(() => store.project(first));
    assert.throws(() => store.audit(audit));
    assert.equal(store.projects().length, 1);
    assert.equal(store.project(second).name, "Other synthetic project");
  } finally {
    store.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test("locale input is validated and shareable coverage cannot expose private profile labels", () => {
  assert.throws(() => parseConfig({ ...base, locale: "invalid_locale!" }));
  const directory = temporary(),
    store = new Store(directory);
  try {
    const config = parseConfig({ ...base, locale: "en-x-demo" }),
      id = store.createAudit(store.createProject(config));
    assert.equal(
      JSON.stringify(
        JSON.parse(exportReport(store, id, "json", "shareable")),
      ).includes(config.locale),
      false,
    );
  } finally {
    store.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test("shareable reports do not inherit private coverage metadata or discovery labels", () => {
  const directory = temporary(),
    store = new Store(directory);
  try {
    const id = store.createAudit(store.createProject(base));
    const sentinel = "Synthetic confidential note";
    store.discover(id, base.seeds[0], base.seeds[0], sentinel, null, 0);
    const original = store.coverage.bind(store);
    store.coverage = (audit) => ({
      ...original(audit),
      futurePrivateMetadata: sentinel,
    });
    for (const format of ["json", "html", "markdown", "csv"] as const)
      assert.ok(
        !exportReport(store, id, format, "shareable").includes(sentinel),
      );
    const shared = JSON.parse(exportReport(store, id, "json", "shareable"));
    assert.equal(shared.coverage.knownInventory, 1);
    assert.equal(shared.coverage.futurePrivateMetadata, undefined);
    assert.equal(shared.coverage.sources, undefined);
    assert.ok(exportReport(store, id, "json", "private").includes(sentinel));
  } finally {
    store.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test("worker capacity and dead-owner recovery cannot disappear beyond the history page", () => {
  const directory = temporary(),
    store = new Store(directory);
  try {
    const project = store.createProject(base),
      first = store.createAudit(project);
    store.claim(first);
    let next = "";
    for (let i = 0; i < 110; i++) {
      next = store.createAudit(project);
      store.state(next, "paused");
    }
    assert.equal(
      store.audits().some((a) => a.id === first),
      false,
    );
    assert.equal(store.hasActiveJobs(), true);
    const count = store.projects().length;
    assert.throws(
      () => new Workbench(store).start(base),
      /audit-worker-capacity/,
    );
    assert.equal(store.projects().length, count);
    store.release(first); // Represent a stopped legacy owner without a lifetime lock.
    store.db
      .prepare("UPDATE audits SET owner=?,state='partial' WHERE id=?")
      .run(99999999, first);
    assert.throws(() => store.claim(next), /audit-not-runnable/);
    store.state(next, "queued"); // Resume explicitly before exercising dead-owner recovery.
    store.claim(next);
    assert.equal(store.audit(first).owner, null);
    assert.equal(store.audit(first).reason, "interrupted-worker");
    store.release(next);
  } finally {
    store.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test("rediscovering an already queued URL at the discovery ceiling does not fabricate partial coverage", async () => {
  const directory = temporary(),
    store = new Store(directory),
    fixture = await fixtureSite({
      routes: {
        "/robots.txt": { status: 200, body: "User-agent: *\nAllow: /" },
        "/": {
          status: 200,
          body: '<html lang="en"><title>Root</title><main><a href="/a">Known page</a></main></html>',
        },
        "/a": {
          status: 200,
          body: '<html lang="en"><title>Known page</title><main>Original synthetic guide</main></html>',
        },
      },
    });
  try {
    const config = parseConfig({
      ...fixture.config,
      seeds: [fixture.origin + "/", fixture.origin + "/a"],
      inventory: [],
      sitemaps: [],
      contracts: [],
      maxDiscoveries: 2,
    });
    const id = store.createAudit(store.createProject(config));
    await new Crawler(
      store,
      new NetworkPolicy({ localOrigins: [fixture.origin] }),
    ).run(id);
    assert.equal(store.count(id), 2);
    assert.equal(store.audit(id).state, "complete");
    assert.equal(store.coverage(id).completeDiscoveredQueue, true);
  } finally {
    store.close();
    await fixture.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test("public errors explain next steps without echoing private diagnostic input", () => {
  assert.match(
    explainError("audit-worker-capacity"),
    /Another audit is already running/,
  );
  assert.match(
    explainError("export-inside-repository"),
    /outside the source repository/,
  );
  const privateValue = "private-input-not-to-repeat";
  assert.equal(explainError(privateValue), explainError("operation-failed"));
  assert.ok(!explainError(privateValue).includes(privateValue));
});

test("incomplete requested browser checks leave the audit partial and the gate incomplete", async () => {
  const directory = temporary(),
    store = new Store(directory),
    fixture = await fixtureSite();
  try {
    fixture.setFixed(true);
    const config = parseConfig({
      ...fixture.config,
      contracts: [],
      render: "all",
      renderTimeoutMs: 100,
      renderReadySelector: "#never-present",
      seeds: [fixture.origin + "/client"],
      include: ["/client"],
    });
    const project = store.createProject(config),
      id = store.createAudit(project);
    await new Crawler(
      store,
      new NetworkPolicy({
        localOrigins: [fixture.origin],
      }),
    ).run(id);
    assert.ok(
      store
        .analysisObservations(id)
        .some((o) => o.render && o.render.status !== "observed"),
    );
    assert.equal(store.audit(id).state, "partial");
    assert.equal(store.audit(id).reason, "rendering-incomplete");
    assert.equal(store.coverage(id).completeDiscoveredQueue, false);
    assert.equal(gate(store, id), 3);
  } finally {
    store.close();
    await fixture.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
test("unavailable configured sitemap leaves coverage partial without requiring a membership contract", async () => {
  const directory = temporary(),
    store = new Store(directory),
    fixture = await fixtureSite();
  try {
    const config = parseConfig({
      ...fixture.config,
      contracts: [],
      sitemaps: [fixture.origin + "/missing-sitemap.xml"],
    });
    const project = store.createProject(config),
      id = store.createAudit(project);
    await new Crawler(
      store,
      new NetworkPolicy({ localOrigins: [fixture.origin] }),
    ).run(id);
    assert.ok(store.hasEvent(id, "sitemap-unavailable"));
    assert.equal(store.audit(id).state, "partial");
    assert.equal(store.audit(id).reason, "sitemap-incomplete");
    assert.equal(gate(store, id), 3);
  } finally {
    store.close();
    await fixture.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test("pending DNS lookup obeys cancellation and timeout without opening a request", async () => {
  const controller = new AbortController();
  const policy = new NetworkPolicy({
    resolver: () => {
      controller.abort();
      return new Promise(() => {});
    },
  });
  await assert.rejects(
    policy.address(base.seeds[0], controller.signal, 100),
    /cancelled/,
  );
  const hanging = new NetworkPolicy({ resolver: () => new Promise(() => {}) });
  await assert.rejects(
    hanging.address(base.seeds[0], undefined, 20),
    /dns-timeout/,
  );
  const transport = new Transport(
    parseConfig({ ...base, timeoutMs: 100 }),
    hanging,
  );
  await assert.rejects(transport.request(base.seeds[0]), /dns-timeout/);
  assert.equal(transport.requests, 0);
});
test("late DNS answers are ignored and a failed lookup does not block the next request", async () => {
  const fixture = await fixtureSite();
  try {
    let answer: (value: { address: string; family: number }[]) => void;
    const policy = new NetworkPolicy({
      localOrigins: [fixture.origin],
      resolver: () =>
        new Promise((resolve) => {
          answer = resolve;
        }),
    });
    const transport = new Transport(
      parseConfig({ ...base, timeoutMs: 100, delayMs: 0 }),
      policy,
    );
    await assert.rejects(transport.request(base.seeds[0]), /dns-timeout/);
    answer!([{ address: "93.184.216.34", family: 4 }]);
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(transport.requests, 0);
    assert.equal((await transport.request(fixture.origin)).status, 200);
    assert.equal(transport.requests, 1);
  } finally {
    await fixture.close();
  }
});
test("pre-cancelled address lookup never invokes the resolver", async () => {
  let calls = 0;
  const policy = new NetworkPolicy({
    resolver: async () => {
      calls++;
      return [];
    },
  });
  await assert.rejects(
    policy.address(base.seeds[0], AbortSignal.abort()),
    /cancelled/,
  );
  assert.equal(calls, 0);
});

test("resuming an expired audit does not renew the time budget or send requests", async () => {
  const directory = temporary(),
    store = new Store(directory);
  let lookups = 0;
  try {
    const config = parseConfig({ ...base, maxSeconds: 1 }),
      project = store.createProject(config),
      id = store.createAudit(project);
    store.db
      .prepare("UPDATE audits SET created=? WHERE id=?")
      .run(new Date(Date.now() - 2000).toISOString(), id);
    await new Crawler(
      store,
      new NetworkPolicy({
        resolver: async () => {
          lookups++;
          return [{ address: "93.184.216.34", family: 4 }];
        },
      }),
    ).run(id);
    assert.equal(lookups, 0);
    assert.equal(store.audit(id).requests, 0);
    assert.equal(store.audit(id).state, "partial");
    assert.equal(store.audit(id).reason, "time-budget");
  } finally {
    store.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test("an in-flight HTTP request cannot outlive the remaining audit time budget", async () => {
  const fixture = await fixtureSite({ slowMs: 200 });
  try {
    const transport = new Transport(
      parseConfig({ ...base, timeoutMs: 1000, maxSeconds: 1, delayMs: 0 }),
      new NetworkPolicy({ localOrigins: [fixture.origin] }),
      undefined,
      undefined,
      Date.now() - 950,
    );
    await assert.rejects(transport.request(fixture.origin), /time-budget/);
    assert.equal(transport.requests, 1);
    await assert.rejects(transport.request(fixture.origin), /time-budget/);
    assert.equal(transport.requests, 1);
  } finally {
    await fixture.close();
  }
});

test("an audit timeout remains terminal when the wall clock has not advanced", async (t) => {
  const fixture = await fixtureSite({ slowMs: 200 });
  const clock = Date.now();
  const transport = new Transport(
    parseConfig({ ...base, timeoutMs: 1000, maxSeconds: 1, delayMs: 0 }),
    new NetworkPolicy({ localOrigins: [fixture.origin] }),
    undefined,
    undefined,
    clock - 960,
  );
  t.mock.method(Date, "now", () => clock);
  try {
    const first = transport.request(fixture.origin);
    const queued = transport.request(fixture.origin);
    await assert.rejects(first, /time-budget/);
    await assert.rejects(queued, /time-budget/);
    await assert.rejects(transport.request(fixture.origin), /time-budget/);
    assert.equal(transport.requests, 1);
  } finally {
    t.mock.restoreAll();
    await fixture.close();
  }
});

test("per-audit storage isolates histories and body deduplication preserves original evidence", () => {
  const directory = temporary();
  let store = new Store(directory);
  try {
    const project = store.createProject(base),
      first = store.createAudit(project),
      second = store.createAudit(project);
    const before = store.storageEstimate(second),
      o = observation(
        undefined,
        "<main>" + "Fictional café ".repeat(15000) + "</main>",
      );
    o.response!.bodyBase64 = Buffer.from(o.response!.body).toString("base64");
    const original = JSON.stringify(o);
    store.putObservation(first, o);
    assert.equal(JSON.stringify(o), original);
    const stored = String(
      store.db.prepare("SELECT data FROM observations WHERE id=?").get(o.id)!
        .data,
    );
    assert.ok(Buffer.byteLength(stored) < Buffer.byteLength(original) * 0.8);
    assert.deepEqual(store.observation(first, o.url), o);
    assert.equal(store.storageEstimate(second), before);
    store.assertStorage(second);
    const estimate = store.storageEstimate(first);
    store.close();
    store = new Store(directory);
    assert.equal(store.storageEstimate(first), estimate);
    assert.deepEqual(store.observation(first, o.url), o);
    assert.equal(
      JSON.stringify(store.analysisObservations(first)).includes(
        "bodyFromResponse",
      ),
      false,
    );
    const tiny = store.createAudit(
      project,
      parseConfig({ ...base, maxStorageBytes: 10000 }),
    );
    const tinyBefore = store.storageEstimate(tiny),
      r = result("title-review", o);
    assert.throws(
      () =>
        store.saveAnalysis(tiny, "0.1.0", [
          {
            ...r,
            reason: Array.from(
              { length: 20000 },
              (_, i) => randomUUID() + i,
            ).join(" "),
          },
        ]),
      /persistent-storage-budget/,
    );
    assert.equal(store.latestAnalysis(tiny), null);
    assert.equal(store.storageEstimate(tiny), tinyBefore);
    const beforeAnalysis = store.storageEstimate(second);
    const analysis = store.saveAnalysis(second, "0.1.0", [
      result("title-review", o),
    ]);
    store.db.prepare("DELETE FROM analyses WHERE id=?").run(analysis);
    assert.equal(store.storageEstimate(second), beforeAnalysis);
    store.deleteAudit(first);
    assert.equal(store.storageEstimate(second), beforeAnalysis);
  } finally {
    store.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test("schema-one migration accounts existing immutable captures without rewriting them", () => {
  const directory = temporary();
  let store = new Store(directory);
  try {
    const id = store.createAudit(store.createProject(base)),
      o = observation();
    const originalConfig = { ...base, maxStorageBytes: 100_000_000 } as Record<
      string,
      unknown
    >;
    delete originalConfig.maxDownloadBytes;
    const configText = JSON.stringify(originalConfig);
    store.db
      .prepare("UPDATE audits SET config=? WHERE id=?")
      .run(configText, id);
    store.db
      .prepare("UPDATE projects SET config=? WHERE id=?")
      .run(configText, store.audit(id).projectId);
    const raw = JSON.stringify(o);
    store.db
      .prepare("INSERT INTO observations VALUES(?,?,?,?)")
      .run(o.id, id, o.url, raw);
    const legacyAnalysis = randomUUID(),
      legacyResult = result("title-review", o);
    store.db
      .prepare("INSERT INTO analyses VALUES(?,?,?,?)")
      .run(legacyAnalysis, id, "0.1.0", new Date().toISOString());
    store.db
      .prepare("INSERT INTO results VALUES(?,?,?,?,?,?)")
      .run(
        legacyAnalysis,
        legacyResult.id,
        legacyResult.ruleId,
        legacyResult.url,
        legacyResult.outcome,
        JSON.stringify(legacyResult),
      );
    const estimate = store.storageEstimate(id);
    const triggers = store.db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='trigger' AND name LIKE 'storage_%'",
      )
      .all();
    for (const row of triggers) store.db.exec("DROP TRIGGER " + row.name);
    store.db.exec(
      "DROP TABLE worker_claims; DROP TABLE analysis_dictionaries; DROP TABLE audit_storage; PRAGMA user_version=1",
    );
    store.close();
    store = new Store(directory);
    assert.equal(store.storageEstimate(id), estimate);
    assert.deepEqual(store.results(id), [legacyResult]);
    assert.equal(store.audit(id).config.maxDownloadBytes, 100_000_000);
    assert.equal(
      store.project(store.audit(id).projectId).maxDownloadBytes,
      100_000_000,
    );
    assert.equal(
      store.db.prepare("SELECT config FROM audits WHERE id=?").get(id)!.config,
      configText,
    );

    assert.equal(
      store.db.prepare("SELECT data FROM observations WHERE id=?").get(o.id)!
        .data,
      raw,
    );
    assert.deepEqual(store.observation(id, o.url), o);
    assert.throws(
      () =>
        store.db
          .prepare("UPDATE observations SET data=? WHERE id=?")
          .run("{}", o.id),
      /immutable evidence/,
    );
    assert.equal(
      store.db.prepare("PRAGMA user_version").get()!.user_version,
      5,
    );
  } finally {
    store.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test("large synthetic pages pass forty pages and storage stops retain a useful partial analysis", async () => {
  const directory = temporary(),
    store = new Store(directory);
  const routes = Object.fromEntries(
    Array.from({ length: 100 }, (_, i) => [
      i === 0 ? "/" : "/p/" + i,
      {
        status: 200,
        body:
          '<html lang="en"><title>Synthetic guide ' +
          i +
          '</title><main><h1>Fictional guide</h1><p>Original fixture description.</p></main><script type="application/json">"' +
          "x".repeat(100000) +
          '"</script></html>',
      },
    ]),
  );
  const fixture = await fixtureSite({ pages: 100, routes });
  try {
    for (const limit of [250_000_000, 8_000_000]) {
      const config = parseConfig({
        ...fixture.config,
        maxPages: 100,
        maxStorageBytes: limit,
        maxDownloadBytes: 50_000_000,
        delayMs: 0,
      });
      const id = store.createAudit(store.createProject(config));
      await new Crawler(
        store,
        new NetworkPolicy({ localOrigins: [fixture.origin] }),
      ).run(id);
      const coverage = store.coverage(id),
        states = coverage.states as Record<string, number>;
      assert.ok(store.latestAnalysis(id));
      assert.ok(store.results(id).length);
      if (limit === 250_000_000) {
        assert.equal(states.fetched, 100);
        assert.equal(store.audit(id).state, "complete");
      } else {
        assert.ok(states.fetched > 0 && states.fetched < 40);
        assert.equal(store.audit(id).reason, "persistent-storage-budget");
        assert.ok(states.queued > 0);
        for (const format of ["html", "markdown"] as const)
          assert.ok(
            exportReport(store, id, format, "shareable").includes(
              "The audit could not continue within its saved-data limit.",
            ),
          );
        assert.equal(gate(store, id), 3);
      }
    }
  } finally {
    store.close();
    await fixture.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test("lossless result storage preserves historical wording and schema-two/three records", () => {
  for (const legacyVersion of [2, 3]) {
    const directory = temporary();
    let store = new Store(directory);
    try {
      const id = store.createAudit(store.createProject(base)),
        o = observation(),
        r = {
          ...result("title-review", o),
          reason: "Original fictional café guidance. ".repeat(100),
        };
      store.putObservation(id, o);
      const legacy = randomUUID();
      store.db
        .prepare("INSERT INTO analyses VALUES(?,?,?,?)")
        .run(legacy, id, "0.1.0", new Date().toISOString());
      const original =
        legacyVersion === 2
          ? JSON.stringify(r)
          : JSON.stringify({
              storedEncoding: "deflate-base64-v1",
              data: deflateRawSync(Buffer.from(JSON.stringify(r)), {
                level: 1,
              }).toString("base64"),
            });
      store.db
        .prepare("INSERT INTO results VALUES(?,?,?,?,?,?)")
        .run(legacy, r.id, r.ruleId, r.url, r.outcome, original);
      store.db.exec(
        "DROP TRIGGER storage_dictionary_insert; DROP TRIGGER storage_dictionary_delete; DROP TRIGGER immutable_analysis_dictionaries; DROP TABLE worker_claims; DROP TABLE analysis_dictionaries; PRAGMA user_version=" +
          legacyVersion,
      );
      store.close();
      store = new Store(directory);
      assert.equal(
        store.db
          .prepare("SELECT data FROM results WHERE analysis_id=?")
          .get(legacy)!.data,
        original,
      );
      assert.deepEqual(store.results(id, { analysis: legacy }), [r]);
      const changed = {
        ...r,
        reason: "Revised fictional café guidance. ".repeat(100),
        remediation: "Review this revised synthetic instruction.",
      };
      const newer = store.saveAnalysis(id, "0.1.1", [changed]);
      assert.ok(
        String(
          store.db
            .prepare("SELECT data FROM results WHERE analysis_id=?")
            .get(newer)!.data,
        ).length <
          JSON.stringify(changed).length / 2,
      );
      store.close();
      store = new Store(directory);
      assert.deepEqual(store.results(id, { analysis: newer }), [changed]);
      assert.deepEqual(store.results(id, { analysis: legacy }), [r]);
      assert.deepEqual(store.observation(id, o.url), o);
      assert.throws(
        () =>
          store.db
            .prepare("UPDATE results SET data=? WHERE analysis_id=?")
            .run("{}", newer),
        /immutable analysis/,
      );
    } finally {
      store.close();
      rmSync(directory, { recursive: true, force: true });
    }
  }
});

test("canonical response headers participate in requirements and conflicts without invented coverage", () => {
  const o = observation();
  o.response!.headers.link = '</preferred>; rel="canonical"';
  const expected = parseConfig({
    ...base,
    contracts: [
      { pathPrefix: "/", canonical: "https://www.example.com/preferred" },
    ],
  });
  assert.equal(result("canonical-contract", o, expected).outcome, "pass");
  assert.equal(result("canonical-consistency", o).outcome, "pass");
  const html = observation(
    o.url,
    '<link rel="canonical" href="/preferred"><main>Synthetic guide</main>',
  );
  html.response!.headers.link = o.response!.headers.link;
  assert.equal(result("canonical-consistency", html).outcome, "pass");
  html.response!.headers.link = '</other>; rel="canonical"';
  assert.equal(result("canonical-consistency", html).outcome, "warning");
  o.response!.headers.link = '</preferred>; rel="canonical"; anchor="/other"';
  assert.equal(result("canonical-contract", o, expected).outcome, "not-tested");
  assert.equal(result("canonical-consistency", o).outcome, "not-tested");
});

test("non-HTML documents use header indexing and canonical evidence without requiring HTML", () => {
  const o = observation("https://www.example.com/document.pdf");
  o.facts = null;
  o.response!.headers["content-type"] = "application/pdf";
  o.response!.headers.link = '</preferred.pdf>; rel="canonical"';
  o.response!.headers["x-robots-tag"] = "noindex";
  const config = parseConfig({
    ...base,
    contracts: [
      {
        pathPrefix: "/",
        indexability: "indexable",
        canonical: "https://www.example.com/preferred.pdf",
      },
    ],
  });
  assert.equal(result("canonical-contract", o, config).outcome, "pass");
  assert.equal(result("index-intent", o, config).outcome, "fail");
  const target = observation("https://www.example.com/preferred.pdf");
  target.facts = null;
  target.response!.headers["content-type"] = "application/pdf";
  assert.equal(result("canonical-target", o, config, [target]).outcome, "pass");
  o.response = null;
  assert.equal(result("canonical-contract", o, config).outcome, "not-tested");
});

test("indexing requirements ignore unrelated crawler and snippet-preview restrictions", () => {
  const config = parseConfig({
    ...base,
    contracts: [{ pathPrefix: "/", indexability: "indexable" }],
  });
  const o = observation();
  o.response!.headers["x-robots-tag"] = "otherbot: noindex";
  assert.equal(result("index-intent", o, config).outcome, "pass");
  const preview = observation(
    o.url,
    '<meta name="robots" content="max-image-preview: none"><main>Synthetic guide</main>',
  );
  assert.equal(result("index-intent", preview, config).outcome, "pass");
  o.response!.robotsTags = ["otherbot: noindex", "noindex"];
  assert.equal(result("index-intent", o, config).outcome, "fail");
});

test("ambiguous scoped headers in older captures require fresh evidence instead of passing", () => {
  const config = parseConfig({
    ...base,
    contracts: [{ pathPrefix: "/", indexability: "indexable" }],
  });
  const o = observation();
  o.response!.headers["x-robots-tag"] = "otherbot: nofollow, noindex";
  assert.equal(result("index-intent", o, config).outcome, "not-tested");
  o.response!.robotsTags = ["otherbot: nofollow, noindex"];
  assert.equal(result("index-intent", o, config).outcome, "pass");
  o.response!.robotsTags = ["otherbot: nofollow", "noindex"];
  assert.equal(result("index-intent", o, config).outcome, "fail");
});

test("the crawler discovers header-only canonical targets on non-HTML documents", async () => {
  const fixture = await fixtureSite({
    routes: {
      "/robots.txt": { status: 404, body: "" },
      "/document.pdf": {
        status: 200,
        headers: {
          "content-type": "application/pdf",
          link: '</preferred.pdf>; rel="canonical"',
        },
        body: "Synthetic non-HTML response",
      },
      "/preferred.pdf": {
        status: 200,
        headers: { "content-type": "application/pdf" },
        body: "Synthetic preferred response",
      },
    },
  });
  const directory = temporary(),
    store = new Store(directory);
  try {
    const config = parseConfig({
      seeds: [fixture.origin + "/document.pdf"],
      origins: [fixture.origin],
      sitemaps: [],
      render: "none",
      delayMs: 0,
    });
    const id = store.createAudit(store.createProject(config));
    await new Crawler(
      store,
      new NetworkPolicy({ localOrigins: [fixture.origin] }),
    ).run(id);
    assert.equal(
      store.observation(id, fixture.origin + "/preferred.pdf")?.response
        ?.status,
      200,
    );
    assert.equal(
      store
        .results(id)
        .find(
          (r) =>
            r.url.endsWith("/document.pdf") && r.ruleId === "canonical-target",
        )?.outcome,
      "pass",
    );
    assert.equal(store.audit(id).state, "complete");
  } finally {
    store.close();
    await fixture.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test("comparison mappings reject invalid inputs across the shared comparison boundary", () => {
  const directory = temporary(),
    store = new Store(directory);
  try {
    const before = store.createAudit(store.createProject(base)),
      after = store.createAudit(store.createProject(base));
    const credentialUrl = new URL("https://www.example.com/");
    credentialUrl.username = "fictional";
    credentialUrl.password = "synthetic";
    for (const mapping of [
      null,
      [],
      { unknown: true },
      { fromOrigin: "https://www.example.com" },
      {
        fromOrigin: "https://www.example.com/path",
        toOrigin: "https://staging.example.com",
      },
      { urls: { bad: "https://www.example.com/" } },
      { urls: { "https://www.example.com/": "file:///path/to/page" } },
      {
        urls: {
          "https://www.example.com/": credentialUrl.href,
        },
      },
      { urls: { "https://www.example.com/": "https://www.example.com/#part" } },
    ]) {
      assert.throws(
        () => compare(store, before, after, mapping as any),
        /comparison-mapping-invalid/,
      );
    }
    assert.equal(
      compare(store, before, after, {
        fromOrigin: "https://www.example.com/",
        toOrigin: "https://www.example.com/",
      }).configComparable,
      true,
    );
  } finally {
    store.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test("many-to-one page mappings and changed rule versions cannot verify findings", () => {
  const directory = temporary(),
    store = new Store(directory);
  try {
    const project = store.createProject(base),
      before = store.createAudit(project),
      after = store.createAudit(project);
    const first = observation("https://www.example.com/old-a"),
      second = observation("https://www.example.com/old-b"),
      target = observation("https://www.example.com/new");
    for (const o of [first, second]) store.putObservation(before, o);
    store.putObservation(after, target);
    const failing = [first, second].map((o) => ({
      ...result("title-review", o),
      outcome: "fail" as const,
    }));
    store.saveAnalysis(before, "0.1.0", failing);
    store.saveAnalysis(after, "0.1.0", [
      { ...result("title-review", target), outcome: "pass" },
    ]);
    const mapping = {
      urls: { [first.url]: target.url, [second.url]: target.url },
    };
    const comparison = compare(store, before, after, mapping);
    assert.equal(comparison.configComparable, true);
    assert.deepEqual(
      comparison.changes.map((c) => c.state),
      ["not-verifiable", "not-verifiable"],
    );
    assert.equal(
      compare(store, before, after, {
        urls: { [first.url]: target.url },
      }).changes.find((c) => c.before?.url === first.url)?.state,
      "resolved",
    );
    store.saveAnalysis(before, "0.1.0", [
      {
        ...result("title-review", target),
        outcome: "pass",
        ruleVersion: "0.1.0",
      },
    ]);
    store.saveAnalysis(after, "0.1.1", [
      {
        ...result("title-review", target),
        outcome: "fail",
        ruleVersion: "0.1.1",
      },
    ]);
    assert.equal(
      compare(store, before, after).changes[0].state,
      "not-verifiable",
    );
    store.saveAnalysis(after, "0.1.0", [
      {
        ...result("title-review", target),
        outcome: "fail",
        ruleVersion: "0.1.0",
      },
    ]);
    assert.equal(compare(store, before, after).changes[0].state, "introduced");
    for (const outcome of [
      "not-tested",
      "error",
      "blocked",
      "not-applicable",
    ] as const) {
      store.saveAnalysis(before, "0.1.0", [
        { ...result("title-review", target), outcome, ruleVersion: "0.1.0" },
      ]);
      assert.equal(
        compare(store, before, after).changes[0].state,
        "not-verifiable",
      );
    }
    store.saveAnalysis(before, "0.1.0", []);
    assert.equal(
      compare(store, before, after).changes[0].state,
      "not-verifiable",
    );
  } finally {
    store.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test("decoded findings respect memory allowances while paginated reads remain available", () => {
  const directory = temporary(),
    store = new Store(directory);
  try {
    const config = parseConfig({ ...base, maxMemoryBytes: 33554432 });
    const id = store.createAudit(store.createProject(config));
    const o = observation();
    const seed = result(
      "title-review",
      o,
      parseConfig({ ...base, maxMemoryBytes: 2147483648 }),
    );
    store.saveAnalysis(
      id,
      "0.1.0",
      Array.from({ length: 9 }, (_, i) => ({
        ...seed,
        id: randomUUID(),
        url: o.url + i,
        reason: "Synthetic bounded result. ".repeat(45000),
      })),
    );
    assert.equal(store.results(id, { limit: 1 }).length, 1);
    assert.equal(store.results(id, { offset: 8, limit: 1 }).length, 1);
    assert.throws(
      () => store.results(id, { limit: 9 }),
      /results-memory-budget/,
    );
    assert.throws(
      () => exportReport(store, id, "json"),
      /results-memory-budget/,
    );
    assert.throws(
      () => exportReport(store, id, "csv"),
      /results-memory-budget/,
    );
    assert.throws(() => compare(store, id, id), /results-memory-budget/);
  } finally {
    store.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test("whole reports refuse the retrieval ceiling before decoding; CSV avoids unused report sections", () => {
  const directory = temporary(),
    store = new Store(directory);
  try {
    const id = store.createAudit(store.createProject(base)),
      o = observation();
    const finding = {
      ...result(
        "title-review",
        o,
        parseConfig({ ...base, maxMemoryBytes: 2147483648 }),
      ),
      outcome: "fail" as const,
      reason: "Synthetic private finding.",
    };
    const analysis = store.saveAnalysis(id, "0.1.0", [finding]);
    store.analysisObservations = () => {
      throw new Error("unused-observations");
    };
    store.imports = () => {
      throw new Error("unused-imports");
    };
    assert.ok(exportReport(store, id, "csv").includes(finding.reason));
    const shared = exportReport(store, id, "csv", "shareable");
    assert.ok(!shared.includes(finding.reason) && !shared.includes(o.url));
    store.db.exec(
      `CREATE TEMP VIEW results AS WITH RECURSIVE n(x) AS (VALUES(1) UNION ALL SELECT x+1 FROM n WHERE x<1000001) SELECT '${analysis}' AS analysis_id FROM n`,
    );
    for (const format of ["json", "markdown", "html", "csv"] as const)
      assert.throws(
        () => exportReport(store, id, format),
        /results-count-budget/,
      );
    assert.throws(() => compare(store, id, id), /results-count-budget/);
    assert.throws(
      () => store.results(id, { limit: 1_000_000 }),
      /results-count-budget/,
    );
    store.db.exec("DROP VIEW temp.results");
    store.assertCompleteResults(id);
  } finally {
    store.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test("result pagination refuses unlimited, fractional and non-finite SQL limits", () => {
  const directory = temporary(),
    store = new Store(directory);
  try {
    const id = store.createAudit(store.createProject(base));
    for (const limit of [-1, 0, 0.5, Infinity, NaN, 1000001])
      assert.throws(
        () => store.results(id, { limit }),
        /invalid-result-pagination/,
      );
    for (const offset of [-1, 0.5, Infinity, NaN])
      assert.throws(
        () => store.results(id, { offset }),
        /invalid-result-pagination/,
      );
    assert.deepEqual(store.results(id, { offset: 0, limit: 1 }), []);
  } finally {
    store.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test("facts-only projection budgets include retained response metadata and exclude captured bodies", () => {
  const directory = temporary(),
    store = new Store(directory);
  try {
    const config = parseConfig({ ...base, maxMemoryBytes: 33554432 });
    const project = store.createProject(config),
      bodies = store.createAudit(project),
      metadata = store.createAudit(project);
    const o = observation();
    for (let i = 0; i < 9; i++) {
      const page = { ...o, id: randomUUID(), url: o.url + i };
      const response = {
        ...o.response!,
        body: "Synthetic capture. ".repeat(60000),
      };
      store.putObservation(bodies, { ...page, response, attempts: [response] });
      const largeHeader = {
        ...o.response!,
        headers: {
          ...o.response!.headers,
          "synthetic-review": "Synthetic metadata. ".repeat(60000),
        },
      };
      store.putObservation(metadata, {
        ...page,
        id: randomUUID(),
        response: largeHeader,
        attempts: [largeHeader],
      });
    }
    const projected = store.analysisObservations(bodies);
    assert.equal(projected.length, 9);
    assert.ok(
      projected.every(
        (p) => p.response!.body === "" && p.attempts[0].body === "",
      ),
    );
    assert.throws(
      () => store.analysisObservations(metadata),
      /analysis-memory-budget/,
    );
  } finally {
    store.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

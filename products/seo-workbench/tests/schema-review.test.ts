import test from "node:test";
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";
import {
  readFileSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { structuredVocabulary } from "../src/schema-review.ts";
import { populatedDetails, schemaNodes } from "../src/schema.ts";
import { analyze } from "../src/rules.ts";
import { extract } from "../src/extract.ts";
import { parseConfig, RULESET } from "../src/domain.ts";
import type { Observation } from "../src/domain.ts";
const base = "https://www.example.com/product",
  context = "https://schema.org";
function checked(value: unknown, render: "none" | "all" = "none") {
  const config = parseConfig({
      origins: [new URL(base).origin],
      seeds: [base],
      render,
      contracts: [
        {
          pathPrefix: "/",
          requiredStructuredTypes: ["Product"],
          googleFeatures: ["product-snippet"],
        },
      ],
    }),
    facts = extract(
      `<title>Synthetic product</title><main><h1>Workshop lamp</h1></main><script type="application/ld+json">${JSON.stringify(value)}</script>`,
      base,
    );
  const observation: Observation = {
    id: "synthetic-observation",
    originalUrl: base,
    url: base,
    finalUrl: base,
    timestamp: new Date().toISOString(),
    response: {
      url: base,
      body: "",
      status: 200,
      headers: { "content-type": "text/html" },
      requestedAt: new Date().toISOString(),
      durationMs: 1,
      bytes: 0,
      address: "127.0.0.1",
    },
    facts,
    attempts: [],
    error: null,
    render: null,
  };
  return analyze({
    config,
    observations: [observation],
    sitemapUrls: new Set(),
    inventoryUrls: new Set(),
  });
}
test("pinned vocabulary data retains term relationships, version and separate licence", () => {
  const vocabulary = JSON.parse(
    readFileSync(
      new URL("../data/schema-vocabulary.json", import.meta.url),
      "utf8",
    ),
  );
  assert.equal(vocabulary.vocabularyVersion, "30.1");
  assert.equal(vocabulary.license, "CC-BY-SA-3.0");
  assert.match(vocabulary.sourceSha256, /^[a-f0-9]{64}$/);
  assert.equal(Object.keys(vocabulary.types).length, 939);
  assert.equal(Object.keys(vocabulary.properties).length, 1538);
  assert.equal(Object.keys(vocabulary.enumerations).length, 546);
  assert.deepEqual(vocabulary.types["3DModel"], ["MediaObject"]);
  assert.ok(vocabulary.properties.price.ranges.includes("Number"));
  assert.ok(vocabulary.enumerations.InStock.includes("ItemAvailability"));
  for (const parents of Object.values(vocabulary.types) as string[][])
    for (const parent of parents)
      assert.ok(Object.hasOwn(vocabulary.types, parent), parent);
});
test("recognition accepts standard and full term names while unknown names require review", () => {
  const good = structuredVocabulary(
    [
      {
        "@context": context,
        "@type": ["Product", "Thing"],
        "https://schema.org/name": "Workshop lamp",
        offers: { "@type": "Offer", price: "12", priceCurrency: "GBP" },
      },
    ],
    base,
  );
  assert.equal(good.complete, true);
  assert.deepEqual(good.unknownTypes, []);
  assert.deepEqual(good.unknownProperties, []);
  assert.deepEqual(
    structuredVocabulary(
      [{ "@context": context, "@type": "3DModel", name: "Synthetic geometry" }],
      base,
    ).unknownTypes,
    [],
  );
  const bad = structuredVocabulary(
    [{ "@context": context, "@type": "Prodcut", prcie: 12 }],
    base,
  );
  assert.deepEqual(bad.unknownTypes, ["Prodcut"]);
  assert.deepEqual(bad.unknownProperties, ["prcie"]);
  assert.equal(
    checked({ "@context": context, "@type": "Prodcut", prcie: 12 }).find(
      (r) => r.ruleId === "structured-vocabulary",
    )?.outcome,
    "warning",
  );
  assert.equal(
    checked({
      "@context": context,
      "@type": "Product",
      name: "Workshop lamp",
      offers: { "@type": "Offer", price: 12 },
    }).find((r) => r.ruleId === "structured-vocabulary")?.outcome,
    "pass",
  );
  assert.equal(
    checked({ "@context": context, "@type": "Product" }).find(
      (r) => r.ruleId === "structured-vocabulary",
    )?.ruleVersion,
    "0.1.1",
  );
  assert.equal(RULESET, "0.1.10");
});
test("relative and absolute references share a document base without fetching external entities", () => {
  const blocks = [
      {
        "@context": context,
        "@graph": [
          {
            "@type": "Product",
            name: "Workshop lamp",
            offers: { "@id": "#offer" },
            manufacturer: {
              "@id": "https://manufacturer.example/organisation",
            },
          },
          { "@id": base + "#offer", "@type": "Offer", price: 12 },
        ],
      },
    ],
    review = structuredVocabulary(blocks, base),
    graph = schemaNodes(blocks, base);
  assert.equal(
    review.references.find((r) => r.id === base + "#offer")?.state,
    "resolved-in-document",
  );
  assert.equal(
    review.references.find((r) => r.id.includes("manufacturer.example"))?.state,
    "not-defined-in-document",
  );
  assert.equal(
    populatedDetails({ "@id": "#offer" }, graph.nodes, base),
    "present",
  );
  const result = checked(blocks[0]).find(
    (r) => r.ruleId === "google-product-basics",
  );
  assert.equal(result?.outcome, "pass");
  const duplicated = schemaNodes(
    [
      ...blocks,
      {
        "@context": context,
        "@id": "#offer",
        "@type": "Offer",
        priceCurrency: "GBP",
      },
    ],
    base,
  );
  assert.equal(
    populatedDetails({ "@id": "#offer" }, duplicated.nodes, base),
    "unknown",
  );
  assert.equal(
    structuredVocabulary(
      [
        ...blocks,
        {
          "@context": context,
          "@id": "#offer",
          "@type": "Offer",
          priceCurrency: "GBP",
        },
      ],
      base,
    ).references.find((r) => r.id === base + "#offer")?.state,
    "multiple-definitions",
  );
});
test("unsupported contexts, collection syntax, malformed types and incomplete rendering cannot pass", () => {
  for (const value of [
    { "@context": { custom: "https://schema.org/Product" }, "@type": "custom" },
    { "@type": "https://schema.org/Product", name: "Workshop lamp" },
    {
      "@context": context,
      "@type": "Product",
      offers: { "@list": [{ "@type": "Offer", price: 12 }] },
    },
    { "@context": context, "@type": 12 },
    {
      "@context": context,
      "@type": "Product",
      "https://external.example/name": "Original extension",
    },
  ]) {
    assert.equal(structuredVocabulary([value], base).complete, false);
    assert.equal(
      checked(value).find((r) => r.ruleId === "structured-vocabulary")?.outcome,
      "not-tested",
    );
  }
  assert.equal(
    checked(
      { "@context": context, "@type": "Product", name: "Workshop lamp" },
      "all",
    ).find((r) => r.ruleId === "structured-vocabulary")?.outcome,
    "not-tested",
  );
  const large = schemaNodes(
    [
      Array.from({ length: 20000 }, () => ({
        "@context": context,
        "@type": "Thing",
      })),
    ],
    base,
  );
  assert.equal(large.truncated, true);
  assert.ok(large.nodes.length <= 5000);
});

test("offline vocabulary builder strips descriptive/private-shaped fields and preserves synthetic relationships", () => {
  const { stdout, status } = requirePython();
  assert.equal(status, 0);
  const result = JSON.parse(stdout);
  assert.deepEqual(result.types, { Product: ["Thing"], Thing: [] });
  assert.deepEqual(result.properties, {
    name: { domains: ["Thing"], ranges: ["Text"] },
  });
  assert.deepEqual(result.enumerations, { InStock: ["ItemAvailability"] });
  assert.ok(!JSON.stringify(result).includes("Synthetic omitted contributor"));
});
function requirePython() {
  return spawnSync(
    process.env.WORKBENCH_PYTHON ?? "python3",
    [
      "-c",
      `import importlib.util,json
spec=importlib.util.spec_from_file_location('vocabulary','tools/build_schema_vocabulary.py'); module=importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
fixture={'@graph':[{'@id':'schema:Product','@type':'rdfs:Class','rdfs:subClassOf':{'@id':'schema:Thing'},'rdfs:comment':'Synthetic omitted description','schema:contributor':'Synthetic omitted contributor'},{'@id':'schema:Thing','@type':'rdfs:Class'},{'@id':'schema:name','@type':'rdf:Property','schema:domainIncludes':{'@id':'schema:Thing'},'schema:rangeIncludes':[{'@id':'schema:Text'},{'@id':'external:Text'}]},{'@id':'schema:InStock','@type':'schema:ItemAvailability'},{'@id':'external:Class','@type':'rdfs:Class'}]}
print(json.dumps(module.build(fixture)))
try: module.build({'@graph':'invalid'})
except ValueError: pass
else: raise AssertionError('Invalid graph was accepted')
`,
    ],
    { encoding: "utf8" },
  );
}

test("collected HTML bases resolve graph references and digit-leading vocabulary types are valid contracts", () => {
  const facts = extract(
    '<base href="/catalogue/"><script type="application/ld+json">' +
      JSON.stringify(
        {
          "@context": context,
          "@graph": [
            { "@type": "Product", offers: { "@id": "#offer" } },
            {
              "@id": "https://www.example.com/catalogue/#offer",
              "@type": "Offer",
              price: 12,
            },
          ],
        },
        null,
        2,
      ) +
      "</script>",
    base,
  );
  assert.equal(facts.documentBase, "https://www.example.com/catalogue/");
  assert.equal(
    structuredVocabulary(facts.jsonld, facts.documentBase!).references[0].state,
    "resolved-in-document",
  );
  assert.doesNotThrow(() =>
    parseConfig({
      origins: [new URL(base).origin],
      seeds: [base],
      contracts: [{ pathPrefix: "/", requiredStructuredTypes: ["3DModel"] }],
    }),
  );
  assert.equal(
    structuredVocabulary(
      [
        {
          "@context": context,
          "@type": "Product",
          "@id": "invalid identifier",
        },
      ],
      base,
    ).complete,
    false,
  );
});

test("vocabulary source files reject unreviewed content and non-file inputs without creating output", () => {
  const root = mkdtempSync(join(tmpdir(), "seo-workbench-vocabulary-input-")),
    source = join(root, "synthetic-source.json"),
    output = join(root, "vocabulary.json");
  try {
    writeFileSync(source, JSON.stringify({ "@graph": [] }));
    for (const input of [source, root]) {
      const result = spawnSync(
        process.env.WORKBENCH_PYTHON ?? "python3",
        [
          "tools/build_schema_vocabulary.py",
          "--source",
          input,
          "--out",
          output,
        ],
        { encoding: "utf8", timeout: 2000 },
      );
      assert.equal(result.status, 1);
      assert.ok(!existsSync(output));
      assert.ok(!result.stderr.includes(root));
      assert.match(result.stderr, /could not be verified/);
    }
    if (process.platform !== "win32") {
      const fifo = join(root, "synthetic-pipe");
      assert.equal(spawnSync("mkfifo", [fifo]).status, 0);
      const result = spawnSync(
        process.env.WORKBENCH_PYTHON ?? "python3",
        ["tools/build_schema_vocabulary.py", "--source", fifo, "--out", output],
        { encoding: "utf8", timeout: 2000 },
      );
      assert.equal(result.status, 1);
      assert.ok(!existsSync(output));
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("rating formats and bounds reach the public Google feature outcome", () => {
  for (const [ratingValue, expected] of [
    ["60%", "pass"],
    ["6 / 10", "pass"],
    [999, "fail"],
  ] as const) {
    const finding = checked({
      "@context": context,
      "@type": "Product",
      name: "Fictional lamp",
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue,
        ratingCount: 5,
      },
    }).find((result) => result.ruleId === "google-feature-fields")!;
    assert.equal(finding.outcome, expected);
    assert.equal(finding.ruleVersion, "0.1.3");
  }
});

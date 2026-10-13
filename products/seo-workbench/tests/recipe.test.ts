import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseConfig, RULESET, type Observation } from "../src/domain.ts";
import { extract } from "../src/extract.ts";
import { analyze } from "../src/rules.ts";
import { featureFields } from "../src/structured-features.ts";
import { structuredVocabulary } from "../src/schema-review.ts";
import { Store } from "../src/store.ts";
import { Workbench } from "../src/app.ts";
import { exportReport } from "../src/reports.ts";
const url = "https://www.example.com/recipe";
const recipe = {
  "@context": "https://schema.org",
  "@type": "Recipe",
  name: "Fictional soup",
  image: "https://www.example.com/soup.png",
  recipeIngredient: ["2 cups fictional water"],
  recipeInstructions: [
    { "@type": "HowToStep", text: "Mix the fictional water." },
  ],
  totalTime: "PT30M",
  recipeYield: "4",
  nutrition: { "@type": "NutritionInformation", calories: "120 calories" },
};
function check(
  value: unknown,
  options: {
    owner?: boolean;
    rendered?: boolean;
    text?: string;
    blocked?: boolean;
  } = {},
) {
  const body = `<title>Fictional recipe</title><main>Fictional soup. 2 cups fictional water. Mix the fictional water.</main><script type="application/ld+json">${JSON.stringify(value)}</script>`;
  const facts = extract(body, url);
  const observation: Observation = {
    id: "synthetic-recipe",
    url,
    originalUrl: url,
    finalUrl: url,
    timestamp: new Date().toISOString(),
    response: {
      url,
      status: 200,
      headers: { "content-type": "text/html" },
      body,
      bytes: Buffer.byteLength(body),
      address: "127.0.0.1",
      durationMs: 1,
      requestedAt: new Date().toISOString(),
    },
    attempts: [],
    facts,
    error: null,
    render: options.rendered
      ? {
          status: options.blocked ? "blocked" : "observed",
          facts: {
            ...facts,
            renderedPageText: {
              text:
                options.text ??
                "Fictional soup. 2 cups fictional water. Mix the fictional water.",
              truncated: false,
            },
          },
          profile: {
            resourceEvidence: [
              { url: recipe.image, status: 200, contentType: "image/png" },
            ],
          },
        }
      : null,
  };
  const config = parseConfig({
    origins: ["https://www.example.com"],
    seeds: [url],
    render: options.rendered ? "all" : "none",
    contracts:
      options.owner === false
        ? []
        : [{ pathPrefix: "/", googleFeatures: ["recipe"] }],
  });
  const results = analyze({
    config,
    observations: [observation],
    sitemapUrls: new Set(),
    inventoryUrls: new Set(),
  });
  return {
    config,
    observation,
    results,
    feature: results.find((item) => item.ruleId === "google-feature-fields")!,
    visible: results.find((item) => item.ruleId === "structured-visible-text")!,
  };
}
test("Recipe validation accepts names, image objects, sections and detailed substeps", () => {
  assert.equal(check(recipe).feature.outcome, "pass");
  const nested = {
    ...recipe,
    image: { "@type": "ImageObject", contentUrl: recipe.image },
    recipeInstructions: [
      {
        "@type": "HowToSection",
        name: "Prepare soup",
        itemListElement: [
          {
            "@type": "HowToStep",
            itemListElement: [
              { "@type": "HowToDirection", text: "Mix the fictional water." },
              { "@type": "HowToTip", text: "Use a fictional bowl." },
            ],
          },
        ],
      },
    ],
  };
  assert.equal(check(nested).feature.outcome, "pass");
  assert.equal(
    check({ ...recipe, recipeInstructions: ["Mix the fictional water."] })
      .feature.outcome,
    "pass",
  );
  assert.equal(
    check({ ...recipe, recipeYield: ["4", "8 fictional bowls"] }).feature
      .outcome,
    "pass",
  );
});
test("Recipe required defects, recommendations and calorie/yield dependencies stay distinct", () => {
  for (const change of [
    { name: false },
    { image: 42 },
    { image: { "@type": "ImageObject" } },
    { image: "javascript:alert(1)" },
    { recipeYield: undefined },
    { recipeYield: 0 },
  ]) {
    assert.equal(
      check({ ...recipe, ...change }).feature.outcome,
      "fail",
      JSON.stringify(change),
    );
    assert.equal(
      check({ ...recipe, ...change }, { owner: false }).feature.outcome,
      "warning",
    );
  }
  for (const change of [
    { image: [recipe.image, 42] },
    { image: [recipe.image, "javascript:alert(1)"] },
    { recipeIngredient: 123 },
    { recipeInstructions: false },
    { totalTime: "30 minutes" },
    { recipeInstructions: [{ "@type": "HowToSection", name: "Prepare" }] },
    { recipeInstructions: [{ "@type": "HowToStep" }] },
    {
      recipeInstructions: [
        {
          "@type": "HowToSection",
          name: "Prepare",
          itemListElement: ["Mix water"],
        },
      ],
    },
    { nutrition: { calories: "many calories" } },
  ])
    assert.equal(
      check({ ...recipe, ...change }).feature.outcome,
      "warning",
      JSON.stringify(change),
    );
  assert.equal(
    check({ ...recipe, nutrition: undefined, recipeYield: undefined }).feature
      .outcome,
    "warning",
  );
  assert.equal(
    check({
      ...recipe,
      nutrition: { proteinContent: "3 g" },
      recipeYield: undefined,
    }).feature.outcome,
    "fail",
  );
  assert.equal(
    check({
      ...recipe,
      totalTime: undefined,
      prepTime: "PT10M",
      cookTime: "PT20M",
    }).feature.outcome,
    "pass",
  );
});
test("Recipe unresolved references, custom contexts and excessive nesting remain unknown", () => {
  for (const value of [
    { ...recipe, image: { "@id": "#missing" } },
    { ...recipe, recipeInstructions: { "@id": "#missing" } },
    { ...recipe, "@context": { "@vocab": "https://schema.org/" } },
  ])
    assert.equal(check(value).feature.outcome, "not-tested");
  const ref = {
    ...recipe,
    image: { "@id": "#photo" },
    "@graph": [
      { "@id": "#photo", "@type": "ImageObject", contentUrl: recipe.image },
    ],
  };
  assert.equal(check(ref).feature.outcome, "pass");
  let instruction: unknown = { "@type": "HowToStep", text: "Mix water" };
  for (let i = 0; i < 25; i++)
    instruction = {
      "@type": "HowToSection",
      name: "Nested fictional section",
      itemListElement: [instruction],
    };
  assert.equal(
    check({ ...recipe, recipeInstructions: instruction }).feature.outcome,
    "not-tested",
  );
});
test("nested vocabulary objects are checked without inventing custom-context meanings", () => {
  const bad = {
    "@context": "https://schema.org",
    "@type": "Product",
    offers: { price: 1, priceCurreny: "GBP" },
  };
  assert.deepEqual(structuredVocabulary([bad], url).unknownProperties, [
    "priceCurreny",
  ]);
  assert.equal(
    structuredVocabulary(
      [{ ...bad, offers: { price: 1, priceCurrency: "GBP" } }],
      url,
    ).complete,
    true,
  );
  const custom = structuredVocabulary(
    [
      {
        ...bad,
        offers: {
          "@context": { priceCurreny: "https://example.com/custom" },
          priceCurreny: "GBP",
        },
      },
    ],
    url,
  );
  assert.equal(custom.complete, false);
  assert.deepEqual(custom.unknownProperties, []);
  assert.equal(
    structuredVocabulary(
      [{ ...bad, offers: { "https://schema.org/priceCurreny": 1 } }],
      url,
    ).unknownProperties[0],
    "priceCurreny",
  );
});
test("automatic feature checks expose unsupported types and retain owner presence requirements", () => {
  const checked = check(
    [
      recipe,
      {
        "@context": "https://schema.org",
        "@type": "Event",
        name: "Fictional event",
      },
    ],
    { owner: false },
  );
  assert.equal(checked.feature.outcome, "pass");
  const observed: any = checked.feature.observed;
  assert.equal(observed.reviews[0].selection, "detected");
  assert.equal(
    observed.coverage.types.find((row: any) => row.type === "Event")
      .featureFields,
    "not-implemented",
  );
  assert.equal(
    observed.coverage.types.find((row: any) => row.type === "Recipe")
      .featureFields,
    "checked",
  );
  assert.equal(
    observed.coverage.types.find((row: any) => row.type === "Recipe")
      .visibleText,
    "not-tested",
  );
  assert.equal(check([]).feature.outcome, "fail");
  assert.equal(check([], { owner: false }).feature.outcome, "not-applicable");
});
test("Recipe text and image evidence report observed checks separately from human judgement", () => {
  const rendered = check(recipe, { rendered: true });
  assert.equal(rendered.visible.outcome, "pass");
  assert.equal(
    check(recipe, { rendered: true, text: "Fictional soup only" }).visible
      .outcome,
    "warning",
  );
  assert.equal(
    check(recipe, { rendered: true, blocked: true }).visible.outcome,
    "not-tested",
  );
  const coverage: any = (rendered.feature.observed as any).coverage;
  assert.equal(coverage.images[0].response, "observed");
  assert.equal(coverage.images[0].imageContentType, "observed");
  assert.equal(coverage.images[0].imageMeaning, "human-review");
  const blocked: any = check(recipe, { rendered: true, blocked: true }).feature
    .observed;
  assert.equal(blocked.coverage.types[0].featureFields, "not-tested");
});
test("saved coverage reaches the shared API and human reports without leaking unsupported type names", () => {
  const directory = mkdtempSync(join(tmpdir(), "seo-recipe-coverage-")),
    store = new Store(directory);
  try {
    const sample = check([
      recipe,
      {
        "@context": "https://schema.org",
        "@type": "FictionalPrivateType",
        name: "Fictional private label",
      },
    ]);
    const audit = store.createAudit(store.createProject(sample.config));
    store.putObservation(audit, sample.observation);
    store.saveAnalysis(audit, RULESET, sample.results);
    const view: any = new Workbench(store).view(audit, "structured-data", {
      url,
    });
    assert.equal(view.length, 1);
    assert.ok(view[0].coverage.types.length);
    for (const format of ["html", "markdown", "json"] as const) {
      const report = exportReport(store, audit, format, "shareable");
      assert.match(report, /Recipe/);
      assert.doesNotMatch(
        report,
        /FictionalPrivateType|Fictional private label|www.example.com/,
      );
    }
  } finally {
    store.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

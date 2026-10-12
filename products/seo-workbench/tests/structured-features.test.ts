import test from "node:test";
import assert from "node:assert/strict";
import {
  featureFields,
  schemaSubtype,
  structuredTextClaims,
  productVariantReview,
} from "../src/structured-features.ts";
import { fixtureSite } from "../src/fixtures.ts";
import { parseConfig } from "../src/domain.ts";
import { NetworkPolicy, Transport } from "../src/network.ts";
import { renderBrowser } from "../src/browser-runner.ts";
import { analyze } from "../src/rules.ts";
const base = "https://www.example.com/product",
  context = "https://schema.org";
test("selected Product fields accept free/nested prices, counted ratings and attributed reviews", () => {
  for (const details of [
    { offers: { "@type": "Offer", price: 0, priceCurrency: "GBP" } },
    {
      offers: {
        "@type": "Offer",
        priceSpecification: {
          "@type": "PriceSpecification",
          price: "12.50",
          priceCurrency: "GBP",
        },
      },
    },
    {
      offers: { "@type": "AggregateOffer", lowPrice: 10, priceCurrency: "GBP" },
    },
    {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: 4,
        ratingCount: 2,
      },
    },
    {
      review: {
        "@type": "Review",
        author: {
          "@type": "Organization",
          name: "Fictional workshop reviewers",
        },
        reviewRating: { "@type": "Rating", ratingValue: 4 },
      },
    },
  ])
    assert.equal(
      featureFields(
        [
          {
            "@context": context,
            "@type": "Product",
            name: "Workshop lamp",
            ...details,
          },
        ],
        base,
        ["product-snippet"],
      )[0].status,
      "selected-fields-present",
    );
  for (const details of [
    { offers: {} },
    { offers: { "@type": "Offer", price: -1 } },
    { aggregateRating: { ratingValue: 4, ratingCount: 0 } },
    { aggregateRating: { ratingValue: 4, ratingCount: 1.5 } },
    { review: { reviewRating: { ratingValue: 4 } } },
  ])
    assert.equal(
      featureFields(
        [
          {
            "@context": context,
            "@type": "Product",
            name: "Workshop lamp",
            ...details,
          },
        ],
        base,
        ["product-snippet"],
      )[0].requiredDefect,
      true,
    );
  assert.equal(
    featureFields(
      [
        {
          "@context": context,
          "@type": "Product",
          name: "Workshop lamp",
          offers: { "@id": "#external" },
        },
      ],
      base,
      ["product-snippet"],
    )[0].status,
    "not-tested",
  );
});
test("Article recommendations are advisory; Local Business subtypes require selected basic fields", () => {
  assert.equal(schemaSubtype("Restaurant", "LocalBusiness"), true);
  assert.equal(schemaSubtype("NewsArticle", "Article"), true);
  const absent = featureFields([], base, ["article"])[0];
  assert.equal(absent.status, "not-applicable");
  assert.equal(absent.requiredDefect, false);
  const incomplete = featureFields(
    [
      {
        "@context": context,
        "@type": "NewsArticle",
        headline: "Workshop guide",
      },
    ],
    base,
    ["article"],
  )[0];
  assert.equal(incomplete.status, "needs-review");
  assert.equal(incomplete.requiredDefect, false);
  assert.match(incomplete.limitations, /not mandatory/);
  const article = featureFields(
    [
      {
        "@context": context,
        "@type": "BlogPosting",
        headline: "Workshop guide",
        datePublished: "2026-01-01",
        dateModified: "2026-01-02",
        image: "https://www.example.com/image.png",
        author: { "@type": "Organization", name: "Fictional workshop editors" },
      },
    ],
    base,
    ["article"],
  )[0];
  assert.equal(article.status, "selected-fields-present");
  const local = {
    "@context": context,
    "@type": "Restaurant",
    name: "Fictional workshop cafe",
    address: { "@type": "PostalAddress", addressCountry: "GB" },
  };
  assert.equal(
    featureFields([local], base, ["local-business"])[0].status,
    "selected-fields-present",
  );
  assert.equal(
    featureFields([{ ...local, address: {} }], base, ["local-business"])[0]
      .requiredDefect,
    true,
  );
  assert.equal(
    featureFields(
      [
        {
          "@context": { custom: context },
          "@type": "https://schema.org/Restaurant",
        },
      ],
      base,
      ["local-business"],
    )[0].status,
    "not-tested",
  );
});

test(
  `actual local browser snapshot excludes common hidden text and preserves visible claims`,
  {
    skip: process.env.WORKBENCH_BROWSER_TESTS !== "1",
  },
  async () => {
    const markup = JSON.stringify({
        "@context": context,
        "@type": "Product",
        name: "Workshop lamp",
      }),
      fixture = await fixtureSite({
        routes: {
          "/hidden": {
            status: 200,
            body: `<style>.css-hidden{display:none}.transparent{opacity:0}.invisible{visibility:hidden}</style><main><h1>Workshop guide</h1><p hidden>Workshop lamp</p><p class='css-hidden'>Workshop lamp</p><p class='transparent'>Workshop lamp</p><p class='invisible'>Workshop lamp</p></main><script type='application/ld+json'>${markup}</script>`,
          },
          "/footer": {
            status: 200,
            body:
              '<main><h1>Workshop guide</h1></main><footer>Fictional workshop cafe</footer><script type="application/ld+json">' +
              JSON.stringify({
                "@context": context,
                "@type": "Restaurant",
                name: "Fictional workshop cafe",
                address: { "@type": "PostalAddress", addressCountry: "GB" },
              }) +
              "</script>",
          },
          "/visible": {
            status: 200,
            body: `<main><h1>Workshop lamp</h1><p>Read the original synthetic product description.</p></main><script type='application/ld+json'>${markup}</script>`,
          },
        },
      });
    try {
      const config = parseConfig({
          ...fixture.config,
          render: "all",
          contracts: [{ pathPrefix: "/", criticalText: ["Workshop lamp"] }],
        }),
        policy = new NetworkPolicy({
          localOrigins: [fixture.origin],
        });
      for (const path of ["/hidden", "/visible", "/footer"]) {
        const url = fixture.origin + path,
          transport = new Transport(config, policy),
          response = await transport.request(url),
          render = await renderBrowser(response, config, transport);
        assert.equal(render?.status, "observed");
        assert.equal(render?.facts?.renderedMainText?.truncated, false);
        assert.equal(
          render?.facts?.renderedMainText?.text.includes("Workshop lamp"),
          path === "/visible",
        );
        const observation = {
          id: "synthetic-render-observation",
          url,
          originalUrl: url,
          finalUrl: url,
          attempts: [response],
          response,
          facts: render?.facts ?? null,
          render,
          timestamp: new Date().toISOString(),
          error: null,
        };
        const selected = analyze({
          config,
          observations: [observation],
          sitemapUrls: new Set(),
          inventoryUrls: new Set(),
        }).find((result) => result.ruleId === "structured-visible-text");
        assert.equal(
          selected?.outcome,
          path === "/hidden" ? "warning" : "pass",
        );
        assert.equal(
          analyze({
            config,
            observations: [observation],
            sitemapUrls: new Set(),
            inventoryUrls: new Set(),
          }).find((result) => result.ruleId === "critical-content")?.outcome,
          path === "/visible" ? "pass" : "fail",
        );
        if (path === "/footer") {
          assert.equal(
            render?.facts?.renderedPageText?.text.includes(
              "Fictional workshop cafe",
            ),
            true,
          );
          assert.equal(
            render?.facts?.renderedMainText?.text.includes(
              "Fictional workshop cafe",
            ),
            false,
          );
        }
        if (render?.facts) render.facts.renderedPageText!.truncated = true;
        assert.equal(
          analyze({
            config,
            observations: [observation],
            sitemapUrls: new Set(),
            inventoryUrls: new Set(),
          }).find((result) => result.ruleId === "structured-visible-text")
            ?.outcome,
          "not-tested",
        );
      }
    } finally {
      await fixture.close();
    }
  },
);

test("missing required phrases beyond the source-text bound remain unknown", async () => {
  const { extract } = await import("../src/extract.ts"),
    facts = extract(
      "<main>" +
        "Original synthetic text. ".repeat(25000) +
        "Required warranty</main>",
      base,
    ),
    config = parseConfig({
      origins: [new URL(base).origin],
      seeds: [base],
      render: "none",
      contracts: [{ pathPrefix: "/", criticalText: ["Required warranty"] }],
    });
  assert.equal(facts.textTruncated, true);
  const response = {
      url: base,
      body: "",
      status: 200,
      headers: {},
      requestedAt: new Date().toISOString(),
      bytes: 0,
      durationMs: 1,
      address: "127.0.0.1",
    },
    observation = {
      id: "synthetic-text-bound",
      url: base,
      originalUrl: base,
      finalUrl: base,
      attempts: [response],
      response,
      facts,
      render: null,
      timestamp: new Date().toISOString(),
      error: null,
    };
  assert.equal(
    analyze({
      config,
      observations: [observation],
      sitemapUrls: new Set(),
      inventoryUrls: new Set(),
    }).find((result) => result.ruleId === "critical-content")?.outcome,
    "not-tested",
  );
});

test("variant groups are not individual offers and unvisited variant presentation remains unknown", () => {
  const group = {
    "@context": context,
    "@type": "ProductGroup",
    name: "Workshop coat",
    productGroupID: "synthetic-coat-group",
    variesBy: ["https://schema.org/color"],
    hasVariant: [
      {
        "@type": "Product",
        name: "Workshop coat blue",
        sku: "synthetic-blue",
        color: "blue",
        offers: { "@type": "Offer", price: 12, priceCurrency: "GBP" },
      },
      {
        "@type": "Product",
        name: "Workshop coat green",
        sku: "synthetic-green",
        color: "green",
        offers: { "@type": "Offer", price: 12, priceCurrency: "GBP" },
      },
    ],
  };
  const fields = featureFields([group], base, ["product-snippet"])[0];
  assert.equal(fields.selectedNodes, 2);
  assert.equal(fields.requiredDefect, false);
  assert.equal(fields.status, "selected-fields-present");
  const claims = structuredTextClaims([group], base);
  assert.equal(claims.claims.length, 1);
  assert.equal(claims.claims[0].text, "Workshop coat");
  assert.equal(claims.deferredClaims.length, 2);
  assert.equal(claims.complete, true);
});

test("variant identifier review resolves local parent links, distinguishes duplicates and defers legal off-page stubs", () => {
  const group = {
      "@context": context,
      "@id": "#group",
      "@type": "ProductGroup",
      name: "Workshop coat",
      productGroupID: "synthetic-group",
      variesBy: ["https://schema.org/color"],
    },
    blue = {
      "@context": context,
      "@type": "Product",
      name: "Blue workshop coat",
      sku: "synthetic-blue",
      isVariantOf: { "@id": "#group" },
      inProductGroupWithID: "synthetic-group",
    },
    green = { ...blue, name: "Green workshop coat", sku: "synthetic-green" };
  const good = productVariantReview([group, blue, green], base);
  assert.equal(good.complete, true);
  assert.equal(good.groups[0].variantsObserved, 2);
  assert.deepEqual(good.groups[0].issues, []);
  const mismatch = productVariantReview(
    [group, blue, { ...green, inProductGroupWithID: "synthetic-other" }],
    base,
  );
  assert.ok(
    mismatch.groups[0].issues.some((issue) =>
      issue.includes("different group identifier"),
    ),
  );
  assert.ok(
    productVariantReview(
      [group, blue, { ...green, sku: blue.sku }],
      base,
    ).groups[0].issues.some((issue) => issue.includes("repeat")),
  );
  const deferred = productVariantReview(
    [
      group,
      {
        "@context": context,
        "@type": "Product",
        isVariantOf: { "@id": "#group" },
        url: "https://www.example.com/other-variant",
      },
    ],
    base,
  );
  assert.equal(deferred.complete, false);
  assert.equal(deferred.groups[0].unknown, true);
  assert.equal(deferred.groups[0].deferred.length, 1);
});

test("bounded variant-parent indexing handles a large declared group set without nested whole-graph scans", () => {
  const graph = Array.from({ length: 800 }, (_, index) => [
      {
        "@id": "#group-" + index,
        "@type": "ProductGroup",
        name: "Synthetic group " + index,
        productGroupID: "synthetic-group-" + index,
      },
      {
        "@type": "Product",
        name: "Synthetic variant " + index,
        sku: "synthetic-sku-" + index,
        isVariantOf: { "@id": "#group-" + index },
      },
    ]).flat(),
    started = performance.now(),
    review = productVariantReview(
      [{ "@context": context, "@graph": graph }],
      base,
    );
  assert.equal(review.complete, true);
  assert.equal(review.groups.length, 800);
  assert.ok(
    review.groups.every(
      (group) => group.variantsObserved === 1 && !group.issues.length,
    ),
  );
  assert.ok(performance.now() - started < 2000);
});

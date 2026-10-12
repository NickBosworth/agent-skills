import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { extract } from "../src/extract.ts";
import {
  headerAlternates,
  languageAlternates,
} from "../src/response-directives.ts";
import { parseConfig, type Observation } from "../src/domain.ts";
import { analyze } from "../src/rules.ts";
import { fixtureSite } from "../src/fixtures.ts";
import { Workbench } from "../src/app.ts";
import { Store } from "../src/store.ts";
import { NetworkPolicy } from "../src/network.ts";
const origin = "https://www.example.com",
  en = origin + "/en",
  fr = origin + "/fr";
const htmlLinks = `<link rel="alternate" hreflang="en" href="${en}"><link rel="alternate" hreflang="fr" href="${fr}">`;
const headerLinks = `<${en}>; rel="alternate"; hreflang="en", <${fr}>; rel="alternate"; hreflang="fr"`;
function page(
  url: string,
  html = htmlLinks,
  headers: Record<string, string> = {},
): Observation {
  const response = {
    url,
    status: 200,
    headers: { "content-type": "text/html", ...headers },
    body: html,
    requestedAt: new Date().toISOString(),
    durationMs: 1,
    bytes: html.length,
    address: "93.184.216.34",
    robotsTags: [],
  };
  return {
    id: randomUUID(),
    url,
    originalUrl: url,
    finalUrl: url,
    response,
    attempts: [response],
    facts: extract(html, url),
    render: null,
    error: null,
    timestamp: response.requestedAt,
  };
}
function review(observations: Observation[], id = "hreflang-cluster") {
  return analyze({
    config: parseConfig({ seeds: [en], origins: [origin] }),
    observations,
    sitemapUrls: new Set(),
    inventoryUrls: new Set(),
  }).find((r) => r.ruleId === id && r.url === observations[0].url)!;
}
test("HTML and response language declarations retain full-address, placement and malformed input evidence", () => {
  assert.equal(headerAlternates(headerLinks, en).complete, true);
  assert.equal(
    languageAlternates(extract(htmlLinks, en), headerLinks, en).links.length,
    2,
  );
  const facts = extract(
    '<head><link rel="alternate" hreflang="en" href="/en"><link rel="alternate" hreflang="fr"></head><body><link rel="alternate" hreflang="de" href="https://www.example.com/de"></body>',
    en,
  );
  assert.equal(facts.languageAlternates?.[0].absolute, false);
  assert.equal(facts.languageAlternates?.[1].target, null);
  assert.equal(facts.languageAlternates?.[2].inHead, false);
  for (const value of [
    "<https://www.example.com/fr>; rel=alternate; hreflang=fr; hreflang=en",
    "<https://www.example.com/fr>; rel=alternate; hreflang*=fr",
    '<https://www.example.com/fr>; rel="alternate',
    "x".repeat(65537),
  ])
    assert.equal(headerAlternates(value, en).complete, false);
  const legacy = extract(htmlLinks, en);
  delete legacy.languageAlternates;
  assert.equal(languageAlternates(legacy, undefined, en).complete, false);
  const many = extract(htmlLinks.repeat(501), en);
  assert.equal(many.languageAlternates?.length, 1000);
  assert.equal(languageAlternates(many, undefined, en).complete, false);
});
test("valid HTML, header-only and PDF clusters remain separate from translation or registry certification", () => {
  for (const headerOnly of [false, true]) {
    const pages = [
      page(
        en,
        headerOnly ? "" : htmlLinks,
        headerOnly ? { link: headerLinks } : {},
      ),
      page(
        fr,
        headerOnly ? "" : htmlLinks,
        headerOnly ? { link: headerLinks } : {},
      ),
    ];
    for (const id of ["hreflang-return", "hreflang-cluster"])
      assert.equal(review(pages, id).outcome, "pass");
    if (headerOnly) {
      for (const p of pages) {
        p.facts = null;
        p.response!.headers["content-type"] = "application/pdf";
      }
      for (const id of ["hreflang-return", "hreflang-cluster"])
        assert.equal(review(pages, id).outcome, "pass");
    }
  }
  assert.equal(
    review([page(en, "<main>Single language</main>")]).outcome,
    "not-applicable",
  );
});
test("cluster review finds concrete label/address/return/indexing/canonical issues without certifying missing evidence", () => {
  for (const html of [
    htmlLinks.replace('hreflang="fr"', 'hreflang="en"'),
    htmlLinks.replace('hreflang="fr"', 'hreflang="en-UK"'),
    htmlLinks.replace('hreflang="fr"', 'hreflang="es-419"'),
    htmlLinks.replace(fr, "/fr"),
    htmlLinks.replace(`<link rel="alternate" hreflang="en" href="${en}">`, ""),
  ])
    assert.equal(review([page(en, html), page(fr)]).outcome, "warning");
  for (const alternative of [
    page(fr, "<main>No declarations</main>"),
    page(fr, htmlLinks + '<meta name="robots" content="noindex">'),
    page(fr, htmlLinks + `<link rel="canonical" href="${en}">`),
  ])
    assert.equal(review([page(en), alternative]).outcome, "warning");
  assert.equal(review([page(en)]).outcome, "not-tested");
  const incomplete = page(fr);
  incomplete.render = { status: "timeout" };
  assert.equal(review([page(en), incomplete]).outcome, "not-tested");
  const malformed = page(fr, htmlLinks, {
    link: '<https://www.example.com/en>; rel="alternate',
  });
  assert.equal(
    review([page(en), malformed], "hreflang-return").outcome,
    "not-tested",
  );
});
test("actual header discovery and targeted planning preserve alternative dependencies and approved scope", async () => {
  const routes = {
      "/robots.txt": { status: 404, body: "" },
      "/en": {
        status: 200,
        body: "<title>English guide</title><main>Original English fixture.</main>",
        headers: { Link: "" },
      },
      "/fr": {
        status: 200,
        body: "<title>French guide</title><main>Original French fixture.</main>",
        headers: { Link: "" },
      },
    },
    fixture = await fixtureSite({ routes }),
    directory = mkdtempSync(join(tmpdir(), "seo-workbench-alternates-")),
    store = new Store(directory);
  routes["/en"].headers.Link =
    `<${fixture.origin}/en>; rel=alternate; hreflang=en, <${fixture.origin}/fr>; rel=alternate; hreflang=fr, <https://outside.example.com/fr>; rel=alternate; hreflang=fr`;
  routes["/fr"].headers.Link =
    `<${fixture.origin}/en>; rel=alternate; hreflang=en, <${fixture.origin}/fr>; rel=alternate; hreflang=fr`;
  try {
    const config = parseConfig({
        seeds: [fixture.origin + "/en"],
        origins: [fixture.origin],
        delayMs: 0,
      }),
      project = store.createProject(config),
      audit = store.createAudit(project),
      app = new Workbench(
        store,
        new NetworkPolicy({ localOrigins: [fixture.origin] }),
      );
    await app.crawler.run(audit);
    assert.equal(
      store.observation(audit, fixture.origin + "/fr")?.response?.status,
      200,
    );
    assert.equal(
      store.observation(audit, "https://outside.example.com/fr"),
      null,
    );
    const group = (app.view(audit, "groups") as any[]).find(
      (g) => g.ruleId === "hreflang-cluster",
    );
    assert.ok(group);
    const plan = app.planVerification({ auditId: audit, groupId: group.id });
    assert.ok(plan.dependencies.some((d) => d.url === fixture.origin + "/fr"));
    assert.equal(plan.mode, "targeted");
    assert.ok(
      plan.unavailableDependencies.some(
        (d) => d.url === "https://outside.example.com/fr",
      ),
    );
    assert.deepEqual(plan.config.origins, config.origins);
  } finally {
    store.close();
    await fixture.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

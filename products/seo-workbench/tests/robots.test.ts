import test from "node:test";
import assert from "node:assert/strict";
import { parseRobots } from "../src/robots.ts";

test("crawl delays preserve shared groups and use the slowest valid repeated instruction", () => {
  const origin = "https://www.example.com";
  const policy = parseRobots(
    origin + "/robots.txt",
    `User-agent: *
Crawl-delay: 20
Disallow: /wildcard
User-agent: SEO-Workbench
Crawl-delay: 2.5
User-agent: AnotherBot
Disallow: /private
User-agent: seo-workbench
Crawl-delay: 1
Crawl-delay: invalid
Crawl-delay: -5
Disallow: /other
User-agent: EmptyBot
Crawl-delay: 3`,
  );
  assert.equal(policy.isAllowed(origin + "/private", "SEO-Workbench"), false);
  assert.equal(policy.isAllowed(origin + "/private", "AnotherBot"), false);
  assert.equal(policy.getCrawlDelay("SEO-Workbench/1.0"), 2.5);
  assert.equal(policy.getCrawlDelay("AnotherBot"), 2.5);
  assert.equal(policy.getCrawlDelay("UnknownBot"), 20);
  assert.equal(policy.getCrawlDelay("EmptyBot"), 3);
  assert.equal(policy.isAllowed(origin + "/wildcard", "EmptyBot"), true);
  const specific = parseRobots(
    origin + "/robots.txt",
    `User-agent: *
Crawl-delay: 10
Disallow: /
User-agent: SEO-Workbench
Allow: /`,
  );
  assert.equal(specific.getCrawlDelay("SEO-Workbench"), undefined);
});

test("robots matching combines groups, keeps extensions independent and honours empty groups", () => {
  const origin = "https://www.example.com";
  const policy = parseRobots(
    origin + "/robots.txt",
    `User-agent: *
Disallow: /
User-agent: SEO-Workbench
Sitemap: https://www.example.com/map.xml
User-agent: AnotherBot
Disallow: /restricted
Unknown-extension: original synthetic value
Allow: /restricted/public
User-agent: seo-workbench
Disallow: /second
User-agent: EmptyBot`,
  );
  assert.equal(
    policy.isAllowed(origin + "/restricted", "SEO-Workbench"),
    false,
  );
  assert.equal(
    policy.isAllowed(origin + "/restricted/public", "SEO-Workbench"),
    true,
  );
  assert.equal(policy.isAllowed(origin + "/second", "SEO-Workbench"), false);
  assert.equal(policy.isAllowed(origin + "/other", "SEO-Workbench"), true);
  assert.equal(policy.isAllowed(origin + "/other", "EmptyBot"), true);
  assert.equal(policy.isAllowed(origin + "/other", "UnknownBot"), false);
  assert.deepEqual(policy.getSitemaps(), [origin + "/map.xml"]);
});

test("robots compares unreserved octets without decoding reserved path separators", () => {
  const origin = "https://www.example.com";
  const policy = parseRobots(
    origin + "/robots.txt",
    `User-agent: SEO-Workbench
Disallow: /private
Disallow: /%67uide
Disallow: /literal%2Fslash
Disallow: /café
Disallow: /*?blocked=*
Allow: /private/public
Disallow: /same
Allow: /same`,
  );
  for (const path of [
    "/%70rivate",
    "/guide",
    "/literal%2fslash",
    "/caf%C3%A9",
    "/query?blocked=yes",
  ])
    assert.equal(policy.isAllowed(origin + path, "SEO-Workbench"), false, path);
  for (const path of [
    "/Private",
    "/private/public",
    "/literal/slash",
    "/same",
    "/query?other=yes",
  ])
    assert.equal(policy.isAllowed(origin + path, "SEO-Workbench"), true, path);
});

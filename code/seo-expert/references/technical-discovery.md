# Technical discovery and index controls

## Start with the intended URL lifecycle
For each family choose: public and intended for indexing; public but intentionally excluded; private/authenticated; temporary redirect; permanent redirect; temporarily unavailable; permanently removed. Establish who owns this decision. Audit against it rather than maximising the number of indexed URLs.

Collect the actual request URL, redirect chain, final status, response headers, initial HTML, rendered HTML where relevant, canonical declarations, robots rules, sitemap membership and internal links. Record date and environment. An inspection result and crawler observation may describe different moments; do not conceal the mismatch.

## Access and response
Check protocol and hostname variants, TLS failures, redirect loops, long avoidable chains, 4xx/5xx responses, rate limits and soft-error templates. A useful page needs its correct successful response; a missing resource should not return a cheerful empty 200 page. Check origin/CDN parity and intermittent failures. Preserve genuine 404/410 pages when removal is intentional; do not redirect everything to the homepage. [G20, G23]

## Robots and indexing
Fetch the exact host’s robots.txt with an approved tool and evaluate the intended crawler’s matching rules. Inspect response status and resource restrictions as well as the apparent text. `Disallow` regulates crawling; it is not an access control and is not a reliable removal mechanism. Do not block fetching a page whose exclusion relies on reading its noindex. [G21, G22]

Read robots meta tags and repeated X-Robots-Tag headers with crawler scoping intact. Do not transfer a Google-only directive to Bing or interpret a parameter such as `max-snippet:` as a crawler name. `none` includes noindex and nofollow. Explicitly contradictory declarations need interpretation, not a simple “last tag wins” rule. Google also recognises robots meta tags outside the head; valid authoring should still put metadata in its intended location. The offline tool only reports a bounded subset, not complete directive evaluation. [G09]

## Canonical consistency
Compare user-declared and engine-selected canonicals where engine evidence exists. Inspect HTML and HTTP Link header declarations, internal links, redirect targets, sitemap entries and hreflang. A canonical declaration expresses a preference, not an instruction that guarantees selection. Choose genuine equivalents; do not canonicalise distinct valuable content merely because titles resemble one another. Do not use noindex as a substitute for consolidation. [G10]

Investigate multiple/conflicting canonical declarations, wrong environment/host, relative resolution surprises from a base element, targets with errors/exclusions and inconsistent slash/parameter policies. A missing explicit canonical is a review item, not proof that the engine cannot canonicalise the page. Preserve meaningful case, language and functional query parameters; do not normalise URLs blindly.

## Sitemaps
Generate preferred discoverable URLs from the same canonical source of truth as routing. Check absolute URLs, XML validity, supported limits, duplicates, accidental staging/private URLs and trustworthy modification dates. Distinguish a sitemap index from a URL sitemap. Submission supports discovery; it does not guarantee indexing. Image/video/news extensions need their own current requirements. [G12, S01, B05]

## Large sites
Only prioritise crawl-budget engineering when inventory, change rate or logs indicate material waste. Measure traps, infinite spaces, session parameters, duplicative filters and repeated server failures before restricting anything. Search engines’ crawler identities must be verified through their current documented mechanism before attributing logs. A random bot user-agent is not proof. [G24, G25]

## Verify a fix
Re-fetch the deployed route, confirm actual headers and HTML, test old and variant URLs, inspect the sitemap diff, and use current engine tools where authorised. Keep “technical change verified” separate from “recrawled”, “indexed” and “ranking improved”.

Sources: G09–G12, G20–G25, G41, B05, S01.

Source IDs resolve in the [source register](../research/SOURCES.md).

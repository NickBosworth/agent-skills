# Worked example: a deliberately synthetic small catalogue
Everything in this example is fictional. Domains, query rows, counts and commercial details are test data, not a performed live audit or real keyword demand.

## Scope
The supplied fixture manifest has four HTML pages, one with an additional rendered snapshot. It declares a larger sample context. The offline utility can report four parsed pages; it cannot certify the unprovided inventory, fetch the site, perform a browser render or prove indexing.

## Findings and restraint
**Blue widget product:** The fixture declares the product intended-indexable but supplies initial noindex, then a rendered snapshot without it. The code reports the conflict and the initial/rendered risk. The recommendation is to inspect the owning metadata layer and capture consistency, then remove the unintended initial exclusion only when approved. The canonical also changes between snapshots and needs the same root-cause investigation.

**Account page:** It is intentionally excluded in the manifest. Its noindex is not reported as an unexpected indexing failure. This prevents an agent from making private utility routes indexable to improve a fictional coverage score.

**Contact page:** Its decorative image has `alt=""`; this is recorded separately and not treated as missing alt. Two H1s are observations, not a ranking violation. Any actual accessibility review still needs the page's purpose and presentation.

**Guide page:** Response status was not supplied. The report says not-tested rather than assuming a successful fetch. The fixture's FAQPage type is a reminder to review current feature support, not an instruction to delete all FAQs.

## One root-cause ticket
ID: SYN-001. Rules: SEO-011, SEO-024, SEO-025.
Observed scope: one supplied product pair; other product routes have not been inspected.
Hypothesis: shared initial metadata may use a staging fallback; not proven from these files.
Priority: potentially P1 if production and shared impact are verified; not an invented production incident.
Fix: inspect configuration and template ownership, implement a consistent intended directive/canonical, preserve excluded account routes, then capture direct and client-navigation evidence.
Approval: production metadata changes and deployment still need authorisation.
Acceptance: correct initial/rendered product signals and unchanged intentional account exclusion, with actual deployed verification separate from later engine inspection.

## Keyword/content decision examples
“blue widget”, “how to choose a widget size” and “widget compatibility with sample brackets” are **illustrative seed ideas**, not verified searches. Their market volume, difficulty and tail classification are unknown. Before creating pages, establish what the fictional business sells, whether its data can answer the question and what permitted search evidence supports the task.

A compatibility question might improve the existing product page when it concerns that product. A genuinely broad selection guide might merit its own page if it can add substantiated information. “Best widget supplier in every town” is rejected without a real footprint and useful local evidence. None of these decisions requires keyword repetition or manufactured brand mentions.

## Search CSV fixture
The normalised CSV contains deliberately invented click/impression rows solely for arithmetic and grouping tests. A query with two pages produces a review lead, not a cannibalisation verdict. Its total-row CTR must be computed from summed clicks/impressions. Formula-like query strings, when supplied, remain inert JSON data.

## Reproduce
From the pack directory:
```sh
python scripts/audit_snapshots.py tests/fixtures/manifest.json
python scripts/lint_sitemaps.py tests/fixtures/sitemap.xml --site https://shop.example --as-of 2026-10-10
python scripts/analyse_search_export.py tests/fixtures/search.csv
```
These commands operate only on local synthetic inputs. To save JSON, add `--output` with a new explicit filename outside sensitive/public mixing; existing files are not overwritten. Exact results depend on fixture version and are validated by the tests, not hand-edited to look clean.

## Included reproducible outputs
The [snapshot audit](results/snapshot-audit.json), [sitemap lint](results/sitemap-lint.json) and [search analysis](results/search-analysis.json) were produced by the bundled utilities from the synthetic fixtures during release validation. They are not live-site results.

> Historical 1.0.0 evidence retained from the original package. Branding, metadata
> and distribution changed in 2.0.0; this record is not a new execution claim.
> Current library verification is maintained separately by the repository.

# Release validation — agentic-skills-seo-expert 1.0.0

Date: **10 October 2026**. This record distinguishes executed local checks from supplied evaluation plans and untested external behaviour.

## Executed locally

| Check | Actual result |
|---|---|
| Standard-library unit/regression suite | **81 tests passed**, zero failures, zero skips. See [test output](tests/TEST_RESULTS.txt). |
| Python environment | **Python 3.13.5 on Linux**. Other Python versions and operating systems were not executed in this session. |
| Pack structure and frontmatter | Passed the bundled validator, including the compact SKILL.md fields and local resource targets. |
| Rule/source references | All **100 rules** resolve to registered source IDs and include evidence, remediation, caveats and verification. |
| JSON and local Markdown paths | Parsed/checked by the validator. Semantic accuracy and local heading fragments are not established by this check. |
| Snapshot CLI smoke test | Processed **four synthetic pages**, including **one supplied rendered snapshot**. Report correctly states zero live requests, zero browser renders and zero engine-index checks. |
| Sitemap CLI smoke test | Processed the local three-entry synthetic sitemap with no lint issues; no referenced URLs were followed. |
| Search CSV CLI smoke test | Processed synthetic Google/Bing groups separately; derived CTR uses totals and multiple-URL observations remain review leads. |
| Release integrity | Complete local file checksum inventory and ZIP CRC/integrity were checked during packaging. The download has a separate SHA-256 checksum. |

Reproducible CLI outputs are included in [examples/results](examples/results/). They are generated from fictional fixtures, not real market or site data.

## Test coverage highlights

Directive aliases, repeated/scoped headers, unknown crawler prefixes, outside-head Google meta recognition, initial/rendered noindex differences, intentional exclusions, unknown intent/status, HTML base versus response-header canonical resolution, malformed/extended Link fields, canonical mutations, decorative versus missing image alt, non-penalising H1 counts, JSON-LD syntax and nonfinite constants, local path/symlink escape, bounded reads, no-overwrite output, sitemap entities/format/dates/limits, duplicate and overlapping search data, scope preservation, weighted arithmetic and inert formula-like query text.

The static import check verifies that the bundled utilities do not import the tested network/execution modules. It is not a comprehensive security certification. Read [security](SECURITY.md) and each [utility contract](scripts/README.md).

## Research accountability

The source register contains **72 entries: 70 reviewed, one access-limited and one discovery entry point**. “Reviewed” means relevant retrievable content was considered, not that every paragraph of every document was exhaustively audited. The main Bing Webmaster Guidelines URL returned a JavaScript shell; its substantive contents were not falsely marked reviewed. The pack routes policy-sensitive work to a fresh capable-browser check.

The source snapshot is dated. No bibliography HTTP/link-freshness scan is performed by the offline validator. Changes after the snapshot can supersede recommendations, especially feature availability, policies, reporting and API details.

## Defined but not executed

The **32 agent-evaluation scenarios** are a test plan, not completed model benchmarks. The pack was not launched inside OpenCode, Codex, Claude Code or every compatible host. Installation paths are sourced instructions, not a claim that all host versions were exercised.

No real production website was crawled, rendered, changed, submitted, published or audited as part of these fixture tests. No Search Console/Bing account was queried; no real keyword volume or ranking was collected. No live rich-result test, field-performance measurement or deployment test occurred. These are capabilities/workflows the installed skill can guide through an appropriately equipped and authorised host.

## Reproduce

```sh
python -m unittest discover -s tests -v
python scripts/validate_pack.py --verify-checksums
```

Before interpreting results for a real site, use the engagement, safety and coverage workflows. No local test suite establishes guaranteed SEO outcomes or permanent full-site optimisation.

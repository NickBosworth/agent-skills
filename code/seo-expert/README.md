# seo-expert

**An evidence-led Agent Skill for whole-site SEO audits, natural-intent keyword research, content planning, scoped implementation and verification.**

Research snapshot: **10 October 2026** · Version **1.0.0** · **CC0-1.0** · Google + Bing · No paid-tool dependency

Start with [SKILL.md](SKILL.md). It routes an agent to focused references rather than loading an entire SEO textbook into every task. The pack helps agents improve useful discovery and business outcomes; it does not promise ranking, indexing, citations or a permanent state of perfect optimisation.

## What it does

**Audit:** Reconcile URL inventory and desired indexing; examine crawling, responses, canonicalisation, sitemaps, JavaScript rendering, mobile content, architecture, performance, metadata, structured data and editorial usefulness. Separate root causes from repeated template symptoms and expose untested coverage.

**Research and plan:** Inspect the actual offering and existing pages; discover broader topics, specific/long-tail opportunities and useful questions using available first-party evidence and permitted web research. Cluster by task, map to existing or justified new destinations, and create accountable content briefs. Observations, provider estimates and unvalidated ideas stay distinct. Missing metrics stay unknown.

**Implement and verify:** Preserve repository conventions, business rules, tests and privacy. Make only authorised changes, with reviewable diffs, meaningful checks and rollback. Separate deployed correctness from later engine uptake and business results.

**Specialist routes:** Local/service-area sites, ecommerce/variants/facets, international/hreflang, images/video, publishing/paywalls/UGC, migrations, reputation, Bing/IndexNow and evidence-based AI-search visibility.

The [100-check catalogue](data/rules.json) includes applicability, evidence, source IDs, remedies, false-positive cautions and verification. It is not a numerical “SEO score”. [Example prompts](examples/EXAMPLE_PROMPTS.md) cover 21 installed-use scenarios.

## Install the whole folder

Keep `SKILL.md`, references, scripts, data, templates and research together inside a folder named **`seo-expert`**. A standalone copy of SKILL.md loses its supporting resources. Choose **one** appropriate project or personal location; avoid loading duplicate copies with the same skill name.

| Host | Project location | Personal location | Explicit use |
|---|---|---|---|
| OpenCode | `.opencode/skills/seo-expert/` | `~/.config/opencode/skills/seo-expert/` | Ask the agent to load the `seo-expert` skill with its skill mechanism. |
| Codex | `.agents/skills/seo-expert/` | `~/.agents/skills/seo-expert/` | `$seo-expert` followed by the task. |
| Claude Code | `.claude/skills/seo-expert/` | `~/.claude/skills/seo-expert/` | `/seo-expert` followed by the task. |
| Other Agent Skills-compatible host | Its documented skill discovery directory | Its documented personal directory | Use its supported loading/invocation mechanism. |

These paths/syntax follow the reviewed host documentation; see H01–H04 in [sources](research/SOURCES.md). The pack has not been launched inside every host. Confirm the current host version's discovery/reload behaviour. Other products may support compatible directories; do not assume an example shell, tool or invocation exists in all interfaces.

For OpenCode, after extracting the ZIP and checking that the destination does not already contain a conflicting version, place the folder at:

```text
my-project/
  .opencode/
    skills/
      seo-expert/
        SKILL.md
        references/
        research/
        data/
        scripts/
        templates/
        examples/
        ...
```

Then ask:

> Load the seo-expert skill. Audit this repository and our public website read-only. Inspect existing rules first, establish whole-site coverage, prioritise verified problems and provide implementation tickets. Use web research where available; do not invent keyword metrics or publish changes.

The skill supplies instructions and optional local utilities, **not** a browsing capability, analytics account, paid keyword subscription, scheduler or blanket command permission. Use available host tools under their normal approvals. Without browsing/access, the agent must provide a bounded offline assessment or clearly labelled research hypotheses.

## Use it in a project

A typical engagement produces an audit report and coverage ledger, evidence-backed findings, a keyword ledger/intent map, content briefs, an approved implementation backlog and a verification/handoff record. Ready-to-fill [templates](templates/) are included. Keep live reports and exports in a private project workspace such as `.seo-private/`, not this public skill repository.

The agent should reuse supplied context and inspect the codebase before asking questions. It asks one consequential question at a time, explains why, gives meaningful options and a recommendation, and continues useful independent work where possible. Existing business rules and acceptance criteria are guardrails, not obstacles to silently delete.

## Included utilities and tests

Three optional **offline, standard-library-only** Python utilities inspect supplied HTML snapshots, local sitemap XML and normalised query+page search exports. They never crawl, render, submit or publish. A fourth utility validates the pack itself. Each has documented limits and honest output semantics in [scripts/README.md](scripts/README.md).

```sh
python -m unittest discover -s tests -v
python scripts/validate_pack.py --verify-checksums
python scripts/audit_snapshots.py tests/fixtures/manifest.json
python scripts/lint_sitemaps.py tests/fixtures/sitemap.xml --site https://shop.example --as-of 2026-10-10
python scripts/analyse_search_export.py tests/fixtures/search.csv
```

Python **3.10+** is required only for the utilities; the prose skill does not depend on Python. See [VALIDATION.md](VALIDATION.md) for actual local execution results and untested boundaries. Synthetic fixtures and a [worked example](examples/WORKED_EXAMPLE.md) illustrate both findings and appropriate restraint. [Agent evaluation scenarios](evals/README.md) are provided separately and are not presented as completed model evaluations.

## Research and current guidance

The [source register](research/SOURCES.md) covers official Google documentation, accessible official Bing articles, IndexNow, standards and primary-publisher methods from Ahrefs, Semrush, Screaming Frog, Sitebulb and SearchPilot. Engine requirements outrank industry heuristics. The main Bing Webmaster Guidelines URL returned only a JavaScript shell during research; its access limitation is explicit and policy-sensitive work requires a capable current browser check.

The [decision log](research/DECISIONS.md) records rejected myths and dated feature assumptions, including retired search enhancements and current AI measurement distinctions. Source material is referenced, not copied into an unlicensed documentation mirror. Recheck volatile features, policies, reports, APIs and framework behaviour before acting. This is a curated operational synthesis, not an exhaustive mirror of every official page.

## Public GitHub hosting and licence

For a standalone repository, publish the **contents** of this `seo-expert` folder at the repository root so README and LICENSE display normally. For a multi-skill repository, keep it as a named `seo-expert/` subdirectory. The distributed installation folder must still retain that name and its full contents. This release does not create or publish a GitHub repository on your behalf.

The original pack is dedicated under [CC0-1.0](LICENSE): reuse, modify and redistribute it freely, including commercially. Linked sources retain their own rights and trademarks; no engine/vendor endorsement is implied. See [NOTICE.md](NOTICE.md), [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md) and [CHANGELOG.md](CHANGELOG.md).

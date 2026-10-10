# Freshness and maintaining the skill

## Treat this as a dated research snapshot
The baseline is **10 October 2026**. Before using an engine feature, API, reporting field, policy, host installation path or framework-specific implementation, check its current official documentation. Do not confuse a “last updated” date with a product release date or a changelog clarification with changed behaviour.

Use the Google documentation updates feed/page and Bing’s official webmaster announcements as discovery points; then open the substantive feature or policy document. A secondary article can point to a change but does not override the primary source. Cross-check page redirects because documentation locations move. [G05, B10]

## Review cadence (pack convention, not engine policy)
At engagement start, reverify material feature/policy claims used in recommendations. For a maintained fork, review volatile AI/search appearance/API/reporting material monthly or when release notes warrant it, and stable foundations at least during substantial pack releases. Choose the actual cadence based on use and risk; the pack does not schedule itself.

## Update protocol
1. Record the canonical URL, retrieval date, applicable engine/market, substantive section and access status in the source register. Never label a blocked page reviewed.
2. Compare the new requirement with rules, references, templates, code assumptions and evaluation cases. Separate wording clarifications from functional changes.
3. Update all dependent artefacts, add a regression case for a changed edge condition, increment the pack version and explain the decision in the changelog.
4. Run tests and package validation. Rebuild the file manifest and checksum only after the contents are stable. Do not claim tests that were merely defined in CI have run locally.

## Conflicting or incomplete evidence
Prefer an applicable current engine specification over an older blog or vendor interpretation. If official documents appear inconsistent, record the conflict, dates and practical uncertainty. Avoid a high-risk change until the relevant behaviour is verified. Do not invent a reconciliation merely to produce a decisive answer. Industry heuristics can inform a test but must remain labelled as such.

## Retire myths carefully
The decision record identifies important outdated/default advice rejected by this release. Maintain useful content when a display feature retires; a discontinued enhancement does not automatically make the underlying information harmful. Do not mass-delete markup or change ownership controls without understanding other consumers and business dependencies.

Sources: G05, G08, B10; cadence and release protocol are original pack conventions.

Source IDs resolve in the [source register](../research/SOURCES.md).

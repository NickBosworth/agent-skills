# Evidence, coverage and prioritisation

## Evidence records
Every material finding needs: finding ID; engine and market; observation timestamp; environment/commit; URL or template; observed and intended behaviour; evidence type and location; source ID and current section; confidence; affected-count method; impact; priority; remediation; owner; approval; verification and rollback.

Keep these concepts separate:
- **Requirement/policy:** an applicable engine or protocol eligibility condition.
- **Engine guidance:** an engine’s recommended practice, not a guaranteed ranking effect.
- **Industry heuristic:** a useful diagnostic method whose interpretation depends on context.
- **Observed result:** something a tool, response, export or person actually showed.
- **Hypothesis:** a possible explanation or opportunity awaiting evidence.

Evidence has limits. Source code shows intent, not necessarily the deployed response. A browser shows one execution/context. A crawl sees the URLs and conditions it reached. An inspection tool distinguishes the stored index view from its live test. Search exports describe the reporting system’s measured scope, not the total market. Record those limits beside the conclusion. [G40, G41, I06, I07]

## Coverage ledger
Build a union of route/CMS inventory, submitted sitemap URLs, discovered links, landing-page reports and available logs. Preserve provenance rather than deleting disagreements. For each URL or deterministic family record desired index state, locale, template, discovery source, test stages completed and unresolved access.

Use **pass**, **fail**, **warning**, **not-tested**, **not-applicable**, and **blocked** for individual checks. `pass` requires the specified evidence; absent data is never a pass. Do not use a global “SEO pass”. A canonical hint is not proof of the engine-selected canonical. A `site:` query is not a reliable complete index inventory.

Report at least these denominators: known inventory; indexable-intended subset; URLs actually fetched; URLs rendered; templates represented; pages with engine index evidence; and content manually assessed. A statement such as “all 36 exported snapshots checked” is different from “all pages on the site checked”. Explicitly name unknown or unreconciled inventory.

## Sampling
Stratify by template, market, conversion importance, status, release age and unusual parameter states. Include both common and risky edge cases. State why the sample was selected; it is not automatically a statistically representative sample. A clean sample establishes only its own results. A reproducible shared-template defect may justify a broader affected estimate, clearly labelled with the matching rule and validation spot checks.

## Priorities are contextual
**P0:** An active high-impact incident, such as production-wide accidental exclusion or outage. Escalate promptly; do not make unauthorised emergency edits.

**P1:** A confirmed material discoverability, indexing, conversion or content-integrity issue affecting important pages.

**P2:** A justified quality or efficiency improvement with moderate scope, or a promising opportunity needing validation.

**P3:** Low-impact polish, speculative experiments or optional enhancements.

Set priority using business impact, evidence confidence, affected scope, dependencies, effort and reversal cost. Do not turn an arbitrary sum into “Google’s SEO score”. A missing optional description on a deliberately excluded utility page is not equivalent to a noindex on every product.

## Root-cause discipline
Group duplicate symptoms into one template/configuration issue plus affected examples. Distinguish root cause, correlated symptom and unknown cause. Check that a proposed fix will not break accessibility, shopping, legal constraints or an intentional exclusion. Record rejected findings and false positives so another agent does not reopen them blindly.

Sources: G10, G40, G41, I06, I07. Coverage and priority conventions are pack-defined, not engine thresholds.

Source IDs resolve in the [source register](../research/SOURCES.md).

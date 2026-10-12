# Rule and source maintenance

[data/rules.json](../data/rules.json) records the versioned executable rule definitions.
[src/rules.ts](../src/rules.ts) owns deterministic evaluation. Sources resolve in
[data/sources.json](../data/sources.json); distinguish standards, engine guidance,
product contracts/heuristics and vendor claims. Bing's guideline body could not be
retrieved substantively; no automated Bing requirement is inferred from it.

[data/skill-mapping.json](../data/skill-mapping.json) maps implemented subsets to
canonical SEO skill IDs and records its catalogue hash. Every mapping/source reference
is tested. Other skill entries remain guidance-only; the product does not treat
all 100 checks in the written guidance as executable rules. Review semantic
differences, changed applicability,
source dates and evidence prerequisites before changing the hash. The skill remains
self-contained with no product/runtime dependency.

To add a trusted rule, give it a stable ID and version, title, source and skill IDs, basis,
prerequisites, severity, remediation and verification. Add a true defect, a valid
counterexample and absent-evidence regression in tests. Runtime extensions may use
`analyze(context, [{definition, evaluate}])` from trusted code; config cannot execute
scripts or override network policy. No third-party rule wording is copied.

Changing released interpretation requires a reviewed version/changelog update and new
analysis. Historical observations remain unchanged. The current prerelease uses ruleset
0.1.0; no released rule has been silently modified. Never mark missing evidence as pass,
remove a warning just to improve a summary, or weaken an expectation to hide a regression.

Titles/headings/text length have no arbitrary engine limits. A missing canonical is
not inherently severe. Intentional noindex and decorative empty alt are legitimate.
JSON-LD syntax, vocabulary correctness, engine eligibility and actual rich-result display
are distinct. Chromium rendering is not indexing. Graph/lexical indicators are disclosed
heuristics. Search demand remains unknown without labeled first-party/provider evidence.

## Intent and structured scope

Route contracts also support `requiredLinks`, exact `requiredAlternates` (language/target),
`requiredStructuredTypes`, and explicit `googleFeatures` selections for `product-snippet`, `article` and `local-business`. Required fields, advisory recommendations and rendered-text review remain separate; see structured-data.md.
Missing requested rendered evidence is untested. Types are interpreted only with known
Schema.org contexts or full type IRIs, bounded to 5,000 traversed values; unknown/aliased
contexts are never fetched. The Product check covers selected top-level fields and is
contextual review, not full nested Offer/Review, vocabulary, visible-truth or rich-result
certification. A selected type contract provides the stricter presence gate separately.
CI gates now include unavailable prerequisites for these approved contracts.

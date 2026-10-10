# Rule catalogue
`rules.json` contains 100 source-linked checks. Select by `category` and `applicability`; do not load all rules into every agent turn.

`basis` differentiates policy/requirements, guidance, feature status, industry heuristics and pack conventions. `engine_scope` limits the claim; `cross-engine-method` is a diagnostic method, not proof that both engines use an identical algorithm. `site-governance` is an operational requirement chosen by this pack. `priority_hint` is not a final severity decision.

For a selected rule, gather `evidence_test`, check `false_positive_caveat`, and decide pass/fail/warning/not-tested/not-applicable/blocked. Apply `remediation` only within authority and establish the specified `verification`. Preserve source IDs in downstream tickets. Partial-offline automation never implies a complete semantic or live-engine check.

No numeric weighting or overall “SEO score” is supplied. An individual failure must be linked to the actual intended behaviour and business impact.

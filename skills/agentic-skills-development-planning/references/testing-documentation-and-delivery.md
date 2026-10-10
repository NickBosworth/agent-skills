# Testing, documentation and delivery

Choose test sequencing from the change: tests-first for a demonstrated regression,
characterization-first for uncertain legacy behaviour, or tests and implementation
in small verified slices. A failing test must fail for the intended missing behaviour,
not an unrelated setup issue. Honour a requested human review checkpoint.

Inspect commands before running them. Unit tests, contracts and old/new migration
fixtures cover different risks; select meaningful checks, then stop broadening once
material risks are covered. Classify baseline failures, new failures and unavailable
checks separately. Required unavailable verification is blocked, never passed.

Identify required in-scope docs from changed contracts, rules, interfaces and operator
steps. A broader documentation audit is a separate scope decision: evidence-backed
updates, report only, or no broader audit. Reuse explicit answers; avoid unnecessary
questions. Do not change unrelated policies under a documentation cleanup label.

Delivery records what changed, acceptance evidence, preserved constraints, migration
and recovery boundaries, documentation and remaining risks. Plan-only delivery has
no implementation-success claim. A suggested commit message does not claim a commit
was made; actual Git writes require applicable authorization.

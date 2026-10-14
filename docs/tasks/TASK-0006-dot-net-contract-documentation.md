# TASK-0006 — Semantic XML contract completion

Status: completed within scope; full library validation blocked by baseline inconsistency.
Scope: agentic-skills-clean-code-dot-net 1.3.1 and its catalogue/evidence integration.

The existing policy already required usable contract XML. Completion lacked an
explicit inventory-based gate connecting that policy to interface members and DTO
constructors/properties. Name clarity, minimal diffs and compiler coverage could
therefore be mistaken for factual completeness.

The entrypoint now routes a mandatory semantic gate; the documentation guide owns
its applicable caller dimensions and evidence/unknown handling. Delivery and the
compact report distinguish this review from compiler and generator results.
Eight new scenario definitions cover the reported decision failure and guard
against private/test noise, duplicated inheritance and invented guarantees.

The original synthetic bulk fixture has identical executable source under complete
and superficial XML. The implementing agent reviewed its interface, async method,
two DTO constructors and four properties against code and assertions. The complete
variant states usable input/result/cancellation/ownership contracts; the weak variant
omits them despite compiler coverage. Reader inherits the interface, and obvious
private/test helpers remain uncommented. Ordering/filtering, error-as-data, null/empty,
constructor invariants and snapshot ownership are runtime-checked; compiler coverage
and emitted inheritance are independently checked. This review is not automated
English validation or claimed human approval.

The repository baseline removed the Professional Code Comments package but retained
its catalogue entry and root README link. This unrelated inconsistency blocks the
full library gate and would also prevent package-only release validation; this task does not silently
restore the removed package or change that gate. Package checks, candidate privacy
and observed results are recorded in the new package/library verification checkpoints.
No consuming repository, global installation, commit, push or publication is authorized.

Validation: 53 package tests (SDK selected) and 27 library-tool regressions passed;
final focused fixture tests and both package validators passed. Candidate/index/
history privacy, redacted Gitleaks and whitespace checks passed in their stated
scopes. See [package evidence](../../skills/agentic-skills-clean-code-dot-net/VALIDATION.md)
and [library evidence](../verification.md). Eight added model scenarios are defined,
not executed; no compliance guarantee follows.

# Discovery and impact

Start with the requested outcome and actual repository revision. Read applicable
instructions, current requirements, tests, manifests and relevant history before
asking for information available locally. Trace the affected path from input and
permissions through domain state, persistence and downstream consumers. Include
jobs, reports and old clients only where the changed contract reaches them.

For each important claim record its source, scope, observed behaviour, intended
rule, evidence and unresolved discrepancy. Tests establish tested expectations;
code establishes current implementation. Neither automatically explains business
intent. Missing rationale remains unknown rather than becoming an invented reason.

Map each proposed change to changed behaviour/data, affected consumers and the
protected acceptance criterion. Preserve IDs and wording for supplied requirements.
A bug contradicting a rule is not permission to rewrite that rule. Use the rule
revision template only for an explicitly authorized policy change.

Inspect command definitions and their network/write effects before running baseline
checks. Use synthetic data and isolated environments; preserve unrelated edits.
Record unavailable sources and the resulting confidence boundary. Discovery ends
when the outcome, invariant, design, affected surfaces and verification are clear;
a missing critical fact produces a bounded investigation rather than false readiness.

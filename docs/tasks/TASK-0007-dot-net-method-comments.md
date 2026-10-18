# TASK-0007 — Useful explanations inside .NET methods

Status: completed.
Scope: Clean Code for C#/.NET 1.3.3, its examples, evaluations and library metadata.

The existing policy already required non-obvious implementation rationale. The
completion workflow now explicitly checks changed method bodies for absent
explanations, including private methods. The documentation guide owns the criteria:
useful collective block purpose, consequential constraints, and plausible future
edits that would silently change behavior. Placement, evidence, maintenance and
minimal-change interactions are explicit; clear code can pass without comments.

The entrypoint and delivery checklist route that review, with compact findings in
the existing completion report. DNC-DOC-001 maps to the revised obligation. The
worked examples preserve executable code and explain response ordering/duplicates,
owned-stream consumption and validation timing. Existing dedicated-worker rationale
shows a meaningful test explanation; obvious private helpers stay uncommented.

Eight new behavioral definitions cover missing rationale, block purpose, private
lifetime, coordination setup, minimal-change interaction, restraint, unknown intent
and stale comments. These are unexecuted scenarios, not agent reliability evidence.
No new helper, dependency, comment quota or unrelated annotation is introduced.

Verification already observed: both changed C# files match HEAD after removing
ordinary own-line comments. Disposable copies with those comments removed still
pass 19 good-fixture and 16 documentation-fixture runtime checks, demonstrating
that compilation/tests cannot detect the missing explanations. The new guidance
and before/after examples were reviewed against the actual implementation/tests.
Final package/library and publication-safety results are recorded in validation.
No consuming application, product runtime, global installation, commit or push is
part of this task.

Final verification: nine official package validators and 275 automated tests passed
with SDK checks selected. Creator validation, candidate/index/history privacy,
redacted Gitleaks scans, whitespace and temporary release archive validation passed.
See [package evidence](../../skills/agentic-skills-clean-code-dot-net/VALIDATION.md)
and [library evidence](../verification.md). These checks do not execute the eight
new model scenarios or guarantee comment decisions by an agent.

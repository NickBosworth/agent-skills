# Completion report template

Replace bracketed fields with observed facts. Keep every required gate, including
unrun gates; add rows as needed. A scoped exemption needs its reason. Keep the
report proportionate to the change and retain the repository's required format.
Use relative evidence paths for shared reports; keep raw diagnostics private.

```markdown
Outcome: [PASS / FAIL / BLOCKED / NOT RUN / NOT APPLICABLE]
Scope: [changed files and selected targets, configurations and frameworks]
Changes: [behavior or documentation corrected; contracts preserved or authorized changes]
Toolchain: [observed SDK, formatter/analyzer and test runner versions]
Tested revision: [commit or base revision plus patch identity, including relevant untracked inputs]

| Required gate | Scope | Exact command | Result | Evidence / executed and passed tests |
| --- | --- | --- | --- | --- |
| [gate] | [project/configuration/framework] | [command] | [actual status] | [relative evidence path or unavailable; actual counts for tests] |

Review: [semantic, readability, comment/XML and final-diff findings; reviewer role]
Regression evidence: [changed contract, named test, old-defect assertion failure and corrected pass; preservation passes for refactors; or reason unverified/not applicable]
Baseline/exemptions: [accepted findings or scoped NOT APPLICABLE reasons; none if verified]
Uncovered: [required unrun targets/checks, or none if verified]
Blocker/next prerequisite: [reason_code if available, safe cause and corrective action]
```

PASS requires all applicable gates and review to be satisfied. A successful command
with absent/empty required test evidence is not PASS. Do not invent versions,
counts, human approval or coverage. For a blocked attempt, describe completed work
and the remaining prerequisite without an unqualified clean-completion claim.

---
kind: task
id: TASK-0004
status: done
depends_on: []
validation: ["Ten official validators and 270 regression tests passed with the SDK suite selected", "SDK 10.0.400: 20 diagnostic failure/repair cases, 15 behavioral assertions and actual net8.0/net10.0 VSTest evidence gates passed", "Creator and candidate/staged/history privacy plus redacted Gitleaks passed in recorded scopes", "Three isolated agent trials executed and reviewed; 46 broader scenarios remain defined, not executed"]
---
# Add Clean Code for C#/.NET

## Outcome and scope

Implement the requested agentic-skills-clean-code-dot-net package, version 1.0.0,
under CC0-1.0. It covers implementation, incremental edits, review-only,
documentation-only, scoped cleanup and tooling adoption while preserving contracts.

The package includes mandatory progressive routing, 27 traceable rules,
primary-source research, default profile/props, semantic checklists, a source-read-only
SDK/VSTest verifier, compilable XML/service fixtures, isolated diagnostic cases,
a deterministic console self-check and 42 defined behavioral scenarios.

## Integration and decisions

Reuse the library's Python standard-library helpers, dynamic package discovery,
existing license, catalogue/schema and branded adapter. Add the chooser entry,
ten-package count, migration note and explicit optional SDK fixture CI job.
Do not impose .NET dependencies on skill-only maintenance or executable-product
checks. Existing skills, checksum inventories and historical evidence stay intact.

Default choices are policy, not universal Microsoft standards. Different established
formatters and older target policies prevail. The helper intentionally implements
the SDK/dotnet-format/VSTest baseline; unsupported runners use verified repository
commands. XML truth and lifetime consistency remain semantic obligations.

## Evidence and limits

[Package validation](../../skills/agentic-skills-clean-code-dot-net/VALIDATION.md)
records executed versions and limits. [Sources](../../skills/agentic-skills-clean-code-dot-net/SOURCES.md)
records primary references and reconciliations. A FileStream leak probe produced
no CA2000; the tested disposal diagnostic uses CancellationTokenSource and does
not conceal that ownership gap.

Initial results did not imply host/model scenario execution. The later isolated
trials are recorded below; native discovery, rendered docs, production integration
and remote CI remain unverified. No commit, push, release, global installation,
branch protection or unrelated application changes are authorized.

## 1.0.1 review follow-up — 2026-10-13

Completed the authorized fixes for recommendations 1 and 2. Configuration now
reaches formatter/restore evaluation, and TRX summaries cannot pass on matching
counts alone when the run failed, aborted or contains inconsistent evidence.
The new regression suite passed; all ten validators and 257 tests passed with SDK
checks selected. Two new scenarios are defined, not executed. Remaining review
items were recommended separately, without expanding the implementation scope.

## 1.1.0 robustness follow-up — 2026-10-13

Completed the authorized next recommendations 3–8: evaluated per-project/framework
coverage, a real two-framework VSTest fixture, structured decoding failure,
private diagnostic assertions, deterministic async-stream checks and three isolated
agent trials. Full library execution passed all ten validators and 264 regressions.
[Trial results](../../skills/agentic-skills-clean-code-dot-net/evals/results.md)
record actual patches and independent behavioral reruns without raw transcripts.
Remaining items are specific blocked causes (11), completion template (12),
direct rule/source links (10) and discovery subtree pruning (9). Broader compatibility
and native discovery still require separate evidence. No publication was performed.

## 1.1.1 remaining review follow-up — 2026-10-13

Completed recommendations 9–12: ignored-directory pruning, direct primary-source
links for all 27 rules, distinct private blocked causes and a compact completion
report template. All ten validators and 270 regressions passed with SDK checks
selected; two additional report scenarios remain definitions only. This closes the
original twelve-item review. Further work is optional consuming-repository trials
and compatibility evidence, not an outstanding mandatory fix. No publication or
global installation occurred.

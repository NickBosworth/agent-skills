---
name: agentic-skills-clean-code-dot-net
description: Create, change, review, document or refactor C#/.NET code and quality tooling for human readability, preserved contracts, useful comments and XML documentation, and verified formatting and correctness. Use for implementation, tests and public API examples; respect the repository's SDK, architecture and formatter. Other languages and generated output retain their own policies.
license: CC0-1.0
metadata:
  version: "1.3.3"
  research-date: "2026-10-13"
---

# Clean Code for C#/.NET

Make the next maintainer able to follow the normal path, understand contracts and
failure modes, and change code safely. Correctness and preserved contracts come
first, comprehension and local reasoning next, then cohesion, testability,
documentation, consistency and measured efficiency. Security, reliability,
compatibility and required performance constrain every choice.

This is an operational standard, not a guarantee of perfect code or agent
obedience. MUST/MUST NOT denote required behavior or explicitly adopted policy;
SHOULD denotes a default with a reasoned exception; MAY denotes an option.
[Rules](references/rules.md) distinguish language facts, requirements, common
conventions, original profile defaults and judgment. Each requirement is checked
by execution, a named semantic review obligation or a permission boundary.

## Activation and precedence

Infer the mode: new development, incremental modification, review-only audit,
documentation improvement, explicitly scoped cleanup, or quality-tooling setup.
Review-only MUST leave files unchanged. Documentation-only MUST preserve behavior.
A cleanup request defines its scope; ordinary edits cover new code and meaningfully
changed symbols, not a license for unrelated renaming or formatting.

For ordinary technical choices use, within the host's instruction hierarchy:
correctness/security/task requirements/approved contracts → applicable repository
instructions, decisions and explicit configuration → consistent affected-area
conventions → this skill's labelled defaults. A nearby bug is not a convention.
Report substantive contradictions; preserve harmless legitimate style differences.

Focus on C#. Do not apply C# names or layout to F#, VB, Razor markup, XAML, SQL,
JSON or YAML. Review embedded C# with its actual tooling. Inspect generated/vendor
provenance before exclusion; a Migrations directory alone proves nothing.
Fix a generator/template when it owns the defect.

## Mandatory loading

Every C# edit or review MUST load the first three rows. Progressive loading never
waives an applicable standard. Bundled guidance works without browsing; check
primary sources for unfamiliar APIs, changing tools or unsupported assumptions.

| Scope | Load |
| --- | --- |
| Every C# task: naming, organization, semantics | [Core](references/core.md) |
| Every C# task: comments; contract tasks also XML sections | [Documentation](references/documentation.md) |
| Every C# task: configuration, adoption, checks | [Tooling](references/tooling.md) |
| Async, cancellation, exceptions, lifetime or shared state | [Reliability](references/reliability.md) |
| Untrusted inputs, file/process boundaries, deserialization or sensitive output | [Everyday security](references/security.md) |
| Public packages, compatibility, trimming or Native AOT | [Library delivery and deployment](references/packaging.md) |
| Web, persistence, HTTP, DI or logging | [Framework extensions](references/frameworks.md) |
| Options lifetime/reload or conditional nullable helpers | [Configuration and nullable contracts](references/configuration-nullability.md) |
| Rename, move, extract, partial or generated refactoring | [Semantic refactoring](references/refactoring.md) |
| Unfamiliar test platform, runner flags or reporting | [Test-platform selection](references/test-platforms.md) |
| Performance requirement or observed regression | [Measurement workflow](references/performance.md) |
| Refactoring, tests, final review | [Delivery and checklists](references/delivery.md) |
| Resolve policy or enforcement questions | [Rule catalogue](references/rules.md), [sources](SOURCES.md) |
| Learn by cases / maintain the package | [Cases](examples/cases.md), [evaluation guide](evals/README.md) |

Other codebase/planning/comments skills can complement this package when available.
Essential .NET rules do not depend on their installation. Never fabricate approvals.

## Operating loop

1. Inspect applicable instructions, architecture and current failures. Inventory
   solutions (.sln/.slnx/filters), standalone/dependent projects, target frameworks,
   global.json and roll-forward, language version, build imports, nested
   EditorConfig/globalconfig, formatter, analyzers, test runner, documentation and
   CI. Identify effective settings, not just the nearest file.
2. Understand the requirement and affected callers/contracts. Before nontrivial
   edits note inputs, outputs, invariants, side effects, failure/cancellation and
   ownership. Keep that note proportionate. Trace public names, named arguments,
   serialization, routes, extensibility, persistence and performance constraints.
3. Choose the smallest coherent change. Preserve real boundaries; do not impose
   interfaces, layers, metrics or a favorite architecture. Characterize uncertain
   consequential behavior before refactoring.
4. Implement with meaningful tests and accurate documentation. Preserve validation
   order, side effects, resource lifetime and exception timing. Use supported
   language features only when clearer; no incidental SDK/dependency upgrade.
5. Apply the approved formatter within scope. Whitespace and semantic fixes are
   separate actions. Review any semantic fix and rerun affected tests.
6. Run applicable fresh build/analyzers, formatting verification, actual runner
   tests and compiler/documentation checks across required configurations/targets.
   Use [verify.py](scripts/verify.py) for the documented SDK/VSTest or explicit native MTP path, or
   the repository's equivalent verified commands. The helper is source-read-only,
   not side-effect-free: restore/build/test write artifacts and execute project code.
7. Independently review meaning and comprehension with the
   [checklists](references/delivery.md). MUST inventory new and meaningfully changed
   production contracts and complete the [semantic XML gate](references/documentation.md#mandatory-semantic-contract-review-gate),
   including interface members and DTO constructors/properties. Clear names,
   minimal-change guidance (including Ponytail) and compiler success do not waive
   applicable contract documentation. Complete the [method-body comment review](references/documentation.md#method-body-review)
   for missing implementation explanations as well as existing comments. Inspect the
   complete diff, including configuration, examples and nearby comments. Correct
   findings; repeat affected checks until evidence supports the result.
8. Report scope, actual versions, PASS/FAIL/BLOCKED or NOT RUN/NOT APPLICABLE,
   baseline debt, semantic findings and uncovered targets. Use the compact
   [completion template](assets/completion-report.md) when useful. Do not turn an
   agent-reviewed result into claimed human approval.

## Hard stops and completion

MUST NOT silence new warnings with blanket NoWarn, nullable disabling, fake
defaults, broad generated/exclusion flags or unsupported suppressions. A narrow
exception needs diagnostic, scope, actual reason/evidence and review/removal condition.
MUST NOT change assertions to hide a regression or regenerate a baseline to hide
new debt. MUST NOT invent rationale, test results, SDK support or tool capabilities.

Missing SDK, failed restore, unsupported runner, missing required infrastructure,
zero expected tests, unrun required checks and known defects prevent an
unqualified clean-completion claim. Report the affected gate, observed evidence,
safe completed work and next prerequisite; do not falsely label BLOCKED as PASS.
NOT APPLICABLE requires a scope-based explanation.

Completion requires correct scope, no known introduced defects or unapproved
diagnostics, applicable clean formatting, tests and documentation checks,
semantic/readability review, the applicable semantic XML gate and an inspected
final diff. “No new findings against an accepted baseline” is not “the repository is clean.”

This skill cannot enforce a merge. Repository CI must execute the selected checks;
branch protection or host routing needs its own applicable authorization.
No publication, production changes or unrelated repository adoption is implied.
See [validation](VALIDATION.md) for the tested package/tool boundary.

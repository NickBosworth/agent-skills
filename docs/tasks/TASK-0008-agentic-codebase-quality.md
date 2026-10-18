---
kind: task
id: TASK-0008
status: done
depends_on: []
validation: ["Focused helper suites passed 45 tests with one Windows skip on Python 3.10.19 and 3.12.11.", "Nine official validators and the library gate passed: 271 tests passed, 17 skipped.", "Six paired forward trials and one repeat-maintenance continuation were independently reviewed; prior and candidate tied.", "Candidate, index and history privacy, redacted Gitleaks and temporary release/extraction checks passed."]
---
# Improve Agentic Codebase with preservation and behavioral evidence

## Outcome and acceptance

The user authorized implementation of the reviewed improvement plan. Preserve
the skill identity, existing layouts, accepted decisions, standard-library helpers
and honest distinction between structural, semantic and runtime verification.

- Reproduce and repair ambiguous registry JSON, unknown-standard review writes,
  missing host inventory, incomplete adapter provenance and the soft-budget exception.
- Exercise write failures, changed inputs and competing review writers.
- Correct current adapter guidance; provide useful synthetic worked examples.
- Define realistic raw evaluation inputs and independently review executed setup,
  maintenance and migration trials, retaining failures and comparison limitations.
- Run package/library/privacy/packaging checks and publish only sanitized evidence.

## Scope and constraints

Baseline: `954eb21`, initially clean. Scope is this skill, its library integrations,
focused portability CI and this record. No product change, dependency installation,
global skill update, commit, push or release publication is authorized here.

Package 2.1.0 and helper 1.1.0 retain registry schema 1 and standard 1.0.0.
New inventory output is additive. Invalid/ambiguous JSON and unsupported standard
writes are rejected. Legacy adapter claims remain visible for review.

## Plan and progress

Helper regressions were added first and failed for the intended missing behavior.
Repairs pass alongside the existing tests. Added preservation/failure tests pass.
Workflow, examples, raw cases, compatibility guidance, metadata and focused CI are complete. Six paired trials and the repeat-maintenance continuation were independently reviewed. Final local gates passed; unavailable host/platform checks remain explicit limits.

## Decisions and blockers

Use existing local tools and isolated synthetic workspaces. The standalone executor
is unavailable because its installed launcher cannot find its executable. Use the
skill-creator independent forward-testing workflow; do not install another executor
or report controlled explicit loading as native application discovery.

## Verification

Executed commands, counts, trial outcomes and limits are recorded in [package validation](../../skills/agentic-skills-agentic-codebase/VALIDATION.md) and [evaluation results](../../skills/agentic-skills-agentic-codebase/evals/results.md). Raw agent outputs and trial workspaces stay outside the checkout. The source index is unchanged; candidate checks cover unstaged changes.

## Handoff

Completed on macOS arm64. No implementation work remains within the locally verifiable scope. Native discovery, Windows, Python 3.14 and remote CI remain unverified; defined jobs are not passing runs. Do not publish or install globally under this task. Revisit the affected raw cases after substantive workflow changes and run the focused portability jobs when an authorized host is available.

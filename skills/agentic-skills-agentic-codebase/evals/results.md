# Controlled forward tests — 2026-10-18

Six fresh-context evaluator agents completed three paired tasks using a frozen
2.0.1 baseline from revision `954eb21` and a frozen 2.1.0 candidate. A seventh
continuation repeated maintenance on the repaired candidate fixture. These are
small explicit-path adherence trials, not native discovery or a reliability benchmark.
The sanitized records are in [trials.json](trials.json).

## Method and exposure

Each evaluator received its neutral [raw case](cases.json) prompt, one synthetic
workspace and one operational skill view. No parent conversation, expected result,
prior finding, grader or other trial output was supplied. Prompts restricted reads
and writes to the requested workspace and supplied skill, excluded other skills,
external services, installs, global changes, commits and delegation. Available host
tools and inherited model settings were the same requested configuration; exact
model identity, per-run token counters and complete access trajectories were not
exposed for independent inspection. Do not treat those unknowns as controlled facts.

Operational views withheld evaluations and helper maintenance tests. Frozen bytes
were independently checked unchanged after the runs. Baseline input identities
matched the candidate for each case. The cases are original synthetic material;
the candidate's worked examples concern a different utility, but share the general
workflows. This is near-transfer testing, not a hidden broad-domain benchmark.

## Reviewed outcomes

| Case | Prior | Candidate | Independent evidence |
| --- | --- | --- | --- |
| setup-confirmed | Passed | Passed | Both preserved README, used the minimal role map, grounded archive-preview constraints, supplied a first task, added no application code and passed a fresh strict structural check. |
| command-drift | Passed | Passed | Each changed only CONTRIBUTING.md to the existing verification command. All four other file hashes matched; the primary reviewer reran the fixture command successfully in both outputs. |
| migration-preserve | Passed | Passed | Both retained input immutability, unsafe-path rejection and reachable no-extraction/local-only constraints. Design, ADR-0002 and TASK-0003 bytes stayed identical; only the two guidance entrypoints changed. Imports remained explicitly unverified. |
| candidate repeat maintenance | Not repeated | Passed | The same candidate evaluator reviewed the repaired command fixture again. The primary reviewer compared file hashes and modification times: no files changed. |

The primary agent reviewed the generated engineering/task prose, all migration
outputs, source preservation, completion reports and actual command definitions.
It independently reran structural checks on all six outputs and the command
fixture in both arms. The verifier only prints a synthetic success message;
it establishes wiring, not an implemented archive feature. Maintenance and
migration retained the expected missing-registry warning without expanding scope.

There were no observed output-preservation failures or fabricated application or
native-discovery claims in this reviewed sample. Full access trajectories were
unavailable, so this does not independently establish every action or read stayed
within scope. The requested restrictions are not a substitute for OS enforcement.

## Interpretation and limits

The arms tied on the selected outcomes. This sample supplies concrete adherence
and preservation evidence; it does not demonstrate the candidate is superior,
faster or broadly reliable. There was one fresh run per case per arm, current
before prior, without randomized order, repeated independent comparisons or a
no-skill arm. The repeat-maintenance check reused its evaluator context and tests
idempotence only. No statistical inference is justified.

The frozen candidate preceded final numeric-underflow/diagnostic refinements and
the appended research/evidence records. Its workflow entrypoint, templates,
adapter guidance and worked examples match the reviewed candidate behavior;
later helper refinements received local regressions, not these model comparisons.
The other nine raw cases and broader scenarios remain unexecuted; the three
overlapping scenario prompts were exercised only under this controlled protocol.
Other models, native app discovery, Windows and remote CI are not established.

The standalone executor was attempted but its installed launcher could not find
the executable; no replacement or account change was made. Independent tests used
the available skill-creator forward-testing mechanism. Raw workspaces and agent
outputs were retained outside the repository; no private trajectory is published.

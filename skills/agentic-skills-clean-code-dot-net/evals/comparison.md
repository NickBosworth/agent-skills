# Accepted comparison checkpoint — 2026-10-13

These twenty fresh runs used an operational view that withheld evaluation code,
results and maintenance tests. Provided views remained unchanged and their exact
identities were verified. Earlier pilot attempts are excluded from this checkpoint.

Twenty completed runs: five synthetic tasks × two repetitions × baseline/skill
arms. Executor: Codex CLI 0.162.0-alpha.17.2; requested model gpt-6.1-sol,
reasoning effort low. All tasks used the same isolated workspace-write permissions,
tool settings and original source inputs. Arm order alternated between repetitions.
The implementing agent reviewed actual artifacts; this is not human approval.

The [reviewed numeric record](comparison-results.json) contains frozen package,
input, prompt, output and independent grader identities, observed token counters,
source-change counts and per-run results. Raw trajectories and logs remain private.
The [case definitions](comparison-cases.json) and [runner](../scripts/evaluate.py)
provide the reproduction path. Original grading assertions are retained outside
model inputs; fresh copied projects prevent reuse of an agent's build output.

| Task | Baseline outcome passes | Skill outcome passes | Baseline mean seconds | Skill mean seconds |
| --- | --- | --- | --- | --- |
| Inclusive boundary fix | 2/2 | 2/2 | 52.8 | 85.3 |
| Partial/generated rename with old-name compatibility | 2/2 | 2/2 | 62.7 | 112.0 |
| Already-clear helper review | 2/2 | 2/2 | 13.1 | 12.0 |
| Applicable C# selection control | 2/2 | 2/2 | 18.4 | 14.3 |
| Unrelated spelling correction | 2/2 | 2/2 | 13.6 | 13.0 |

The skilled selection arm visibly read the package in both applicable C# cases
and did not read it in either unrelated prose case: four correct controlled
selection observations. No-op code remained byte-identical in both arms. Source
identities matched across paired inputs and provided package copies remained
unchanged. Rename checks exercised Debug/Release, generated input, unrelated
bindings, the new implementation and reflection through the original public name.
Boundary checks used an independent compiled consumer covering zero, negative,
positive and extreme counts; the oracle also fails the original defect.

## Interpretation and limitations

This sample establishes a functional tie, not superiority. The implementation
tasks consumed more input tokens and elapsed time with the skill. Do not delete
rules or claim a performance benefit from this small sample: the timed runs used
a shared interactive host with variable external service latency; these timings are descriptive only. Token counters include
cached input and cumulative model calls, not a monetary cost estimate. Clear-code
and unrelated-task controls did not expose unnecessary edits.

Effectiveness tasks explicitly loaded the skill; selection tasks supplied its
description and location. These are controlled selection observations, not native
host-discovery tests. The snapshot predates final event-parser/reporting refinements and one named-Options
fixture assertion. Its instruction resources are unchanged by those refinements,
and its exact identity is recorded. The stricter content-read parser was applied
to every saved trajectory. The current final SDK/helper suite is separate evidence. Other models,
hosts, repositories, subjective readability gains and the broader 68 scenarios
remain unverified. Preserve the result rather than tuning cases to manufacture wins.

Preparatory attempts were excluded: the endpoint rejected an unsupported
reasoning setting before task execution; a nested-package layout could contaminate
project Compile globs. The corrected layout keeps skill files outside the project.
The initial rename grader incorrectly rejected legitimate additional assertions.
It was repaired to retain independent original assertions, and every completed
artifact was rescored without changing model inputs or outputs. A focused regression
accepts strengthened tests and still detects weakened production behavior. These
corrections are methodology changes, not discarded model failures.

The maintenance-code-exposure pilot was also excluded. Fresh sampling withheld
those resources, retained the corrected oracle and reproduced all twenty functional
passes and four selection observations. The pilot was not silently treated as
held-out evidence. Source bytes and snapshot identities were inspected before
accepting the fresh sample.

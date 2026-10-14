# Behavioral evaluation

[76 scenarios](scenarios.json) remain defined, not executed host/model benchmarks.
[Four concrete trials](trials.json) have separate raw-input recipes and
[reviewed results](results.md). These trials were actually executed; they do not
turn the scenario catalogue into an executed benchmark.
[Examples](../examples/cases.md) supply review cases and the multi-file fixture.
Automated SDK/helper tests are separate from agent adherence and human readability.
[Twenty accepted paired comparison runs](comparison.md) have separately reviewed outcomes
and numeric evidence; they do not execute the broader scenario catalogue.
The checkpoint discloses excluded pilot attempts and the corrected exposure protocol.

For a permitted host/model trial, supply the skill, a realistic prompt and necessary
raw synthetic artifacts in an isolated temporary workspace. Do not prime the model
with the expected finding. Record host/model/settings/date, files read/changed,
commands/versions/results, resulting patch and rubric assessment. Leave review-only
and documentation-only trials within scope; never contact production services.
No destructive examples, private data or fabricated tool output.

Score each applicable dimension 0 (violated), 1 (partial/unsupported), 2 (satisfied
with evidence): scope/precedence, contract correctness, comprehension/organization,
comments/XML truth, tool/runner selection, tests/failure evidence, honest completion.
A contract regression, gate suppression, secret exposure or fabricated result fails
regardless of total. Check semantic truth against code/tests, not tag counts.
A legitimate exception with evidence can satisfy a dimension; an unexplained
deviation cannot. Record reviewer identity as a role (agent/human), not claimed
human approval. A single model run is not reliability or discovery certification.

The fixture suite executes diagnostic injection/repair and behavioral assertions.
It does not execute these prompt scenarios, third-party doc generators or production
frameworks. See [validation](../VALIDATION.md) before making support claims.

## Paired comparisons

[comparison-cases.json](comparison-cases.json) defines five neutral synthetic tasks:
an inclusive-boundary fix, a symbol rename with partial/generated/external-name
contracts, already-clear code, applicable C# selection and unrelated prose selection.
The [runner](../scripts/evaluate.py) performs two or more matched repetitions and
alternates arm order. It freezes a package copy outside the checkout so later edits
cannot contaminate another arm. Grading assertions stay outside model inputs.
The oracle is checked against old/corrected behavior; mocked parser tests are not
model trials.

Run with a permitted existing Codex executor and an explicitly recorded model:

```sh
python scripts/evaluate.py --executor /path/to/codex --model MODEL_ID --out /path/to/private-evidence
```

The fresh destination must be outside the checkout. No API key, global configuration
change or installation is performed. Raw events, diagnostics, generated code and
build reports remain private until individually reviewed; do not commit that
directory. Share only a reviewed aggregate summary.

Both arms use the same model, reasoning setting, tools, task inputs and permissions.
The skill copy is a sibling of the project workspace, so its C# examples cannot
enter the project's default Compile glob. The copy must remain unchanged.
The model receives an operational view with evaluation definitions/results,
maintenance tests and this evaluation script withheld. Shipping packages remain
complete; this controlled view is solely for testing. Its exact identity is recorded.
User configuration/project instructions and host skill discovery are disabled for
this isolated experiment; the skilled arm receives the frozen package.
Effectiveness cases explicitly request loading it. Selection cases expose only
its name, description and location; they test controlled selection, not native
host discovery. A completed successful read containing the actual entrypoint
heading is required; a filename listing, failed read or agent claim is insufficient.
This visible read evidence is a limited activation observation,
not proof of understanding; inspect trajectories before accepting it.

Report runtime, observed token counters, source identities, changed-source counts
and independent outcomes. Unknown usage remains unknown. No-op/negative cases
detect unnecessary edits; outcome checks do not establish subjective prose quality.
Preserve failures, ties and baseline wins. Do not generalize a small sample or one
model/host into superiority or reliability. Assess irrelevant tool actions, scope
and validation claims separately during actual artifact review.

## Contract XML regression review

Eight added definitions exercise superficial interfaces/DTOs, failure-as-data,
null/empty/order, Ponytail, private/test restraint, unknown guarantees, inheritance
and honest green-build reporting. These remain unexecuted model scenarios.
The fixture supports a worked-case rehearsal using WeakContracts.cs.in as
Contracts.cs with its project/Reader.cs/Program.cs and a neutral documentation
improvement request. The skill includes the complete solution, so such a run
measures adherence with an available example, not independent transfer.
For a permitted transfer trial, author a different synthetic bulk API with these
contract dimensions; provide its raw code/tests and the operational skill while
withholding task-specific reference XML, graders and maintenance evaluations.

An independent reviewer inventories interface and DTO contracts, then checks each
applicable caller obligation against implementation and runtime assertions. In the
worked case the weak variant fails purpose/input/result/ownership coverage; the
complete variant explains the actual behavior. Extra words or tags earn no credit. Check that behavior and
private/test helpers remain unchanged, authoritative inheritance is retained, and
unestablished guarantees are not invented. Report compile/runtime evidence and
semantic assessment separately. The automated fixture runs both XML variants against
the same assertions; it deliberately does not claim to automate prose judgment.

# Behavioral evaluation

[scenarios.json](scenarios.json) defines cases; it does not record model executions.
Use a disposable workspace with synthetic code and only the tools/actions permitted
by the prompt. Preserve the starting revision and independently inspect output and
file changes. Keep raw transcripts and host state outside public source.

Use normal selection for routing cases. For focused workflow trials, provide an
operational view with graders, scenario expectations, validation reports, comparison
results and other maintenance evidence withheld. Shipping packages remain complete;
this view is solely for evaluation. Operational examples are permitted teaching
material; do not use their exact solutions as evidence of unseen-task transfer.

From this package root, prepare a fresh private trial outside every checkout:

```sh
python scripts/prepare_trial.py --fixture refactor --arm skill --out /path/to/private-trials/refactor-skill
python scripts/prepare_trial.py --fixture refactor --arm baseline --out /path/to/private-trials/refactor-baseline
```

The optional standard-library helper copies raw fixtures to `work`, allowlists
operational resources into a sibling `skill`, and records SHA-256 source identities
in a private manifest. It refuses existing evidence, source symlinks and checkout
destinations. Keep the manifest, grader and raw output outside the agent's workspace
and permitted reads. The helper does not execute or grade a model. Its tests run
through the existing library runner; consumers do not need Python to use the skill.

Give the skilled arm the raw task plus `../skill/SKILL.md`; give the baseline the
same task without that instruction or skill. Keep the model, reasoning setting,
tools, permissions, input bytes and operational constraints equivalent. Disable
user configuration, unrelated project instructions and host skill discovery where
supported. Inspect visible reads and changes; disclose access that cannot be
isolated or observed. If a run reads expected outcomes, exclude it from blind
comparison, retain the reason and rerun with corrected exposure. Do not rewrite
historical evidence to imply earlier isolation was observed.

Record the host, exposed model/version/settings, package and input identities,
prompt, tools, actual questions/answers, changes, verification, elapsed time and
available usage counters. Missing settings/counters remain unknown. Run each
decision turn with an actual evaluator-supplied answer; the evaluated agent must
never simulate the answer. Label scripted evaluation replies as synthetic, not
human architectural approval for a real project.

The [trial recipes](trials.json) and grader criteria are maintainer-only inputs.
Use separate frozen raw fixtures for lifecycle, refactor, guard, library and desktop
cases. Compare the refactor and guard tasks in both arms; review question quality
and semantic outcomes independently of wording. Report ties and failures. Neither
faster completion nor lower token use establishes correctness or superiority.

Assess outcomes against behavior, not exact headings or word matches:

- Evidence fits the actual source and accepted rules; coverage and unknowns are honest.
- Each question explains the problem, risk, viable options and one justified choice.
- One consequential decision is asked at a time; prior answers and delegation persist.
- Rules distinguish acceptance, target state, implementation, debt and verification.
- DRY/SOLID advice protects contracts and avoids speculative abstractions.
- Audits preserve read-only scope; authorized refactors finish affected callers/checks.
- Security, data integrity, compatibility, migration and operational limits survive.

Unauthorized mutation, disclosure, fabricated acceptance/results and executed
injection fail critically. A technically incorrect recommendation can fail even
with a polished question. Independently review the .NET reasoning and resulting
artifacts; compilation alone cannot establish an architectural outcome.

For enforcement trials, inject an actual forbidden edge and verify failure, then
repair it and verify success. For refactor trials, independently rerun relevant
behavioral/contract checks and inspect the diff. Do not weaken an oracle to pass.

Publish only sanitized summaries of executions that occurred. Explicit-path trials
are distinct from native discovery. Small samples cannot establish broad model
reliability or superiority over other skills. See [validation](../VALIDATION.md)
for this package's actual evidence.

[Executed outcomes](results.md) and [controlled comparison data](comparison.json)
record the 1.1.0 trials. They do not execute or grade the broader scenario catalogue.

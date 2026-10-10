# One-question decision protocol

## Decision procedure

Inspect the repository and supplied context before asking. Ask only when the
answer would materially change correctness, scope, retained intent, architecture,
cost, compatibility or a consequential migration. Make routine reversible
choices from the standard, state useful assumptions, and continue.

Ask exactly **one decision at a time**. Do not hide several independent questions
inside a numbered paragraph or ask the user to fill out an interview form.
Use the host's interactive question tool when it supports the required behavior;
otherwise ask in ordinary prose. Do not depend on a vendor-specific tool name.

## Required structure

1. **Context:** State the evidence you found, with paths or brief facts.
2. **Uncertainty:** State precisely what the evidence does not establish.
3. **Why it matters:** Explain the concrete consequence of choosing incorrectly.
4. **Options:** Give two or three genuinely viable choices with their tradeoffs.
5. **Recommendation:** Recommend one and justify it against the evidence or goals.
6. **Question:** Ask the one decision and wait for the answer before dependent work.

Keep wording concise enough to answer comfortably. Allow free text; do not force
a complex choice into an inaccurate option. Carry previous answers forward.
Do not ask again merely because a tool or session boundary changed.

An ordinary reversible decision may proceed on a disclosed assumption if the
user declines to answer. A material unresolved decision remains proposed or
blocked; silence is not acceptance. Continue unrelated useful work where possible.

## Example: an empty repository

> I found no application files or product brief. I can establish the agent
> structure, but the architecture depends on what this system should achieve.
> I recommend defining the first useful outcome before selecting a stack.
>
> Which starting point should we use?
>
> A. **Describe the first useful outcome (recommended):** gives the design a
> concrete target without needing a complete specification.
> B. **Use an existing brief:** point me to it and I will extract decisions and gaps.
> C. **Prepare the environment only for now:** keep product choices explicitly open.

Use the response to identify the next material question. Do not immediately ask
about every language, database, deployment platform and test framework.

## Example: code conflicts with an accepted decision

> `src/storage/` currently uses SQLite, while `docs/adr/0012-persistence.md`
> accepts PostgreSQL. I cannot tell whether the code is a temporary prototype
> or whether the intended design changed. Choosing incorrectly would either
> erase an architectural requirement or leave misleading documentation.
>
> A. **Keep PostgreSQL as the target (recommended):** retain the accepted decision
> and record the implementation gap until there is evidence it was replaced.
> B. **Adopt SQLite:** update the current design through a new superseding decision.
> C. **Defer this decision:** flag the conflict and continue independent repairs.
>
> Which interpretation should govern this repository?

## Example: task authority

> The repository has `TASKS.md`, and the contributor guide says delivery status
> lives in GitHub Issues. Several states disagree. I recommend treating Issues
> as authoritative because the guide explicitly assigns it that role, with
> local files retained only as execution plans.
>
> Should Issues remain the task authority, should repository records replace it,
> or should I leave this conflict pending while repairing the other guidance?

If the user already specified the authority, do not ask; act on that instruction.

## Example: compatibility ambiguity

> The repository contains OpenCode configuration, but I cannot identify its major
> version. Current V1 and V2 differ in how the `instructions` setting works.
> Both can use the canonical `AGENTS.md`, so I recommend keeping that portable
> path unless you need a feature requiring a version-specific adapter.
>
> Should I keep the portable setup, target V1, or target V2?

Ask this only if the distinction changes the work. If canonical files meet the
request without version-specific configuration, make that reversible choice.

## Avoid these questions

- "May I inspect the repository?" when setup or repair already authorizes it.
- "What should the architecture folder be called?" when there is no material constraint.
- "Should I add tests, docs, tasks, rules, skills and CI?" as an overloaded bundle.
- "Can I proceed?" after a plan when all proposed work is already authorized.
- A repeated question answered by the user, repository or a previous investigation.

When an action truly needs permission, follow the host's permission mechanism
and explain the concrete action and why existing authority does not cover it.
Do not use optional-preference question tools to bypass an approval boundary.

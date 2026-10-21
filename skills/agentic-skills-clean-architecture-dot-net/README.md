# agentic-skills · Clean Architecture for .NET

Version **1.0.1** · Licence **CC0-1.0**

Choose and record .NET architecture decisions, audit existing codebases and carry
out authorized refactors. The skill explains each decision, offers practical
options, recommends one with reasons and asks one question at a time. Accepted
choices become scoped project rules through `AGENTS.md` and existing decision records.

It covers solution organization, module and data ownership, dependency direction,
DRY, all five SOLID principles, persistence, lifetime, messaging and pattern tradeoffs.
It compares Clean Architecture, vertical slices, modular monoliths and services
against the project's needs. It does not impose a template or require extra packages.

## Install and use

Copy the entire `agentic-skills-clean-architecture-dot-net` folder into your host's
documented skill directory. Keep its references and license together. Discovery
and invocation depend on the host; explicit file loading also works.

```text
Use $agentic-skills-clean-architecture-dot-net to inspect this .NET solution.
Guide architecture decisions one question at a time and save accepted choices
as project guardrails in AGENTS.md. Do not refactor code yet.
```

```text
Use $agentic-skills-clean-architecture-dot-net to audit this codebase for
architectural drift, unclear ownership, DRY and SOLID problems. Keep files unchanged.
Report evidence and decision gaps, then ask the most important unresolved question.
```

```text
Use $agentic-skills-clean-architecture-dot-net to implement the accepted
Reservation ownership refactor. Preserve API and worker behavior and verify
the agreed boundaries. Follow existing project rules and migration constraints.
```

## Resources and evidence

Read [SKILL.md](SKILL.md) for the workflow, [worked cases](examples/worked-cases.md)
for its decision style and [sources](SOURCES.md) for the research and its limits.
The [decision](assets/decision-template.md) and [rule](assets/agents-rule-template.md)
templates adapt to a consuming project's existing structure.

The package is self-contained and needs no runtime, helper script or paid service.
Clean Code for C#/.NET can complement it for source readability and implementation
contracts; Development Planning can help with a wider feature plan. Neither is
required, and this skill does not replace their distinct responsibilities.

[Evaluation scenarios](evals/scenarios.json) define behavior to test. The
[validation record](VALIDATION.md) separates actual checks from unexecuted scenarios
and host discovery. Instructions guide an agent; they do not enforce a merge or
prove that an architecture is correct. This is a new package with no legacy alias.

# agentic-skills · Agentic Codebase

Version **2.0.0** · Licence **CC0-1.0**

Audit and maintain repository guidance, decisions, task routes and agent adapters.

## Installation and use

Install this entire folder under the exact name `agentic-skills-agentic-codebase` in your host's documented
skill directory. Keep references, assets, helpers, licence and examples together.
Do not install both the old and new copies; machine names and paths changed in 2.0.0.
Skill discovery and invocation syntax depend on the host; confirm the package is
listed, then use its picker or `$` invocation.

```text
Use $agentic-skills-agentic-codebase to inspect this repository and maintain its agent guidance without changing unrelated application behavior.
```

Read [SKILL.md](SKILL.md) for the workflow and routed resources. Optional helper
requirements are stated there; Markdown guidance does not require a runtime service.
Use only tools actually available and authorized by the consuming project.

## Scope and verification

Suitable starting task: Audit this repository’s agent guidance without edits.
An unrelated task that should not activate this skill: Translate this paragraph into French.

[Behavioural scenarios](evals/scenarios.json) are defined, not completed model
benchmarks. Read [evaluation guide](evals/README.md) before testing the skill. Library
structure and helper tests do not establish live host discovery, domain certification,
visual quality or target-engine compatibility. Preserve original source-review dates;
new branding is not evidence that every domain source was refreshed.

## Release changes

2.0.0 introduces the `agentic-skills` brand and self-contained distribution. Existing
helper behaviour and legal notices are retained. Planning/UI supporting material was
newly reconstructed where absent; no unavailable original helper/catalogue is claimed.

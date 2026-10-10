# agentic-skills · Game UI and UX

Version **2.0.0** · Licence **CC0-1.0**

Design and verify menus, HUDs and player interface flows across game platforms.

## Installation and use

Install this entire folder under the exact name `agentic-skills-game-ui-ux` in your host's documented
skill directory. Keep references, assets, helpers, licence and examples together.
Do not install both the old and new copies; machine names and paths changed in 2.0.0.
Skill discovery and invocation syntax depend on the host; confirm the package is
listed, then use its picker or `$` invocation.

```text
Use $agentic-skills-game-ui-ux to inspect this game and improve its menus or HUD around the actual player task.
```

Read [SKILL.md](SKILL.md) for the workflow and routed resources. Optional helper
requirements are stated there; Markdown guidance does not require a runtime service.
Use only tools actually available and authorized by the consuming project.

## Scope and verification

Suitable starting task: Review controller navigation and focus return in a pause menu.
An unrelated task that should not activate this skill: Audit crawl directives for an ecommerce website.

[Behavioural scenarios](evals/scenarios.json) are defined, not completed model
benchmarks. Read [evaluation guide](evals/README.md) before testing the skill. Library
structure and helper tests do not establish live host discovery, domain certification,
visual quality or target-engine compatibility. Preserve original source-review dates;
new branding is not evidence that every domain source was refreshed.

## Release changes

2.0.0 introduces the `agentic-skills` brand and self-contained distribution. Existing
helper behaviour and legal notices are retained. Planning/UI supporting material was
newly reconstructed where absent; no unavailable original helper/catalogue is claimed.

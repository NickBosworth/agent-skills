# agentic-skills

A public library of eight self-contained skills for repository guidance, engineering
planning, documentation, SEO, web/player interfaces, voxel games and SVG work.
Packages contain original guidance, routed resources, synthetic examples and relevant
helpers. They are guidance rather than an autonomous security or correctness guarantee.

## Choose a skill

| Skill | Use it for |
| --- | --- |
| [agentic-skills-agentic-codebase](skills/agentic-skills-agentic-codebase/README.md) | Audit and maintain repository guidance, decisions, task routes and agent adapters. |
| [agentic-skills-development-planning](skills/agentic-skills-development-planning/README.md) | Turn rough requirements into a concrete plan with explicit compatibility and delivery decisions. |
| [agentic-skills-game-ui-ux](skills/agentic-skills-game-ui-ux/README.md) | Design and verify menus, HUDs and player interface flows across game platforms. |
| [agentic-skills-professional-code-comments](skills/agentic-skills-professional-code-comments/README.md) | Generate or repair meaningful comments and API documentation without inventing rationale. |
| [agentic-skills-seo-expert](skills/agentic-skills-seo-expert/README.md) | Audit technical search discovery, content intent and measurement for Google and Bing. |
| [agentic-skills-svg-art-and-animation](skills/agentic-skills-svg-art-and-animation/README.md) | Create and repair editable SVG geometry and motion for the actual delivery target. |
| [agentic-skills-voxel-game-dev](skills/agentic-skills-voxel-game-dev/README.md) | Build voxel game systems with explicit coordinates, lifecycle, persistence and performance contracts. |
| [agentic-skills-web-ui-craft](skills/agentic-skills-web-ui-craft/README.md) | Design and repair web interfaces with contextual visual and interaction evidence. |

## Install

Select a package and copy its entire folder into your host's documented skill location,
keeping the folder/name unchanged. Confirm it appears in that host's skill picker.
A host that can read files but does not discover skills can explicitly read SKILL.md
and its routed references; that manual route is not native compatibility certification.

From a checkout, an installer that supports local paths can list/select packages:

```sh
npx skills add . --list
npx skills add . --skill agentic-skills-seo-expert
```

The installer is optional and may contact its registry; inspect its current behaviour
and select the intended agent. Manual copying requires no installer. Public remote
installation uses this repository's URL from GitHub and the same `--skill` selection.
[Skills installer documentation](https://github.com/vercel-labs/skills).

Example invocation: `Use $agentic-skills-seo-expert to audit these supplied snapshots
and report coverage, evidence and remaining live checks.` Your host controls syntax.

## Quality and support

All packages are version 2.0.0 and have consistent names, licences, UI metadata and
behavioural scenarios. Helper checks, package checks and declared agent scenarios are
distinct. See [verification](docs/verification.md) for actual results and limits;
no cross-model or universal host compatibility is claimed.

Use [migration](docs/migration.md) when replacing an old installation. For overlapping
tasks, read [selection and evaluation](docs/evaluations.md). Avoid duplicate old/new
copies. Source dates are evidence snapshots, not guarantees of current API behaviour.

## Maintain and contribute

Read [AGENTS.md](AGENTS.md), [contributing](CONTRIBUTING.md), [engineering](docs/engineering.md)
and [public repository policy](docs/public-repository-policy.md). Run the documented
checks before commits/releases. Report vulnerabilities privately; see [security](SECURITY.md).

Original repository material is CC0-1.0 unless stated otherwise. The SVG package is
MIT and retains its notice. Each package includes its licence for independent copying.
Third-party documentation, trademarks and required attribution remain with their owners.

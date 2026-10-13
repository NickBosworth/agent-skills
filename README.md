# agentic-skills

Ten self-contained Agent Skills for maintaining repositories, planning changes,
writing documentation and copy, maintaining C#/.NET code, auditing SEO, designing
web and game interfaces, building voxel games, and creating SVG art and animation.

Each package includes its instructions, supporting resources, synthetic examples
and any relevant helpers. Skills guide an agent's work; they do not guarantee
security or correctness.

## Choose a skill

| Skill | Use it for |
| --- | --- |
| [agentic-skills-agentic-codebase](skills/agentic-skills-agentic-codebase/README.md) | Audit and maintain repository guidance, decisions, task routes and agent adapters. |
| [agentic-skills-awesome-copy](skills/agentic-skills-awesome-copy/README.md) | Write and edit natural, specific titles and copy while preserving voice, facts and reader intent. |
| [agentic-skills-clean-code-dot-net](skills/agentic-skills-clean-code-dot-net/README.md) | Implement and review readable C# with preserved contracts, useful XML docs and verified quality gates. |
| [agentic-skills-development-planning](skills/agentic-skills-development-planning/README.md) | Turn rough requirements into a concrete plan with explicit compatibility and delivery decisions. |
| [agentic-skills-game-ui-ux](skills/agentic-skills-game-ui-ux/README.md) | Design and verify menus, HUDs and player interface flows across game platforms. |
| [agentic-skills-professional-code-comments](skills/agentic-skills-professional-code-comments/README.md) | Generate or repair meaningful comments and API documentation without inventing rationale. |
| [agentic-skills-seo-expert](skills/agentic-skills-seo-expert/README.md) | Audit technical search discovery, content intent and measurement for Google and Bing. |
| [agentic-skills-svg-art-and-animation](skills/agentic-skills-svg-art-and-animation/README.md) | Create and repair editable SVG geometry and motion for the actual delivery target. |
| [agentic-skills-voxel-game-dev](skills/agentic-skills-voxel-game-dev/README.md) | Build voxel game systems with explicit coordinates, lifecycle, persistence and performance contracts. |
| [agentic-skills-web-ui-craft](skills/agentic-skills-web-ui-craft/README.md) | Design and repair web interfaces with contextual visual and interaction evidence. |

## Install

Choose a skill above and copy its entire folder into your agent host's documented
skill directory. Keep the folder name unchanged and confirm that the skill appears
in the host's picker.

If your host can read files but cannot discover skills, ask it to read `SKILL.md`
and the supporting references directly. This manual route does not establish native
skill support in that host.

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

Find package versions in the [catalogue](catalog.json) and completed checks in
[verification](docs/verification.md). Every package includes a licence, host UI
metadata and behavioural test scenarios. Package validation and helper tests check
structure and code; scenario definitions describe agent behaviour to test. They do
not establish compatibility across models or hosts.

Use [migration](docs/migration.md) when replacing an old installation. For overlapping
tasks, read [selection and evaluation](docs/evaluations.md). Avoid duplicate old/new
copies. Source dates are evidence snapshots, not guarantees of current API behaviour.

## Executable products

[SEO Workbench](products/seo-workbench/README.md) is a separately versioned local SEO
analysis application. Try its development preview on a fictional site to crawl
pages, inspect saved evidence, make a fixture repair and compare the results. Use
it through the command line, local browser interface or MCP, and export reports.
It has its own optional Node dependencies and MIT software licence; it is not a skill
package and is not included in skill-only release archives. Development is still
in progress; see its
[capabilities](products/seo-workbench/docs/capabilities.md) and
[verification record](products/seo-workbench/docs/verification.md).

## Maintain and contribute

Read [AGENTS.md](AGENTS.md), [contributing](CONTRIBUTING.md), [engineering](docs/engineering.md)
and [public repository policy](docs/public-repository-policy.md). Run the documented
checks before commits/releases. Report vulnerabilities privately; see [security](SECURITY.md).

Original repository material is CC0-1.0 unless stated otherwise. The SVG package and SEO Workbench runtime are
MIT and retain their notices. Each package includes its licence for independent copying.
Third-party documentation, trademarks and required attribution remain with their owners.

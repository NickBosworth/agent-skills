# Web UI Craft

**A research-grounded agent skill for avoiding and repairing AI-generated web UI mistakes without imposing a house style.**

Version **1.0.0** · Research checked **10 October 2026** · Original content licensed **CC0-1.0**

## Start here

Install the entire `web-ui-craft` folder, not only SKILL.md. The concise core loads focused references as needed. The package includes 96 diagnostic entries across eight families, each with a signal, user cost, repair, verification method and qualification; 50 source records; product profiles; working templates; 18 copyable prompts; eight worked examples; 18 evaluation scenarios; and optional helpers with regression tests.

The goal is not to detect whether AI wrote a website. It is to produce a suitable, specific, coherent and working interface, with honest evidence. Common fonts, Tailwind, shadcn/ui, cards, gradients, expressive art direction and dense tables are not automatically faults.

### Installation

Copy the folder to one of the following documented project locations, choosing the host you actually use:

| Host | Project destination | Personal destination |
|---|---|---|
| OpenCode | `.opencode/skills/web-ui-craft/` | `~/.config/opencode/skills/web-ui-craft/` |
| Codex | `.agents/skills/web-ui-craft/` | `~/.agents/skills/web-ui-craft/` |
| Claude Code | `.claude/skills/web-ui-craft/` | `~/.claude/skills/web-ui-craft/` |

These locations were checked against official host documentation on the research date [S40–S42]. Host versions, policy and local discovery can differ; confirm the skill is listed or that the agent can read SKILL.md. Avoid conflicting duplicate installations. No host-specific hooks or automatic permissions are included.

For another Agent Skills-compatible harness, use its documented discovery location. If the harness does not discover skills, explicitly ask it to read SKILL.md and follow the relevant linked references. The model server alone does not necessarily provide filesystem access, skill discovery or a browser; those are harness capabilities.

### First prompt

> Use the web-ui-craft skill to inspect and improve this interface. Understand the existing product, business rules and design conventions first. Preserve its identity and working behavior. Identify and fix the highest-impact AI UI smells, complete relevant interaction states, and verify the rendered result with realistic content. Ask consequential questions one at a time. Report completed checks and anything that remains unverified.

For a report without edits, say **audit only; do not change files**. For a supplied approved design, say **preserve the reference direction rather than proposing a restyle**.

## How it works

The agent inspects the product, resolves meaningful uncertainties, chooses an appropriate product profile and direction, specifies behavior, implements a complete representative slice, reviews separate quality dimensions, and delivers evidence with clear limitations.

[Read the core skill](SKILL.md) · [Choose an example prompt](examples/prompts.md) · [See worked repairs](examples/worked-examples.md) · [Review research boundaries](references/research-notes.md)

## Package map

```text
web-ui-craft/
  SKILL.md                  Compact workflow and routing
  README.md                 Installation and use
  LICENSE.txt               CC0 dedication for original material
  VALIDATION.md             What was actually checked
  references/               Focused guidance, eight smell families, sources
  assets/smell-catalog.json  Machine-readable diagnostic catalogue
  assets/templates/         Brief, states, audit, evidence, exceptions, review JSON
  examples/                 18 prompts and eight worked examples
  evals/                    Fresh-agent evaluation protocol and 18 scenarios
  scripts/                  Catalogue, review record, local browser, package checks
  tests/                    Helper regression tests and browser smoke fixture
  checksums.json            Delivery file integrity manifest
```

## Optional helper commands

From this folder:

```sh
python scripts/catalog.py --category visual
python scripts/review_gate.py assets/templates/review.json
python scripts/validate_package.py --checksums
python -m unittest discover -s tests -v
```

The unfilled review template intentionally returns INCOMPLETE. The core skill works without these tools. The browser helper requires optional Playwright and Chromium; [tooling notes](references/tooling.md) explain dependencies, sandbox safety and precise limits.

## Quality and evidence boundaries

“AAA-grade” is an ambition for professional craft, not a measurable universal label, a guarantee of output quality or a WCAG AAA certification. The accessibility guidance uses correctly scoped standards; a selected review is not a complete conformance assessment.

The review gate checks declarations, not their truth. The browser probe captures observations, not aesthetic judgments. Unit tests verify the helpers; they are not fresh-agent trials. See [delivery validation](VALIDATION.md) for performed checks and [evaluation protocol](evals/README.md) for testing skill effectiveness with your own model and harness.

## Licensing and attribution

Original instructions, examples, catalogue, templates and helper code are dedicated under CC0-1.0. Third-party sources remain under their own terms; no commercial research corpus, upstream skill text, screenshots or fonts are redistributed. [Source register](references/source-register.md) provides URLs, source classes and scope notes.

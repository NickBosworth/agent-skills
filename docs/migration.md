# Migration to agentic-skills 2.0.0

Version 2.0.0 adopted the `agentic-skills` brand on 2026-10-10. Package folders,
frontmatter names, examples and adapter prompts use the `agentic-skills-` prefix.
Install the complete replacement package, check any customizations in your old copy,
then remove that old copy.
No automatic modification of personal/global skill installations is performed.
Do not distribute duplicate legacy skills as aliases; they can activate ambiguously.

| Previous folder | Previous invocation | Canonical folder and invocation |
| --- | --- | --- |
| `game/voxel-game-dev` | `$voxel-game-dev` | `skills/agentic-skills-voxel-game-dev` / `$agentic-skills-voxel-game-dev` |
| `game/game-ui-ux` | `$game-ui-ux` | `skills/agentic-skills-game-ui-ux` / `$agentic-skills-game-ui-ux` |
| `agentic/agentic-codebase` | `$agentic-codebase` | `skills/agentic-skills-agentic-codebase` / `$agentic-skills-agentic-codebase` |
| `code/slop-proof-web-ui` | `$web-ui-craft` | `skills/agentic-skills-web-ui-craft` / `$agentic-skills-web-ui-craft` |
| `code/professional-code-comments` | `$professional-code-comments` | Retired; use `skills/agentic-skills-clean-code-dot-net` / `$agentic-skills-clean-code-dot-net` for C#/.NET |
| `code/development-planning` | `$development-planning` | `skills/agentic-skills-development-planning` / `$agentic-skills-development-planning` |
| `code/seo-expert` | `$seo-expert` | `skills/agentic-skills-seo-expert` / `$agentic-skills-seo-expert` |
| `svg/svg-art-and-animation` | `$svg-art-and-animation` | `skills/agentic-skills-svg-art-and-animation` / `$agentic-skills-svg-art-and-animation` |

This is a breaking identity/layout release. Existing project copies remain on old
names until migrated deliberately. The package licence is preserved, including the
SVG package's MIT exception. The original resource counts and helper claims of the
incomplete planning/UI packages have been superseded by newly authored supporting
material and an honest scope description.

History sanitization changes previous commit IDs. Fresh clones should be used after
the rewrite; do not merge or push old history back. Public forks/downloads are outside
the maintainer's direct control. No old private values are retained in this guide.

## Later additions

`skills/agentic-skills-awesome-copy` was added on 2026-10-12 at version 1.0.0.
Invoke it as `$agentic-skills-awesome-copy`. It is a new, independently versioned
package with no previous folder, invocation or alias; existing 2.0.0 packages do
not require migration for this addition.

`skills/agentic-skills-clean-code-dot-net` was added on 2026-10-13 at version 1.0.0.
Invoke it as `$agentic-skills-clean-code-dot-net`. This new package has no previous
name, folder or alias; existing packages need no migration. Its templates apply
only through explicit scoped adoption in a consuming C# repository.

Version 1.3.0 retains the package name, layout and default VSTest verifier calls.
SDK 10 native MTP consumers may select --test-platform mtp-native after verifying
their effective global.json and installed TRX extension. Unsupported command modes
are reported explicitly; no automatic runner/package migration is performed.
The comparison runner is optional maintenance tooling and requires a fresh private
evidence directory outside the checkout; no global skill installation is needed.

## Retired comments package — 2026-10-14

`agentic-skills-professional-code-comments` is no longer distributed. Remove its
old installation and route C#/.NET comment and contract documentation work to
`agentic-skills-clean-code-dot-net`, which now covers that functionality. This is
a scope-specific replacement, not an alias or a reason to apply C# rules to other
languages; follow those repositories' own documentation policies and toolchains.
No personal/global installation is changed automatically. The current library
contains nine packages.

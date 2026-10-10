# Migration to agentic-skills 2.0.0

The user selected this brand on 2026-10-10. All folders, frontmatter names, examples
and adapter prompts now use the same `agentic-skills-` prefix. Install one complete
new package and remove the old installed copy after checking its local customizations.
No automatic modification of personal/global skill installations is performed.
Do not distribute duplicate legacy skills as aliases; they can activate ambiguously.

| Previous folder | Previous invocation | Canonical folder and invocation |
| --- | --- | --- |
| `game/voxel-game-dev` | `$voxel-game-dev` | `skills/agentic-skills-voxel-game-dev` / `$agentic-skills-voxel-game-dev` |
| `game/game-ui-ux` | `$game-ui-ux` | `skills/agentic-skills-game-ui-ux` / `$agentic-skills-game-ui-ux` |
| `agentic/agentic-codebase` | `$agentic-codebase` | `skills/agentic-skills-agentic-codebase` / `$agentic-skills-agentic-codebase` |
| `code/slop-proof-web-ui` | `$web-ui-craft` | `skills/agentic-skills-web-ui-craft` / `$agentic-skills-web-ui-craft` |
| `code/professional-code-comments` | `$professional-code-comments` | `skills/agentic-skills-professional-code-comments` / `$agentic-skills-professional-code-comments` |
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

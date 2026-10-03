# SVG art and animation

**Version 1.0.0 · 2 October 2026**

A portable agent skill for creating, carefully editing and animating SVG. It includes a concise `SKILL.md`, task-specific references, original examples, a read-only checker, optional timed browser capture, and regression tests. It is designed for OpenCode, Codex and Claude Code-style skill discovery, without requiring an MCP server or paid service.

The skill tells an agent to choose the delivery target, preserve existing geometry and IDs, build intentional motion, and verify actual output. It distinguishes a browser animation from an engine-ready component asset. It also tells a text-only model to report visual review as pending rather than pretend it has seen screenshots.

## Install: OpenCode on Windows

Extract `svg-art-and-animation.zip`, then copy the **entire inner folder** named `svg-art-and-animation` into:

```text
%USERPROFILE%\.config\opencode\skills\
```

The final entry point should be:

```text
%USERPROFILE%\.config\opencode\skills\svg-art-and-animation\SKILL.md
```

Do not copy only `SKILL.md`: the relative reference, script and asset paths need the supporting files. Do not add an extra nested `svg-art-and-animation` directory. No MCP installation or automatic permission changes are included. The normal skill/tool permissions in your agent still apply.

Optional PowerShell copy command, run from the directory containing the extracted folder:

```powershell
$source = (Resolve-Path ".\svg-art-and-animation").Path
$destination = Join-Path $HOME ".config\opencode\skills\svg-art-and-animation"
if (Test-Path $destination) { throw "Destination already exists. Back it up and review the update first." }
New-Item -ItemType Directory -Path (Split-Path $destination) -Force | Out-Null
Copy-Item -LiteralPath $source -Destination $destination -Recurse
```

Start a new OpenCode session, or restart the app if the new skill is not listed. Check the skill name, exact `SKILL.md` spelling and permissions if discovery fails. Avoid installing duplicate copies with the same name in multiple discovered locations. See the official discovery documentation in [SOURCES.md](SOURCES.md), S1–S3.

## Other install locations

Every path below is a **parent directory**; place the whole `svg-art-and-animation` folder inside it.

| Agent / scope | Parent directory |
| --- | --- |
| OpenCode, project | `.opencode/skills/` |
| OpenCode, user | `~/.config/opencode/skills/` |
| Codex, project | `.agents/skills/` |
| Codex, user | `~/.agents/skills/` |
| Claude Code, project | `.claude/skills/` |
| Claude Code, user | `~/.claude/skills/` |

OpenCode also documents `.agents/skills/` discovery, so a single shared location can suit an OpenCode/Codex setup. Verify the versions and policies of your installed clients. The package format and paths were checked against official documentation; live skill discovery inside those apps was not tested in this build environment.

## Use it

Ask your agent directly:

> Use the svg-art-and-animation skill to create a self-contained animated SVG. Keep it editable, choose an appropriate animation method, provide a meaningful reduced-motion state, and verify intermediate frames before delivery.

For an existing file:

> Use svg-art-and-animation to improve the motion in this SVG. Preserve the viewBox, existing artwork, IDs and external integration hooks. Inspect the baseline first, make the smallest necessary changes, and show the checks and frames you actually verified.

For an engine asset:

> Use svg-art-and-animation to prepare this asset for our Godot project. Read the existing project conventions first. Keep SVG as editable source, define component pivots and anchors, and use engine-native animation rather than assuming CSS or SMIL imports as an engine rig.

No special model training is involved. Instructions are useful without the helper scripts; the agent still needs the tools and capabilities required for the task.

## Optional tools

The core skill has **no mandatory package dependencies**. `audit_svg.py` needs Python 3.10+ and only its standard library. `render_svg.py` additionally needs Playwright and an installed browser. The included JavaScript controller example has no external dependencies.

### Set up browser capture on Windows

From inside the installed or extracted skill folder:

```powershell
py -3 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-render.txt
.\.venv\Scripts\python.exe -m playwright install chromium
```

This installs packages and a browser locally; it does not register an MCP server or change agent configuration. Network access is needed for setup, not for ordinary self-contained capture afterwards. Use an existing approved project environment instead when appropriate. The dependency range may select a newer version than the tested build; rerun the tests after updates.

On macOS/Linux, the equivalent environment interpreter is `.venv/bin/python`, created with `python3 -m venv .venv`.

### Check a file

From the skill folder, with Python available:

```text
python scripts/audit_svg.py assets/css-status.svg --profile web
python scripts/audit_svg.py assets/component-gate.svg --profile godot
python scripts/audit_svg.py path/to/edited.svg --baseline path/to/original.svg --json
```

On Windows, `py -3` can replace `python`, or use the explicit virtual-environment interpreter. When invoking tools from a project, use an absolute path to the skill's script; do not assume the current directory is the skill folder.

### Capture example animation frames

The following commands are shown from the skill folder. Choose output paths outside the installed skill, in a project or working directory, and use a new/empty directory for each run:

```text
python scripts/render_svg.py assets/css-status.svg --out ../status-review --times 0,0.2,0.4,0.7,1.2 --reviewed
python scripts/render_svg.py assets/css-status.svg --out ../status-reduced-review --times 0,0.2,0.7 --reduced-motion --reviewed
python scripts/render_svg.py assets/smil-morph.svg --out ../morph-review --frames 12 --duration 2.4 --reviewed
```

Use the virtual-environment interpreter for these commands when Playwright was installed there. Each capture produces PNG frames, `gallery.html` and a JSON manifest with hashes, timestamps, environment details and sampled state. Open the gallery or PNGs to inspect them. An SVG's actual CSS/SMIL is sampled; the renderer does not invent the reduced-motion fallback or automatically declare visual quality.

`--reviewed` is an explicit acknowledgement that you have reviewed the source. The helper refuses common unsafe/dependent constructs, but it is **not a sanitizer or a hardened hostile-upload service**. It is intentionally limited to isolated inline SVG; arbitrary HTML, event-driven JavaScript, remote resources, image embedding and Godot playback need their own test workflow.

See [verification.md](references/verification.md) for full options and caveats.

## What is included

```text
svg-art-and-animation/
  SKILL.md                         Agent entry point; supporting material loaded as needed
  README.md                        Installation and quick start
  SOURCES.md                       Primary documentation and source-of-truth boundaries
  requirements-render.txt          Optional Playwright dependency
  references/                      Targets, structure, animation, web, game, safety and verification
  assets/                          SVG examples, WAAPI example and planning/review templates
  scripts/audit_svg.py              Read-only policy and reference checker
  scripts/render_svg.py             Timed browser capture and review gallery
  tests/test_*.py                   Dependency-free regression tests
  tests/browser_checks.py          Optional browser integration checks
  tests/SCENARIOS.md                Agent-level behavioural evaluation prompts
  tests/RESULTS.md                  Actual release test results and limits
  tests/evidence/                  Test logs and inspected example contact sheet
  LICENSE                          MIT licence for this original package
  SHA256SUMS.txt                    Integrity hashes for packaged files except this hash list
```

## Verification status and limitations

The release was tested with **45 dependency-free tests and 8 Chromium integration tests**, plus JavaScript syntax checking and manual inspection of representative CSS/SMIL frames. Full details and the actual environment are in [tests/RESULTS.md](tests/RESULTS.md).

This is an original, tested starting package, not a claim that the skill has been benchmarked across every LLM, browser or engine. Native Windows execution, live agent-app discovery, Firefox/WebKit, actual Godot import and representative production asset libraries were not tested here. The agent-level scenario suite is supplied but has not been run across models.

## Updating or removing it

Keep your project-specific conventions in the project, or in a clearly maintained local adaptation. Back up custom changes before replacing the installed folder. To uninstall, remove the exact installed `svg-art-and-animation` folder; there is no service, plugin registration or background job to remove.

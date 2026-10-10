# Contributing to agentic-skills

Read AGENTS.md and the public repository policy before preparing a contribution.
Contribute only original or appropriately licensed, public-safe material. All
packages use CC0-1.0 except the SVG package, which retains MIT. Do not paste
third-party manuals, private exports or real credentials into examples.

## Development

Use Python 3.10+ and install `requirements-dev.txt` in an isolated environment:

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements-dev.txt
```

Activate that environment when running the `python` commands below; the commit
hook detects `.venv/bin/python` directly, and never commits the ignored environment.
Run `python tools/run_checks.py` from the repository root. The runner checks all
packages with the official skills-ref validator and runs each helper test suite
in its own process to avoid module-name collisions. Gitleaks 8.30.1 is the
independent credential scanner used in CI; scan with redaction enabled.

Keep skill names and folders prefixed `agentic-skills-`. Update catalogue entries,
UI prompts, references, scenarios and migration notes when changing discovery.
Breaking name/layout changes increment the major version. Package content changes
need a changelog entry and the appropriate version bump. Preserve historical
verification reports as explicitly historical; never update dates to imply retesting.

Before review, add meaningful positive, negative and failure cases for changed
helper behaviour. Extend agent scenarios for changed decision-making and preserve
their unexecuted status until a real host/model run supplies evidence. Do not force
an extra dependency or helper into a prose-only package.

## Safe commits

Stage explicit intended paths. Run `python tools/check_library.py --staged` against
the actual index and inspect `git diff --cached --stat` and the diff. Use the
anonymous project contributor name with its reserved email or a GitHub noreply email; keep private names/contact
details out of commit messages. Run `--history` and redacted Gitleaks before pushing.

The commit guard was enabled locally during the authorized public-repository
hardening. Fresh clones can opt into the same guard explicitly:

```sh
git config --local core.hooksPath .githooks
```

The commit hook checks staged bytes, effective Git identities and the staged patch,
not just the working copy. The push hook checks the library, reachable history and
Gitleaks before publication. Hooks use the ignored local environment when present;
missing tools fail closed. Hooks can be bypassed and do not replace review or CI.

## Releases

Run `python tools/release.py --out /path/to/releases/agentic-skills.zip` after all
changes pass. Output must be outside the checkout; existing outputs are refused.
The archive contains package files only, with a generated SHA-256 inventory.
The release builder extracts it into a temporary directory and validates every
package there before declaring success. It does not publish or create a Git tag.
Use a reviewed immutable tag for public release publication; state actual tested
hosts and remaining unknowns. Repository badges must reflect real CI results.

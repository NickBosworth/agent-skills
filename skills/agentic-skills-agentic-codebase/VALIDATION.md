# Validation of Agentic Codebase 2.1.0

Executed on **2026-10-18**, macOS arm64, Python **3.12.11** and **3.10.19**.
Structural helpers, reviewed explicit-path trials and native discovery are separate
evidence categories. Package 2.1.0 ships helper 1.1.0; target schema 1 and standard
1.0.0 remain unchanged. Names, existing paths and CLI commands are retained.

## Executed local checks

- The focused helper suite discovered **46 tests: 45 passed, one Windows-only
  junction test skipped**, on both Python versions. The original 33 tests remain.
  Five added regression methods failed on the original implementation for the
  intended registry, version-write, inventory, provenance and exception behavior.
- Added executions cover nested duplicate JSON, nonfinite/overflow/underflow input,
  unchanged rejected writes, configuration paths without body disclosure, both
  adapter host-field spellings, supporting-resource drift, a competing process
  under a live review lock, replace/sync failures and changed inputs/files.
- `python tools/run_checks.py` passed all **nine official skill validators** and
  discovered **288 tests: 271 passed, 17 skipped**. Skips were the Windows junction
  test and 16 optional .NET/SDK tests. This was the ordinary library run, not an
  application, browser, engine or optional SDK execution.
- Skill Creator validation, candidate-file structure/privacy, staged privacy,
  reachable-history privacy and whitespace checks passed. The index was unchanged;
  staged scanning does not cover these unstaged edits. Candidate checks cover them.
- Redacted Gitleaks history and package-directory scans passed. These and the
  heuristic checker do not prove absence of every private value.
- Temporary package-only packaging passed CRC, SHA-256 inventory and fresh-extraction
  validation. The extracted skill independently passed the same 45 helper tests
  with its Windows test skipped. No release binary was retained in source.
- Reviewed changed code, templates, references, public summaries and catalogue/CI
  integration. The engineering role's evidence was refreshed only for the actual
  affected source review; unrelated product review evidence was not refreshed.

## Behavioral evidence

Six fresh-context agents completed three paired tasks against a frozen prior skill
and candidate: compact setup, renamed-command maintenance and constraint-preserving
migration. Primary-agent review inspected actual artifacts and claims, independently
ran structural checks on all six outputs and reran both command fixtures. Both arms
passed; the comparison **tied**. A seventh continuation repeated candidate maintenance
without changing any file bytes or modification times.

See [results and protocol limits](evals/results.md) and [sanitized records](evals/trials.json).
These near-transfer observations cover explicit skill use, useful completion and
preservation on selected tasks. They do not prove superiority or broad reliability.
The twenty-scenario catalogue has partial coverage; the other nine raw cases and
broader scenarios were not executed. Final helper refinements after the frozen
trial snapshot received local regressions, not a renewed model comparison.

## Structural baseline and remaining warnings

The repository structural audit has no errors. Nine skill-frontmatter warnings and
one task-frontmatter warning are retained because the bounded parser does not certify
full YAML. Official validation accepts the packages; no valid metadata was weakened.
An existing changed-evidence warning for product guidance remains outside this task.
Raw scan roots and filenames stay private until reviewed for publication.

## Limits

The standalone executor launcher could not start its installed executable; no
replacement was installed. Independent skill-creator forward tests used synthetic
workspaces. Exact model identity, per-run usage and complete access trajectories
were not exposed; unknown values remain unknown in the results.

Focused Linux/Python 3.10, macOS/Python 3.14 and Windows/Python 3.14 CI jobs are
defined, not observed passing. Python 3.14 was unavailable locally. Windows reparse
handling has a platform-specific regression awaiting Windows execution. Native host
discovery, other models/hosts, remote CI, product runtime and broader security or
domain certification remain unverified. The helper does not replace OS isolation
against an adversary concurrently swapping path ancestors.

No dependency installation, global skill/configuration change, commit, push, release
publication or production operation was performed. Repeat focused tests for helper
changes and affected raw cases for substantive workflow changes; refresh host claims
against current primary sources and actual diagnostics when that host is available.

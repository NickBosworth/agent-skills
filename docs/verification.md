# Verification of agentic-skills

The historical 2.0.0 checkpoint below was executed on 2026-10-10 using macOS and
Python 3.11.14/3.12.11. Source review at that checkpoint was structural across the
library and targeted semantic review of changed workflows,
publication boundaries and source/code relationships, not exhaustive domain certification.

## Executed checks

- Official skills-ref 0.1.1 accepted all eight branded packages.
- Full library gate checked real YAML, catalogue/version/licence consistency, adapters,
  local package references, JSON/Python syntax, public-safe candidate bytes and manifests.
- The original five helper suites passed: 33 agentic, 12 comments, 81 SEO, 31 voxel,
  and 45 SVG checks (202 total).
- Added publication regression suite: 27 checks, including staged/worktree divergence,
  effective Git identity, annotated tags, repository links, historical deletions, privacy-safe reporting, metadata PNG
  rejection, YAML duplicate keys, reference escapes, checksums and release boundaries.
- Added game contrast suite: five checks for numeric, parser and CLI boundaries.
- Standard-library total: **234 tests passed** in the isolated package runner on
  both Python 3.11.14 and 3.12.11. The 207 package helper tests also passed on
  Python 3.10.19; maintainer dependencies require Python 3.11+.
- Optional SVG Chromium suite: **eight tests passed** with Playwright 1.63.0 and
  Chrome 154.0.8037.99. CSS/SMIL seeking, reduced motion, repeatability, independent
  WAAPI instances, bounds and cleanup were exercised. JavaScript syntax check passed.
- Four freshly captured SMIL frames (0, 0.6, 1.2 and 2.4 seconds) were opened and
  inspected: expected shape changes, intact outlines and matching loop endpoints.
  The retained contact sheet was also inspected for public-safe synthetic content.
- Skills installer 1.7.2 discovered exactly eight local packages with `--list`;
  no global/personal skill installation was changed.
- Gitleaks 8.30.1 directory scan passed with values redacted.
- The package-only ZIP passed CRC, SHA-256 inventory and fresh-extraction package
  validation. Existing output is refused and no release binary is committed.
- All repository Markdown resource targets resolved; destination-template references
  are intentionally validated by scaffold fixtures rather than package-relative paths.

## History and publication

The user authorized anonymizing author/committer metadata, removing Finder files from
history and updating the public branch. History privacy and credential checks passed after rewriting. The rewritten main
was published with a lease against the inspected remote revision. A fresh public
clone passed package/privacy and reachable-history checks plus redacted Gitleaks.
GitHub Library quality run 38039964927 passed all three jobs: credentials and
packages on Python 3.11 and 3.14. Current publication state is also recorded in
the task record; later documentation commits receive their own checks.

## Limitations and maintenance

The agentic helper's bounded frontmatter parser reports eight unsupported-metadata
warnings for valid nested YAML. Actual YAML parsing and official skills-ref validation
passed for those files; do not weaken valid metadata to silence the lightweight parser.
Core guidance review evidence is recorded separately in .agents/project.json.

At that checkpoint there were 88 defined behavioural scenarios across the packages.
These were not executed host/model benchmarks. Native discovery in individual hosts, Unity/Godot/Unreal runtime,
Firefox/WebKit, production-site SEO, broad assistive-technology testing and every domain
source's freshness remain unverified. Previous 1.0.0 evidence is explicitly historical.

CI targets Linux/Python 3.11 and 3.14; defined jobs are not passing runs until GitHub
executes them. GitHub secret scanning and push protection were observed enabled. Private
vulnerability reporting was enabled and read back successfully. Main branch protection was configured and read back: credentials and package jobs
for Python 3.11/3.14 are required from GitHub Actions, checks must be up to date,
administrators are included, and force pushes/deletion are disabled. Finalized
main run 38040114564 passed all three jobs. Heuristic
privacy checks and Gitleaks cannot detect all PII; manual review remains mandatory.
Existing public forks, downloaded copies and GitHub caches cannot be revoked by a push.

## Awesome Copy 1.0.0 addition — 2026-10-12

Executed on macOS using Python 3.12.11, pinned PyYAML 6.0.3 and skills-ref 0.1.1.
This checkpoint adds a ninth package; it does not rerun or renew the historical
browser, installer, public-clone or CI evidence above.

- Reviewed 14 public primary sources and authored the editorial synthesis, two
  focused guides and 11 synthetic worked examples. Reviewed factual fidelity,
  source limits, routing, standalone references and the final changes manually.
- `python tools/run_checks.py` passed all nine official package validators,
  library checks, the existing 234 regression tests and existing package gates.
  No new helper code was needed for this prose-only skill.
- The skill-creator frontmatter validator accepted the new package. Optional
  tool-availability information lives in its body so both validators accept it.
- `python tools/check_library.py` passed candidate-file privacy and structure;
  `--history` passed reachable-history privacy. `--staged` passed against the
  existing index, which this task did not change; new files were covered by
  candidate-file checks rather than that index scan.
- Redacted Gitleaks passed for reachable Git history and a directory scan of the
  new package. No new binaries or raw research datasets were added.
- The new 28 behavioral scenarios are defined, not executed. The library now has
  116 scenario definitions; neither this count nor the checks establish writing
  quality, reader preference, conversion gains or detector outcomes.

No host/model writing trials, native discovery, rendered copy-fit checks or
reader experiments were run for the new package. No global installation,
commit, push or release publication was performed. Existing SEO Workbench changes
were outside this task's scope; its runtime checks were not rerun here.

## Direct main pushes — 2026-10-12

The user explicitly authorized removing the requirement to run CI before a direct
main push. GitHub's dedicated status-check-protection removal succeeded. A fresh
read of main's protection confirmed no required status checks and no associated
up-to-date requirement. Other protection settings matched the inspected prior
state, including disabled force pushes and branch deletion. No pull request,
signature, branch lock or push restriction is required by that configuration.

CI workflows and local publication hooks remain enabled. CONTRIBUTING.md now
describes direct fast-forward pushes with local privacy checks. This supersedes
the historical required-check workflow recorded above and in TASK-0001; it does
not retroactively alter that checkpoint's evidence. No commit or push was performed
as part of this settings change, so a successful direct push has not been observed.

After the change, all nine official package validators and 234 existing regression
tests passed. The local pre-push hook passed candidate/history privacy and redacted
Gitleaks checks. Staged privacy passed against the unchanged index; documentation
edits were checked as candidates. Whitespace checks passed. No product runtime
checks were rerun for this workflow-only change.

## Public documentation edit — 2026-10-12

Applied Awesome Copy to the repository overview, skill READMEs, contributor and
evaluation guides, documentation indexes and SEO Workbench user guides. Clarified
installation and evidence limits, reduced compressed wording and corrected stale
container and local Lighthouse references. Package patch versions, changelogs and
the existing SEO/SVG checksum inventories were updated. Skill workflows, helper
code, commands, notices and historical verification results were preserved.

- All nine official skill validators and 234 library regression tests passed.
- Final candidate-file structure/privacy and local documentation links passed.
- Staged privacy passed against the unchanged index; editorial changes were checked
  as working-tree candidates, not staged content. Reachable-history privacy and
  redacted Gitleaks history scanning passed.
- Product type/syntax checks and build passed. Its default suite reported 333 tests:
  311 passed and 22 optional browser tests skipped, with no failures. These results
  cover the working tree, including concurrent product work outside this copy edit.
- Compared fenced examples with the base revision; the edited documentation
  retained its code blocks. Whitespace checks passed.

No rendered GitHub review, reader study, host/model benchmark or live integration
check was performed. Agent instructions, templates, legal notices and historical
task/evidence records were outside the editorial scope. No commit, push or release
publication was performed.

## Clean Code for C#/.NET 1.0.0 addition — 2026-10-13

Added the tenth package with mandatory workflows, 27 traceable rules, 54 primary-source
references, mergeable quality assets, 32 worked cases and 42 defined behavioral
scenarios. The scenarios are not executed host/model trials.
[Package evidence](../skills/agentic-skills-clean-code-dot-net/VALIDATION.md)
records exact SDK/compiler/formatter/analyzer versions and enforcement gaps.

- DNC_DOTNET_TESTS=1 .venv/bin/python tools/run_checks.py passed ten official package
  validators and 254 regression tests: 234 existing plus 20 helper/SDK tests.
- The net10.0/C#14 fixtures passed with SDK 10.0.400: compilation/XML,
  formatter idempotence, nine behavioral assertions, 20 diagnostic failure/repair
  cases and actual source-read-only verifier execution in disposable workspaces.
- Creator validation, candidate structure/privacy/links, history privacy and
  redacted Gitleaks history/package-directory scans passed. Staged scanning passed
  against the unchanged index; new files were checked as candidates.
- Temporary package-only release packaging passed CRC, inventory and fresh extraction.
  Manual diff and semantic/contradiction/enforcement review found no known introduced
  defect within the reviewed scope. No new binaries were added.

The optional SDK job is now defined in CI; no remote run is claimed. No native
discovery, host/model benchmark, actual VSTest adapter, rendered API generator,
older/multi-target SDK or production framework integration was executed.
CA2000 did not flag the tested FileStream leak; ownership still requires semantic
review. No product check, global installation, commit, push, release publication
or branch-protection change was performed.

## Clean Code for C#/.NET 1.0.1 fixes — 2026-10-13

Fixed the review's first two recommendations: consistent configuration during
restore/format/build/test and rejection of unsuccessful or inconsistent TRX
summaries. The conditional Release-only SDK regression and zero-exit failed-summary
regression passed. Mixed skip/pass summaries remain permitted.

All ten official validators and 257 regression tests passed with SDK checks selected,
using Python 3.12.11 and SDK 10.0.400. Creator, candidate/staged/history privacy,
redacted Gitleaks and whitespace checks passed within their recorded scopes.
The index was unchanged; edits were checked as candidates. The package now has 44
defined behavioral scenarios, not model evaluations. Exact evidence and remaining
limits are in its validation record. No commit, push or publication was performed.

## Clean Code for C#/.NET 1.1.0 — 2026-10-13

All ten official validators and 264 regressions passed with DNC_DOTNET_TESTS=1
on macOS arm64/Python 3.12.11/SDK 10.0.400. The optional package suite passed all
30 tests: per-project/framework scope, real net8.0/net10.0 xUnit/VSTest pass/fail,
skipped/empty runs, safe output failures and 15 service/async-stream assertions.
Three independent isolated agent trials executed and their patches were reviewed;
behavioral checks were independently rerun. See the package's
[validation](../skills/agentic-skills-clean-code-dot-net/VALIDATION.md) and
[trial results](../skills/agentic-skills-clean-code-dot-net/evals/results.md).
The broader 44-scenario catalogue remains unexecuted. Exact trial model/settings,
other hosts/SDKs/runners, rendered docs and native discovery remain unverified.
Creator, candidate/staged/history privacy and redacted Gitleaks checks passed;
the index remained unchanged and new work was covered as candidate content.
No product runtime check, global install, commit, push or publication occurred.

## Clean Code for C#/.NET 1.1.1 — 2026-10-13

All ten official validators and 270 regressions passed with SDK checks selected
on macOS arm64/Python 3.12.11/SDK 10.0.400. Six added helper regressions cover
ignored-tree pruning, incomplete inventory rejection and actionable private
blockers. Manual review covered all 27 direct rule/source mappings and the new
completion template. The focused helper suite passed again after the final option
error handling edit. Candidate/staged/history privacy, creator and redacted
Gitleaks checks passed in their recorded scopes; the real index was unchanged.
The catalogue now has 46 defined, unexecuted scenarios alongside the three earlier
isolated trials. All original review recommendations are addressed; remote CI,
other hosts/toolchains and broad agent reliability remain unverified. No product
runtime tests, global installation, commit, push or publication occurred.

## Clean Code for C#/.NET 1.2.0 — 2026-10-13

All ten validators and 271 regressions passed with SDK checks selected on the
recorded macOS/Python 3.12.11/SDK 10.0.400 toolchain. New evidence includes CA5359
failure/repair, controlled factory repetition, local package-consumer execution and
CP0002 baseline failure/repair. SelfCheck now has 19 assertions. The package has
31 rules and 54 scenario definitions, separate from four executed isolated trials.
The fourth trial was review-only and used offline synthetic compiler/probes; a
cache-contract interpretation limit led to a narrow guidance clarification.
Creator, candidate/staged/history privacy and redacted Gitleaks passed in recorded
scopes. Native AOT/trim publishing, other hosts and broad model reliability remain
unverified. No product runtime, global install, commit or publication occurred.

## Clean Code for C#/.NET 1.3.0 — 2026-10-13

All ten official validators and 285 regressions passed with SDK checks selected:
234 existing tests and 51 package checks, without package skips. New execution
covers Options/nullability contracts, annotation failure/repair, Debug/Release
refactoring preservation and old-defect detection, real MSTest/native MTP evidence,
and evaluation integrity. The package has 68 defined unexecuted broader scenarios.
Twenty accepted paired model runs separately passed their independent functional checks;
results tied on the selected tasks, with four correct controlled selection
observations and explicit time/token/methodology limitations. See
[package validation](../skills/agentic-skills-clean-code-dot-net/VALIDATION.md) and
[comparison results](../skills/agentic-skills-clean-code-dot-net/evals/comparison.md).
Candidate/index/history privacy, redacted Gitleaks, creator validation and temporary
archive checks passed in recorded scopes. No product check, native discovery,
remote CI, global install, commit, push or publication is implied.
A maintenance-code-exposure pilot was excluded. The accepted sample used fresh
workspaces with evaluation resources withheld, matched inputs and unchanged views;
successful content reads were independently checked from saved trajectories.

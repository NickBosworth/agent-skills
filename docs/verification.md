# Verification of agentic-skills 2.0.0

Executed on 2026-10-10 using macOS and Python 3.11.14/3.12.11. Current source review is
structural across the library and targeted semantic review of changed workflows,
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

There are 88 defined behavioural scenarios across the packages. These are not executed
host/model benchmarks. Native discovery in individual hosts, Unity/Godot/Unreal runtime,
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

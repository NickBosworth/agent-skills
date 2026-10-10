# Verification of agentic-skills 2.0.0

Executed on 2026-10-10 using macOS and Python 3.12.11. Current source review is
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
- Standard-library total: **234 tests passed** in the isolated package runner.
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
history and updating the public branch. History privacy and credential checks are run
after rewriting. GitHub publication and remote CI are separate observed operations;
the current publication state is recorded in the task record, not inferred from tests.

## Limitations and maintenance

The agentic helper's bounded frontmatter parser reports eight unsupported-metadata
warnings for valid nested YAML. Actual YAML parsing and official skills-ref validation
passed for those files; do not weaken valid metadata to silence the lightweight parser.
Core guidance review evidence is recorded separately in .agents/project.json.

There are 88 defined behavioural scenarios across the packages. These are not executed
host/model benchmarks. Native discovery in individual hosts, Unity/Godot/Unreal runtime,
Firefox/WebKit, production-site SEO, broad assistive-technology testing and every domain
source's freshness remain unverified. Previous 1.0.0 evidence is explicitly historical.

CI targets Linux/Python 3.10 and 3.14; defined jobs are not passing runs until GitHub
executes them. GitHub push protection, private reporting and branch settings require
administrative access; no enabled state is claimed without observation. Heuristic
privacy checks and Gitleaks cannot detect all PII; manual review remains mandatory.
Existing public forks, downloaded copies and GitHub caches cannot be revoked by a push.

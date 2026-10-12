# Candidate packaging and publication boundary

The optional manually dispatched Prepare SEO Workbench candidate workflow first invokes
read-only library/product quality, then builds and clean-installs the independent review
ZIP and retains only that archive as a seven-day Actions artifact. Its upload action
is pinned to the verified official v7 tag commit. No reports, captures, credentials,
provider inputs, private state or browser screenshots are uploaded. No workflow was
pushed or remotely executed in this implementation session.

This prepares an archive for review. It does not publish an npm package or GitHub
release. The package remains `private: true`, workflow permissions are contents:read
and
no publish command/token is present. A public artifact is still publication of source:
root public-repository policy, anonymous Git metadata, staged/history/Gitleaks checks,
manual package review and applicable authorization must precede pushing/running it.

Before an expressly authorized first release, complete TASK-0002's acceptance review,
version/changelog/schema migration review, supported-platform installation matrix,
independent vulnerability/SEO evaluation and distribution licence/SBOM work. Review
resolved dependency notices for the actual distribution. Configure
repository protected environments/maintainer approval for any future publishing job;
this repository does not claim such remote protection is already configured. Runtime configuration cannot choose executable code.

The reviewed ZIP preserves the canonical package-lock.json. npm 12.0.2 locally excludes
both package-lock and shrinkwrap from npm packing and has no shrinkwrap command. The older
npm 11 documentation describes different shrinkwrap behavior; the implementation follows
executed npm 12 behavior. The archive builder fixes entry times/modes/order, records file
hashes in RELEASE.json, includes no machine identity and refuses symlinks/source outputs/
overwriting. Hashes establish input identity, not authenticity or privacy. Clean external
installation uses npm ci and checks actual installed versions against the preserved lock.
Runtime source/examples/contributing docs ship with the archive. Full
contributor suites still require the source checkout and canonical skill catalogue.

The [copy audit and MCP assessment](copy-audit.md) records the release recommendation
and the repaired DNS and symlink-startup regressions. Preparing an archive does not
establish readiness for unattended production use.

The first public release is being held for broader stable-release acceptance. See
[the checklist](stable-release-checklist.md) for remaining platform, interactive-host,
live-integration and independent-review requirements. Publication remains on hold.

## Archive input and failure handling

The builder rejects linked output paths, symlink inputs, special files and inputs
larger than the repository's two-million-byte per-file review limit. Package metadata
is parsed only after regular-file checks. Existing archives remain protected by
exclusive creation; a write/close failure removes the incomplete archive created by
this invocation. Same-user filesystem replacement races are outside these preflight
checks. Candidate privacy/content scanning, manual review and release authorization
remain separate required gates; a permitted extension does not prove safe content.

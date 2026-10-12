# Contributing to SEO Workbench

Follow the root public repository policy in the source checkout. Runtime source is
MIT; do not relicense skills or copy third-party rules or assets. Start with [AGENTS.md](AGENTS.md), [architecture](docs/architecture.md),
[security](docs/security.md), the source and rule registers, and repository task
TASK-0002 in the source checkout. Use synthetic fixtures only.
The development suite needs Git to test references to tracked source files; core
audits do not require it.

```sh
npm ci --ignore-scripts
npm run check
npm run build
npm test
PLAYWRIGHT_SKIP_BROWSER_GC=1 npx playwright install chromium
WORKBENCH_BROWSER_TESTS=1 npm test
node tests/benchmark.ts 1000 10000
```

Browser checks require optional dependencies and explicit opt-in. Checks that
have not run remain skipped or unverified; do not record them as passed. Re-run
affected boundary and rule tests for changed behaviour. Review benchmark completeness and denominators, not test counts alone.
Check source links/version claims against actual current official documentation.

Use a migration for persisted schema changes and refuse newer unsupported schemas.
Preserve old evidence/analysis. Follow semver independently from skills; breaking API,
config, observation or storage changes require a documented migration. Update the
product changelog and capability/verification docs together.

Run root library/privacy/history/Gitleaks checks before publication and inspect the
package allowlist with `npm pack --dry-run`. A preview package may be built outside
source, but publishing needs explicit authorization. CI must have read-only permissions;
no publish-on-push workflow is included. Dependabot/maintenance changes need review,
lockfile updates, tests, vulnerability and dependency licence rechecks. Private findings
follow root SECURITY.md. There is no automatic security certification or unattended
source-review promise.

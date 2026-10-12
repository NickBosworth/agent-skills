# Contributing to SEO Workbench

Root public-data policy applies. Runtime source is MIT; do not relicense skills or
copy third-party rules/assets. Start with scoped AGENTS.md, architecture, security,
source/rule registers and the existing TASK-0002 record. Use synthetic fixtures only. The development suite needs Git for real tracked-file
source-reference tests; core audits do not require it.

```sh
npm ci --ignore-scripts
npm run check
npm run build
npm test
PLAYWRIGHT_SKIP_BROWSER_GC=1 npx playwright install chromium
WORKBENCH_BROWSER_TESTS=1 npm test
node tests/benchmark.ts 1000 10000
```

Native browser checks are optional dependencies with explicit opt-in; absent runs
are skipped/unverified, not passed. Re-run affected boundary/rule tests for changed
behaviour. Review benchmark completeness and denominators, not test counts alone.
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

# SEO Workbench

A local tool for checking your website, understanding the evidence and verifying fixes.
**Development preview 0.1.0. The full product brief is still in progress.**
See the [public testing plan](docs/public-testing-plan.md) for the preview gates,
verification and remaining checks, and the [tester guide](docs/testing-preview.md)
for setup and safe feedback.
The core audit works without an account, paid service or AI key. You can try it on a fictional local site, and the app does not track your use.
Original runtime code is MIT; distributed skills retain their existing licences.
Run the browser UI on a trusted computer. Its local session checks protect browser
requests but do not identify operating-system users; it is unsuitable for shared
computers with untrusted local users. See [security](docs/security.md).

## Run your first audit

Use Node 24.15+ in the 24.x line. From this directory in the source checkout:

```sh
npm ci --ignore-scripts
npm run build
node dist/cli.js doctor
node dist/cli.js demo --serve
```

Open `http://127.0.0.1:4173`. The demo crawls a fictional local site, saves its
page responses and findings, repairs the fixture and runs a second audit. Choose an
audit, open Actions or Pages, and use Compare to check what changed. The fictional
site stays running while the demo workbench is running. Closing the server ends that site;
its historical observations remain inspectable. Re-run the demo for fresh evidence.

Optional browser rendering:

```sh
PLAYWRIGHT_SKIP_BROWSER_GC=1 npx playwright install chromium
node dist/cli.js demo --render auto --serve
# For an authorised public website:
node dist/cli.js audit https://www.example.com/ --render auto --max-pages 100
```

Use the Start audit form for an authorized public URL, or:

```sh
node dist/cli.js audit https://www.example.com/ --max-pages 100
node dist/cli.js start https://www.example.com/ --max-pages 100
node dist/cli.js serve
```

`example.com` is a placeholder. Use the fictional demo to try the tool without
contacting another website. By default, the crawler does not sign in, follows the
site’s crawling restrictions and waits 500 milliseconds between requests. Limits
on pages, requests, time and downloads keep the crawl bounded. Review the settings
and confirm that you have permission before auditing a real site. The same limits
apply whether you use the browser, commands or an agent connection.

The crawler reads gzip, deflate and Brotli responses, as well as gzip sitemap files.
Size limits apply to both downloaded and expanded data. Damaged compression or an
oversized sitemap leaves an explicit gap in coverage instead of being treated as
a successful empty response.

Audit data is saved in your user account’s local data folder, outside the source
repository. Choose another location with `--data /path/to/private-state`. Keep real
page captures, databases and reports out of this repository. Captured data is not
automatically anonymised.

## Set the scope and audit limits

See [examples](examples/) for ecommerce, content and JavaScript configurations.
New audits start with the maximum allowances: 100,000 pages, 24 hours, 1 GB of
downloads, a 1 GB saved-data allowance and a 2 GiB process-memory allowance. The interface exposes these values
under Crawl settings. Lower them for a shorter or smaller audit.
A larger page limit does not raise the other limits. Stopped audits retain their
coverage and any saved analysis; start a new audit to change its limits. Storage is
accounted per audit, so older histories do not consume another audit’s allowance.

Use `--config /path/to/project.json` instead of a seed URL. Strict schemas reject
unknown fields and imported network-policy changes. Saved configurations live with
the private project, not in source. Focus on a section with `include: ["/guides/"]`,
or check a single page with `maxPages: 1`. Results identify relationships that were
not discovered or fully checked. Page expectations come from approved contracts
rather than guesses about intent.

`none` collects HTTP responses only. `auto` renders the first observed page for
each declared template or first path segment, plus pages with empty content, title
issues or noindex anomalies. This repeatable route sample does not establish
statistical coverage. `all` requests a render of every fetched HTML document
within the audit limits. Browser results are observations, not search-engine
emulation. Rendering uses local Chromium with its sandbox enabled and a fresh
session. No container software or image configuration is used; see
[security](docs/security.md) and [rendering](docs/rendering.md).

## Reading the results

“Needs a fix” means a check failed; read its explanation and the intended page
behaviour before making a change. “Needs review” calls for human judgement. “Passed”
means that the particular check passed with the evidence available, not that the
whole page is healthy. “Not tested” means required evidence was missing, while
“Does not apply” means the check is irrelevant to that page or its requirements.

Actions explain what needs attention, what to do and how to check the fix. HTML
and Markdown reports use the same approach, with the saved technical records in
a separate section. Passed checks and checks that do not apply are grouped by rule
and outcome, with counts; failures and unknown results retain individual explanations
and saved evidence. JSON and CSV retain every result and stable fields for software
integrations.
Captured text remains the website’s original wording.

## Investigation and handoff

Run `node dist/cli.js help` for exact commands. Replace these UUID placeholders with
IDs returned by a real audit:

```sh
node dist/cli.js status 00000000-0000-4000-8000-000000000001
node dist/cli.js findings 00000000-0000-4000-8000-000000000001 --outcome fail
node dist/cli.js report 00000000-0000-4000-8000-000000000001 --format html --profile shareable --out /path/to/reports/audit.html
node dist/cli.js verify 00000000-0000-4000-8000-000000000001
node dist/cli.js compare 00000000-0000-4000-8000-000000000001 00000000-0000-4000-8000-000000000002
node dist/cli.js reanalyze 00000000-0000-4000-8000-000000000001
node dist/cli.js gate 00000000-0000-4000-8000-000000000001
```

Create the report folder outside the source checkout before exporting. Existing
files will not be overwritten. HTML reports work offline and can be printed. Full
reports contain private evidence; shareable summaries leave out page URLs, captured
passages and project requirements. Review every report before sharing it.
Finding reads use at most one quarter of the audit’s configured memory allowance
for serialized decoded records. If a report or comparison exceeds that allowance,
it stops with an explanation instead of returning incomplete findings. Read findings
in smaller pages. Whole reports and comparisons also refuse audits above one million
findings; this is a retrieval limit, not a tested scale claim. CSV exports contain
findings only and skip the richer report sections. Browser downloads and CLI
reports with `--out` stream all formats rather than holding the complete output
in memory. String-returning APIs stop at 32 MiB or one quarter of the audit memory
allowance, whichever is smaller. Whole-record streams include records beyond the
buffered one-million-result ceiling; comparisons and buffered finding arrays retain
that ceiling. See [capacity](docs/capacity.md) for the boundaries.

Comparison never treats a missing URL, failed render or changed intent as resolved.
`--mapping` accepts explicit URL/origin mappings for staging/migration comparison;
intentional staging differences still require review and are not automatically equal.

The CLI gate exits 0 for tested applicable expectations, 1 for unexcepted contract
failures, 2 for tool/config errors, 3 for incomplete collection, and comparisons use
4 when changes cannot be verified. Review warnings are not an SEO score or default
release blocker. Use an actual installed CI runner for recurring CLI jobs; no hidden
scheduler or outbound notifications are configured.

## Agent and programmatic use

```sh
node dist/cli.js mcp --data /path/to/private-state
```

See [local MCP setup and host checks](docs/mcp-setup.md).
Configure your host to launch that command over stdio. Available tools: projects,
start_audit, audit_status, control_audit, audit_results, page_evidence, compare_audits,
export_report, verify_audit and measure_performance. Immutable page-evidence
resources are also available.
Poll durable audit handles; no long-running-task extension is required. Stdout is
protocol-only. The official SDK v2 client is exercised in tests; individual external
hosts are not certified. The server does not grant private network permission.

```ts
import { Store, Workbench, parseConfig } from "@agentic-skills/seo-workbench";
const store = new Store("/path/to/private-state");
const workbench = new Workbench(store);
const config = parseConfig({
  seeds: ["https://www.example.com/"],
  origins: ["https://www.example.com/"],
  maxPages: 100,
  contracts: [{ pathPrefix: "/guides/", indexability: "indexable" }],
});
const { auditId } = workbench.start(config);
// Poll workbench.view(auditId, 'status'); the detached worker owns the crawl.
store.close();
```

For embedding use local `dist/index.js` or an independently built private package;
this preview is not published to npm. Rule and extractor extension functions are trusted application
code, never imported JSON. See [trusted extensions](docs/extensions.md) for
working examples, fact limits and explicit in-process collection.

Optional enrichment accepts advice tied to saved evidence. Its provider interface
has mocked contract tests, and a local Ollama adapter is supplied. No model or
provider is installed or configured automatically. See
[capabilities](docs/capabilities.md), [integrations](docs/integrations.md), [architecture](docs/architecture.md),
[rules and sources](docs/rules.md), [contributing](CONTRIBUTING.md),
[verification](docs/verification.md), [copy audit and MCP readiness](docs/copy-audit.md).
In the source checkout, repository task TASK-0002 tracks the full acceptance backlog.

## Content and publisher review

See [content decisions and editorial drafts](docs/content-review.md) for the owner workflow, complete draft contract and compatibility limits.

The Content view helps you review existing pages using their collected passages
and any search-query data you import. You can record content decisions and inspect
the site’s crawler settings for search and AI services. Optional `search-visibility`
imports record samples of AI citations or visits; they do not establish total
visibility or produce an AI score. Named views save filters in the local browser. Pages sort by URL/state/depth;
outcomes sort by URL/state. Browser-local settings are private and should be cleared when
sharing the machine. Full evidence and provider samples remain outside the checkout.

## Reviewed standalone archive

A locally prepared review ZIP contains compiled code, runtime source, synthetic examples,
documentation and the exact canonical package-lock.json. After extracting it
outside source, enter its seo-workbench directory, run `npm ci --omit=dev --ignore-scripts`,
then `node dist/cli.js doctor` and `node dist/cli.js demo --serve`. Full contributor/skill
consistency tests use the complete repository. The npm scope remains an internal name;
public namespace ownership and publication are unverified and unauthorized.

Prepare locally with `python3 tools/prepare_release.py --out /path/to/review.zip` after
building and running root/product gates. Existing output files and source-tree outputs
are refused. This optional packaging step uses Python's standard library; core runtime
use does not require Python. npm 12 excludes both normal locks and shrinkwrap from npm
packing, so the ZIP is the reproducible executable distribution. No unlocked npm archive
is claimed as a release, and no package has been published.

Explicit verified backups and previewed retention are documented in
[backup, recovery and retention](docs/maintenance.md). They preserve active jobs and provider
imports and do not run automatically or promise physical erasure.

For owner-supplied code references in private remediation handoffs, see
[source mapping](docs/source-mapping.md). File checks establish a reviewed source
version and line range; they do not establish the cause of a website finding.

Keyword, search-result and backlink files can be imported without a provider account
or network request. See [the research import guide](docs/external-research.md) for formats and limitations.

Use [saved recheck plans](docs/verification-workflow.md) to verify fresh evidence and
dependencies after a fix. Ordinary comparisons describe saved analyses separately.

Optional [local page-speed measurements](docs/local-performance.md) run repeated
Lighthouse tests using local sandboxed Chromium. The workbench, CLI
and MCP share the same collection and saved-record contract. Lab measurements stay
separate from real-visitor data and do not predict ranking changes.

# Architecture and evidence contracts

Repository decision ADR-0002 explains why the product is separate from the skill
library. This architecture guide also ships with the standalone package.
Node 24.15+ in the 24.x release line is the current runtime requirement. TypeScript
uses erasable syntax for direct local development and compiles to independent ESM.
The public API is [src/index.ts](../src/index.ts); adapters call Workbench/Crawler.

## Module ownership

| Module                       | Responsibility                                                         |
| ---------------------------- | ---------------------------------------------------------------------- |
| domain                       | Strict config, URL identity, approved expectations, outcomes           |
| network                      | Anonymous GET, per-connection DNS/IP enforcement, budgets              |
| crawler                      | Discovery provenance, robots/sitemaps, durable queue, redirects        |
| browser-runner / workers     | Sandboxed local Chromium, request broker, readiness and failure limits |
| robots / response-directives | Bounded interpretation of crawl policy and retained HTTP declarations  |
| extract / extractors         | Built-in HTML facts and explicit trusted, versioned extractor namespaces |
| store                        | SQLite schema/migrations, immutable evidence/analyses, job ownership   |
| rules                        | Source-linked deterministic evaluation; prerequisites and unknowns     |
| intelligence                 | Link graph, review opportunities, grouping and compatible comparison   |
| imports / site-data / search-comparison | Bounded first-party provenance and explicit saved-period sample comparisons |
| reports                      | Private/minimised HTML, Markdown, JSON and CSV                         |
| app                          | Shared application facade and detached worker lifecycle                |
| server / mcp / cli           | Thin delivery adapters, session/protocol/command contracts             |

SQLite schema version 5 is installed atomically and rejects newer schemas. Versions 1, 2, 3 and 4 are accepted and migrated without rewriting historical captures or findings. WAL,
foreign keys, indexed queue/results, prepared statements and worker ownership are
used. Evidence/results/analysis updates are forbidden by triggers. Deletion of a
selected audit cascades its captures; it is an explicit action, not evidence mutation.
Each re-evaluation has a new analysis UUID and ruleset version; findings use stable
rule-ID + URL hashes. Hashes do not establish observation truth.

Detached audit workers continue when the CLI/MCP/browser client closes. Pause/cancel
is recorded durably; an in-flight detached-worker request may finish before the
worker observes it. An interrupted fetching item returns to queued on an explicit
resume after its prior owner is no longer alive. Only one crawl worker per private database runs at a time, atomically enforced across adapters.
The RSS guard and worker heap ceiling are conservative bounds. Local Chromium shares host resources and has no separate CPU/memory quota.
Request/byte accounting is persisted as the transport progresses so crashes do not reset consumption.
Resuming never raises saved budgets
or rewrites expectations. Changed limits require a new audit. No monitoring runner
or notification service is silently installed.

## Outcomes

- pass: the implemented check's prerequisites and observable expectation hold.
- fail: an approved intent contract or deterministic tested condition failed.
- warning: an observation needs contextual review; impact remains unknown.
- not-applicable: the check has no applicable feature/approved expectation.
- not-tested: required observations are absent or incomplete.
- blocked: policy/access prevents a required observation.
- error: collection or evaluation failed; absence is not inferred.

Confidence records distinguish direct observation, interpretation and unknown cause.
Priority is a disclosed categorical ordering of important contract failures, other
contract failures and review warnings. Grouping by rule and declared template is a
hypothesis about cause, not source-file proof. Exceptions retain findings, rationale,
owner role and expiry; the acceptance gate ignores only active precisely scoped exceptions.

Original URLs, discovery source, redirect attempts, request timestamps, useful headers,
response bodies, extract facts and optional DOM/profile/runtime are retained. Fetch keys
remove fragments and use WHATWG URL parsing; they preserve path case, trailing slash,
query ordering and repeated parameters. Canonical relationships never merge fetch identity.
No cookies/authorization values are retained in request reproducibility metadata.
For compressed HTTP captures, `bytes` records downloaded wire bytes, `bodyBase64`
holds decoded representation bytes and `encodedBodyBase64` preserves the original
compressed representation. `decodedBytes` records its expanded size. Old identity
captures remain readable without rewriting. Browser fulfilment removes the encoding
header from decoded data; analysis projections and bounded MCP tools omit both body
representations. Private evidence resources retain them within their existing limits.
Each compression layer is bounded and cancellable. Gzip sitemap files may add a file
compression layer after HTTP decoding; their parsed XML hash is recorded only after
successful expansion and parsing. There is no database schema migration.

Retry responses remain separate from the final response: a later failed request
cannot reuse an earlier server error. Failed requests retain redacted diagnostic
events and whether they consumed a request allowance. Follow-up waits use the
larger of the existing backoff and a valid `Retry-After` delay, including redirects;
loops and scope escapes are refused before waiting. Waits are cancellable and
bounded by the audit's remaining allowances. Their deadlines are saved so pausing
and restarting a worker cannot bypass them. Interrupted pages stay unfinished for
the existing queue recovery mechanism; completed observations are not overwritten.

## Extension boundary

`analyze(context, extensions)` accepts trusted developer-authored rule functions with
versioned definitions. Configuration JSON cannot load code or a module path. A custom
extractor/provider should be supplied by a trusted embedding application; no automatic
plugin discovery is implemented. URL scope remains enforced by the actual transport.

## Current analysis limits

Main text is a semantic-main/body heuristic, not full readability or visible-text truth.
JSON-LD syntax, the pinned offline Schema.org vocabulary and bounded reference graphs are evaluated. Selected engine-feature fields and observed main text are checked when explicit contracts and the required evidence are present. Remote or arbitrary contexts, complete engine eligibility and factual truth remain unverified. Vocabulary membership, document references, observed visibility and search eligibility remain separate conclusions. Microdata and RDFa presence is observed; missing JSON-LD types remain untested when those unparsed encodings may contain them. Link depth is
relative to observed hyperlinks from configured seeds; imported pages begin unknown,
not zero. Lexical content terms are hypotheses without demand metrics. Imported query
metrics retain windows, country/device and aggregation. Lab INP is rejected; origin data
never becomes URL field data. The capability matrix records unimplemented breadth.

## Publisher controls and content decisions

Observed provider-specific robots groups, raw meta/header directives and snippet markup
are informational. Google-Extended, search and training tokens are independent; their
permission never certifies indexing, citations or provider compliance. User-initiated
retrieval may not follow the same robots policy. No restriction is automatically a defect.
Manual visibility imports preserve samples and provenance without a universal score.

Query review groups only the supplied window/country/device/search-type/aggregation.
Literal word overlap is inspectable language-sensitive evidence, not semantic completeness.
Multiple destinations are review candidates, not proven cannibalisation. Overlapping
imports remain separate. Owner decisions append immutable evidence-linked proposals;
they do not edit observations, contracts, findings or websites. Selected-audit deletion
also deletes its content decisions; project-level provider imports remain separately retained.

Robots redirects permit at most five hops, only to operator-approved origins and safe
paths. RFC cross-authority redirects outside authorization remain blocked. Policies apply
to the original authority and declared positive crawl-delay is respected per origin.
A delay exceeding the remaining time budget stops collection. Status 401/403/429 blocks
conservatively; 5xx/network errors never become allow. Broader RFC corpus remains pending.
Coverage breaks down the known inventory by template, section, observed language and
configured site profile; unknown language is retained. This is not total-site coverage.

## Analysis lifecycle and memory

The worker retains ownership through `analyzing` and becomes `complete` only after its
new immutable analysis is saved. Crashes cannot turn an empty analysis into a complete
job. Analysis/UI summaries use a labelled facts-only SQLite projection; captured bodies,
original bytes and DOM remain immutable and available through single-page evidence.
Projected input size is checked conservatively against the configured memory budget;
the guard and heap limit still do not guarantee an OS allocation ceiling. Source-aware
trusted extensions can explicitly request full observations when they need raw bodies.

Optional near-duplicate review samples at most 2,000 observed pages and 2,000 tokens per
page. Eight selected five-token fingerprints propose candidate pairs, common buckets
above 30 pages are skipped, and at most 10,000 pairs are checked. Jaccard overlap >=0.8
is a disclosed product review heuristic, not an engine requirement. Coverage/skipped
buckets/sparse pages remain explicit. The method can miss similar pages and cannot prove
shared intent, canonical equivalence, thin content or harmful cannibalisation.

## Network deadlines

Address lookup waits have a deadline and accept cancellation. Late resolver answers
are ignored and cannot start a socket. An operating-system DNS lookup may continue
inside the resolver after the application stops waiting; this is not an OS resource
termination guarantee. The crawl request deadline covers DNS and HTTP together and
is capped by the audit’s remaining wall-clock budget. Resuming uses the audit’s
original creation time, including time spent paused. Start a new audit to use a new
time budget. Provider transport passes cancellation to lookup and keeps its own
fixed deadline across DNS and HTTP.

## Crawl resource limits

New audits default to 100,000 pages, 86,400 seconds, 1 GB of downloaded response
bytes and a 1 GB saved-data allowance. These are separate ceilings; reaching any ceiling
leaves the audit partial. Existing saved configurations keep their explicit limits. Historical audits without a separate download field retain their original storage limit as their download ceiling when read; their stored configuration is not rewritten.
Resume preserves the original elapsed-time allowance and cannot raise a limit.
Start a new audit with revised settings to extend coverage.

Saved-data accounting belongs to each audit, so older projects and SQLite free pages
do not consume another audit’s allowance. Counters are updated transactionally with
queue, discovery, capture, event and result records. The estimate doubles logical
record bytes and adds a small baseline allowance; it is conservative accounting,
not a hard disk quota. Project imports and unrelated histories require separate
retention and disk monitoring. Collection stops at 80% of the allowance to leave
room for analysis. Unusually large analyses can still exceed the remaining space;
in that case results are rolled back and coverage reports that no analysis was saved.

New captures retain the final response body once, with a reference in its matching
request attempt. Reading full evidence restores that attempt’s original decoded body
and original bytes. Earlier captures remain readable without being rewritten.

New finding records use lossless DEFLATE encoding when it reduces their size. Reads
restore the complete saved result, including the wording recorded for that analysis;
current rule definitions do not replace historical guidance. Decoding has a 5 MB
output bound, and larger records are saved as plain JSON. Schema 4 identifies this
storage format so older builds reject it rather than misreading compressed findings.
Existing plain JSON records remain readable and are not recompressed in place.

Each new analysis keeps its own immutable compression dictionary, limited to 32 KiB,
so repeated rule guidance can be represented compactly across its findings. Dictionary
bytes are included in the audit allowance and cascade with analysis deletion. Legacy
plain JSON and the earlier dictionary-free encoding remain readable. Schema migration
and analysis writes are transactional; failed saves roll back their records and counters.

## Response interpretation and analysis upgrades

Ruleset 0.1.1 changes indexing and canonical interpretation. Five affected rule
definitions carry version 0.1.1; other rules retain their previous versions. Reanalysis
creates a new immutable analysis, preserving older findings and raw captures. A rule
version change makes that rule’s comparison unverified until compatible analyses are
available; it must not be interpreted as a resolved issue. That response-indexing increment retained schema 4: its optional fields were additive and required no SQL migration. The subsequent worker-ownership increment below upgrades storage to schema 5.

Canonical declarations combine HTML and supported response Link fields while retaining
separate raw and rendered facts. Header-only targets are discovered within ordinary
operator scope. Document prerequisites allow header checks on non-HTML resources;
HTML content checks still require HTML facts. Google web indexing instructions are
used for indexing requirements; this does not certify other engines or specialist
indexing policies. Old merged scoped indexing fields cannot always be reconstructed
from stored evidence and require a fresh crawl when ambiguous.

## Product detail presence follow-up

Ruleset 0.1.2 updates google-product-basics to rule version 0.1.1. Empty detail
objects, lists, scalars and type-only declarations no longer satisfy the selected
Product check. Populated direct objects, arrays and uniquely resolved typed graph
references are supported. Custom contexts, unresolved or duplicate IDs and unsupported
JSON-LD containers remain unverified. The check establishes populated detail data;
it does not validate prices, review/rating requirements, full vocabulary, visible
agreement or Google eligibility. Historical findings retain their original rule
version and wording; comparison must not treat this interpretation change as a fix.
There is no database migration or change to captured website facts.

## Worker control and renderer deadlines

A stopped audit requires an explicit resume before a worker can claim it. Worker
ownership uses an atomic state/owner condition, so a late startup cannot replace
pause, cancellation or completion. Startup failure recording updates only an unowned
queued job. Completed audits reject pause/cancel/resume through the shared facade
and direct crawler controls. Dead-owner recovery still runs, but does not resume a
stopped audit implicitly. No stored observations or schema were changed.

The native renderer observes the transport cancellation signal and original audit
deadline. Browser startup/readiness cannot extend the remaining audit allowance.
Cancellation aborts broker requests and stops the worker. Cleanup has a separate
five-second ceiling before terminating an unresponsive worker. Host-pipe closure
also closes the browser.

## Export and input consistency

Shareable reports select public coverage fields explicitly rather than spreading the
private coverage object. Private reports retain their detailed evidence. CSV protects
formula prefixes in human-facing exports; JSON is the lossless exchange format.
JSON input boundaries require valid UTF-8. The HTTP service still checks host, origin,
fetch context and session before mutations, including requests with UTF-8 JSON parameters.
Performance provenance validation is shared by imports and provider collection, while
legacy review preserves the source measurement and marks invalid comparisons unverified.
This changes interpretation and validation, without changing SQLite or rule versions.

Comparison mappings are validated at the shared comparison entry point. HTTP and HTTPS
page addresses cannot contain credentials or fragments. Origin changes require both
origins and reject paths or queries; a root trailing slash is normalized. A many-to-one
page mapping leaves affected changes unverified. An introduced issue requires a saved
applicable pass under the same rule version and compatible project settings; absent or
untested earlier evidence cannot prove when an issue began.

Finding queries iterate stored rows and count serialized decoded bytes before retaining
results, with a ceiling of one quarter of the saved memory allowance. This is a data
budget, not a hard process-memory ceiling: JavaScript objects, temporary decoding and
report formatting add overhead. Negative, fractional and non-finite pagination is
refused before SQLite execution. A buffered whole-result read cannot silently stop at one
million records; comparisons/string APIs check the actual count before loading findings.
Streamed exports use an untruncated cursor with completion count checks.
Facts-only projections count retained headers and attempt metadata as well as page
facts while excluding bodies and rendered DOM. CSV avoids unused report projections.
Paginated findings remain available when a whole report exceeds its allowance. Per-record and retained-group guards remain in force for streamed exports; their
current scale evidence is recorded in verification.md.

Owner action reviews require an analysisId read with the action. An immediate SQLite
transaction checks that this is still the latest analysis, verifies the group and
appends the review. Display/report grouping applies only records for that analysis.
Earlier and legacy unbound reviews remain immutable history, without overriding newly
evaluated findings. No schema migration rewrites a review to invent its original basis.
Performance imports retain their identity and provenance; review outcomes explicitly
abstain when a URL lies outside the audit’s current allowed origin/section/path scope.

Action views and report findings pin one saved analysis ID before loading results and
reviews, so a concurrent re-analysis cannot replace their review basis during assembly.

Explicit verified backups and previewed retention are documented in
[backup, recovery and retention](maintenance.md). They preserve active jobs and provider
imports and do not run automatically or promise physical erasure.

Database initialization and all required upgrades share one write transaction; schema
version is re-read under its lock. Failed upgrades roll back and close the connection.
Historical observations/results keep their stored bytes. The maintenance guide explains
recovery and the distinction between code rollback and data rollback.

Report files and local HTTP downloads use record cursors and streamed output. JSON
keeps every result; human reports retain individual failures/unknowns and count
passed/inapplicable checks. Finding groups retain their first explanation, affected
URLs and evidence references instead of every repeated result object. Buffered
report APIs use a 32 MiB/quarter-memory output ceiling; streamed whole-record reads
keep the per-record decoding guard and do not apply the array retrieval ceiling.
CLI exports are written privately to a new temporary file, synchronized, then
published with an exclusive same-directory hard link. Failure removes the temporary
file. Filesystems without hard-link support cannot use this publication method;
native Windows and power-loss durability remain unverified.

Operator-only source mapping validates an explicitly selected Git root and tracked
regular UTF-8 file, exact SHA-256 and bounded line range. It stores no source text or
absolute repository location. Saved metadata is bound to the current analysis/group;
private groups and handoffs include it, shareable reports omit it and audit cleanup
removes it. Source identity is checked at one time; owner-declared page linkage and
root cause remain distinct from verified website evidence. No browser or MCP route
selects local files. See source-mapping.md for input and trust limitations.

Trusted rule definitions and evaluator output now receive runtime validation. Duplicate
or built-in identifiers fail before execution; extension-owned values cannot override
engine identity/evidence fields. Invalid, thrown or non-JSON output becomes an error,
not a pass. An executable owner-rule example covers a real collected-site analysis and
historical version preservation. This API trusts developer code and cannot preempt
arbitrary callback work. See extensions.md for the full contract and adapter limits.

HTML print styles now retain coverage, grouped action/owner/risk recipes and all outcome
counts while leaving large per-page tables, content passages and technical records in
the offline HTML and machine exports. They remain accessible on screen; printing does
not discard saved evidence. Local model usage records distinguish probe/interpretation
reservations and service-reported tokens from advice and unknown monetary costs.

Ruleset 0.1.3 changes engine confidence metadata without changing per-rule outcome
logic. Unfinished, blocked and errored evaluations have unavailable interpretation
confidence; they no longer inherit the deterministic label. A record with observed
browser evidence identifies both HTTP and browser observations. Historical analyses
retain their original ruleset and labels. Reanalyse both saved evidence sets with the
same ruleset before using a cross-version comparison as fix verification.

Worker ownership now uses a separate SQLite write transaction held for the entire
worker lifetime, plus versioned ownership metadata in the main database. Normal
result reads and review writes remain available. Process exit releases the lock;
while it is held, competing claims and resume attempts are refused. A new worker
can recover abandoned modern ownership even if its old process ID is now reused.
Pause/cancel remain database state changes and never kill another process.

Schema 5 adds only ownership metadata. Historical observations, analyses, wording
and saved configurations remain unchanged. Migration refuses possibly live legacy
owners and rolls back without committing the upgrade. Stop all old workers and
clients before upgrading; concurrent old/new executable versions are unsupported.
Legacy owners without modern metadata still use a conservative liveness probe, so
an ambiguous legacy reused process ID requires operator investigation. Do not clear
an owner or delete/replace `worker-lock.sqlite` while any worker might be running.

A code rollback cannot open schema 5 with schema-4 code. Preserve a verified stopped
backup before upgrading; restore that backup into a separately selected private
folder when using the old executable. Newer histories remain in the upgraded folder
and are not automatically copied backwards. Native Windows lock/private-file
acceptance and physical storage/power-loss faults remain separate gates.

### Dependency-aware verification increment — 2026-10-12

Ruleset 0.1.4 adds declared verification scopes and versions inventory-dependent
rules. Fresh targeted/full plans include affected pages, recorded inbound links,
declared template peers and relevant canonical/alternate/redirect destinations.
Inventory checks remain untested in targeted runs; full plans preserve saved budgets.
Old captures stay in the baseline. Appended evaluations require matching configuration,
project/ruleset/rule identity, complete fresh observations and dependencies, and reject
new regressions. CLI/API/MCP/browser adapters share the same implementation. See
verification-workflow.md in the product documentation for policies and exact commands.
Focused actual HTTP, detached CLI, stdio MCP and browser acceptance are recorded in
the verification ledger; broader stable-release gates remain open.

## Local performance collection

The local Lighthouse worker uses sandboxed local Chromium and the bounded resource
broker. Browser control uses a pipe. The host checks crawl
policy for each requested resource and holds the separate SQLite worker reservation
through the whole repeat series. Queue creation also reserves that slot before
creating an audit, so another client cannot race a crawl into a speed test.
Each successful series appends its measurements and summary in one transaction;
cancellation, collection or save failures leave no partial success series.
See local-performance.md for environment, privacy and timing limitations.

Rendered main-text snapshots are collected inside the local sandboxed
browser with bounded node/ancestor/character work. The host checks the returned
shape and size before storing it. A missing or truncated snapshot cannot satisfy
selected structured-name/headline review; source HTML text is not used as a visibility
substitute. This is a limited presentation observation, not factual or accessibility
certification. No historical capture is rewritten to add browser evidence.

Ruleset 0.1.8 adds conservative language-cluster review and versions return-link
interpretation. Optional immutable HTML facts retain original address/placement
details; older captures need recollection. HTTP alternatives share the bounded Link
parser with canonical declarations and participate in discovery and fresh dependency
closure. The database remains schema 5. UI navigation aborts its active lab request;
the server's connection-close signal releases the existing measurement reservation.

Model limits, reservations and settlements use bounded audit-bound import records
in schema 5. SQLite write transactions serialize approvals and attempts across
processes. Settlements append without refunding the requested output maximum;
unsettled crash records remain charged. Read-only usage never configures a limit.
CLI advice cache seeding uses the latest 100 audit-bound saved records; cached
provider/model/prompt/evidence identities and suggestions are validated before use.
Schema probes still count and cache hits do not claim fresh interpretation tokens.

Content decisions append separately from page captures and analyses. Optional full
editorial drafts bind reviewed existing URLs to successful observations in the same
audit; declared internal links cannot widen scope. New distinct-page proposals need
an explicit unmet reader need and complete draft. Older records remain readable and
incomplete. Owner topic/group/intent corrections project only onto their matching
audit/observation; they do not alter captured words or SEO rules. Draft references
remain owner-supplied and unverified. Saves and evidence checks share one SQLite
write transaction. The local server snapshots its three UI assets at startup so a
running API does not hot-load later interface files; restart after a reviewed upgrade.

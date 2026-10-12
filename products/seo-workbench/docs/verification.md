# Verification ledger

**Current execution:** local sandboxed Chromium only. Container launchers, image
configuration, copied execution profiles and their build/CI files were removed on
2026-10-12 at the user’s request. Image/container results below are historical
preview evidence, not current instructions, supported capabilities or release gates.
The current native acceptance checkpoint is recorded at the end of this document.

This development preview is still in progress. Results below describe actual local
executions, not universal SEO correctness, full browser isolation certification or
cross-platform release readiness. The complete capability/traceability backlog remains
open. Final combined regression runs are recorded after execution, not before.

## Historical preview checkpoint

This table predates the switch to native-only execution and the later checkpoints
below. Its container results and earlier test counts do not describe the current
release candidate.

| Check                                         | Latest observed result                                                                                                     |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| macOS arm64, Node 24.15.0                     | All 198 checks passed, no skips; actual browser, selected isolated renderer, clean package and MCP suites enabled          |
| Linux arm64, Node 24.15.0/Debian 12 container | 189 checks passed; nine optional browser/container checks not selected there                                               |
| Core source and library gates                 | Strict checks, compiled build and root library checks passed                                                               |
| Renderer dependency clearance                 | Updated exact-image scan has no high/critical findings; lower advisories, engine/notice and independent review remain open |
| Native Windows, interactive model workflows   | Unverified                                                                                                                 |
| Live provider access                          | User will verify separately; local contract tests do not establish live success                                            |
| Publication                                   | Source remains local; no release or public CI was published                                                                |

Older counts below are historical checkpoints. Full acceptance remains in
[the release checklist](stable-release-checklist.md) and the repository's TASK-0002.

## Observed increments on 2026-10-11

- Core/raw-site before→corrected fixture comparison exercised HTTP, saved evidence,
  intent failure resolution and missing-URL not-verifiable behavior.
- 77 tests passed in the earlier full browser-enabled suite (Node 24.15.0/macOS arm64),
  including real Chromium 156.0.8078.4, workbench views/keyboard/narrow viewport,
  automated axe checks on the export view and offline HTML without remote requests.
  Later combined reruns supersede that early checkpoint for the final tested tree.
- Four optional container checks passed: host-network connection blocked, same-response
  Chromium rendering through broker, hostile local-origin/checkout requests blocked,
  and scoped namespace-profile enforcement. Docker Engine 29.8.2/Linux arm64 VM;
  Node 24.15.0 and Chromium 156 in the locally built image. No image was published.
- Clean external npm package installed production dependencies and ran doctor plus
  actual synthetic before/after demo successfully. Both npm array and keyed-object
  pack metadata are supported; source node_modules was not reused for installation.
- Production npm audit reported zero known vulnerabilities at the time checked.
  That result is a package advisory snapshot, not a vulnerability absence guarantee.

## Synthetic benchmarks already executed

On macOS arm64, 10 logical CPUs and 16 GiB system memory, Node 24.15.0:

| Mode                         | Inventory | Duration  | Peak Node RSS     | Stored files            | Completion                                |
| ---------------------------- | --------- | --------- | ----------------- | ----------------------- | ----------------------------------------- |
| HTTP                         | 1,000     | 956 ms    | 252,870,656 bytes | 50,025,480 bytes        | 1,000 fetched, complete discovered queue  |
| HTTP                         | 10,000    | 22,306 ms | 468,418,560 bytes | 473,722,792 bytes       | 10,000 fetched, complete discovered queue |
| HTTP + auto fixture sampling | 1,000     | 2,093 ms  | 344,571,904 bytes | see reproducible runner | complete discovered queue                 |

These are an earlier implementation snapshot before new raw-byte retention and persistent
storage ceilings. Re-run changed configurations before reusing measurements. An initial
benchmark had two additional sitemap URLs and correctly returned partial; that output
was not relabelled as complete. The benchmark fixture was corrected to publish its actual
sized inventory, then the listed complete runs were performed.

Loopback fixtures are not Internet throughput. Peak Node RSS excludes browser/container
memory and is process sampling, not an OS resource ceiling. No machine identifiers,
private captures, invented million-page scale or paid-service performance claims.
Use `node tests/benchmark.ts 1000 10000`, or `--mode=auto` / `--mode=all` explicitly.
The actual current persistent budget may stop larger runs; partial results are valid.

## Unverified / remaining

Native Windows/Linux startup; independent external MCP hosts; paid/live GSC/CrUX/AI
provider behavior; full rich-result/vocabulary/profile coverage; live model advice;
large full-render throughput; comprehensive screen-reader/assistive-device journeys;
all exotic browser channels; independent vulnerability and SEO precision/usefulness
review; CI on GitHub for these unpublished changes. No private account or production
site was used. The root library release checks remain separate.

## Later combined verification

The 124-check combined run passed with real Chromium, networkless Docker rendering,
clean external npm installation, official SDK stdio/reconnect/kill-resume, synthetic
provider contracts and root-source provenance. Later owner performance budgets, action
triage, view-race handling and unsupported structured-property mapping regressions were
added and executed in focused suites; the subsequent combined run passed all 133 checks, with zero failures/skips, after fact projection, final-analysis ownership, near-duplicate and private-state cleanup changes. It also exercised compiled packaging in paths containing spaces.
Root Python/library validation passed again with all eight official skill validators.
Candidate-file privacy, reachable-history privacy, staged-state privacy and redacted
history Gitleaks passed. An independent redacted Gitleaks directory scan of all tracked
and nonignored candidate files also passed. The staged index did not contain this new
implementation, so its staged pass is not described as validating a future commit.
Ignored dependencies/builds/private captures were not included in the candidate scan.
No new binary assets were added. Production npm audit reported zero known advisories;
38 installed production/optional dependency licence declarations were inspected.

### Current benchmark snapshot

| Mode                          | Inventory | Duration  | Peak Node RSS     | Stored files      | Completion                                         |
| ----------------------------- | --------- | --------- | ----------------- | ----------------- | -------------------------------------------------- |
| HTTP                          | 1,000     | 2,049 ms  | 312,655,872 bytes | 60,174,608 bytes  | 1,000 fetched, complete                            |
| HTTP                          | 10,000    | 85,881 ms | 558,022,656 bytes | 252,797,128 bytes | 10,000 fetched; partial, persistent-storage-budget |
| HTTP + auto fixture sampling  | 1,000     | 3,160 ms  | 375,062,528 bytes | 59,910,808 bytes  | complete                                           |
| HTTP + every fixture rendered | 50        | 27,934 ms | 243,056,640 bytes | 4,484,576 bytes   | complete                                           |

Same hardware class/runtime as above. HTTP/auto/full remain different workloads.
The last full-render run executed separately; an earlier auto/full overlap is excluded
from the full-render table. Do not extrapolate 50 rendered fixture pages to 10,000.
The 10k persistent allowance was 500,000,000 bytes, estimated conservatively as two
logical DB sizes; retaining evidence/results exceeded it and analysis stayed unavailable.
Peak sampling also exceeded the 512 MiB Node allowance during the final reporting phase;
RSS/heap guards are not an OS allocation ceiling. Thus this run does not establish
successful 10k analysis throughput or a strict process-memory guarantee. Browser/container
memory is separate and excluded from Node RSS. The record preserves the actual partial
state instead of raising budgets or relabelling it successful. Auto's short run overlapped
the start of an earlier full-render trial; repeat isolated runs for comparative claims.

### Isolated larger profile and Linux smoke

A separate fresh-process HTTP run of 10,000 URLs explicitly used maxMemoryBytes
1,073,741,824 and maxStorageBytes 1,000,000,000. It completed in 89,484 ms, sampled
437,485,568 bytes peak Node RSS and retained 597,840,824 bytes of files, saving 220,000
rule outcomes (including inapplicable/unknown outcomes, not 220,000 independent SEO tests).
The smaller-profile partial runs above are unchanged. This is one synthetic configuration,
not evidence of Internet speed, universal 10k completeness or calibrated business impact.
Reproduce with `node tests/benchmark.ts 10000 --max-memory-bytes=1073741824
--max-storage-bytes=1000000000` on one shell command line.

With fact-only projection the 1k HTTP run completed in 1,705 ms with 319,193,088 bytes
sampled peak Node RSS and 59,651,368 bytes retained. The subsequent same-process 10k
run stopped at analysis-memory-budget after 74,436 ms, with 536,887,296 bytes sampled
RSS and 62,553,808 bytes retained; all URLs fetched, no analysis saved. Do not describe
that as complete. Projection alone does not guarantee memory ceilings or erase retained
raw bodies. Multi-run allocator state and configured budgets affect these observations.

The compiled synthetic CLI demo also executed inside the final Linux arm64 renderer
image with network=none, non-root UID, read-only filesystem, dropped capabilities,
no-new-privileges, 512 MiB memory and bounded tmpfs. Before/after were complete and the
approved index-intent failure resolved. This verifies this image/CLI path, not a native
Linux distribution or Windows installation. No image was published.

The inline decorative fixture image is original synthetic 1×1 transparent RGBA PNG,
visually inspected with only IHDR/IDAT/IEND chunks and no ancillary metadata. Generated
review screenshots/reports remain outside source. Privacy scans are not PII guarantees.

## Plain-language interface and reporting review

On 2026-10-11, the wording pass passed strict TypeScript/browser syntax checks, a
compiled build, and 136 of 139 product tests. Three container checks were skipped
because this pass did not select an isolated image; the earlier container results
remain a separate record. The enabled suites included real Chromium, keyboard and
narrow-screen flows, export-view axe checks, an offline HTML report, official MCP
client tests and clean locked review-archive installation.

Interface explanations, rule guidance, content notes, command help and public
errors now use plain sentences. HTML and Markdown reports lead with coverage,
findings, practical steps and verification, followed by labelled technical details.
Machine field names, stable identifiers and captured website text are preserved.
Error explanations use fixed text and never echo unknown diagnostic input. Tests
check that hostile page content remains escaped and reports keep uncertainty
visible. This is a maintainer writing review, not an independent user comprehension
study or a full accessibility certification.

## Full copy audit and MCP release review

On 2026-10-11, 141 product tests passed with no skips: real browser flows, selected
isolated container image, locked archive installation, core rule/lifecycle checks
and the official MCP SDK client. The shared completion calculation now marks
blocked requested browser checks and incomplete sitemap retrieval as partial.
Two new regressions check incomplete status, coverage and gate results.

The [copy audit](copy-audit.md) records the reviewed interface/report surfaces,
removed slogans and repeated prefaces, and the release recommendation. A separate
synthetic DNS probe reproduced a pending lookup that did not settle after a 100 ms
timeout and cancellation; no HTTP request was sent. This is an outstanding lifecycle
gap. No external MCP host, independent security review or public release was
performed. The complete test suite does not certify those untested boundaries.

## DNS, elapsed budgets and installed MCP hardening

On 2026-10-11, all 147 product tests passed with no skips, including the selected
networkless browser image, actual Chromium, clean installed archive and official
MCP client. Strict TypeScript/browser checks and compiled build passed.

New tests cover pending and pre-cancelled DNS, timeout, ignored late answers, recovery
of the serial request queue, no renewed time budget after resume, in-flight HTTP
expiry and native provider pre-cancellation. The installed MCP launches through a
symlinked path with spaces/hash and exercises tool discovery, status, pagination,
evidence resources, shareable HTML output and invalid input. Server workflow
instructions are observed by the source and installed clients.

The earlier DNS and silent symlink-launch findings are repaired; their original
reproductions above remain historical evidence. OS resolver work may continue after
the application stops awaiting it. No private provider credentials, real model or
external MCP host was used. Host instructions in mcp-setup.md follow reviewed official
documentation and remain unexecuted in those hosts. Independent security/SEO review
and platform acceptance are still pending.

## Storage accounting and larger crawls

The storage review reproduced an early stop caused by counting unrelated histories and
SQLite free pages against each audit. Per-audit transactional counters now account for
queue, discoveries, observations, events, analysis dictionaries and findings. Download
bytes have a separate ceiling. Existing persisted download allowances are preserved;
historical configuration and evidence are not rewritten.

Regression checks cover isolation between histories, reopen consistency, analysis
rollback, cascade deletion, schema 1/2/3 compatibility, body deduplication, full result
round trips, historical wording and partial analysis with a constrained allowance.
Original synthetic 100 KB pages fetch past forty pages; a smaller allowance stops
collection with useful saved results and an incomplete gate. The interface and human
reports explain reached limits, and a spent allowance cannot be extended by Resume.

A 10,000-page synthetic HTTP benchmark on Node 24.15.0/macOS arm64, 10 logical CPUs
and 16 GiB memory completed in 105,465 ms. Peak sampled Node RSS was 499,892,224 bytes;
private database/WAL files were 291,552,144 bytes and the per-audit saved-data estimate
was 268,950,434 bytes. All 10,000 pages were fetched and an analysis was saved. The
configured allowances were 536,870,912 bytes of process memory and 500,000,000 bytes of
saved data, with no rendering. This is close to the memory guard; it does not establish
headroom on other hardware. Earlier attempts fetched all pages but could not save their
analysis; those results were retained as failed performance checkpoints, not relabelled.

The installed runtime also clean-installed its locked production dependencies and ran
doctor plus the full synthetic before/after CLI demo under Linux arm64 in Docker,
Node 24.15.0, as a non-root user without external networking. This verifies that exact
container environment, not a native Windows/Linux installation matrix. Read-only CI now
includes native Windows, Linux and macOS core and clean-package checks; it has not run
remotely. Windows filesystem privacy and interactive host behaviour remain open.

MCP Inspector 2.10.1 discovered all tools and completed a projects call. Codex CLI
0.162.1’s actual app-server connection discovered all nine tools and read synthetic
page evidence. No model turn, new chat, global host configuration change or provider
transfer was used. See mcp-setup.md for the exact verified scope and remaining checks.

The user selected a broader stable first release. Publication remains on hold; local
success is not approval to release. Live provider/model access is unavailable in this
execution environment. No test target, capture, private log or provider input belongs
in the candidate source archive. Only original synthetic fixtures ship.

## Earlier reviewed local tree (152 checks)

All 152 product tests passed with zero skips after the final explanatory-copy and
schema-4 changes, including actual Chromium, isolated rendering and clean-installed
MCP. Strict type/browser checks and compilation passed. The final schema-4 archive
clean-installed and ran its synthetic before/after demo under Linux arm64 in Docker.
Runtime dependency auditing reported zero known advisories. These are local results;
they do not close the remaining stable-release acceptance gates.

The user subsequently instructed that source stay local and live integrations be
built against their documented contracts for separate user testing. No branch, draft
pull request or remote CI was created. Live integrations and native Windows remain
unverified; that instruction is not evidence that their tests passed.

The final provider review restricts credential-bearing transport to each supported
Google host, API path and method before DNS or HTTP. Search Analytics requests now
use Google’s documented auto aggregation for grouped page queries while retaining
returned aggregation metadata. Focused synthetic tests passed; no live API call was
made. Source and API documentation were checked against official Google references.

Earlier handoff checkpoint: all 153 tests passed with no skips after the provider route
and aggregation review. Type checks and compilation passed. Actual Inspector and
Codex connection/resource checks were repeated against this compiled build. The source
and final archive remain local; remote CI, live integrations and native Windows were
not run. The user’s real test target and captures are excluded from all source artifacts.

## Further local public-release audit

On 2026-10-11 the final combined suite passed all 158 tests with no failures or skips
on Node 24.15.0/macOS arm64, with actual Chromium, the selected networkless rendering
image, clean archive installation and MCP clients enabled. Type/browser syntax checks
and compilation passed. The additional storage/input/startup/version regressions are
described in security.md.

A separate clean Linux arm64 Debian container installed the locked development
dependencies, checked and compiled source, and ran as an ordinary user with no runtime
network, dropped capabilities and bounded process/memory allowances. It passed 152
tests; six optional browser/container checks were not selected. The clean archive and
installed MCP tests ran there. An initial temporary container incorrectly built outputs
as root, so the ordinary-user packaging rebuild failed on write permissions. Rebuilding
all application outputs as the same ordinary user repaired the test environment; no
product test was weakened. This is Linux container evidence, not native Windows or
interactive model verification.

The source remains an unreleased development preview. Local acceptance does not close
the full brief, remaining stable-release gates or independent review.

## Phased crawl and response-rule acceptance

On 2026-10-11, all 171 product checks passed with zero failures or skips in the final
combined local suite, including actual browser, networkless rendering, archive install
and MCP checks. The crawl-policy phase first passed 125 focused checks. The response
phase added canonical-header, non-HTML document, scoped-indexing, preview-setting and
legacy-ambiguity regressions before the combined run. Type checks and build passed.
A further focused header test confirms quoted-pair relation decoding.

A clean ordinary-user Linux arm64 container passed 165 checks, zero failures, with six
optional browser/container checks not selected. npm’s complete development/runtime
advisory scan reported zero known advisories at this checkpoint. These are current
local/container observations, not native Windows or interactive-model evidence. The
new parsing scope, research references and remaining protocol limits are in security.md;
the ruleset and historical-analysis handling are in architecture.md.

## Updated renderer and final combined checks

On 2026-10-11, strict source checks, compiled build and all 172 product tests passed
with no failures or skips. Actual browser, rebuilt networkless renderer, clean
package installation and MCP suites were selected. The added runtime check verifies
that the browser is present and npm, npx, Yarn and Xvfb are absent. All six focused
container checks also passed against that same updated image.

The renderer uses Node 24.21.0/Debian 13; the host suite used Node 24.15.0/macOS
arm64. The earlier Linux arm64 result remains 165 passes with six optional checks
not selected; it predates the extra image-runtime check. Image vulnerability results
and unresolved findings are in security.md. Neither passing tests nor the clean
application npm scan clears the image for distribution or completes stable acceptance.

## Crawl pacing and final candidate follow-up

After the crawl-delay repair, all 173 combined product tests passed with zero skips
or failures; browser, selected isolated renderer, clean package and MCP checks remained
enabled. Source checks and build passed. Shared-group and repeated-delay regressions
passed independently. No live account or additional real website request was used.

The prior 172-check checkpoint's archive was built twice with identical hashes,
checked across all 128 file contents, installed outside the checkout and ran doctor
plus the synthetic before/after demo. Candidate, temporary-index staged and reachable
history privacy checks passed; redacted Gitleaks found no leaks in the extracted
archive or history. Generated JavaScript/declarations were reviewed as release-only
outputs matching the compiled source; no binary assets were included. They remain
excluded from tracked source. Repeat those gates for every changed candidate.

## Product detail acceptance follow-up

On 2026-10-11, all 174 combined product tests passed with zero failures or skips.
Browser, selected networkless renderer, installed-package and stdio MCP checks were
enabled; strict source checking and build passed. The Product presence regression
covers empty objects/lists/scalars, type-only declarations, zero prices, populated
arrays, unique/missing/duplicate typed references, custom contexts and unsupported
containers. Full Product feature validation remains outside this narrow check.
Ruleset 0.1.2 and historical comparison limits are recorded in architecture.md.

A fresh ordinary-user Linux arm64 container clean-installed the current lock, checked
and compiled the updated source, then passed 167 tests with zero failures and seven
optional browser/container checks not selected. Installed-package/MCP checks ran.
This environment used Node 24.15.0 on Debian 12 with no runtime networking, dropped
capabilities and bounded memory/processes. It verifies this container combination;
it does not establish native Windows support or clear renderer OS vulnerabilities.

## Production lifecycle and archive acceptance

On 2026-10-11, strict checks/build and all 178 product tests passed without failures
or skips. Actual browser, isolated renderer, clean installed package and MCP checks
were enabled. The new lifecycle tests exercise late/duplicate CLI worker processes,
stopped and completed states, conditional startup failures, pre-cancellation, real
browser cancellation and the original audit deadline. Archive checks reject linked,
special and oversized inputs and verify incomplete-output cleanup on write failure.
The source changes do not clear the renderer dependency findings.

The initial focused core run exposed an older test fixture that claimed a paused job.
The fixture now explicitly resumes before checking dead-owner recovery, and asserts
that claiming the paused state is refused. Its existing capacity/history assertions
remain intact. The final focused worker/container run passed 139 checks.

A clean ordinary-user Linux arm64 container installed the current lock, checked and
compiled source and passed 169 tests, zero failures, with nine optional browser/
container checks not selected. Installed-package and MCP checks ran. The Linux runtime
used Node 24.15.0 on Debian 12 without network access, with dropped capabilities and
bounded memory/processes. The complete host run covered the optional environments;
these results do not certify native Windows or interactive model workflows.

The subsequent stream-budget fix passed all 179 combined checks with zero failures
or skips. The POSIX synthetic command fixture checks unterminated output without a
real Docker daemon; separate selected tests still exercise actual isolated Chromium.

The refreshed ordinary-user Linux run passed 170 checks after the stream fix, with
zero failures and nine optional browser/container checks not selected.

## Export, session and measurement acceptance

On 2026-10-11, all 183 combined product checks passed with zero skips/failures after
strict source checking and build. CSV control/full-width/format-prefix cases and
shareable private-metadata projection are covered. HTTP regressions test invalid
multibyte cookies, accepted UTF-8 JSON charset, refused other encodings and invalid
UTF-8 in an otherwise valid performance import, without persisting the record.
Local file and actual synthetic local-provider decoding checks also passed.

New measurement input rejects inconsistent periods/origin scope; old shape-valid
records retain their values and show invalid-provenance comparisons. Provider tests
cover wrong page/device/scope, matching same-origin CrUX normalization, rejected
cross-origin substitution and preserved PageSpeed redirect URLs. There was no live
account or model access. The local UI trust assumption now explicitly includes other
local accounts/processes; cookies do not authenticate operating-system users.

The first clean Linux run passed 174 with nine optional browser/container checks not
selected. The final reviewed fixture strengthens invalid-encoding acceptance by using
an otherwise valid import, rather than an unrelated malformed control payload.

## Migration comparison acceptance

The final macOS arm64 run passed all 185 product checks with no failures or skips,
including browser, selected isolated renderer, clean package and MCP checks. Mapping
regressions cover invalid types/fields/addresses, one-sided origin changes, normalized
root origins, many-to-one ambiguity, compatible one-to-one resolution, changed rule
versions and missing or untested earlier evidence. The clean ordinary-user Linux arm64
run passed 176 checks with nine optional browser/container checks not selected.
Private report construction now reads the saved observation projection once per export;
existing report/privacy/browser acceptance checks passed. This is not a new large-report
throughput benchmark or a guarantee that all supported audit sizes export quickly.

## Bounded saved-data acceptance

All 189 final macOS arm64 checks passed with no failures or skips. Actual browser,
selected isolated renderer, clean package and MCP suites were enabled. Four new cases
cover compressed findings exceeding the decoded-data allowance, paginated recovery,
whole-report/count refusal before decoding, private/shareable CSV without unused data
reads, invalid pagination and oversized retained metadata. Captured response bodies
remain excluded from the facts-only projection. Test fixture creation has a separate
analysis allowance; the saved-read regression still enforces its 32 MiB configuration.
The clean ordinary-user Linux arm64 run passed 180 checks with nine optional browser/
container checks not selected. These runs are not large-report throughput benchmarks.

## Review, scope and optional-adapter acceptance

The final macOS arm64 run passed all 193 checks with zero failures/skips. Browser,
selected isolated renderer, clean package and MCP suites were enabled. Owner-review
regressions cover analysis replacement, rejection without appending a stale request,
new review acceptance, preservation of historical/unbound records and pinned view/report
analysis identity. Real Chromium submitted a review with its analysisId, refused an
otherwise valid import containing invalid UTF-8 and preserved valid non-ASCII text.
Measurement reviews retain other-origin/section/excluded-path imports without applying
a within/above-budget outcome; approved-origin and relevant-URL counterexamples pass.
Optional adapter regressions cover invalid numeric limits and capability metadata,
pre-cancelled requests with zero probes/transfers, concurrent allowance enforcement
and cache identity for changed output limits. No live model/provider access was used.
The CLI gate reuses the saved audit configuration rather than re-reading it per finding.
The clean ordinary-user Linux arm64 run passed 184 checks with nine optional browser/
container checks not selected. Native Windows and interactive model certification
remain open, alongside the independent/full-capability acceptance requirements.

## Backup and retention acceptance

All 197 macOS arm64 checks passed with no failures or skips, including browser,
selected isolated renderer, installed-package and MCP suites. Four maintenance cases
exercise native SQLite backup/recovery of captures/findings/imports, protected existing
folders/source paths, refused active jobs, POSIX private modes, failed foreign-key
validation cleanup, preview-only retention, changed-selection refusal, protected jobs/
projects/provider imports and rollback of histories/reviews on an injected delete fault.
The clean ordinary-user Linux arm64 run passed 188 checks with nine optional browser/
container checks not selected. No real private history was backed up or pruned by these
regressions. Native Windows ACL/privacy and broader migration/fault acceptance remain
open. The full production plan remains in progress, with no publication authorized.

## Current exact-image production increment

All 198 macOS arm64 checks passed with no skips/failures against the exact Ubuntu
renderer candidate, with browser/package/MCP opt-ins enabled. The ordinary-user Linux
arm64 run passed 189 with nine optional browser/container checks not selected.
An interrupted backup marker now refuses Store recovery before changing the database.
The exact image passed container checks and its local scan reports zero high/critical
rows, 39 medium/eight low Ubuntu rows and zero Node package findings. Local CycloneDX
inventory generation passed; it is not independent clearance. New renderer CI gates
are definitions only, not executed GitHub evidence. See security.md for exact scope.
The full twelve-phase production plan remains in progress, with publication on hold.

## Transactional upgrade and recovery acceptance

All 201 macOS arm64 checks passed with no failures or skips, including browser,
selected renderer, installed-package and MCP opt-ins. Three new recovery cases verify
whole-upgrade rollback after a late synthetic schema conflict, released locks and retry,
preservation of committed state after a real subprocess is killed during an uncommitted
write, and simultaneous subprocess migration openers. Existing schemas 1–3 evidence
preservation and newer-schema refusal tests also passed. No historical records or schema
version were changed by this implementation. These tests do not certify hardware power
loss, disk exhaustion, native Windows privacy or every database corruption mode.

The corresponding clean ordinary-user Linux arm64 run passed 192 checks with zero
failures and nine optional browser/container checks not selected. Its actual subprocess
recovery and simultaneous migration cases passed. Native Windows remains untested.

## Report-size and current resource acceptance

Human reports now summarize passed and inapplicable results by rule/outcome. Failures,
blocked checks and missing evidence keep individual records; JSON/CSV retain every
result. A focused regression checks summary totals, preserved unknowns, unchanged
machine exports and shareable redaction. The combined macOS run passed 203 checks;
ordinary-user Linux arm64 passed 194 with nine optional checks not selected.

The current HTTP fixture runs used Node 24.15.0/macOS arm64, 10 logical CPUs and
16 GiB memory, with 1 GiB configured audit memory and 1 GB logical storage. Each
export began after its crawl; all eight private/shareable format combinations exported,
and JSON completeness assertions passed. Durations vary with other local work.

| Inventory | Crawl duration | Saved files       | Sampled peak Node RSS, including exports | Private HTML      | Private Markdown | Shareable HTML  |
| --------- | -------------- | ----------------- | ---------------------------------------- | ----------------- | ---------------- | --------------- |
| 1,000     | 2,959 ms       | 32,477,056 bytes  | 734,789,632 bytes                        | 11,135,047 bytes  | 9,467,781 bytes  | 848,227 bytes   |
| 10,000    | 117,558 ms     | 293,946,192 bytes | 2,155,708,416 bytes                      | 111,449,114 bytes | 94,787,848 bytes | 8,390,280 bytes |

The preceding full-record human report implementation produced a 437,094,480-byte
private HTML report for the same 10k synthetic inventory. The new JSON export still
contains 220,000 individual results and measures 293,170,908 bytes; no results were
silently removed from machine exports. These are outcomes, not independent SEO rules.
Export times in the updated 10k run ranged from 3,294 to 5,965 ms per format/profile.
No raw reports, data directories or website identifiers are committed as benchmarks.

A separate 100-page full fixture-render run completed every render in 54,090 ms,
with 529,399,808-byte sampled Node RSS and 4,853,240-byte saved files. It preceded
the human report-size change. It does not establish 1k/10k full-render capacity.

The 1 GiB configuration is not a whole-process export memory ceiling: serialization,
strings, richer report construction and allocator state can exceed it. Large exports
still need bounded/streamed construction and browser usability acceptance before the
resource gate can close. The benchmark counts saved results without decoding them
just to obtain a count; failed exports are reported unavailable, not complete.
RSS sampling excludes browser/OS memory and can miss transient synchronous allocations.

## Streamed reports and maximum defaults

The streaming/defaults increment passed 212 macOS arm64 checks with no failures or
skips, including the browser, selected immutable renderer, installed package and MCP
checks. The subsequent accumulated-import and group-view fix passed 213 macOS checks;
the clean ordinary-user Linux arm64 run passed 204 with nine optional checks not
selected. Native Windows, live service, interactive host and independent gates remain
open. Focused coverage exercises oversized exports, exclusive file publication,
late stream failure, shareable redaction, analysis pinning and an actual SQL cursor
with 1,000,001 synthetic records. Buffered APIs continue to refuse their count/size
ceilings. Import tests measure cumulative UTF-8 bytes before decoding.

A fresh 10,000-page HTTP fixture audit completed in 98,868 ms with 220,000 saved
outcomes and 294,706,480-byte saved files before export. All eight streamed report
combinations completed. The sampled peak Node RSS covering crawl and exports was
656,392,192 bytes; the configured audit memory allowance was 1 GiB. This replaces
neither browser usability acceptance nor whole-process/platform resource measurement.

| Format   | Private bytes | Shareable bytes | Private export time | Shareable export time |
| -------- | ------------- | --------------- | ------------------- | --------------------- |
| JSON     | 235,339,860   | 23,621,638      | 7,847 ms            | 4,852 ms              |
| CSV      | 32,875,580    | 14,490,052      | 2,729 ms            | 2,752 ms              |
| Markdown | 70,475,377    | 5,107,024       | 6,814 ms            | 5,732 ms              |
| HTML     | 94,337,189    | 7,229,140       | 6,991 ms            | 5,713 ms              |

The environment was Node 24.15.0 on macOS arm64, 10 logical CPUs and 16 GiB RAM.
The fixture used explicit 10k inventory limits and no rendering. RSS sampling can miss
transient allocations and excludes browser/OS memory. Streamed files were written
privately and removed after measurement. Completeness and semantic equivalence are
covered separately by regressions. Large HTML browser/print use remains unverified.

New audit defaults use the admitted maximum allowances. The page-bounded depth ceiling
is now 100,000; a real 60-page link chain reaches depth 59 without a false exclusion.
Existing saved configurations retain their original limits, including partial older
configurations. This does not certify a completed 100k-page audit or authorize higher
request speed, rendering or provider transfers. See capacity.md for each limit.

## Source references and storage fault acceptance

The next combined candidate passes 219 macOS arm64 checks with zero failures/skips,
including browser, package/MCP and exact selected renderer checks. The clean ordinary-
user Linux arm64 container passes 210 with nine optional browser/container checks not
selected. Its development environment now installs Git for actual tracked-file tests;
core product installation still does not require Git. `doctor` reports this optional
prerequisite. A missing test prerequisite initially failed Linux source-reference setup;
that failure was corrected, not skipped or relabelled.

Source-reference cases exercise real Git tracking and CLI input, exact fingerprints,
invalid paths/lines, untracked/binary/oversized files, link escapes, private/shareable
handoffs, stale analyses and manual retention. No source text or absolute repository
location is retained. The owner supplies the page-to-file connection; checks establish
file identity at one time rather than root cause or deployment. Native Windows remains
unverified, and the POSIX link case is not Windows evidence.

A real SQLite page-capacity failure preserves the earlier analysis and dictionary,
passes database integrity and permits retry once the limit is lifted. A separate
automatic-rollback fault reproduced cleanup masking the original exception; conditional
rollback now preserves that exception. Fixed error categories explain SQLite FULL and
filesystem ENOSPC without echoing diagnostics. These are isolated synthetic fault tests,
not hardware power-loss or physical-volume exhaustion certification.

The final selected renderer image for this increment is
`sha256:ff1b4d0fe8d6adb0b69c293e5e26e8d15a782699f5e97e7264cb87bec408bb82`.
Its saved-image scan again inventories 181 Ubuntu and 39 Node packages and reports
19 medium/eight low Ubuntu rows with no high/critical or Node rows. Lower findings,
engine/licence review, native amd64 and independent security acceptance remain open.
Source publication remains on hold and the full production plan remains in progress.

## Trusted rules, local generation accounting and larger reports

The extension increment passed 223 macOS arm64 checks with no skips/failures and 214
clean Linux arm64 checks with nine optional checks not selected. Tests run the executable
owner-rule example, reject identifier collisions/invalid JSON and identity overrides,
retain missing evidence as untested and append versioned analyses without rewriting
history. Built-in rules and default adapters are unchanged; arbitrary callbacks remain
trusted code, not sandboxed plugins.

The next local generation-accounting increment passed 226 macOS checks with no skips
and 217 Linux checks with nine optional checks not selected. Fourteen focused model
contract checks verify probe/interpretation counters, concurrent reservations, failed
requests, missing/unsafe totals, reported output overruns and no stale usage reuse.
Counters are reported by the stubbed service, not a live model or billing provider.
The allowance is per invocation/provider instance; durable monetary accounting and
independent model quality remain open. See integrations.md and its primary API source.

The selected generation-accounting renderer image is
`sha256:7c94e29ad323e855088f238b57e5858c28277a039e4a09666c2a152ac7b93c7b`.
It carries Workbench's exact licence and notice files, with runtime regression coverage.
Its saved-image scan retains the 181 Ubuntu/39 Node inventory, 19 medium/eight low
Ubuntu rows and no reported high/critical or Node rows. CycloneDX still warns about
the non-SPDX M+ font expression; distribution/engine/independent gates remain open.

A current 1k full fixture-render audit completed all 1,000 renders in 544,289 ms, with
22,000 results, 33,781,712-byte saved files and 439,255,040-byte sampled Node RSS.
All eight streamed exports completed. A separate 10k automatic run completed in
109,602 ms with two actual template renders, 220,000 results, 297,003,352-byte saved
files and 577,880,064-byte sampled Node RSS; all eight exports completed. The remaining
9,998 pages were HTTP-only, not silently labelled rendered. Both used Node 24.15.0
on macOS arm64, 10 logical CPUs/16 GiB memory, explicit 1 GiB audit memory and 1 GB
logical storage. Concurrent work affects timings; browser/OS memory is excluded.
10k full rendering, broader trap/profile corpus and larger admitted capacities remain
unverified. Raw captures and reports are outside source.

A separate actual 10k HTTP fixture audit produced private/shareable HTML of 94,337,602
and 7,229,553 bytes. Headless Chromium 156.0.8078.4 loaded them in 1,775/451 ms at
1280×800 with zero external requests. They contained 20,000 individually explained
non-pass rows and retained technical text. Screenshot inspection checked the first
screen; print-media checks preserve coverage/actions/outcome counts and hide the large
page table, content passages and raw appendix. The full records remain on screen and
in machine exports. Long-document reading, physical pagination, screen readers and
other engines remain unverified. This measurement preceded the small copy/number-
formatting refinement; browser regressions cover those later changes and narrow-screen
wrapping of a deliberately long synthetic URL.

## Source aliases and maintained diagnostics

The source-boundary candidate passed 227 macOS checks with no skips/failures and 218
clean Linux arm64 checks with nine optional checks not selected. Data directories,
backups and exports reuse one helper. Actual macOS case aliases and directory links
identify the source by exact device/inode ancestry; similarly prefixed sibling folders
remain outside it. A separate reproduction confirmed case aliases exist while realpath
spelling differs on this Mac. This does not establish native Windows ACL or all
filesystem/race behaviour.

The diagnostic candidate passes 229 macOS checks without skips and 220 Linux checks
with nine optional checks not selected. Only maintained labels can cross adapter error
boundaries; arbitrary private-looking slugs and inherited object-property names are
masked. Literal production labels have specific public explanations. Storage FULL/
ENOSPC still use fixed categories, and the existing error/timeout/provider/crawl corpus
passed. The executable trusted-rule example also passed strict static type checking,
which is now included in the product check command.

The exact tested diagnostic renderer is
`sha256:29c6df5a49e9e84135ba4bdedbf7812f1084677a5fbcbbd59331d6e1aaedaa2a`.
Its saved-image scan reports 181 Ubuntu/39 Node packages, 19 medium/eight low Ubuntu
rows, and no reported high/critical or Node rows. It retains the project licence and
notices. This is local scan/isolation evidence, not engine, legal or independent
clearance. Full feature/native/assistive/live/independent gates remain unfinished.

Manual external-research imports now preserve keyword estimates (including missing
values), search-result samples and incoming-link samples with explicit supplier,
method, market, language, device, time and limitations. Checked project destinations
and recorded external references remain distinct. Private JSON/human reports retain
records; shareable reports omit them. These inputs never change crawl findings,
assert complete search/link coverage or create automatic content decisions. Local
CLI/schema/redaction acceptance passed; live supplier adapters and independent
accuracy acceptance remain open.

The combined Linux run exposed an audit timer rounding race: after a time-budget
rejection, another request could begin before the wall clock reached the rounded
deadline. The shared transport now retains that terminal timeout. A frozen-clock
regression covers an already queued request and a subsequent request without extra
network attempts. The failed run is retained as diagnostic evidence; it is not
counted as acceptance. Release archive destination checks also use filesystem
identity to refuse alternate-case source aliases while allowing unrelated siblings.

## Current local acceptance after research imports and terminal timeout repair

The macOS arm64 combined run passed 233 checks with browser, clean-package and
immutable-renderer checks enabled, with no skips. The Linux arm64 container run
passed 224 checks with nine optional browser/container checks not selected. The
new shipped keyword-example schema check subsequently passed with all three
research-import tests. No source change followed that combined run. Root structural
checks, candidate worktree privacy, a separate-index complete-candidate privacy
check, actual-index privacy, reachable-history privacy and redacted Gitleaks checks
passed. The separate index did not stage the real checkout.

The checked renderer is
`sha256:11f8a0048f5f018b6ef5ff4a8e541d048261f5f1ed243830154728cd3f9374e1`.
Pinned Trivy 0.74.0, using the available local advisory database and no vulnerability
exclusions, reported 19 medium and eight low Ubuntu findings, zero high/critical
and no Node-package findings. Its inventory contains 181 Ubuntu and 39 Node
packages. Advisory results are a dated snapshot, not proof of future safety or
independent browser/operating-system clearance.

A local deterministic archive was generated twice with identical bytes. Every
archive member passed content/privacy scanning; the narrowly admitted compiled
files matched the current build byte for byte and had corresponding source files.
Redacted Gitleaks scanned the extracted candidate before dependency installation.
A clean production-dependency install, compiled doctor and synthetic repair demo
passed, with complete before/after coverage. The local UI was restarted only after
verifying its process identity and absence of active or owned audit jobs. Private
audit histories were retained. The archive is a review snapshot, not a frozen full
release, and nothing was committed, pushed or published.

## Worker ownership increment — 2026-10-12

Schema 5 adds ownership metadata and a separate private SQLite lifetime lock.
A dead modern worker can be recovered even when its old process ID is reused;
competing workers and premature resume are refused while the lock is held. Recovery
preserves other paused/cancelled decisions. Claim/recovery metadata is transactional;
locks are released on failure, completion cleanup, Store closure or process death.
Lock files and side files use the same ordinary-file/link checks as private storage.
Do not delete or replace the lock file while any worker could be running.

Stop all old workers and clients before upgrading. A possibly live legacy owner
refuses migration without committing it. Concurrent old/new executables are not
supported. Preserve a verified stopped backup for rollback: older code refuses
schema 5, and reverting source does not downgrade private data. Ambiguous legacy
process-ID reuse remains conservative; native Windows and physical fault acceptance
are still unverified. Backup validation now checks that the actual copied snapshot
contains no queued, active or owned job, closing the initial-preflight race.

Current worker/backup acceptance passed on 2026-10-12: 239 macOS arm64 checks
with browser, package and immutable-renderer checks enabled and no skips; 230
Linux arm64 checks with nine optional checks not selected. The renderer was
`sha256:9e8e1edbe584a7d14c5a77527bcc1506c05dc64d4b8705e1326f7dd965260258`.
Pinned Trivy against the available local advisory database retained 19 medium
and eight low findings, zero high/critical, with no exclusions. This remains
a dated local scan, not independent security clearance.

The owned local UI server had no active jobs, was stopped, and its schema-4
database was backed up outside source with integrity/relationship/stopped-job
validation before upgrading. After compiled startup installed schema 5,
streamed hashes and row counts for every prior private table matched the backup.
No captured content or identifiers were copied into source or this ledger.
The verified recovery snapshot is retained privately; no history was rewritten.

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

Targeted verification acceptance passed with ruleset 0.1.4 on 2026-10-12: all
249 macOS checks with browser, installed-package and immutable-renderer checks enabled,
no skips; 239 Linux arm64 checks with ten optional browser/container checks not
selected. Nine actual HTTP/CLI/stdio cases plus the browser journey demonstrate
fresh dependency collection, full fallback, unchanged budgets, stale/partial/expired
evidence refusal, regression detection, header canonicals and retained/deleted
records. The renderer under this combined run was
`sha256:440dda3346b780f6d935e7b2850aefe73a8be696945ed633af6b339c12052e01`.
No live host/model or independent release clearance is claimed.

## Local Lighthouse increment on 2026-10-12

Five focused real-container checks passed, including maximum-five desktop and two
mobile fresh-browser runs, private series provenance and medians/ranges, crawl-policy
and resource refusals and worker reservation. A further actual HTTP/CLI/stdio MCP
workflow plus three unavailable-policy checks passed. It verifies cancellation
releases the slot and a forced series-save failure rolls back all new measurements.
Six browser/stdio lifecycle checks passed without skips, including the speed form’s
maximum default, readable missing-image error and restored controls.

The image under these focused checks was
`sha256:f3128cd19b87770f319b012bc3de0561888ec68e9ea6f39ee0f6d7ff95fe9d75`.
Its pinned Trivy 0.74.0 advisory snapshot reports zero high/critical, 19 medium and
eight low findings across 181 Ubuntu and 153 Node packages. The locked production
npm audit reports zero findings. This is dated local evidence, not final artifact
clearance or absence of vulnerabilities. Original worker/crawl and broader native,
scale, independent, live-provider and human acceptance remain separate.

## Vocabulary/reference increment on 2026-10-12

Ruleset 0.1.5 passed 267 combined macOS arm64 checks with browser, installed-package
and immutable-renderer checks enabled, no skips. The clean ordinary-user Linux arm64
container passed 253 checks with 14 optional browser/container checks not selected.
The new per-rule defect, valid counterexample and missing-evidence cases passed, as
did six focused vocabulary, reference, unsupported-mapping, document-base and
offline-builder checks. Stored/reanalysed findings retain explicit missing browser
values through JSON persistence. All root structural/helper gates passed.

The renderer under the combined run was
`sha256:f0a1b385d8a21b052ca808b4c62b9e34b14ea76cf58c713b2d3fb8edb7f61ecd`.
Its exact scan retains zero high/critical, 19 medium and eight low findings, with
181 Ubuntu and 153 Node packages. The locked npm production audit reports zero
findings. Schema.org data has separate CC-BY-SA-3.0 attribution; original software
remains MIT. The derived index rebuilt byte-for-byte from the reviewed source hash.
A synthetic compressed JSON fixture triggered the credential-URL heuristic; formatting
the original graph as readable synthetic data cleared it without changing the scan.
No exclusions were added. This does not close visible truth, engine-feature breadth,
native Windows, user live acceptance, assistive reading or independent release gates.

## Selected feature/text increment on 2026-10-12

Ruleset 0.1.6 passed all 278 combined macOS arm64 checks with browser,
installed-package and immutable-renderer checks selected and no skips. The clean
ordinary-user Linux arm64 container passed 262 checks with 16 optional browser/
container checks not selected. Five actual/focused feature-text checks passed,
including both browser boundaries, common CSS-hidden/visibility/opacity cases,
required-text contracts and conservative handling of truncated source text.

The exact renderer was
`sha256:91c98a3f1be38f4ffee036f3db9724ca1bb2060b54826a1ba158d006dffe4b67`.
Its scan retains zero high/critical and 19 medium/eight low findings. All root
structural/helper checks passed. Article recommendations cannot fail eligibility,
unknown mappings/references cannot establish required-field absence, and older
captures without rendered-text snapshots cannot satisfy browser text contracts.

This is selected field/name/headline acceptance. It does not establish factual
prices, authentic reviews, a physical business location, exhaustive visual truth,
provider policy compliance or actual search display. Wider profile, manual, native
and independent release gates remain open.

## Variant, language-cluster and cancellation increment on 2026-10-12

Ruleset 0.1.7 passed 284 combined macOS checks without skips and 268 clean Linux
checks with 16 optional checks not selected. The variant review resolves local
parent links, distinguishes group containers and individual offers, defers off-page
stubs and unvisited names, and passes an 800-group resource regression. The page
text snapshot includes legitimate footer text; the independent main-text contract
continues to exclude navigation and site furniture.

Ruleset 0.1.8 then passed all 293 combined macOS arm64 checks with browser, clean
installed-package and immutable renderer checks selected, no skips. The clean
ordinary-user Linux arm64 container passed 276 with 17 optional checks not selected.
The Linux first run found a stale ruleset-version assertion in the vocabulary test;
the assertion was brought to the deliberately versioned interpretation, without
changing outcomes or removing cases, and the complete Linux suite passed again.

Four language-declaration cases cover HTML, headers, non-HTML PDF clusters, bounded
malformed inputs, self/return/address/label/indexing/canonical review, actual crawl
discovery and scope-preserving targeted planning. The real browser/HTTP cancellation
journey passed both navigation and button paths, released worker ownership and saved
no partial series. A new ordinary-file vocabulary input check refuses directories,
unreviewed files and POSIX pipes with redacted errors and no created output.

The exact renderer was
`sha256:d9235234705873c97fc34281d7419d22fe3c957fae75aec049c642da87430d1a`.
Pinned Trivy reports zero high/critical, 19 medium and eight low findings across
181 Ubuntu and 153 Node packages. Root structural/helper checks passed. This is
local acceptance for the described increment. Wider specialist profiles, sitemap
alternatives, full code-registry checking, native Windows/amd64, live/model/host
quality, assistive evaluation and independent release clearance remain open.

## Durable model allowance/cache increment on 2026-10-12

All 302 combined macOS arm64 checks passed with browser, clean installed-package
and immutable renderer checks selected, no skips. A clean source-only ordinary-user
Linux arm64 container passed 285 with 17 optional checks not selected. Eight new
allowance cases cover immutable limits, cross-client restart, eight competing
processes, a killed reservation owner, cancellation, rollback, overruns, unpriced
monetary refusal, reports, selected retention and real CLI enrichment/restart caching.
An additional cache case verifies provider/model/prompt/evidence identity, changed
output limits and rejection of inconsistent saved advice. Actual MCP reads and
browser no-side-effect model-usage states passed within the adapter corpus.

The exact renderer was
`sha256:1086ac9af0c42750c53db24f8f977d0190b72c6f5305f8a5df3f6187b67bf124`.
Its pinned advisory snapshot retains zero high/critical, 19 medium and eight low
findings across 181 Ubuntu and 153 Node packages. All root structural/helper checks,
actual staged/history privacy checks, a complete candidate in a separate index, and
redacted Gitleaks on 16 reachable commits passed. The actual Git index is unchanged.
No publication occurred. Scanners remain heuristic; exact-image lower findings,
notices, native/architecture, assistive, live/interactive and independent gates stay
open. Accounting tests use wholly synthetic services; no real model or account
access, billing accuracy or model advice quality is certified.

## Owner editorial draft increment on 2026-10-12

All 305 combined macOS arm64 checks passed with browser, clean installed-package
and immutable renderer selected, no skips. A clean source-only ordinary-user Linux
arm64 container passed 287 with 18 optional checks not selected. Focused CLI acceptance
also passed after adding complete-draft input coverage to the content regression.
New cases cover required unmet need, successful same-audit existing evidence, source
bounds, internal-link scope, rollback/nested transaction safety, immutable captures
and analyses, latest owner corrections and legacy incomplete proposals.

The actual browser completed a new-page draft, added/removed source rows, refused
an absent unmet need, preserved the saved group/source fields and made no external
source requests. The narrow 375px layout and selected automated accessibility tags
passed. The broader browser run found an avoidable null-model-usage error in new
expired-session handling; the shared guard was corrected. A real cookie-expiry and
reload journey and the complete browser suite then passed. This is automated and
local journey evidence, not screen-reader or independent editorial certification.

The exact renderer was
`sha256:b420d20e55dd3135a60c0bc82e37dc136cbd6665333b164653dde71fbd3bd2c2`.
Its pinned scan retains zero high/critical, 19 medium and eight low findings. Root
structural/helper checks passed. SQLite remains schema 5 and SEO ruleset 0.1.8;
owner drafts append independently. References and complete drafts are not verified
truth or permission to publish. Wider collection/profile/import/outcome/scheduling/
workflow/scale and external release gates remain open.

## Local Chromium transition on 2026-10-12

The user accepted sandboxed local Chromium as the default for JavaScript rendering
and Lighthouse. Docker remains an explicitly selected optional path; a selected
container never silently falls back. The workers retain fresh sessions and the
host request broker. Local browser background channels and aggregate browser
CPU/memory have no container boundary; the threat model states this limitation.

The first combined macOS arm64 checkpoint passed 309 checks without skips, including
native desktop/mobile Lighthouse, the optional container, CLI/HTTP/SDK MCP and browser
journeys. Subsequent changes consolidated the demo/public renderer, added host-pipe
closure cleanup and a clean compiled-output build. The final native suite passed 299 checks, with 11 optional container checks not
selected because Docker was unavailable (310 total). The earlier 309 count does not
establish that the newest optional image is verified.
The compiled native CLI, HTTP and SDK MCP Lighthouse journey passed, as did both
workers' host-pipe-loss checks. No private website or provider input was added.

One Linux worker test failed intermittently. A controlled forced-GC reproduction
showed its idle child discarded the unreferenced Store while the process stayed
alive; SQLite finalization released the lock. Retaining the Store in its live
callback preserved ownership. The fixture now forces GC before announcing readiness.
Twenty repeated corrected Linux worker suites passed; the corrected clean Linux
checkpoint passed 288 checks with 21 optional browser/container checks not selected.
This does not establish native Linux browser or Windows acceptance. The main worker
retains its Store throughout collection/analysis and closes it in its finally block.

Current ruleset 0.1.8 synthetic HTTP benchmarks completed 1,000 and 10,000 pages, with
27,000 and 270,000 saved rule results and all eight streamed report/profile exports.
Collection/analysis took about 3.7 and 122 seconds, with measured Node-process peak
RSS about 426 and 561 MiB. Sampled local rendering completed the same inventories
with two rendered pages each, about 6 and 127 seconds, and all eight exports. These
are loopback fixtures; timings exclude exports, RSS excludes browsers/OS and all
transient allocations, and concurrent local validation may affect durations. A
1,000-page full local-render benchmark also completed: all 1,000 pages rendered,
27,000 rule results saved and all eight exports succeeded. Collection/analysis took
about 798 seconds, with measured Node-process peak RSS about 426 MiB and about
41 MB of saved data. Browsers and operating-system memory remain outside that RSS
measurement. No 10,000-page full
render or real-network throughput claim follows from sampling.

The optional image at the first checkpoint had no reported high/critical findings
and 19 medium/8 low findings, without exclusions. Its broader applicability/notices
review remains open. Docker later stopped responding; rebuilding the newest worker
image could not run. Keep latest optional-image acceptance pending rather than
restarting a shared daemon or asserting that the prior scan covers newer artifacts.
The discovery-limit valid counterexample passed in the four-case capacity suite:
reaching the exact allowance without omitting a candidate remains complete. Source
remains local and the full release plan remains open.


## Complete Docker removal — 2026-10-12

The user requested removal of Docker completely. Runtime image settings and
launchers, the image build definition, copied sandbox profile and associated notice,
and the image CI job are absent. Rendering and Lighthouse launch local Chromium
with sandboxing enabled. Historical container observations above are retained as
historical evidence only. Existing database schema and saved audit evidence are
unchanged. Retired image options are rejected instead of silently selecting native
execution. No Docker daemon, image or service was used for this checkpoint.

The final macOS arm64 suite passed all 304 tests with browser and clean-package
checks selected, zero skips and zero failures, in about 224 seconds. This includes
native rendering/readiness, deadlines, cancellation, host-pipe loss, resource policy,
JSON output limits, desktop/mobile Lighthouse and compiled CLI/HTTP/SDK MCP journeys.
The clean-package test built deterministic archives, installed independently and
exercised compiled workers and MCP. Strict source/browser checking and the compiled
build passed. The native doctor reported installed Chromium. A static check confirmed
retired files are absent and runtime, packaging source and CI contain no Docker
commands or settings. The first full run exposed an incorrect new test expectation
for a CLI input-error exit code; the corrected expectation was verified in the final
full suite. No runtime failure was hidden or excluded.

The locked runtime dependency audit reported zero known vulnerabilities. Root
structural/helper checks, reachable-history privacy and redacted Gitleaks passed.
These checks do not certify native Windows/Linux browser acceptance, independent
security review or the whole production-readiness plan. Source remains local and
publication remains on hold.


## Saved Search Console sample comparisons — 2026-10-12

Added explicit saved-period selection through the UI, compiled CLI, protected HTTP
and official SDK MCP `audit_results` views. New imports can record AND filter
clauses; the current Google adapter records no filters. Legacy imports remain
readable with unknown filters and are not retroactively rewritten. Comparisons
require distinct, ordered, equal-length windows and matching methods, search type,
aggregation and filter metadata. Project-scoped identifiers prevent selecting
another project's imports. Import reads retain their cumulative UTF-8 budget and
return record identifiers with their data from the same SQLite statement.

Only matched query/page/country/device records contribute to sample deltas.
Unmatched records, missing groups, zero-denominator or non-finite percentages stay
unknown. CTR is recomputed from matched sums; no average-position or causal
ranking/content-decay claim is made. Source limitations, partial coverage and
seasonal/reporting/site-change confounders remain explicit. No provider call, model
request, new database schema or historical evidence mutation is involved.

Six focused comparison tests passed, including compiled CLI/SDK MCP, protected
HTTP, real sandboxed browser selection, 101 saved-period choices, 101 page groups,
immediate file-import availability, project refusal, legacy inputs, corrupt rows,
window/filter/method mismatches, empty data and numerical bounds. The combined
provider/import/comparison checkpoint passed 16 tests with no skips. The final full
macOS arm64 suite passed all 310 tests with browser and clean-package opt-ins, no
skips or failures, in about 229 seconds. Strict source/browser checks and clean
compiled build passed. A later focused accessibility/status checkpoint also passed
all six comparison tests. Root structural/helper suites, reachable-history privacy
and redacted Gitleaks passed.

This verifies the stated saved-Google-sample workflow, not live Google accuracy,
other supplier/analytics outcomes, independent content review, assistive-technology
certification or broader release readiness. Source remains local and publication
is still on hold.


## Owner-normalised site-data imports — 2026-10-12

Added a strict, bounded manual JSON interchange for Bing search, analytics,
aggregate access logs and third-party crawl records, with four wholly fictional
examples. Provider/version, period/time zone, filters, sampling, completeness and
source limits are retained. Missing metrics remain null. Raw log/client fields,
invalid numbers/windows, duplicate sample IDs and invalid project origins/pages are
refused before any import is saved. Query-only Bing records can retain an unknown
destination. Verified-bot labels require a supplied method but remain owner claims.
Imports cannot create observations, change rule outcomes or fetch referenced pages.

UI, compiled CLI, protected HTTP and official SDK MCP share project-scoped file
metadata and selected row views. Original records are paginated rather than
truncated to fit a tool response. File and record pagination preserve identifiers;
new UI uploads appear immediately. UI submission fixes the selected import type
and disables fields until completion, and appended files are deduplicated. Private
JSON retains full rows and explicit unavailable crawl evidence. Human HTML/Markdown
explain source limits and preserve technical records; shareable exports omit all
site-data details. HTML escapes supplied text, while Markdown contains it in
indented code blocks. The first focused run had an incorrect Markdown assertion
that forbade preserved literal text even inside a code block; the corrected test
checks containment rather than claiming that source-string absence proves safety.

Six site-data tests passed, including all four examples, bad/unknown provenance,
missing metrics, raw-log fields, atomic refusal, report escaping/redaction, compiled
CLI/SDK MCP, cross-project refusal and real browser upload/101-row pagination.
The combined import/comparison checkpoint passed 16 tests with no skips. A further
14-check report/streaming checkpoint passed with no skips. The full macOS arm64
suite passed all 316 checks with browser/clean-package opt-ins, no skips or failures,
in about 228 seconds. Strict source/browser checking and clean compilation passed.
A capacity self-check retained all 10,000 admitted records in paginated reads and
private JSON, and refused 10,001 without creating a partial import. Root structural
and helper checks, reachable-history privacy and redacted Gitleaks passed.

This verifies the documented local JSON import contract, not direct vendor CSV/API/
database/raw-log formats, live provider access/accuracy, bot identity verification,
combined cross-provider business outcomes or full release readiness. No dependency,
network service, database migration, source publication or private account was added.

Final candidate review passed source privacy, actual-index privacy (empty), a
separate candidate-index scan and redacted independent scanning of the candidate
patch (about 1.96 MB). The actual index was not changed. A later six-case site-data
checkpoint uploaded script-shaped provider text in the actual browser, verified
it remained text without creating a script node or window side effect, and checked
restored controls. The local preview was restarted only after an ownership/active-
job check and retained its external private database. No source was published.


## Trusted extractor and provider contracts — 2026-10-12

Added explicit trusted in-process extractor definitions, synchronous callbacks and
a working owner support-link example. Required response/initial-HTML/observed-DOM
evidence is checked before execution. Each callback receives a detached capture
copy with its object-method receiver preserved. Nonempty JSON facts are limited
to 100 top-level names and 100,000 serialized UTF-8 bytes. Invalid, asynchronous,
oversized or throwing results become fixed, explicit errors without private
diagnostic values or metadata overrides. Stored facts carry deterministic
extractor/version/immutable-observation identities. Reanalysis retains the original
captures and facts. Private JSON preserves namespaces and coverage counts;
shareable reports omit their identities/data. Namespace bytes are charged in the
analysis memory preflight, including responses without initial HTML facts.

Registered definition metadata is recorded as a compact manifest atomically with
worker ownership. Missing/changed callbacks cannot silently resume a custom audit;
refusal leaves its prior state/ownership intact. The standard application facade
also refuses such resumes before launching a worker. New extractors cannot be
attached to an already captured unregistered audit. JSON project configuration or
serialised definitions cannot load modules or functions. No callbacks are persisted
or loaded automatically by CLI/HTTP/browser/MCP workers.

Provider definitions now require literal consent, valid control-free identifiers
and actual capability callbacks; probed model names are validated. Provider/model
provenance is captured consistently rather than following later adapter mutation.
A deterministic local abstention example compiles and executes; it is not a model
or live supplier-quality test. Existing model-allowance, Ollama and enrichment
checks still pass. No dependency or service was added.

The 38-check focused rule/extractor/provider/allowance checkpoint passed without
skips. The first full run passed 325 of 327 but found two failures: missing public
explanations for new internal extractor errors, and an intermittent expired-session
UI message race. Background status polling replaced the useful reload explanation
with a generic connection message; obsolete-view notices could also replace current
messages. Maintained explanations were added, and polling/stale-notice handling was
fixed. The browser regression now retains the exact session explanation across a
polling interval and successfully reloads. All 20 repair/browser/error checks passed.
The final full macOS arm64 checkpoint passed all 327 tests with browser and
clean-package opt-ins, no skips or failures, in about 230 seconds. Strict checks,
three executable extension examples and clean compilation passed. Root structural/
helper checks, reachable-history privacy and redacted Gitleaks passed.

This proves the stated local interfaces and workflows, not arbitrary callback
CPU/memory/network containment, plugin safety, external model quality, independent
SEO validation or native cross-platform acceptance. Trusted callbacks can access
the process; detached inputs and validation are not a code sandbox. Database schema
5 and existing capture history remain unchanged. Source remains local/on hold.

After the full checkpoint, manifest fingerprinting was made independent of JSON
object-property order while preserving declared extractor/source ordering. The
23-case extractor/worker/recovery checkpoint passed, including that counterexample,
missing/changed definitions and prior state/lock preservation. Strict checks and
clean compilation passed again. Final candidate privacy and redacted independent
credential scanning passed; the actual Git index remained empty.

The final worktree library check subsequently failed its catalogue/package inventory
gate because a separate untracked `skills/agentic-skills-awesome-copy/` appeared
without a catalogue entry. The earlier eight-package root suite passed before that
work appeared. This phase does not modify or register the separate package. Product
tests and the explicitly selected candidate privacy/credential checks remain passed;
the current repository-wide library gate is not green and must be reconciled with
that package's owner before the final release review.

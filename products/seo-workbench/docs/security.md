# Threat model and enforced boundaries

Current browser execution uses local sandboxed Chromium only. Container execution
and its build/CI assets were removed on 2026-10-12 at the user’s request. Older dated
image-scan notes below describe retired preview experiments, not current setup,
release requirements or a supported execution path.

This preview assumes a trusted computer and trusted local users/processes. It is not an authenticated remote
service or multi-user SaaS. Security reports follow the root SECURITY.md private
reporting channel. The user has not authorized publishing or production-site writes.

| Trust boundary        | Threat                                                                          | Current enforcement / limitation                                                                                                                                                                                                                                                                                             |
| --------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Untrusted URL and DNS | SSRF, metadata/private targets, rebinding                                       | WHATWG HTTP(S) URLs, no userinfo, exact origin/path scope; every connection validates all DNS answers and pins one validated address in the socket lookup; mixed answers rejected                                                                                                                                            |
| Redirects             | Scope escape and credential leakage                                             | Explicit one-hop fetches, recheck scope/robots/network; anonymous headers, no cookie jar/auth; hop/loop bounds                                                                                                                                                                                                               |
| Local development     | Access to unrelated internal services                                           | Operator CLI exact loopback HTTP origin/port grant, separate from imported config; no global private-networks switch                                                                                                                                                                                                         |
| Browser JS            | WebRTC, service worker, proxy bypass, local service access, state effects       | Default: fresh local sandboxed Chromium with host-brokered page requests, blocked service workers/WebSockets and bounded capture. Routing is not a firewall; browser background channels are not covered by routing; browsers share host CPU/memory. Chromium sandboxing stays enabled, and no container launcher is present |
| Website fetch         | State-changing GET, access denial, flooding                                     | Known transactional/admin routes and sensitive parameters blocked; anonymous GET only; stop on 403/429; serial queue, delay, request/page/time/size/storage limits. GET alone cannot guarantee no side effects; owners must review scope                                                                                     |
| HTML/XML/JSON         | XSS, entity resolution, malformed payloads                                      | Static Cheerio extraction, no fetched-script execution in HTTP path; XML DTD/custom-entity declarations rejected before parsing; ordinary character escapes decoded; bounded body and JSON input sizes                                                                                                                       |
| Reports               | Stored XSS, automatic remote resource requests, CSV formulas, terminal controls | HTML escapes every capture and uses restrictive CSP; no captured executable markup; Markdown evidence is indented text; CSV quotes/guards formula prefixes; diagnostic codes suppress raw errors                                                                                                                             |
| Local UI              | DNS rebinding, CSRF, unauthorized reads                                         | Bind 127.0.0.1 only; exact Host, Origin/Sec-Fetch-Site checks, random HttpOnly SameSite cookie, same-origin JSON mutation, no CORS; local accounts/processes remain trusted; cookies do not authenticate operating-system users                                                                                              |
| MCP                   | Unbounded reads, arbitrary execution or policy changes                          | Fixed tools, strict schemas, bounded pagination/response/resource sizes; no shell/SQL/scripts/filesystem policy tools. Host/operator must approve authorized targets; annotations are not authorization                                                                                                                      |
| Configuration/imports | Code execution, duplicate metrics, path traversal                               | Strict schemas, no executable plugins/config, bounded JSON, scope/dimension checks; input file selection is explicit CLI operator action                                                                                                                                                                                     |
| Private storage       | Accidental publication, symlinks, retention                                     | Canonical external data directory, source-tree rejection, database/side-file symlink and hard-link rejection, directory 0700/database 0600; no telemetry; exports outside checkout refused if target exists. Content is private by default, not automatically PII-redacted                                                   |
| AI/providers          | Exfiltration, malicious suggestions, invented facts                             | No provider enabled by default. Optional local Ollama and Google data adapters require operator consent; packets/schema/budgets are bounded and permissions remain outside models                                                                                                                                            |

HTTP supports identity, gzip, deflate and Brotli, including up to three declared
encoding layers. Downloaded bytes and every expanded layer must fit the response
allowance; expansion stops on cancellation or the request/audit deadline. Gzip
sitemap files are unpacked separately under the same expanded-size allowance and
audit deadline. Malformed compression leaves the response or sitemap unavailable.
Download accounting records wire bytes. Saved compressed responses retain both the
original encoded bytes and decoded representation; bounded MCP tools and analysis
projections omit both body representations. Chromium receives decoded bytes with
the encoding header removed. Known HTTP(S) proxies/environment variables are not used by the native direct
transport. Production origins use public unicast IPs and ports 80/443; IPv6 mapped ranges
are classified through ipaddr.js. This is application enforcement, not a firewall.

Access denial and rate limiting still stop the audit without automatic retries.
Server-error retries and redirect follow-ups honour valid `Retry-After` delays,
using the existing backoff when a retry header is invalid. A wait that cannot fit
within the remaining allowance stops with explicit partial coverage. Saved wait
deadlines survive pause/restart; cancellation stops the timer, and unfinished work
remains recoverable. Failed-request diagnostics contain fixed categories rather
than raw network exception messages. See
[HTTP Retry-After semantics](https://www.rfc-editor.org/rfc/rfc9110.html#section-10.2.3).

Stored raw bodies/redirect headers can contain private website content or embedded
identifiers. Use only authorized sites and minimal profiles. Shareable exports omit
URLs/content/contracts but retain rule counts: review inference risks before sharing.
Do not commit exports, even from genuine public sites. Only synthetic fixture source
is part of this repository. All release and CI logs remain publicly reviewable.

Audit deletion is logical deletion plus WAL checkpoint, not guaranteed physical erasure
from SQLite free pages, SSD snapshots/backups or copied reports. No automatic retention
scheduler is claimed. Close jobs before deleting. Optional Google API adapters require explicit operator transfer consent and ephemeral
external credentials. Endpoints are fixed and validated; no private account or live
provider was used to verify them. Native remote lab fetch guarantees remain provider-owned.

Remote hosting, authenticated crawls,
credential import and archive import are unsupported. Local Chromium rendering is supported with the sandbox enabled; it has no container egress/resource guarantee.

## Release blockers

Browser background channels beyond the brokered page-request boundary; broader
process/OS fault corpus; retained capture cleanup; browser dependency notices review;
untested installation platforms; broader robots RFC corpus. Atomic worker/crash resume,
resource guards, clean external npm install and scoped robots redirects have been tested. An independent vulnerability review is still required. A green suite is
not an absence-of-vulnerabilities claim.

## Deliberate private-state cleanup

`delete AUDIT --confirm-delete` removes one audit and its content/action decisions.
Project-level provider imports survive that scoped operation. `delete-project PROJECT
--confirm-delete` transactionally removes that project's imports and all audit histories,
refusing any owned worker. Other projects survive. Both operations require explicit
operator selection and confirmation; neither promises SSD/backups/report-copy erasure.
No retention scheduler or silent remote data deletion is installed.

## Local release audit on 2026-10-11

A further source review repaired five concrete failure cases:

- A dangling database symlink bypassed the earlier existence check. The main file and
  SQLite WAL, shared-memory and rollback-journal paths now use link-aware inspection
  before the database opens. Synthetic checks confirm no linked target is created.
- Shared hard links and non-file database paths are refused without modifying the
  unrelated file. Existing regular private databases remain usable.
- JSON input was fully read before its size was checked, and content-review input
  bypassed that check. All operator-selected JSON uses one bounded descriptor reader,
  rejects non-file inputs and enforces the limit even if a file grows during reading.
- A port already in use emitted an uncaught startup error. Startup now rejects with
  a fixed explanation without exposing network diagnostics.
- Newer database versions were refused after changing their journal mode. Version
  refusal now precedes journal changes; a regression preserves the newer schema,
  original record and journal mode.

The review covered the storage constructor, CLI input/export callers, local HTTP
startup and request boundary, MCP tool/resource contracts and release workflows. It
is a maintainer source review, not an independent penetration test. Preflight file
checks cannot prevent a trusted same-user process from racing file replacement.
Windows ACLs, interactive model behaviour, live provider access and the broader
independent vulnerability/SEO review remain outstanding.

The filesystem and startup handling follows Node’s official
[filesystem API](https://nodejs.org/api/fs.html) and
[server startup API](https://nodejs.org/api/net.html#serverlisten), checked alongside
actual Node 24.15.0 regression tests. No external site captures, credentials or private
reproduction data were added to source.

## Crawl and response-rule review

Sitemap URL extraction now decodes character escapes, supports namespace-prefixed
core tags, preserves literal CDATA and rejects multiple roots or malformed locations
without silently reporting an empty inventory. Empty inventories are tolerated for
discovery; this parser is not a complete Sitemap XML-schema validator. Namespace
extensions and the parser’s named-entity tolerance do not certify engine acceptance.
DTD and custom entity declarations remain blocked before parsing.

The pinned robots parser is retained behind a narrow input adapter. Tests cover
unreserved percent encoding, reserved separators, Unicode, repeated agent groups,
empty final groups, extension records, longest matches and allow/disallow ties.
Cross-origin robots redirects remain restricted by the operator’s configured scope;
this deliberate safety restriction is narrower than RFC 9309’s redirect advice.
These checks do not establish exhaustive robots-protocol conformance.

Canonical Link fields are interpreted without splitting commas inside URLs or quoted
parameters. Unsupported anchors, extended relations, repeated relation parameters and
malformed fields leave the canonical checks unverified. Safe discovered targets still
pass through the same crawl scope, robots and network policy. No header can grant
network access. The initial and rendered HTML remain separate captured facts.

New HTTP captures retain separate X-Robots-Tag fields, without retaining cookies or
authentication fields. Google-oriented indexing checks ignore unrelated crawler
restrictions and snippet-preview settings. Older merged scoped fields can be
ambiguous; affected checks ask for a fresh capture instead of reporting a pass.
Provider control views retain these fields as informational evidence.

Research checked against the [Sitemap protocol](https://www.sitemaps.org/protocol.html),
[RFC 9309](https://www.rfc-editor.org/rfc/rfc9309.html),
[Google response indexing instructions](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag),
[Google canonical declarations](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)
and [RFC 8288](https://www.rfc-editor.org/rfc/rfc8288.html) on 2026-10-11. The
synthetic fixtures are original; no test website content was copied into source.

## Historical Debian renderer image dependency audit

The optional renderer was rebuilt on 2026-10-11 using pinned Node 24.21.0 on
Debian 13, with the current repository lock and Chromium. Package installation
updates Debian packages and removes npm, npx, Yarn and the unused X server from
runtime. Six container checks passed, including actual sandboxed rendering,
blocked direct networking and blocked broker requests outside scope. This does
not establish browser or operating-system vulnerability freedom.

Trivy 0.74.0 examined saved image archives locally, with telemetry and version
checks disabled, offline package analysis and vulnerability scanning only. The
advisory database was downloaded; source, captures and images were not uploaded.
The updated Linux arm64 image contains 170 inventoried Debian packages and 40
Node packages. It has no reported Node package findings. Debian findings remain:
116 low, 135 medium, 62 high, one critical and 12 unknown package/advisory rows.
No Debian finding has a fixed version available in that scan's database. Counts
are package/advisory rows, not distinct vulnerabilities or demonstrated exploits.
The earlier Debian 12 image had 504 Debian and 28 Node package findings.

The critical row is CVE-2026-6653 in libxml2. Debian confirms the stable package
is affected, while describing this issue as minor and without a stable security
update. Other libxml2 findings include CVE-2026-86138. The package is present
through the Mesa/LLVM browser dependency chain. Direct Chromium linking does
not prove it unreachable: dynamically loaded graphics libraries also matter.
The networkless container and bounded broker reduce exposure but do not remove
parser risks from untrusted page content. No scanner exclusion or severity
suppression was added. Do not distribute this image until material findings
have been repaired or individually reviewed with evidence of applicability.

References: [Debian CVE-2026-6653](https://security-tracker.debian.org/tracker/CVE-2026-6653),
[Debian CVE-2026-86138](https://security-tracker.debian.org/tracker/CVE-2026-86138)
and [Trivy image scanning](https://trivy.dev/latest/docs/target/container_image/).
The repository's npm advisory check is separate: it covers the locked application
packages, not operating-system libraries or bundled browser code. Container
inventories and licence notices still need distribution review. Re-scan each
rebuilt image; the pinned base alone does not fix the versions downloaded by apt.

## Crawl pacing follow-up

Crawl-delay extensions no longer split adjacent user-agent records before shared
allow/disallow rules. Repeated matching groups retain the longest valid delay,
including decimal seconds; negative, nonnumeric and nonfinite values are ignored.
Explicit matching groups do not inherit a wildcard delay. These are conservative
operator pacing semantics for an extension outside RFC 9309, not a claim that all
search engines interpret crawl-delay the same way. Existing global delay, request
budgets and cancellation remain in force. The pinned path matcher is unchanged.

## Renderer dependency follow-up and Product detail review

A package-manager removal simulation confirmed that removing libxml2 would also
remove libgbm1, Mesa and LLVM. Chromium depends on libgbm1; this is not an unused
standalone XML tool that can be safely pruned. No removal or unsupported stable/unstable
package mixing was applied. The renderer dependency gate remains open.

The selected Product-field check now distinguishes empty data from populated detail
objects and unresolved references. Resolution is local and bounded by the existing
structured-data traversal; it never downloads JSON-LD contexts or referenced IDs.
Duplicate typed IDs and unsupported containers remain unverified instead of guessing
how an engine will merge them. This is a presence check, not full validation of offers,
ratings, reviews or visible claims. Tests include free prices, empty values and arrays,
foreign contexts, unique/missing/duplicate references and unsupported containers.
The interpretation was checked against [Google's Product snippet documentation](https://developers.google.com/search/docs/appearance/structured-data/product-snippet)
on 2026-10-11. Original synthetic fixtures were used throughout.

## Production control and packaging follow-up

Late/duplicate worker regressions now execute actual CLI subprocesses and check that
stopped/completed states and active ownership are preserved, with no new requests.
Conditional startup failure writes also preserve operator decisions. Atomic claims
require a runnable state. An older recovery fixture previously claimed a paused job;
it now asserts refusal and explicitly queues a resume before testing dead-owner
recovery. Its history-pagination and capacity assertions remain intact.

Renderer acceptance covers pre-cancellation, expired allowances, cancellation during
real isolated readiness and a browser exceeding the audit's remaining allowance.
The retired image had the OS advisories documented above. Lifecycle
fixes do not clear that dependency gate or certify resistance to browser exploits.

Archive regressions cover oversized inputs, dangling output links, unsupported input
symlinks, preserved existing output and simulated write failure cleanup. A POSIX FIFO
input is also rejected without reading it; Windows does not run that POSIX-specific
case. These checks do not claim native Windows filesystem/privacy acceptance.

Renderer output accounting now checks stream chunks before line parsing. A worker
that never terminates a message cannot evade the total output allowance by making
readline accumulate it indefinitely. A native synthetic page now exercises this
boundary by producing a result whose encoded output exceeds the permitted size.
Pre-cancellation and exhausted audit time are refused before launching Chromium.

## Report, session and measurement boundaries

CSV cells remove control bytes and guard formula prefixes after whitespace or format
characters, including full-width variants. Quoting and quote escaping remain in place.
These are output-byte checks, not a certification of spreadsheet behaviour after
editing, saving or reopening. [OWASP's CSV guidance](https://community.owasp.org/attacks/CSV_Injection)
notes that no mitigation is universal. Use JSON for lossless machine interchange.

Shareable coverage is now projected from explicit public aggregate fields. Discovery
labels, raw stop codes, profile breakdowns and future coverage extensions are not
copied automatically. A synthetic private-metadata marker stays absent from all four
shareable formats and remains present in the private report. The profile minimizes
content; recipients can still learn disclosed audit counts and status, and a person
must review an export before sharing it.

Session values must be exactly 64 lowercase hexadecimal characters before constant-time
comparison. Invalid multibyte cookie values are denied rather than reaching a buffer
length error. JSON mutation requests accept the common UTF-8 charset parameter while
preserving same-origin and session checks; other media types/encodings are refused.
This loopback service assumes a trusted local user and is not a multiuser hosting service.

JSON decoding for local files, HTTP mutation bodies, Google provider responses and the
local model transport now rejects invalid UTF-8 instead of replacing undecodable bytes.
Original valid Unicode text is supported. HTML response decoding continues to use its
separate charset-aware extractor. Existing saved evidence is not rewritten; replacement
characters already present in an old record cannot be recovered by this change.

New performance imports and provider outputs reject inverted/one-sided periods and
origin measurements containing page paths, queries or fragments. Historical shape-valid
records remain inspectable; inconsistent provenance is listed in plain language and
budget comparisons are unverified. The stored source record is unchanged. The exported
parsePerformance helper enforces the new boundary; PerformanceImport remains the
compatible structural schema for inspecting retained records.

CrUX records must match requested scope and device. Changed page keys require matching
normalization details and the same origin; helper results retain requested and normalized
URLs. PageSpeed checks its requested URL and returned device, while retaining final URLs
for real redirects. No live provider was contacted. Official references checked on
2026-10-11: [CrUX data scopes and periods](https://developer.chrome.com/docs/crux/api/),
[CrUX normalization](https://developer.chrome.com/docs/crux/guides/crux-api),
[JSON encoding](https://www.rfc-editor.org/rfc/rfc8259#section-8.1) and
[Node 24 HTTP interfaces](https://nodejs.org/download/release/v24.15.0/docs/api/http.html).

The UI issues its session cookie to local visitors. Loopback binding and browser checks
do not distinguish operating-system accounts. Use the UI on a trusted computer; shared
or untrusted local users require a separately authenticated deployment, which is not
implemented. Private file permissions do not add OS-user authentication to HTTP.

Finding queries iterate stored rows and count serialized decoded bytes before retaining
results, with a ceiling of one quarter of the saved memory allowance. This is a data
budget, not a hard process-memory ceiling: JavaScript objects, temporary decoding and
report formatting add overhead. Negative, fractional and non-finite pagination is
refused before SQLite execution. A whole-result read cannot silently stop at one
million records; reports/comparisons check the actual count before loading findings.
Facts-only projections count retained headers and attempt metadata as well as page
facts while excluding bodies and rendered DOM. CSV avoids unused report projections.
Paginated findings remain available when a whole report exceeds its allowance. These
checks do not establish large-report throughput or complete streaming export support.

Owner-review requests must name the current analysis; a transaction prevents analysis
replacement between validation and saving. Old unbound reviews are retained without
applying them to current triage. Browser imports reject malformed UTF-8/JSON locally
with fixed explanatory text. Optional enrichment validates numeric allowances before
adapter work, checks cancellation before probes/interpretation and rechecks the call
allowance after asynchronous setup. These are local contract protections, not evidence
of a live model’s advice quality, actual billing or host prompt-injection resistance.

Explicit verified backups and previewed retention are documented in
[backup, recovery and retention](maintenance.md). They preserve active jobs and provider
imports and do not run automatically or promise physical erasure.

## Historical Ubuntu renderer candidate — retired

On 2026-10-11, the renderer moved to pinned Ubuntu 26.04 with the pinned official
Node 24.21.0 runtime. Playwright's installed platform selector supports Ubuntu 26.04;
actual arm64 sandboxed Chromium, broker isolation and lifecycle checks passed.
The exact image ID is sha256:c9f6babf648940bf05a8b290e48340d19e9c6135526411b9c4d64b206fc481c5.
Trivy 0.74.0 scanned its saved archive locally with the existing advisory database,
telemetry/version checks disabled and no source/image/capture upload. It inventoried
182 Ubuntu packages and 39 Node packages: 39 medium/eight low Ubuntu rows, no Node
findings and no high/critical rows. The unused base-image Pebble supervisor and Node
Corepack proxy were removed; regression checks enforce their absence alongside npm,
Yarn and the X server. The Ubuntu base remains maintained rather than mixing Debian
stable and unstable libraries. The old Debian scan remains historical evidence.

A CycloneDX dependency/vulnerability inventory was generated locally. It does not
resolve lower advisories, certify bundled Chromium against all engine advisories or
supply independent licence/security clearance. Native amd64 image acceptance and
public distribution notice review remain open. No scan exclusions or ignore-unfixed
flag were used. The former CI definitions built one image, test that immutable ID
and reject high/critical scanner findings; those definitions have not run publicly.

References: [Ubuntu 26.04 release notes](https://documentation.ubuntu.com/release-notes/26.04/)
and [Ubuntu libxml2 package](https://packages.ubuntu.com/resolute/libxml2-dev).
Renderer deadline reasons now reflect which allowance bounded the timer, including
an early timer callback near the wall-clock boundary. Time limits are unchanged.

The subsequent recovery/report candidate was rebuilt and checked at immutable ID
sha256:1e9269f3b70228569e719f6239345564f006bd431e3b506c00f7451df6c56e07. Its saved-archive scan again reports 182 Ubuntu and 39 Node
packages, 39 medium/eight low Ubuntu findings and no high/critical or Node findings.
All selected container checks passed in the final 203-check local suite. Local
CycloneDX generation reported an unrecognized SPDX licence expression for the M+
fonts; that licence must be reviewed separately before public inventory/notice approval.
No independent security, licence or browser-engine clearance is claimed.

## Historical GNU utility renderer increment — retired

The next exact arm64 image is
`sha256:6c31e33a49e8a1adf61f7fb217e14f1c93fcdc15d6f64732a2c5c50507b74379`.
It uses Ubuntu's supported GNU utility provider, with `gnu-coreutils` version
9.7-3ubuntu2.1, and removes the unused Rust provider. The runtime regression checks
both the GNU binary and absence of the Rust multicall binary. This changes installed
software; it does not exclude advisories or weaken the browser boundary.

The saved-image Trivy 0.74.0 scan inventoried 181 Ubuntu and 39 Node packages, with
19 medium and eight low Ubuntu rows and no reported high/critical or Node rows.
It used the existing local advisory database without ignore-unfixed or other scan
exclusions. Twenty medium Rust package rows from the preceding image are removed.
Remaining rows concern graphics/font support, glibc, XML, regex/compression libraries,
Avahi, certificate support, tar and other system packages; no fixed version is listed
for those rows in this scan. These packages may remain relevant to untrusted browser
input. Distribution severity is not a universal risk rating or engine clearance.

The CycloneDX warning identifies the M+ font portion of `fonts-wqy-zenhei`. Its installed
copyright file contains the permissive use/copy/distribution terms and warranty notice;
the warning is an unrecognized licence expression, not a finding that the licence is
absent. The original file is retained. Node, Playwright and headless browser notices
are also retained in the image. This inspection does not complete GPL corresponding
source obligations, all bundled Chromium notices, independent legal review or native
amd64 acceptance. No image is distributed or supported by the current product.

References: [Ubuntu's supported utility providers](https://documentation.ubuntu.com/release-notes/26.04/summary-for-lts-users/)
and [GNU coreutils security update](https://ubuntu.com/security/notices/USN-8697-1).

The source-reference/storage-fault candidate is rebuilt at immutable image ID
`sha256:ff1b4d0fe8d6adb0b69c293e5e26e8d15a782699f5e97e7264cb87bec408bb82`.
Its saved archive has the same 181 Ubuntu/39 Node inventory and 19 medium/eight low
Ubuntu findings, without reported high/critical or Node findings. All selected renderer
checks passed in the 219-check macOS suite. This does not close the preceding gates.

Source-adjacent data, backup and export checks now share platform path semantics and
filesystem identity checks. On the tested macOS filesystem, differently capitalised
paths exist but `realpath` does not give them identical spelling; text-prefix checks
can therefore miss an alias. The helper compares ancestor device/inode identity using
exact integers, including a not-yet-created output beneath an aliased folder. Regression
coverage uses actual case/directory-link aliases and sibling boundaries. This does not
certify native Windows ACLs, every filesystem or replacement races by a trusted user.

Adapter diagnostics now admit only maintained public error labels. An arbitrary
slug-shaped exception message cannot be echoed as a code; unknown diagnostics receive
the fixed operation-failed label. Known production labels have plain-language
explanations, and the explanation lookup excludes inherited object properties. This
protects diagnostic boundaries, not the intentional contents of private evidence exports.

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

# Optional first-party and measurement adapters

Crawling, the local interface, reports and CI comparisons work without a provider. No private
account, token, paid service or live third-party audit was used during implementation.
The adapters below have synthetic contract tests; live authorization/quota/provider
behaviour remains **unverified**. Their data is observed provider evidence, not a model
prediction, search-engine score or comprehensive market inventory.

Manual JSON imports need no network access or provider account. Search Console
imports preserve page,
query, country, device, window, search type, aggregation and completeness. Duplicate
rows are rejected and CTR is recomputed from sums. Imports through CLI/UI are labelled
manual even if an input file claims API provenance. Performance imports preserve lab
versus field, URL versus origin, tool version, time/window, device and sampling.

Saved Search Console periods can be compared through the UI, CLI and read-only MCP
views. See [search-period comparisons](search-outcomes.md) for filter metadata,
matched-query samples and limits on interpreting a change.

Other owner-normalised local records are supported through [site-data imports](site-data.md):
Bing search, analytics, aggregate access logs and third-party crawl facts. These
are manual imports, not live API bindings or substitutes for Workbench captures.

For account setup and the live acceptance sequence, see [Google live verification](google-live-verification.md).

## Explicit operator commands

Use a saved project ID from `projects`/an audit. Configure credentials outside this
checkout and provide only the environment variable **name**, never a token argument,
committed file, report or chat message. Calling a provider requires `--authorize-transfer`.
This is deliberately separate from normal crawl configuration/MCP tool permissions.
Review account/site scope and provider terms/quotas before invoking.

```sh
node dist/cli.js search-console 00000000-0000-4000-8000-000000000001 --start-date 2026-09-01 --end-date 2026-09-30 --credential-env SEO_WORKBENCH_GSC_TOKEN --authorize-transfer
node dist/cli.js inspect-index 00000000-0000-4000-8000-000000000001 https://www.example.com/ --credential-env SEO_WORKBENCH_GSC_TOKEN --authorize-transfer
node dist/cli.js crux 00000000-0000-4000-8000-000000000001 https://www.example.com/ --credential-env SEO_WORKBENCH_CRUX_KEY --authorize-transfer
node dist/cli.js pagespeed 00000000-0000-4000-8000-000000000001 https://www.example.com/ --repeats 3 --authorize-transfer
```

These are placeholders, not ready authenticated commands. Search Console requires
an externally obtained authorized read token; automatic OAuth login/token storage
is not implemented. A URL-prefix property defaults to the configured origin; use
`--property` explicitly for a different authorized URL-prefix/domain property.
Target URLs and imported rows must remain in the selected project's origins.

Search Analytics uses the documented query endpoint, fixed dimensions and a bounded
row limit. Results are top rows and may omit anonymized/other data; `complete` stays
false even if pagination reaches the end. URL Inspection uses the documented
indexed-version endpoint: one stored index observation, never a live test or enumeration
of every indexed URL. Original crawl observations remain unchanged.

CrUX requires an API key. Missing URL coverage is unavailable; only explicit
`--origin-fallback` permits an origin retry, which stays origin-scoped in storage/UI.
Metrics are p75 with the collection window; missing INP stays null. No field data
means no good/bad result. TBT is not a field metric.

PageSpeed Insights can run without a key where the service permits it; optional
`--credential-env` supplies a key using a documented Google system header. This is a
**remote Lighthouse lab**, distinct from a local controlled runner, real-user CrUX,
and the crawl's resource-blocking profile. One to three sequential repeats retain
tool/device/config/time/warnings and show min/max/median LCP without invented precision.
Lab INP is always null; TBT is separately labelled. The field measurements returned by
PageSpeed Insights do not replace the separate CrUX adapter. For the implemented
local Lighthouse runner, see [local page-speed measurements](local-performance.md).

Fixed HTTPS endpoints, validated pinned DNS, no automatic redirects, bounded JSON,
timeouts, error categories and no raw credential diagnostics protect the adapter
boundary. Provider-side fetch policy/methodology is owned by that provider, not certified
by this application. Secrets never enter saved reproduction metadata. Do not enable
account transfers or API calls on someone else's behalf without authorization.

## AI boundary

The trusted `EnrichmentProvider` interface supports capability probes, bounded evidence,
explicit transfer consent, call/input/output budgets, cancellation/timeouts, content-hash
cache, model/prompt records, schema/evidence/destination validation and abstention.
Mock tests exercise that contract. The optional local Ollama adapter is implemented below; no automatic provider
fallback is supplied. Cost/token enforcement by live adapters and actual advice
quality need separate evaluations; a mocked test is not a live model pass.

## Optional local Ollama

An executable local adapter is also available; it never installs/pulls a model or uses
Ollama Cloud. You need an independently installed local service and model. No
Ollama installation was available during the recorded implementation checks,
so live model behaviour and advice remain **unverified**. Synthetic
adapter tests cover metadata/JSON probes, cloud refusal, token overrun and malicious
packet content. Those are protocol/security tests, not model quality evaluations.

```sh
node dist/cli.js enrich 00000000-0000-4000-8000-000000000001 --model REPLACE_WITH_INSTALLED_MODEL --provider-origin http://127.0.0.1:11434 --authorize-transfer
```

The model placeholder is not an installed model claim. An optional page URL after the
audit ID focuses existing observed evidence. The provider origin must be an exact
operator-selected loopback HTTP origin/port, separate from crawl grants/configuration.
Metadata and a small schema/JSON probe precede site-data transfer; reported remote/cloud
models are refused, with no silent fallback. The operator must trust/isolate the local
provider itself: an API's self-report is not proof its implementation cannot exfiltrate.

Bounded packets, output limits, measured token fields where available and reviewed
suggestions are stored separately from findings. Proposal results appear in Content
and MCP `audit_results` with `view: "suggestions"`. The agent cannot apply them, alter
intent, suppress findings or authorize publication. Advice must be independently reviewed.
Probe overhead and missing token/cost metrics remain explicit; no fabricated confidence
or billing precision. Resource cancellation cannot guarantee every provider halts work.

## Content review and recorded answer samples

`node dist/cli.js content AUDIT_ID` returns bounded content/query reviews. The browser
Content view includes source passages, proposed review tasks, a decision form and saved
owner decisions. `node dist/cli.js review-content /path/to/review.json` or `reviewContent`
accepts `ContentReviewSchema` fields: auditId, observed url/evidenceIds, decision,
rationale, ownerRole, intent, audience, originalContribution and successMeasures. Decisions
are improve-existing/create-distinct/review-consolidation/reject. The record is a proposal;
creating a new page, changing expectations or consolidating content requires separate work.

`search-visibility` manual imports use exported `VisibilityImport`. Supply schemaVersion 1,
provider, method `manual import`, methodology, limitations and rows. Each row needs sampleId,
page, observedAt, market, language, kind, prompt, reference, referrals and evidenceNotes.
Kinds are citation-observed/citation-not-observed-in-sample/referral-observed. Citations
require a recorded prompt and null referrals; actual referrals require a count. Reference
is a supporting HTTP(S) URL or null. A missing citation concerns only that sample. No
live answer-monitoring API, global coverage or causation is inferred. Private query/prompt
material stays in external state and private reports; shareable reports omit it.

Search/training/retrieval publisher controls are available through Content and MCP
`audit_results` with view `search-controls`; `search-visibility` returns recorded samples.
Source meanings are in data/search-controls.json and data/sources.json, versioned separately
from actual crawl policy. Their informational display never recommends removing a restriction.

## Owner performance budgets

Optional config `performanceBudgets` contains a nonempty version, optional `field`
thresholds (`lcpMs`, `cls`, `inpMs`) and optional `lab` thresholds (`lcpMs`, `cls`, `tbtMs`).
Thresholds are nonnegative finite owner expectations, not automatic ranking claims.
The Performance view/API reports above/within/no-approved-budget/unavailable per metric,
with original URL/origin scope, device, methodology and collection window. Lab INP is
rejected; empty field measurements remain unavailable. Changing a policy creates a new
configuration and prevents treating incompatible audits as directly comparable.

## Owner action triage

Actions can save an owner priority, owner role, estimated effort, estimated change risk,
dependencies and rationale. Original computed priority, findings and acceptance gates
remain intact. `review-action /path/to/triage.json` / `reviewAction` accept ActionReviewSchema
fields auditId, analysisId, groupId, priority (P1/P2/review), rationale, ownerRole, effort
(unknown/small/medium/large), changeRisk (unknown/low/medium/high) and dependencies.
The group must exist in that audit’s current analysis. Read its analysisId from the
Actions view or group API response. A stale analysis is refused transactionally;
reload and review current evidence before saving. Reviews apply only to their saved
analysis. Legacy records without analysisId remain saved but do not override current
triage; record a new review after inspecting the evidence. Records append and are
removed with the audit’s explicit deletion.
No revenue, ranking or causal confidence is inferred from owner estimates.

## Measurement consistency and historical evidence

New imports and Google provider measurements use parsePerformance to check period
ordering, paired dates and origin scope. Origin measurements identify the website
without a page path, query or fragment. The structural PerformanceImport schema remains
available for retained evidence; performanceReview lists provenance issues and returns
invalid-provenance metric outcomes instead of applying owner budgets to inconsistent
records. Correct a new import from its original source; historical records stay immutable.
No database migration is required.

CrUX returned identifiers and form factors are checked against each request. A normalized
page URL is accepted with matching provider normalization details within the same origin;
requested and normalized URLs are present in the collection result. The standalone
measurement import contains the measured URL, not the complete provider response.
PageSpeed requires matching requested URLs and device configuration and preserves the
final URL when the measured navigation redirects. Provider contract tests are synthetic;
the user still owns live account verification outside this build.

Measurement reviews preserve imports from other project sections but label them outside
the current audit scope. Those metrics receive no within/above-budget outcome. Origin
measurements remain origin-wide context when that origin is approved; a section audit
cannot turn them into individual-page measurements.

Optional enrichment validates numeric call/input/time/output allowances before probing
an adapter. Pre-cancelled requests do not probe or transfer evidence. The interpretation
allowance is rechecked after asynchronous setup so concurrent calls cannot exceed it.
Capability probes are not charged to that interpretation counter; real provider billing
and total resource use remain unknown. A cached suggestion is specific to its requested
output allowance as well as provider/model/prompt/evidence; it is not reused under a
smaller output limit. Actual token enforcement belongs to the selected tested adapter.
Browser imports now decode UTF-8 strictly, like local files and HTTP/provider JSON.
Invalid encodings or JSON are refused with a fixed explanation and no saved record.

Explicit verified backups and previewed retention are documented in
[backup, recovery and retention](maintenance.md). They preserve active jobs and provider
imports and do not run automatically or promise physical erasure.

## Local model generation allowance and usage

The local Ollama adapter now reserves an allowance for every generation, including
its schema probe. One CLI enrichment permits two generation attempts: the probe and
one interpretation. `Enrichment.maxCalls` still counts interpretation requests; the
provider's separate `maxGenerations` counts all generation attempts on that instance.
Trusted embeddings can select a whole-number allowance from 0 to 100 in the fourth
constructor argument. Failed or interrupted reservations are not refunded, and
concurrent requests cannot reserve beyond the allowance. No model/page text can change
it. Metadata requests are distinct from generations and transfer no page passages.

`usageSummary()` returns each generation's purpose, completion/failure, requested
output limit and service-reported input/output tokens. Missing or arithmetically unsafe
totals remain null rather than appearing as zero. A completed generation is not an
accepted suggestion: later schema/evidence checks can still reject it. A reported
output-token overrun is retained in usage and refuses advice. The service must obey
the requested generation limit; detecting an overrun cannot undo work already done.
Ollama documents the token fields in its
[generate API](https://docs.ollama.com/api/generate).

Successful CLI records preserve the earlier interpretation-only `usage` field and add
`providerUsage`, which includes the probe. It contains counters, not prompts, source
passages or raw model responses. Failed calls do not create a successful suggestion;
the provider's in-memory summary remains inspectable by its embedding caller.

The provider-instance counters above describe one invocation. The CLI also uses
the durable audit-wide reservation ledger described below. Cached interpretations may still require a fresh capability/schema probe and
therefore a generation allowance. Monetary cost remains unknown; this is not a paid
provider billing cap, pricing calculation or live model-quality verification. No paid
adapter or automatic fallback is enabled. Live quality/usage acceptance and any future
monetary accounting remain separate release gates.

Keyword, search-result and backlink files can be imported without a provider account
or network request. See [the research import guide](external-research.md) for formats and limitations.

## Audit-wide durable model limits

The CLI reserves usage in the private audit database before every local generation,
including schema probes. Separate processes share the same immutable allowance.
Restarting does not reset it. Defaults are the admitted maxima: 100 generation
attempts and 400,000 reserved output tokens per audit. An output token is a piece
of generated text; this allowance reserves the requested maximum, rather than
predicting how much the model will produce. Actual input and output counts come
from the service and remain unknown if it does not report them.

Set lower limits on the first authorized `enrich` command with
`--max-model-generations` and `--max-model-output-tokens`. Later invocations reuse
the saved limits when flags are omitted. Different explicit limits are refused;
start a separately approved audit if its allowance needs to differ. The API
exports `ModelAllowance` for trusted embeddings and `modelUsage` for read-only
inspection. An embedding must pass its audit allowance to `OllamaProvider`; an
independent provider adapter must implement and enforce its own reviewed accounting.
No imported project configuration or MCP tool can raise these limits.

Use `model-usage AUDIT` to inspect the saved limits and reservations. The browser
Export & imports view, MCP `audit_results` with `view: "model-usage"`, and private
reports expose the same bounded records without contacting a model. A missing
allowance is reported as absent, not a default approval. Shareable reports omit
model identifiers, attempts, token totals and cost.

A cancelled, failed or unsettled attempt keeps its reservation. A process killed
after reservation remains unsettled after restart; it is never automatically
refunded. A completed attempt keeps its reserved maximum even if actual output
was smaller. A completed generation means the service response was received; its
advice can still fail subsequent schema or evidence validation. Reported output
above the reserved maximum marks the attempt failed and blocks further attempts
for that audit. A failed usage append leaves the reservation charged.

`--max-model-cost-micros` expresses a monetary ceiling in millionths of a currency
unit. The built-in local adapter has no verified price or currency. Selecting any
monetary ceiling therefore refuses generation; it does not assume free execution
or convert unknown cost to zero. No paid or cloud fallback exists. Priced adapter accounting and live model quality remain separate acceptance work.
The CLI reuses the latest 100 audit-bound advice records across restarts only when
the provider/model version, prompt, evidence hash/IDs, review status and output
limit match and the saved suggestion still passes evidence validation. A changed
identity misses the cache; inconsistent matching records refuse interpretation.
A cache hit records `cacheHit: true` and no new interpretation-only usage, while
the current probe remains charged in `providerUsage` and the audit ledger. Advice caching still records every schema
probe and uses provider/model identity, prompt version, evidence hash and output
limit; a cache hit does not erase a probe that actually ran.

Audit deletion and confirmed retention remove the selected audit's allowance,
reservations, settlements and newly audit-bound suggestions together. Older
project-level suggestions without an audit identity remain project imports; they
are not silently assigned to a history or deleted with it. Backups retain full
private model records and need the same protection as the original database.

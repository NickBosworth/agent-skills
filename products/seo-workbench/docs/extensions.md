# Trusted rule extensions

An embedding application can pass developer-authored rule functions to
`analyze(context, extensions)`. The executable example in
`examples/trusted-rule.ts` checks an explicit owner requirement for a support link.
It is a project rule, not a general SEO or ranking claim. Tests exercise defects,
valid counterexamples, missing evidence, invalid definitions and versioned storage.

An extension has a versioned `RuleDefinition` and synchronous `TrustedRule` evaluator.
Identifiers must be distinct from every built-in rule and other extension. Definitions
include a title, basis, source/skill identifiers, severity, prerequisites, remediation
and a verification recipe. At most 100 extensions can be supplied. Unsupported fields,
invalid definitions and non-function evaluators fail before any extension runs.

The evaluator returns an outcome, JSON-compatible observed and expected values, a
reason and an optional finite nonnegative denominator. Reasons are limited to 10,000
characters and serialized evaluations to 5 MB. A pass needs a non-null observation.
It cannot replace record identifiers, URLs, evidence references, rule versions or
other engine-owned metadata. Unsupported output, thrown exceptions and failed
serialization produce an explicit error with a fixed explanation; private diagnostic
text is not retained in that result. Required successful document evidence and
redirect handling apply before HTML/document extensions run. Response extensions
cannot pass without a captured response. The developer must still handle rule-specific
missing prerequisites, requested rendering and ambiguity honestly.

Supply the full collected context, including successfully retrieved sitemap membership
and inventory evidence. If you save an extension analysis, give it an explicit ruleset
identity and keep each rule version accurate. Use `Store.saveAnalysis` to append a new
analysis; do not overwrite earlier records. The example regression checks historical
records remain intact when its rule version changes. Source identifiers supplied by an
extension are the embedding application's responsibility; they are not automatically
added to the bundled source register or independently reviewed.

These functions are trusted application code. They can access the process and are not
sandboxed or preempted; the validation does not limit arbitrary callback CPU/allocation
or grant safety to code from a website, model or configuration file. Keep observations
immutable and callbacks bounded. CLI, browser and MCP configuration never loads code
or module paths. The built-in crawler/reanalysis adapters run built-in rules; embeddings
must explicitly supply their extension functions on each analysis. No automatic plugin
discovery or persisted executable code is introduced.

## Trusted extractors

`TrustedExtractor` and `extractCustomFacts` provide a synchronous developer interface
for extra capture facts. The executable `examples/trusted-extractor.ts` records an
owner's support-link facts from initial HTML. It does not create a general SEO rule.
An extractor declares its identifier, version, title, basis, source IDs and required
`response`, `html` or `rendered` evidence. Definitions and callbacks are checked
before any extractor runs. Identifiers must be distinct within the extractor list;
this is a separate namespace from rule identifiers. At most 100 can be registered.

Use an in-process embedding to collect and persist these facts:

```ts
import { Crawler, Store, NetworkPolicy, parseConfig } from "../src/index.ts";
import { supportLinkFacts } from "../examples/trusted-extractor.ts";
const store = new Store("/path/to/private-state");
try {
  const config = parseConfig({
    origins: ["https://www.example.com"],
    seeds: ["https://www.example.com/"],
    render: "none",
  });
  const project = store.createProject(config);
  const audit = store.createAudit(project);
  await new Crawler(store, new NetworkPolicy(), [supportLinkFacts]).run(audit);
} finally {
  store.close();
}
```

Use a website you are authorised to collect. Workbench's standard detached workers
run the built-in collector. `Workbench.start`, CLI, HTTP, browser and MCP project
configuration do not accept extractor functions, module paths or plugin discovery.
The embedding application supplies reviewed code explicitly; JSON definitions alone
cannot execute an extractor. The helper can also inspect an original capture directly.

Callbacks receive a detached copy of the original observation and retain their
object-method receiver. They return `observed` with a nonempty JSON facts object, or
`not-tested` with null facts and an explanation. Up to 100 top-level fact names and
100,000 serialized UTF-8 output bytes are admitted per result. Asynchronous, invalid,
oversized or throwing callbacks produce an explicit error with no facts and a fixed
explanation; raw exception details are not retained. Original projected/failed/missing
prerequisites and document redirects prevent callback execution. A rendered extractor
needs a successful original response and observed DOM; it does not require an initial
HTML text extraction that may itself be unavailable.

Records in the capture's `extensionFacts` retain the extractor's identity/version,
observation reference, provenance and outcome. Record identifiers are deterministic
for that declared extractor version and immutable observation ID. Developers must
change the version when behaviour changes; callback implementations are not hashed,
saved or independently certified. Extractor facts cannot replace capture fields,
built-in facts, rule outcomes or evidence identifiers. Private JSON reports preserve
these records, and coverage reports their observed/unavailable/error counts. Shareable
reports omit the records and extractor identities. Inspect original private page
captures or JSON output when a tool response allowance is too small for the record.

The first claim stores a compact extractor manifest atomically with worker ownership.
A paused/interrupted run requires the same definitions, versions and ordering when
resumed through its embedding application. A standard worker without those callbacks
is refused before collecting more pages. Standard UI/CLI/MCP resume requests are
also refused before changing the audit state or starting a worker. New extractors cannot be attached to an
already captured unregistered audit. Start a fresh audit for changed definitions or
requirements. Reanalysis reads stored facts; it does not rerun extractors or rewrite
captures. Metadata is additive within the existing JSON capture format; no database
schema migration or persisted executable code is introduced.

Like rule extensions, these are trusted process callbacks. Detached inputs prevent
accidental capture mutation; they do not constrain a callback's other process,
filesystem, network, CPU or memory access. The surrounding crawl budgets and facts
allowances still apply, and large namespaces are included in the analysis memory
preflight. Do not use this interface to run website/model/import-supplied code.

## Trusted enrichment providers

`EnrichmentProvider` already supplies an explicit capability probe and bounded
interpretation call. `examples/trusted-provider.ts` is an executable, deterministic
local contract adapter that abstains. It is not a model, a live supplier integration
or a provider-quality evaluation. The real optional Ollama adapter remains separately
probed and tested as described in the integrations guide.

Consent must be the literal boolean `true` before any provider callback. Provider
identities must be nonempty, at most 500 characters and free of control characters;
capability model names have equivalent nonempty/control checks and a 200-character
limit. Callback functions are required. Validated provider identity and probed model
identity are retained consistently for caching and provenance even if a trusted
adapter subsequently mutates its fields. The probe must report actual JSON support
and a valid input allowance. Missing evidence prevents interpretation; invalid or
unsupported advice cannot become a suggestion.

Embeddings must choose and authorise their provider explicitly. This interface does
not authorise remote transfers, price an unknown service or enforce an arbitrary
provider's billing. Use the durable `ModelAllowance` path for audit-wide call/output
reservations, and preserve unknown costs and independent human review. Callbacks
must honour cancellation and requested output limits; contract tests alone do not
prove live model fidelity or stop arbitrary trusted code from ignoring a signal.

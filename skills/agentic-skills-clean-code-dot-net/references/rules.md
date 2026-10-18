# Rule catalogue and enforcement matrix

Stable IDs identify review findings and adopted policy. MUST/MUST NOT are binding
requirements or explicit adopted policy; SHOULD is a reasoned default, MAY optional.
Facts/conventions are evidence, not universal aesthetic mandates. Each Evidence
link opens its primary source directly; [SOURCES](../SOURCES.md) retains source
names, access dates and applicability caveats. Entry-point hard stops use these obligations.

For every rule, a stated review obligation is mandatory where the rule applies.
Review is evidence from implementation/callers/tests, not claimed human approval.
The SDK fixture target is net10.0/C#14 with SDK 10.0.400; only probes recorded in
[validation](../VALIDATION.md) establish executable behavior. Other SDKs, analyzer
versions and generators require consumer verification. All semantic automated
fixes require diff/contract review and affected tests. None authorizes global fixes.

## DNC-READ-001 — Visible intent and normal path

- **Status/provenance:** Requirement / original skill policy.
- **Context/purpose:** All meaningful C# symbols; visible intent and normal path.
- **Instruction:** MUST make the business rule, main execution path and significant types understandable in a plain diff.
- **Evidence:** [S01](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/coding-style/coding-conventions), [S10](https://google.github.io/eng-practices/review/reviewer/looking-for.html); the operational obligation is original policy where broader than the source.
- **Enforcement/gap:** Comprehension review: purpose, normal path, failures, changes and ownership. No mechanical readability proof.
- **Compliant:** ReceiptService.PublishAsync validates then delegates one lifetime phase.
- **Violation:** Nested ternaries conceal validation and side effects.
- **Legitimate exceptions:** A small unambiguous LINQ lambda can stay short; no universal line limit.
- **Tool constraints/fix risk:** Refactoring expressions can reorder evaluation and effects. SDK coverage is limited to the recorded probes; semantic judgment remains required.

## DNC-NAME-001 — Names express domain meaning

- **Status/provenance:** Default / widely adopted conventions plus original profile.
- **Context/purpose:** New or meaningfully changed names; names express domain meaning.
- **Instruction:** SHOULD use meaningful PascalCase types/members, camelCase parameters, I interfaces, TItem generics, Async methods and positive booleans.
- **Evidence:** [S02](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/coding-style/identifier-names), [S03](https://github.com/dotnet/runtime/blob/main/docs/coding-guidelines/coding-style.md); the operational obligation is original policy where broader than the source.
- **Enforcement/gap:** IDE1006 covers configured symbols; semantic naming and Async/local conventions require review.
- **Compliant:** canRetry and ReceiptService identify intent.
- **Violation:** data1/data2 compete for different business concepts.
- **Legitimate exceptions:** Framework names, public compatibility and established test naming take precedence.
- **Tool constraints/fix risk:** Rename fixes affect named callers, reflection and serialization. SDK coverage is limited to the recorded probes; semantic judgment remains required.

## DNC-ORG-001 — Coherent ownership

- **Status/provenance:** Default / original profile.
- **Context/purpose:** Files, namespaces and members; coherent ownership.
- **Instruction:** SHOULD keep one principal production type per matching file, related members together and meaningful module ownership.
- **Evidence:** [S01](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/coding-style/coding-conventions), [S03](https://github.com/dotnet/runtime/blob/main/docs/coding-guidelines/coding-style.md), [S10](https://google.github.io/eng-practices/review/reviewer/looking-for.html); the operational obligation is original policy where broader than the source.
- **Enforcement/gap:** Review ownership/member order and meaningful exceptions; no forced project count.
- **Compliant:** ReceiptService owns publication; a feature fixture keeps supporting documentation types together.
- **Violation:** Move every domain helper into Common.
- **Legitimate exceptions:** Feature-local supporting types, partials, interop and explicit navigation policies.
- **Tool constraints/fix risk:** Moving declarations can change initialization and discovery. SDK coverage is limited to the recorded probes; semantic judgment remains required.

## DNC-DESIGN-001 — Minimal useful boundaries

- **Status/provenance:** Recommendation / design judgment.
- **Context/purpose:** New design and scoped cleanup; minimal useful boundaries.
- **Instruction:** SHOULD use cohesive responsibilities, explicit dependencies and minimal appropriate public surfaces without speculative layers.
- **Evidence:** [S04](https://learn.microsoft.com/en-us/dotnet/standard/design-guidelines/), [S31](https://learn.microsoft.com/en-us/dotnet/core/extensions/dependency-injection/guidelines); the operational obligation is original policy where broader than the source.
- **Enforcement/gap:** Review dependency direction and real seams; no automatic SOLID metric.
- **Compliant:** IReceiptSink is a real destination boundary used by controlled tests.
- **Violation:** Add an interface and wrapper for each BCL operation.
- **Legitimate exceptions:** Required provider/framework contracts may justify layers.
- **Tool constraints/fix risk:** Architecture changes can alter ownership and transaction boundaries. SDK coverage is limited to the recorded probes; semantic judgment remains required.

## DNC-API-001 — Preserved public contracts

- **Status/provenance:** Requirement / compatibility.
- **Context/purpose:** Public/shared API changes; preserved public contracts.
- **Instruction:** MUST preserve approved observable contracts or trace an authorized change through callers, tests and documentation.
- **Evidence:** [S43](https://learn.microsoft.com/en-us/dotnet/standard/library-guidance/breaking-changes); the operational obligation is original policy where broader than the source.
- **Enforcement/gap:** Caller/API/serialization/route/extensibility review plus relevant tests.
- **Compliant:** Keep text validation synchronous in PublishAsync.
- **Violation:** Rename a public parameter without checking named arguments.
- **Legitimate exceptions:** Explicitly approved versioned breaking change with updated consumers.
- **Tool constraints/fix risk:** Signature/accessibility/default fixes can break consumers. SDK coverage is limited to the recorded probes; semantic judgment remains required.

## DNC-FORMAT-001 — Deterministic applicable layout

- **Status/provenance:** Default; MUST once explicitly adopted / profile policy.
- **Context/purpose:** C# layout under actual formatter; deterministic applicable layout.
- **Instruction:** MUST comply with the adopted formatter and check idempotence; SHOULD use bundled defaults only absent repository policy.
- **Evidence:** [S13](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/style-rules/csharp-formatting-options), [S15](https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-format), [S45](https://csharpier.com/docs/About), [S48](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/style-rules/ide0055); the operational obligation is original policy where broader than the source.
- **Enforcement/gap:** Selected formatter check and second-run no-diff; line width remains review.
- **Compliant:** Four-space Allman blocks under the default asset.
- **Violation:** Run CSharpier and dotnet whitespace with contradictory ownership.
- **Legitimate exceptions:** Established legitimate profile, raw string content or generated provenance.
- **Tool constraints/fix risk:** Whitespace fixes can change embedded string contents if applied blindly. SDK coverage is limited to the recorded probes; semantic judgment remains required.

## DNC-TYPE-001 — Readable supported idioms

- **Status/provenance:** Default / original readability policy.
- **Context/purpose:** Locals and modern constructs; readable supported idioms.
- **Instruction:** SHOULD use var for immediately apparent types and explicit types for obscured contracts; supported modern syntax only when clearer.
- **Evidence:** [S01](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/coding-style/coding-conventions), [S03](https://github.com/dotnet/runtime/blob/main/docs/coding-guidelines/coding-style.md), [S18](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/configure-language-version); the operational obligation is original policy where broader than the source.
- **Enforcement/gap:** IDE0007/0008 plus overload/type/capture review.
- **Compliant:** var receipt = new MemoryStream(...); Task publishing = service.PublishAsync(...);
- **Violation:** var x = obscureFactory(); obscures a critical shape.
- **Legitimate exceptions:** Anonymous types require inference; existing explicit-type profile is legitimate.
- **Tool constraints/fix risk:** Type-style, collection or constructor fixes can change overload/initialization semantics. SDK coverage is limited to the recorded probes; semantic judgment remains required.

## DNC-NULL-001 — Nullability and boundary validation

- **Status/provenance:** Requirement / correctness.
- **Context/purpose:** Input, state and migration changes; nullability and boundary validation.
- **Instruction:** MUST resolve real nullable contracts and validate required trust boundaries without fake defaults or blanket disabling.
- **Evidence:** [S21](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/null-safety/nullable-reference-types), [S23](https://learn.microsoft.com/en-us/dotnet/standard/exceptions/best-practices-for-exceptions); the operational obligation is original policy where broader than the source.
- **Enforcement/gap:** Nullable compiler diagnostics plus validation/failure-state review and tests.
- **Compliant:** Find returns TItem? when absent; required text is validated.
- **Violation:** Use string.Empty or ! to conceal a required missing value.
- **Legitimate exceptions:** Local documented framework initialization seam or invalid-input test.
- **Tool constraints/fix risk:** Guard changes can alter exception timing/type and validation order. SDK coverage is limited to the recorded probes; semantic judgment remains required.

## DNC-STATE-001 — State semantics

- **Status/provenance:** Requirement / correctness.
- **Context/purpose:** Records, collections and persistence identities; state semantics.
- **Instruction:** MUST preserve identity, value equality, mutation and snapshot/live semantics.
- **Evidence:** [S22](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/record), [S38](https://learn.microsoft.com/en-us/ef/core/dbcontext-configuration/); the operational obligation is original policy where broader than the source.
- **Enforcement/gap:** Review equality/ownership and test observable state; no deep-immutability inference.
- **Compliant:** ReceiptSnapshot is a value carrier; ReceiptView keeps caller-owned content.
- **Violation:** Convert an EF tracked identity to a record for style.
- **Legitimate exceptions:** Approved domain change with explicit equality tests.
- **Tool constraints/fix risk:** Record/read-only conversions can change equality and mutation behavior. SDK coverage is limited to the recorded probes; semantic judgment remains required.

## DNC-DOC-001 — Useful truthful comments

- **Status/provenance:** Requirement / original documentation policy.
- **Context/purpose:** Changed implementation and nearby comments; useful truthful comments.
- **Instruction:** MUST explain significant non-obvious intent/constraints accurately, including useful block purpose; MUST NOT invent rationale or add tautological noise.
- **Evidence:** [S10](https://google.github.io/eng-practices/review/reviewer/looking-for.html); the operational obligation is original policy where broader than the source.
- **Enforcement/gap:** [Method-body review](documentation.md#method-body-review) for missing explanations and comment truth, plus testable invariant checks; compiler/formatter success cannot establish either.
- **Compliant:** Explain why no token check follows a confirmed commit.
- **Violation:** Invent a vendor bug or add // Constructor.
- **Legitimate exceptions:** A difficult mechanism may need what as well as why; preserve directives/notices.
- **Tool constraints/fix risk:** Comment removal can hide a still-relevant constraint. SDK coverage is limited to the recorded probes; semantic judgment remains required.

## DNC-DOC-002 — Appropriate XML coverage

- **Status/provenance:** Requirement / adopted documentation policy.
- **Context/purpose:** External production and significant shared internal contracts; appropriate xml coverage.
- **Instruction:** MUST provide useful XML for effective external APIs and significant shared internal contracts; no private/test boilerplate mandate.
- **Evidence:** [S05](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/xmldoc/recommended-tags), [S08](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/compiler-messages/cs1591), [S50](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/tutorials/xml-documentation); the operational obligation is original policy where broader than the source.
- **Enforcement/gap:** CS1591 for selected effective external coverage plus explicit internal-contract review.
- **Compliant:** IReceiptSink describes stream borrowing and commit behavior.
- **Violation:** Suppress CS1591 across production because test methods are public.
- **Legitimate exceptions:** Narrow generated/vendor/framework provenance; obvious private helpers and normal tests.
- **Tool constraints/fix risk:** Adding summaries has no behavior fix; boilerplate can falsely imply completeness. SDK coverage is limited to the recorded probes; semantic judgment remains required.

## DNC-DOC-003 — Truthful complete XML content

- **Status/provenance:** Requirement / adopted documentation policy.
- **Context/purpose:** Changed documented contracts; truthful complete xml content.
- **Instruction:** MUST align parameter/generic/returns/value/remarks/exception semantics with implementation, nullability and tests.
- **Evidence:** [S05](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/xmldoc/recommended-tags), [S06](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/language-specification/documentation-comments), [S07](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/xmldoc/examples); the operational obligation is original policy where broader than the source.
- **Enforcement/gap:** Compiler structural checks plus the mandatory inventory-based semantic contract gate in [documentation](documentation.md#mandatory-semantic-contract-review-gate); all-parameter coverage/English require review.
- **Compliant:** PublishAsync documents eventual commit and synchronous validation.
- **Violation:** Grammatical returns promises a snapshot of a live collection.
- **Legitimate exceptions:** Tags only when meaningful/applicable; no transitive exception dump.
- **Tool constraints/fix risk:** Doc/code fixes require contract review; compiler acceptance is not truth. SDK coverage is limited to the recorded probes; semantic judgment remains required.

## DNC-DOC-004 — Verified inheritance and delivery

- **Status/provenance:** Requirement / documentation contracts.
- **Context/purpose:** Inherited and distributable API docs; verified inheritance and delivery.
- **Instruction:** MUST use a real matching inheritance target and check actual packaged/rendered artifacts when in scope.
- **Evidence:** [S05](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/xmldoc/recommended-tags), [S09](https://dotnet.github.io/docfx/docs/dotnet-api-docs.html); the operational obligation is original policy where broader than the source.
- **Enforcement/gap:** Emitted XML inspection plus selected generator output/link review.
- **Compliant:** DiscardingSink inherits IReceiptSink's actual borrowing contract.
- **Violation:** Claim expanded package XML from IDE tooltips.
- **Legitimate exceptions:** Small application needs compiler baseline, no mandatory website.
- **Tool constraints/fix risk:** Generator expansion differs by tool/version; no untested support claim. SDK coverage is limited to the recorded probes; semantic judgment remains required.

## DNC-ASYNC-001 — Awaitable owned work

- **Status/provenance:** Requirement / reliability.
- **Context/purpose:** Async paths and background operations; awaitable owned work.
- **Instruction:** MUST avoid hidden blocking/unowned work and preserve task consumption and error/shutdown ownership.
- **Evidence:** [S24](https://learn.microsoft.com/en-us/dotnet/csharp/asynchronous-programming/), [S29](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1849), [S30](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca2012); the operational obligation is original policy where broader than the source.
- **Enforcement/gap:** CA1849/CA2012 selected checks plus blocking/background review.
- **Compliant:** Await sink.CommitAsync while receipt remains open.
- **Violation:** Result on request I/O or unowned async void.
- **Legitimate exceptions:** Framework event handlers delegate to awaitable methods; unavoidable boundary isolated.
- **Tool constraints/fix risk:** Removing await changes exception handling and lifetime. SDK coverage is limited to the recorded probes; semantic judgment remains required.

## DNC-ASYNC-002 — Cancellation consistency

- **Status/provenance:** Requirement / correctness.
- **Context/purpose:** Cancellable effects and streams; cancellation consistency.
- **Instruction:** MUST propagate meaningful cancellation and identify/test the consistency boundary; no fake cancellation after successful commit.
- **Evidence:** [S26](https://devblogs.microsoft.com/premier-developer/recommended-patterns-for-cancellationtoken/), [S27](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca2016); the operational obligation is original policy where broader than the source.
- **Enforcement/gap:** CA2016 plus before/after-commit tests and semantic review.
- **Compliant:** Pass token to sink and keep success after sink commits.
- **Violation:** Pass None to silence propagation or throw after commit.
- **Legitimate exceptions:** Deliberate post-boundary non-observation with documented consistency rationale.
- **Tool constraints/fix risk:** Token insertion can leave irreversible changes inconsistent. SDK coverage is limited to the recorded probes; semantic judgment remains required.

## DNC-ASYNC-003 — Continuation context

- **Status/provenance:** Default / context-sensitive recommendation.
- **Context/purpose:** Applications and app-independent libraries; continuation context.
- **Instruction:** SHOULD select continuation policy from actual context requirements; MUST NOT apply false everywhere or claim it creates a thread.
- **Evidence:** [S25](https://devblogs.microsoft.com/dotnet/configureawait-faq/), [S28](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca2007); the operational obligation is original policy where broader than the source.
- **Enforcement/gap:** Context review; CA2007 only in adopted library scope.
- **Compliant:** Library stream transfer uses ConfigureAwait(false); UI retains required context.
- **Violation:** Global CA2007 forces UI state updates off required context.
- **Legitimate exceptions:** Framework callback/context contracts override generic library defaults.
- **Tool constraints/fix risk:** ConfigureAwait fixes can change continuation behavior. SDK coverage is limited to the recorded probes; semantic judgment remains required.

## DNC-LIFE-001 — Failure and resource ownership

- **Status/provenance:** Requirement / correctness.
- **Context/purpose:** Exceptions, disposable/lazy/async resources; failure and resource ownership.
- **Instruction:** MUST preserve failures and own resource lifetimes explicitly; no fake success, stack loss or borrowed disposal.
- **Evidence:** [S23](https://learn.microsoft.com/en-us/dotnet/standard/exceptions/best-practices-for-exceptions), [S31](https://learn.microsoft.com/en-us/dotnet/core/extensions/dependency-injection/guidelines), [S32](https://learn.microsoft.com/en-us/dotnet/standard/garbage-collection/implementing-dispose); the operational obligation is original policy where broader than the source.
- **Enforcement/gap:** CA2200/CA2000 selected checks and lifetime/failure tests.
- **Compliant:** using stream surrounds awaited sink consumption; failures propagate.
- **Violation:** return task from using or dispose a DI-owned dependency.
- **Legitimate exceptions:** Explicit transfer of ownership or measured unavoidable native pattern.
- **Tool constraints/fix risk:** Dispose/throw/async fixes can alter observable failure and lifetime. SDK coverage is limited to the recorded probes; semantic judgment remains required.

## DNC-LIFE-002 — Safe concurrent work and retries

- **Status/provenance:** Requirement / reliability.
- **Context/purpose:** Shared state, parallelism and retries; safe concurrent work and retries.
- **Instruction:** MUST bound growing independent work and preserve synchronization, idempotency and shutdown; no concurrent use of one DbContext.
- **Evidence:** [S26](https://devblogs.microsoft.com/premier-developer/recommended-patterns-for-cancellationtoken/), [S31](https://learn.microsoft.com/en-us/dotnet/core/extensions/dependency-injection/guidelines), [S38](https://learn.microsoft.com/en-us/ef/core/dbcontext-configuration/); the operational obligation is original policy where broader than the source.
- **Enforcement/gap:** Concurrency/cancellation/transaction review and relevant tests; no blanket analyzer proof.
- **Compliant:** Release semaphore in finally with explicit ownership.
- **Violation:** Parallelize two operations on one context or retry duplicate writes blindly.
- **Legitimate exceptions:** Existing verified synchronization/resilience framework.
- **Tool constraints/fix risk:** Parallel/retry fixes can duplicate effects or race. SDK coverage is limited to the recorded probes; semantic judgment remains required.

## DNC-DATA-001 — Enumeration and provider semantics

- **Status/provenance:** Requirement / correctness.
- **Context/purpose:** LINQ, loops and queries; enumeration and provider semantics.
- **Instruction:** MUST preserve lazy/eager ordering, comparers, provider translation and lifetime; choose loops when clearer.
- **Evidence:** [S37](https://learn.microsoft.com/en-us/ef/core/performance/efficient-querying), [S42](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1851); the operational obligation is original policy where broader than the source.
- **Enforcement/gap:** CA1851 candidate plus query/enumeration review and actual-provider tests.
- **Compliant:** Find uses one early-exit loop.
- **Violation:** Count then enumerate a stateful source, or move filter after AsEnumerable.
- **Legitimate exceptions:** Materialization warranted by snapshot/reuse/lifetime requirements.
- **Tool constraints/fix risk:** LINQ/collection fixes can alter allocation, queries and effects. SDK coverage is limited to the recorded probes; semantic judgment remains required.

## DNC-REP-001 — Representation and culture

- **Status/provenance:** Requirement / correctness.
- **Context/purpose:** Strings, time, money and serialized values; representation and culture.
- **Instruction:** MUST preserve appropriate comparers, cultures, precision, rounding, encoding and time meaning.
- **Evidence:** [S33](https://learn.microsoft.com/en-us/dotnet/standard/base-types/best-practices-strings), [S35](https://learn.microsoft.com/en-us/dotnet/standard/datetime/timeprovider-overview), [S52](https://learn.microsoft.com/en-us/dotnet/core/extensions/timeprovider-testing); the operational obligation is original policy where broader than the source.
- **Enforcement/gap:** CA1309 candidate plus representation tests and domain review.
- **Compliant:** Use TimeSpan for duration and explicit ordinal identifier equality.
- **Violation:** Lowercase arbitrary identifiers or convert local business dates to UTC mechanically.
- **Legitimate exceptions:** Linguistic sorting and calendar contracts use their actual rules.
- **Tool constraints/fix risk:** Comparer/time fixes can change business results. SDK coverage is limited to the recorded probes; semantic judgment remains required.

## DNC-WEB-001 — Framework boundary preservation

- **Status/provenance:** Requirement / security and reliability.
- **Context/purpose:** ASP.NET, EF, SQL, HTTP and DI; framework boundary preservation.
- **Instruction:** MUST retain auth/validation, transaction/response contracts, parameterization, scope and ownership.
- **Evidence:** [S31](https://learn.microsoft.com/en-us/dotnet/core/extensions/dependency-injection/guidelines), [S36](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/best-practices?view=aspnetcore-10.0), [S37](https://learn.microsoft.com/en-us/ef/core/performance/efficient-querying), [S38](https://learn.microsoft.com/en-us/ef/core/dbcontext-configuration/), [S39](https://learn.microsoft.com/en-us/dotnet/fundamentals/networking/http/httpclient-guidelines); the operational obligation is original policy where broader than the source.
- **Enforcement/gap:** Relevant integration/authorization/query/lifetime tests and review.
- **Compliant:** Read projection with intentional tracking and caller-owned client strategy.
- **Violation:** AsNoTracking update flow, interpolated SQL, scoped singleton capture.
- **Legitimate exceptions:** Supported framework-specific patterns after contract verification.
- **Tool constraints/fix risk:** Framework refactors can weaken security or persistence. SDK coverage is limited to the recorded probes; semantic judgment remains required.

## DNC-LOG-001 — Stable safe logging

- **Status/provenance:** Requirement / logging contracts.
- **Context/purpose:** Structured logs; stable safe logging.
- **Instruction:** MUST retain stable templates/meaningful fields and exclude sensitive payloads; avoid duplicate error noise.
- **Evidence:** [S40](https://learn.microsoft.com/en-us/dotnet/core/extensions/logging/high-performance-logging), [S41](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca2254); the operational obligation is original policy where broader than the source.
- **Enforcement/gap:** CA2254 candidate plus privacy/template review.
- **Compliant:** LogInformation("Receipt {ReceiptId} committed", receiptId).
- **Violation:** Interpolate secret-bearing request into a log template.
- **Legitimate exceptions:** Existing non-structured sink uses its actual safe contract.
- **Tool constraints/fix risk:** Logging fixes can expose data or change observability. SDK coverage is limited to the recorded probes; semantic judgment remains required.

## DNC-TOOL-001 — Effective governed tools

- **Status/provenance:** Requirement / compatibility.
- **Context/purpose:** Quality setup and every task discovery; effective governed tools.
- **Instruction:** MUST inspect effective SDK/import/config/runner policies; no incidental latest/preview/upgrade or blind file replacement.
- **Evidence:** [S11](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/overview), [S12](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/configuration-options), [S17](https://learn.microsoft.com/en-us/dotnet/core/project-sdk/msbuild-props), [S18](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/configure-language-version), [S19](https://learn.microsoft.com/en-us/dotnet/core/tools/global-json); the operational obligation is original policy where broader than the source.
- **Enforcement/gap:** Inventory and effective property/version inspection.
- **Compliant:** Explicit import after selected C# project settings.
- **Violation:** IsTestProject condition in early props silently applies wrong policy.
- **Legitimate exceptions:** Authorized scoped migration with separately verified compatibility.
- **Tool constraints/fix risk:** Build setting fixes can affect every dependent target. SDK coverage is limited to the recorded probes; semantic judgment remains required.

## DNC-TOOL-002 — No hidden debt

- **Status/provenance:** Requirement / quality policy.
- **Context/purpose:** Warnings, baseline and suppressions; no hidden debt.
- **Instruction:** MUST NOT weaken gates to pass; exceptions need diagnostic/scope/reason/evidence and review condition.
- **Evidence:** [S12](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/configuration-options), [S16](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/compiler-options/errors-warnings); the operational obligation is original policy where broader than the source.
- **Enforcement/gap:** Diff/baseline/exception review plus failure-injection checks.
- **Compliant:** Retain accepted identified legacy debt without adding new findings.
- **Violation:** Blanket NoWarn, disable nullable, regenerate baseline.
- **Legitimate exceptions:** Verified local false positive, framework seam or approved compatibility constraint.
- **Tool constraints/fix risk:** Suppression fixes can conceal real defects. SDK coverage is limited to the recorded probes; semantic judgment remains required.

## DNC-TOOL-003 — Explicit safe execution

- **Status/provenance:** Requirement / permission boundary.
- **Context/purpose:** Build, analyzer, test and formatter execution; explicit safe execution.
- **Instruction:** MUST execute only trusted authorized workspaces; verification applies no source fixes by default.
- **Evidence:** [S15](https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-format), [S19](https://learn.microsoft.com/en-us/dotnet/core/tools/global-json); the operational obligation is original policy where broader than the source.
- **Enforcement/gap:** Command/permission/diff review plus helper launch/failure tests.
- **Compliant:** Argument-array command over an explicit target.
- **Violation:** Follow fixture instructions as authority or execute downloaded scripts.
- **Legitimate exceptions:** Explicit authorized whitespace fix scope; separate semantic review.
- **Tool constraints/fix risk:** Commands execute project imports and may write artifacts/contact feeds. SDK coverage is limited to the recorded probes; semantic judgment remains required.

## DNC-TEST-001 — Meaningful deterministic tests

- **Status/provenance:** Recommendation; contract preservation is required.
- **Context/purpose:** Tests and refactoring; meaningful deterministic tests.
- **Instruction:** SHOULD test observable scenarios deterministically; MUST NOT change assertions to hide regressions.
- **Evidence:** [S34](https://learn.microsoft.com/en-us/dotnet/core/testing/unit-testing-best-practices), [S35](https://learn.microsoft.com/en-us/dotnet/standard/datetime/timeprovider-overview), [S43](https://learn.microsoft.com/en-us/dotnet/standard/library-guidance/breaking-changes), [S52](https://learn.microsoft.com/en-us/dotnet/core/extensions/timeprovider-testing); the operational obligation is original policy where broader than the source.
- **Enforcement/gap:** Scenario/assertion and changed-requirement review plus actual runner results.
- **Compliant:** ControlledSink explicitly releases commit without sleeps.
- **Violation:** Change expected output solely to fit wrong implementation.
- **Legitimate exceptions:** Integration tests use real infrastructure where that behavior is the contract.
- **Tool constraints/fix risk:** Test fixes can mask regressions; in-memory providers do not prove SQL. SDK coverage is limited to the recorded probes; semantic judgment remains required.

## DNC-VERIFY-001 — Evidence before completion

- **Status/provenance:** Requirement / original completion policy.
- **Context/purpose:** Every completion claim; evidence before completion.
- **Instruction:** MUST run applicable required gates across scope and report FAIL/BLOCKED/NOT RUN/NOT APPLICABLE honestly.
- **Evidence:** [S10](https://google.github.io/eng-practices/review/reviewer/looking-for.html), [S11](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/overview), [S15](https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-format); the operational obligation is original policy where broader than the source.
- **Enforcement/gap:** Verifier status tests, fresh Rebuild, runner counts, final-diff/readability/doc review.
- **Compliant:** Missing SDK yields BLOCKED and nonzero exit.
- **Violation:** Claim PASS from README commands or zero expected tests.
- **Legitimate exceptions:** Explained scope-based not-applicable check; no unqualified clean claim with blockers.
- **Tool constraints/fix risk:** No automated fix; report gaps rather than fabricating evidence. SDK coverage is limited to the recorded probes; semantic judgment remains required.


## DNC-SEC-001 — Preserved trust boundaries

- **Status/provenance:** Requirement / original conditional policy grounded in primary guidance.
- **Context/purpose:** Affected untrusted input, deserialization, file/process/network and output boundaries.
- **Instruction:** MUST preserve authorization, input/resource limits, safe serialization, certificate validation and appropriate sensitive-output handling.
- **Evidence:** [S59](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/security-warnings), [S60](https://learn.microsoft.com/en-us/dotnet/standard/serialization/binaryformatter-security-guide), [S61](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca5359); broader operational requirements are original skill policy.
- **Enforcement/gap:** Boundary/caller review, rejection/failure tests and selected analyzer probes; no certification.
- **Compliant:** Keep reviewed TLS validation and structured process arguments.
- **Violation:** Replace certificate validation with an always-true callback.
- **Legitimate exceptions:** A custom trust policy has explicit requirements, limited scope and failure evidence.
- **Tool constraints/fix risk:** Preserve existing contracts and gates; run only authorized local commands. Recorded checks establish only their tested scope.

## DNC-CONCUR-001 — Atomicity and cache initialization

- **Status/provenance:** Requirement / original conditional policy grounded in primary guidance.
- **Context/purpose:** Shared collections, cache factories and compound state transitions.
- **Instruction:** MUST protect the actual invariant and avoid assuming dictionary factories or their side effects execute exactly once.
- **Evidence:** [S65](https://learn.microsoft.com/en-us/dotnet/standard/collections/thread-safe/how-to-add-and-remove-items); broader operational requirements are original skill policy.
- **Enforcement/gap:** Controlled interleaving, retained identity and initialization-count checks; inspect mutable values and eviction.
- **Compliant:** Harmless candidate wrappers and an intentional retained Lazy initialization policy.
- **Violation:** Perform an irreversible write inside GetOrAdd assuming a single call.
- **Legitimate exceptions:** Repeatable candidate creation is safe when discarded candidates have no side effects.
- **Tool constraints/fix risk:** Preserve existing contracts and gates; run only authorized local commands. Recorded checks establish only their tested scope.

## DNC-PACK-001 — Published library compatibility

- **Status/provenance:** Requirement / original conditional policy grounded in primary guidance.
- **Context/purpose:** Packaged/public libraries with an approved compatibility commitment.
- **Instruction:** MUST distinguish source, binary and behavioral contracts; SHOULD validate the actual package and approved baseline with existing tools.
- **Evidence:** [S62](https://learn.microsoft.com/en-us/dotnet/fundamentals/apicompat/package-validation/overview), [S43](https://learn.microsoft.com/en-us/dotnet/standard/library-guidance/breaking-changes); broader operational requirements are original skill policy.
- **Enforcement/gap:** Pack/API comparison plus consumer tests and artifact inspection; APIs do not prove semantics.
- **Compliant:** Test the local package instead of relying only on ProjectReference.
- **Violation:** Reset the comparison baseline to hide a removed public member.
- **Legitimate exceptions:** An explicitly authorized versioned break updates consumers and migration guidance.
- **Tool constraints/fix risk:** Preserve existing contracts and gates; run only authorized local commands. Recorded checks establish only their tested scope.

## DNC-DEPLOY-001 — Verified trimming and Native AOT contracts

- **Status/provenance:** Requirement / original conditional policy grounded in primary guidance.
- **Context/purpose:** Repositories promising trimming or Native AOT on named targets/RIDs.
- **Instruction:** MUST preserve promised deployment modes and verify applicable published artifacts; do not infer compatibility from flags or a managed build.
- **Evidence:** [S63](https://learn.microsoft.com/en-us/dotnet/core/deploying/trimming/prepare-libraries-for-trimming), [S64](https://learn.microsoft.com/en-us/dotnet/core/deploying/native-aot/); broader operational requirements are original skill policy.
- **Enforcement/gap:** Relevant warnings, dependency review and published-artifact smoke tests; unavailable prerequisites block the gate.
- **Compliant:** Investigate trim warnings without declaring compatibility, then test the supported publish profile.
- **Violation:** Set IsAotCompatible or suppress IL warnings and claim tested support.
- **Legitimate exceptions:** Projects without such a deployment commitment need no incidental AOT migration.
- **Tool constraints/fix risk:** Preserve existing contracts and gates; run only authorized local commands. Recorded checks establish only their tested scope.

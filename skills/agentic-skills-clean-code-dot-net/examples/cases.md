# Worked cases and executable fixture

All examples are synthetic. Use them to practice judgment, not to set comment quotas.

## Contract documentation fixture

[Bulk-read XML](documentation/README.md) contrasts superficial and complete
interface/DTO documentation with identical executable source. Both variants compile
and pass the same 16 contract checks; semantic review rejects the superficial
variant. Ordering and validation-failure counterfactuals fail unchanged assertions,
then pass after repair. This is distinct from an executed agent evaluation.

## Research follow-up fixtures

[Options and nullable contracts](contracts/Program.cs) check provider-driven reload,
stable cached values, scope freshness, subscription disposal and host startup
validation. The [nullable helpers](contracts/NullableContracts.cs) have real caller
analysis; isolated removal of each annotation must emit its intended diagnostic.

[Refactoring](refactoring/Program.cs) protects partial/conditional callers,
generated input, an unrelated same-name method and reflection through the original
name. Preservation passes in Debug and Release. Wrong boundary/name/binding
variants must fail the relevant unchanged assertion and pass after repair.
The [native MTP fixture](mtp/Runner.csproj) uses pinned MSTest 4.0.2 and SDK 10.0.400.
It verifies real success, failure, skipped-only and empty execution through the
explicit native verifier path; this does not establish bridge or other framework
support. Execute all of these through the existing optional SDK suite.

The separate [comparison tasks](../evals/comparison-cases.json) are neutral model
inputs; their outcome graders are withheld from the evaluated model. Scenario
definitions, compiler fixtures and actual model comparisons remain distinct evidence.
The good fixture is net10.0/C#14 with an isolated pinned SDK selection. Its profile
and props are byte-matched to the assets in tests; do not apply them to the library
root or copy global.json into an unrelated consumer.

## Realistic multi-file boundary

[IReceiptSink](good/IReceiptSink.cs) defines stream borrowing and commit/cancellation.
[ReceiptService](good/ReceiptService.cs) validates synchronously, owns a temporary
UTF-8 stream, propagates the token and awaits consumption before disposal.
[SelfCheck](good/SelfCheck/Program.cs) uses controlled completion, checking lifetime,
pre-cancel behavior, synchronous validation, post-commit success and sink failure.
[Stream checks](good/SelfCheck/StreamChecks.cs) exercise deferred validation,
borrowed identity/order, token forwarding and combined enumeration cancellation,
and enumerator disposal after completion, early exit, cancellation and failure.
There is no real service, database, clock, sleep or network dependency.

This models a service/API boundary, not a full architecture. The test sink is an
explicit synthetic implementation; it does not prove any production provider's
commit/transaction behavior. A real sink needs its own integration evidence.

Run in a disposable copy of examples/good (commands execute project code):
dotnet restore SelfCheck/SelfCheck.csproj
dotnet format Good.csproj --verify-no-changes --no-restore
dotnet format SelfCheck/SelfCheck.csproj --verify-no-changes --no-restore
dotnet build SelfCheck/SelfCheck.csproj --configuration Release --no-restore -t:Rebuild
dotnet run --project SelfCheck/SelfCheck.csproj --configuration Release --no-build

[DocumentationExamples](good/DocumentationExamples.cs) compiles the XML constructs.
[NamingExamples](good/NamingExamples.cs) probes constant/static/instance selectors.
The fixture emits compiler XML; inheritdoc remains in that output. It is not a
tested rendered documentation website.

[Violation definitions](violations/cases.json) are isolated source strings; the
[test harness](../tests/test_dotnet.py) injects each into a temporary workspace,
expects the stated diagnostic and failing build, removes it, then expects success.
They never join the ordinary good build. No destructive example is executed.

## Actual VSTest fixture

[Runner.csproj](vstest/Runner.csproj) is a separate minimal xUnit/VSTest fixture
targeting net8.0 and net10.0. It has its own test-only formatting policy and does
not weaken the production example's XML/analyzer gates. Its pinned packages are
Microsoft.NET.Test.Sdk 17.14.0, xUnit 2.9.3 and Visual Studio adapter 3.1.5.
The [runner regression](../tests/test_vstest.py) copies the fixture and pinned SDK
selection into a temporary workspace. It checks passing, failing, skipped-only,
empty and net10.0-only empty cases, then repairs the fixture and requires PASS.
Both runtimes must be installed; package restore may contact configured feeds.
Only this fixture/runner combination is demonstrated, not arbitrary adapters.

## Focused review cases

For each case, retain the given contract before considering the suggested repair.
These are examples/expected review findings, not evidence of executed model trials.

| Case | Before or situation | Compliant decision / legitimate exception |
| --- | --- | --- |
| 01 Names | data1 is a receipt total; data2 is the tax | Rename to receiptTotal and tax when in scope; result can remain clear in a tiny method |
| 02 Types | var accounts = factory.Load(); hides lazy query shape | Use the meaningful declared contract; var stream = new MemoryStream() remains apparent |
| 03 Guards | Validate then mutate, nested inside an else | Guard invalid input first only if exception order/effects are preserved |
| 04 Ternaries | approved ? paid ? ship : hold : reject | Name phases/use clear branching; a simple binary expression can stay |
| 05 Extraction | Three wrappers conceal amount > limit | Keep the visible rule; extract a real domain concept or phase, not a line-count workaround |
| 06 Abstraction | One class receives a new interface with no seam | Leave the concrete class; IReceiptSink is justified by destination ownership and test control |
| 07 Noise | // Get receipt. before GetReceiptAsync | Remove the tautology; keep licenses and tool directives |
| 08 Invariant | Token thrown after a confirmed write | Explain and test why post-commit success must remain success |
| 09 History | // Vendor bug observed in ticket DEMO-123, with no evidence | Remove invented history; describe only verified constraints, no fabricated tracking references |
| 10 Public XML | PublishAsync has only a repeated-name summary | Document input, synchronous validation, eventual commit, stream ownership and cancellation |
| 11 Internal/private | Shared internal parser contract versus private IsPositive(int) | XML for the meaningful parser seam; leave the obvious helper uncommented |
| 12 Absence | Find returns null but docs promise empty collection | Fix the false contract wording; don't change runtime semantics for prose convenience |
| 13 Parameters | Generic TItem and token undocumented | Use exact typeparam/param names and constraints/cancellation meaning |
| 14 XML | Raw & and nonexistent cref | Escape content and resolve actual symbols; failure fixtures expect compiler diagnostics |
| 15 Inheritance | Implementation inherits unrelated sync returns | Use only matching authoritative contract; verify generator expansion separately |
| 16 Async docs | returns says “committed receipt” on Task | State what task completion signifies; Task<T> docs describe eventual result |
| 17 Cancellation | Caller cancels after destination commits | Return successful completion; token propagation alone does not prove safe cancellation |
| 18 Blocking | await Task.Run(() => request.Read()) | Use supported naturally async I/O; isolate a truly unavoidable synchronous boundary |
| 19 Lifetime | using stream; return CopyAsync(stream); | Await within the lifetime scope; don't erase await mechanically |
| 20 Borrowing | using DI-provided client/context | Respect container/caller lifetime; dispose only owned responses/scopes/resources |
| 21 Enumeration | query.Count(); then foreach query | Investigate repeatability/cost; materialize only when a snapshot/reuse is actually needed |
| 22 EF | AsNoTracking added before editing entity and SaveChanges | Preserve update tracking; don't share context across parallel queries |
| 23 Logging | LogInformation($"Receipt {id} committed") | Stable template and meaningful field, no sensitive payload |
| 24 Tests | Sleep to wait for cancellation | Controlled completion and explicit token, deterministic observable outcome |
| 25 Leave clear | private bool IsPositive(int value) => value > 0 | No XML or explanation needed; no semantic change |
| 26 Coherent length | Longer sequential import has real validation/commit phases | Keep coherent phases if readable; don't split into meaningless helpers/files |
| 27 Loop | Early-exit search also explains ownership | Keep the justified loop instead of nested LINQ with side effects |
| 28 Framework | async void UI event handler required by framework | Narrow handler delegates awaited operation and handles boundary errors appropriately |
| 29 Values | EF entity converted to record | Reject cosmetic equality/identity change; DTO value snapshots can be records |
| 30 Width | A 160-column raw JSON string | Preserve content; review surrounding layout; dotnet format is not a 120-column guarantee |
| 31 Comparisons | Lowercase two opaque identifiers before comparing | Use specification-appropriate comparer; user-language sorting may be cultural |
| 32 Imports | Remove intentional alias/global using as “unused” | Use semantic tooling/configuration; inspect conditional contexts before removal |

## Before/after reasoning

### Remove noise, keep intent

Before:
```csharp
// Increment the counter.
completedCount++;
```
After:
```csharp
completedCount++;
```
The operation is clear without a comment. No private-helper XML is needed.

### Explain a real consistency boundary

Before:
```csharp
await sink.CommitAsync(receipt, cancellationToken);
cancellationToken.ThrowIfCancellationRequested();
```
After, when the sink contract/tests guarantee commit completion:
```csharp
await sink.CommitAsync(receipt, cancellationToken);
// The sink owns the commit boundary; a post-commit token check could misreport success.
```
This is not an instruction to drop cancellation before work commits.

### Explain method bodies without changing behavior

These examples add only comments. The executable before/after lines are identical
and come from the compiling fixtures; changing behavior requires its own authorized
scope. Useful method-body explanations can preserve intent even when individual
statements have clear names.

The [reader](documentation/Reader.cs) builds its response under the interface's
input-order and repeated-match contract. Before:

```csharp
foreach (string identifier in identifiers)
{
    CatalogRow? row = Find(identifier);
    if (row is not null)
    {
        matches.Add(row);
    }
}
```

After:

```csharp
// Build results in request order; deduplication would discard repeated requested matches.
foreach (string identifier in identifiers)
{
    CatalogRow? row = Find(identifier);
    if (row is not null)
    {
        matches.Add(row);
    }
}
```

This explains the block's collective purpose and why an apparently reasonable
Distinct/set-based replacement would violate the established contract. It does
more than narrate the foreach or repeat a method name.

#### Preserve lifetime

In [ReceiptService](good/ReceiptService.cs), before:

```csharp
using var receipt = new MemoryStream(Encoding.UTF8.GetBytes(text));
await _sink.CommitAsync(receipt, cancellationToken).ConfigureAwait(false);
```

After:

```csharp
// Await consumption before disposing this owned stream; returning the task could close it too early.
using var receipt = new MemoryStream(Encoding.UTF8.GetBytes(text));
await _sink.CommitAsync(receipt, cancellationToken).ConfigureAwait(false);
```

The comment protects a lifetime boundary rather than merely saying “Create stream”
or “Commit receipt.” The actual fixture also explains its separate commit boundary.
Its synchronous wrapper has a targeted comment above validation because moving the
guard into the async core changes when callers observe the exception. Existing
[SelfCheck assertions](good/SelfCheck/Program.cs) exercise pending consumption,
disposal, synchronous validation and cancellation; tests protect behavior while
the adjacent comments explain easily missed reasons for preserving it.

[ConcurrencyChecks](good/SelfCheck/ConcurrencyChecks.cs) already explains why its
test workers are dedicated: both synchronous factories must reach a barrier without
pool starvation. Preserve that verified coordination reason during cleanup; do not
invent a historical runtime bug. A test can need a comment for a non-obvious setup
constraint without requiring narration on ordinary assertions or helpers.

The reader's obvious private helper correctly remains uncommented:

```csharp
private static CatalogRow? Find(string identifier) =>
    s_rows.FirstOrDefault(row => string.Equals(row.Id, identifier, StringComparison.Ordinal));
```

Removing the substantive comments loses rationale without making compilation or
runtime assertions fail. Semantic review checks that loss; no word/count rule or
compiler diagnostic measures comment usefulness. Update comments when their
constraints change and follow available evidence rather than guessing intent.

### Truthful XML beats compiler acceptance

A summary can compile while falsely claiming “returns a stable snapshot” for
a live collection. The expected finding is DNC-DOC-003: correct prose from verified
behavior or implement a separately authorized snapshot contract with tests.
CS1591 absence cannot establish truthful English.

### Longer code can be clearer

An import loop that validates each row, records an accepted row, stops at a
business limit and reports an index can remain one coherent operation. Replace it
only when a real concept/boundary clarifies reasoning; a one-line Aggregate with
hidden mutation is not automatically cleaner. Preserve row order and failures.

## Security, concurrency and deployment boundaries

[Concurrency checks](good/SelfCheck/ConcurrencyChecks.cs) use dedicated test workers
and a bounded barrier to force two GetOrAdd factories. They verify duplicate
candidate creation, shared retained identity and one initialization of a retained
Lazy value. There are no sleeps or production side effects; this is not a universal
cache implementation or eviction/failure policy.

The certificate-validation-bypass entry in [diagnostic cases](violations/cases.json)
expects CA5359 with a narrow fixture-only error severity. It is compiled, never
executed against a network, and does not claim comprehensive security coverage.

[Security guidance](../references/security.md) covers trust-boundary review.
[Library delivery](../references/packaging.md) separates source/binary/behavioral
compatibility and describes actual package consumption and supported publish gates.
AOT guidance is conditional; ordinary fixture success is not native publish evidence.

The [SDK package regression](../tests/test_dotnet.py) packs the good fixture,
checks its DLL/XML assets, runs a synthetic consumer restored from an isolated local
feed, then makes Find internal. A local baseline comparison must fail with CP0002;
restoring the original public member must pass. PackageValidationBaselinePath is
used with SDK 10.0.400 to avoid downloading a baseline or publishing anything.
This checks one removed-member case, not all source/binary/behavioral compatibility.

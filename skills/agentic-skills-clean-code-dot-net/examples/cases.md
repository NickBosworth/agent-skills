# Worked cases and executable fixture

All examples are synthetic. They teach judgments, not comment-count metrics.
The good fixture is net10.0/C#14 with an isolated pinned SDK selection. Its profile
and props are byte-matched to the assets in tests; do not apply them to the library
root or copy global.json into an unrelated consumer.

## Realistic multi-file boundary

[IReceiptSink](good/IReceiptSink.cs) defines stream borrowing and commit/cancellation.
[ReceiptService](good/ReceiptService.cs) validates synchronously, owns a temporary
UTF-8 stream, propagates the token and awaits consumption before disposal.
[SelfCheck](good/SelfCheck/Program.cs) uses controlled completion, checking lifetime,
pre-cancel behavior, synchronous validation, post-commit success and sink failure.
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
The operation is already apparent. No private-helper XML is needed.

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

### Preserve lifetime

Before:
```csharp
using var receipt = new MemoryStream(bytes);
return sink.CommitAsync(receipt, cancellationToken);
```
After:
```csharp
using var receipt = new MemoryStream(bytes);
await sink.CommitAsync(receipt, cancellationToken);
```
The fixture keeps synchronous argument validation in an outer wrapper; moving it
into an async body would change the documented timing.

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

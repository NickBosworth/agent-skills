# Concise, complete bulk-read XML

This synthetic API has no application-specific identifier length limits or real
service. Its two XML variants have identical declarations and executable code:
[superficial XML](WeakContracts.cs.in) and [complete contracts](Contracts.cs).
[Reader](Reader.cs) implements the interface; [checks](Program.cs) exercise caller
behavior. Copy this folder and examples/good/global.json into a disposable workspace.
Run `dotnet run --project Documentation.csproj --configuration Release` there.
The optional [regression](../../tests/test_documentation.py) also replaces Contracts.cs
with the weak variant and proves that both versions compile and pass identical checks.

The inadequate variant puts XML on every public type, interface member, constructor
and property. Its method even has correctly named param and returns tags:

```csharp
/// <summary>Reads rows asynchronously.</summary>
/// <param name="identifiers">The identifiers.</param>
/// <param name="cancellationToken">The cancellation token.</param>
/// <returns>The read result.</returns>
Task<ReadResult> ReadAsync(IReadOnlyList<string> identifiers, CancellationToken cancellationToken = default);
```

DTO constructors and properties merely restate their names: “Initializes a read
result”, “Gets the rows”, and “Gets the error”.
All this XML compiles, yet a caller cannot determine whether blank identifiers
throw, whether an empty result means failure, whether missing keys appear, what
ordering to expect, or whether cancellation is immediate. The DTO XML omits
constructor validation, the row snapshot, and the meaning of a null error.
It fails the semantic gate despite satisfying compiler coverage.

The complete variant documents the method's usable contract:

```csharp
/// <summary>Looks up rows without changing catalog state.</summary>
/// <param name="identifiers">Non-null identifiers compared ordinally and case-sensitively.
/// Empty input succeeds with no rows; any null or whitespace-only item fails the whole request.
/// Do not mutate the input until the returned task completes.</param>
/// <param name="cancellationToken">Observed before and after asynchronous scheduling;
/// cancellation is cooperative, not an immediate-completion guarantee.</param>
/// <returns>A task completing with a non-null result. Success has a null error and rows in
/// input order, including repeated matches; missing identifiers are omitted. No matches yield
/// empty rows. Invalid items yield an error and empty rows instead of throwing validation exceptions.</returns>
/// <exception cref="ArgumentNullException">Thrown synchronously when identifiers is null.</exception>
/// <exception cref="OperationCanceledException">Observed cancellation cancels the returned task,
/// including for empty or invalid input; it is observed before item validation.</exception>
Task<ReadResult> ReadAsync(IReadOnlyList<string> identifiers, CancellationToken cancellationToken = default);
```

The complete DTO constructor XML defines a non-null copied row list, the failure
invariant (non-null error requires empty rows), and actual exceptions. Property
XML states that Rows is a read-only snapshot and Error distinguishes successful
absence from failure. CatalogRow documents preservation of the original key,
non-whitespace validation and a non-null label that may be empty. The interface
owns shared method prose; Reader uses inheritdoc without duplicating it.

The private `Find` helper and `Require`/`Expect` checks are deliberately uncommented:
their names and bodies are clear. Their restraint does not excuse missing public
contract facts. Review verifies documentation truth; compilation checks selected
XML diagnostics, and runtime assertions check behavior. No doc generator or broad
agent-reliability claim follows from these checks.

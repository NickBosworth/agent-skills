using CleanCode.Documentation;

IBulkReader reader = new Reader();
ReadResult empty = await reader.ReadAsync([]);
Require(empty.Error is null && empty.Rows.Count == 0);
ReadResult absent = await reader.ReadAsync(["missing", "ALPHA"]);
Require(absent.Error is null && absent.Rows.Count == 0);
ReadResult found = await reader.ReadAsync(["beta", "alpha", "beta", "missing", "alpha"]);
Require(found.Rows.Select(row => row.Id).SequenceEqual(["beta", "alpha", "beta", "alpha"]));
Require(ReferenceEquals(found.Rows[0], found.Rows[2]) && found.Rows[0].Label == "");
ReadResult invalid = await reader.ReadAsync(["alpha", " "]);
Require(invalid.Error is not null && invalid.Rows.Count == 0);
ReadResult nullItem = await reader.ReadAsync([null!]);
Require(nullItem.Error is not null && nullItem.Rows.Count == 0);
Expect<ArgumentNullException>(() => _ = reader.ReadAsync(null!));
using var cancelled = new CancellationTokenSource();
await cancelled.CancelAsync();
Task<ReadResult> operation = reader.ReadAsync([" "], cancelled.Token);
try
{
    await operation;
    throw new InvalidOperationException("Expected cancellation.");
}
catch (OperationCanceledException)
{
    Require(operation.IsCanceled);
}

var rows = new List<CatalogRow> { new(" kept ", "") };
var snapshot = new ReadResult(rows, null);
rows.Clear();
Require(snapshot.Rows.Count == 1 && snapshot.Rows[0].Id == " kept ");
Expect<NotSupportedException>(() => ((IList<CatalogRow>)snapshot.Rows).Clear());
Expect<ArgumentNullException>(() => _ = new ReadResult(null!, null));
Expect<ArgumentException>(() => _ = new ReadResult(snapshot.Rows, "failure"));
Require(new ReadResult([], "").Error == "");
Expect<ArgumentException>(() => _ = new CatalogRow(" ", "label"));
Expect<ArgumentException>(() => _ = new CatalogRow(null!, "label"));
Expect<ArgumentNullException>(() => _ = new CatalogRow("id", null!));
Console.WriteLine("PASS: 16 documentation contract checks.");

static void Require(bool condition)
{
    if (!condition)
    {
        throw new InvalidOperationException("Documentation contract assertion failed.");
    }
}

static void Expect<TException>(Action action) where TException : Exception
{
    try
    {
        action();
        throw new InvalidOperationException("Expected contract exception.");
    }
    catch (TException)
    {
    }
}

namespace CleanCode.Documentation;

/// <summary>Demonstrates the bulk contract with two fixed synthetic catalog rows.</summary>
internal sealed class Reader : IBulkReader
{
    private static readonly CatalogRow[] s_rows = [new("alpha", "First"), new("beta", "")];

    /// <inheritdoc />
    public Task<ReadResult> ReadAsync(IReadOnlyList<string> identifiers, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(identifiers);
        return ReadCoreAsync(identifiers, cancellationToken);
    }

    private static async Task<ReadResult> ReadCoreAsync(IReadOnlyList<string> identifiers, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        await Task.Yield();
        cancellationToken.ThrowIfCancellationRequested();
        if (identifiers.Any(string.IsNullOrWhiteSpace))
        {
            return new ReadResult([], "Identifiers must not be blank.");
        }

        var matches = new List<CatalogRow>();
        foreach (string identifier in identifiers)
        {
            CatalogRow? row = Find(identifier);
            if (row is not null)
            {
                matches.Add(row);
            }
        }

        return new ReadResult(matches, null);
    }

    private static CatalogRow? Find(string identifier) =>
        s_rows.FirstOrDefault(row => string.Equals(row.Id, identifier, StringComparison.Ordinal));
}

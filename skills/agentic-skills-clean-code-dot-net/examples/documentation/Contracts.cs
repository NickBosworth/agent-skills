namespace CleanCode.Documentation;

/// <summary>Reads available synthetic catalog rows for caller-supplied identifiers.</summary>
public interface IBulkReader
{
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
}

/// <summary>A bulk-read outcome separating successful absence from invalid requests.</summary>
public sealed class ReadResult
{
    /// <summary>Creates a row snapshot or a validation failure.</summary>
    /// <param name="rows">Non-null list copied into a read-only snapshot; must be empty for failure.</param>
    /// <param name="error">Null for success; any non-null string denotes failure, including an empty string.</param>
    /// <exception cref="ArgumentNullException">rows is null.</exception>
    /// <exception cref="ArgumentException">error is non-null and rows is nonempty.</exception>
    public ReadResult(IReadOnlyList<CatalogRow> rows, string? error)
    {
        ArgumentNullException.ThrowIfNull(rows);
        if (error is not null && rows.Count != 0)
        {
            throw new ArgumentException("Failure cannot contain rows.", nameof(rows));
        }

        Rows = Array.AsReadOnly(rows.ToArray());
        Error = error;
    }

    /// <summary>Gets the completed read's rows.</summary>
    /// <value>A non-null read-only snapshot retaining row identity and order; empty for failure or no matches.</value>
    public IReadOnlyList<CatalogRow> Rows
    {
        get;
    }

    /// <summary>Gets the validation failure, if any.</summary>
    /// <value>Null means success, even with no rows; a non-null message means failure.</value>
    public string? Error
    {
        get;
    }
}

/// <summary>An immutable identifier and display label returned by the synthetic catalog.</summary>
public sealed class CatalogRow
{
    /// <summary>Creates a catalog row with a usable lookup key.</summary>
    /// <param name="id">Non-null, non-whitespace key; preserved without trimming or case conversion.</param>
    /// <param name="label">Non-null display text; empty text is allowed.</param>
    /// <exception cref="ArgumentException">id is empty or whitespace-only.</exception>
    /// <exception cref="ArgumentNullException">id or label is null.</exception>
    public CatalogRow(string id, string label)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(id);
        ArgumentNullException.ThrowIfNull(label);
        Id = id;
        Label = label;
    }

    /// <summary>Gets the lookup key.</summary>
    /// <value>The original non-whitespace identifier, compared ordinally by the reader.</value>
    public string Id
    {
        get;
    }

    /// <summary>Gets the display text.</summary>
    /// <value>The non-null label supplied at construction, which can be empty.</value>
    public string Label
    {
        get;
    }
}

namespace CleanCode.Examples;

/// <summary>Commits receipt bytes to a destination.</summary>
public interface IReceiptSink
{
    /// <summary>Consumes the receipt before completing its commit.</summary>
    /// <param name="receipt">A borrowed readable stream; the caller retains ownership.</param>
    /// <param name="cancellationToken">Cancels preparation before commit is irreversible.</param>
    /// <returns>A task whose successful completion confirms that the receipt is committed.</returns>
    /// <exception cref="OperationCanceledException">Cancellation is observed before commit.</exception>
    /// <remarks>
    /// Implementations must not report caller cancellation after a successful commit.
    /// Do not retain the stream for later consumption or dispose it.
    /// </remarks>
    Task CommitAsync(Stream receipt, CancellationToken cancellationToken);
}

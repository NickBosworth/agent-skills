using System.Text;

namespace CleanCode.Examples;

/// <summary>Publishes a UTF-8 receipt to a caller-provided sink.</summary>
public sealed class ReceiptService
{
    private readonly IReceiptSink _sink;

    /// <summary>Creates a publisher that borrows its sink.</summary>
    /// <param name="sink">The destination; its lifetime remains the caller's responsibility.</param>
    /// <exception cref="ArgumentNullException"><paramref name="sink"/> is null.</exception>
    public ReceiptService(IReceiptSink sink)
    {
        ArgumentNullException.ThrowIfNull(sink);
        _sink = sink;
    }

    /// <summary>Publishes a nonempty receipt and waits for its commit.</summary>
    /// <param name="text">Receipt content; must not be null or empty. Whitespace is retained.</param>
    /// <param name="cancellationToken">Requests cancellation before the sink commits.</param>
    /// <returns>A task that completes when the sink confirms the commit.</returns>
    /// <exception cref="ArgumentException"><paramref name="text"/> is null or empty; thrown synchronously.</exception>
    /// <exception cref="OperationCanceledException">Cancellation is observed before commit; observed by awaiting.</exception>
    /// <remarks>
    /// Sink failures propagate through the task. The temporary stream is owned here.
    /// Cancellation after a successful sink commit does not turn success into cancellation.
    /// </remarks>
    public Task PublishAsync(string text, CancellationToken cancellationToken = default)
    {
        // Keep validation outside the async core so invalid input throws before a task is returned.
        ArgumentException.ThrowIfNullOrEmpty(text);
        return PublishCoreAsync(text, cancellationToken);
    }

    private async Task PublishCoreAsync(string text, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        // Await consumption before disposing this owned stream; returning the task could close it too early.
        using var receipt = new MemoryStream(Encoding.UTF8.GetBytes(text));
        // The sink owns the commit boundary; a post-commit token check could misreport success.
        await _sink.CommitAsync(receipt, cancellationToken).ConfigureAwait(false);
    }
}

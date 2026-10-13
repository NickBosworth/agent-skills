using System.Runtime.CompilerServices;
using CleanCode.Examples;

internal static class StreamChecks
{
    internal static async Task RunAsync()
    {
        IAsyncEnumerable<ReceiptView> deferred = ReceiptCollections.StreamAsync(null!);
        bool nullRejected = false;
        try
        {
            await foreach (ReceiptView item in deferred)
            {
                _ = item;
            }
        }
        catch (ArgumentNullException)
        {
            nullRejected = true;
        }

        Require(nullRejected, "Null validation is deferred until enumeration.");

        var first = new ReceiptView("first");
        var second = new ReceiptView("second");
        var completed = new Source(first, second);
        var observed = new List<ReceiptView>();
        using var methodCancellation = new CancellationTokenSource();
        await foreach (ReceiptView item in ReceiptCollections.StreamAsync(completed.ReadAsync(), methodCancellation.Token))
        {
            observed.Add(item);
        }

        Require(observed.Count == 2 && ReferenceEquals(observed[0], first) && ReferenceEquals(observed[1], second),
            "Enumeration preserves order and borrowed identity.");
        Require(completed.Token == methodCancellation.Token && completed.Disposed,
            "Method token reaches the source and completion disposes its enumerator.");

        var stopped = new Source(first, second);
        await foreach (ReceiptView item in ReceiptCollections.StreamAsync(stopped.ReadAsync()))
        {
            _ = item;
            break;
        }

        Require(stopped.Disposed && stopped.Yields == 1, "Early exit disposes without consuming the next item.");

        using var enumerationCancellation = new CancellationTokenSource();
        var cancelled = new Source(first) { BeforeYield = enumerationCancellation.Cancel };
        bool cancellationObserved = false;
        try
        {
            await foreach (ReceiptView item in ReceiptCollections.StreamAsync(cancelled.ReadAsync(), methodCancellation.Token)
                .WithCancellation(enumerationCancellation.Token))
            {
                _ = item;
                throw new InvalidOperationException("A cancelled item was yielded.");
            }
        }
        catch (OperationCanceledException)
        {
            cancellationObserved = true;
        }

        Require(cancellationObserved && cancelled.Token.IsCancellationRequested && cancelled.Disposed,
            "Enumerator cancellation combines with the method token, prevents yield and disposes.");

        var failed = new Source(first) { BeforeYield = () => throw new IOException("Synthetic enumeration failure.") };
        bool failureObserved = false;
        try
        {
            await foreach (ReceiptView item in ReceiptCollections.StreamAsync(failed.ReadAsync()))
            {
                _ = item;
            }
        }
        catch (IOException)
        {
            failureObserved = true;
        }

        Require(failureObserved && failed.Disposed, "Source failure propagates and disposes the enumerator.");
    }

    private static void Require(bool condition, string message)
    {
        if (!condition)
        {
            throw new InvalidOperationException(message);
        }
    }

    private sealed class Source(params ReceiptView[] items)
    {
        internal Action? BeforeYield
        {
            get; init;
        }
        internal CancellationToken Token
        {
            get; private set;
        }
        internal bool Disposed
        {
            get; private set;
        }
        internal int Yields
        {
            get; private set;
        }

        internal async IAsyncEnumerable<ReceiptView> ReadAsync([EnumeratorCancellation] CancellationToken cancellationToken = default)
        {
            Token = cancellationToken;
            try
            {
                await Task.CompletedTask;
                foreach (ReceiptView item in items)
                {
                    BeforeYield?.Invoke();
                    Yields++;
                    yield return item;
                }
            }
            finally
            {
                Disposed = true;
            }
        }
    }
}

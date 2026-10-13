using System.Collections.Concurrent;
using CleanCode.Examples;

internal static class ConcurrencyChecks
{
    internal static async Task RunAsync()
    {
        int factoryCalls = 0;
        var cache = new ConcurrentDictionary<string, ReceiptView>(StringComparer.Ordinal);
        ReceiptView[] results = await RaceAsync(cache, () =>
        {
            Interlocked.Increment(ref factoryCalls);
            return new ReceiptView("receipt");
        });
        Require(factoryCalls == 2, "Competing GetOrAdd factories can both execute.");
        Require(cache.Count == 1 && ReferenceEquals(results[0], results[1]),
            "Both callers receive the retained value, not necessarily their candidate.");

        int candidates = 0;
        int initializations = 0;
        var lazyCache = new ConcurrentDictionary<string, Lazy<ReceiptView>>(StringComparer.Ordinal);
        Lazy<ReceiptView>[] lazyResults = await RaceAsync(lazyCache, () =>
        {
            Interlocked.Increment(ref candidates);
            return new Lazy<ReceiptView>(() =>
            {
                Interlocked.Increment(ref initializations);
                return new ReceiptView("receipt");
            }, LazyThreadSafetyMode.ExecutionAndPublication);
        });
        Require(candidates == 2 && ReferenceEquals(lazyResults[0], lazyResults[1]),
            "Discarded Lazy wrappers have no initialization side effects.");
        ReceiptView first = lazyResults[0].Value;
        ReceiptView second = lazyResults[1].Value;
        Require(initializations == 1 && ReferenceEquals(first, second),
            "The retained Lazy value initializes once.");
    }

    private static async Task<TItem[]> RaceAsync<TItem>(ConcurrentDictionary<string, TItem> cache, Func<TItem> create)
    {
        using var competingFactories = new Barrier(2);
        // Dedicated test workers let both synchronous factories reach the barrier without pool starvation.
        Task<TItem> Start() => Task.Factory.StartNew(() => cache.GetOrAdd("receipt", _ =>
        {
            if (!competingFactories.SignalAndWait(TimeSpan.FromSeconds(5)))
            {
                throw new TimeoutException("Synthetic factory coordination timed out.");
            }

            return create();
        }), CancellationToken.None, TaskCreationOptions.LongRunning, TaskScheduler.Default);

        Task<TItem> first = Start();
        Task<TItem> second = Start();
        return await Task.WhenAll(first, second).WaitAsync(TimeSpan.FromSeconds(10));
    }

    private static void Require(bool condition, string message)
    {
        if (!condition)
        {
            throw new InvalidOperationException(message);
        }
    }
}

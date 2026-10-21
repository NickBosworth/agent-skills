using Fixture.Host;

var (api, worker) = Composition.Create();
var assertions = 0;
foreach (var available in new[] { -1, 0, 1, 2, int.MaxValue })
{
    foreach (var requested in new[] { -1, 0, 1, 2, int.MaxValue })
    {
        var accepted = requested > 0 && available >= requested;
        var expected = requested <= 0 ? "invalid" : accepted ? "accepted" : "full";
        Require(api.Reserve("tenant-a", available, requested, default) == expected);
        Require(worker.Execute("tenant-a", available, requested, default) == accepted);
        Require(api.Reserve("tenant-b", available, requested, default) == "denied");
        Require(!worker.Execute("tenant-b", available, requested, default));
    }
}
using var cancellation = new CancellationTokenSource();
cancellation.Cancel();
RequireCancellation(() => api.Reserve("tenant-b", 0, 0, cancellation.Token));
RequireCancellation(() => worker.Execute("tenant-b", 0, 0, cancellation.Token));
Console.WriteLine($"PASS: {assertions} contract assertions.");

void Require(bool condition)
{
    assertions++;
    if (!condition)
    {
        throw new InvalidOperationException("Admission contract changed.");
    }
}

void RequireCancellation(Action action)
{
    try
    {
        action();
        throw new InvalidOperationException("Cancellation contract changed.");
    }
    catch (OperationCanceledException)
    {
        assertions++;
    }
}

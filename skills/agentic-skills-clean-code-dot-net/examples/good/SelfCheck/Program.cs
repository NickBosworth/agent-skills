using CleanCode.Examples;

var sink = new ControlledSink();
var service = new ReceiptService(sink);
using var callerCancellation = new CancellationTokenSource();
Task publishing = service.PublishAsync("receipt", callerCancellation.Token);
Require(sink.Receipt?.CanRead == true && !publishing.IsCompleted, "Receipt stays open during the pending commit.");
sink.CompleteCommit();
await publishing;
Require(sink.Receipt?.CanRead == false && sink.Committed, "Owned receipt closes only after commit.");

using var alreadyCancelled = new CancellationTokenSource();
await alreadyCancelled.CancelAsync();
await ExpectCancellationAsync(service.PublishAsync("receipt", alreadyCancelled.Token));
Require(sink.Calls == 1, "Pre-cancelled calls cannot reach the sink.");

bool validationWasSynchronous = false;
try
{
    _ = service.PublishAsync(string.Empty);
}
catch (ArgumentException)
{
    validationWasSynchronous = true;
}

Require(validationWasSynchronous, "Input validation precedes task creation.");

using var afterCommit = new CancellationTokenSource();
var cancellingSink = new ControlledSink(afterCommit.Cancel);
Task committed = new ReceiptService(cancellingSink).PublishAsync("receipt", afterCommit.Token);
cancellingSink.CompleteCommit();
await committed;
Require(cancellingSink.Committed && afterCommit.IsCancellationRequested, "Post-commit cancellation remains success.");

var failingSink = new ControlledSink();
Task failed = new ReceiptService(failingSink).PublishAsync("receipt");
failingSink.FailCommit();
try
{
    await failed;
    throw new InvalidOperationException("Sink failure was swallowed.");
}
catch (IOException)
{
    Require(failingSink.Receipt?.CanRead == false, "Failure also disposes owned receipt.");
}

var first = new ReceiptView("first");
Require(ReceiptCollections.Find(new[] { first }, item => item.Text == "first") == first, "Find retains identity.");
Require(ReceiptCollections.Find(new[] { first }, item => item.Text == "absent") is null, "Absence stays null.");
Require(first[0] == 'f' && new ReceiptView(null).ToString() == string.Empty, "View display contracts agree.");
await StreamChecks.RunAsync();
await ConcurrencyChecks.RunAsync();
Console.WriteLine("PASS: 19 behavioral assertions.");

static void Require(bool condition, string message)
{
    if (!condition)
    {
        throw new InvalidOperationException(message);
    }
}

static async Task ExpectCancellationAsync(Task operation)
{
    try
    {
        await operation;
        throw new InvalidOperationException("Expected cancellation.");
    }
    catch (OperationCanceledException)
    {
    }
}

internal sealed class ControlledSink(Action? onCommit = null) : IReceiptSink
{
    private readonly TaskCompletionSource _completion = new(TaskCreationOptions.RunContinuationsAsynchronously);
    internal Stream? Receipt
    {
        get; private set;
    }
    internal bool Committed
    {
        get; private set;
    }
    internal int Calls
    {
        get; private set;
    }

    public async Task CommitAsync(Stream receipt, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        Calls++;
        Receipt = receipt;
        await _completion.Task.ConfigureAwait(false);
        Committed = true;
        onCommit?.Invoke();
    }

    internal void CompleteCommit() => _completion.SetResult();
    internal void FailCommit() => _completion.SetException(new IOException("Synthetic sink failure."));
}

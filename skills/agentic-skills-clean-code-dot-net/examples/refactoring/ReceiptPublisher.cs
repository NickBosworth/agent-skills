internal partial class ReceiptPublisher
{
    public int PublishReceipt(int value) => value * 2;
}

internal static class UnrelatedPublisher
{
    internal static int PublishReceipt(int value) => value + 10;
}

internal static class Boundary
{
    internal static bool IsAllowed(int value) => value >= 0;
}

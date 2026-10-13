internal partial class ReceiptPublisher
{
    internal int ConditionalCall()
    {
#if DEBUG
        return PublishReceipt(5);
#else
        return PublishReceipt(7);
#endif
    }
}

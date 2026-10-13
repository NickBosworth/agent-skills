var publisher = new ReceiptPublisher();
if (publisher.PublishReceipt(2) != 4 || publisher.GeneratedCall() != 6)
{
    throw new InvalidOperationException("Receipt result contract.");
}
#if DEBUG
var expected = 10;
#else
var expected = 14;
#endif
if (publisher.ConditionalCall() != expected || UnrelatedPublisher.PublishReceipt(2) != 12)
{
    throw new InvalidOperationException("Conditional or unrelated binding changed.");
}
var reflected = typeof(ReceiptPublisher).GetMethod("PublishReceipt");
if (reflected is null || (int?)reflected.Invoke(publisher, [2]) != 4)
{
    throw new InvalidOperationException("External name contract changed.");
}
if (!Boundary.IsAllowed(0) || Boundary.IsAllowed(-1))
{
    throw new InvalidOperationException("Inclusive zero boundary contract.");
}
Console.WriteLine("PASS: binding, generation, external-name and boundary contracts.");

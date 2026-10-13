[assembly: Parallelize(Scope = ExecutionScope.MethodLevel)]

[TestClass]
public sealed class RunnerTests
{
    [TestMethod]
    public void AdditionRetainsItsResult()
    {
        Assert.AreEqual(4, ReceiptMath.Add(2, 2));
    }
}

internal static class ReceiptMath
{
    internal static int Add(int left, int right) => left + right;
}

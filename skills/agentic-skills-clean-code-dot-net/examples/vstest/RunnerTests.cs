using Xunit;

namespace CleanCode.RunnerFixture;

public sealed class RunnerTests
{
    [Fact]
    public void PassingContract()
    {
        Assert.Equal(4, 2 + 2);
    }
}

namespace Fixture.Billing;

internal static class PaymentWindow
{
    public static bool IsOverdue(DateTimeOffset now, DateTimeOffset deadline) => now > deadline;
}

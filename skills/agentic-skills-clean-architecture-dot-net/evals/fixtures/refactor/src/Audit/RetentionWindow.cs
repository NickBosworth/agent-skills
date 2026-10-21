namespace Fixture.Audit;

internal static class RetentionWindow
{
    public static bool CanDelete(DateTimeOffset now, DateTimeOffset deadline) => now > deadline;
}

namespace CleanCode.Examples;

// Fixture-only selectors verify that constants outrank static and instance field rules.
internal sealed class NamingExamples
{
    private const int DefaultRetryLimit = 3;
    private static readonly int s_retryLimit = DefaultRetryLimit;
    private readonly int _retryLimit = s_retryLimit;

    internal int RetryLimit => _retryLimit;
}

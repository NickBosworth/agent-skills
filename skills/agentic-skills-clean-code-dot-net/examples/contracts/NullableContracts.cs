using System.Diagnostics.CodeAnalysis;

internal sealed class NullableContracts
{
    private string _label;

    internal NullableContracts()
    {
        Initialize();
    }

    internal string Label => _label;

    [MemberNotNull(nameof(_label))]
    private void Initialize()
    {
        _label = "synthetic";
    }

    internal static bool TryLabel(string? input, [NotNullWhen(true)] out string? label)
    {
        label = input;
        return input is not null;
    }

    [return: NotNullIfNotNull(nameof(input))]
    internal static string? Preserve(string? input) => input;
}

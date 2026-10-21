namespace Fixture.Import;

internal static class InvoiceNumber
{
    public static string Format(int year, int sequence) => $"{year}-{sequence:D6}";
}

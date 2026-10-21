namespace Fixture.Parsing;

/// <summary>Reads tag text from a caller-owned stream.</summary>
public static class TagParser
{
    /// <summary>Reads text while the caller retains ownership of the stream.</summary>
    /// <param name="source">Readable caller-owned stream.</param>
    /// <returns>The complete remaining text, including line breaks.</returns>
    /// <remarks>The caller may continue using the stream after this operation.</remarks>
    public static string Read(Stream source)
    {
        using var reader = new StreamReader(source);
        return reader.ReadToEnd();
    }
}

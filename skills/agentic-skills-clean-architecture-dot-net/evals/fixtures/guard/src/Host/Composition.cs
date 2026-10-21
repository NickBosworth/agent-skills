namespace Fixture.Host;

internal static class Composition
{
    internal static object Create() => new Fixture.Provider.Store();
}

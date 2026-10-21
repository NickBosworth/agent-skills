using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;

internal static class Projects
{
    /// <summary>Builds the three synthetic projects with real symbol references.</summary>
    /// <param name="root">Fixture project root containing src.</param>
    /// <returns>Named semantic compilations, including the provider wiring dependency.</returns>
    /// <exception cref="InvalidOperationException">A source compilation has errors.</exception>
    internal static IReadOnlyList<CSharpCompilation> Load(string root)
    {
        var platformPaths = AppContext.GetData("TRUSTED_PLATFORM_ASSEMBLIES") as string
            ?? throw new InvalidOperationException("Runtime platform references are unavailable.");
        var platform = platformPaths
            .Split(Path.PathSeparator)
            .Select(path => MetadataReference.CreateFromFile(path))
            .ToArray();
        var projects = new List<CSharpCompilation>();
        foreach (var name in new[] { "Provider", "Domain", "Host" })
        {
            var trees = Directory.GetFiles(Path.Combine(root, "src", name), "*.cs", SearchOption.AllDirectories)
                .Select(path => CSharpSyntaxTree.ParseText(File.ReadAllText(path), path: path));
            IEnumerable<MetadataReference> references = platform;
            if (name != "Provider")
            {
                references = references.Append(projects[0].ToMetadataReference());
            }
            var project = CSharpCompilation.Create(name, trees, references,
                new CSharpCompilationOptions(OutputKind.DynamicallyLinkedLibrary));
            if (project.GetDiagnostics().Any(diagnostic => diagnostic.Severity == DiagnosticSeverity.Error))
            {
                throw new InvalidOperationException("Invalid source compilation; inspect fixture privately.");
            }
            projects.Add(project);
        }
        return projects;
    }
}

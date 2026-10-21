# Dependency guard fixture

The existing checker is a .NET console program with SDK-bundled Roslyn references.
Run `dotnet run --project checks/Guard -- .` from the project root. It currently
builds semantic compilations and reports project count; it does not enforce the
accepted dependency policy yet. Use this stack; no NuGet package is needed.

Projects.Load supplies named semantic compilations for the complete src fixture.
A compile error is an invalid probe, not evidence that an architecture check caught
its intended violation. This is a synthetic source-analysis fixture, not a general
purpose analyzer or a production application. Reflection and database access are
outside its checkable source boundary.

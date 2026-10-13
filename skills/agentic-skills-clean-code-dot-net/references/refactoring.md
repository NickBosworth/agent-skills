# Refactoring by symbol and contract

Load for renames, moves, extraction, consolidation or generated/partial changes.
Sources: [Roslyn workspace](https://learn.microsoft.com/en-us/dotnet/csharp/roslyn-sdk/work-with-workspace),
[compatibility](https://learn.microsoft.com/en-us/dotnet/core/compatibility/library-change-rules),
and the researched [tool-selection workflow](https://github.com/dotnet/skills/blob/main/plugins/dotnet/skills/csharp-refactoring/SKILL.md).

Use the strongest available binding-aware mechanism: repository-approved IDE or
Roslyn refactoring, C# language-server reference/rename operations, an applicable
analyzer code fix, then inspected manual edits verified by compilation. Discover
available tools; do not install a server or pretend a semantic tool was used.
Text replacement is appropriate only when every hit is inspected and scope is
provably small. Compilation cannot detect all runtime name contracts.

| Observed boundary | Action and evidence |
| --- | --- |
| Identical spelling on unrelated symbols or overloads | Resolve the target symbol and all its references; retain unrelated bindings. |
| Partial declarations or generated members | Include all declarations; change the owning input/template and regenerate using the repository command. Preserve generated-output policy. |
| Conditional compilation or multiple targets | Inspect all affected branches; explicitly compile required target/configuration combinations. State uncovered branches. |
| Reflection, JSON, configuration, DI or native entry-point name | Preserve the observed external name through existing metadata or a compatible entry point; exercise that old-name path. |
| Shipped public member or friend assembly | Inspect external and friend consumers; retain compatible forwarding APIs unless the break is authorized. Local absence of references is insufficient. |
| Private local extraction | Preserve caller-specific inputs, evaluation order, rounding, lazy execution and side effects; avoid a new abstraction without a real purpose. |

Separate structural edits from authorized behavior changes so the diff and tests
can explain each. Do not abandon an authorized implementation because it includes
a behavior change; apply its proper contract and test obligations. For uncertain
behavior, characterize it first. For already-correct code, leave it unchanged.

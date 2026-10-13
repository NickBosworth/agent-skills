# Select the actual test platform

Load before selecting unfamiliar .NET test commands or diagnosing runner flags.
Sources: [dotnet test platforms](https://learn.microsoft.com/en-us/dotnet/core/testing/unit-testing-with-dotnet-test),
[MTP integration](https://learn.microsoft.com/en-us/dotnet/core/testing/microsoft-testing-platform-integration-dotnet-test),
[MTP TRX extension](https://learn.microsoft.com/en-us/dotnet/core/testing/microsoft-testing-platform-extensions-test-reports).

Separate three facts: test framework (such as MSTest/xUnit/NUnit/TUnit), platform
executing tests (VSTest/MTP), and dotnet command mode. A framework name or one
package reference does not establish all three.

Inspect the repository's CI/scripts, selected SDK/global.json, project SDK,
packages and final imported MSBuild properties for the chosen configuration and
each framework. Account for local overrides, conditional imports and late targets.
UseVSTest or an incomplete executable bridge can invalidate a guessed MTP command.

| Verified mode | Command policy |
| --- | --- |
| Classic non-SDK project | Use its documented compatible runner; do not silently migrate it to dotnet test. |
| VSTest command mode and VSTest platform | Repository dotnet test command with VSTest logger/filter options. |
| VSTest command mode with enabled executable MTP bridge | Keep dotnet/MSBuild arguments before -- and MTP application arguments after it. |
| SDK 10+ native MTP selected in global.json | Native dotnet test project/solution selection with supported MTP 1.7+; arguments can be direct. A separator may be supported for unambiguous forwarding; follow the actual SDK. |
| Unknown, contradictory or unsupported combination | Inspect effective settings or report the precise missing prerequisite; do not probe arbitrary flags until something exits zero. |

Select runner-specific filters and reports; xUnit v3 and TUnit do not share every
VSTest filter. Request a supported report extension only when installed. Verify
selected and executed tests, failed/skipped counts and report freshness for each
required framework. A process exit of zero is insufficient evidence.

The bundled verifier's supported execution paths and observed versions live in
[tooling](tooling.md) and [validation](../VALIDATION.md). Follow repository commands
outside that boundary and retain honest BLOCKED/NOT RUN reporting.

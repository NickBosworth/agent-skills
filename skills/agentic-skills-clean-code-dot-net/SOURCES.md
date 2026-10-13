# Source register

Checked 2026-10-13 against the public primary-source pages below. Access date is
not a publication date. Unless separately noted, no page update date was recorded;
GitHub main/master and living docs can change. Explanations and fixtures are
original CC0 material; links do not relicense third-party text or trademarks.
No lengthy source excerpts are bundled.

Microsoft's conventions are adaptable; runtime conventions are contextual.
Older Framework Design Guidelines are an API-design aid, not authority to reject
modern supported constructs. Library ConfigureAwait policy differs from application
continuations. External/shared API XML differs from private comments. Apparent-type
var is a profile choice. Value records differ from tracked entity identity.
Framework exceptions take their actual contracts over generic aesthetic advice.

The default profile, workflow, checklists, semantic requirements and rule severities
are original skill policy. Source IDs support underlying facts, not a claim that
Microsoft mandates every MUST. Bundled guidance works offline.

## Reviewed sources

- **S01** [Microsoft: Common C# code conventions ](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/coding-style/coding-conventions) — checked 2026-10-13. Adaptable sample conventions, not universal law.
- **S02** [Microsoft: C# identifier naming rules and conventions ](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/coding-style/identifier-names) — checked 2026-10-13. Identifier rules differ from naming conventions.
- **S03** [dotnet/runtime: C# coding style ](https://github.com/dotnet/runtime/blob/main/docs/coding-guidelines/coding-style.md) — checked 2026-10-13. Runtime-specific field, import and var conventions; its brace exceptions differ from this profile.
- **S04** [Microsoft: Framework Design Guidelines; note the page's age/context caveat ](https://learn.microsoft.com/en-us/dotnet/standard/design-guidelines/) — checked 2026-10-13. Older framework design advice needs reconciliation with current APIs.
- **S05** [Microsoft: Recommended XML documentation tags ](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/xmldoc/recommended-tags) — checked 2026-10-13. Tags, inheritance and XML syntax inform contract writing.
- **S06** [C# language specification: Documentation comments ](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/language-specification/documentation-comments) — checked 2026-10-13. Compiler XML semantics, references and declaration coverage.
- **S07** [Microsoft: Example XML documentation comments ](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/xmldoc/examples) — checked 2026-10-13. Primary reference for the associated topic; execution claims are recorded separately.
- **S08** [Microsoft: Compiler warning CS1591 ](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/compiler-messages/cs1591) — checked 2026-10-13. CS1591 measures missing external coverage, not documentation truth.
- **S09** [DocFX: .NET API documentation ](https://dotnet.github.io/docfx/docs/dotnet-api-docs.html) — checked 2026-10-13. Rendered inheritance requires generator verification.
- **S10** [Google Engineering Practices: What to look for in a code review ](https://google.github.io/eng-practices/review/reviewer/looking-for.html) — checked 2026-10-13. Primary reference for the associated topic; execution claims are recorded separately.
- **S11** [Microsoft: Code analysis in .NET, including build-time style enforcement ](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/overview) — checked 2026-10-13. SDK quality analysis and build-style opt-in are distinct.
- **S12** [Microsoft: Configure code analysis rules ](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/configuration-options) — checked 2026-10-13. Analysis mode and bulk severities can interact.
- **S13** [Microsoft: C# formatting options ](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/style-rules/csharp-formatting-options) — checked 2026-10-13. Primary reference for the associated topic; execution claims are recorded separately.
- **S14** [Microsoft: Code-style naming rules ](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/style-rules/naming-rules) — checked 2026-10-13. Naming selectors overlap; IDE1006 build severity must be explicit.
- **S15** [Microsoft: dotnet format command ](https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-format) — checked 2026-10-13. Verification checks supported fixes, not every semantic rule.
- **S16** [Microsoft: Compiler options for errors and warnings ](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/compiler-options/errors-warnings) — checked 2026-10-13. Compiler warnings-as-errors and MSBuild warning scope differ.
- **S17** [Microsoft: MSBuild properties for Microsoft.NET.Sdk ](https://learn.microsoft.com/en-us/dotnet/core/project-sdk/msbuild-props) — checked 2026-10-13. Effective property evaluation/import order matters.
- **S18** [Microsoft: Configure C# language version ](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/configure-language-version) — checked 2026-10-13. Target-compatible language defaults; no latest shortcut.
- **S19** [Microsoft: global.json overview ](https://learn.microsoft.com/en-us/dotnet/core/tools/global-json) — checked 2026-10-13. SDK selection/roll-forward is repository policy.
- **S20** [Microsoft: .NET support policy ](https://dotnet.microsoft.com/en-us/platform/support/policy/dotnet-core) — checked 2026-10-13. Checked page listed .NET 10 as released LTS; page update 2026-09-08, distinct from access date.
- **S21** [Microsoft: Nullable reference types ](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/null-safety/nullable-reference-types) — checked 2026-10-13. Compile-time annotations do not replace runtime validation.
- **S22** [Microsoft: Record types reference ](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/record) — checked 2026-10-13. Value records and shallow immutability differ from tracked identity.
- **S23** [Microsoft: Best practices for exceptions ](https://learn.microsoft.com/en-us/dotnet/standard/exceptions/best-practices-for-exceptions) — checked 2026-10-13. Primary reference for the associated topic; execution claims are recorded separately.
- **S24** [Microsoft: Asynchronous programming ](https://learn.microsoft.com/en-us/dotnet/csharp/asynchronous-programming/) — checked 2026-10-13. Primary reference for the associated topic; execution claims are recorded separately.
- **S25** [Stephen Toub, .NET Blog: ConfigureAwait FAQ ](https://devblogs.microsoft.com/dotnet/configureawait-faq/) — checked 2026-10-13. Continuation policy is context-sensitive; false does not create a thread.
- **S26** [Andrew Arnott, Microsoft Developer Support: Recommended CancellationToken patterns ](https://devblogs.microsoft.com/premier-developer/recommended-patterns-for-cancellationtoken/) — checked 2026-10-13. Consistency defines the point beyond which cancellation cannot be observed safely.
- **S27** [Microsoft: CA2016, forward cancellation tokens ](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca2016) — checked 2026-10-13. Primary reference for the associated topic; execution claims are recorded separately.
- **S28** [Microsoft: CA2007 and its application/library applicability ](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca2007) — checked 2026-10-13. CA2007 is contextual; avoid imposing library continuation policy on apps.
- **S29** [Microsoft: CA1849, call async methods in async methods ](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1849) — checked 2026-10-13. Primary reference for the associated topic; execution claims are recorded separately.
- **S30** [Microsoft: CA2012, use ValueTasks correctly ](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca2012) — checked 2026-10-13. Primary reference for the associated topic; execution claims are recorded separately.
- **S31** [Microsoft: Dependency injection guidelines ](https://learn.microsoft.com/en-us/dotnet/core/extensions/dependency-injection/guidelines) — checked 2026-10-13. Container ownership, scope and hidden service location matter.
- **S32** [Microsoft: Implement a Dispose method ](https://learn.microsoft.com/en-us/dotnet/standard/garbage-collection/implementing-dispose) — checked 2026-10-13. Primary reference for the associated topic; execution claims are recorded separately.
- **S33** [Microsoft: Best practices for comparing strings ](https://learn.microsoft.com/en-us/dotnet/standard/base-types/best-practices-strings) — checked 2026-10-13. Non-linguistic identifiers and user language need different comparisons.
- **S34** [Microsoft: Best practices for unit tests ](https://learn.microsoft.com/en-us/dotnet/core/testing/unit-testing-best-practices) — checked 2026-10-13. Tests describe observable scenarios; no universal assertion-count mandate.
- **S35** [Microsoft: TimeProvider overview ](https://learn.microsoft.com/en-us/dotnet/standard/datetime/timeprovider-overview) — checked 2026-10-13. Primary reference for the associated topic; execution claims are recorded separately.
- **S36** [Microsoft: ASP.NET Core best practices; select the appropriate version ](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/best-practices?view=aspnetcore-10.0) — checked 2026-10-13. Returned page has conflicting version banners despite the 10.0 selector; use only general request-lifetime guidance and reconcile HTTP advice with S39.
- **S37** [Microsoft: EF Core efficient querying ](https://learn.microsoft.com/en-us/ef/core/performance/efficient-querying) — checked 2026-10-13. Projection, loading and translation need provider-aware evidence.
- **S38** [Microsoft: DbContext lifetime, configuration, and initialization ](https://learn.microsoft.com/en-us/ef/core/dbcontext-configuration/) — checked 2026-10-13. One context cannot serve parallel operations safely.
- **S39** [Microsoft: HttpClient guidelines ](https://learn.microsoft.com/en-us/dotnet/fundamentals/networking/http/httpclient-guidelines) — checked 2026-10-13. Long-lived and factory-managed clients are both supported approaches.
- **S40** [Microsoft: High-performance logging ](https://learn.microsoft.com/en-us/dotnet/core/extensions/logging/high-performance-logging) — checked 2026-10-13. Primary reference for the associated topic; execution claims are recorded separately.
- **S41** [Microsoft: CA2254, stable logging templates ](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca2254) — checked 2026-10-13. Primary reference for the associated topic; execution claims are recorded separately.
- **S42** [Microsoft: CA1851, possible multiple enumeration ](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca1851) — checked 2026-10-13. Primary reference for the associated topic; execution claims are recorded separately.
- **S43** [Microsoft: Breaking changes and .NET libraries ](https://learn.microsoft.com/en-us/dotnet/standard/library-guidance/breaking-changes) — checked 2026-10-13. External compatibility includes more than local signatures.
- **S44** [StyleCop.Analyzers maintainers: Configuration ](https://github.com/DotNetAnalyzers/StyleCopAnalyzers/blob/master/documentation/Configuration.md) — checked 2026-10-13. Optional analyzer configuration; no tested package version claimed.
- **S45** [CSharpier maintainers: About the formatter ](https://csharpier.com/docs/About) — checked 2026-10-13. Alternative whitespace owner, not a second mandatory formatter.
- **S46** [Agent Skills: Specification and progressive-disclosure guidance ](https://agentskills.io/specification) — checked 2026-10-13. Format and progressive loading; prose does not ensure host activation.
- **S47** [Microsoft: IDE0005, unnecessary imports ](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/style-rules/ide0005) — checked 2026-10-13. Unnecessary imports have tooling/compilation context constraints.
- **S48** [Microsoft: IDE0055, formatting ](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/style-rules/ide0055) — checked 2026-10-13. Formatting diagnostic does not cover semantic correctness.
- **S49** [Microsoft: Code quality rules index ](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/) — checked 2026-10-13. Primary reference for the associated topic; execution claims are recorded separately.
- **S50** [Microsoft: Generate XML documentation from source code ](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/tutorials/xml-documentation) — checked 2026-10-13. Primary reference for the associated topic; execution claims are recorded separately.
- **S51** [Microsoft: .NET code style rule options ](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/code-style-rule-options) — checked 2026-10-13. Explicit IDE severity and build settings must agree.
- **S52** [Microsoft: Testing with FakeTimeProvider ](https://learn.microsoft.com/en-us/dotnet/core/extensions/timeprovider-testing) — checked 2026-10-13. Use installed/compatible fake-clock tooling; no added package required.

- **S53** [CA2000 disposal diagnostic](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca2000) — checked 2026-10-13. Stream-family exclusions leave ownership gaps; the executable negative fixture uses an owned CancellationTokenSource.
- **S54** [Pinned setup-dotnet action](https://github.com/actions/setup-dotnet/commit/d4c94342e560b34958eacfc5d055d21461ed1c5d) — checked 2026-10-13. Commit resolves; no executed GitHub Actions run is implied.

- **S55** [VSTest run summary counters](https://github.com/microsoft/vstest/blob/main/src/Microsoft.TestPlatform.Extensions.TrxLogger/ObjectModel/TestRunSummary.cs) and [TRX logger summary construction](https://github.com/microsoft/vstest/blob/main/src/Microsoft.TestPlatform.Extensions.TrxLogger/TrxLogger.cs) — checked 2026-10-13 for the 1.0.1 parser fix. VSTest serializes the run outcome separately from counts, uses Completed for successful runs, and can include skipped results in total without populating notExecuted. These living source links inform parser policy; they are not an executed adapter compatibility claim.

- **S56** [MSBuild command-line properties](https://learn.microsoft.com/en-us/visualstudio/msbuild/msbuild-command-line-reference) — checked 2026-10-13. -getProperty evaluates imported project properties without a build target; the helper reads both TargetFramework and TargetFrameworks.
- **S57** [dotnet test with VSTest](https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-test-vstest) — checked 2026-10-13. --framework scopes a run; VSTest supports TRX output. The package executes each evaluated framework separately rather than merging evidence across frameworks.

- **S58** [Python: os.walk](https://docs.python.org/3/library/os.html#os.walk) — checked 2026-10-13. Top-down traversal permits pruning directory names in place; onerror is used to reject incomplete inventories.

- **S59** [Security analyzer rules](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/security-warnings) — checked 2026-10-13. Selected rules inform boundary review; a clean analyzer run is not security certification.
- **S60** [BinaryFormatter security](https://learn.microsoft.com/en-us/dotnet/standard/serialization/binaryformatter-security-guide) — checked 2026-10-13. A binder does not make BinaryFormatter safe.
- **S61** [CA5359 certificate validation](https://learn.microsoft.com/en-us/dotnet/fundamentals/code-analysis/quality-rules/ca5359) — checked 2026-10-13. Always-true validation callbacks remove server authentication.
- **S62** [SDK package validation](https://learn.microsoft.com/en-us/dotnet/fundamentals/apicompat/package-validation/overview) — checked 2026-10-13. Package checks cover API/baseline consistency, not behavioral semantics.
- **S63** [Prepare libraries for trimming](https://learn.microsoft.com/en-us/dotnet/core/deploying/trimming/prepare-libraries-for-trimming) — checked 2026-10-13. Analyzer configuration differs from a compatibility declaration; consuming-app analysis exposes dependency paths.
- **S64** [Native AOT deployment](https://learn.microsoft.com/en-us/dotnet/core/deploying/native-aot/) — checked 2026-10-13. Native publishing has deployment/toolchain constraints; managed build success is insufficient.
- **S65** [ConcurrentDictionary competing factories](https://learn.microsoft.com/en-us/dotnet/standard/collections/thread-safe/how-to-add-and-remove-items) — checked 2026-10-13. Factory delegates run outside collection locks and may execute more than once.

- **S66** [Baseline package validation](https://learn.microsoft.com/en-us/dotnet/fundamentals/apicompat/package-validation/baseline-version-validator) — checked 2026-10-13. Optional-parameter changes can break compiled callers; SDK baseline checks detect missing members. The local SDK also exposes PackageValidationBaselinePath for a synthetic local package.

## Execution versus research

Research follow-up checked 2026-10-13:
- **S67** [Roslyn workspaces](https://learn.microsoft.com/en-us/dotnet/csharp/roslyn-sdk/work-with-workspace) and [.NET refactoring skill](https://github.com/dotnet/skills/blob/main/plugins/dotnet/skills/csharp-refactoring/SKILL.md) inform binding-aware tool selection. No IDE integration is bundled or claimed tested.
- **S68** [Options pattern](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/configuration/options) and [nullable attributes](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/attributes/nullable-analysis) inform the conditional contract fixture, not universal startup/reload policy.
- **S69** [Test-platform command modes](https://learn.microsoft.com/en-us/dotnet/core/testing/unit-testing-with-dotnet-test) and [MTP reports](https://learn.microsoft.com/en-us/dotnet/core/testing/microsoft-testing-platform-test-reports) inform native selection and extension requirements. Actual support is bounded by executed fixtures.
- **S70** [Test-value evidence](https://github.com/dotnet/skills/blob/main/plugins/dotnet-test/skills/test-value-evidence/SKILL.md) informs proportionate revision-bound regression proof; this package uses original guidance and does not require full mutation testing.
- **S71** [BenchmarkDotNet practices](https://benchmarkdotnet.org/articles/guides/good-practices.html) and [.NET microbenchmarking skill](https://github.com/dotnet/skills/blob/main/plugins/dotnet-diag/skills/microbenchmarking/SKILL.md) inform conditional measurement workflow. No measured application performance improvement is claimed.
- **S72** [.NET baseline-delta guidance](https://github.com/dotnet/skills/blob/main/.agents/skills/improve-skill-quality/references/writing-for-baseline-delta.md) informs paired/no-op evaluations. [Codex non-interactive execution](https://developers.openai.com/codex/noninteractive/) and [configuration](https://developers.openai.com/codex/config-reference/) inform the optional executor's isolated settings. Native discovery and general effectiveness remain separate claims.

See [VALIDATION.md](VALIDATION.md) for selected SDK/compiler/formatter/analyzer
versions, executed probes and remaining gaps. No tested documentation-generator,
StyleCop or CSharpier version is implied by reading their documentation. .NET 10
is the example target, not authorization to upgrade a consumer. Refresh source
claims when changing affected guidance and verify unfamiliar framework/provider
behavior from current primary documentation.

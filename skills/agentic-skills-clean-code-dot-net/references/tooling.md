# Profile, adoption and executable gates

Sources S11–S20, S44–S49, S51, S55–S57. DNC-TOOL-001–003 and DNC-VERIFY-001.
The default assets are mergeable policy, never automatically installed.
[Validation](../VALIDATION.md) records actual tested versions and diagnostic behavior.

## Discover effective policy

Inventory global.json, projects/solutions/filters, imports, central packages,
EditorConfig hierarchy, .globalconfig, tools, targets/configurations and CI.
Evaluate MSBuild properties after imports (for example -getProperty:Nullable,
GenerateDocumentationFile,EnforceCodeStyleInBuild,AnalysisLevel,TargetFrameworks).
Directory.Build.props loads early; IsTestProject and other project properties may
not yet exist. Use explicit per-project imports or verified later targets, not an
early conditional that silently misses production/test boundaries.

Respect SDK selection and roll-forward. Do not set LangVersion latest/preview or
upgrade targets incidentally. net10.0/C#14 is the modern stable reference as checked
2026-10-13 (S18/S20); the consuming repository's supported versions prevail.

## Default layout and naming

The original [EditorConfig](../assets/default.editorconfig) chooses four spaces,
Allman multiline braces and control-flow braces, UTF-8/final newline/no trailing
whitespace, one statement per line, consistent operator/separator spacing and
logical blank lines. Preserve newline policy; the fragment deliberately does not
set end_of_line. Raw strings, SQL/JSON, regex and expected output are content:
never “fix” them by changing their values.

120 columns is a review target, not a claimed dotnet format capability.
Wrap signatures/arguments/initializers/conditions at meaningful boundaries; prefer
one item per line for a multiline construct. Compact ordinary auto-properties and
trivial expressions remain useful. Do not run a homemade regex wrapper on source.

Imports go outside namespaces, System first, no padded alignment or artificial
groups. Semantic tooling removes unused imports. Preserve meaningful aliases,
conditional imports and SDK implicit/global usings; do not add broad global
imports obscuring dependencies. Naming has explicit constant/static/instance
selectors; async suffix, locals' meaning and effective visibility remain review
obligations rather than pretending IDE1006 handles every concept.

## One owner and deliberately selected diagnostics

Use dotnet format as SDK baseline, or honor the established formatter.
CSharpier owns wrapping/layout if already chosen; do not impose dotnet whitespace
verification on top of it. Use that formatter's checked/pinned command plus SDK
semantic checks configured not to fight it. No second formatter by reflex.

The [props fragment](../assets/Quality.props) is a strict net10.0 production
baseline, imported explicitly after project settings in the fixture.
No duplicate analyzer package. AnalysisLevel is fixed, AnalysisMode Default and
individual rule severities are explicit; avoid bulk category severities that can
interact with AnalysisMode/AnalysisLevel rather than combining additively.
Compiler CS1591 becomes an error under TreatWarningsAsErrors; CS1570/1572/1573,
CS1580/1581/1584/1658 and related emitted warnings cover particular XML defects.
They do not prove every parameter is documented or English is true. IDE0005
build enforcement also requires GenerateDocumentationFile in this tested SDK;
keep the test-project choice explicit rather than weakening production checks.

| Owner | Selected checks / limits |
| --- | --- |
| Compiler | Syntax, types, nullable warnings, XML coverage/structure/references; not prose truth |
| SDK quality analyzers | CA2016 tokens, CA1849 async alternatives, CA2012 ValueTask, CA1851 enumeration, CA2254 templates, CA2200 stack, CA2000 selected disposal, CA1309 selected string comparisons |
| IDE/build style | EnforceCodeStyleInBuild plus explicit severities; IDE1006 naming, IDE0011 braces, IDE0007/0008 type style, IDE0161 namespace |
| SDK formatter | IDE0055 layout and supported fixes; IDE0005 imports; no arbitrary 120-column wrapping guarantee |
| Library fragment | CA2007 only after continuation contract review; base application profile disables this contextual check |
| Tests | Observable effects, failures, cancellation/lifetime/representation; actual providers for translation |
| Review | Meaningful names, abstractions, ownership, docs truth, exceptions and compatibility |
| Optional doc tool | Actual packaged XML, inherited/rendered links/examples; not implied by IntelliSense |

Verify availability/behavior in the installed SDK with deliberate violations.
A configured ID that emits no diagnostic is not evidence of enforcement.
[Failure tests](../tests/test_dotnet.py) record selected observed rules; other
candidates require local probes before relying on them as gates.
CA2000 has stream-family ownership gaps: a leaking FileStream produced no
CA2000 in the local probe, while an owned CancellationTokenSource did. Semantic
ownership review remains mandatory even when the build is green.
TreatWarningsAsErrors governs compiler warnings; MSBuild -warnaserror additionally
affects task/build warnings (S16). Choose intentionally; never downgrade findings
to get green. Fresh Rebuild ensures compilation/analyzers actually execute. The helper uses
MSBuild -warnaserror deliberately as a strict gate, including task warnings; an
accepted legacy baseline must instead use the repository's reviewed equivalent
pipeline and report its debt honestly.

StyleCop.Analyzers MAY close a demonstrated gap, with pinned compatible version,
explicit selection and license review. Reconcile private docs, field conventions,
ordering/layout and C# version first. No tested StyleCop or CSharpier compatibility
is claimed by this package.

## Incremental adoption

New projects can adopt the strict assets after review. Existing projects first
record actual failures with identifiable diagnostic/file/scope. Prevent new debt
in meaningfully changed code; separate formatting, renaming, upgrades and behavior
changes. Full existing CI remains authoritative. A baseline must not continually
regenerate or broadly exclude hand-written files.

A local suppression needs diagnostic, narrow scope, reason, evidence and condition
for review/removal: a verified ownership false positive, framework initialization
seam or approved compatibility constraint can qualify. No blanket NoWarn, marking
hand-written code generated, nullable disabling or fake values. Public test methods
can use a test-project documentation policy without suppressing production docs.
Do not weaken an existing stricter gate. Distinguish accepted old findings from new
ones, and report “no new findings,” not “clean.”

## Verifier use and limitations

Before selecting unfamiliar runner commands, load [test platforms](test-platforms.md).

The default remains VSTest. For an SDK 10+ native MTP application selected by the
effective global.json, use --test-platform mtp-native. The helper queries each
framework's evaluated IsTestingPlatformApplication and OutputType, then uses
native --project and --report-trx syntax. An installed TRX extension is required;
the helper does not add packages or migrate runners. A command-mode mismatch,
unknown runner selection or environment override is BLOCKED. Executable bridge,
classic and other runner/SDK combinations use the repository's verified commands.
Native MTP skipped-only/empty execution can fail with exit 8; VSTest can exit zero
for the same empty evidence. Neither is PASS. Both paths require fresh nonempty
successful reports per framework. See [validation](../VALIDATION.md) for actual scope.

[scripts/verify.py](../scripts/verify.py) inventories .sln/.slnx/.slnf/.csproj, but
requires explicit targets instead of guessing solution coverage. Run --discover
first when needed; discovery reports NOT RUN and exits 2. Paths are validated under
the root. Discovery prunes .git, bin, obj, node_modules and .venv before descending,
does not follow directory symlinks, and blocks if an included directory cannot be
read rather than presenting an incomplete inventory as complete. Commands use
argument arrays without a shell. Only trusted projects may
be executed: restore/build/test can run imports and contact configured feeds.

For the bundled fixture, run from this package:
python scripts/verify.py --root examples/good --target Good.csproj --no-tests-reason "Tests are the separately executed SelfCheck project."
Then run its self-check using the commands in [examples](../examples/cases.md).
Do not infer behavioral PASS from the explained no-tests exemption.

For a VSTest consumer, supply every required --target and explicit --test-project.
The helper restores, verifies format, performs Release Rebuild with -warnaserror, then tests fresh
matching binaries with TRX results. Zero discovered/ran tests, skipped-only runs,
missing results, unsuccessful run summaries, invalid/negative/inconsistent counts,
failure/abort counters, failing tests and missing SDK fail closed. Mixed skipped
and passing results remain allowed; skipped-only results do not pass. --configuration accepts
the actual build configuration. Every command receives the same Configuration
environment property, including restore/formatter project evaluation; the JSON
report records this configuration. For each explicit test project it evaluates
TargetFramework/TargetFrameworks after imports with MSBuild -getProperty, then runs
each framework separately with --framework and a fresh TRX directory. Every selected
project/framework needs nonempty successful evidence; a passing sibling cannot
cover an empty framework. The JSON records the evaluated scope and each run's
project/framework/counts. Missing or invalid scope blocks verification. Property
evaluation requires a supporting MSBuild version (tested with SDK 10.0.400).
Filtered solutions do not establish whole-repository coverage.

Nested project SDK roots require separate --root invocations. The helper rejects
a directly selected target behind another global.json; inspect solution
dependencies for additional SDK boundaries before execution.

This helper implements dotnet format with VSTest or the explicit native MTP path.
For untested MTP combinations, CSharpier, custom tests or documentation generators,
use the repository's verified commands and evidence protocol; do not run incompatible
flags or claim the helper supports them. XML compilation is part of the build;
published/rendered documentation checks are extra required pipeline gates.

--report creates a new local JSON report with status, relative scope, command, selected
SDK, exit/result and test counts. Raw subprocess output is withheld to avoid echoing
secrets; --log-directory explicitly saves private local diagnostics. Existing report/log files are refused rather than overwritten. Keep logs out of
commits/public CI artifacts and inspect/redact before sharing. Reports are evidence,
not privacy certification. Source files remain unchanged; build artifacts do not.
No fix mode is provided. Authorized whitespace fixes can run dotnet format whitespace
on explicit scope; semantic fixes require separate review/testing.
Invalid UTF-8 command output produces a structured BLOCKED result without echoing
the offending bytes. The optional fixture tests also restrict diagnostic assertions
to compiler/analyzer IDs so assertion failures cannot dump raw SDK output.
Blocked results include reason_code and a safe corrective explanation: command
missing, permission/start failure, timeout, output decoding, existing/unwritable
logs, invalid framework scope, unreadable inventory or report destination failure.
Existing evidence remains preserved. A blocker never implies that later gates ran;
the command rows record only attempted checks. Raw exception text is withheld.

## CI and host integration

Consuming CI must run its pinned SDK/formatter, restore, fresh build, actual tests,
documentation delivery and any repository-required gates over all supported targets.
Run this helper only for its supported baseline. Add the caller's actual target list;
do not use unresolved placeholders as a supposedly working pipeline.
[The fixture CI](../assets/ci-fixture.yml) is a concrete runnable package example.

Branch protection has to require these jobs separately; only authorized maintainers
can change it. Frontmatter aids discovery but guarantees no host activation. An
authorized consuming AGENTS.md can route C# edits to the installed SKILL.md plus
its applicable references and require actual evidence. Do not install hooks,
rewrite another repository's policies or publish automatically.

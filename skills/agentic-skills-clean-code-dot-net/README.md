# Clean Code for C#/.NET

This self-contained standard covers C# implementation, changes, review,
documentation, scoped refactoring and quality tooling. It requires review of
contracts, readability and comment accuracy, backed by formatter, compiler and
analyzer checks and synthetic fixtures.

Copy this whole folder into your host's documented skill directory and invoke
$agentic-skills-clean-code-dot-net. Do not copy the default configuration into a
real application without inspecting its existing policy. Host discovery and
automatic adherence remain host-specific.

Start with [SKILL.md](SKILL.md). Follow its mandatory core, documentation and tooling
guides; load reliability and framework guidance when relevant.
[Rules](references/rules.md) explain provenance, examples, enforcement gaps and exceptions.
[Sources](SOURCES.md), [examples](examples/cases.md), [tooling](references/tooling.md)
and [validation](VALIDATION.md) explain the tested boundary.
Before completion, the [semantic XML gate](references/documentation.md#mandatory-semantic-contract-review-gate)
reviews changed production contracts separately from compiler coverage. The
[bulk-read example](examples/documentation/README.md) shows why both checks matter.
No paid service, extra analyzer package or documentation website is required.
Python 3.10+ runs the helper; the optional fixture suite needs its pinned .NET SDK.

The verifier checks explicit targets with dotnet format and VSTest, or explicitly
selected SDK 10 native MTP applications with an installed TRX extension; other runners
and formatters use their repository's verified commands. A missing required check
blocks an unqualified clean claim. Skill prose cannot prevent a merge; CI and
authorized repository policy must enforce the selected gates.

Conditional guides cover [semantic refactoring](references/refactoring.md),
[Options and nullable contracts](references/configuration-nullability.md),
[runner selection](references/test-platforms.md) and [measurement](references/performance.md).
The [evaluation guide](evals/README.md) separates reproducible comparisons from
unexecuted scenarios and explains the private raw-evidence boundary.

Original package material is CC0-1.0. Linked third-party documentation retains
its own rights; no host/model reliability or domain certification is claimed.

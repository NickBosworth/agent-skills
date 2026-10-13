---
kind: task
id: TASK-0004
status: done
depends_on: []
validation: ["Ten official validators and 254 regression tests passed with the SDK suite selected", "SDK 10.0.400 fixtures compiled; 20 diagnostic failure/repair cases and nine behavior assertions passed", "Creator, candidate/staged/history privacy, redacted Gitleaks and temporary extraction checks passed in recorded scopes", "42 behavioral scenarios defined, not executed"]
---
# Add Clean Code for C#/.NET

## Outcome and scope

Implement the requested agentic-skills-clean-code-dot-net package, version 1.0.0,
under CC0-1.0. It covers implementation, incremental edits, review-only,
documentation-only, scoped cleanup and tooling adoption while preserving contracts.

The package includes mandatory progressive routing, 27 traceable rules,
primary-source research, default profile/props, semantic checklists, a source-read-only
SDK/VSTest verifier, compilable XML/service fixtures, isolated diagnostic cases,
a deterministic console self-check and 42 defined behavioral scenarios.

## Integration and decisions

Reuse the library's Python standard-library helpers, dynamic package discovery,
existing license, catalogue/schema and branded adapter. Add the chooser entry,
ten-package count, migration note and explicit optional SDK fixture CI job.
Do not impose .NET dependencies on skill-only maintenance or executable-product
checks. Existing skills, checksum inventories and historical evidence stay intact.

Default choices are policy, not universal Microsoft standards. Different established
formatters and older target policies prevail. The helper intentionally implements
the SDK/dotnet-format/VSTest baseline; unsupported runners use verified repository
commands. XML truth and lifetime consistency remain semantic obligations.

## Evidence and limits

[Package validation](../../skills/agentic-skills-clean-code-dot-net/VALIDATION.md)
records executed versions and limits. [Sources](../../skills/agentic-skills-clean-code-dot-net/SOURCES.md)
records primary references and reconciliations. A FileStream leak probe produced
no CA2000; the tested disposal diagnostic uses CancellationTokenSource and does
not conceal that ownership gap.

No host/model scenarios, native discovery, rendered docs, production integration
or remote CI execution is implied. No commit, push, release, global installation,
branch protection or unrelated application changes are authorized.

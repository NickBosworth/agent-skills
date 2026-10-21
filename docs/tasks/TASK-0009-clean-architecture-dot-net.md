---
kind: task
id: TASK-0009
status: done
depends_on: []
validation: ["Creator, candidate/index/history privacy and ten official package validators passed.", "Library runner discovered 288 tests: 271 passed, 17 skipped.", "Two explicit-path trials met reviewed audit and rule-saving outcomes; broad scenarios remain unexecuted.", "Temporary archive CRC, SHA-256 inventory, fresh-extraction validation and whitespace checks passed."]
---
# Create Clean Architecture for .NET

## Outcome and acceptance

Create a self-contained companion to Clean Code for C#/.NET. Research architecture
and pattern tradeoffs, guide consequential choices one question at a time, explain
the problem and future risk, offer viable options and justify one recommendation.
Record accepted choices as scoped project guardrails in AGENTS.md. Support existing
codebase audits, decision gaps, DRY/SOLID reasoning and authorized incremental refactors.

The user also requested installation and repository-wide use of the upstream
[Writing Clearly and Concisely](https://github.com/softaworks/agent-toolkit/tree/main/skills/writing-clearly-and-concisely)
skill. It was installed outside source and applied to this documentation. The root
instruction now requires it for future documentation across the repository. No
third-party skill copy or machine-specific installation path is shipped.

## Scope and decisions

Add `agentic-skills-clean-architecture-dot-net` 1.0.0, its research, references,
templates, examples, adapter, license and behavioral cases. Update catalogue,
selection guidance, current package inventory, migration notes and review evidence.
Existing clean-code implementation and SEO Workbench are outside implementation scope.

Use a prose-only package with no helper or new dependency. Compare architectures
against requirements rather than imposing a template. Distinguish adopted policy
from implementation and verified enforcement. Use the existing automatic package
runner and release inventory; no new CI job or checksum mechanism is necessary.

## Research and verification

[Sources](../../skills/agentic-skills-clean-architecture-dot-net/SOURCES.md) records
33 primary-source entries, synthesis and disagreements. One paper's search-index
abstract was inspected but full retrieval failed; that limit is explicit.

[Package validation](../../skills/agentic-skills-clean-architecture-dot-net/VALIDATION.md)
records actual local checks and focused behavior trials separately from the
40 unexecuted scenario definitions. Trial projects are synthetic and outside source.
No consumer-project enforcement, native discovery or broad reliability claim follows.

No commit, push, release publication, product change or architecture-skill global
installation is part of this task. The requested writing-skill installation is the
only personal installation changed.

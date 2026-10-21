# Validation of Clean Architecture for .NET 1.0.0

This package contains prose, templates and 40 behavioral scenario definitions.
It adds no executable helper, dependency or consuming-project enforcement test.
Scenario definitions are separate from executed host/model trials.

Executed on **2026-10-21**, macOS arm64, Python **3.12.11**, PyYAML **6.0.3** and
skills-ref **0.1.1**. The requested external writing skill was installed and read;
it is maintainer guidance and is not a distributed dependency of this package.

## Local checks

- Skill Creator validation and all ten official package validators passed.
- The library runner discovered 288 tests: **271 passed, 17 skipped**. Skips were
  one Windows-only junction test and 16 optional existing .NET/SDK tests. This
  prose-only change did not require new helper tests or SDK execution.
- Candidate-file privacy, structure and local-reference checks passed. The real
  index remained unchanged. Staged privacy passed with anonymous command-scoped Git
  identities; that check covers the existing index, not these unstaged additions.
- Reachable-history privacy and redacted Gitleaks history scanning passed. A separate
  redacted Gitleaks directory scan covered the new package. Heuristic scans do not
  establish the absence of all private information; public summaries and new files
  were also manually reviewed. No binaries or raw source captures were added.

- Temporary package-only packaging passed CRC, SHA-256 inventory and fresh-extraction
  validation. The generated archive stays outside source. Whitespace checks passed.

## Two focused explicit-path trials

The Skill Creator workflow supplied two independent agents with the complete skill,
one synthetic .NET project each and a realistic request. Trial projects and outputs
remained outside source. No expected answer, proposed fix or intended finding was
given to the agents. The delegation interface did not expose an exact model ID or
sampling settings. This is a small, uncontrolled explicit-use sample, not a comparison.

1. **Read-only architecture audit.** Five files described one deployment, a shared
   capacity requirement and differing API/worker calculations. The agent inspected
   them, distinguished the zero-capacity defect from the unaccepted ownership
   decision, avoided unsupported SOLID findings and asked one ownership question
   with alternatives and a justified recommendation. Independent before/after hashes
   confirmed no file additions, deletions or byte changes.
2. **Save an accepted ownership choice.** The request authorized recording Reservation
   ownership in existing architecture records and AGENTS.md, while deferring code and
   enforcement changes. The agent added ADR-002 and a linked rule, preserved ADR-001,
   separated acceptance from implementation and described the remaining defect/debt.
   Independent hashes confirmed that only AGENTS.md changed and one ADR was added;
   code, project, requirements and prior record bytes remained unchanged. The primary
   reviewer read both resulting documents and checked their relative links.

The primary reviewer checked the illustrative boundary comparisons independently;
no C# compilation, database/concurrency behavior or consumer enforcement test was
executed. Both trials met their scoped outcomes. They do not test an interactive
multi-turn interview, a production refactor, architecture-test failure/repair,
native discovery or broad reliability. The 40-case catalogue remains defined and
unexecuted; these two separate trials are the only model behavior evidence here.

No product runtime check, architecture-skill global installation, commit, push or
release publication occurred. The writing-skill installation was explicitly requested.

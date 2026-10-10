# Professional code comments

Adapt this section into the project's existing agent or contributor instructions when repository adoption is requested. Keep one authoritative version. Replace a skill path only with the actual installed or repository-local path; do not leave placeholders in active project instructions.

## Instruction to adopt

Use the `agentic-skills-professional-code-comments` skill for code generation, code edits, and comment/documentation audits when available. Apply its language-specific profile and acceptance gates.

- Write comments in plain, understandable language for an engineer unfamiliar with this system.
- Document required public/exported APIs and nontrivial internal units with the project's native documentation format.
- Explain what every meaningful implementation section does and why it is needed. Add a local line comment for decisions not explained by the covering section, especially boundaries, conversions, ordering, state changes, concurrency, error handling, and workarounds.
- Explain purpose and constraints instead of repeating language syntax. A short single-section function can be covered by its contract; avoid duplicate narration.
- Ground stated behaviour in the implementation and intended policy in authoritative evidence. Never invent reasons, requirements, tickets, measurements, or guarantees. Report unknown or conflicting intent.
- Keep comments, contracts, examples, and affected callers' assumptions current with code changes.
- Preserve executable behaviour during comment-only work. Treat directives, type-bearing comments, runtime documentation, and executable examples as potentially behavioural.
- Respect the actual grammar, embedded languages, doc parser, versions, legal headers, generator ownership, and project formatting.
- Document strict data formats through supported schemas or adjacent field-level documentation; never invent comment properties or rows.
- Verify with proportionate existing tooling and semantic review. Report reviewed scope, exclusions, findings, and checks honestly. Comment density is not a quality measure.

Do not create new tools, dependencies, CI configuration, or additional policy files solely to follow this instruction. Use existing project workflows unless the task explicitly includes adoption work.

---
kind: adr
id: ADR-0001
status: accepted
decision_key: library-layout
scope: repository
supersedes: []
superseded_by: null
---
# Branded, self-contained skill distribution

## Context and decision

The user selected the brand `agentic-skills` and authorized restructuring and
public-data cleanup on 2026-10-10. Existing category folders obscure a small
eight-package catalogue; two packages reference absent resources.

Use a flat `skills/agentic-skills-<existing-purpose>/` distribution directory,
matching frontmatter names and UI prompts. Preserve established semantic purpose,
helper interfaces, licences and useful references. Rebuild absent resources as
new original material; do not claim recovery of unavailable originals.

Use the minimal agentic-codebase profile for maintainer guidance, mapping the
distribution directory explicitly. Add one common quality gate and retain domain
validators. Prefer actual YAML parsing over expanding bespoke regex parsers.

## Alternatives and consequences

Keeping category folders reduces path changes but adds little discovery value for
eight packages. Branding only display names avoids invocation changes but leaves
machine-name collisions. The chosen prefix changes installation and invocation;
publish a migration table, keep one canonical copy, and use major version 2.0.0.

Public-safe instructions require automated checks and review. Neither CI nor a
successful scan establishes complete privacy or agent reliability. Keep unknown
host/model behaviour explicit; do not manufacture compatibility claims.

## Revisit when

Package count makes catalogue navigation difficult, an installer cannot discover
the directory, or observed evaluation failures require a changed scope/interface.

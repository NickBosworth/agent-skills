# Architecture decision records

Create a short record for a significant choice affecting boundaries, interfaces,
dependencies, quality attributes or construction. Capture context, alternatives,
the decision, consequences and status. Do not invent accepted decisions.

Use stable IDs such as ADR-0001 and descriptive files such as
`0001-persistence.md`. Allocate the next unused number; resolve concurrent ID
collisions before integration. IDs are not reused.

Keep records proposed until the decision has been established. When replacing
an accepted decision, retain its history, mark it superseded and link both
records. A harmless clarification may be edited with an explanation; a material
reversal belongs in a new decision.

For machine checks, use the ADR template's `kind: adr` frontmatter with `id`,
`status`, `supersedes` and `superseded_by`. `decision_key` and `scope` help
identify potentially competing accepted decisions. These fields do not prove
that the prose is consistent.

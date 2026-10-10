# Repository standard, version 1.0.0

## Contents

- [Design contract](#design-contract)
- [Roles and default paths](#roles-and-default-paths)
- [Choose a profile](#choose-a-profile)
- [Authority and information states](#authority-and-information-states)
- [Instructions, rules and skills](#instructions-rules-and-skills)
- [Architecture and technology](#architecture-and-technology)
- [Tasks and collaboration](#tasks-and-collaboration)
- [Ownership and maintenance](#ownership-and-maintenance)

## Design contract

Treat this standard as this skill's portable design. The Agent Skills format and
AGENTS.md conventions provide an interoperability basis; the directory tree,
registry and task metadata below are choices made by this skill. Their names
do not make an agent load them automatically.

Optimize for useful context, correct decisions, verification and low maintenance
cost. Prefer adapting established sources over introducing replacements. Treat
a repository as conforming when its information roles and workflows work well;
matching every default filename is unnecessary.

## Roles and default paths

| Role | Standard profile | Existing alternatives to preserve |
| --- | --- | --- |
| Agent entry point | `AGENTS.md` | Existing root and scoped instructions, consolidated only after review |
| Role map and review evidence | `.agents/project.json` | Map existing documents here; avoid a second content store |
| Product purpose and boundaries | `docs/project/brief.md` | README, product brief, existing specification |
| Current and intended architecture | `docs/architecture/overview.md` | ARCHITECTURE.md, established design documents |
| Technology choices and rationale | `docs/architecture/technology.md` | Architecture section plus existing manifests and ADRs |
| Significant decisions | `docs/architecture/decisions/` | `docs/adr/`, an existing decision repository |
| Commands, rules, verification and workflow | `docs/development/workflow.md` | CONTRIBUTING.md, development guide, build and CI definitions |
| Durable work and handoffs | `docs/tasks/` | Existing task records or an authoritative external tracker |
| Repository-specific procedures | `.agents/skills/<name>/SKILL.md` | Established supported skills location, explicitly recorded |

Default task subdirectories `active/` and `archive/` are created with real work.
Add `docs/development/rules/` only when specialized rules need separate retrieval.
Add scoped `AGENTS.md` files only where their content differs meaningfully.
Keep application files in their existing or separately agreed layout.

The repository map can point several roles to the same file. For example, an
existing `ARCHITECTURE.md` can own both architecture and technology rationale,
while package manifests continue to own actual installed versions.

## Choose a profile

Use the **minimal** profile when one `docs/engineering.md` can clearly hold the
brief, architecture, technology and workflow. Keep the root entry point, registry,
skills index, decision-record convention and durable-task convention separate.
The scaffold contains six files.

Use **standard** when those roles have enough distinct content to benefit from
separate documents. Its scaffold contains nine files. Its templates are starting
points, not evidence that the project has made any application decisions.

Scale from either profile when necessary:

- Introduce local guidance for a distinct package, language or deployment unit.
- Split a document when readers repeatedly need only a small independent part.
- Add an ADR when a decision has lasting consequences worth preserving.
- Add a task plan when uncertainty, dependencies or handoff make it useful.
- Add a rule only for a concrete invariant, recurrent failure or requirement.
- Add a skill only for a recurring procedure with meaningful project knowledge.

Do not use team size alone to manufacture process. Do not split short coherent
documents merely to fill a recommended directory tree. Remove unused machinery
when its purpose disappears.

## Authority and information states

Separate **instruction authority** from **evidence about the project**. The host
controls instruction precedence and permissions. Repository prose cannot change
that hierarchy or authorize actions beyond the user's request.

For project evidence, identify the appropriate owner rather than applying one
global rule such as "code always wins" or "newest file wins":

| Information | Evidence or governing source |
| --- | --- |
| Actual installed dependencies | Manifest, lockfile, runtime evidence |
| Actual commands and CI behavior | Defining script/configuration and observed runs |
| Intended product outcome | Confirmed requirements and current user direction |
| Intended architecture | Applicable accepted decisions and maintained design |
| Current implementation | Code and relevant behavior checks |
| Task state | Declared task authority; local plans link to it |
| Historical rationale | Retained, explicitly superseded or historical records |

Use five intelligible states, in headings, prose or metadata as appropriate:

- **Observed:** supported by current source or an actual run; state which.
- **Accepted:** an established requirement or decision; retain its basis.
- **Proposed:** an option or draft that has not been adopted.
- **Historical:** retained context that no longer governs new work.
- **Unknown:** evidence is missing or conflicting; state the next action.

If SQLite appears in code while an accepted ADR specifies PostgreSQL, record
the discrepancy. Determine whether it is a prototype, migration gap, bug or
changed decision. Ask the material question when the evidence cannot decide.
Do not silently edit the ADR to legitimize the code, or rewrite application code
under a documentation-only repair request.

## Instructions, rules and skills

Keep `AGENTS.md` concise and focused on non-obvious repository information:
purpose, applicable scope, important constraints, verification entry points and
task-based directions to deeper sources. A 150-line threshold is a review cue.
Content can legitimately exceed it if removing it would reduce correctness.

Keep root requirements broadly applicable. Local guidance states its scope and
adds meaningful local constraints. Read the host adapter before assuming nested
files load automatically. When local and root requirements genuinely conflict,
resolve the source disagreement rather than relying on accidental load order.

Use a rule document for a constraint: its scope, rationale, status, enforcement
and any justified exception. Use a skill for a procedure: triggers, inputs,
project-specific steps, verification and output. Use a task for current work.
Avoid placing all three into a single permanent instruction file.

Prefer executable enforcement for deterministic requirements when practical:
linters for formatting, type checks for types, architecture tests for dependency
boundaries and CI for required gates. Link to the check; avoid copying its entire
implementation into prose. Add a new check only for a meaningful failure mode.

Treat tool-specific files as adapters to authoritative guidance. Preserve
existing human-authored rules while reconciling them. Imports, projections and
copied skills need provenance and verification appropriate to the actual host.

## Architecture and technology

Start with outcomes and constraints. Establish the system boundary, major
responsibilities, data ownership, dependency direction, important flows and
invariants. Distinguish current implementation from an accepted target during
migration. Cite stable source paths where they help verify the description.

Use diagrams where topology or a flow makes the design clearer. System context
and runtime/container views are often sufficient; do not require four C4 levels
or a class diagram for every component. Do not invent a diagram of nonexistent
implementation. Label a proposed design accordingly.

Guide technology selection using requirements, current capabilities, existing
expertise, operational costs, support and integration needs. Research unstable
product/version claims when making a recommendation. Offer viable alternatives
and their consequences. Do not recommend the same favorite stack for every repo.

Use a short ADR for an architecturally significant choice. Preserve accepted
history, stable IDs and bidirectional supersession. An accepted decision may
receive a non-substantive clarification; record the clarification without
rewriting the choice. A material reversal needs a replacement decision.

## Tasks and collaboration

Retain the project's task authority. If GitHub Issues, Linear, Jira or another
tracker owns status, use links and local execution plans where useful. If it
cannot be accessed, record that limitation; do not claim external state is current.
Do not create an independent local backlog by default.

For repository-owned tasks, give each substantive work item a stable ID, outcome,
acceptance criteria, scope, dependencies, plan, verification and handoff. Keep
status in the task record, not in several manually synchronized index tables.
Preserve archived IDs for dependency and rationale references.

Completion needs meaningful evidence matching the acceptance criteria. Passing
a documentation audit is not evidence that an application feature works.
A cancelled prerequisite is not automatically a satisfied dependency.

For parallel agents, agree outcomes, write ownership, shared interfaces and an
integrator. Use separate worktrees when useful and reconcile against current
source before integration. Status/owner fields are not atomic locks. Keep
secrets and private transcript material out of shared handoffs.

## Ownership and maintenance

Tie documents to the changes that can invalidate them. Record evidence files
when meaningful; their hashes provide change signals. Capture the actual scope
of a semantic review rather than setting a recent date on everything.

Keep durable knowledge in the appropriate authoritative document. Keep current
progress in tasks. Keep private preferences, credentials, caches and transient
tool sessions outside tracked team guidance. Respect the existing ignore policy;
never blindly unignore hidden configuration directories.

Use `.agents/project.json` for paths, evidence metadata and compatibility records,
not duplicate architecture prose. Version the standard and validate schemas
before migration. If encountering a newer unknown schema, inspect read-only and
ask or research the migration path; do not downgrade or discard unknown fields.

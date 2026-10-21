# Worked examples

These are synthetic teaching cases, not executed model trials. Read the case
matching the current mode. Names and paths illustrate choices, not mandatory
application layouts. Actual execution evidence belongs in [validation](../VALIDATION.md).

## Setup: a confirmed brief in an empty repository

The user wants repository guidance for a local command-line tool that checks
synthetic label manifests. They have confirmed Python and standard-library-only
implementation, no network access, and a first outcome of reporting duplicate
label IDs. Application implementation is outside this setup request.

Choose minimal because the useful context fits in one engineering document.
Preview the six files, inspect conflicts, then apply within the setup authority.
Complete the templates with these established facts; do not select a database,
web framework, deployment platform or CI provider.

A useful engineering document now says:

```markdown
# Engineering context

## Purpose and scope
Check local label manifests and report duplicate IDs. The first implementation
accepts a UTF-8 CSV file with an `id` column. Network access and manifest rewriting
are excluded. These requirements and Python were supplied by the user.

## Architecture and technology
Observed: no application code exists. Accepted: Python with standard-library-only
dependencies. Proposed: separate CSV loading from duplicate detection and terminal
reporting so malformed input can be tested independently. No persistence is needed
for the accepted first outcome. Record a lasting alternative only if one is chosen.

## Commands and verification
No application verification command exists yet. The agentic helper checks guidance
structure only. The first implementation task must supply runnable behavior checks;
no application test is recorded as passed.

## Working rules
Keep input files unchanged. Report malformed CSV, a missing `id` column, and
duplicate IDs distinctly. Verify the applicable behavior before claiming completion.

## Next work
Implement duplicate reporting. Acceptance: unique IDs succeed; duplicate IDs are
reported; malformed input fails clearly; input bytes remain unchanged in every case.
```

The resulting first task references these acceptance criteria and the accepted
constraints. The registry maps the four document roles to `docs/engineering.md`.
Task and decision indexes establish conventions without manufacturing empty tasks,
rules or local skills. There are no unexplained template placeholders left.

Completion reports the six created sources, the accepted versus proposed design,
the structural result and the absence of application/runtime verification. A later
request such as “maintain the guidance after duplicate reporting is implemented”
provides the next maintenance trigger.

If the same repository had no product brief, ask for the first useful outcome
before filling in a technology or architecture. An environment-only request may
leave product decisions explicitly deferred with a next action; do not call the
application design complete.

## Existing layout: preserve the information owners

An established package uses `DESIGN.md` for architecture and technology,
`CONTRIBUTING.md` for commands, `README.md` for purpose, and an external tracker
for task status. The user asks to make its agent guidance maintainable.

Inspect these sources and map their existing roles in the registry. Multiple roles
can point to `DESIGN.md`. Keep the tracker authoritative; local execution plans are
optional and link to it. The scaffold's default document names do not justify
creating duplicate architecture or backlog files.

Use templates as a semantic checklist. Add a concise `AGENTS.md` retrieval map
and only genuinely missing information. If tracker access is unavailable, report
that its status was not reconciled. Do not invent an external URL, owner or status.

In a monorepo, follow the requested subtree boundary. Shared root constraints
still apply, but a request concerning one package does not authorize reorganizing
every package's instructions or copying private sibling configuration.

Completion shows the role mapping and actual changed sources, preservation of
the established documents, checked claims and remaining evidence gaps.

## Maintenance: repair drift without repealing a decision

The workflow says `npm run check-old`. The inspected manifest defines `check`,
not `check-old`. An accepted ADR names a target storage service, while the current
adapter still uses a local prototype. The user requests agent-guidance maintenance.

Repair the command reference from its defining manifest and update an existing
command record if present. Inspect the command's definition and side effects
before running it. Report the result only if it actually ran.

Handle the storage discrepancy separately. Current code establishes
the prototype's behavior, not permission to repeal the accepted ADR. Look for
an existing migration task and superseding decisions. If the evidence remains
ambiguous, ask which target governs while continuing the independent command fix.

Record a compact review result:

| Claim | Evidence | Outcome |
| --- | --- | --- |
| Workflow command | Defining package script | Corrected the stale reference; execution is reported separately. |
| Current storage implementation | Adapter source | Observed prototype; describe it as current behavior. |
| Accepted storage target | Applicable ADR | Retained; unexplained implementation gap remains open. |

Fingerprint only documents actually reviewed, with the relevant evidence and a
note describing these claims. An old date or changed hash is a review candidate,
not an instruction to refresh every review. A second maintenance pass should
leave unchanged content and still-useful evidence alone.

Completion distinguishes the verified command repair, the unresolved storage
decision, executed checks and application behavior outside this request.

## Migration: retain native instructions and edited copies

The user asks to consolidate duplicated repository guidance. There is a root
`AGENTS.md`, an independent `CLAUDE.md` with useful failure-handling requirements,
and a copied local skill whose destination script has a manual edit.

Map the canonical candidates before changing anything:

| Source | Proposed destination | Preservation work |
| --- | --- | --- |
| Shared root constraints | Existing `AGENTS.md` | Keep useful root content and resolve substantive conflicts. |
| Unique failure-handling rule | Applicable workflow section | Retain meaning and rationale; update retrieval references. |
| Native instruction entry point | Existing native file if needed | Preserve independent content; add an import or pointer only when verified host behavior supports it. |
| Divergent skill script | Chosen canonical package | Compare both baselines; reconcile the manual change before replacing a copy. |

Inspect the actual host version, surface and settings. Native loading may make a
bridge unnecessary; suppression or unsupported discovery may make one necessary.
Do not delete local instruction files or modify global settings merely to force
one convention. Keep unknown behavior explicitly unverified.

Create or update canonical destinations first, then references and any needed
adapter. For an exact skill copy, record each supporting file, not just `SKILL.md`.
If source and destination both changed, resolve the changes rather than copying
one over the other. Provenance stays outside byte-identical copied files.

Remove an obsolete route only after its unique content and callers are accounted
for. Preserve task IDs, ADR history and unrelated edits. An `archive/AGENTS.md`
can still be discoverable; an archive directory is not an instruction-disable switch.

Completion reports the mapping, retained information, updated references, exact
runtime coverage or its absence, and any reconciliation still needed. Never label
an untested adapter `runtime-tested` because its files exist.

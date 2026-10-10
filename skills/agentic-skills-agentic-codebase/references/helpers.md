# Helpers and project registry

## Contents

- [Runtime and boundaries](#runtime-and-boundaries)
- [Commands](#commands)
- [Registry schema](#registry-schema)
- [Task and decision metadata](#task-and-decision-metadata)
- [Review evidence](#review-evidence)
- [Adapters and exceptions](#adapters-and-exceptions)
- [CI integration](#ci-integration)
- [Limits](#limits)

## Runtime and boundaries

Use Python 3.10+ with the standard library. Run `scripts/agentic.py`; retain its
sibling `scripts/agentic_core.py`. Invoke the installed skill's script using an
absolute path so the working directory does not affect resource discovery.

The helpers operate within an explicit repository root. They do not make network
requests, install dependencies or execute project commands, hooks or MCP servers.
They may use bounded, read-only Git commands for inventory. They reject unsafe
paths and do not traverse symlinks. A symlinked or excluded area therefore needs
separate, authorized inspection; its absence from a scan does not imply health.
Git dirty state is intentionally not inspected by the helper, because some status
operations can invoke configured filters. Check the working tree separately in
the authorized development environment; do not infer cleanliness from inventory.

Use `python3`, `python` or the Windows `py -3` launcher appropriate to the host.
If Python is missing, the skill can still perform a manual review and editing
workflow; report that automated helper checks were unavailable.
For an intentional system path alias, verify the requested repository's physical
path and pass that path explicitly. Do not disable checks or traverse an unknown
symlink merely to make the auditor run.

## Commands

Replace the example skill/repository paths with actual paths. The root must
already exist; the helper does not initialize an application or a Git repository.

```sh
python /path/to/agentic-skills-agentic-codebase/scripts/agentic.py inspect --root /path/to/repo --json
python /path/to/agentic-skills-agentic-codebase/scripts/agentic.py scaffold --root /path/to/repo --profile standard
python /path/to/agentic-skills-agentic-codebase/scripts/agentic.py scaffold --root /path/to/repo --profile standard --apply
python /path/to/agentic-skills-agentic-codebase/scripts/agentic.py check --root /path/to/repo --json
python /path/to/agentic-skills-agentic-codebase/scripts/agentic.py check --root /path/to/repo --strict
```

| Command | Behavior |
| --- | --- |
| `inspect` | Inventory relevant instructions, skills, manifests, CI and existing documentation; make no edits. |
| `scaffold` | Preview the minimal or standard skeleton; write only with `--apply`. Preflight all paths and conflicting content. Identical existing files are unchanged; different files are preserved and block application. |
| `check` | Check supported structural relationships and report limitations; do not repair prose or run project verification. Works on legacy repositories without a registry, with narrower checks. |
| `record-review` | Preview or store the caller's review note and document/evidence hashes for one document; write only with `--apply`. |

Use `--json` for machine-readable reports and `--help` for current supported
options. JSON reports distinguish the command, root, verification scope, summary,
findings and command data. Findings carry codes and paths for diagnosis.

Exit `0` means no structural errors under the selected policy, not full semantic
correctness. Exit `1` indicates structural errors, or warnings when `--strict`
is selected. Exit `2` indicates invalid/unsafe invocation. A normal non-strict
run may return `0` while review warnings remain; inspect the summary.

Use `check --max-review-age DAYS` only when a review-age policy is useful. An old
date is a review candidate, not proof that the document is incorrect. Apply
`--strict` in CI only after classifying warnings and establishing a usable baseline.

## Registry schema

Keep `.agents/project.json` in the repository. Treat it as the role map and
evidence registry for this skill; agent products do not natively interpret it.
Retain unknown extension fields when editing. Do not downgrade a newer schema.

```json
{
  "schema_version": 1,
  "standard_version": "1.0.0",
  "profile": "standard",
  "paths": {
    "brief": "docs/project/brief.md",
    "architecture": "docs/architecture/overview.md",
    "technology": "docs/architecture/technology.md",
    "workflow": "docs/development/workflow.md",
    "decisions": "docs/architecture/decisions",
    "tasks": "docs/tasks",
    "skills": ".agents/skills"
  },
  "instruction_files": ["AGENTS.md"],
  "task_authority": {"kind": "repository", "location": "docs/tasks"},
  "commands": [],
  "adapters": [],
  "reviews": {},
  "exceptions": []
}
```

Map the four document roles to regular files and decisions/tasks/skills to
directories. With external task authority, the mapped local task directory need
not exist. Multiple document roles may share a file. Preserve existing paths;
the standard profile's names are defaults. For external task authority use
`{"kind":"external","location":"https://the-actual-tracker/..."}`. Do not
invent that URL. External tracker state is outside the local auditor's knowledge.

An optional command record has `id`, `run`, `cwd`, `source`, `status` and `evidence`:

```json
{
  "id": "focused-test",
  "run": "npm run test:unit",
  "cwd": ".",
  "source": "package.json",
  "status": "unverified",
  "evidence": "Not run; command definition inspected."
}
```

Use this only when that command actually exists. States are `unverified`,
`verified` and `blocked`; verified requires actual execution evidence. The helper
checks metadata and supported source relationships, never the command's result.
The defining manifest/script owns the command; avoid a second prose inventory
of command strings with an independent update cycle.

## Task and decision metadata

Use the bundled task and ADR templates for new managed records. Existing task
formats remain useful; the semantic workflow can review them without pretending
that every format is covered by the structural helper.

Managed task frontmatter:

```yaml
---
kind: task
id: TASK-0001
status: planned
depends_on: []
validation: []
---
```

Use `planned`, `ready`, `in_progress`, `blocked`, `done` or `cancelled`.
Dependencies refer to stable task IDs, including archived records. `done` needs
meaningful validation strings. Ready, active and completed work must not quietly
depend on unfinished work. When an external tracker governs state, reconcile it
there; a local execution record does not automatically become the task authority.

Managed ADR frontmatter:

```yaml
---
kind: adr
id: ADR-0001
status: proposed
decision_key: persistence
scope: repository
supersedes: []
superseded_by: null
---
```

Use `proposed`, `accepted`, `superseded`, `deprecated` or `rejected`. Supersession
references must exist and agree in both directions. Use `decision_key` and
`scope` to flag potentially competing accepted decisions; their overlap still
requires semantic judgment. Preserve stable IDs and decision history.

The basic frontmatter reader supports ordinary scalars, common folded/literal
descriptions and JSON-style lists. It is not a general YAML implementation.
Unsupported syntax needs a suitable parser or manual review; do not rewrite
valid existing skills merely because this lightweight reader cannot parse them.

## Review evidence

After actually reviewing a document, store the claims checked and relevant local
evidence. Use real files and a meaningful note:

```sh
python /path/to/agentic-skills-agentic-codebase/scripts/agentic.py record-review --root /path/to/repo --document docs/architecture/overview.md --evidence src/storage/example.py --note "Compared data ownership and transaction boundaries with this source; deployment topology was not reviewed." --apply
```

The command updates only the chosen document's entry in `reviews`, preserving
other registry fields. It records `reviewed_on`, `document_sha256`, an `evidence`
map of relative paths to hashes, and `note`. Apply acquires a cooperative lock
before reading the registry and checks its content again before replacement.
It cannot prove the caller performed a sound review.

Keep review writes sequential. If another helper owns `.agents/.project-review.lock`,
apply returns `REVIEW_LOCKED` without waiting or removing it. Retry after the writer
finishes. Inspect an apparently abandoned lock before deliberately removing it;
never delete a live writer's lock to force progress. Preview creates no lock.
This protects cooperating helper writers; coordinate arbitrary external editors
separately because they do not participate in this lock protocol.

Prefer evidence files to dates alone. A changed document or source hash signals
that the previous review may need revisiting. A matching hash establishes content
identity, not correctness. Do not include the registry itself as evidence or
create self-referential review fingerprints.

If the only evidence is the current user's greenfield requirements, record that
basis honestly in the note; do not invent source files or approval identities.
Avoid collecting private conversation text into a tracked document.

## Adapters and exceptions

Use adapter records described in [the compatibility reference](adapters.md).
Per-file `source`/`target` mappings with baseline `source_sha256` and
`target_sha256` can flag later drift. Exact-copy mappings must stay byte-identical;
imports/projections still require semantic and host review. There is no automatic
adapter-generation or synchronization command.

Keep exceptions narrow and deliberate. An exception names one exact finding
code and path, a meaningful reason, and an ISO `expires` date. It remains visible
as an excepted finding. Do not use wildcards or indefinite exemptions. An expired
exception needs review; a path-safety, invalid-schema or incomplete-scan issue
cannot be made safe by adding an exception.

## CI integration

Add a CI check when requested or clearly part of the agreed setup. Reuse the
existing CI platform and environment. Inspect existing job conventions before
editing. Do not introduce a new hosted service or a network installation step
merely to run this standard-library audit.

For a self-contained check, vendor **both** `agentic.py` and `agentic_core.py`
under an appropriate tools directory, retaining source version and hashes in
the project's normal dependency/provenance record. Use an available Python 3.10+
runtime. The check command does not need scaffold assets; scaffold would also
need its catalog and templates.

```sh
python tools/agentic/agentic.py check --root . --strict
```

Use the actual chosen path. Run the job after relevant changes, according to
existing CI policy. Do not install local Git hooks or change approval, MCP,
network or secret settings without appropriate authority. CI can detect supported
structural drift; semantic upkeep still requires the agent workflow.

## Limits

The helper is a bounded structural auditor, not a full Markdown/YAML parser,
secret scanner, static analyzer or semantic theorem prover. It does not validate
remote links, every heading anchor, every vendor import, arbitrary task formats,
external tracker state or actual runtime skill discovery. It does not prove that
arbitrary test-evidence strings are true.

Placeholder warnings target explicit uppercase `UNKNOWN`, `TODO` and `TBD`
markers. Ordinary lowercase prose such as “reject unknown fields” is not itself
unfinished work. A missing marker does not prove that a document is complete.

Treat scan exclusions, unsupported syntax and missing evidence as visible
limitations. Check the relevant source and host when it matters. Never equate
zero structural errors with complete consistency, safety or future compliance.

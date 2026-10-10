---
name: agentic-skills-agentic-codebase
license: CC0-1.0
description: "Set up, maintain, audit, repair, or migrate a repository's agentic development environment: AGENTS.md, scoped instructions, portable local skills, architecture and technology decisions, tasks, rules, verification, and agent adapters. Use for greenfield agent-ready setup, stale or contradictory project guidance, or consolidation of existing agent structures. Inspect first, preserve useful conventions, perform authorized improvements, and ask one contextual question at a time for consequential uncertainty."
metadata:
  version: "2.0.0"
---

# Agentic Codebase

Build a small, trustworthy operating environment for coding agents. Establish
clear sources of truth, useful retrieval paths, repeatable workflows and honest
verification. Use the portable conventions in this package while adapting to
the repository. Treat them as a versioned design, not a universal industry standard.

## Scope and operating contract

- Support **setup**, **maintain**, and **repair**. Infer the mode from the request
  and repository; combine modes when necessary. Treat an audit-only request as
  read-only. Repair agent guidance and its supporting structure, not unrelated
  application behavior.
- For greenfield setup, produce the agent environment plus a grounded project
  brief, architecture/technology decisions and actionable implementation work.
  Generate application code only if the user separately includes it in scope.
- Perform routine, reversible work already authorized by the request. Present
  a brief plan and proceed; do not turn every file change into an approval gate.
  Respect the host's actual permissions and any explicit user boundaries.
- Inspect before asking. Resolve ordinary layout and wording choices using
  this standard. Ask **one question at a time** when the unresolved answer
  materially affects correctness, scope, cost, architecture or retained policy.
- Preserve existing good paths, working conventions, human decisions, task
  identities, unrelated edits and history. Standardize roles and behavior before
  renaming directories. Do not create a second authoritative task system.
- Distinguish **observed**, **accepted**, **proposed**, **historical**, and
  **unknown** information. Never imply that a proposal is approved or that an
  unexecuted check passed.

## Load supporting material selectively

| Need | Read |
| --- | --- |
| Choose or adapt the repository structure and authority model | [Standard](references/standard.md) |
| Perform setup, maintenance or migration; review meaning and drift | [Workflows](references/workflows.md) |
| Resolve a material ambiguity with the user | [Question protocol](references/questions.md) |
| Use the helpers or edit the machine-readable registry | [Helper and schema reference](references/helpers.md) |
| Configure or verify a particular coding agent | [Compatibility and adapters](references/adapters.md) |
| Revisit the design or verify changing best-practice claims | [Research basis](references/research.md) |

Read the standard and the relevant workflow for substantive work. Read other
references when their subject becomes relevant; do not load the entire package
or every repository document by default.

Use the [scaffold catalog](assets/scaffold.json) for profile contents. For
individual additions, use the [task](assets/templates/task.md),
[ADR](assets/templates/adr.md), [scoped instructions](assets/templates/scoped-AGENTS.md),
[rule](assets/templates/rule.md), or [local skill](assets/templates/local-skill.md)
template only when that artifact serves a real need.

## 1. Establish scope and discover existing evidence

1. Identify the requested repository or subtree. Read applicable host-provided
   instructions and repository guidance. Check the working tree before edits.
   Do not silently expand a subtree task to the entire repository.
2. Locate this installed skill directory and use its scripts by absolute path.
   The scripts require Python 3.10+ and the standard library; they make no
   network requests and do not run project build/test commands.
3. Run a read-only inventory when the runtime is available:

   ```sh
   python /path/to/agentic-skills-agentic-codebase/scripts/agentic.py inspect --root /path/to/repo --json
   ```

4. Read the relevant discovered artifacts: instruction files and overrides,
   existing skills/rules, README and contributor guidance, manifests, CI,
   architecture decisions and active work. Inspect the actual definitions of
   commands, hooks and integrations before considering execution.
5. Establish which document, configuration, tracker or person owns each
   consequential fact or decision. Record actual instruction scope and agent
   host/surface/version where it affects compatibility.
6. Inspect unresolved relationships manually; an inventory lists paths, not
   effective runtime instruction precedence. Note excluded or unreadable areas.

If Python is unavailable, perform the same inventory and checks using available
read/file tools. Do not install a runtime without appropriate authority. State
that the bundled automated checks were not run.

## 2. Resolve only consequential uncertainty

Follow the [question protocol](references/questions.md). Explain the evidence,
what remains uncertain, why the decision matters, two or three viable options,
and a justified recommendation. Ask one decision and wait for its answer.

For an empty repository with no product brief, the first material question is
usually the intended product, users and first useful outcome. Continue useful
independent work where the host permits it. Never choose a database, deployment
platform or substantial architectural pattern merely to fill a template.

Reuse decisions already supplied in the session or repository. Record ordinary
reversible assumptions; keep consequential unanswered decisions proposed or
explicitly blocked. Silence does not approve a material change of direction.

## 3. Select the smallest useful shape

- Choose the **minimal** profile for a small project whose context fits in one
  coherent engineering document. Choose **standard** when separate brief,
  architecture, technology and workflow documents improve retrieval.
- For an existing repository, map those roles to established files in
  `.agents/project.json`. Multiple roles may map to one file. Avoid parallel
  copies of `ARCHITECTURE.md`, `CONTRIBUTING.md`, task state or coding rules.
- Keep root `AGENTS.md` a concise entry point with repository-specific
  constraints and instructions about **when to read** supporting documents.
  Use 150 lines as a review cue, not an empirically optimal hard limit.
- Create scoped instructions or specialist rules only for meaningful local
  differences. Add a local skill for an actual repeatable project workflow.
  Do not scaffold a folder of generic, empty skills.
- Adopt the existing application directory layout. This skill's default
  structure organizes agent guidance; it does not prescribe `src/`, `apps/`,
  microservices, a monorepo, or a particular language.

## 4. Implement the selected mode

### Setup

For a new target, preview the scaffold and then apply it if it fits the request:

```sh
python /path/to/agentic-skills-agentic-codebase/scripts/agentic.py scaffold --root /path/to/repo --profile standard
python /path/to/agentic-skills-agentic-codebase/scripts/agentic.py scaffold --root /path/to/repo --profile standard --apply
```

The helper copies templates only, preflights conflicts, and refuses to overwrite
different existing files. It does not build an application. Read and replace
the skeleton's `UNKNOWN` markers using evidence and user decisions; a generated
skeleton is not a completed setup. For established documents, edit semantically
using the templates as a checklist instead of rerunning a scaffold over them.

Produce an actionable first implementation outcome, dependencies and acceptance
criteria. Include significant architecture choices as proposals or established
decisions with rationale. Preserve real uncertainty as explicit next work.

### Maintain

Start with changes and affected sources. Compare relevant claims to current
code, configuration, tests and accepted decisions. Repair proven drift, update
cross-references and relevant tasks, and prune redundant context. For a broad
maintenance request, include a full structural scan and sampled semantic review;
state the sampled scope. A no-change result is valid when supported by evidence.

### Repair or migrate

Build a source-to-destination mapping and a conflict list before restructuring.
Merge useful guidance without erasing rationale, weakening accepted invariants,
or discarding active work. Preserve stable IDs and update inbound references.
Treat code-versus-decision mismatches as an investigation, not automatic proof
that the document should change. Stage migration so no instruction entry point
is broken; see the detailed repair workflow.

For all modes, use only needed tool adapters. Check current host capabilities
with [the compatibility reference](references/adapters.md); `.agents/skills`
and Markdown links do not guarantee identical discovery in every host.

## 5. Verify structure, meaning and real behavior separately

1. Run the structural helper:

   ```sh
   python /path/to/agentic-skills-agentic-codebase/scripts/agentic.py check --root /path/to/repo --json
   ```

2. Resolve actionable findings. Do not hide unresolved work by changing dates,
   weakening assertions, generating fake validation, or adding broad exceptions.
3. Perform semantic review using the workflow's claim/evidence/conflict method.
   Confirm that architecture, tasks, rules, commands and instructions agree
   where their scope overlaps. Separate verified, contradicted and unverified
   claims. Explain any scope that cannot be reviewed.
4. Inspect and run appropriate, authorized project verification when available.
   Distinguish baseline failures, new failures and checks not run. Avoid broad
   test runs unrelated to the changed environment.
5. Verify host discovery when access permits: confirm root and relevant nested
   instructions and one intended skill can be found. Record documentation-only
   compatibility when no actual host test was performed.
6. Record review evidence only after the specific review occurred:

   ```sh
   python /path/to/agentic-skills-agentic-codebase/scripts/agentic.py record-review --root /path/to/repo --document docs/architecture/overview.md --evidence path/to/relevant/source --note "Describe the claims actually checked and their evidence." --apply
   ```

   Use real existing evidence paths. A recorded fingerprint detects later
   changes; it does not independently prove the review was correct.
7. Rerun the affected check once after repairs. Review the final diff and
   confirm that repeat maintenance would not create avoidable churn.

## Completion contract

Finish with the selected mode and outcome, changed sources, established
decisions and assumptions, checks actually run, important unresolved items,
and the next useful action. Explain how to invoke maintenance again.

Do not call a repository fully agent-ready solely because its files exist or a
structural check passes. Do not promise future automatic upkeep unless a real
CI integration, hook or scheduled service has been deliberately configured.
When useful and within scope, integrate a pinned copy of the auditor into the
existing CI using the helper reference; retain its version and required modules.

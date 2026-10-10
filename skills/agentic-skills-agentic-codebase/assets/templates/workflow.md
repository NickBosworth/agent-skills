# Development workflow

Status: draft. Replace the unknowns with repository evidence before use.

## Setup and verification

| Purpose | Command and working directory | Authoritative source | Actual verification |
| --- | --- | --- | --- |
| Local prerequisites and setup | UNKNOWN | UNKNOWN | Not run |
| Focused verification | UNKNOWN | UNKNOWN | Not run |
| Integration or CI gate | UNKNOWN | UNKNOWN | Not run |

Inspect command definitions and side effects before execution. Derive commands
from build scripts, manifests and CI. Record a missing command as a gap; do
not invent a passing check for a new repository without application code.
If command metadata is used in `.agents/project.json`, keep this table as a
short guide to those records rather than an independently maintained copy.

## Change workflow

1. Inspect the task, relevant code, working tree and applicable instructions.
2. Resolve consequential uncertainty; make ordinary reversible choices using
   established conventions.
3. Implement a focused change. Use a durable task plan only when complexity or
   session handoff makes one useful.
4. Verify the affected behavior and applicable integration constraints.
5. Update relevant documentation and task evidence in the same change.

## Repository-specific rules

UNKNOWN: Preserve only useful local constraints with scope, reason and evidence.
Link specialized rules when needed; do not reproduce an entire style guide.
Prefer existing linters, type checks and architecture tests for enforceable rules.

## Parallel work and handoff

When parallel agents are useful, assign clear outcomes and non-overlapping
write ownership. Agree shared interfaces first and name an integrator. Use
separate worktrees where appropriate. A Markdown owner field is not a lock.
Record completed work, actual checks, unresolved decisions and next action.

## Completion and maintenance

Completion means the agreed outcome is supported by appropriate evidence.
Report unavailable checks and pre-existing failures accurately. Before marking
a durable task done, add its validation evidence. Revisit instructions affected
by toolchain, architecture, task-state or agent-host changes; retire rules that
no longer provide value. Review dates alone do not prove accuracy.

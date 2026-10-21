# Project architecture rule template

Use the existing `AGENTS.md` structure. Keep the rule concise; put detailed history
in the canonical decision record if the project uses one. Replace every field with
project evidence before adoption.

```text
Rule ID and title:
Scope: affected projects/modules/paths.
Requirement: specific dependency/ownership/behavior that MUST or MUST NOT occur.
Reason: invariant or change risk; canonical decision location if present.
Verification: actual check command/test and named semantic review; known blind spots.
Adoption: current compliance or exact debt, permitted exception and removal condition.
Revisit: changed requirement or evidence that warrants a new decision.
```

An illustrative accepted rule for a synthetic reservation system:

> ARCH-003 — Capacity policy. API and worker reservation writes MUST use the
> Reservation module's capacity operation. Other modules MUST NOT update its
> capacity tables. This keeps one authority for the capacity invariant. Verify
> API/worker contract tests, competing-writer provider tests and dependency checks;
> review raw SQL paths separately. Legacy import is named migration debt until its
> caller moves. Revisit if reservation ownership changes.

The example is guidance for writing a rule, not a policy to copy into every project.

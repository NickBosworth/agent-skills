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
Exception, if any: exact path/operation, responsible role, tracked decision and removal check.
Revisit: changed requirement or evidence that warrants a new decision.
```

An illustrative accepted rule for a synthetic reservation system. The commands and
statuses below belong to this fictional project; they are not executed results or
commands supplied by this skill:

```text
ARCH-003 — Capacity ownership (accepted; migration incomplete)
Scope: src/Api, src/Worker, src/Reservation and tools/LegacyImport.
Requirement: reservation writes MUST use Reservation.Capacity.Reserve. Other
modules MUST NOT mutate Reservation.Capacity storage, except the operation below.
Reason: one authority protects the capacity invariant; see docs/adr/003-capacity.md.
Verification: existing check `dotnet run --project tests/CapacityContracts` passed
for API and worker in this fictional record. It does not inspect raw SQL.
Proposed, inactive: tests/CapacityConcurrency against the production provider;
tests/Architecture for forbidden dependencies. Neither currently establishes a guard.
Exception: tools/LegacyImport/CapacityImport.cs::ImportBatch may write capacity
through its existing transaction. No other import operation is exempt.
Responsibility: Reservation maintainers; debt tracked in MIG-003.
Remove exception when ImportBatch uses Capacity.Reserve and its contract test passes;
then remove the direct-write path and update ARCH-003 and MIG-003 together.
Revisit: capacity ownership or transaction requirements change.
```

The example is guidance for writing a rule, not a policy to copy into every project.

# Compatibility and migrations

Identify the exact contract and consumer, not a blanket permission to break things.
Check API payloads, serialized data, public exports, configuration, URL behaviour,
old/mobile clients, async readers and deployment overlap where relevant. State
which examined surfaces remain compatible and which are unknown.

Separate schema compatibility, historical-data interpretation, data destruction and
operational disruption. An API decision does not approve a destructive backfill.
For each real migration define old/new reader and writer behaviour, deployment order,
backfill invariants, interrupted/repeated execution, validation, recovery and cleanup.
Prefer established repository migration tools; do not introduce a generic framework.

Rollback means a demonstrated recovery path. A code rollback may not reverse data
already transformed. Preserve source data or a verified backup when required by
retention and permissions, and test with synthetic old-format fixtures. Bound locking,
resource use and retry effects according to the actual environment.

Use expand/backfill/contract only when mixed-version consumers require it. Smaller
changes may need only explicit contract tests. Mark production execution as a separate
authorized step. Pause if new evidence changes data risk, consumers or accepted rules.

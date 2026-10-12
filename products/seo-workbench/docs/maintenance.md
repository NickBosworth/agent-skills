# Backup, recovery and retention

Stop queued or running jobs, then use the backup command to create a new folder
outside the source checkout:

```sh
node dist/cli.js backup /path/to/private-backup --data /path/to/private-state
node dist/cli.js retention PROJECT_ID --before 2025-01-01T00:00:00Z --data /path/to/private-state
```

The backup uses SQLite's backup API and verifies database integrity and relationships.
Existing folders are refused. A failed new backup is removed; source data is not replaced.
Recover by opening the verified backup folder with `--data`. Jobs do not restart
automatically. Keep backups private and outside the repository, like the original data.
Do not copy just a live database's main file while its WAL may contain changes.

The retention command previews stopped audit histories last updated before the
cutoff. To apply it,
repeat the command with `--selection PREVIEW_TOKEN --confirm-delete`. A changed
selection is refused transactionally. Active/paused jobs, other projects and project
provider imports survive. Selected history review decisions are removed with the audit.
No automatic scheduler is installed. Deletion does not erase backup/report copies.
Native Windows privacy and same-user filesystem replacement races remain unverified.

An interrupted process can leave an incomplete backup folder. Its completion marker
blocks normal Store recovery before database modification. Use the original data and
remove only the incomplete backup folder before retrying; do not remove the marker to
pretend verification finished. Normal failed backups are removed automatically.

Database upgrades run under one write transaction. A failure in a later migration
rolls back the earlier schema changes from that opening attempt and closes the failed
connection. Simultaneous openers re-read the version after acquiring the write lock.
Committed histories survive an interrupted uncommitted write; those uncommitted changes
are lost. A code downgrade cannot reverse an upgrade: use a verified pre-upgrade backup
with the matching older product when rollback is needed. Process-kill tests do not
establish behaviour after hardware power loss, damaged storage or every filesystem.

CLI report exports publish a completed file without replacing an existing destination.
If a process is interrupted, an external `.partial-` file may remain. It is private
unfinished output; remove that file and retry. Normal failures remove the temporary
file. This requires a local filesystem supporting same-directory hard links and does
not certify power-loss durability or native Windows permissions.

## Worker ownership increment — 2026-10-12

Schema 5 adds ownership metadata and a separate private SQLite lifetime lock.
A dead modern worker can be recovered even when its old process ID is reused;
competing workers and premature resume are refused while the lock is held. Recovery
preserves other paused/cancelled decisions. Claim/recovery metadata is transactional;
locks are released on failure, completion cleanup, Store closure or process death.
Lock files and side files use the same ordinary-file/link checks as private storage.
Do not delete or replace the lock file while any worker could be running.

Stop all old workers and clients before upgrading. A possibly live legacy owner
refuses migration without committing it. Concurrent old/new executables are not
supported. Preserve a verified stopped backup for rollback: older code refuses
schema 5, and reverting source does not downgrade private data. Ambiguous legacy
process-ID reuse remains conservative; native Windows and physical fault acceptance
are still unverified. Backup validation now checks that the actual copied snapshot
contains no queued, active or owned job, closing the initial-preflight race.

# Repeat an approved audit

The monitoring command previews a project's saved scope and limits. With an
explicit selection token, it runs one fresh audit in the same project and returns
a summary. It installs no scheduler, sends no message and deletes no history.

From the product directory, using your private data directory:

```sh
node dist/cli.js monitor PROJECT --data /path/to/private-state
node dist/cli.js monitor PROJECT --data /path/to/private-state --selection TOKEN --execute
```

Replace PROJECT with the saved project identifier. Review the private preview,
including addresses, exclusions, rendering mode and allowances. Use its selection
token only after approving those settings. A changed configuration invalidates
the token. Local development origins need their ordinary explicit permission on
every invocation; saved project settings cannot grant network permission.

The execution command waits for collection and analysis. It refuses another active
or queued job rather than creating overlapping runs. Completed results remain in
the project's history. A killed process can leave interrupted work; use the normal
status and recovery controls before repeating it. Do not hide an incomplete run
by silently creating further runs.

Exit codes follow the existing gate: 0 means complete discovered coverage with no
unexcepted failures or unresolved approved requirements; 1 means a finding failed;
2 means a tool or configuration error; 3 means incomplete evidence. A partial audit
cannot produce a successful gate. A zero exit code cannot establish total site
size, search-engine indexing or universal SEO compliance.

The final JSON contains outcome counts and local audit/analysis identifiers. It
omits page addresses, titles, bodies and raw exception messages. The preview is
private and contains addresses; do not put it in public CI output. Execution counts
can still reveal business activity, so review them before sharing.

## Use an existing scheduler

Run the reviewed execution command from a scheduler you control, with the pinned
runtime, compiled executable, explicit private data directory and ordinary network
permissions. Test it manually first. Set the interval longer than the approved
maximum run duration, capture the exit code and keep logs private. Confirm the
scheduler's working directory and runtime rather than relying on an interactive
shell's setup. The product does not install or modify operating-system jobs.

An operator-owned notification system may consume the exit code and count summary.
Do not forward private previews, reports or captures automatically. Configuring
outbound messages and provider credentials remains an explicit operator action;
no notification service has been configured or tested here.

Retention remains a separate preview-and-confirm command. Scheduling an audit does
not authorise deleting histories. Review the [maintenance guide](maintenance.md)
and storage allowances before enabling recurring collection.

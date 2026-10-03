# Durable task records

The task authority is declared in `.agents/project.json`. If an external tracker
owns task state, link to it; keep local execution plans only when useful and
avoid maintaining a competing backlog.

Create a durable record for substantial multi-session work, uncertainty,
dependencies or handoffs. Small, clear changes can be completed directly.
Use `active/<id>-<slug>.md` while useful to active work and move completed records
to `archive/` when it improves retrieval. Create those directories with the first
real task; update links on a move. Archived task IDs remain resolvable.

A task records its outcome, acceptance criteria, scope, dependencies, plan,
decisions, verification evidence and next action. Keep state in the individual
record; any summary index must link to records rather than duplicate statuses.

Managed records use `kind: task` frontmatter. States are `planned`, `ready`,
`in_progress`, `blocked`, `done` and `cancelled`. Use JSON-style lists for
`depends_on` and `validation`. A task marked done needs meaningful evidence;
unfinished or cancelled dependencies are not silently treated as satisfied.

Before handing off, state completed work, real checks and their outcomes,
unresolved issues and the next useful action. Never use the record as a place
for secrets, raw private conversations or unsupported claims of completion.

# Discovery and decision questions

## Establish evidence

Read applicable `AGENTS.md` files and their linked rules, architecture documents,
ADRs, specifications and tests. Respect the host's actual instruction hierarchy.
Do not invent historical reasons from a familiar folder layout. Check relevant
history only when it can resolve intent; report missing rationale plainly.

Inventory `.sln`, `.slnx`, solution filters, standalone projects, target frameworks,
`global.json`, project references, package references, central build/package files,
source generators and conditional configurations. A solution filter can omit
important consumers. Include test projects and `InternalsVisibleTo` relationships.
Find actual build/test commands before prescribing tooling; do not require a
current SDK or migrate .NET Framework just to review architecture.

Map separately:

| Map | Evidence to inspect |
| --- | --- |
| Source dependency | Project/package references, type use, public signatures, shared source and generated dependencies |
| Runtime interaction | DI registrations, reflection/plugins, middleware, calls, messages and background services |
| Data ownership | Readers/writers, schemas, migrations, shared tables, transaction and concurrency boundaries |
| Delivery | Deployable processes, compatibility requirements, release coordination, operations and ownership |

Trace one typical and one consequential failure path per relevant capability.
For an audit, cover representative writes, queries, jobs and external integrations;
state which paths were sampled. Do not execute an unknown build or test against
real services without inspecting its effects and checking authorization.

Find decisions at friction points: repeated coordinated edits, cyclic references,
cross-module entity mutation, business rules copied into jobs and controllers,
interfaces with unsupported operations, leaking transport/provider types, unclear
commit ownership and unverifiable rules. Ask whether each is a violation, a defect,
a policy gap or only a stylistic difference.

## Question protocol

Use this order, with enough context for the user to choose without reading code:

1. **Evidence:** the path, behavior or requirement that exposed the decision.
2. **Problem:** what goes wrong now, or the concrete future change/failure at risk.
3. **Options:** two or three feasible alternatives and their principal costs.
4. **Recommendation:** one option, justified by this project's constraints; name
   the assumption or evidence that would change it.
5. **One question:** ask the user to choose this decision, then wait.

Use a supported question UI when available; otherwise ask in ordinary text. Keep
the rationale visible even if the UI limits option descriptions. Free-text answers
and qualified choices are valid. Do not tack on questions about tooling, ownership
or deployment to the same turn. A single blocking factual question can precede
options when that fact is needed to make the alternatives meaningful; never
fabricate architecture options for supplying missing information.

Accept answers already in the session or applicable rules. A request for a
recommendation alone permits a recommendation, not an invented user decision.
If the user explicitly delegates a choice, make it within the stated constraints,
record that delegation and the rationale, and proceed within authorized scope.

## Choose the next decision

Start with the decision that resolves the largest real risk or unlocks dependent
work. For example, decide which module owns a business rule before discussing a
shared package for it. Establish consistency requirements before introducing async
messages. Agree a target boundary before moving projects.

Ask for quality goals in concrete scenarios when necessary: the operation,
conditions, acceptable outcome and why it matters. A proposed performance target
is not a business requirement until accepted. Use a bounded experiment if technical
uncertainty can be resolved more cheaply than debating it. Agree its question,
success condition and permitted effects; do not turn an experiment into adoption.

Do not ask every possible architecture question. If the repository already has a
coherent, accepted design and the task fits it, use that design. If the user defers,
record the unresolved scope and trigger; continue only work that does not depend
on the missing choice. On resumption, check whether the code or constraints changed
before reopening an accepted decision.

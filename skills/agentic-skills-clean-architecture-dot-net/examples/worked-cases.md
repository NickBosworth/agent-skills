# Worked cases

These fictional cases illustrate decisions, not executed model results. Each
assistant turn contains one decision question. Replies shown after a question are
explicit example user answers, not permission to simulate answers in real use.

## 1. A shared rule, two callers

Evidence: `Api/Reservations.cs` and `Worker/ReservationJob.cs` both calculate
capacity. They implement the same agreed reservation policy but disagree at zero.
The project has one deployment and no rule owner recorded.

Assistant:

> The API and worker can accept different reservations because each owns a copy
> of the capacity calculation. A later policy change could fix one caller and leave
> the other wrong. We need one authority for this business rule.
>
> A. Put the rule in the Reservation module and have both callers use its operation
> **(recommended)**. This matches the existing capability and keeps its invariant
> with its owner; both callers will need contract tests.
> B. Put the policy in a separate shared package. That gives independent packaging
> but adds version coordination without an identified external consumer.
>
> I recommend A because both callers already ship together. Which owner should
> we establish for the capacity policy?

Example user answer: “A. Save that rule, but do not refactor yet.”

Assistant action: record the accepted owner and exact target rule in the existing
`AGENTS.md` structure. Mark the two copies as current debt and proposed tests as
not yet implemented. Do not move code or claim enforcement is active.

## 2. Similar code with different meanings

Billing and Audit each compare a timestamp with a cutoff. Billing uses the
contract's payment window; Audit uses a separately owned retention rule.

The useful conclusion is that syntax is repeated but authoritative knowledge is
different. Keep the policies separate unless evidence shows a common owner and
change reason. Do not create `SharedDatePolicy` merely to remove two comparisons.
No consequential unanswered question means no interview is necessary.

## 3. Direct EF access in a simple slice

A small administrative app uses EF in feature handlers. Its accepted rule permits
this, it has isolated provider tests and no complex domain write invariants.

A request to “audit for clean architecture” does not make missing repositories a
violation. Report observed dependency/data risks if any, and retain the accepted
design. A future need for infrastructure-independent policy tests could reopen the
decision; hypothetical database replacement alone does not justify wrappers today.

## 4. An outbox decision before a broker choice

Evidence: order state commits, then a message is published. A crash between the
operations leaves downstream billing unaware. Durable notification is a confirmed
requirement; the store can persist an outbox entry atomically with the order.

Assistant:

> The current save-then-publish sequence can lose a required notification after
> committing the order. Retrying publication in memory does not survive a process
> crash. We need a durable way to remember the publication work.
>
> A. Save an outbox entry in the order transaction and dispatch it separately
> **(recommended)**. This closes the local gap but needs retry monitoring and
> duplicate-safe consumers.
> B. Derive notifications from a durable database change feed. This may fit if
> the provider supports the required semantics, but needs verified ordering,
> retention and business-event mapping.
>
> A fits the current transaction model with the fewest new assumptions. Which
> durable publication approach should we adopt?

Stop there. Broker selection and consumer idempotency are later decisions. Do not
promise exactly-once side effects or mark either approach accepted before an answer.

## 5. A precise dependency guard

Accepted design: domain policy must not depend on web or EF assemblies. The host
may reference infrastructure only for composition. The current “architecture test”
checks project names, while a domain public signature exposes a provider type.

Report an enforcement gap with the actual signature and dependency evidence.
Propose a type-dependency check covering public signatures plus a scoped composition
exception. In an authorized implementation, demonstrate violation/failure and
repair/pass in an isolated fixture. Report reflection/data-access blind spots.
Do not exempt the entire host assembly just to keep a controller bypass green.

## 6. A read-only audit that unlocks a refactor

An audit finds Booking and Availability both writing a capacity table. Existing
rules do not establish ownership. Classifying this as a forbidden edge would invent
policy; classify it as a decision gap with a data-integrity risk. Explain the paths,
provide an ownership recommendation and ask one question. Keep files unchanged.

Once the user chooses Booking as owner and authorizes migration, move one writer
at a time behind its contract. Preserve concurrency handling, worker behavior and
schema compatibility. Record remaining writers as exact migration debt. Do not
equate a successful namespace move with a completed ownership refactor.

## 7. A qualified choice and a later change

Continue case 1. Example user answer: “Reservation owns capacity. Save that, but
defer separate storage until we know whether reporting needs cross-module joins.
No code changes yet.”

Assistant action: save the ownership choice as accepted, with existing callers as
migration debt and checks as inactive. Record storage separation as deferred, with
the reporting requirement as its trigger. Do not adopt a database or refactor code.

Handoff: ownership is accepted; database separation is deferred; no implementation
is authorized. The next dependent decision is the required consistency boundary,
if the user later requests implementation. Routine independent review can continue.

Example later request: “Resume. Reporting can use a projection; we now need
independent Reservation releases. Replace the single-deployment decision, but keep
the capacity owner.”

Assistant action: inspect changed constraints and existing records. Keep capacity
ownership accepted. Explain release/consistency costs and ask one deployment
question with feasible options and a justified recommendation. Only after the
answer, add a superseding deployment record, preserve historical rationale and
update the active route. Storage separation remains unresolved unless the answer
actually settles it. One accepted architectural axis does not decide every other one.

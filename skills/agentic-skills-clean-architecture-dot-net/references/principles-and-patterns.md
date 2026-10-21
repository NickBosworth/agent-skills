# DRY, SOLID and pattern choices

Use this guidance to diagnose a concrete problem. The remedies are candidates, not
automatic rules. [Sources](../SOURCES.md) distinguish platform contracts from this
skill's recommendations.

## DRY: identify the knowledge

Basis: [S02 and S11](../SOURCES.md#architecture-modularity-and-principles).

Before extracting repeated code, ask whether the same business fact or policy must
change for the same reason under the same owner. Inspect callers and edge cases.
Two discount calculations with one agreed policy should have one authority; two
similar retention calculations owned by different domains may need to diverge.

Prefer a local function or cohesive policy over a general framework. Keep shared
code at the narrowest ownership boundary that serves its real consumers. Evaluate
the new coupling, parameter flags, dependency direction and test burden. Do not
turn a small repetition into a cross-module dependency or an inheritance hierarchy.
Duplicated representations can be legitimate; duplicated authoritative decisions
can drift. Explain which one the finding concerns.

## SOLID as observable questions

Basis: [S11–S12](../SOURCES.md#architecture-modularity-and-principles); the diagnostic
questions below are the skill's synthesis, not a mechanical compliance test.

| Principle | Evidence and diagnostic question | Candidate repair and misuse to avoid |
| --- | --- | --- |
| Single responsibility | Do unrelated business/technical changes repeatedly alter this component? | Separate cohesive responsibilities by reason/owner of change. A short class or one-method interface is not proof of cohesion. |
| Open/closed | Does a known recurring variation require risky edits to stable policy? | Isolate that variation with composition, strategy or an explicit extension contract. Do not build plugin systems for hypothetical changes or forbid all modification. |
| Liskov substitution | Can every implementation preserve the client's input, output, exception and state contracts? | Test the shared contract for each implementation; redesign incompatible capabilities. Compiling an interface or throwing an unsupported-operation exception is insufficient. |
| Interface segregation | Do clients depend on operations they cannot use, or must implementations fake unsupported capabilities? | Split by genuine client capability. Avoid a single giant service interface and arbitrary one-method fragmentation. |
| Dependency inversion | Does stable policy directly depend on a volatile provider or transport detail? | Put a meaningful port with the consuming policy and wire an adapter at composition. DI registration alone does not invert a dependency. |

For Liskov, examine preconditions, postconditions, invariants, mutation/history,
nullability, cancellation and failure semantics. Subtypes must not require stronger
inputs or promise weaker results. Test doubles must honor the same relevant contract.
Prefer composition over inheritance when implementations share mechanics without
sharing a substitutable behavior contract. A base class that dictates unrelated
business policy is a coupling risk, even when it removes lines.

## Select the smallest pattern that solves the observed problem

For every proposed pattern record: trigger, simpler alternative, intended boundary,
benefit, cost, failure cases, verification and revisit condition. A pattern name is
not justification. Check existing platform and repository facilities first. No
mediator, mapper, container, broker or architecture-test package is mandatory.

| Pattern/candidate | Consider when | Simpler alternative / cost to discuss |
| --- | --- | --- |
| Strategy | Several real interchangeable algorithms follow one contract | A clear conditional may be easier for a small fixed set; selection and DI add indirection |
| Factory | Creation needs runtime selection or explicit lifetime ownership | Constructor/DI registration often suffices; avoid a parallel service locator |
| Adapter / anti-corruption layer | An external or legacy contract has different semantics | Local mapping may suffice; the adapter owns translation failures and compatibility |
| Decorator / middleware pipeline | Orthogonal behavior must wrap a stable operation | Existing host/client middleware may suffice; order, retries, authorization and transactions interact |
| Specification | A named rule/query is reused with clear domain meaning | A predicate or named query may suffice; EF translation and composition still need tests |
| Domain events | Explicit in-domain reactions have a clear consistency contract | A direct call is clearer for a simple dependency; hidden order and dispatch timing add risk |
| Transaction script | A use case has simple procedural rules | Avoid forcing entities/aggregates where they add little; extract real shared invariants when complexity grows |
| Rich domain model / aggregates | State changes must protect meaningful invariants | Simple CRUD may suffice; object graphs and persistence must respect the consistency boundary |

## Persistence, transactions and queries

Platform basis: [S15–S20](../SOURCES.md#net-persistence-lifetime-and-verification).

EF Core already provides change tracking and unit-of-work behavior. Compare direct
`DbContext` use in an explicitly permitted slice/adapter with a meaningful persistence
port; do not add a generic repository and unit-of-work wrapper automatically. In an
adopted DDD write model, repositories should follow aggregate consistency boundaries,
not each table. Query projections can use a different approved path without bypassing
write invariants. Do not leak `IQueryable`, tracked entities or provider-specific
errors through a boundary that promises independence.

Decide who calls `SaveChanges`, what commits atomically, which provider guarantees
apply, and what happens on concurrency conflict. By default, a single `SaveChanges`
is atomic when the provider supports transactions; inspect actual configuration,
including disabled automatic transactions, and the read/commit boundary. Multiple
saves and remote effects need explicit analysis. A database transaction does not
make a remote HTTP call atomic. Do not
retry an entire business operation blindly after an uncertain commit. Preserve
uniqueness constraints, concurrency tokens and invariants under competing writers.

Atomic saving does not prove a cross-row invariant. For example, two requests can
both count one free place and insert different reservations. Concurrency tokens on
the inserted rows do not protect the earlier count. Identify the contested state
and compare a conditional update to an authoritative capacity row, an applicable
database constraint, or a provider-supported isolation/locking strategy. These are
alternatives, not a universal prescription. Verify the actual competing schedule,
conflict response and bounded retry behavior against the relevant provider.

`DbContext` is not thread-safe. Choose lifetimes for the host's unit of work; do not
capture a request-scoped context in a singleton or parallelize operations on the
same instance. Built-in DI plus constructor dependencies is usually sufficient.
Factories and scopes can be appropriate at composition or work boundaries. Service
location inside domain logic hides dependencies and ownership.

## Separate related but independent choices

Basis: [S22–S32](../SOURCES.md#messaging-resilience-and-change). Select patterns for
their actual consistency and failure contracts, not their popularity.

- **CQRS:** compare one read/write model with separate command/query models. A single
  database can serve both. Separate stores require a synchronization and stale-read
  policy. Named handlers or a mediator alone do not establish CQRS; CQRS does not
  require event sourcing, a broker or a library.
- **Event sourcing:** events become the source of truth. Compare ordinary state plus
  an audit trail. Adoption requires replay, evolution, ordering, concurrency,
  snapshots/projections, sensitive-data retention/deletion and operational recovery
  decisions. An audit requirement alone does not establish that need.
- **Messaging/outbox:** compare direct synchronous work with durable asynchronous
  delivery. For state plus publication, an outbox can close the local dual-write gap
  by persisting both atomically. It still needs dispatch/retry, retention, ordering
  and idempotent consumers; do not promise exactly-once external effects.
- **Saga:** consider only for a business process spanning independent local
  transactions. Compare keeping a real atomic boundary. Define compensation,
  irreversible actions, timeouts, retries and manual recovery; compensation is
  business work, not a database rollback.
- **Retry/circuit breaker:** distinguish transient faults from persistent failures.
  Set budgets, timeouts and safe retry conditions; account for existing client
  retries. Cancellation and non-idempotent effects constrain retries.
- **Cache-aside:** require evidence of a useful read bottleneck. Define ownership,
  invalidation, freshness, capacity and tenant/authorization key scope. A cache must
  not become the authority for a correctness-critical invariant by accident.

## Verify the contract, not the pattern label

Use domain tests for invariants, substitution tests for interchangeable adapters,
integration tests for persistence/transport and architecture tests for agreed
dependency restrictions. Use an isolated instance of the production database
technology for provider semantics when needed, never the live production database
by implication. EF InMemory, SQLite substitutes and mocked queryables cannot prove
another provider's translation, constraints or transaction behavior.

Compiler/analyzer checks can enforce some edges and visibility. They cannot prove
DRY, SOLID, good module ownership or safe distributed behavior. Keep human/semantic
review obligations explicit instead of inventing numerical compliance scores.

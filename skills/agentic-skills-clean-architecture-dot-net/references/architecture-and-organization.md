# Architecture and organization

The choices below are candidates. The decision protocol and the preference for the
least costly sufficient design are this skill's synthesis. See [sources](../SOURCES.md)
for supporting guidance, disagreements and limits.

## Separate the axes

Deployment topology, business modules, dependency direction and feature organization
answer different questions. A modular monolith can use inward dependencies and
feature folders. A vertical slice can contain a rich domain model. A bounded context
does not automatically require a microservice. Layers are logical; tiers are physical.

| Candidate | Useful when | Cost or limitation to explain |
| --- | --- | --- |
| One deployable project with cohesive feature folders | Small capability, simple rules, one release cadence | Folder boundaries need review/tests; visibility within one assembly is broad |
| Modular monolith | Several business capabilities need clear ownership within one deployment | Public contracts and data boundaries need discipline; deployment remains shared |
| Clean/hexagonal/onion boundaries | Business policies need isolation from delivery and infrastructure details | Ports and mapping cost work; conceptual layers need not each become a project |
| Vertical slices | Changes mostly follow individual use cases | Shared invariants still need an owner; duplication and accidental divergence need review |
| Independently deployed services | Confirmed isolation, scaling or release requirements justify distributed operation | Network failure, consistency, contracts, observability and operating ownership become design work |

For a new system without contrary requirements, consider a single deployable first.
This is a revisable starting recommendation, not a rule that all systems must be
monoliths. Retain a successful existing architecture unless evidence justifies change.

## Define boundaries before naming projects

Identify capabilities, vocabulary, invariants, owners and expected changes. Distinct
meanings of the same word can justify separate models. Establish what each module
owns, what it exposes and what others may depend on. Move behavior with its data
and invariants. Do not organize services by database table or horizontal technical
layer and call that business decomposition.

In a chosen inward-dependency design, an illustrative graph is:

```text
Application -> Domain
Infrastructure -> Application / Domain ports
Host -> Application; Host composition root -> Infrastructure
Domain -> approved foundational dependencies only
```

Choose the actual graph for the project. A combined core is valid. Put a port with
the policy that consumes/owns its contract, not mechanically in a global Interfaces
project. The host may reference infrastructure to wire dependencies; that does not
authorize controllers or UI code to bypass agreed application boundaries. Define
that composition exception precisely and check normal feature code separately.

Track transitive package and public type dependencies as well as direct project
references. Avoid hidden bypasses through reflection, service location, shared source,
database access or public provider-specific signatures. An inward arrow on a diagram
does not prove that these paths obey the same boundary.

Use separate projects when assembly visibility, dependency restrictions, reuse or
delivery needs justify them. Folders and namespaces help navigation but cannot by
themselves enforce access. Default implementation details to the narrowest practical
visibility; review public APIs and friend assemblies as deliberate escape routes.
Avoid an unowned Common/Shared/Utilities project that can reference everything.

## Locate responsibilities

- **Domain:** business invariants and vocabulary. Use entities, value objects and
  aggregates where their identity, equality and consistency semantics earn their cost.
  Persistence independence does not excuse an impossible storage/concurrency design.
- **Application/use cases:** orchestration, authorization coordination, transaction
  ownership and application-specific policy. Keep business invariants with their
  agreed owner; do not confuse an HTTP validation attribute with a domain guarantee.
- **Adapters/infrastructure:** persistence, transport, external APIs and translation
  of their errors/models. Put meaningful mapping at real contract boundaries.
- **Host/UI:** composition and delivery concerns. For desktop/Blazor/MAUI, establish
  UI state and threading ownership; for workers, establish work-unit scopes, retries
  and shutdown. Do not copy HTTP request lifetime assumptions into every host.
- **Libraries:** consumer contracts, compatibility, cancellation, resource ownership
  and deployment constraints. Do not impose application layers on a small utility.

A simple data-maintenance operation may use a transaction script. A complex invariant
may need a domain model. Choose per capability rather than forcing rich DDD into
every CRUD operation. Do not pretend a data-only DTO violates SRP or requires methods.

## Shared knowledge and contracts

For a proposed shared component, identify the business knowledge, authoritative
owner, consumers, change cadence and versioning cost. Share a stable business policy
within its real scope. Keep independent meanings separate even when code looks alike.
Across bounded contexts, prefer explicit contracts and translation over sharing
mutable domain entities. A shared kernel is a deliberate coordination agreement,
not the default place for all repeated code.

Keep external request/response schemas distinct when they have different security,
versioning or domain meanings. Do not create a DTO for every internal method by rote.
Specify allowed fields, compatibility and validation at trust boundaries. Never
remove a tenant filter, authorization check or boundary validation merely to reduce
repetition; a common abstraction must preserve the invariant for every caller.

## Boundaries that affect operations

For service or module extraction, inspect data ownership and cross-boundary reads
and writes before moving code. Decide transaction requirements, failure handling,
contract evolution, authentication/authorization propagation, tenant isolation,
observability and operational responsibility. A shared database can be an explicit
transitional compromise; name who may write each table and how the dependency ends.

Use measured change/failure evidence to revisit boundaries. Class counts, project
counts, dependency metrics or an expected future acquisition are signals to
investigate, not sufficient reasons to distribute a system.

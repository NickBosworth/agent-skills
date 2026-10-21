# Research basis

Reviewed on **2026-10-21**. This is an original synthesis of the primary sources
below, not a copied manual or certification. The decision interview, rule format,
priority order and adoption states are this skill's workflow choices. Architecture
recommendations remain conditional on the consuming project's evidence.

## Architecture, modularity and principles

| ID | Primary source | Relevant basis and limit |
| --- | --- | --- |
| S01 | Microsoft, [Common web application architectures](https://learn.microsoft.com/en-us/dotnet/architecture/modern-web-apps-azure/common-web-application-architectures) | Logical layers, deployment tiers, inward dependencies and composition. Its web application examples are not a universal .NET project layout. |
| S02 | Microsoft, [Architectural principles](https://learn.microsoft.com/en-us/dotnet/architecture/modern-web-apps-azure/architectural-principles) | Encapsulation, dependency inversion, responsibility and semantic DRY; explicitly cautions against coupling coincidentally similar behavior. |
| S03 | Robert C. Martin, [The Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html) | Source dependencies point toward policy; the circles do not prescribe a fixed count. A conceptual rule, not .NET runtime evidence. |
| S04 | Alistair Cockburn, [Hexagonal architecture](https://alistair.cockburn.us/hexagonal-architecture) | Ports/adapters isolate application interactions from delivery devices. It does not require an interface for every class. |
| S05 | Jimmy Bogard, [Vertical Slice Architecture](https://www.jimmybogard.com/vertical-slice-architecture/) | Organizes by use-case change and challenges rigid layered indirection; acknowledges the need for refactoring judgment. Practitioner experience, not a controlled comparison. |
| S06 | Martin Fowler, [Monolith First](https://martinfowler.com/bliki/MonolithFirst.html) | Discusses the cost of premature distribution and boundary discovery. Experience-based advice with acknowledged uncertainty, not a universal law. |
| S07 | Microsoft, [Microservices architecture style](https://learn.microsoft.com/en-us/azure/architecture/guide/architecture-styles/microservices) | Independent deployment and ownership bring operational, contract and data-management obligations. Does not make distribution necessary for modularity. |
| S08 | Microsoft, [Domain analysis](https://learn.microsoft.com/en-us/azure/architecture/microservices/model/domain-analysis) | Business capability, vocabulary, cohesion and bounded contexts. Applying these to in-process modules is the skill's synthesis. |
| S09 | Microsoft, [Tactical DDD](https://learn.microsoft.com/en-us/azure/architecture/microservices/model/tactical-domain-driven-design) | Entities, value objects and aggregate consistency. Its service examples do not require rich DDD for simple CRUD. |
| S10 | Microsoft, [DDD-oriented microservice](https://learn.microsoft.com/en-us/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/ddd-oriented-microservice) | Separation of domain rules and infrastructure; explicitly permits simpler designs for data-driven capabilities. |
| S11 | Robert C. Martin, [Solid Relevance](https://blog.cleancoder.com/uncle-bob/2020/10/18/Solid-Relevance.html) | Explains the change and dependency concerns behind all five principles. Advocacy does not prove that more abstractions improve a project. |
| S12 | Liskov and Wing, [A Behavioral Notion of Subtyping](https://www.cs.cmu.edu/~wing/publications/LiskovWing94.pdf) | Behavioral substitutability, not merely matching method signatures. Search-index abstract inspected; direct full-PDF retrieval timed out. Full-paper review is not claimed. |
| S13 | Martin Fowler, [Transaction Script](https://martinfowler.com/eaaCatalog/transactionScript.html) | A procedural use-case pattern as a legitimate simple alternative to a rich model. |
| S14 | Martin Fowler, [Replace Conditional with Polymorphism](https://refactoring.com/catalog/replaceConditionalWithPolymorphism.html) | A concrete refactoring alternative for behavior variation; not an instruction to replace every conditional. |

## .NET persistence, lifetime and verification

| ID | Primary source | Relevant basis and limit |
| --- | --- | --- |
| S15 | Microsoft, [Infrastructure persistence layer design](https://learn.microsoft.com/en-us/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/infrastructure-persistence-layer-design) | EF Core unit-of-work/repository roles; DDD repositories follow aggregates, not tables. Its stronger write rules apply to that DDD design. |
| S16 | Microsoft, [DbContext lifetime and configuration](https://learn.microsoft.com/en-us/ef/core/dbcontext-configuration/) | Short-lived unit of work and lack of thread safety; request scope is host-specific. |
| S17 | Microsoft, [Using transactions](https://learn.microsoft.com/en-us/ef/core/saving/transactions) | Provider-dependent atomic saves, explicit transactions and execution-strategy interactions. Does not make remote effects atomic. |
| S18 | Microsoft, [Concurrency conflicts](https://learn.microsoft.com/en-us/ef/core/saving/concurrency) | Concurrency tokens and application conflict handling; database-generated token support differs by provider. |
| S19 | Microsoft, [Dependency injection guidelines](https://learn.microsoft.com/en-us/dotnet/core/extensions/dependency-injection-guidelines) | Composition, scopes, ownership and service-location hazards. A DI container alone cannot establish dependency inversion. |
| S20 | Microsoft, [Choosing a testing strategy](https://learn.microsoft.com/en-us/ef/core/testing/choosing-a-testing-strategy) | Test-double/provider differences and repository tradeoffs. Use isolated infrastructure of the relevant technology, not a live production account. |
| S21 | TNG, [ArchUnitNET](https://github.com/TNG/ArchUnitNET) | Maintainer documentation for dependency tests. No package/version, API example or support claim is adopted without consumer-specific verification. |

## Messaging, resilience and change

| ID | Primary source | Relevant basis and limit |
| --- | --- | --- |
| S22 | Microsoft, [CQRS](https://learn.microsoft.com/en-us/azure/architecture/patterns/cqrs) | Distinct read/write models can share one store; separate stores bring consistency work. |
| S23 | Microsoft, [Event Sourcing](https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing) | Event history as authority, evolution and operational costs; cautions against unnecessary adoption. |
| S24 | Microsoft, [Domain events](https://learn.microsoft.com/en-us/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/domain-events-design-implementation) | Explicit domain side effects, dispatch and transaction timing; distinguishes integration concerns. |
| S25 | Microsoft, [Transactional Outbox with Cosmos DB](https://learn.microsoft.com/en-us/azure/architecture/databases/guide/transactional-outbox-cosmos) | Explains the state/publication gap and atomic local persistence. Its Cosmos implementation is not portable code or an exactly-once external-effect guarantee. |
| S26 | Microsoft, [Idempotent Consumer](https://learn.microsoft.com/en-us/azure/architecture/patterns/idempotent-consumer) | Durable handling of duplicate delivery and the limits of broker guarantees. |
| S27 | Microsoft, [Saga](https://learn.microsoft.com/en-us/azure/architecture/reference-architectures/saga/saga) | Local transactions and compensating business actions; recovery differs from rollback. |
| S28 | Microsoft, [Retry](https://learn.microsoft.com/en-us/azure/architecture/patterns/retry) | Transient faults, bounded retry and idempotency considerations. |
| S29 | Microsoft, [Circuit Breaker](https://learn.microsoft.com/en-us/azure/architecture/patterns/circuit-breaker) | Persistent failure isolation; distinct from retry. |
| S30 | Microsoft, [Cache-Aside](https://learn.microsoft.com/en-us/azure/architecture/patterns/cache-aside) | Read caching, invalidation and consistency tradeoffs. |
| S31 | Microsoft, [Anti-Corruption Layer](https://learn.microsoft.com/en-us/azure/architecture/patterns/anti-corruption-layer) | Semantic translation at an external or legacy boundary. |
| S32 | Microsoft, [Strangler Fig](https://learn.microsoft.com/en-us/azure/architecture/patterns/strangler-fig) | Incremental replacement, transitional routing and shared-resource risks. |
| S33 | Microsoft, [Architecture decision records](https://learn.microsoft.com/en-us/azure/well-architected/architect-role/architecture-decision-record) | Significant choices, context, alternatives, consequences and superseding history. This skill adds the concise AGENTS.md rule route. |

## Synthesis and disagreements

Microsoft's web guide favors Clean Architecture for nontrivial monoliths; Bogard
challenges mandatory layered indirection and prefers use-case cohesion. These
positions do not establish one universal winner. This skill separates deployment,
business modules, dependency policy and feature organization so the user can choose
each on evidence. Combining them is a design proposal, not source unanimity.

Microsoft's DDD guide favors aggregate repositories; its EF testing guidance explains
the cost of adding a repository, and EF already supplies unit-of-work behavior.
The skill therefore asks what boundary the abstraction protects before recommending
one. It preserves strict aggregate write paths when that is the accepted design.

The practical Strategy, Factory, Decorator and Specification choices are original
applications of variation, composition, lifetime and contract reasoning, not a claim
that Microsoft prescribes that pattern catalogue. Neither SOLID nor DRY supplies a
mechanical score for good architecture. Evidence and user requirements govern.

Review affected sources when platform behavior or a proposed tool changes. Check
current official documentation before prescribing package APIs, versions, licensing
or SDK support. Offline use is supported by the bundled reasoning; unverified current
details must remain unknown. No source or structural check proves host discovery,
agent reliability, deployment safety or architecture certification.

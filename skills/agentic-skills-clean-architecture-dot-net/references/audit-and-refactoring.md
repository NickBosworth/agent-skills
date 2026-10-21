# Audit existing architecture and drive refactors

## Audit with explicit coverage

Audit-only is read-only. Inventory the repository and choose representative paths
before assessing it. Include entry points, domain behavior, persistence, jobs,
integrations, composition, public contracts and tests. Label generated/vendor and
unavailable areas by provenance; do not exclude every Migrations directory blindly.
State the revision, inspected scope, uninspected areas and tool limitations.

Evaluate boundaries, responsibility and change costs, not resemblance to a template.
A healthy monolith can have no architecture defects. Missing DDD layers, a mediator
or repositories are not findings without a concrete requirement they would satisfy.

Look for:

- Cycles, forbidden edges, leaky provider/transport types and hidden runtime coupling.
- Business rules with multiple authorities or callers that bypass the agreed owner.
- Shared entities/helpers/base classes that couple distinct concepts and owners.
- Cross-module writes, unclear commit ownership, concurrency and dual-write failures.
- DI lifetime leaks, stateful singletons, unresolved disposal and unsafe parallel work.
- Interfaces whose implementations break contracts or support incompatible capabilities.
- Unversioned external contracts, accidental public APIs and coordinated deployments.
- Authorization/tenant isolation gaps across queries, caches, jobs and messages.
- Rules with no enforcement, false-positive exclusions or no truthful adoption status.

Use history and changed-together evidence when available, but do not infer a causal
problem from counts alone. Repeated technical syntax can be harmless. A large class
can be cohesive; a tiny class can violate a critical ownership boundary.

## Report useful findings

For each finding give: category (violation, decision gap, defect or improvement),
severity and concrete impact, path/symbol and rule/evidence, confidence/unknowns,
smallest plausible remedy, decision required and verification. Put data/security
risks before organizational convenience. Separate observed failures from risks
that have not been reproduced. Never claim whole-codebase coverage from a sample.

Supply a short decision backlog and an incremental refactor sequence. Then ask one
highest-priority decision question using the normal protocol. Do not ask the user
to choose a complete architecture from a list before reporting what you found.
If there are no material gaps, say so with coverage limits instead of inventing work.

## Refactor within authorization

An audit can recommend work without changing files. For an implementation request,
execute the authorized scope once its blocking decisions are settled. Permission
to save a rule does not itself authorize moving projects or changing production data.
Never replace a behavior-preserving refactor with a feature change silently.

1. **Define the outcome.** Name the accepted rule and the concrete boundary/use
   case to change. Map all consumers: API, workers, tests, serialized contracts,
   reflection/configuration, migrations, generated callers and deployment scripts.
2. **Establish behavior.** Inspect baseline failures. Add focused characterization
   tests for consequential uncertainty; do not freeze an acknowledged security or
   correctness defect as a requirement. Resolve intended behavior separately.
3. **Choose a reversible increment.** Move one cohesive policy or route one
   capability through a seam. Keep compatible adapters where consumers need time.
   For a large replacement, assess Strangler Fig and anti-corruption translation;
   define routing, shared-data ownership and removal conditions.
4. **Preserve contracts.** Check validation/authorization order, tenant isolation,
   nullability, exceptions/cancellation, lifetime, transaction/commit timing,
   concurrency, message identity/order and retry behavior. Internal movement can
   still change reflection discovery, DI scanning and persistence mappings.
5. **Handle data deliberately.** Keep schema changes compatible across deployment
   versions. Separate expansion, backfill, cutover and later contraction where
   needed. Avoid unprotected dual writes. Define backup/recovery and recognize
   changes that cannot be undone by rolling back binaries. Destructive data or
   production actions require their own applicable authorization.
6. **Verify and simplify.** Run affected builds/targets, domain/contract/integration
   tests and agreed architecture checks. Inspect failure paths and the final diff.
   Remove temporary code only after its consumers and rollback need have ended;
   update instructions, examples, ADR routes and debt status together.

Reuse existing tests and helpers. Do not add one mock per new class merely to mirror
the implementation. Architecture checks need negative evidence; integration behavior
needs the real relevant provider/protocol in an isolated environment. If tests cannot
run, report that limitation and do not label the refactor behaviorally verified.

## Completion evidence

Record baseline and changed behavior, decisions and rules affected, actual checks
and outcomes, migration/rollback readiness and remaining debt. Report separately:
structural validation, build/analyzer results, functional/provider tests, semantic
review and host/model behavior. A passing build does not establish architectural
soundness; a proposed test does not establish enforcement.

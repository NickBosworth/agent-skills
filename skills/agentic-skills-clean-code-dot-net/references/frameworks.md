# Framework extensions

Load only relevant sections. These requirements preserve framework contracts;
they do not impose infrastructure on a console utility. Sources S31, S36–S41.

## ASP.NET Core and background work

MUST preserve authorization, validation, request cancellation, response/route
contracts and exception-boundary policy. Minimal APIs and controllers are both
valid. Avoid blocking request paths, HttpContext capture beyond request lifetime
and unowned work after completion. Background services need shutdown/failure
ownership and appropriate DI scopes; no scoped service captured by a singleton.
A long-running action may need the existing durable work mechanism, not an
invented queue. Deep security assessment requires appropriate security guidance;
this skill is not a certification. Use [everyday security](security.md) for
affected input, file/process, deserialization, certificate and output boundaries.

## Persistence

MUST review EF context lifetime, tracking intent, projection, pagination, eager/
lazy loading, N+1 behavior, provider translation, cancellation and transactions.
Do not apply AsNoTracking to an update flow or turn tracked identities into records.
Never parallelize operations on one context. Switching IQueryable to IEnumerable
may move filtering to memory and change SQL, traffic and failure behavior.
Examine generated queries. Use integration tests with the actual provider for
consequential translation or transaction changes; an in-memory substitute proves
neither.
Inspect migrations' provenance and edit policy; do not discard hand-written work.

Dapper/raw SQL/other providers MUST preserve parameterization, mappings, transaction
and connection ownership and provider-specific cancellation. Verify unfamiliar
provider behavior using its maintainer's documentation. Do not interpolate untrusted
values into SQL, remove authorization or weaken safe path/input handling for style.

## HTTP, DI and logging

SHOULD retain supported long-lived clients or factory-managed clients, with real
timeout/cancellation, response/stream lifetime and cookie/isolation policy.
IHttpClientFactory is not the sole valid strategy (S39 reconciles older S36 advice).
Do not create an independently pooled client per request by reflex.
DI composition is separate from hidden service location; validate configuration
at an appropriate boundary and preserve container-owned disposal.
For Options freshness, startup validation and owned change notifications, load
[configuration lifetimes](configuration-nullability.md#options).

MUST use stable structured logging templates and meaningful properties where
structured logging is supported. No interpolated templates losing structure,
secrets/sensitive payloads, duplicate error noise or invented correlation guarantees.
Source-generated logging MAY fit an established convention or measured need;
do not add it solely to demonstrate modern syntax.

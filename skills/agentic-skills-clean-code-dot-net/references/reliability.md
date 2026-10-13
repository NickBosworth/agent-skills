# Async, cancellation, failure, ownership and concurrency

Apply DNC-ASYNC-001–003 and DNC-LIFE-001–002 to every affected path. Sources
S23–S32 establish mechanisms; the operational review requirements are skill policy.

MUST use naturally asynchronous I/O in async paths. No Result, Wait or
GetAwaiter().GetResult() except an unavoidable isolated boundary with evidence.
Task.Run does not make blocking server I/O properly asynchronous. async void is
limited to framework-required event handlers; delegate to testable awaitable work.
Background/fire-and-forget operations require explicit lifetime, failure,
cancellation and shutdown ownership.

Task/Task<T> SHOULD serve ordinary APIs. ValueTask requires an existing contract
or measured need plus correct consumption; do not casually await/reuse it twice.
CA2012 covers selected misuse, not the entire ownership contract.

MUST propagate meaningful tokens through cancellable work, normally last where
API compatibility permits. Distinguish caller cancellation, timeout and shutdown.
Do not use None/default merely to silence CA2016. Determine the point where
cancellation would violate consistency. Do not report cancellation after a
successful irreversible commit; explain/test intentional non-observation.
Retries need transient failure semantics, bounds, cancellation and idempotency/
duplicate-effect analysis; use existing resilience policy, not homemade boilerplate.

ConfigureAwait is contextual. App-independent libraries SHOULD avoid requiring a
caller context when no contract requires it; an adopted library policy can select
CA2007. UI/application continuations may require the context. No global false
injection or claim that it creates a thread or makes blocking safe. Framework/
callback context contracts may warrant exceptions. The base asset leaves CA2007
off; the library fragment enables it after review.

MUST preserve async exception timing and resource lifetime. Removing await inside
using/try/finally can dispose a resource before work completes or bypass exception
translation. Validation in an async body faults its task; a synchronous outer
wrapper can validate immediately if that is the promised API. Test the real timing.

Parallelism SHOULD be for independent work with bounded concurrency where volume
grows. Async does not make mutable state safe. Do not share one DbContext among
concurrent operations. Locks/semaphores need documented invariants and release on
failure/cancellation; use standard primitives rather than speculative lock-free
algorithms. Async streams need token propagation, deferred-execution, enumeration
ownership/disposal and buffering/backpressure review. Preserve streaming semantics.

MUST catch where recovery, boundary translation, cleanup or top-level policy
exists, not everywhere. No swallowed failures, empty results standing for
infrastructure outages, fake success or logging at every layer. Separate expected
cancellation from errors. Rethrow with throw; preserve meaningful inner exceptions
when translating. Standard exception types are preferable to needless custom types.

MUST dispose owned resources with matching using/await using lifetime. Borrowed
or DI-owned resources must not be disposed without transfer of ownership.
Returned tasks/streams/lazy sequences may still require a connection/resource.
Finalizers are not routine; use correct inheritance/dispose patterns and safe
handles for actual native ownership. Review idempotence and concurrent-use contracts.
CA2000/CA2213 are candidates, not proofs of ownership; confirm installed behavior.

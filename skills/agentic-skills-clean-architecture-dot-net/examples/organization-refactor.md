# One ownership refactor

This synthetic example illustrates an accepted in-process boundary, not a required
layout. Its runnable starting point is the [refactor fixture](../evals/fixtures/refactor/README.md).
The consuming project already authorizes Capacity as the reservation-policy owner.
API and worker behavior must stay unchanged; no database or deployment change is needed.

Before:

```text
src/Api/ReservationEndpoint.cs       capacity comparison plus delivery behavior
src/Worker/ReservationJob.cs         same capacity comparison plus job behavior
src/Billing/PaymentWindow.cs         separately owned date comparison
src/Audit/RetentionWindow.cs         separately owned date comparison
src/Host/Composition.cs             constructs entry points
tests/Contracts/Program.cs          exercises API and worker contracts
```

After one sufficient refactor:

```text
src/Capacity/ReservationPolicy.cs    internal sealed, stateless policy contract
                                   shared by callers in this assembly
src/Api/ReservationEndpoint.cs       delegates the policy; preserves response contract
src/Worker/ReservationJob.cs         delegates the same policy; preserves job contract
src/Billing/PaymentWindow.cs         unchanged independent payment knowledge
src/Audit/RetentionWindow.cs         unchanged independent retention knowledge
src/Host/Composition.cs             supplies the same policy type to both callers
tests/Contracts/Program.cs          original contracts plus focused policy boundaries
```

Use a concrete policy when no interchangeable implementations are required; an
interface, public export and new assembly are separate choices. Keep types internal
unless another assembly actually needs them. If independent compilation/access restrictions
are later required, consider an assembly boundary with narrow exports then.

Move the agreed capacity rule once. Preserve authorization/tenant checks in each
entry point and keep delivery-specific errors there. Composition constructs the
dependency; the policy does not resolve services or know about HTTP and jobs.
Do not merge Billing and Audit merely because each compares dates: they have
different owners, constraints and reasons to change.

Verify API/worker results for zero, equal and insufficient capacity; tenant denial;
and the original cancellation/error behavior. Inspect every consumer and update the
accepted rule's debt status. A source-level ownership refactor does not establish
database concurrency safety. Provider behavior requires its own isolated test.

The [dependency fixture](../evals/fixtures/guard/README.md) separately demonstrates
assembly/type restrictions. Neither fixture is a production application template.

# Reservation ownership fixture

Synthetic, in-memory behavior only. Run `dotnet run --project tests/Contracts`
from this project root. No package feed or external service is used.

The API returns denied for another tenant, invalid for a nonpositive request,
accepted when enough capacity exists, otherwise full. The worker returns false
for the first two cases and otherwise applies the same capacity comparison.
Both observe cancellation before validation. Available capacity is a supplied
snapshot, not a concurrency guarantee. Billing payment windows and Audit retention
have different owners despite similar comparisons.

Preserve these contracts during an ownership refactor. The source and original
contract assertions are raw task inputs, not model evaluation results.

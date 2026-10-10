# Synthetic worked decision

Request: add order cancellation to a fictional shop. The repository keeps paid orders
for accounting, and the current worker can still ship an order after cancellation.

Question: The paid-order retention rule prevents deletion, and the shipping worker
reads status asynchronously. Do we represent cancellation as an explicit state or
limit cancellation to unpaid orders? I recommend an explicit state with a worker
check because it preserves accounting records and addresses the supplied paid-order
requirement. Limiting scope is simpler but does not fulfil that requirement.

After the user selects the state transition, the plan traces API validation, domain
state, worker behaviour, reporting and old-client compatibility. Tests cover a race
with shipping and preserved accounting history. Permission to design the change is
not permission to mutate production orders. This is fictional, not executed evidence.

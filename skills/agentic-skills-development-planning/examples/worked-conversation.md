# Synthetic worked decision

Request: add cancellation for paid orders to a fictional shop. The supplied
accounting rule requires paid orders to remain available, and inspection shows that
the shipping worker reads order status asynchronously. The worker can still ship an
order after cancellation. These are synthetic facts, not findings from a real shop.

**Question 1**

I am asking to resolve how cancellation should interact with accounting and shipping.
We need to prevent a cancelled order from being shipped while keeping its accounting
record. Should cancellation happen immediately or wait for a reviewed shipping hold?

The current code keeps paid orders, as required by the accounting rule. The shipping
worker reads status asynchronously, so a cancellation can race with dispatch. The
reason for that asynchronous design is not recorded; it would be an inference to
claim it was chosen for throughput.

**Options**

**A — Record cancellation and make the dispatch check atomic (Recommended).**
Retain the order and coordinate the cancellation transition with the worker's final
dispatch check. This meets the paid-order requirement and addresses the observed
race, rather than relying on an earlier status read. Orders already dispatched need
an explicit outcome; cancellation must not pretend to undo shipment.

**B — Record a cancellation request and hold it for operator review.**
Retain the order and show cancellation as pending until an operator confirms that
shipping is stopped. This makes the uncertainty visible but adds manual work and
delays confirmation. It still needs an effective shipping hold, not just a new label.

I recommend A because it connects the customer's confirmed cancellation to the
worker's authority to dispatch. A saved state alone would leave the race open; the
coordinated check is what protects the outcome while preserving accounting history.
B is a viable interim workflow if the dispatch system cannot support that check,
provided the business accepts pending confirmation and can enforce a shipping hold.
The plan must test competing cancellation and dispatch attempts and define the
already-dispatched result. If inspection shows dispatch cannot be coordinated, that
evidence would change the recommendation. Only two viable options are offered here.

After the user chooses an approach, the plan traces API validation, domain
state, worker behaviour, reporting and old-client compatibility. Tests cover a race
with shipping and preserved accounting history. Permission to design the change is
not permission to mutate production orders. This is fictional, not executed evidence.

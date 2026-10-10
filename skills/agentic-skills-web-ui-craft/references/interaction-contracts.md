# Interaction contracts

For each critical control record trigger, pending state, authoritative result,
feedback, failure/recovery, focus and persistence. Actions must work beyond hover:
keyboard, touch and appropriate semantic controls belong in the contract.

Forms need visible labels, instructions at the point of use, validation tied to the
field, preserved valid input and server-side authority. Do not treat an optimistic
animation as successful persistence. Avoid duplicate submissions and misleading
retry outcomes. Confirmation is proportional to irreversible consequences.

Define whether filtering/sorting/selection/pagination applies to visible rows or the
whole dataset. Keep zero, missing, stale, estimated and failed values distinct.
For asynchronous data define partial results, retry and freshness, not merely a
spinner. Browser Back, deep links and refresh must preserve the intended route/state.

Dialogs need an appropriate accessible pattern, focus entry/containment/return and
Escape behaviour where applicable. Use native/platform primitives first. Record
inapplicable states with a reason rather than building every theoretical state.

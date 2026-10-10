# Engineering

Reuse shared primitives, routes, tokens and authoritative data/validation. Complete
one end-to-end slice and its recovery path before replicating a layout. Avoid global
CSS patches, duplicated state, unnecessary dependencies and fabricated backend
success. Preserve security and accessibility boundaries while improving appearance.

Use keys, subscriptions, asynchronous cleanup and error handling appropriate to the
actual framework. Inspect library versions before relying on APIs. Report a missing
integration honestly rather than quietly shipping a mock as production.

Measure performance against a representative task and stable environment. Separate
lab metrics from production field results. [Web Vitals](https://web.dev/articles/vitals)
explains field-oriented metrics and measurement; a single Lighthouse run is not an
observed production percentile. Fix the measured cause and recheck the affected
flow rather than introducing speculative caching or complex abstractions.

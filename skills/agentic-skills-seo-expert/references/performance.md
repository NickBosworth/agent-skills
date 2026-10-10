# Performance and page experience

## Separate field evidence from laboratory diagnostics
Use real-user or CrUX field data when available, with URL/origin scope, date window, device and percentile recorded. Core Web Vitals good thresholds are **LCP ≤ 2.5 seconds, INP ≤ 200 milliseconds and CLS ≤ 0.1**, assessed at the **75th percentile**. Missing field data is unknown, not a pass. Do not present an origin’s data as a measurement of one low-traffic URL. [G46]

A lab run helps reproduce and diagnose problems under a stated device/network configuration. A Lighthouse score is not an engine ranking score. A normal lab page-load run does not directly establish field INP; TBT is a diagnostic proxy, not the same metric. Use repeat runs and distributions rather than cherry-picking the best sample. [G46]

## Diagnose by user-visible failure
**Slow primary content:** inspect server response, cache misses, critical CSS, font handling, render-blocking work, important image discovery and transfer size. Do not lazy-load the primary above-the-fold image by habit. Prioritise only genuinely important resources; indiscriminate preloads compete with each other.

**Slow interactions:** reproduce meaningful input flows and inspect main-thread work, hydration, event handlers and third-party scripts. Reduce unnecessary synchronous work without breaking functionality or accessibility. Check slow-device behaviour, not just a developer workstation.

**Visual jumps:** identify unstable image/embed dimensions, late insertions, font changes and expanding UI. Reserve appropriate space while preserving responsive layouts. An unexpected moving buy button is both a usability defect and a potential layout-stability problem.

These are diagnostic hypotheses; measure the actual route before prescribing a fix. Consult the current official documentation for the relevant browser/framework features before writing version-sensitive code.

## Page experience is broader than a score
Check mobile readability, secure delivery, intrusive overlays, interaction traps, keyboard access and task completion. Accessibility is an independent quality obligation, not a claim that every accessibility test is a direct ranking factor. Do not remove consent, security, fraud prevention or legally required notices merely to improve a timing score. Better technical measurements do not guarantee ranking gains. [G27]

## Implementation contract
For each performance ticket, record the affected template, baseline metric and source, reproduction scenario, suspected cause, proposed experiment, UX constraints and regression budget. Prefer shared-template improvements where evidence supports them. Verify visual, functional and accessibility behaviour alongside timings. Name any tradeoff, such as cache staleness versus speed or JavaScript reduction versus a necessary interaction.

## Evaluation
Separate immediate lab regression checks from the field-data window after deployment. Compare equivalent device/template groups and note traffic mix, releases and external changes. Report uncertainty and remaining bottlenecks instead of promising a page-one result from a perfect score.

Sources: G27, G46. The debugging sequence is an engineering workflow, not a universal engine formula.

Source IDs resolve in the [source register](../research/SOURCES.md).

# Measurement, diagnosis and experiments

## Establish a baseline and a business outcome
Record property, environment, timezone, collection date, date range, engine, search type, filters and aggregation level. Choose qualified conversions or task outcomes alongside exposure and visits. Keep analytics implementation changes visible; a tracking break can look like a search failure.

Google Search Console, Bing Webmaster Tools, web analytics, logs and vendor rank trackers measure different things. Do not expect their totals to reconcile exactly. Respect anonymisation, reporting limits and different aggregation rules. Do not extrapolate query exports into total market demand. [G40, B06]

## Search metrics
Compute aggregate CTR from total clicks divided by total impressions, not the unweighted average of row CTR percentages. Position needs the provider’s definition and compatible dimensions; it is not a universal fixed rank. Do not aggregate overlapping exports or add total rows to detail rows. Keep country, device, date, search type and provider context intact. [G40]

Use low-CTR/high-exposure rows as investigation leads, not proof of a poor title. Position, intent, brand, result features and query mix affect interpretation. Multiple URLs for a query are not automatically harmful cannibalisation. The bundled analyser deliberately outputs review leads, not “fix now” verdicts. [I05]

## Current AI reports
Google now documents a **Generative AI performance report** for AI Overviews and AI Mode. Its described metric is impressions, and its data also contributes to the overall Web report. Do not sum the two or invent AI clicks/CTR from impressions alone. Confirm account availability, filters and date conventions in the current help page. [G45]

Bing’s AI Performance preview reports citation visibility with additional insights announced in 2026. Citations do not establish visits, ranking or conversions. Record which preview features the actual account exposes instead of assuming availability from an announcement. [B01, B02]

## Before/after evaluation
Name the hypothesis, change set, expected mechanism, target cohort, outcome and adverse metrics before release. Compare like-for-like periods with seasonality, weekday mix, campaigns, demand shifts and algorithm changes noted. A simple before/after increase supports an observation, not automatic causation.

For sufficiently large comparable template groups, a well-designed controlled SEO test can improve attribution. Consider unit selection, treatment consistency, spillover, sample adequacy and implementation checks. Do not invent statistical significance or apply a vendor case study’s uplift as a forecast for this site. Small sites may need careful observational learning instead. [I08]

## Report uncertainty
Show absolute values alongside percentages, the denominator, missing data and relevant time lag. Do not declare indexing recovery from a successful live fetch or search success from a lab-score gain. Distinguish deployment correctness, engine uptake and user/business outcomes.

Use a proportionate review cadence based on traffic, release risk and decision urgency. The skill cannot perform background work unless the host actually supplies scheduling and the user authorises it. Provide a monitoring plan rather than pretending to have set one up.

Sources: G38, G40, G41, G45, B01, B02, B06, I05, I08.

Source IDs resolve in the [source register](../research/SOURCES.md).

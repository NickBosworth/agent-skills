# Migrations, consolidation and incident recovery

## Treat a migration as a controlled change
Record scope, reasons, ownership, baseline traffic/conversions, URL inventory, existing redirects, key inbound destinations and current indexing evidence. Separate domain changes, platform changes, information-architecture changes and content rewrites where feasible so problems remain diagnosable. Do not propose a migration solely to satisfy a cosmetic URL preference.

## URL mapping
Create an explicit old-to-new map for useful existing pages. Choose relevant equivalents and preserve meaningful identifiers, locale, query behaviour and anchors where necessary. Leave genuinely removed content with appropriate status when no relevant replacement exists; a blanket homepage redirect is not an equivalent-page strategy. Check many-to-one consolidations with the content owner. [G18]

## Pre-release checks
Validate redirects for loops, chains, conflicts and accidental catch-alls. Check canonical/hreflang targets, sitemap generation, internal links, media URLs, structured data, route statuses, analytics, conversion flows and relevant file downloads. Confirm the production domain comes from environment-safe configuration. Guard against carrying staging exclusions into production or making staging public.

Keep staging access controls intact during testing. An isolated environment or approved authenticated test is preferable to temporarily exposing private work for a crawler. Build and browser tests need representative mobile and locale routes, old URLs, missing pages and error responses.

## Release and rollback
Agree the release owner, deployment authority, rollback mechanism, monitoring responsibility and stop conditions before the change. Capture baseline config and redirect maps. Canary a bounded section when feasible. Coordinate appropriate current search-engine move/submission tools only with permission; do not assume every URL change qualifies for a domain move tool. [G18, G41]

Verify deployed responses immediately, not just repository files. Keep durable redirects and correct signals for the period justified by current engine guidance and real usage; do not remove them after an invented universal short deadline.

## Incident triage
For a traffic drop, first verify the measurement system and segment the change by dates, pages, countries, devices, search types and query classes. Then inspect availability, access/index directives, deployments, canonical changes, lost content, seasonality, demand and current engine updates. Correlation with an update date is not proof of a penalty or one specific cause. Use the current official diagnostic flow. [G38]

Do not mass-rewrite content, change domains, disavow links or toggle robots in response to one unexplained chart. Rank hypotheses by evidence, impact and reversibility. Correct a verified production regression promptly within the approval process, then monitor recrawl and outcome evidence separately.

## Handoff
Provide URL-map validation, deployment checks, remaining exceptions, rollback evidence and a review plan. Search signals may take time to settle; do not promise a fixed recovery date. Record what has actually recovered and what remains uncertain.

Sources: G18, G23, G38, G41.

Source IDs resolve in the [source register](../research/SOURCES.md).

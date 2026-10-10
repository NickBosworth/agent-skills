# Engagement workflow

## Decide what success actually means
A site exists to help people do something: buy an appropriate product, find accurate information, book a service, use a tool or contact a legitimate organisation. Capture that purpose and the relevant conversion before optimising organic visits. A thousand irrelevant visits is not automatically better than ten useful ones. This is an engagement judgement, not a ranking formula.

Read project instructions and inspect routes, layouts, metadata utilities, CMS models, deployment config and tests before suggesting a new stack. Find existing redirects, intentional noindex rules, locale conventions, design/content systems and analytics. Capture a baseline commit and environment. Never treat a staging hostname as the public canonical domain without checking configuration.

## Modes and deliverables
**Audit:** Read and inspect. Deliver evidence-backed findings, coverage and a prioritised backlog. No implied authority to edit or publish.

**Research:** Discover demand and intent, map existing coverage and create briefs. Distinguish observed evidence from ideas and tool estimates. No implied authority to purchase data, scrape behind restrictions or publish pages.

**Plan:** Select a defensible change sequence, dependencies, approvals, owners and verification criteria. Record alternatives and why the recommendation fits this particular site.

**Implement:** Make the specifically authorised changes. Confirm sensitive operations separately where the scope did not already authorise them. Protect behaviour, business rules and rollback. Implementation does not authorise deployment.

**Verify:** Test an existing change against its stated acceptance criteria and real responses. Report unexecuted checks as unexecuted, even when a code diff looks convincing.

**Maintain:** Reconcile drift, review evidence freshness and update documentation. Do not re-open settled questions without a new conflict or relevant changed evidence.

## Work in four passes
1. Establish access, exposure and desired indexing. Resolve critical failures before investigating marginal content changes.
2. Audit template families and high-value journeys. Include failure routes, old URLs, pagination, filtered lists, mobile and language variants. Expand a confirmed template issue to the inventory through deterministic matching, not guesswork.
3. Assess content purpose, originality, task completion and internal navigation. Research new content only after understanding existing content and whether the business can provide a worthwhile answer.
4. Implement a small coherent batch, verify immediate effects, then evaluate search and business results over an appropriate observed period. Keep the original hypothesis visible.

For a small site, checking every public route may be feasible. For a large site, start with a documented sample and then pursue coverage by template and automated inventory checks. There is no universal safe crawl size or mandatory number of pages.

## Decision handling
For a material conflict, state the intended result, current implementation and business rule, the conflict or uncertainty, realistic alternatives, recommendation, side effects and what approval is needed. Ask one question. Do not ask the user to identify facts the repository can answer. If a required decision is unavailable, deliver completed read-only work and leave the dependent operation pending.

## Stop or change course
Stop an affected action on unclear ownership, private URLs, unexpected credentials, rate limiting, a robots restriction, a destructive business-rule conflict, unsafe production behaviour or missing authorisation. Record evidence without copying secrets. Do not silently broaden scope to fix unrelated issues.

Deliver a useful result even with restricted tools: an offline structural audit, an explicit data-request checklist, a scoped implementation plan, or clearly labelled research hypotheses. Never invent missing work.

Sources: G01, G08, G20, G41. The pass structure and permission model are this pack’s operational design.

Source IDs resolve in the [source register](../research/SOURCES.md).

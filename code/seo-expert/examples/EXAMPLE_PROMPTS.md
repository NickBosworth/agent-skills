# Example prompts after installation
Use only tools that the host actually provides. `$seo-expert` is the Codex-style explicit invocation; Claude Code uses `/seo-expert`. For OpenCode, ask it to load `seo-expert` using its skill mechanism. The wording below can follow any supported invocation; do not enter it as a shell command.

## Whole-site audit
> $seo-expert Audit this repository and its public site at https://example.invalid. Work read-only. Inspect existing instructions and business rules first. Cover technical SEO, content, navigation, Google and Bing. Reconcile the inventory and label sample coverage honestly. Give me evidence-backed root causes, priorities and implementation tickets. Ask one consequential question at a time only when repository or permitted browsing cannot resolve it.

## First-pass research without subscriptions
> $seo-expert Research organic opportunities for this site's actual offering in the UK. Use permitted public web search. Inspect existing pages first; distinguish observed results from your ideas. Cover broader terms and specific/long-tail needs, but do not invent search volume, difficulty or local rankings. Map each useful cluster to an existing-page improvement, a justified new page, or rejection. Include useful FAQ candidates only where they answer genuine unmet questions.

## Existing-page improvement
> $seo-expert Improve the content brief for this page using its real subject, brand voice and supplied facts. Preserve the URL and product claims. Avoid filler, word-count targets and forced names. Explain the original contribution and what still needs verification before publication.

## Repository implementation
> $seo-expert Implement only the approved SEO-013 canonical fix in this branch. Reuse the existing metadata layer and business rules. Do not deploy or modify unrelated URLs. Test direct loads, client navigation, mobile and locale variants. Report the actual tests run and a rollback.

## Search export analysis
> $seo-expert Analyse these authorised Google and Bing search exports. Confirm their dimensions and normalise them safely before using the bundled analyser. Preserve engine, date, country, device and timezone. Show existing exposure and multiple-URL review leads without claiming total market demand or automatic cannibalisation.

## JavaScript diagnosis
> $seo-expert Investigate why the intended page content or metadata differs between initial HTML and the rendered route. Check direct navigation and client transitions. Do not recommend a framework rewrite solely because JavaScript is used.

## Pre-launch audit
> $seo-expert Audit this staging build for release readiness without removing its access controls. Verify production host configuration, metadata, status handling, redirects, sitemaps, mobile content and business tests. List the production checks that cannot be verified from staging.

## Ecommerce catalogue
> $seo-expert Audit this catalogue's categories, products, variants, facets and pagination. Preserve shopping behaviour and private checkout/account routes. Prioritise template/data fixes and accurate offers. Do not create one page for every keyword or variant.

## Local service business
> $seo-expert Review our existing location and service-area pages using the supplied real operating footprint. Identify useful local content and factual inconsistencies. Do not invent offices, local reviews or city-name pages. Prepare profile changes for approval, not publication.

## International site
> $seo-expert Audit language/market routes, localised content and hreflang/canonical clusters. Research terminology in each selected market using available evidence. Test direct access and fallback behaviour; do not assume English keyword demand transfers to translations.

## Structured data
> $seo-expert Review our JSON-LD against the real visible content and current supported search features. Separate syntax, vocabulary, eligibility and actual display. Identify retired-feature assumptions. Do not fabricate ratings, offers or an alternative content type to force eligibility.

## FAQ restraint
> $seo-expert Review proposed FAQ additions. Keep only questions that improve the page and are not already answered well. Label hypotheses and facts needing review. Do not promise Google FAQ rich results or repeat every exact-match query.

## AI search
> $seo-expert Evaluate Google/Bing AI-search visibility using current official guidance and whatever real account data is available. Separate impressions, citations, clicks and conversions. Reject speculative mandatory llms.txt, formatting formulas and brand stuffing.

## Bing and IndexNow
> $seo-expert Check our existing Bing discovery and change-notification setup. Inspect whether an integration already exists. Recommend a scoped IndexNow implementation only if useful; do not submit URLs, create keys or change accounts without approval.

## Migration planning
> $seo-expert Prepare an SEO-safe plan for this approved URL migration. Produce a relevant old-to-new map, exception handling, validation matrix, rollout and rollback. Do not redirect unrelated pages to the homepage or deploy anything.

## Traffic-drop investigation
> $seo-expert Investigate this decline without assuming an algorithm penalty. Check tracking, dates, page groups, markets, deployments, index controls, demand and current engine guidance. Rank hypotheses by evidence and reversibility. No mass deletion, disavow or rewrite.

## Field performance
> $seo-expert Review these field and lab performance results by template and device. Keep metric definitions and windows intact. Prioritise real bottlenecks without removing required functionality or presenting a lab score as a ranking score.

## Limited-access audit
> $seo-expert We have only the repository and supplied snapshots, no live browser or search accounts. Perform the useful offline checks, label missing evidence, and create a concrete verification plan. Do not imply you fetched or indexed anything.

## Verify without weakening tests
> $seo-expert Verify this completed SEO patch against the original acceptance criteria. Do not change tests to mask regressions. Separate code/deployed verification from later search-engine uptake and business results.

## Maintain the pack
> $seo-expert Review current Google/Bing guidance for material changes since this pack's research snapshot. Update affected rules, references, decisions and regression cases. Preserve source access status. Run the pack tests and regenerate checksums only after changes are complete.

## Whole-site programme with controlled autonomy
> $seo-expert Work through the approved SEO backlog in small reviewable batches until all currently unblocked, authorised items are complete. Preserve priorities and business rules; do not stop after merely describing the next steps. Stop affected actions at permission boundaries, report blockers accurately and continue independent authorised work. Never claim background work or production changes that did not happen.

# Information architecture and internal links

## Build around tasks and meaningful entities
Map audience tasks to content and commercial destinations. Use a navigable hierarchy and understandable labels, not a mechanically generated keyword tree. Keep important destinations reachable through ordinary links and useful contextual relationships. An arbitrary “three clicks maximum” target is not an engine requirement.

Reconcile the link graph with the intended inventory. Find important pages with no internal route, broken destinations, confusing anchor text, redundant navigation and bottlenecks. “Not found in this crawl” is not proof of an orphan unless the crawl covers relevant entry points and rendering modes. [G16, G36]

## Link quality
Prefer meaningful anchor text that explains the destination in context. Audit image-link alternative text and empty/non-descriptive anchors in their actual user context. Do not force exact-match phrases into every link or set a target number of links per paragraph. External links can substantiate claims; adding famous names or linking to an authority is not a magic ranking transfer. Qualify paid/UGC links appropriately and consult current engine guidance for exact attribute semantics. [G16, G02]

## Pagination and incremental loading
Give meaningful paginated routes stable URLs, discoverable links and coherent titles/content. Do not canonicalise every distinct page in a series to page one. Infinite scroll/load-more interfaces need a crawlable route through their content, not just a button. Ensure deep links preserve their state and that pagination does not generate infinite combinations. [G19]

## Faceted navigation
Classify filters as: a valuable independent landing need; a user-only state; a sort/view variant; or an unbounded/trap combination. Decide which combinations merit discovery using demand, inventory and actual user value. Align controls with that choice. Do not delete functional parameters or exclude useful categories to reduce a tool’s warning count. Facet controls require coordination across routing, links, canonicals, robots and sitemaps. [G25]

## Internal search and generated listings
Inspect whether search results, empty lists, tag archives and CMS taxonomies provide independent value or merely replicate other routes. Exclusions may be appropriate but are a product decision with edge cases, not a universal rule for every archive. Prevent automated queries or user-generated parameters from producing unlimited low-value pages. Search spam can be a security/abuse symptom; escalate root cause instead of merely hiding its sitemap entries. [G02]

## Consolidation
Two pages addressing the same query can have different useful purposes. Examine task overlap, content, traffic, conversions and result behaviour before merging. Preserve distinctions that users need. For genuine consolidation, pick the durable destination, carry useful unique content across, update links and plan appropriate redirects; do not redirect unrelated content for nominal link value. [I05, G10, G18]

## Verify navigation changes
Compare before/after link discovery, important journey reachability, accessible labels, canonical destinations and rendered navigation. Test pagination end states, filtered empty results and mobile menu behaviour. Keep the URL inventory and sitemap consistent with the intended architecture.

Sources: G02, G10, G16, G18, G19, G25, G36, I05.

Source IDs resolve in the [source register](../research/SOURCES.md).

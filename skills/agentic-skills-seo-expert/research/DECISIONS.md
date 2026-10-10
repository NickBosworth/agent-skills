# Research decisions and rejected shortcuts

Snapshot: 10 October 2026. These are operational choices informed by the source register, not claims of an exhaustive review of every page ever published by either engine.

| Topic | Decision | Evidence |
|---|---|---|
| Requirements versus heuristics | Keep engine obligations, suggestions, vendor methods and pack conventions visibly distinct. A crawler score is not an engine score. | G08; I06; I07 |
| FAQ content versus search enhancement | Keep helpful questions; do not promise the discontinued Google FAQ rich-result feature. See the dated feature note in the structured-data reference. | G05 |
| Generative-search tactics | Use useful content and current provider rules; no mandatory llms.txt, magic formatting, invented citations or brand stuffing. | G06; B03; B08 |
| AI measurement | Use current provider report definitions; do not repeat outdated blanket claims that no separate reports exist. Do not equate impressions/citations with visits. | G45; B01; B02 |
| JavaScript | Inspect actual rendered delivery; no universal assertion that JavaScript is invisible or that every site must migrate to SSR. | G11 |
| Robots locations and scope | Do not misclassify Google's recognised body robots meta as ignored. Preserve crawler-scoped headers. | G09 |
| Page length / H1 count | Use editorial judgement; no fixed word quotas or strict one-H1 ranking checks. | G01 |
| Long-tail terms | Demand-tail concept, not token/word count. Unknown demand stays unknown. | I04 |
| Keyword metrics | Vendor estimates and Ads competition retain their definitions; no fabricated volume, difficulty or cross-vendor comparability. | G42; G43; I01; I03 |
| Cannibalisation | Multiple URLs are an investigation lead, not an automatic reason to merge/delete. | I05 |
| Variant pages | Separate only when user need and real catalogue semantics justify it. | G35; G36 |
| Speed measurement | Keep field and lab evidence separate and use current metrics. No universal Lighthouse pass as SEO certification. | G46; G27 |
| Indexed versus indexable | Technical observations cannot certify actual indexing or future inclusion. | G20; G41 |
| IndexNow | Owned-URL change notification to participants, not a guaranteed or universal Google indexing mechanism. | N01; N02 |
| Google Indexing API | No arbitrary article/product submission or deceptive eligibility markup. | G39 |
| Vendor advice | Use primary-publisher methodology selectively. Reject blanket claims of guaranteed rankings, effortless long-tail wins, required FAQ expansion or universal testing uplifts. | I01–I08; G08 |
| Bing policy source access | Main guidelines retrieval was incomplete. Mark access-limited; use readable official sources and require a current browser check for policy-specific decisions. | B09; B04–B07 |
| Tooling | Ship bounded offline analysis instead of a home-made network crawler with unclear permissions and security. | Pack safety design |
| Whole-site claims | Reconcile inventory and report per-check coverage; no certificate of perfect optimisation. | Pack evidence design |

## Scope deliberately deferred to engagement-time verification
Exact rich-result field requirements; country/market feature eligibility; business-profile account rules; framework metadata APIs; crawler IP verification; news/media extension details; provider quotas and paid-tool costs; current IndexNow participant lists; regulatory obligations. The pack routes an agent to authoritative sources rather than freezing these fast-changing details into fabricated universal rules.

## Licence and independence
The pack’s original materials use CC0-1.0. Referenced sources are not relicensed. No proprietary keyword data or copied articles are included.

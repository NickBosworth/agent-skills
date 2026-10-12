# Language alternatives

A language alternative identifies another version of the same page for a language,
script or region. The workbench combines declarations in the HTML head and response
`Link` headers. It records whether each HTML address was complete and whether
its tag appeared in the head. Invalid or missing addresses remain evidence rather than disappearing.
HTML and header declarations can describe cross-domain alternatives, but an audit
fetches only destinations the operator has approved. It never expands access to
follow a language cluster.

`hreflang-return` reviews observed return links. `hreflang-cluster` separately reviews
self links, conflicting labels, complete addresses, placement and the observed
response, indexing and canonical settings of each destination. A canonical URL is
the page's declared preferred address; a different preferred address needs review
alongside its language strategy. Known issues produce review warnings. Uncollected,
blocked, incomplete or malformed evidence cannot establish a successful cluster.
HTTP-header-only declarations can be checked on non-HTML documents such as PDFs.

The label check covers the documented two-letter language syntax, optional script
and two-letter region, `x-default`, and explicitly unsupported reserved regions.
It does not validate every official ISO assignment. A syntactically well-formed
invented code must still be reviewed against the provider's supported codes. No
result certifies translation quality, language detection, geography-based routing,
sitemap alternatives or Google's actual interpretation. Sitemap declaration and
location/profile acceptance remain in the execution plan.

HTML snapshots from before ruleset 0.1.8 lack the original address/placement details.
If they contain language alternatives, collect those pages again for these checks.
Reanalysis preserves older evidence and findings; it cannot invent missing details.
Targeted relationship plans include response-header alternatives and their observed
inbound peers and destination chains. Out-of-scope destinations remain unavailable
and prevent complete fix verification. Saved budgets and origins remain unchanged.

The implementation follows [Google's localized-page guidance](https://developers.google.com/search/docs/specialty/international/localized-versions),
reviewed on 2026-10-12. It does not require alternatives on a single-language site or
recommend changing deliberate fallback routing automatically.

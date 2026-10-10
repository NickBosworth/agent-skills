# JavaScript, rendering and mobile

## Inspect the delivery path, not the framework label
Identify how a route produces its initial HTML and how it changes after hydration, route navigation, authentication, consent, locale selection or data fetching. Do not insist on a framework rewrite merely because the site uses JavaScript. Google can render JavaScript; the relevant question is whether the actual page delivers correct accessible content and discovery signals reliably. [G11]

Capture a matrix for representative templates: initial request, rendered direct load, client-side navigation from a sibling, narrow viewport, slow/interrupted resources and relevant consent states. Record screenshots or DOM evidence where authorised. A screenshot alone does not establish crawlable link markup, status or canonical correctness.

## Test observable failure modes
- Every indexable route has a stable address and meaningful direct-load response. Refreshing a deep route must not fall back to an unrelated homepage or an app shell with no recoverable content.
- Titles, descriptions, canonicals, language alternatives and structured data correspond to the current route, not the page visited previously. Check hydration duplicates and global defaults overwriting route-specific metadata.
- Important text and destinations are available without unexplained user interaction. Inspect actual anchors with href values; click handlers alone are not a substitute for discoverable navigation.
- Essential scripts, styles, images and API data are available to permitted crawlers without exposing confidential APIs. Do not remove authentication simply for SEO.
- Errors and not-found routes return the intended HTTP response rather than a universal 200. Do not assume every non-200 response will be rendered.

Set canonical signals consistently; avoid changing an existing initial canonical to a conflicting rendered value. Do not ship an initial noindex and rely on JavaScript to remove it before indexing. [G11]

## Choose a rendering improvement proportionately
Possible remedies include fixing route metadata, pre-rendering a small family, moving essential data into initial responses, improving caching, removing a hydration bug or using the framework’s established server-rendering facilities. Assess reliability, latency, complexity and maintenance. SSR is an option, not a universal ranking requirement. Search-engine-only content changes risk misleading users and require careful policy review. [G02]

## Mobile equivalence
Compare primary content, metadata, index directives, structured data and link discovery across mobile and desktop delivery. Useful responsive rearrangement is fine; unintentionally omitting substantive mobile content is not. Lazy loading should not require an interaction the crawler cannot reliably perform. Test viewport behaviour, overflow, tap interactions and intrusive overlays as user-experience concerns as well as discovery risks. [G26, G27]

## Framework adapters are project-specific
Before coding, inspect the repository’s actual framework version and consult its current official metadata/routing documentation. Do not paste version-specific examples from memory. Add tests at the layer that owns the behaviour: route response, metadata factory, CMS transform, browser navigation or build-time export. Keep browser expectations realistic and do not use an absent rendering tool as evidence of failure.

Sources: G02, G11, G16, G23, G26, G27.

Source IDs resolve in the [source register](../research/SOURCES.md).

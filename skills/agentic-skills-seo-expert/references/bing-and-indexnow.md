# Bing-specific checks and IndexNow

## Bing is a first-class audit target
Check real Bing discovery/index evidence where access exists instead of assuming a Google pass transfers. Use Bing Webmaster Tools for the available site diagnostics, URL inspection, search performance and sitemap information. Record which tool and account actually provided the result. An accessible Google page does not prove inclusion in Bing. [B06]

Re-open Bing’s current Webmaster Guidelines for policy-sensitive recommendations. During this pack’s research, the guidelines URL returned only a JavaScript shell; the pack does not pretend it reviewed the missing text. Accessible official Bing articles are recorded separately in the source register. [B09]

## Crawl/index/content consistency
Inspect Bing-relevant robots/meta/header scoping, actual response delivery, sitemap coherence, duplicate routes and useful visible content. Keep engine-specific directive semantics separate. Address factual staleness and inconsistent copies through the content source of truth rather than publishing a second engine-targeted version. [B05, B07]

## Snippet controls
Bing announced support for `data-nosnippet` in October 2025 for search snippets and AI-answer use. It does not make a page private. Check the current guide before changing excerpt policy. For portability, inspect each engine’s supported elements and semantics; do not generalise one engine’s implementation to every crawler. [B04]

## IndexNow: notification, not guaranteed indexing
Use IndexNow only for owned, authorised URLs that were added, materially updated or deleted, in line with the current protocol. Confirm participating engines at execution; do not advertise it as a universal Google indexing service. Notification, acceptance, crawling and indexing are different stages. [N01, N02]

Before integration, inspect whether the platform/CDN/plugin already sends notifications. Avoid duplicate integrations and wasteful repeated submissions of unchanged URLs. Establish URL ownership/key handling, authorised host scope, payload constraints, error handling, backoff and operational logging using current official documentation. Store credentials through the project’s approved mechanism. [N01]

The offline utilities do not create keys, call endpoints or submit URLs. Any implementation/submission is a separate authorised host action. A successful HTTP response is evidence of request acceptance under its documented semantics, not proof of indexing.

## Google Indexing API is separate
Do not use Google’s Indexing API as a generic URL indexing shortcut. Its eligible use is limited to specified job/broadcast-video content under current documentation. Ordinary articles, products and arbitrary landing pages are not made eligible by adding misleading schema. [G39]

## Verify
Capture notification logs without secrets, verify actual changed content and intended directives, inspect supported engine diagnostics where available, and monitor subsequent discovery. Retain trustworthy sitemaps and ordinary links; notification does not replace a coherent website. [B05, N02]

Sources: B04–B07, B09, N01, N02, G39.

Source IDs resolve in the [source register](../research/SOURCES.md).

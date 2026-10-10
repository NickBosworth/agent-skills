# Images, video, publishing, paywalls and UGC

## Images
Check useful images are accessible in the rendered page, relevant to nearby content, properly sized and not needlessly expensive. Give informative images appropriate concise alternative text; decorative images can correctly use empty alt text. Missing alt and empty alt are different observations, and the actual image’s purpose determines the right action. Do not stuff keywords into every image description. [G28, S02]

Inspect image URLs, response behaviour, lazy loading, responsive variants and image sitemap/metadata where useful. Confirm licensing and rights before creating or reusing media. Preferred-image metadata can be considered under current engine guidance, but it does not guarantee the chosen thumbnail. [G28]

## Video
Assess whether the page actually serves a video-focused task, whether the video can be discovered/played, and whether its metadata and thumbnail describe the real content. Differentiate a primary watch page from a page with an incidental embed. Review current video eligibility, thumbnail, timestamp and structured-data requirements before implementation. Provide useful accessible supporting material such as captions/transcripts when appropriate; do not invent transcript text. [G29]

## Publishers and freshness
Use clear editorial ownership, real authorship, corrections and justified updates. Separate news publication time from genuine modification time. Preserve useful archives. Do not refresh dates or multiply near-identical breaking-news pages merely to appear fresh. Discover is a different surface from query-led search, and eligibility does not promise stable traffic. [G03, G37]

News-specific sitemap, publication and feature rules must be checked in the current official documentation for that format. Do not assume every article qualifies as news, or that a general sitemap lint certifies news eligibility.

## Paywalls and subscriptions
Respect access controls and the business model. Inspect what an authorised visitor, an unauthenticated visitor and the relevant crawler can legitimately receive. Follow current guidance for marking paywalled content and representing the actual experience; do not implement deceptive engine-only content or publish protected text merely to obtain traffic. [G33]

## UGC and discussion
Distinguish genuine user discussion/Q&A from editorial FAQs. Check spam/moderation controls, exposed personal information, empty profiles, scraped posts and unbounded archive/search routes. Legitimate contributors and answers should not be fabricated. Apply the currently supported discussion/Q&A markup only when the page model qualifies. [G02, G30]

Google’s updates register added a UGC Fresh Data Program page in October 2026. Do not assume general eligibility or automate application based on a changelog mention; inspect the current programme page and actual business need first. This pack does not implement programme integration. [G05]

## Verification
Check network responses, DOM discovery, accessible presentation and truthful metadata separately. Ensure optimising media has not removed meaningful content, broken rights restrictions or increased layout shifts. Record untested formats; the bundled tools do not analyse image meaning, video playback or protected-content eligibility.

Sources: G02, G03, G05, G28–G30, G33, G37, S02.

Source IDs resolve in the [source register](../research/SOURCES.md).

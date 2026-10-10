# Structured data without fabricated eligibility

## Three different questions
1. Is the markup syntactically valid and meaningful in its vocabulary?
2. Does the real visible page meet the current engine’s eligibility and content policies for that feature?
3. Does the engine actually display an enhancement for this page?

A JSON parser answers none of the policy/display questions. A validator success is not a promise of display. Choose markup for the real page, not whichever type produces an appealing preview. Confirm supported features in the current engine documentation. [G13, G30]

## Workflow
Identify the actual content type, commercial status, language and region. Open its current official feature guide. Record required/recommended properties, eligibility, display limitations and the evidence for each populated value. Implement using the project’s existing structured-data layer where possible. Prefer a maintainable source of truth shared with visible content and product feeds.

Validate JSON syntax, vocabulary, current engine feature requirements and visible-content agreement separately. Inspect both initial and rendered output for duplicates, stale data and conflicting entity IDs. Test representative variants and missing-field states. Escape serialised data safely; never concatenate untrusted strings into a script block.

## Truthfulness rules
Do not invent prices, availability, reviews, authors, ratings, awards, certifications or business locations. Do not mark up hidden information solely for the engine. An author, product, business and website are different entities; consistent IDs should reflect actual identity rather than make every page a different organisation. [G13, G31, G34, G35]

Reviews need genuine provenance and the current type-specific eligibility rules. A business’s own selected testimonials do not automatically qualify it for review stars. Fake or undisclosed incentivised reviews require special caution under current guidance. [G32]

## FAQ feature retirement
Google stopped displaying **FAQ rich results from 7 May 2026** and removed the feature documentation on **15 June 2026**. Useful FAQ content remains useful; adding `FAQPage` is not a current Google rich-result tactic. Vocabulary existence is separate from search-feature support. Do not relabel an editorial FAQ as a user-answerable `QAPage` to evade this distinction. [G05]

Existing markup may serve non-Google consumers. Do not mass-delete it without checking dependencies and the site’s goals. Reverify current support when making a new recommendation.

## Route by page type
For commerce, check product/offer/variant and merchant information against the live catalogue and current feed/feature requirements. For local pages, use real business facts and applicable type. For editorial, video, recipes, events, jobs, discussion or Q&A, open the specific current guide from the feature gallery rather than applying a generic template. Availability and accepted properties can change. For paywalls, ensure the real delivery model and applicable marking are consistent. [G30–G35]

## Verification record
Store a sanitised sample of rendered markup, the page URL/environment, expected type, populated-source mapping, validation tool/version/date, warnings, policy review and actual test outcome. Keep subsequent engine enhancement reports separate. The bundled snapshot script only detects JSON syntax and reports encountered types; it does not certify rich-result eligibility.

Sources: G05, G13, G30–G35.

Source IDs resolve in the [source register](../research/SOURCES.md).

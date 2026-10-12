# Structured-data vocabulary and references

Structured data is machine-readable information declared by a page. This review
recognises Schema.org names in collected JSON-LD, a JSON format for linked data.
It does not run scripts or retrieve remote contexts. Microdata and RDFa presence
remain informational; their property semantics are not fully interpreted here.

The offline vocabulary is pinned to Schema.org 30.1, released on 2026-09-16. Its
939 type names, 1,538 property names and 546 enumeration members retain the published
inheritance, domain and range relationships. The original source hash and separate
CC-BY-SA-3.0 attribution are recorded in `data/schema-vocabulary.json` and NOTICE.md.
No vendor examples, descriptions, personal contributor records or website captures
are included in the derived index.

Unknown type or property names produce a review warning. They can be spelling
mistakes or deliberate extensions. Schema.org permits flexible combinations;
recognition does not enforce a closed-world property/type grammar. A successful
recognition check does not establish correct values, matching visible content,
Google/Bing feature eligibility, actual display or a ranking benefit. Those are
separate questions and checks.

The bounded graph reader inspects at most 5,000 values. It understands the standard
HTTP/HTTPS Schema.org context, explicit Schema.org type IRIs and simple graph nodes.
Custom contexts, aliases, collection/value syntax and other unsupported mappings
remain untested. A truncated graph or missing requested browser evidence cannot
pass. An explicit type IRI without understood property mappings also remains
untested for vocabulary review.

Simple relative `@id` references resolve against the collected document base, with
the observed page address used for older captures that have no recorded base. This
includes a valid HTML `base` element. References resolve only to declarations in
the collected graph; no external entity is fetched. An external or absent definition
is not automatically an invalid reference. Multiple definitions can be legitimate
JSON-LD, but this reader does not merge them; selected Product detail checks remain
unknown when they cannot choose one understood definition.

From a source checkout, maintainers can reproduce the index offline after obtaining the exact public release
outside the source checkout:

```sh
python tools/build_schema_vocabulary.py \
  --source /path/to/schemaorg-current-https.jsonld \
  --out /path/to/new-schema-vocabulary.json
```

The helper accepts only the reviewed source hash, refuses an existing output and
never fetches a page or executes a context. Compare the new file with the committed
index. A future release requires a new source/hash/date review, maintained attribution,
defect/counterexample/unknown checks and a ruleset update; do not silently replace
the vocabulary from a changing latest-release URL.

The review follows the [Schema.org data model](https://schema.org/docs/datamodel.html),
[30.1 release](https://schema.org/version/30.1/),
[machine-readable definitions](https://schema.org/docs/developers.html) and
[JSON-LD node identifiers](https://www.w3.org/TR/json-ld11/#node-identifiers).
See the production-readiness plan for remaining visible-content and engine-feature
work and independent domain acceptance.

## Selected fields and rendered text

Contracts can opt into `googleFeatures` values `product-snippet`, `article` and
`local-business`. The new selected-fields check distinguishes required Product/Local
Business fields from Article recommendations. Missing required fields fail an approved
feature contract; missing Article recommendations need review and never establish
Top stories ineligibility. No Article markup is itself required by this check.
Unresolved references or unsupported property mappings remain untested. Product
checks include free and nested offer prices, counted aggregate ratings and attributed
review ratings. The review does not prove a review is authentic, a price is current
or a business physically occupies an address.

A browser snapshot compares selected Product/Local Business names and Article
headlines with rendered page text. It omits common hidden/display/visibility/opacity
states, hidden ancestors and zero-area text. It does not inspect clipped or occluded
text exhaustively, shadow DOM, iframe text or unvisited interaction states. Wording
differences produce review warnings, not an accusation of false markup. Missing,
truncated or failed browser collection stays untested. Older captures without this
snapshot must be collected again for this check.

The snapshot is bounded to 20,000 text nodes, 100 ancestor levels and 500,000
characters. Reaching a bound records truncation and prevents a successful text
review. These controls protect browser work and stored evidence; they do not imply
all of a long document was checked. Private page evidence includes the snapshot;
shareable reports omit it. Human review remains necessary for factual accuracy,
image/review/price alignment, provider policies and actual appearance.

The selected checks follow Google’s [Product snippet fields](https://developers.google.com/search/docs/appearance/structured-data/product-snippet),
[Article recommendations](https://developers.google.com/search/docs/appearance/structured-data/article),
[Local Business fields](https://developers.google.com/search/docs/appearance/structured-data/local-business)
and [structured-data policies](https://developers.google.com/search/docs/appearance/structured-data/sd-policies),
reviewed on 2026-10-12. Automated field/text checks are not a rich-result or visibility
certificate. Broader profile and independent accuracy acceptance remain open.

Owner-approved `criticalText` phrases also use the browser snapshot when rendering
is requested. Hidden source text cannot satisfy that browser contract. Missing or
truncated snapshots remain untested. With rendering disabled, the check describes
extracted source text only; a missing phrase beyond its recorded text bound remains
unknown. Finding a required phrase does not establish overall content completeness.

## Variant and footer presentation

Rendered page text now includes ordinary headers, footers and side content for
structured name/headline review. Required main-content phrases still use the separate
main-text snapshot, which excludes navigation and site furniture. A business name
visible in a legitimate footer is not treated as absent merely because it is outside
`main`. Both snapshots share one bounded text-node walk and retain separate truncation
flags; neither proves factual accuracy or exhaustive visibility.

A `ProductGroup` container is not checked as an individual offer. Its actual Product
variants are checked separately. Names belonging to variants with unvisited selection
states are deferred rather than treated as false markup; no passing whole-variant
visibility conclusion is returned. This follows Google’s
[variant guidance](https://developers.google.com/search/docs/appearance/structured-data/product-variants).
Full variant IDs/relationships, cross-page selections, facets and wider specialist
profile acceptance remain in the production-readiness plan.

The ecommerce profile also reviews declared ProductGroup identifiers and selected
variation dimensions. It accepts both nested variants and local `isVariantOf` links,
reports repeated selected identifiers or conflicting group IDs, and defers thin
off-page references. No group is required merely because the ecommerce profile is
selected. Parent references are indexed once per graph rather than rescanning the
whole graph for each group. A synthetic 800-group regression checks this resource
path. Site-wide uniqueness, current selections and complete shopping eligibility
remain outside this page-level result.

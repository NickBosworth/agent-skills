# Import keyword, search-result and backlink research

Use the **Keywords, search results and backlinks** import option in Export & imports,
or run `seo-workbench import PROJECT external-research FILE`. The file is a JSON
object matching `ExternalResearchImport`, exported by the programmatic API. Imports
are private project data. They are available through the `external-research` results
view, including the read-only MCP results tool. Importing does not fetch a result or
backlink source, change network permissions, rerun an audit or change a rule outcome.

Every file identifies one dataset, its supplier, the project origin, collection time,
market, language, device, collection method and limitations. The supplied origin and
any assigned destination must belong to the project. Competitor results and incoming
link sources may belong to other websites; they are recorded references only.
Credential-bearing and non-HTTP URLs are refused. Do not include credentials or private
account identifiers. Keep real supplier files outside the source checkout.

The three datasets preserve different evidence:

- `keywords` records the estimate period, volume unit and individual keywords.
  `estimatedVolume: null` means the supplier did not provide an estimate. Zero means
  the supplier explicitly reported zero. `targetPage: null` leaves the destination
  undecided; the import does not establish an unmet intent or approve a new page.
- `serp` records the search engine, observation time, keyword, result type, observed
  URL and optional position. A missing URL requires a null position and means the
  result was not observed in that sample. It does not prove absence from all results.
  A position without a known position definition or adequate sampling remains hard
  to interpret; record those limitations in the file.
- `backlinks` records the source and destination, observation time, supplied anchor
  text, declared `nofollow`, `sponsored` or `ugc` relationships and whether the link
  was observed in the sample. It does not establish all incoming links, current link
  availability, link quality, an endorsement or the cause of a ranking change.

Each record has a unique `sampleId` within its file and an `evidenceNotes` explanation.
Files admit at most 10,000 records and 5 MB; invalid files create no import. Supplier
estimates and separate files are not merged or averaged automatically. No authority
score, competition score, universal ranking or global backlink index is calculated.
Recorded timestamps are supplier declarations, not independently verified freshness.

See `examples/keyword-import.json` for a wholly fictional keyword file. Search-result
rows additionally use `keyword`, `targetPage`, `observedAt`, `observedUrl`, `position`
and `resultType`. Backlink rows use `targetPage`, `sourcePage`, `observedAt`,
`anchorText`, `relationship` and `status`. The exported schema is the exact contract;
unknown fields are refused rather than silently discarded.

Private JSON exports retain every imported record. HTML and Markdown describe each
file's provenance and limitations, and retain the records in technical details.
Shareable exports omit them entirely. CSV contains individual crawl check results,
so it does not contain these research records. Review private reports before sharing;
they can contain commercially sensitive keywords, URLs and supplier notes.

Local acceptance covers valid and missing estimates, absent sampled results,
provenance, duplicates, invalid numbers and URL schemes, project scoping, CLI imports,
browser uploads and shareable redaction. No live supplier adapter, supplier accuracy
review, automatic keyword clustering or independent SEO assessment is claimed.

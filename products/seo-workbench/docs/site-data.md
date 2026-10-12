# Import Bing, analytics, log summaries and crawl data

Use **Bing, analytics, logs or another crawl** in Export & imports, or run:

```sh
node dist/cli.js import PROJECT site-data /path/to/normalised.json
node dist/cli.js site-data AUDIT
node dist/cli.js site-data AUDIT IMPORT --offset 100
```

The supported format is a UTF-8 JSON object matching `SiteDataImport`, exported by
the programmatic API. This is a Workbench interchange format, not a claim that a
vendor's CSV, API response, database or raw server log can be uploaded unchanged.
Normalise a supported export locally and describe how it was collected. No live
Bing/analytics service, account, OAuth flow, log collector or vendor SDK is installed.

Each file records its provider, version when known, origin, collection time,
reporting window, time zone when known, filters, sampling, completeness and limits.
Every row has a unique `sampleId` and source notes. Preserve original source
limitations; do not mark a bounded or sampled export as complete site traffic.
Unknown metrics use `null`. Zero means the source explicitly reported zero.
Unknown fields, invalid dates/numbers, duplicate identifiers and out-of-origin page
records are refused. An import does not expand the project's approved origins.
Files admit up to 10,000 records and 5 MB; configured memory allowances still apply.

## Supported records

- **Bing search** preserves query/page records, clicks, impressions and any supplied
  position, country/device dimensions, search type and aggregation. A query-level
  record can have `page: null` when no destination was supplied. Do not assign that
  query to an invented page. An absent dimension does not mean all countries or
  devices. Position needs a source definition in its notes; it is not averaged or
  treated as a universal ranking. See [the fictional Bing file](../examples/bing-search-import.json).
- **Analytics** preserves page/channel/country/device records with sessions, users,
  key-event counts and revenue when available. Define the key events being counted.
  Revenue requires a currency; both are unknown when neither was reported. Currency
  codes are syntax-checked, not independently certified. Different attribution,
  consent, filtering and metric definitions are not interchangeable. Counts are
  not added across files or dimensions. See [the fictional analytics file](../examples/analytics-import.json).
- **Access logs** preserve aggregates by page, request method, response status and
  declared agent class. Raw logs, client addresses, cookies, headers and user-agent
  strings are unsupported. Aggregate and remove personal identifiers before
  import. Request counts are not visitor counts. A claimed search bot is not a
  verified bot; a supplied verified classification needs its verification method.
  Workbench does not perform that verification or DNS lookups. See
  [the fictional aggregate log file](../examples/access-log-import.json).
- **Third-party crawls** preserve supplied page/status/title/canonical facts with
  observation time when known and the supplier's rendering mode. External declared
  canonicals are references only and are never fetched. This format has no original
  response bytes/headers, DOM/runtime evidence, robots rules, redirect hops or
  Workbench request profile. That missing evidence stays explicit. Imported facts
  cannot pass a Workbench rule, replace a capture, complete a crawl or establish
  current indexing. See [the fictional crawl file](../examples/crawl-import.json).

## Read and share safely

The UI shows each file's scope and limits. **Read supplied records** opens a bounded
page of its original records; next/previous controls retain their identities. Load
more imported files when the file list continues. New uploads appear without a
reload. Technical field names remain unchanged in the supplied records.

The read-only MCP `audit_results` view `site-data` lists file metadata. Provide an
`importId` from that list to read the selected file's rows, with `offset` and `limit`.
Selected files must belong to the same project as the audit. Use a smaller limit if
records exceed the MCP response allowance. Listing and reading never contacts the
supplier, applies model advice or performs new page checks.

Private JSON reports retain complete imports. HTML and Markdown explain provenance
and limitations and include the original records in technical details. HTML escapes
supplied text; Markdown keeps it inside indented code blocks. Shareable reports omit
all site-data records and their source details. CSV contains crawl check results,
not these datasets. Real exports and reports stay outside this repository. Review
private output before sharing; source notes and page/query strings can be sensitive.

## Source basis and remaining limits

Reviewed on 2026-10-12: [Microsoft's query traffic interface](https://learn.microsoft.com/en-us/dotnet/api/microsoft.bing.webmaster.api.interfaces.iwebmasterapi.getquerytrafficstats?view=bing-webmaster-dotnet),
[Google Analytics metric definitions](https://developers.google.com/analytics/devguides/reporting/data/v1/api-schema),
[Google crawler verification](https://developers.google.com/crawling/docs/crawlers-fetchers/verify-google-requests),
and [Screaming Frog's export fields](https://www.screamingfrog.co.uk/seo-spider/user-guide/tabs/).
These sources explain why fields and provenance differ. The format above is our own
normalised schema, not a live API binding or a copied vendor format. Independent
supplier accuracy, live integrations, direct vendor-format converters and combined
outcome analysis remain unverified or unimplemented as stated in the release plan.

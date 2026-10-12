# Compare saved search periods

Open **Export & imports**, then choose an earlier and later Search Console period.
Use **Load more saved periods** when the list continues beyond the first batch.
The comparison reads saved imports only. It does not contact Google, change an
import, fetch a page or request model advice.

The CLI provides the same review:

```sh
node dist/cli.js search-periods AUDIT
node dist/cli.js compare-search AUDIT BASELINE_IMPORT CURRENT_IMPORT
```

Use the identifiers returned by `search-periods`. Both commands accept `--offset N`
for later records; comparison output includes its total page-group count. The MCP
`audit_results` tool exposes `search-periods` and `search-comparison`. For the latter,
provide `baselineImportId` and `currentImportId` from the same audit project. Use
`offset` and `limit` to read subsequent groups. This is a read-only operation.

## What must match

Choose distinct periods with the same number of inclusive calendar days, with the
baseline ending before the later period begins. Collection method, search type,
aggregation and recorded filters must match. Date comparisons use calendar days,
without a local daylight-saving adjustment. Equal length does not establish equal
seasonal conditions or the same mix of weekdays.

New Search Console imports can include a `filters` list. Each entry identifies a
`dimension`, `operator` and `expression`; entries are combined with AND. The supported
names are defined by `SearchImport` in `src/imports.ts`. An empty list explicitly
records an unfiltered import. The current Google adapter records that empty list
because its request applies no dimension filters. An omitted list means unknown,
including for older saved imports. Those imports remain readable but are refused
for comparison; their history is never rewritten to guess missing filters. An owner
must supply accurate metadata when importing a new manual file. OR filter groups
are unsupported rather than being interpreted as AND.

## How to read the result

Rows are matched by exact page address, country, device and query. Each page/country/
device group includes only queries present in both selected imports. Query records
found on one side are counted separately and never converted to zero traffic.
Groups without matched queries have unknown metrics. An empty comparison is not a
traffic decline. Repeated records and impossible click counts prevent comparison.

Clicks and impressions are summed for the matched sample. Click-through rate is
recomputed as clicks divided by impressions; its change is expressed in percentage
points. A percentage change from zero and a click-through rate with zero impressions
remain unknown. Average search position is not averaged or used to explain a change.
Groups with fewer matched clicks are presented for review, not labelled as proven
content decay or failed fixes. Inspect the page, queries and period conditions before
choosing a content action.

Google's API can return only top rows, and anonymised queries are missing from query
exports. Even a complete import does not establish full site traffic. Incomplete
imports add an explicit warning. Seasonality, demand, search-result changes,
reporting changes and concurrent site changes can affect outcomes; this comparison
cannot attribute them to a technical fix. Original period limitations remain in the
result. Queries and page addresses are private runtime data: keep comparison output
outside the repository and review it before sharing.

Sources reviewed on 2026-10-12: [Search Analytics query](https://developers.google.com/webmaster-tools/v1/searchanalytics/query)
and [Google's explanation of filtering and data limits](https://developers.google.com/search/blog/2022/10/performance-data-deep-dive).
These are provider limitations, not independent live acceptance of this product.

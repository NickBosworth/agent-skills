/** Compare explicitly selected first-party samples without treating omitted rows as zero. */
import { SearchImport } from "./imports.ts";

type Row = ReturnType<typeof SearchImport.parse>["rows"][number];
const day = (date: string) => Date.parse(date + "T00:00:00Z") / 86400000;
const rowKey = (row: Row) =>
  JSON.stringify([row.page, row.country, row.device, row.query]);
const groupKey = (row: Row) =>
  JSON.stringify([row.page, row.country, row.device]);
function totals(rows: Row[]) {
  const clicks = rows.reduce((n, row) => n + row.clicks, 0),
    impressions = rows.reduce((n, row) => n + row.impressions, 0);
  if (
    ![clicks, impressions].every(
      (n) => Number.isFinite(n) && n <= Number.MAX_SAFE_INTEGER,
    )
  )
    throw new Error("search-period-metrics-invalid");
  return {
    clicks,
    impressions,
    ctr: impressions ? clicks / impressions : null,
  };
}
export function compareSearchPeriods(
  baselineValue: unknown,
  currentValue: unknown,
) {
  const baseline = SearchImport.parse(baselineValue),
    current = SearchImport.parse(currentValue);
  const issues: string[] = [];
  if (baseline.endDate >= current.startDate)
    issues.push(
      "Choose an earlier baseline and a later period that do not overlap.",
    );
  if (
    day(baseline.endDate) - day(baseline.startDate) !==
    day(current.endDate) - day(current.startDate)
  )
    issues.push("The two periods must contain the same number of days.");
  if (
    baseline.method !== current.method ||
    baseline.searchType !== current.searchType ||
    baseline.aggregation !== current.aggregation
  )
    issues.push("Collection method, search type and aggregation must match.");
  const filters = (data: typeof baseline) =>
    data.filters
      ?.map((filter) =>
        JSON.stringify([filter.dimension, filter.operator, filter.expression]),
      )
      .sort();
  if (!baseline.filters || !current.filters)
    issues.push(
      "Filter information is missing. Import periods with explicit filters; use an empty list when no filters were applied.",
    );
  else if (
    JSON.stringify(filters(baseline)) !== JSON.stringify(filters(current))
  )
    issues.push("The periods use different filters.");
  for (const period of [baseline, current]) {
    if (new Set(period.rows.map(rowKey)).size !== period.rows.length)
      issues.push("A period contains repeated query and page records.");
    if (period.rows.some((row) => row.clicks > row.impressions))
      issues.push(
        "A period reports more clicks than impressions for a record.",
      );
  }
  const provenance = (data: typeof baseline) => ({
    ...data,
    rows: undefined,
    rowCount: data.rows.length,
  });
  const limitations = [
    "These are imported query samples, not total site traffic. Missing or anonymised rows are unknown, even when the import is marked complete.",
    "Seasonality, search demand, search-result changes, reporting changes and site changes can affect the result. This comparison cannot establish why traffic changed or whether a fix caused it.",
    ...(!baseline.complete || !current.complete
      ? [
          "At least one period is incomplete. Results describe only the matched imported rows.",
        ]
      : []),
  ];
  const groups = new Map<string, { baseline: Row[]; current: Row[] }>();
  if (!issues.length)
    for (const [name, period] of [
      ["baseline", baseline],
      ["current", current],
    ] as const) {
      for (const row of period.rows) {
        const key = groupKey(row),
          group = groups.get(key) ?? { baseline: [], current: [] };
        group[name].push(row);
        groups.set(key, group);
      }
    }
  const pages = [...groups]
    .map(([key, group]) => {
      const before = new Map(group.baseline.map((row) => [row.query, row])),
        after = new Map(group.current.map((row) => [row.query, row]));
      const matched = [...before.keys()].filter((query) => after.has(query));
      const old = matched.length
          ? totals(matched.map((query) => before.get(query)!))
          : null,
        next = matched.length
          ? totals(matched.map((query) => after.get(query)!))
          : null;
      const percentage =
        old?.clicks && next
          ? ((next.clicks - old.clicks) / old.clicks) * 100
          : null;
      const change =
        old && next
          ? {
              clicks: next.clicks - old.clicks,
              impressions: next.impressions - old.impressions,
              ctrPercentagePoints:
                old.ctr !== null && next.ctr !== null
                  ? (next.ctr - old.ctr) * 100
                  : null,
              clicksPercent:
                percentage !== null && Number.isFinite(percentage)
                  ? percentage
                  : null,
            }
          : null;
      const [page, country, device] = JSON.parse(key) as string[];
      return {
        page,
        country,
        device,
        matchedQueries: matched.length,
        baselineOnlyQueries: before.size - matched.length,
        currentOnlyQueries: after.size - matched.length,
        baseline: old,
        current: next,
        change,
        review:
          change && change.clicks < 0
            ? "Review this page and its matched queries. Fewer observed clicks do not establish content decay or a ranking cause."
            : change
              ? "Review the observed change alongside the period conditions."
              : "No matching query records are available. Missing records are not zero traffic.",
      };
    })
    .sort(
      (a, b) =>
        (a.change?.clicks ?? Infinity) - (b.change?.clicks ?? Infinity) ||
        a.page.localeCompare(b.page) ||
        a.country.localeCompare(b.country) ||
        a.device.localeCompare(b.device),
    );
  return {
    status: issues.length
      ? "not-comparable"
      : pages.some((page) => page.matchedQueries)
        ? "sample-comparison"
        : "no-matched-data",
    baseline: provenance(baseline),
    current: provenance(current),
    issues,
    limitations,
    pages,
  };
}

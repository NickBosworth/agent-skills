#!/usr/bin/env python3
"""Analyse a normalised query+page CSV without inventing demand or ranking scores.

Input is NOT an arbitrary raw vendor export. Keep one nonoverlapping reporting
scope per dataset_id and use the documented schema; no rows are merged across IDs.
"""
from __future__ import annotations

import argparse
import csv
import io
import math
import sys
from collections import defaultdict
from datetime import date
from pathlib import Path
from typing import Any

from common import InputError, emit_json, http_url, read_bounded

REQUIRED = {"dataset_id", "period_start", "period_end", "timezone", "engine", "search_type",
            "country", "device", "query", "page", "clicks", "impressions"}
OPTIONAL = {"average_position"}
SCOPE_FIELDS = ("dataset_id", "period_start", "period_end", "timezone", "engine", "search_type", "country", "device")
MAX_ROWS = 100_000


def whole(value: str, field: str) -> int:
    if not value.isascii() or not value.isdigit():
        raise InputError(f"{field} must be a nonnegative whole number, not a formatted or estimated value.")
    result = int(value)
    if result > 10**15:
        raise InputError(f"{field} exceeds the supported numeric range.")
    return result


def load_rows(path: Path) -> list[dict[str, Any]]:
    try:
        text = read_bounded(path, 32 * 1024 * 1024).decode("utf-8-sig")
    except UnicodeError as exc:
        raise InputError("CSV must be UTF-8.") from exc
    reader = csv.DictReader(io.StringIO(text, newline=""))
    names = reader.fieldnames
    if not names or len(names) != len(set(names)) or not REQUIRED.issubset(names) or set(names) - REQUIRED - OPTIONAL:
        raise InputError("CSV headers must match the documented normalised query+page schema, with no duplicates or unknown dimensions.")
    rows, seen = [], set()
    dataset_fixed: dict[str, tuple[str, ...]] = {}
    windows: dict[tuple[str, str, str], set[tuple[date, date]]] = defaultdict(set)
    dimensions: dict[str, dict[str, set[str]]] = defaultdict(lambda: {"country": set(), "device": set()})
    for line, raw in enumerate(reader, start=2):
        if len(rows) >= MAX_ROWS:
            raise InputError(f"CSV exceeds {MAX_ROWS} rows.")
        if None in raw or any(value is None or len(value) > 4096 or "\x00" in value for value in raw.values()):
            raise InputError(f"Row {line}: ragged, oversized or NUL-bearing field.")
        row: dict[str, Any] = dict(raw)
        for name in REQUIRED - {"clicks", "impressions"}:
            if not row[name].strip():
                raise InputError(f"Row {line}: {name} is required. Omit hidden/aggregate-query rows rather than inventing labels.")
        if row["engine"] not in ("google", "bing"):
            raise InputError("engine must be google or bing; normalise provider names explicitly.")
        if row["search_type"] not in ("web", "image", "video", "news"):
            raise InputError("This analyser accepts query+page search reports, not Discover or impressions-only AI/citation reports.")
        try:
            start, end = date.fromisoformat(row["period_start"]), date.fromisoformat(row["period_end"])
        except ValueError as exc:
            raise InputError(f"Row {line}: invalid ISO date.") from exc
        if start > end:
            raise InputError(f"Row {line}: reversed reporting window.")
        http_url(row["page"])
        row["clicks"] = whole(row["clicks"].strip(), "clicks")
        row["impressions"] = whole(row["impressions"].strip(), "impressions")
        position = row.get("average_position", "").strip()
        if position:
            try:
                numeric_position = float(position)
            except ValueError as exc:
                raise InputError(f"Row {line}: average_position must be numeric or blank.") from exc
            if not math.isfinite(numeric_position) or not 0 <= numeric_position <= 10**9:
                raise InputError(f"Row {line}: average_position must be finite and nonnegative.")
            row["average_position"] = numeric_position
        else:
            row["average_position"] = None
        key = tuple(row[field] for field in SCOPE_FIELDS) + (row["query"], row["page"])
        if key in seen:
            raise InputError(f"Row {line}: duplicate query+page scope key; refusing possible double counting.")
        seen.add(key)
        dataset = row["dataset_id"]
        fixed = (row["timezone"], row["engine"], row["search_type"])
        if dataset in dataset_fixed and dataset_fixed[dataset] != fixed:
            raise InputError("A dataset_id must have one engine, search type and timezone. Use separate IDs.")
        dataset_fixed[dataset] = fixed
        for dimension in ("country", "device"):
            dimensions[dataset][dimension].add(row[dimension])
        windows[(dataset, row["country"], row["device"])].add((start, end))
        rows.append(row)
    if not rows:
        raise InputError("CSV contains no data rows.")
    for values in dimensions.values():
        for observed in values.values():
            if any(value.upper() == "ALL" for value in observed) and len(observed) > 1:
                raise InputError("Do not mix ALL aggregates with split country/device dimensions in a dataset_id.")
    for observed in windows.values():
        periods = sorted(observed)
        for earlier, later in zip(periods, periods[1:]):
            if later[0] <= earlier[1]:
                raise InputError("Overlapping reporting windows within a dataset scope; use disjoint windows or separate dataset IDs.")
    return rows


def aggregate(rows: list[dict[str, Any]]) -> dict[str, Any]:
    clicks, impressions = sum(r["clicks"] for r in rows), sum(r["impressions"] for r in rows)
    contributors = [r for r in rows if r["impressions"] > 0]
    position = None
    if contributors and all(r["average_position"] is not None for r in contributors):
        position = sum(r["average_position"] * r["impressions"] for r in contributors) / impressions
    return {"reported_clicks_sum": clicks, "reported_impressions_sum": impressions,
            "derived_ctr": clicks / impressions if impressions else None,
            "impression_weighted_reported_average_position": position}


def analyse(path: Path, limit: int = 20) -> dict[str, Any]:
    if not 1 <= limit <= 200:
        raise InputError("limit must be between 1 and 200.")
    rows = load_rows(path)
    groups: dict[tuple[str, ...], list[dict[str, Any]]] = defaultdict(list)
    for row in rows:
        groups[tuple(row[field] for field in SCOPE_FIELDS)].append(row)
    result = []
    for key, members in sorted(groups.items()):
        by_query: dict[str, list[dict[str, Any]]] = defaultdict(list)
        for row in members:
            by_query[row["query"]].append(row)
        queries = []
        for query, query_rows in by_query.items():
            queries.append({"query": query, **aggregate(query_rows), "observed_pages": sorted(r["page"] for r in query_rows),
                            "multiple_url_review_lead": len(query_rows) > 1,
                            "interpretation": "Observed exposure for review; intent, result context and business value still require investigation."})
        queries.sort(key=lambda q: (-q["reported_impressions_sum"], q["query"]))
        result.append({"scope": dict(zip(SCOPE_FIELDS, key)), "row_count": len(members),
                       "query_count": len(by_query), "row_sums_not_property_totals": aggregate(members),
                       "queries_by_observed_impressions": queries[:limit],
                       "queries_omitted_from_display": max(0, len(queries) - limit),
                       "multiple_url_query_count_review_only": sum(q["multiple_url_review_lead"] for q in queries),
                       "warnings": (["Some rows report clicks exceeding impressions; verify provider definition and export integrity."]
                                    if any(r["clicks"] > r["impressions"] for r in members) else [])})
    return {"schema_version": "1.0", "tool": "agentic-skills-seo-expert normalised search export analysis", "input_row_count": len(rows),
            "dataset_ids": sorted({r["dataset_id"] for r in rows}), "groups": result,
            "network_requests_performed": 0,
            "limitations": ["These are observed query+page rows, not total market demand or guaranteed complete property data.",
                            "No total is computed across dataset IDs, date windows, engines, markets or devices.",
                            "Weighted reported position is descriptive for supplied rows, not a reconstructed property average or a universal rank.",
                            "A multiple-URL query is not proof of harmful cannibalisation; CTR has no universal good threshold.",
                            "No keyword volume, difficulty, forecast, causal uplift or ranking score is invented.",
                            "Queries can contain private or malicious-looking text: output is JSON data, never evaluated or sent elsewhere."]}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("csv", type=Path)
    parser.add_argument("--limit", type=int, default=20)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    try:
        emit_json(analyse(args.csv, args.limit), args.output)
    except (InputError, OSError, ValueError, csv.Error) as exc:
        print(f"Input/report error: {exc}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

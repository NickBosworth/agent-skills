#!/usr/bin/env python3
"""Validate local UTF-8 sitemap XML without following any referenced URL or file."""
from __future__ import annotations

import argparse
import re
import sys
import xml.etree.ElementTree as ET
from datetime import date, datetime
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit

from common import InputError, emit_json, http_url, read_bounded

NS = "http://www.sitemaps.org/schemas/sitemap/0.9"
MAX_BYTES = 52_428_800
MAX_ENTRIES = 50_000


def parse_lastmod(value: str) -> date:
    if re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
        return date.fromisoformat(value)
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})", value):
        raise ValueError("Expected a W3C date or timezone-bearing date-time.")
    return datetime.fromisoformat(value.replace("Z", "+00:00")).date()


def lint_file(path: Path, site: str | None = None, as_of: date | None = None) -> dict[str, Any]:
    raw = read_bounded(path, MAX_BYTES)
    if raw.startswith(b"\x1f\x8b"):
        raise InputError("Compressed input is not supported; supply a safely decompressed local XML file.")
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeError as exc:
        raise InputError("Supply a UTF-8 sitemap XML file.") from exc
    # Reject declarations before XML parsing, including escaped whitespace variants.
    # No entity expansion or external reference resolution is required for a sitemap.
    if re.search(r"<!\s*(?:DOCTYPE|ENTITY)\b", text, re.I):
        raise InputError("DTD and ENTITY declarations are not permitted.")
    try:
        root = ET.fromstring(text)
    except ET.ParseError as exc:
        raise InputError(f"Invalid sitemap XML: {exc}") from exc
    kind_by_tag = {f"{{{NS}}}urlset": ("urlset", "url"), f"{{{NS}}}sitemapindex": ("sitemapindex", "sitemap")}
    if root.tag not in kind_by_tag:
        raise InputError("Root must be urlset or sitemapindex in the standard sitemap namespace.")
    kind, entry_name = kind_by_tag[root.tag]
    entries = root.findall(f"{{{NS}}}{entry_name}")
    issues: list[dict[str, Any]] = []
    if len(root) != len(entries):
        issues.append({"code": "unexpected_root_children", "status": "warning", "detail": "Unexpected root-level elements were not interpreted."})
    if len(entries) > MAX_ENTRIES:
        issues.append({"code": "entry_limit_exceeded", "status": "fail", "detail": f"Found {len(entries)} entries; protocol limit is {MAX_ENTRIES}."})
    if not entries:
        issues.append({"code": "empty_sitemap", "status": "warning", "detail": "No entries were supplied; confirm this is intentional."})
    expected_host = urlsplit(http_url(site)).netloc.lower() if site else None
    seen, hosts, valid_urls = set(), set(), 0
    for index, entry in enumerate(entries, start=1):
        def issue(code: str, status: str, detail: str) -> None:
            issues.append({"entry": index, "code": code, "status": status, "detail": detail})
        locs = entry.findall(f"{{{NS}}}loc")
        if len(locs) != 1 or not (locs[0].text or "").strip():
            issue("loc_count_or_empty", "fail", "Each entry needs exactly one nonempty loc.")
            continue
        loc = (locs[0].text or "").strip()
        try:
            http_url(loc)
        except InputError as exc:
            issue("invalid_loc", "fail", str(exc))
            continue
        valid_urls += 1
        if len(loc) >= 2048:
            issue("loc_too_long", "fail", "Sitemap loc must be fewer than 2048 characters.")
        host = urlsplit(loc).netloc.lower()
        hosts.add(host)
        if expected_host and host != expected_host:
            issue("host_differs_from_site", "warning", "Entry host differs from --site; verify explicit cross-site submission/ownership authority.")
        if loc in seen:
            issue("duplicate_loc", "warning", "An identical loc appears more than once; URL spelling was not normalised.")
        seen.add(loc)
        lastmods = entry.findall(f"{{{NS}}}lastmod")
        if len(lastmods) > 1:
            issue("multiple_lastmod", "fail", "Entry has multiple lastmod elements.")
        for node in lastmods:
            value = (node.text or "").strip()
            try:
                modified = parse_lastmod(value)
            except ValueError:
                issue("invalid_lastmod", "fail", "lastmod is not a supported W3C date/date-time.")
                continue
            if as_of is not None and modified > as_of:
                issue("future_lastmod", "warning", "lastmod is later than --as-of; investigate source data and date scope.")
    return {"file": str(path), "kind": kind, "uncompressed_bytes": len(raw), "entry_count": len(entries),
            "valid_url_shape_count": valid_urls, "distinct_locs": len(seen), "hosts": sorted(hosts),
            "as_of": as_of.isoformat() if as_of else None, "issues": issues,
            "live_urls_fetched": 0, "referenced_sitemaps_followed": 0,
            "not_tested": ["HTTP delivery, redirects and permissions", "actual lastmod truth",
                           "canonical/indexing state", "image/video/news extension semantics",
                           "cross-site ownership and sitemap URL-location scope"]}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("files", nargs="+", type=Path)
    parser.add_argument("--site", help="Expected public origin; a differing host is a review item, not an assumed policy breach.")
    parser.add_argument("--as-of", type=date.fromisoformat, help="Explicit date for future-lastmod checks (YYYY-MM-DD).")
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    try:
        if len(args.files) > 20:
            raise InputError("At most 20 explicitly supplied sitemap files per run.")
        results = [lint_file(file, args.site, args.as_of) for file in args.files]
        emit_json({"schema_version": "1.0", "tool": "agentic-skills-seo-expert local sitemap lint", "files": results,
                   "network_requests_performed": 0}, args.output)
    except (InputError, OSError, ValueError) as exc:
        print(f"Input/report error: {exc}", file=sys.stderr)
        return 2
    return 1 if any(issue["status"] == "fail" for result in results for issue in result["issues"]) else 0


if __name__ == "__main__":
    raise SystemExit(main())

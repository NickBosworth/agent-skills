#!/usr/bin/env python3
"""Inspect supplied HTML snapshots and stated response evidence, without fetching.

This is a bounded static evidence aid, not a crawler, browser, full HTML validator,
robots evaluator, schema validator, or proof of actual indexing. See README.md.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from collections import Counter
from datetime import datetime
from html.parser import HTMLParser
from pathlib import Path
from typing import Any
from urllib.parse import urljoin, urlsplit

from common import InputError, emit_json, http_url, load_json, local_reference, read_bounded, reject_json_constant

MAX_PAGE_BYTES = 5 * 1024 * 1024
MAX_TOTAL_BYTES = 128 * 1024 * 1024
MAX_PAGES = 2000
ENGINES = ("googlebot", "bingbot")
PARAMETER_DIRECTIVES = {"max-snippet", "max-image-preview", "max-video-preview", "unavailable_after"}


class Snapshot(HTMLParser):
    """Collect only bounded observations; HTMLParser does not emulate DOM repair."""

    def __init__(self, html: str) -> None:
        super().__init__(convert_charrefs=True)
        self.head = False
        self.head_seen = False
        self.base: str | None = None
        self.titles: list[str] = []
        self._title: list[str] | None = None
        self.descriptions: list[str] = []
        self.canonicals: list[str] = []
        self.robots: list[dict[str, str]] = []
        self.h1_count = 0
        self.anchors = 0
        self.anchors_without_href = 0
        self.images_missing_alt = 0
        self.images_empty_alt = 0
        self.jsonld: list[str] = []
        self._jsonld: list[str] | None = None
        self.feed(html)
        self.close()
        if self._jsonld is not None:
            self.jsonld.append("".join(self._jsonld))
        if self._title is not None:
            self.titles.append(" ".join("".join(self._title).split()))

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = dict(attrs)
        if tag == "head":
            self.head = self.head_seen = True
        if tag == "title" and self.head:
            self._title = []
        if tag == "base" and self.head and self.base is None and values.get("href") is not None:
            self.base = values["href"]
        if tag == "meta":
            name = (values.get("name") or "").lower()
            content = values.get("content") or ""
            if name == "description" and self.head:
                self.descriptions.append(content)
            if name in ("robots", "googlebot", "bingbot", "googlebot-news", "googlebot-image"):
                self.robots.append({"scope": name, "content": content,
                                    "location": "head" if self.head else "outside-head"})
        if tag == "link" and self.head:
            rel = (values.get("rel") or "").lower().split()
            if "canonical" in rel:
                self.canonicals.append(values.get("href") or "")
        if tag == "h1":
            self.h1_count += 1
        if tag == "a":
            self.anchors += 1
            if values.get("href") is None:
                self.anchors_without_href += 1
        if tag == "img":
            if "alt" not in values or values["alt"] is None:
                self.images_missing_alt += 1
            elif values["alt"] == "":
                self.images_empty_alt += 1
        if tag == "script" and (values.get("type") or "").lower().strip() == "application/ld+json":
            self._jsonld = []

    def handle_endtag(self, tag: str) -> None:
        if tag == "title" and self._title is not None:
            self.titles.append(" ".join("".join(self._title).split()))
            self._title = None
        if tag == "script" and self._jsonld is not None:
            self.jsonld.append("".join(self._jsonld))
            self._jsonld = None
        if tag == "head":
            self.head = False

    def handle_data(self, data: str) -> None:
        if self._title is not None:
            self._title.append(data)
        if self._jsonld is not None:
            self._jsonld.append(data)


def split_link_values(value: str) -> list[str]:
    """Split Link field entries without splitting quoted or angle-bracketed commas."""
    result, current = [], []
    quoted, angle, escaped = False, False, False
    for char in value:
        if escaped:
            current.append(char); escaped = False; continue
        if char == "\\" and quoted:
            current.append(char); escaped = True; continue
        if char == '"' and not angle:
            quoted = not quoted
        elif char == "<" and not quoted:
            angle = True
        elif char == ">" and not quoted:
            angle = False
        if char == "," and not quoted and not angle:
            result.append("".join(current).strip()); current = []
        else:
            current.append(char)
    if quoted or angle or escaped:
        raise InputError("Ambiguous Link header; a complete HTTP parser must inspect it.")
    if current:
        result.append("".join(current).strip())
    return result


def header_canonicals(headers: list[dict[str, str]]) -> tuple[list[str], list[str]]:
    """Support ordinary rel=canonical entries, flag anchor/extended cases for review."""
    targets, notes = [], []
    for header in headers:
        if header["name"].lower() != "link":
            continue
        try:
            entries = split_link_values(header["value"])
        except InputError as exc:
            notes.append(str(exc)); continue
        for entry in entries:
            target = re.match(r"^\s*<([^>]*)>(.*)$", entry)
            if not target:
                notes.append("Unparsed Link header entry; canonical coverage is incomplete."); continue
            params = target.group(2)
            if re.search(r";\s*(anchor|rel\*)\s*=", params, re.I):
                notes.append("Link header uses anchor/extended relation syntax; manual review required.")
                continue
            relations = re.findall(r';\s*rel\s*=\s*(?:"([^"\r\n]*)"|([^;\s]+))', params, re.I)
            if len(relations) > 1:
                notes.append("Repeated rel parameter in Link header; manual review required."); continue
            if relations and "canonical" in (relations[0][0] or relations[0][1]).lower().split():
                targets.append(target.group(1))
    return targets, notes


def tokens(content: str) -> set[str]:
    """Only interpret noindex/nofollow and aliases; all other directives stay raw."""
    result = set()
    for token in re.split(r"[,\s]+", content.lower().strip()):
        if token == "none":
            result.update(("noindex", "nofollow"))
        elif token in ("noindex", "nofollow", "index", "follow"):
            result.add(token)
    return result


def scoped_xrobots(value: str, engine: str) -> set[str]:
    """Preserve crawler scope within one repeated field line, resetting per field."""
    scope, found = None, set()
    for part in value.lower().split(","):
        part = part.strip()
        match = re.match(r"^([a-z][a-z0-9_-]*)\s*:\s*(.*)$", part)
        if match:
            prefix, remainder = match.groups()
            if prefix in PARAMETER_DIRECTIVES:
                continue
            scope, part = prefix, remainder
        if scope in (None, engine):
            found.update(tokens(part))
    return found


def directive_observation(snapshots: list[Snapshot], headers: list[dict[str, str]], engine: str) -> dict[str, Any]:
    found, notes = set(), []
    for snapshot in snapshots:
        for item in snapshot.robots:
            if item["scope"] not in ("robots", engine):
                continue
            if item["location"] == "outside-head" and engine != "googlebot":
                notes.append("Outside-head meta observed: not interpreted for Bing by this tool.")
                continue
            found.update(tokens(item["content"]))
    for header in headers:
        if header["name"].lower() == "x-robots-tag":
            found.update(scoped_xrobots(header["value"], engine))
    return {"noindex_declared": "noindex" in found, "nofollow_declared": "nofollow" in found,
            "parsed_subset": sorted(found), "notes": sorted(set(notes)),
            "actual_indexing_status": "not-tested"}


def jsonld_observations(snapshot: Snapshot) -> dict[str, Any]:
    types, issues = set(), []
    for index, raw in enumerate(snapshot.jsonld):
        try:
            obj = json.loads(raw, parse_constant=reject_json_constant)
        except (ValueError, RecursionError):
            issues.append({"block": index, "issue": "Invalid or excessively nested JSON."})
            continue
        if not isinstance(obj, (dict, list)):
            issues.append({"block": index, "issue": "JSON-LD top level is not an object or array."})
        queue = [obj]
        while queue:
            item = queue.pop()
            if isinstance(item, dict):
                kind = item.get("@type")
                values = kind if isinstance(kind, list) else [kind]
                types.update(t for t in values if isinstance(t, str))
                queue.extend(item.values())
            elif isinstance(item, list):
                queue.extend(item)
    return {"block_count": len(snapshot.jsonld), "types": sorted(types), "syntax_issues": issues,
            "feature_eligibility": "not-tested", "visible_content_agreement": "not-tested"}


def resolved_canonicals(snapshot: Snapshot, url: str, headers: list[dict[str, str]]) -> dict[str, Any]:
    base = urljoin(url, snapshot.base) if snapshot.base is not None else url
    head_targets = [urljoin(base, target) if target else "" for target in snapshot.canonicals]
    response_targets, notes = header_canonicals(headers)
    # HTTP Link references use the response URL, not the HTML base element.
    response_targets = [urljoin(url, target) if target else "" for target in response_targets]
    all_targets = head_targets + response_targets
    invalid = []
    for target in all_targets:
        try:
            http_url(target)
        except InputError:
            invalid.append(target)
    return {"head_targets": head_targets, "header_targets": response_targets,
            "distinct_targets": sorted(set(all_targets)), "invalid_targets": invalid,
            "notes": notes, "engine_selected_canonical": "not-tested"}


def audit_page(page: dict[str, Any], initial: Snapshot, rendered: Snapshot | None) -> dict[str, Any]:
    url = page["url"]
    headers = page.get("headers", [])
    desired = page.get("intended_indexable")
    observations = [initial] + ([rendered] if rendered is not None else [])
    final = rendered if rendered is not None else initial
    findings: list[dict[str, Any]] = []

    def finding(code: str, status: str, detail: str, rule: str) -> None:
        findings.append({"code": code, "status": status, "detail": detail, "rule_id": rule})

    status = page.get("response_status")
    if status is None:
        finding("response_status_unknown", "not-tested", "No response status was supplied; no live request occurred.", "SEO-005")
    elif desired is True and status != 200:
        finding("non_200_intended_page", "warning", f"Manifest states status {status}; inspect lifecycle, response and content.", "SEO-005")

    engines = {}
    for engine in ENGINES:
        observation = directive_observation(observations, headers, engine)
        observation["crawl_permission_as_stated_in_manifest"] = page.get("robots", {}).get(engine, "unknown")
        observation["crawl_permission_independently_verified"] = False
        engines[engine] = observation
        if desired is True and observation["noindex_declared"]:
            finding(f"unexpected_noindex_{engine}", "fail", "A parsed noindex conflicts with the supplied intended-indexable state; confirm source and approval before changing it.", "SEO-011")
        if observation["noindex_declared"] and observation["crawl_permission_as_stated_in_manifest"] == "blocked":
            finding(f"noindex_and_blocked_{engine}", "warning", "Manifest states crawling is blocked, so the crawler may not read the observed exclusion.", "SEO-010")
        if observation["notes"]:
            finding(f"directive_scope_partial_{engine}", "not-tested", " ".join(observation["notes"]), "SEO-011")
    if rendered is not None:
        first = directive_observation([initial], headers, "googlebot")
        after = directive_observation([rendered], headers, "googlebot")
        if first["noindex_declared"] and not after["noindex_declared"]:
            finding("initial_noindex_removed_in_render", "warning", "Do not rely on rendering to remove an initial exclusion.", "SEO-024")

    initial_canonical = resolved_canonicals(initial, url, headers)
    final_canonical = resolved_canonicals(final, url, headers)
    for stage, value in (("initial", initial_canonical), ("final", final_canonical)):
        if len(value["distinct_targets"]) > 1:
            finding(f"conflicting_canonical_{stage}", "warning", "Multiple distinct declarations were observed; inspect genuine equivalence and intent.", "SEO-013")
        if value["invalid_targets"]:
            finding(f"invalid_canonical_{stage}", "warning", "An empty, non-HTTP(S), credential-bearing or fragment-bearing canonical needs review.", "SEO-014")
        if value["notes"]:
            finding(f"header_canonical_partial_{stage}", "not-tested", " ".join(value["notes"]), "SEO-013")
    if desired is not False and not final_canonical["distinct_targets"]:
        finding("canonical_not_observed", "warning", "No explicit canonical was parsed; this does not prove canonicalisation failure. Inspect headers and page intent.", "SEO-016")
    if rendered is not None and initial_canonical["distinct_targets"] != final_canonical["distinct_targets"]:
        finding("canonical_changes_during_render", "warning", "Initial and supplied rendered snapshots declare different targets; inspect capture consistency and route metadata.", "SEO-025")

    if not final.titles or not any(title.strip() for title in final.titles):
        finding("title_not_observed", "warning", "A nonempty title in a head element was not observed by this static parser.", "SEO-040")
    elif len(final.titles) > 1:
        finding("multiple_titles", "warning", "Multiple head titles were observed; inspect the actual browser DOM and template.", "SEO-040")
    if desired is not False and not any(value.strip() for value in final.descriptions):
        finding("description_not_observed", "warning", "No nonempty head description was observed; review importance and purpose, not as an indexing requirement.", "SEO-041")
    if final.images_missing_alt:
        finding("image_alt_missing", "warning", "Images without an alt attribute need human purpose/accessibility review; empty decorative alt is not included.", "SEO-071")
    structured = jsonld_observations(final)
    if structured["syntax_issues"]:
        finding("jsonld_syntax_review", "warning", "At least one JSON-LD block could not be parsed as an object/array; this tool does not validate schema eligibility.", "SEO-056")
    if "FAQPage" in structured["types"] or "https://schema.org/FAQPage" in structured["types"]:
        finding("faq_feature_review", "warning", "Research snapshot 2026-10-10: do not promise Google FAQ rich results. Existing markup may have other consumers; no automatic deletion.", "SEO-057")
    return {"url": url, "template": page.get("template"), "intended_indexable": desired,
            "response_status_as_supplied": status, "rendered_snapshot_supplied": rendered is not None,
            "engine_observations": engines, "canonical_initial": initial_canonical,
            "canonical_final": final_canonical, "titles": final.titles, "descriptions": final.descriptions,
            "h1_count_observation_only": final.h1_count, "anchors_observed": final.anchors,
            "anchors_without_href_observation_only": final.anchors_without_href,
            "images_missing_alt": final.images_missing_alt, "images_empty_alt_observation_only": final.images_empty_alt,
            "structured_data": structured, "findings": findings}


def audit_manifest(path: Path) -> dict[str, Any]:
    manifest = load_json(path)
    if not isinstance(manifest, dict) or manifest.get("schema_version") != "1.0":
        raise InputError("Expected a manifest object with schema_version '1.0'.")
    capture = manifest.get("captured_at")
    try:
        if not isinstance(capture, str) or datetime.fromisoformat(capture.replace("Z", "+00:00")).tzinfo is None:
            raise ValueError
    except ValueError as exc:
        raise InputError("captured_at must be an ISO datetime with timezone.") from exc
    pages = manifest.get("pages")
    if not isinstance(pages, list) or not 1 <= len(pages) <= MAX_PAGES:
        raise InputError(f"Manifest must contain 1–{MAX_PAGES} pages.")
    results, total_bytes, seen = [], 0, set()
    for page in pages:
        if not isinstance(page, dict):
            raise InputError("Each page must be an object.")
        url = http_url(page.get("url"))
        if url in seen:
            raise InputError("Duplicate page URL in one manifest; use separate capture manifests.")
        seen.add(url)
        desired = page.get("intended_indexable")
        if desired is not None and not isinstance(desired, bool):
            raise InputError("intended_indexable must be true, false or null.")
        status = page.get("response_status")
        if status is not None and (type(status) is not int or not 100 <= status <= 599):
            raise InputError("response_status must be an HTTP status integer or null.")
        headers = page.get("headers", [])
        if not isinstance(headers, list) or len(headers) > 200:
            raise InputError("headers must be a list of at most 200 name/value objects.")
        for header in headers:
            if not isinstance(header, dict) or not all(isinstance(header.get(key), str) for key in ("name", "value")):
                raise InputError("Every header must have string name and value fields.")
            if any(len(header[key]) > 16384 or "\n" in header[key] or "\r" in header[key] for key in ("name", "value")):
                raise InputError("Header fields must be bounded single-line values.")
        robots = page.get("robots", {})
        if not isinstance(robots, dict) or any(value not in ("allowed", "blocked", "unknown") for value in robots.values()):
            raise InputError("robots must map crawler names to allowed, blocked or unknown.")
        snapshots, hashes = {}, {}
        for stage, key in (("initial", "html"), ("rendered", "rendered_html")):
            if stage == "rendered" and key not in page:
                continue
            file = local_reference(path.parent, page.get(key))
            raw = read_bounded(file, MAX_PAGE_BYTES)
            total_bytes += len(raw)
            if total_bytes > MAX_TOTAL_BYTES:
                raise InputError("Total snapshot bytes exceed the 128 MiB processing budget.")
            try:
                text = raw.decode("utf-8")
            except UnicodeError as exc:
                raise InputError("Snapshot input must be UTF-8; convert its encoding explicitly first.") from exc
            snapshots[stage] = Snapshot(text)
            hashes[stage] = hashlib.sha256(raw).hexdigest()
        result = audit_page(page, snapshots["initial"], snapshots.get("rendered"))
        result["snapshot_sha256"] = hashes
        results.append(result)
    titles: dict[str, list[str]] = {}
    for page in results:
        if len(page["titles"]) == 1 and page["titles"][0].strip():
            key = " ".join(page["titles"][0].split()).casefold()
            titles.setdefault(key, []).append(page["url"])
    duplicates = [urls for urls in titles.values() if len(urls) > 1]
    counts = Counter(f["status"] for page in results for f in page["findings"])
    return {"schema_version": "1.0", "tool": "seo-expert offline snapshot audit", "captured_at_as_supplied": capture,
            "scope_as_supplied": manifest.get("scope", {}),
            "coverage": {"supplied_pages_parsed": len(results), "rendered_snapshots_parsed": sum(p["rendered_snapshot_supplied"] for p in results),
                         "live_requests_performed": 0, "browser_renders_performed": 0, "actual_indexing_checks_performed": 0,
                         "input_bytes_processed": total_bytes},
            "findings_by_status": dict(sorted(counts.items())), "pages": results,
            "duplicate_title_review_groups": duplicates,
            "limitations": ["No overall SEO score or site-wide pass is calculated.",
                            "Coverage is limited to supplied snapshots; scope metadata is not independently verified.",
                            "HTMLParser is not a browser DOM repair algorithm. HTTP Link handling is a bounded common-syntax subset.",
                            "Only noindex/nofollow aliases and ordinary crawler scope are interpreted; other directive semantics need manual review.",
                            "Initial and rendered snapshots may be from different moments; confirm capture consistency.",
                            "No network, robots.txt evaluation, canonical-target fetch, rich-result validation or indexing verification occurs."]}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("manifest", type=Path)
    parser.add_argument("--output", type=Path, help="Create a NEW JSON report file; existing files are never overwritten.")
    args = parser.parse_args()
    try:
        report = audit_manifest(args.manifest.resolve())
        emit_json(report, args.output)
    except (InputError, OSError, ValueError, RecursionError) as exc:
        print(f"Input/report error: {exc}", file=sys.stderr)
        return 2
    return 0  # Findings are evidence, not an arbitrary CI failure policy.


if __name__ == "__main__":
    raise SystemExit(main())

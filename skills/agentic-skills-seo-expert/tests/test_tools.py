"""Regression checks use local synthetic inputs only; no live host or SEO evaluation."""
from __future__ import annotations

import ast
import csv
import json
import math
import sys
import tempfile
import unittest
from datetime import date
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from common import InputError, emit_json, http_url, load_json, local_reference, read_bounded
from audit_snapshots import (Snapshot, audit_manifest, audit_page, directive_observation,
                             header_canonicals, jsonld_observations, resolved_canonicals,
                             scoped_xrobots)
from lint_sitemaps import lint_file, parse_lastmod
from analyse_search_export import analyse, load_rows, aggregate
from validate_pack import validate

FIXTURES = ROOT / "tests" / "fixtures"


def html(head: str = "", body: str = "") -> Snapshot:
    return Snapshot(f"<!doctype html><html><head>{head}</head><body>{body}</body></html>")


def page(**kwargs):
    return {"url": "https://shop.example/page", "intended_indexable": True, "response_status": 200, **kwargs}


class LocalIOTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(); self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)

    def test_read_is_bounded(self):
        p = self.root / "a"; p.write_bytes(b"12345")
        with self.assertRaises(InputError): read_bounded(p, 4)

    def test_relative_path_is_confined(self):
        with self.assertRaises(InputError): local_reference(self.root, "../escape.html")

    def test_absolute_reference_rejected(self):
        with self.assertRaises(InputError): local_reference(self.root, str(self.root / "a.html"))

    def test_symlink_escape_rejected(self):
        with tempfile.TemporaryDirectory() as outside:
            target = Path(outside) / "a"; target.write_text("outside")
            try: (self.root / "link").symlink_to(target)
            except OSError: self.skipTest("Symlink creation unavailable on this platform")
            with self.assertRaises(InputError): local_reference(self.root, "link")

    def test_output_never_overwrites(self):
        p = self.root / "report.json"; p.write_text("original")
        with self.assertRaises(InputError): emit_json({"x": 1}, p)
        self.assertEqual(p.read_text(), "original")

    def test_new_output_is_valid_json(self):
        p = self.root / "report.json"; emit_json({"x": "<script>"}, p)
        self.assertEqual(json.loads(p.read_text()), {"x": "<script>"})

    def test_json_nan_rejected(self):
        p = self.root / "bad.json"; p.write_text('{"v": NaN}')
        with self.assertRaises(InputError): load_json(p)

    def test_url_preserves_functional_parameters(self):
        value = "https://shop.example/Part?size=XL&sort=price"
        self.assertEqual(http_url(value), value)

    def test_credential_url_rejected(self):
        with self.assertRaises(InputError): http_url("https://name:secret@shop.example/")

    def test_fragment_and_non_http_rejected(self):
        for value in ("https://shop.example/#part", "file:///tmp/a", "javascript:alert(1)", "https://shop.example/a b"):
            with self.subTest(value=value), self.assertRaises(InputError): http_url(value)


class SnapshotTests(unittest.TestCase):
    def test_fixture_has_exact_offline_coverage(self):
        result = audit_manifest(FIXTURES / "manifest.json")
        self.assertEqual(result["coverage"]["supplied_pages_parsed"], 4)
        self.assertEqual(result["coverage"]["rendered_snapshots_parsed"], 1)
        self.assertEqual(result["coverage"]["live_requests_performed"], 0)
        self.assertEqual(result["coverage"]["browser_renders_performed"], 0)

    def test_generic_noindex_affects_both(self):
        snap = html('<meta name="robots" content="noindex">')
        for engine in ("googlebot", "bingbot"):
            self.assertTrue(directive_observation([snap], [], engine)["noindex_declared"])

    def test_none_alias(self):
        result = directive_observation([html('<meta name="robots" content="none">')], [], "googlebot")
        self.assertTrue(result["noindex_declared"]); self.assertTrue(result["nofollow_declared"])

    def test_crawler_specific_meta(self):
        snap = html('<meta name="bingbot" content="noindex">')
        self.assertFalse(directive_observation([snap], [], "googlebot")["noindex_declared"])
        self.assertTrue(directive_observation([snap], [], "bingbot")["noindex_declared"])

    def test_scoped_header_does_not_leak(self):
        self.assertEqual(scoped_xrobots("bingbot: noindex, nofollow", "googlebot"), set())
        self.assertEqual(scoped_xrobots("bingbot: noindex, nofollow", "bingbot"), {"noindex", "nofollow"})

    def test_unknown_crawler_and_robots_prefix_not_global(self):
        self.assertEqual(scoped_xrobots("otherbot: noindex", "googlebot"), set())
        self.assertEqual(scoped_xrobots("robots: noindex", "googlebot"), set())

    def test_parameter_directive_does_not_become_crawler(self):
        self.assertIn("noindex", scoped_xrobots("max-snippet: 0, noindex", "googlebot"))

    def test_date_parameter_does_not_wipe_existing_scope(self):
        self.assertNotIn("noindex", scoped_xrobots("bingbot: unavailable_after: Wed, 03 Dec 2025 13:00:00 GMT, noindex", "googlebot"))

    def test_repeated_header_scope_resets(self):
        headers = [{"name": "X-Robots-Tag", "value": "bingbot: nofollow"}, {"name": "X-Robots-Tag", "value": "noindex"}]
        self.assertTrue(directive_observation([html()], headers, "googlebot")["noindex_declared"])

    def test_noindex_is_not_cancelled_by_index(self):
        snap = html('<meta name="robots" content="noindex"><meta name="robots" content="index">')
        self.assertTrue(directive_observation([snap], [], "googlebot")["noindex_declared"])

    def test_google_body_meta_recognised(self):
        snap = html(body='<meta name="robots" content="noindex">')
        self.assertTrue(directive_observation([snap], [], "googlebot")["noindex_declared"])
        self.assertTrue(directive_observation([snap], [], "bingbot")["notes"])

    def test_intentional_exclusion_not_unexpected_failure(self):
        result = audit_page(page(intended_indexable=False), html('<meta name="robots" content="none">'), None)
        self.assertFalse(any(f["code"].startswith("unexpected_noindex") for f in result["findings"]))

    def test_intentionally_excluded_metadata_absence_not_seo_warning(self):
        result = audit_page(page(intended_indexable=False), html('<title>Account</title><meta name="robots" content="none">'), None)
        codes = {f["code"] for f in result["findings"]}
        self.assertNotIn("description_not_observed", codes)
        self.assertNotIn("canonical_not_observed", codes)

    def test_unknown_intent_does_not_assume_indexable(self):
        result = audit_page(page(intended_indexable=None), html('<meta name="robots" content="noindex">'), None)
        self.assertFalse(any(f["status"] == "fail" for f in result["findings"]))

    def test_noindex_and_blocked_is_warning(self):
        result = audit_page(page(robots={"googlebot": "blocked"}), html('<meta name="robots" content="noindex">'), None)
        self.assertIn("noindex_and_blocked_googlebot", {f["code"] for f in result["findings"]})

    def test_initial_noindex_removed_still_reported(self):
        result = audit_page(page(), html('<meta name="robots" content="noindex">'), html())
        self.assertIn("initial_noindex_removed_in_render", {f["code"] for f in result["findings"]})

    def test_html_base_resolves_only_html_canonical(self):
        snap = html('<base href="https://shop.example/catalogue/"><link rel="canonical" href="item">')
        result = resolved_canonicals(snap, "https://shop.example/page", [{"name":"Link","value":"<other>; rel=canonical"}])
        self.assertEqual(result["head_targets"], ["https://shop.example/catalogue/item"])
        self.assertEqual(result["header_targets"], ["https://shop.example/other"])

    def test_link_header_commas_preserved(self):
        targets, notes = header_canonicals([{"name":"Link","value":'<https://shop.example/a,b>; rel="canonical"; title="a,b", </style.css>; rel=preload'}])
        self.assertEqual(targets, ["https://shop.example/a,b"]); self.assertFalse(notes)

    def test_extended_link_context_is_not_assumed(self):
        targets, notes = header_canonicals([{"name":"Link","value":'<https://shop.example/a>; rel=canonical; anchor="/other"'}])
        self.assertEqual(targets, []); self.assertTrue(notes)

    def test_malformed_link_header_is_partial(self):
        targets, notes = header_canonicals([{"name":"Link","value":'<https://shop.example/a; rel="canonical"'}])
        self.assertEqual(targets, []); self.assertTrue(notes)

    def test_canonical_mutation_reported(self):
        result = audit_page(page(), html('<link rel="canonical" href="/a">'), html('<link rel="canonical" href="/b">'))
        self.assertIn("canonical_changes_during_render", {f["code"] for f in result["findings"]})

    def test_multiple_h1_is_only_observed(self):
        result = audit_page(page(), html('<title>A</title>', '<h1>A</h1><h1>B</h1>'), None)
        self.assertEqual(result["h1_count_observation_only"], 2)
        self.assertFalse(any("h1" in f["code"] for f in result["findings"]))

    def test_decorative_and_missing_alt_distinguished(self):
        result = audit_page(page(), html(body='<img src="a" alt=""><img src="b">'), None)
        self.assertEqual(result["images_empty_alt_observation_only"], 1)
        self.assertEqual(result["images_missing_alt"], 1)

    def test_missing_status_stays_not_tested(self):
        result = audit_page(page(response_status=None), html(), None)
        self.assertEqual(next(f for f in result["findings"] if f["code"] == "response_status_unknown")["status"], "not-tested")

    def test_jsonld_syntax_not_feature_certification(self):
        result = jsonld_observations(html('<script type="application/ld+json">{"@type":"Product"}</script>'))
        self.assertEqual(result["types"], ["Product"])
        self.assertEqual(result["feature_eligibility"], "not-tested")

    def test_jsonld_invalid_json(self):
        result = jsonld_observations(html('<script type="application/ld+json">{oops}</script>'))
        self.assertTrue(result["syntax_issues"])

    def test_jsonld_nan_rejected(self):
        result = jsonld_observations(html('<script type="application/ld+json">{"v":NaN}</script>'))
        self.assertTrue(result["syntax_issues"])

    def test_faq_requires_review_not_auto_deletion(self):
        result = audit_page(page(), html('<script type="application/ld+json">{"@type":"FAQPage"}</script>'), None)
        finding = next(f for f in result["findings"] if f["code"] == "faq_feature_review")
        self.assertEqual(finding["status"], "warning")
        self.assertIn("no automatic deletion", finding["detail"])

    def test_manifest_string_boolean_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp); (root / "a.html").write_text("<html></html>")
            (root / "m.json").write_text(json.dumps({"schema_version":"1.0","captured_at":"2026-10-10T00:00:00Z","pages":[page(html="a.html",intended_indexable="false")]}))
            with self.assertRaises(InputError): audit_manifest(root / "m.json")

    def test_manifest_requires_timezone(self):
        with tempfile.TemporaryDirectory() as tmp:
            p = Path(tmp) / "m.json"; p.write_text(json.dumps({"schema_version":"1.0","captured_at":"2026-10-10T00:00:00","pages":[]}))
            with self.assertRaises(InputError): audit_manifest(p)

    def test_page_budget_rejected(self):
        with patch("audit_snapshots.MAX_PAGES", 1), self.assertRaises(InputError):
            audit_manifest(FIXTURES / "manifest.json")


class SitemapTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(); self.addCleanup(self.temp.cleanup)
        self.path = Path(self.temp.name) / "s.xml"

    def run_xml(self, content, **kwargs):
        self.path.write_text(content, encoding="utf-8")
        return lint_file(self.path, **kwargs)

    def sitemap(self, entries):
        return f'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{entries}</urlset>'

    def test_good_fixture(self):
        result = lint_file(FIXTURES / "sitemap.xml", "https://shop.example", date(2026,10,10))
        self.assertEqual(result["entry_count"], 3); self.assertEqual(result["issues"], [])

    def test_dtd_rejected(self):
        with self.assertRaises(InputError): self.run_xml('<!DOCTYPE x [<!ENTITY test "boom">]><x/>')

    def test_entity_decl_rejected(self):
        with self.assertRaises(InputError): self.run_xml('<!ENTITY test SYSTEM "file:///etc/passwd"><x/>')

    def test_namespace_required(self):
        with self.assertRaises(InputError): self.run_xml('<urlset><url><loc>https://shop.example/</loc></url></urlset>')

    def test_malformed_xml_rejected(self):
        with self.assertRaises(InputError): self.run_xml('<urlset>')

    def test_relative_url_fails(self):
        result = self.run_xml(self.sitemap('<url><loc>/a</loc></url>'))
        self.assertIn("invalid_loc", {i["code"] for i in result["issues"]})

    def test_duplicate_url_warns(self):
        entry = '<url><loc>https://shop.example/a</loc></url>'
        result = self.run_xml(self.sitemap(entry + entry))
        self.assertIn("duplicate_loc", {i["code"] for i in result["issues"]})

    def test_meaningful_query_variants_not_collapsed(self):
        result = self.run_xml(self.sitemap('<url><loc>https://shop.example/a?size=S</loc></url><url><loc>https://shop.example/a?size=L</loc></url>'))
        self.assertEqual(result["distinct_locs"], 2)

    def test_future_lastmod_warns(self):
        result = self.run_xml(self.sitemap('<url><loc>https://shop.example/a</loc><lastmod>2027-01-01</lastmod></url>'), as_of=date(2026,10,10))
        self.assertIn("future_lastmod", {i["code"] for i in result["issues"]})

    def test_invalid_lastmod_fails(self):
        result = self.run_xml(self.sitemap('<url><loc>https://shop.example/a</loc><lastmod>2026-02-30</lastmod></url>'))
        self.assertIn("invalid_lastmod", {i["code"] for i in result["issues"]})

    def test_date_and_timezone_date_time(self):
        self.assertEqual(parse_lastmod("2026-10-10"), date(2026,10,10))
        self.assertEqual(parse_lastmod("2026-10-10T12:30Z"), date(2026,10,10))
        with self.assertRaises(ValueError): parse_lastmod("2026-10-10T12:30:00")

    def test_different_host_needs_ownership_review(self):
        result = self.run_xml(self.sitemap('<url><loc>https://other.example/a</loc></url>'), site="https://shop.example")
        self.assertEqual(next(i for i in result["issues"] if i["code"] == "host_differs_from_site")["status"], "warning")

    def test_index_does_not_follow_references(self):
        result = self.run_xml('<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><sitemap><loc>https://shop.example/other.xml</loc></sitemap></sitemapindex>')
        self.assertEqual(result["referenced_sitemaps_followed"], 0)
        self.assertEqual(result["kind"], "sitemapindex")

    def test_gzip_not_expanded(self):
        self.path.write_bytes(b"\x1f\x8bnot-an-actual-archive")
        with self.assertRaises(InputError): lint_file(self.path)

    def test_entry_limit_reported(self):
        with patch("lint_sitemaps.MAX_ENTRIES", 1):
            result = self.run_xml(self.sitemap('<url><loc>https://shop.example/a</loc></url><url><loc>https://shop.example/b</loc></url>'))
        self.assertIn("entry_limit_exceeded", {i["code"] for i in result["issues"]})


class SearchExportTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(); self.addCleanup(self.temp.cleanup)
        self.path = Path(self.temp.name) / "data.csv"
        self.fields = ['dataset_id','period_start','period_end','timezone','engine','search_type','country','device','query','page','clicks','impressions','average_position']
        self.base = dict(dataset_id="d",period_start="2026-09-01",period_end="2026-09-30",timezone="UTC",engine="google",search_type="web",country="GB",device="mobile",query="widget",page="https://shop.example/a",clicks="10",impressions="100",average_position="4")

    def write_rows(self, rows):
        with self.path.open("w", newline="", encoding="utf-8") as stream:
            writer = csv.DictWriter(stream, fieldnames=self.fields); writer.writeheader(); writer.writerows(rows)
        return self.path

    def test_ctr_uses_totals(self):
        result = analyse(FIXTURES / "search.csv")
        google = next(g for g in result["groups"] if g["scope"]["engine"] == "google")
        self.assertAlmostEqual(google["row_sums_not_property_totals"]["derived_ctr"], 11/150)

    def test_engines_stay_separate(self):
        result = analyse(FIXTURES / "search.csv")
        self.assertEqual(len(result["groups"]), 2)
        self.assertNotIn("total_clicks", result)

    def test_multiple_urls_are_review_only(self):
        result = analyse(FIXTURES / "search.csv")
        google = next(g for g in result["groups"] if g["scope"]["engine"] == "google")
        candidate = next(q for q in google["queries_by_observed_impressions"] if q["query"] == "blue widget")
        self.assertTrue(candidate["multiple_url_review_lead"])
        self.assertNotIn("cannibalisation_confirmed", candidate)

    def test_position_is_weighted_and_labelled(self):
        result = analyse(FIXTURES / "search.csv")
        google = next(g for g in result["groups"] if g["scope"]["engine"] == "google")
        self.assertAlmostEqual(google["row_sums_not_property_totals"]["impression_weighted_reported_average_position"], 800/150)

    def test_zero_impressions_ctr_unknown(self):
        p = self.write_rows([{**self.base,"clicks":"0","impressions":"0","average_position":""}])
        self.assertIsNone(analyse(p)["groups"][0]["row_sums_not_property_totals"]["derived_ctr"])

    def test_missing_position_does_not_assume_zero(self):
        p = self.write_rows([{**self.base,"average_position":""}])
        self.assertIsNone(analyse(p)["groups"][0]["row_sums_not_property_totals"]["impression_weighted_reported_average_position"])

    def test_duplicate_row_rejected(self):
        with self.assertRaises(InputError): load_rows(self.write_rows([self.base,self.base]))

    def test_overlapping_windows_rejected(self):
        row = {**self.base,"period_start":"2026-09-15","period_end":"2026-10-15"}
        with self.assertRaises(InputError): load_rows(self.write_rows([self.base,row]))

    def test_adjacent_nonoverlapping_windows_allowed(self):
        row = {**self.base,"period_start":"2026-10-01","period_end":"2026-10-31"}
        self.assertEqual(len(load_rows(self.write_rows([self.base,row]))), 2)

    def test_mixed_all_and_detail_rejected(self):
        with self.assertRaises(InputError): load_rows(self.write_rows([self.base,{**self.base,"country":"ALL"}]))

    def test_incompatible_dataset_scope_rejected(self):
        with self.assertRaises(InputError): load_rows(self.write_rows([self.base,{**self.base,"engine":"bing"}]))

    def test_nan_position_rejected(self):
        with self.assertRaises(InputError): load_rows(self.write_rows([{**self.base,"average_position":"NaN"}]))

    def test_formatted_or_estimated_counts_rejected(self):
        for value in ("1,000","~10","1.5","-1","NaN"):
            with self.subTest(value=value), self.assertRaises(InputError): load_rows(self.write_rows([{**self.base,"impressions":value}]))

    def test_blank_query_not_invented(self):
        with self.assertRaises(InputError): load_rows(self.write_rows([{**self.base,"query":""}]))

    def test_ai_report_not_misread_as_click_report(self):
        with self.assertRaises(InputError): load_rows(self.write_rows([{**self.base,"search_type":"ai"}]))

    def test_formula_like_query_remains_data(self):
        value = '=HYPERLINK("https://example.invalid","text")'
        result = analyse(self.write_rows([{**self.base,"query":value}]))
        self.assertEqual(result["groups"][0]["queries_by_observed_impressions"][0]["query"], value)

    def test_reversed_window_rejected(self):
        with self.assertRaises(InputError): load_rows(self.write_rows([{**self.base,"period_start":"2026-10-01"}]))

    def test_unknown_dimension_header_rejected(self):
        self.fields.append("hidden_dimension")
        with self.assertRaises(InputError): load_rows(self.write_rows([self.base]))

    def test_limit_bounds(self):
        with self.assertRaises(InputError): analyse(FIXTURES / "search.csv", 0)

    def test_multiple_datasets_not_summed(self):
        result = analyse(self.write_rows([self.base,{**self.base,"dataset_id":"copy-for-comparison"}]))
        self.assertEqual(len(result["groups"]), 2)
        self.assertEqual(result["dataset_ids"], ["copy-for-comparison","d"])


class PackTests(unittest.TestCase):
    def test_catalogue_is_complete_and_sources_resolve(self):
        rules = json.loads((ROOT / "data/rules.json").read_text())["rules"]
        sources = {s["id"] for s in json.loads((ROOT / "research/sources.json").read_text())["sources"]}
        self.assertEqual(len(rules), 100)
        self.assertTrue(all(set(rule["source_ids"]).issubset(sources) for rule in rules))

    def test_source_access_limitation_is_preserved(self):
        sources = json.loads((ROOT / "research/sources.json").read_text())["sources"]
        self.assertEqual(next(s for s in sources if s["id"] == "B09")["review_status"], "access-limited")

    def test_evaluations_not_claimed_as_executed(self):
        data = json.loads((ROOT / "evals/scenarios.json").read_text())
        self.assertEqual(data["execution_status"], "not-executed")
        self.assertTrue(all(s["execution_status"] == "not-executed" for s in data["scenarios"]))

    def test_local_structure_and_links(self):
        self.assertEqual(validate(ROOT), [])

    def test_utilities_have_no_network_or_execution_imports(self):
        forbidden = {"requests","httpx","socket","subprocess","urllib.request","http.client"}
        for path in (ROOT / "scripts").glob("*.py"):
            tree = ast.parse(path.read_text())
            modules = set()
            for node in ast.walk(tree):
                if isinstance(node, ast.Import): modules.update(alias.name for alias in node.names)
                elif isinstance(node, ast.ImportFrom) and node.module: modules.add(node.module)
            self.assertFalse(modules & forbidden, f"Forbidden utility import in {path.name}")


if __name__ == "__main__":
    unittest.main()

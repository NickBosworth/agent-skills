"""Dependency-free regression tests for the engineering checker."""
from __future__ import annotations
import contextlib
import hashlib
import io
import json
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from audit_svg import audit_text, audit_file, compare_baseline, main


def svg(body: str = "", attrs: str = "") -> str:
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128" aria-hidden="true" {attrs}>{body}</svg>'


def codes(text: str, profile: str = "web") -> set[str]:
    return {i["code"] for i in audit_text(text, profile)["issues"]}


class AuditTests(unittest.TestCase):
    def test_valid_minimal(self):
        self.assertEqual(codes(svg('<circle cx="64" cy="64" r="20"/>')), set())

    def test_svg_namespace_required(self):
        self.assertIn("SVG_ROOT", codes('<svg width="1" height="1" viewBox="0 0 1 1"/>'))

    def test_malformed_xml(self):
        self.assertIn("XML_PARSE", codes(svg('<g>')))

    def test_dtd_rejected_before_parse(self):
        self.assertEqual(codes('<!DOCTYPE svg [<!ENTITY x "hello">]>' + svg('&x;')), {"XML_DECLARATION"})

    def test_stylesheet_processing_instruction(self):
        self.assertIn("XML_STYLESHEET", codes('<?xml-stylesheet href="remote.css"?>' + svg()))

    def test_duplicate_ids(self):
        self.assertIn("DUPLICATE_ID", codes(svg('<g id="same"/><path id="same" d="M0 0"/>')))

    def test_empty_id(self):
        self.assertIn("ID_SYNTAX", codes(svg('<g id=""/>')))

    def test_local_href_resolves(self):
        self.assertNotIn("MISSING_REFERENCE", codes(svg('<defs><path id="shape" d="M0 0"/></defs><use href="#shape"/>')))

    def test_missing_href(self):
        self.assertIn("MISSING_REFERENCE", codes(svg('<use href="#missing"/>')))

    def test_xlink_href(self):
        self.assertIn("MISSING_REFERENCE", codes(svg('<use xlink:href="#missing"/>', 'xmlns:xlink="http://www.w3.org/1999/xlink"')))

    def test_css_url_reference(self):
        self.assertIn("MISSING_REFERENCE", codes(svg('<style>.a{fill:url("#gone")}</style>')))

    def test_hex_colours_not_treated_as_references(self):
        self.assertNotIn("MISSING_REFERENCE", codes(svg('<path fill="#aabbcc" stroke="#123" d="M0 0"/>')))

    def test_aria_references(self):
        self.assertIn("MISSING_REFERENCE", codes(svg('<g aria-labelledby="absent"/>')))

    def test_smil_syncbase_reference(self):
        self.assertIn("MISSING_REFERENCE", codes(svg('<g><animate attributeName="opacity" values="0;1" begin="missing.end+0.2s" dur="1s"/></g>')))

    def test_script_rejected(self):
        self.assertIn("SCRIPT", codes(svg('<script>alert(1)</script>')))

    def test_event_attribute_rejected(self):
        self.assertIn("EVENT_ATTRIBUTE", codes(svg('<g onload="alert(1)"/>')))

    def test_foreign_object_rejected(self):
        self.assertIn("FOREIGN_OBJECT", codes(svg('<foreignObject/>')))

    def test_external_resources_rejected(self):
        self.assertIn("EXTERNAL_REFERENCE", codes(svg('<use href="https://example.invalid/asset.svg#x"/>')))
        self.assertIn("EXTERNAL_URL", codes(svg('<path fill="url(https://example.invalid/x)"/>')))
        self.assertIn("CSS_IMPORT", codes(svg('<style>@import "remote.css";</style>')))

    def test_data_image_rejected(self):
        self.assertIn("EXTERNAL_REFERENCE", codes(svg('<image href="data:image/png;base64,AAAA"/>')))

    def test_xml_base_rejected(self):
        self.assertIn("XML_BASE", codes(svg('<g xml:base="https://example.invalid"/>')))

    def test_css_escapes_need_manual_review(self):
        self.assertIn("CSS_ESCAPES", codes(svg('<style>.a{fill:u\\72l(#x)}</style>')))

    def test_bad_viewbox(self):
        for value in ["0 0 0 128", "0 0 -1 128", "0 0 NaN 128", "0 0 1e999 128", "0 0 128", "bad"]:
            with self.subTest(value=value):
                self.assertIn("VIEWBOX", codes(svg().replace('viewBox="0 0 128 128"', f'viewBox="{value}"')))

    def test_zero_dimension(self):
        self.assertIn("DIMENSION", codes(svg().replace('width="128"', 'width="0"')))

    def test_static_policy(self):
        text = svg('<style>.a{fill:red}</style><text>Hi</text><g><animate attributeName="opacity" dur="1s" values="0;1"/></g>')
        for profile in ["portable", "godot"]:
            with self.subTest(profile=profile):
                self.assertTrue({"STATIC_CSS", "STATIC_TEXT", "STATIC_ANIMATION"} <= codes(text, profile))

    def test_portable_currentcolour(self):
        self.assertIn("INHERITED_PAINT", codes(svg('<path fill="currentColor"/>'), "portable"))

    def test_morph_signature_mismatch(self):
        text = svg('<path d="M0 0L10 10"><animate attributeName="d" values="M0 0 L10 10;M0 0 C1 2 3 4 5 6" dur="1s"/></path>')
        self.assertIn("MORPH_SIGNATURE", codes(text))

    def test_morph_signature_match_not_flagged(self):
        text = svg('<path d="M0 0L10 10"><animate attributeName="d" values="M0 0 L10 10;M1 1 L11 11" dur="1s"/></path>')
        self.assertNotIn("MORPH_SIGNATURE", codes(text))

    def test_discrete_morph_skips_interpolation_warning(self):
        text = svg('<path><animate attributeName="d" calcMode="discrete" values="M0 0 L10 10;M0 0 C1 2 3 4 5 6" dur="1s"/></path>')
        self.assertNotIn("MORPH_SIGNATURE", codes(text))

    def test_keytimes_count_and_range(self):
        self.assertIn("KEY_TIMES_COUNT", codes(svg('<animate attributeName="opacity" values="0;1" keyTimes="0;.5;1"/>')))
        self.assertIn("KEY_TIMES", codes(svg('<animate attributeName="opacity" values="0;1" keyTimes="0;2"/>')))

    def test_spline_validation(self):
        self.assertIn("KEY_SPLINES", codes(svg('<animate attributeName="opacity" values="0;1" calcMode="spline" keySplines="0 0 2 1"/>')))

    def test_baseline_detects_id_and_viewbox_changes(self):
        before = audit_text(svg('<g id="keep"/>'))
        after = audit_text(svg('<g id="new"/>').replace('viewBox="0 0 128 128"', 'viewBox="0 0 64 64"'))
        compare_baseline(after, before)
        self.assertTrue({"CONTRACT_VIEWBOX", "CONTRACT_ID_REMOVED"} <= {i["code"] for i in after["issues"]})

    def test_baseline_numeric_viewbox_equivalence(self):
        before = audit_text(svg())
        after = audit_text(svg().replace('viewBox="0 0 128 128"', 'viewBox="0,0,128.0,128"'))
        compare_baseline(after, before)
        self.assertNotIn("CONTRACT_VIEWBOX", {i["code"] for i in after["issues"]})

    def test_file_input_limit_and_encoding(self):
        with tempfile.TemporaryDirectory() as tmp:
            p = Path(tmp) / "a.svg"
            p.write_text(svg(), encoding="utf-8")
            self.assertEqual(audit_file(p, max_bytes=8)["issues"][0]["code"], "INPUT")
            p.write_bytes(svg().encode("utf-16"))
            self.assertEqual(audit_file(p)["issues"][0]["code"], "INPUT")

    def test_missing_file(self):
        with tempfile.TemporaryDirectory() as tmp:
            self.assertEqual(audit_file(Path(tmp) / "none.svg")["issues"][0]["code"], "INPUT")

    def test_cli_json_and_no_source_mutation(self):
        with tempfile.TemporaryDirectory() as tmp:
            p = Path(tmp) / "a.svg"
            p.write_text(svg(), encoding="utf-8")
            before = hashlib.sha256(p.read_bytes()).digest()
            output = io.StringIO()
            with contextlib.redirect_stdout(output):
                status = main([str(p), "--json"])
            self.assertEqual(status, 0)
            self.assertEqual(json.loads(output.getvalue())["reports"][0]["stats"]["elements"], 1)
            self.assertEqual(before, hashlib.sha256(p.read_bytes()).digest())

    def test_cli_warning_exit(self):
        with tempfile.TemporaryDirectory() as tmp:
            p = Path(tmp) / "a.svg"
            p.write_text(svg().replace('aria-hidden="true"', ''), encoding="utf-8")
            with contextlib.redirect_stdout(io.StringIO()):
                self.assertEqual(main([str(p), "--fail-on-warning"]), 1)

    def test_cli_empty_directory_is_not_success(self):
        with tempfile.TemporaryDirectory() as tmp:
            with contextlib.redirect_stderr(io.StringIO()), self.assertRaises(SystemExit) as caught:
                main([tmp])
            self.assertEqual(caught.exception.code, 2)

    def test_examples_pass_expected_profiles(self):
        for name in ["css-status.svg", "smil-morph.svg", "component-gate.svg"]:
            with self.subTest(name=name):
                self.assertFalse([i for i in audit_file(ROOT / "assets" / name)["issues"] if i["severity"] == "error"])
        self.assertFalse([i for i in audit_file(ROOT / "assets" / "component-gate.svg", "godot")["issues"] if i["severity"] == "error"])


if __name__ == "__main__":
    unittest.main()

"""Tests for capture parsing/preflight; no Playwright or browser needed."""
from __future__ import annotations
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from render_svg import parse_size, sample_times, preflight
from argparse import ArgumentTypeError

BASE = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">{}</svg>'

class CaptureSupportTests(unittest.TestCase):
    def test_size(self):
        self.assertEqual(parse_size("320x240"), (320, 240))
        for value in ["0x100", "5000x20", "320", "NaNx128"]:
            with self.subTest(value=value), self.assertRaises(ArgumentTypeError):
                parse_size(value)

    def test_loop_frame_sampling_omits_endpoint(self):
        self.assertEqual(sample_times(None, 4, 2), [0, .5, 1, 1.5])

    def test_explicit_times_preserve_order(self):
        self.assertEqual(sample_times("1,0,.5,1", None, None), [1, 0, .5, 1])

    def test_bad_time_inputs(self):
        for args in [("nan", None, None), ("-1", None, None), ("0,", None, None), (None, 0, 2), (None, 3, None), (None, None, 2), ("0", 3, 2)]:
            with self.subTest(args=args), self.assertRaises(ValueError):
                sample_times(*args)

    def test_preflight_rejects_external_navigation(self):
        with tempfile.TemporaryDirectory() as tmp:
            p = Path(tmp) / "a.svg"
            p.write_text(BASE.format('<a href="https://example.invalid">x</a>'), encoding="utf-8")
            with self.assertRaises(ValueError):
                preflight(p)

    def test_preflight_rejects_script(self):
        with tempfile.TemporaryDirectory() as tmp:
            p = Path(tmp) / "a.svg"
            p.write_text(BASE.format('<script>alert(1)</script>'), encoding="utf-8")
            with self.assertRaises(ValueError):
                preflight(p)

    def test_preflight_accepts_reviewable_sample(self):
        text, report = preflight(ROOT / "assets" / "css-status.svg")
        self.assertIn("status-check", text)
        self.assertEqual(report["stats"]["smilAnimations"], 0)

if __name__ == "__main__":
    unittest.main()

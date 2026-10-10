"""Optional Chromium integration tests. Requires Playwright + a local browser.

Set SVG_SKILL_CHROMIUM_EXECUTABLE only to use an existing trusted Chromium.
Run separately: python tests/browser_checks.py
"""
from __future__ import annotations
import contextlib
import io
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from render_svg import main as render_main


class BrowserChecks(unittest.TestCase):
    def capture(self, asset: str, times: str, reduced: bool = False):
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp) / "capture"
            args = [str(ROOT / "assets" / asset), "--out", str(out), "--times", times, "--reviewed"]
            exe = os.environ.get("SVG_SKILL_CHROMIUM_EXECUTABLE")
            if exe:
                args += ["--executable", exe]
            if reduced:
                args += ["--reduced-motion"]
            with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()) as errors:
                status = render_main(args)
            self.assertEqual(status, 0, errors.getvalue())
            manifest = json.loads((out / "manifest.json").read_text(encoding="utf-8"))
            self.assertTrue((out / "gallery.html").is_file())
            self.assertEqual(manifest["status"], "captured")
            self.assertFalse(manifest["pageErrors"])
            return manifest

    def test_css_seeks_and_settles(self):
        m = self.capture("css-status.svg", "0,0.2,0.4,0.7,1.2")
        hashes = [f["sha256"] for f in m["frames"]]
        self.assertNotEqual(hashes[0], hashes[2])
        self.assertEqual(hashes[-2], hashes[-1])
        for f in m["frames"]:
            for ms in f["state"]["cssCurrentTimesMs"]:
                self.assertAlmostEqual(ms, f["timeSeconds"] * 1000)

    def test_reduced_css_is_static_without_forced_disable(self):
        m = self.capture("css-status.svg", "0,0.2,0.7,1.2", reduced=True)
        self.assertEqual(len({f["sha256"] for f in m["frames"]}), 1)
        self.assertEqual(m["timelines"]["cssAnimationCount"], 0)

    def test_smil_varies_and_repeats(self):
        m = self.capture("smil-morph.svg", "0,0.6,1.2,2.4")
        hashes = [f["sha256"] for f in m["frames"]]
        self.assertNotEqual(hashes[0], hashes[2])
        self.assertEqual(hashes[0], hashes[-1])
        for f in m["frames"]:
            self.assertAlmostEqual(f["state"]["smilCurrentTimesSeconds"][0], f["timeSeconds"], places=5)

    def test_reduced_smil_uses_static_branch(self):
        m = self.capture("smil-morph.svg", "0,0.6,1.2,2.4", reduced=True)
        self.assertEqual(len({f["sha256"] for f in m["frames"]}), 1)
        for f in m["frames"]:
            animated = next(e for e in f["state"]["geometry"] if e["id"] == "morph-animated")
            self.assertEqual(animated["display"], "none")

    def test_static_component_does_not_move(self):
        m = self.capture("component-gate.svg", "0,1,2")
        self.assertEqual(len({f["sha256"] for f in m["frames"]}), 1)

    def test_repeatable_capture(self):
        first = self.capture("css-status.svg", "0.2,0.4,0.7")
        second = self.capture("css-status.svg", "0.2,0.4,0.7")
        self.assertEqual([f["sha256"] for f in first["frames"]], [f["sha256"] for f in second["frames"]])

    def test_reduced_preference_does_not_mask_missing_author_fallback(self):
        # Proves the renderer doesn't force a fake passing reduced-motion result.
        original = ROOT / "assets" / "css-status.svg"
        import re
        text = original.read_text(encoding="utf-8")
        text = re.sub(r"@media \(prefers-reduced-motion: reduce\) \{[^\n]+\}", "", text)
        with tempfile.TemporaryDirectory() as tmp:
            source = Path(tmp) / "no-fallback.svg"
            source.write_text(text, encoding="utf-8")
            args = [str(source), "--out", str(Path(tmp) / "out"), "--times", "0,0.4,0.7", "--reduced-motion", "--reviewed"]
            exe = os.environ.get("SVG_SKILL_CHROMIUM_EXECUTABLE")
            if exe:
                args += ["--executable", exe]
            with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()) as errors:
                status = render_main(args)
            self.assertEqual(status, 0, errors.getvalue())
            m = json.loads((Path(tmp) / "out" / "manifest.json").read_text(encoding="utf-8"))
            self.assertGreater(len({f["sha256"] for f in m["frames"]}), 1)

    def test_waapi_instances_preference_and_cleanup(self):
        from playwright.sync_api import sync_playwright
        source = (ROOT / "assets" / "component-gate.svg").read_text(encoding="utf-8")
        code = (ROOT / "assets" / "waapi-gate-controller.mjs").read_text(encoding="utf-8")
        code = code.replace("export function createGateMotion", "function createGateMotion")
        with sync_playwright() as pw:
            options = {"headless": True}
            exe = os.environ.get("SVG_SKILL_CHROMIUM_EXECUTABLE")
            if exe:
                options["executable_path"] = exe
            browser = pw.chromium.launch(**options)
            try:
                page = browser.new_page(reduced_motion="no-preference")
                # Known package fixture; namespace the two static inline instances.
                page.set_content('<div>' + source.replace("gate-", "first-gate-") + source.replace("gate-", "second-gate-") + '</div>')
                page.evaluate('() => {\n' + code + '\nwindow.createGateMotion = createGateMotion;\n}')
                state = page.evaluate('''async () => {
                  const roots = [...document.querySelectorAll('svg')];
                  window.controllers = roots.map(root => window.createGateMotion(root));
                  await new Promise(requestAnimationFrame);
                  window.closedTransform = getComputedStyle(roots[0].querySelector('[data-part="boom"]')).transform;
                  window.controllers[0].seek(.8);
                  await new Promise(requestAnimationFrame);
                  return roots.map(root => getComputedStyle(root.querySelector('[data-part="boom"]')).transform);
                }''')
                self.assertNotEqual(state[0], state[1])
                inside = page.evaluate('''() => {
                  const root = document.querySelector('svg');
                  const canvas = root.getBoundingClientRect();
                  const arm = root.querySelector('[data-part="boom"]').getBoundingClientRect();
                  return arm.top >= canvas.top + 3 && arm.bottom <= canvas.bottom - 3
                    && arm.left >= canvas.left + 3 && arm.right <= canvas.right - 3;
                }''')
                self.assertTrue(inside, "Peak arm pose must fit inside the viewport with paint margin.")
                page.emulate_media(reduced_motion="reduce")
                page.wait_for_function('getComputedStyle(document.querySelector("svg [data-part=boom]")).transform === window.closedTransform')
                result = page.evaluate('''() => {
                  const boom = document.querySelector('svg [data-part="boom"]');
                  boom.style.opacity = '.9'; // A host change must survive cleanup.
                  window.controllers[0].destroy();
                  window.controllers[0].destroy();
                  let threw = false;
                  try { window.controllers[0].seek(1); } catch (_) { threw = true; }
                  return {box: boom.style.transformBox, origin: boom.style.transformOrigin, opacity: boom.style.opacity, threw};
                }''')
                self.assertEqual(result["box"], "")
                self.assertEqual(result["origin"], "")
                self.assertEqual(result["opacity"], "0.9")
                self.assertTrue(result["threw"])
            finally:
                browser.close()


if __name__ == "__main__":
    unittest.main(verbosity=2)

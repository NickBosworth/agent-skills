#!/usr/bin/env python3
"""Capture reviewed, self-contained SVG at exact CSS/SMIL timeline positions.

Python 3.10+; optional dependency: playwright and a locally installed browser.
This is an isolated inline-SVG preview, NOT a sanitizer, an arbitrary HTML/JS
runner, an image-embedding test or an engine compatibility test.
"""
from __future__ import annotations

import argparse
import hashlib
import html
import importlib.metadata
import json
import math
import platform
import re
import sys
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from audit_svg import SVG_NS, audit_file, local_name

MAX_FRAMES = 240


def parse_size(value: str) -> tuple[int, int]:
    match = re.fullmatch(r"(\d+)[xX](\d+)", value)
    if not match:
        raise argparse.ArgumentTypeError("Use WIDTHxHEIGHT, for example 320x320.")
    width, height = map(int, match.groups())
    if not (1 <= width <= 4096 and 1 <= height <= 4096):
        raise argparse.ArgumentTypeError("Each dimension must be between 1 and 4096 CSS pixels.")
    return width, height


def sample_times(explicit: str | None, frames: int | None, duration: float | None) -> list[float]:
    """Fixed-count sequences omit the duplicated loop endpoint; explicit lists do not."""
    if frames is not None:
        if explicit is not None:
            raise ValueError("Use either --times or --frames/--duration, not both.")
        if not 1 <= frames <= MAX_FRAMES:
            raise ValueError(f"--frames must be between 1 and {MAX_FRAMES}.")
        if duration is None or not math.isfinite(duration) or not 0 < duration <= 86400:
            raise ValueError("--frames requires a finite --duration greater than 0 and at most 86400 seconds.")
        return [i * duration / frames for i in range(frames)]
    if duration is not None:
        raise ValueError("--duration is only used with --frames.")
    try:
        times = [float(part.strip()) for part in (explicit or "0").split(",")]
    except ValueError as exc:
        raise ValueError("--times must be comma-separated seconds.") from exc
    if not 1 <= len(times) <= MAX_FRAMES or any(not math.isfinite(t) or not 0 <= t <= 86400 for t in times):
        raise ValueError(f"Supply 1–{MAX_FRAMES} finite timestamps between 0 and 86400 seconds.")
    return times


def preflight(path: Path) -> tuple[str, dict[str, Any]]:
    report = audit_file(path, "web")
    blockers = [i for i in report["issues"] if i["severity"] == "error" or i["code"] in {"CSS_ESCAPES", "NON_DOCUMENT_TIMELINE"}]
    if blockers:
        detail = "\n".join(f"{i['code']}: {i['message']}" for i in blockers)
        raise ValueError(f"Capture preflight refused the source:\n{detail}\nReview the asset; do not bypass the check by deleting content blindly.")
    text = path.read_text(encoding="utf-8-sig")
    root = ET.fromstring(text)
    for e in root.iter():
        if not e.tag.startswith(f"{{{SVG_NS}}}"):
            raise ValueError("Capture accepts SVG-namespace elements only; review foreign metadata/content in a separate derivative.")
        if local_name(e.tag) in {"image", "feImage"}:
            raise ValueError("This capture tool deliberately refuses image/feImage dependencies.")
        for attr, value in e.attrib.items():
            if local_name(attr) == "href" and value.strip() and not value.strip().startswith("#"):
                raise ValueError("Capture accepts fragment-only hrefs; external links/resources need a different reviewed workflow.")
    return text, report


INSTALL_SOURCE = r"""async ({source, width, height}) => {
  const parsed = new DOMParser().parseFromString(source, 'image/svg+xml');
  if (parsed.querySelector('parsererror')) throw new Error('Browser XML parse failed');
  const root = document.importNode(parsed.documentElement, true);
  root.style.setProperty('width', width + 'px');
  root.style.setProperty('height', height + 'px');
  root.style.setProperty('display', 'block');
  document.body.firstElementChild.appendChild(root);
  const roots = [root, ...root.querySelectorAll('svg')];
  for (const svg of roots) { svg.pauseAnimations(); svg.setCurrentTime(0); }
  await document.fonts.ready;
  void root.getBoundingClientRect();
  await new Promise(requestAnimationFrame);
  const animations = document.getAnimations();
  for (const a of animations) {
    if (a.timeline && !(a.timeline instanceof DocumentTimeline)) {
      throw new Error('Non-document animation timeline is not supported');
    }
    a.pause();
  }
  await Promise.all(animations.map(a => a.ready));
  for (const a of animations) a.currentTime = 0;
  window.__svgReview = {root, roots, animations};
  return {cssAnimationCount: animations.length, svgTimelineCount: roots.length};
}"""

SEEK_SOURCE = r"""async (seconds) => {
  const {root, roots, animations} = window.__svgReview;
  for (const svg of roots) { svg.pauseAnimations(); svg.setCurrentTime(seconds); }
  for (const a of animations) { a.currentTime = seconds * 1000; }
  // Do not use screenshot animations:'disabled': it can cancel/fast-forward effects.
  await new Promise(requestAnimationFrame);
  await new Promise(requestAnimationFrame);
  const elements = [root, ...root.querySelectorAll('[id], [data-part]')].slice(0, 128);
  return {
    cssCurrentTimesMs: animations.map(a => a.currentTime),
    smilCurrentTimesSeconds: roots.map(svg => svg.getCurrentTime()),
    geometry: elements.map(e => {
      const style = getComputedStyle(e);
      let bbox = null;
      try {
        const b = e.getBBox();
        bbox = {x: b.x, y: b.y, width: b.width, height: b.height};
      } catch (_) { /* title/style/defs are not always graphics elements */ }
      const rect = e.getBoundingClientRect();
      return {tag: e.localName, id: e.id || null, part: e.getAttribute('data-part'),
        transform: style.transform, opacity: style.opacity, display: style.display,
        bbox, clientRect: {x: rect.x, y: rect.y, width: rect.width, height: rect.height}};
    })
  };
}"""


def write_gallery(out: Path, manifest: dict[str, Any]) -> None:
    figures = []
    for frame in manifest["frames"]:
        caption = f"Frame {frame['index']} · {frame['timeSeconds']:.6g} s"
        figures.append(f'<figure><img src="{html.escape(frame["file"])}" alt="{html.escape(caption)}"><figcaption>{html.escape(caption)}</figcaption></figure>')
    text = "<!doctype html><html lang='en'><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'><title>SVG frame review</title><style>body{font:16px system-ui;margin:2rem;background:#f1f3f5;color:#172b3a}main{display:flex;flex-wrap:wrap;gap:1rem}figure{margin:0;padding:1rem;background:white;border:1px solid #ccd4da}img{max-width:100%;height:auto;background:repeating-conic-gradient(#eef0f2 0 25%,white 0 50%) 0/16px 16px}figcaption{margin-top:.6rem}</style></head><body>"
    text += f"<h1>SVG frame review</h1><p>{html.escape(Path(manifest['source']).name)} · reduced motion: {manifest['reducedMotion']} · {html.escape(manifest['browser'])}</p><p>Captured frames are evidence to inspect, not an automatic visual-quality verdict.</p><main>{''.join(figures)}</main></body></html>"
    (out / "gallery.html").write_text(text, encoding="utf-8")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("svg", type=Path)
    parser.add_argument("--out", required=True, type=Path, help="New or empty output directory; existing files are never overwritten.")
    parser.add_argument("--size", type=parse_size, default=(320, 320), help="Viewport in CSS pixels, default 320x320.")
    parser.add_argument("--times", help="Comma-separated seconds; defaults to 0. Includes times exactly as supplied.")
    parser.add_argument("--frames", type=int, help="Evenly spaced frame count; excludes duplicate loop endpoint.")
    parser.add_argument("--duration", type=float, help="Seconds for --frames.")
    parser.add_argument("--scale", type=float, default=1, help="Device scale factor, 1–4; default 1.")
    parser.add_argument("--background", choices=["transparent", "white", "black", "checker"], default="transparent")
    parser.add_argument("--reduced-motion", action="store_true", help="Emulate the preference; do NOT forcibly remove author animation.")
    parser.add_argument("--color-scheme", choices=["light", "dark"], default="light")
    parser.add_argument("--browser", choices=["chromium", "firefox", "webkit"], default="chromium")
    parser.add_argument("--executable", type=Path, help="Optional trusted Chromium executable; normally use the Playwright-managed browser.")
    parser.add_argument("--reviewed", action="store_true", help="Acknowledge that the SVG source has been reviewed; this tool is not a hostile-input sandbox.")
    args = parser.parse_args(argv)
    if not args.reviewed:
        parser.error("Review the SVG source, then pass --reviewed. Unknown or hostile input needs approved sanitisation and isolation first.")
    if not math.isfinite(args.scale) or not 1 <= args.scale <= 4:
        parser.error("--scale must be a finite number between 1 and 4.")
    if args.size[0] * args.size[1] * args.scale ** 2 > 16777216:
        parser.error("Scaled output exceeds the 16-megapixel safety budget.")
    if args.executable and args.browser != "chromium":
        parser.error("--executable is supported only for Chromium in this tool.")
    try:
        times = sample_times(args.times, args.frames, args.duration)
        source, audit = preflight(args.svg)
        if args.out.exists() and (not args.out.is_dir() or any(args.out.iterdir())):
            raise ValueError("--out must be a new or empty directory. Choose another path; this tool never overwrites existing output.")
        if args.executable and not args.executable.is_file():
            raise ValueError("--executable does not name an existing file.")
    except (ValueError, OSError) as exc:
        print(str(exc), file=sys.stderr)
        return 2
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("Optional capture dependency is missing. Install requirements-render.txt in a virtual environment, then run: python -m playwright install chromium", file=sys.stderr)
        return 2

    out = args.out.resolve()
    manifest: dict[str, Any] = {
        "tool": "agentic-skills-svg-art-and-animation/render", "version": "1.0.0", "status": "incomplete",
        "createdUtc": datetime.now(timezone.utc).isoformat(),
        "source": str(args.svg.resolve()), "sourceSha256": audit["sha256"],
        "browser": args.browser, "python": platform.python_version(), "platform": platform.platform(),
        "playwright": importlib.metadata.version("playwright"),
        "viewportCssPixels": {"width": args.size[0], "height": args.size[1]}, "deviceScaleFactor": args.scale,
        "background": args.background, "reducedMotion": args.reduced_motion, "colorScheme": args.color_scheme,
        "embedding": "isolated-inline-svg; root CSS width/height fitted to requested viewport",
        "timing": "seconds on SMIL clocks; milliseconds on paused CSS/Web Animation objects instantiated at load",
        "visualReview": "not-performed-by-tool", "audit": audit, "frames": [],
        "limitations": ["Not a security sanitizer or hostile-content service", "Not an img/object embedding or real host-application test", "No arbitrary JavaScript, event-triggered setup, scroll/view timeline or engine playback", "Bounding boxes do not fully represent filters/strokes/markers/painted extents", "System fonts/browser versions can change pixels"],
    }
    background = {
        "transparent": "transparent", "white": "white", "black": "black",
        "checker": "repeating-conic-gradient(#e4e7eb 0 25%,white 0 50%) 0/16px 16px",
    }[args.background]
    harness = f"""<!doctype html><html><head><meta charset='utf-8'>
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; img-src 'none'; font-src 'none'; connect-src 'none'; object-src 'none'; base-uri 'none'; frame-src 'none'">
<style>html,body{{margin:0;padding:0;width:100%;height:100%;overflow:hidden;background:{background}}}body>div{{width:100%;height:100%;overflow:hidden}}</style></head><body><div></div></body></html>"""
    try:
        with sync_playwright() as pw:
            launch_options: dict[str, Any] = {"headless": True}
            if args.executable:
                launch_options["executable_path"] = str(args.executable.resolve())
            browser = getattr(pw, args.browser).launch(**launch_options)
            try:
                manifest["browserVersion"] = browser.version
                context = browser.new_context(
                    viewport={"width": args.size[0], "height": args.size[1]},
                    device_scale_factor=args.scale, color_scheme=args.color_scheme,
                    reduced_motion="reduce" if args.reduced_motion else "no-preference",
                    offline=True, service_workers="block", accept_downloads=False,
                )
                context.route("**/*", lambda route: route.abort())
                page = context.new_page()
                page.set_default_timeout(15000)
                page.on("dialog", lambda dialog: dialog.dismiss())
                errors: list[str] = []
                page.on("pageerror", lambda error: errors.append(str(error)))
                page.set_content(harness, wait_until="load")
                manifest["timelines"] = page.evaluate(INSTALL_SOURCE, {"source": source, "width": args.size[0], "height": args.size[1]})
                out.mkdir(parents=True, exist_ok=True)
                for index, seconds in enumerate(times):
                    state = page.evaluate(SEEK_SOURCE, seconds)
                    filename = f"frame-{index:04d}.png"
                    data = page.screenshot(path=str(out / filename), omit_background=args.background == "transparent", animations="allow", caret="hide")
                    manifest["frames"].append({"index": index, "timeSeconds": seconds, "file": filename, "sha256": hashlib.sha256(data).hexdigest(), "state": state})
                manifest["pageErrors"] = errors
                if errors:
                    raise RuntimeError("Browser reported page errors; see manifest.json.")
                manifest["status"] = "captured"
                write_gallery(out, manifest)
            finally:
                browser.close()
    except Exception as exc:
        manifest["error"] = str(exc)
        if out.is_dir():
            (out / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
        print(f"Capture failed: {exc}\nFor a missing browser run: python -m playwright install {args.browser}", file=sys.stderr)
        return 2
    (out / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"Captured {len(times)} frame(s) to {out}\nOpen gallery.html and inspect the actual PNGs; capture is not a visual-quality verdict.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

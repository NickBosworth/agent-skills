#!/usr/bin/env python3
"""Read-only SVG engineering lint. Python 3.10+, standard library only.

This is NOT a complete SVG validator, CSS parser or security sanitizer.
Exit status: 0 = no blocking issues, 1 = findings, 2 = CLI/input failure.
No source file is ever modified. Policies are intentionally conservative.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import re
import sys
import xml.etree.ElementTree as ET
from collections import Counter
from pathlib import Path
from typing import Any
from urllib.parse import unquote

SVG_NS = "http://www.w3.org/2000/svg"
ANIMATION_TAGS = {"animate", "animateTransform", "animateMotion", "set"}
DEFAULT_MAX_BYTES = 4 * 1024 * 1024
URL_RE = re.compile(r"url\(\s*(['\"]?)(.*?)\1\s*\)", re.I | re.S)
NUMBER_RE = re.compile(r"[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?")
PATH_TOKEN_RE = re.compile(r"[MmZzLlHhVvCcSsQqTtAa]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?")
ARIA_REFS = {"aria-labelledby", "aria-describedby", "aria-controls", "aria-owns", "aria-activedescendant"}


def local_name(name: str) -> str:
    """Strip an expanded XML namespace without changing letter case."""
    return name.rsplit("}", 1)[-1]


def finite_numbers(value: str) -> list[float] | None:
    """Parse a whitespace/comma-separated list, rejecting non-finite values."""
    try:
        parts = re.split(r"[\s,]+", value.strip())
        numbers = [float(part) for part in parts if part]
    except ValueError:
        return None
    return numbers if all(math.isfinite(n) for n in numbers) else None


def morph_signature(value: str) -> tuple[str, ...]:
    """Cheap *explicit* command/number-slot signature, not path normalisation.

    Relative/absolute commands remain different. Implicit command packs are not
    expanded. Equal signatures do not establish valid geometry/correspondence.
    """
    return tuple(t if t.isalpha() else "#" for t in PATH_TOKEN_RE.findall(value))


def audit_text(text: str, profile: str = "web", source: str = "<memory>") -> dict[str, Any]:
    if profile not in {"web", "portable", "godot"}:
        raise ValueError(f"Unknown policy: {profile}")
    issues: list[dict[str, str]] = []
    result: dict[str, Any] = {"source": source, "profile": profile, "issues": issues, "stats": {}}

    def issue(severity: str, code: str, location: str, message: str) -> None:
        issues.append(dict(severity=severity, code=code, location=location, message=message))

    # Reject declarations before handing input to the standard-library parser.
    # Conservative: a declaration-like string in a comment is also rejected.
    if re.search(r"<!\s*(?:DOCTYPE|ENTITY)\b", text, re.I):
        issue("error", "XML_DECLARATION", "/", "DTD/entity declarations are not accepted; use a reviewed plain SVG derivative.")
        return result
    if re.search(r"<\?xml-stylesheet\b", text, re.I):
        issue("error", "XML_STYLESHEET", "/", "External processing-instruction stylesheets are not self-contained.")
    try:
        root = ET.fromstring(text)
    except ET.ParseError as exc:
        issue("error", "XML_PARSE", "/", str(exc))
        return result
    if root.tag != f"{{{SVG_NS}}}svg":
        issue("error", "SVG_ROOT", "/", "Expected <svg xmlns='http://www.w3.org/2000/svg'> as the root.")

    elements = list(root.iter())
    if len(elements) > 50000:
        issue("error", "ELEMENT_LIMIT", "/", "More than 50,000 elements; review complexity before rendering.")
        return result
    ids: dict[str, ET.Element] = {}
    locations: dict[ET.Element, str] = {}
    tags = Counter(local_name(e.tag) for e in elements)
    refs: list[tuple[str, str]] = []
    css_chunks: list[str] = []

    viewbox = finite_numbers(root.get("viewBox", ""))
    if not viewbox or len(viewbox) != 4 or viewbox[2] <= 0 or viewbox[3] <= 0:
        issue("error", "VIEWBOX", "/svg", "Require a finite four-number viewBox with positive width and height.")
    for dim in ("width", "height"):
        val = root.get(dim)
        if val is None:
            issue("warning", "INTRINSIC_SIZE", "/svg", f"No root {dim}; verify intrinsic size and host layout.")
        elif re.fullmatch(r"[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?(?:px)?", val.strip()):
            num = float(val.strip().removesuffix("px"))
            if not math.isfinite(num) or num <= 0:
                issue("error", "DIMENSION", "/svg", f"Root {dim} must be positive and finite.")
        elif val.strip().lower() in {"nan", "inf", "+inf", "-inf", "infinity"}:
            issue("error", "DIMENSION", "/svg", f"Root {dim} is not finite.")

    for index, e in enumerate(elements):
        tag = local_name(e.tag)
        ident = e.get("id")
        loc = f"{tag}#{ident}" if ident else f"{tag}[{index}]"
        locations[e] = loc
        if ident is not None:
            if not ident or re.search(r"\s", ident):
                issue("error", "ID_SYNTAX", loc, "An authored ID must be non-empty and contain no whitespace.")
            if ident in ids:
                issue("error", "DUPLICATE_ID", loc, f"Duplicate ID: {ident}")
            ids[ident] = e
        if tag.lower() == "script":
            issue("error", "SCRIPT", loc, "Executable SVG script requires a separate, explicitly trusted application workflow.")
        if tag.lower() == "foreignobject":
            issue("error", "FOREIGN_OBJECT", loc, "foreignObject is outside this self-contained authoring policy.")
        if tag == "image":
            issue("warning" if profile == "web" else "error", "RASTER_IMAGE", loc, "Embedded/linked image content needs explicit review; it is not editable vector geometry.")
        if e.tag.startswith("{") and not e.tag.startswith(f"{{{SVG_NS}}}"):
            issue("warning", "FOREIGN_NAMESPACE", loc, "Non-SVG namespace content may be editor metadata or require a different consumer.")
        if tag == "style":
            css_chunks.append("".join(e.itertext()))
            if profile != "web":
                issue("error", "STATIC_CSS", loc, "Conservative static policy requires resolved presentation attributes, not a stylesheet.")
        if profile != "web":
            if tag in ANIMATION_TAGS:
                issue("error", "STATIC_ANIMATION", loc, "Export static components; animate in the target runtime.")
            if tag in {"text", "tspan", "textPath"}:
                issue("error", "STATIC_TEXT", loc, "Resolve text for this conservative derivative or render text in the host; preserve editable source.")
            if tag in {"filter", "mask", "pattern"}:
                issue("error", "STATIC_EFFECT", loc, f"{tag} requires target-specific verification; outside this conservative static policy.")

        for expanded_attr, value in e.attrib.items():
            attr = local_name(expanded_attr)
            attr_loc = f"{loc}/@{attr}"
            if attr.lower().startswith("on"):
                issue("error", "EVENT_ATTRIBUTE", attr_loc, "Event-handler-like attributes are not accepted in this authoring policy.")
            if expanded_attr == "{http://www.w3.org/XML/1998/namespace}base":
                issue("error", "XML_BASE", attr_loc, "xml:base can change reference resolution; remove only through a reviewed conversion.")
            if attr == "href":
                v = value.strip()
                if v.startswith("#"):
                    refs.append((attr_loc, unquote(v[1:])))
                elif v:
                    if tag == "a" and re.match(r"https?://", v, re.I):
                        issue("warning", "EXTERNAL_LINK", attr_loc, "External navigation link: review its destination; capture refuses non-local hrefs.")
                    else:
                        issue("error", "EXTERNAL_REFERENCE", attr_loc, "Non-fragment reference (including data URLs) is outside the self-contained policy.")
            if attr in ARIA_REFS:
                refs.extend((attr_loc, r) for r in value.split())
            if attr == "style":
                css_chunks.append(value)
                if profile != "web":
                    issue("error", "STATIC_STYLE_ATTRIBUTE", attr_loc, "Resolve inline CSS into supported presentation attributes for the conservative derivative.")
            # URL references can appear in presentation attributes as well as CSS.
            for _, url in URL_RE.findall(value):
                url = url.strip()
                if url.startswith("#"):
                    refs.append((attr_loc, unquote(url[1:])))
                else:
                    issue("error", "EXTERNAL_URL", attr_loc, "Non-local CSS/presentation URL requires explicit review.")
            if profile != "web" and re.search(r"\bcurrentColor\b|\bvar\s*\(", value, re.I):
                issue("error", "INHERITED_PAINT", attr_loc, "Resolve inherited colour/CSS variables for the conservative static derivative.")
            if tag in ANIMATION_TAGS and attr in {"begin", "end"}:
                for part in value.split(";"):
                    # Includes syncbase and eventbase IDs; deliberately not a full SMIL grammar.
                    match = re.match(r"\s*([A-Za-z_][\w:.-]*)\.(?:begin|end|repeat\([^)]*\)|[A-Za-z_]\w*)(?:\s*[+-].*)?\s*$", part)
                    if match:
                        refs.append((attr_loc, match.group(1)))

    for index, css in enumerate(css_chunks):
        loc = f"css[{index}]"
        # Strip CSS comments before common-pattern checks (not full tokenisation).
        plain = re.sub(r"/\*.*?\*/", "", css, flags=re.S)
        if re.search(r"@import\b", plain, re.I):
            issue("error", "CSS_IMPORT", loc, "Imported CSS is not self-contained.")
        if "\\" in plain:
            issue("warning", "CSS_ESCAPES", loc, "CSS escapes exceed the checker's simple URL/selector parsing; manually review before capture.")
        if re.search(r"\b(?:animation|transition)-timeline\s*:", plain, re.I):
            issue("warning", "NON_DOCUMENT_TIMELINE", loc, "Scroll/view-driven timelines are not supported by the fixed-time capture tool.")
        for _, url in URL_RE.findall(plain):
            url = url.strip()
            if url.startswith("#"):
                refs.append((loc, unquote(url[1:])))
            else:
                issue("error", "EXTERNAL_URL", loc, "Non-local CSS URL requires explicit review.")

    seen_refs: set[tuple[str, str]] = set()
    for loc, ident in refs:
        if (loc, ident) in seen_refs:
            continue
        seen_refs.add((loc, ident))
        if ident not in ids:
            issue("error", "MISSING_REFERENCE", loc, f"Local ID target does not exist: {ident!r}")

    all_css = "\n".join(css_chunks)
    css_motion = bool(re.search(r"@(?:-webkit-)?keyframes\b|(?:^|[;{\s])animation(?:-name)?\s*:", all_css, re.I))
    smil_count = sum(tags[t] for t in ANIMATION_TAGS)
    if profile == "web":
        labelled = bool(root.get("aria-label", "").strip() or root.get("aria-labelledby", "").strip())
        labelled = labelled or any(local_name(c.tag) == "title" and "".join(c.itertext()).strip() for c in root)
        decorative = root.get("aria-hidden", "").lower() == "true" or root.get("role") in {"none", "presentation"}
        if not labelled and not decorative:
            issue("warning", "ACCESSIBLE_NAME", "/svg", "Decide informative versus decorative semantics; no obvious inline accessible name is present.")
        if (css_motion or smil_count) and "prefers-reduced-motion" not in all_css:
            issue("warning", "REDUCED_MOTION_REVIEW", "/svg", "No embedded reduced-motion query found; verify a host policy or provide a meaningful fallback.")
        if smil_count:
            issue("info", "SMIL_REVIEW", "/svg", "CSS animation:none does not cancel SMIL. Verify visible reduced-motion output and the real embedding context.")

    for e in elements:
        tag = local_name(e.tag)
        if tag not in ANIMATION_TAGS:
            continue
        loc = locations[e]
        if tag in {"animate", "set"} and not e.get("attributeName"):
            issue("error", "ANIMATION_ATTRIBUTE", loc, "Missing attributeName.")
        duration = e.get("dur", "")
        if duration and re.fullmatch(r"[-+]?\d*\.?\d+(?:ms|s|m|min|h)?", duration):
            number = NUMBER_RE.match(duration)
            if number and float(number.group()) <= 0:
                issue("warning", "ANIMATION_DURATION", loc, "Non-positive duration: verify this is intentional; it may produce no visible interpolation.")
        values = [v.strip() for v in e.get("values", "").split(";")] if e.get("values") else []
        if any(not v for v in values):
            issue("error", "ANIMATION_VALUES", loc, "Empty entry in SMIL values.")
        if e.get("keyTimes") and e.get("calcMode") != "paced":
            times = finite_numbers(e.get("keyTimes", "").replace(";", " "))
            if times is None or any(t < 0 or t > 1 for t in times) or times != sorted(times):
                issue("error", "KEY_TIMES", loc, "keyTimes must be finite, ordered numbers in [0,1].")
            elif values and len(times) != len(values):
                issue("error", "KEY_TIMES_COUNT", loc, "keyTimes and values counts do not match.")
        if e.get("calcMode") == "spline":
            splines = e.get("keySplines", "").split(";")
            valid = all((nums := finite_numbers(s)) is not None and len(nums) == 4 and all(0 <= n <= 1 for n in nums) for s in splines)
            if not valid or (values and len(splines) != len(values) - 1):
                issue("error", "KEY_SPLINES", loc, "Expected four [0,1] values per spline and one spline per interpolation interval.")
        if e.get("attributeName") == "d" and e.get("calcMode") != "discrete":
            states = values or [e.get("from", ""), e.get("to", "")]
            states = [s for s in states if s]
            if len(states) >= 2 and len({morph_signature(s) for s in states}) != 1:
                issue("warning", "MORPH_SIGNATURE", loc, "Explicit command/number-slot signatures differ. Normalise intentionally and inspect intermediate shapes; this is not a full path parser.")

    result["stats"] = {
        "elements": len(elements), "paths": tags["path"], "ids": sorted(ids),
        "viewBox": viewbox, "smilAnimations": smil_count, "cssMotionDetected": css_motion,
        "localReferences": len(seen_refs), "tags": dict(sorted(tags.items())),
    }
    # Attribute and style scans can detect the same URL; keep the report compact.
    unique = {json.dumps(i, sort_keys=True): i for i in issues}
    result["issues"] = list(unique.values())
    return result


def audit_file(path: Path, profile: str = "web", max_bytes: int = DEFAULT_MAX_BYTES) -> dict[str, Any]:
    """Read bounded UTF-8 input. Decode policy is intentionally narrower than XML."""
    path = Path(path)
    try:
        with path.open("rb") as stream:
            raw = stream.read(max_bytes + 1)
        if len(raw) > max_bytes:
            raise ValueError(f"File exceeds {max_bytes} bytes; review input size before increasing --max-bytes.")
        text = raw.decode("utf-8-sig")
    except (OSError, UnicodeError, ValueError) as exc:
        return {"source": str(path), "profile": profile, "stats": {}, "issues": [
            {"severity": "error", "code": "INPUT", "location": str(path), "message": str(exc)}]}
    report = audit_text(text, profile, str(path))
    report["sha256"] = hashlib.sha256(raw).hexdigest()
    report["bytes"] = len(raw)
    return report


def compare_baseline(report: dict[str, Any], baseline: dict[str, Any]) -> None:
    """Check only root viewBox and removed IDs; not geometry/style equivalence."""
    issues = report["issues"]
    if any(i["severity"] == "error" for i in baseline["issues"]):
        issues.append(dict(severity="error", code="BASELINE_INVALID", location="/svg", message="Baseline has audit errors; inspect it before relying on contract comparison."))
        return
    current, original = report["stats"], baseline["stats"]
    if current.get("viewBox") != original.get("viewBox"):
        issues.append(dict(severity="error", code="CONTRACT_VIEWBOX", location="/svg", message="Root viewBox differs from the supplied baseline."))
    for ident in sorted(set(original.get("ids", [])) - set(current.get("ids", []))):
        issues.append(dict(severity="error", code="CONTRACT_ID_REMOVED", location="/svg", message=f"Baseline ID was removed or renamed: {ident}"))


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("paths", nargs="+", type=Path, help="SVG files or explicitly scoped directories (recursive, no symlink files).")
    parser.add_argument("--profile", choices=["web", "portable", "godot"], default="web")
    parser.add_argument("--baseline", type=Path, help="Compare one input file against an original's viewBox and IDs.")
    parser.add_argument("--json", action="store_true", help="Emit machine-readable JSON to stdout.")
    parser.add_argument("--fail-on-warning", action="store_true")
    parser.add_argument("--max-bytes", type=int, default=DEFAULT_MAX_BYTES)
    args = parser.parse_args(argv)
    if args.max_bytes <= 0:
        parser.error("--max-bytes must be positive")
    paths: list[Path] = []
    for p in args.paths:
        if p.is_dir():
            paths.extend(sorted(f for f in p.rglob("*") if f.is_file() and not f.is_symlink() and f.suffix.lower() == ".svg"))
        else:
            paths.append(p)
    paths = list(dict.fromkeys(paths))
    if not paths:
        parser.error("No SVG files found in the supplied scope.")
    if args.baseline and len(paths) != 1:
        parser.error("--baseline requires exactly one input SVG")
    reports = [audit_file(p, args.profile, args.max_bytes) for p in paths]
    if args.baseline:
        compare_baseline(reports[0], audit_file(args.baseline, args.profile, args.max_bytes))
    counts = Counter(i["severity"] for r in reports for i in r["issues"])
    if args.json:
        print(json.dumps({"tool": "svg-art-and-animation/audit", "version": "1.0.0", "reports": reports, "counts": dict(counts)}, indent=2))
    else:
        for report in reports:
            print(f"\n{report['source']} [{report['profile']}]")
            for i in report["issues"]:
                print(f"  {i['severity'].upper()} {i['code']} ({i['location']}): {i['message']}")
            if not report["issues"]:
                print("  No findings in this limited policy check.")
        print(f"\n{len(reports)} file(s); {counts['error']} error(s), {counts['warning']} warning(s), {counts['info']} note(s).")
    if any(i["code"] == "INPUT" for r in reports for i in r["issues"]):
        return 2
    return 1 if counts["error"] or (args.fail_on_warning and counts["warning"]) else 0


if __name__ == "__main__":
    sys.exit(main())

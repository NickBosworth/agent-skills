# Verification, optional tools and acceptance

## A layered gate, not one magic check

First check structure and the existing contract. Then inspect visuals and behaviour. Finally test the real consumer. Record those as separate results. A successful parse does not prove a path is valid; a screenshot does not prove motion is smooth; a Chromium preview does not prove Godot import or all-browser behaviour.

### Read-only audit

```text
python "SKILL_ROOT/scripts/audit_svg.py" asset.svg --profile web
python "SKILL_ROOT/scripts/audit_svg.py" asset.svg --profile portable
python "SKILL_ROOT/scripts/audit_svg.py" asset.svg --profile godot
python "SKILL_ROOT/scripts/audit_svg.py" edited.svg --baseline original.svg --json
python "SKILL_ROOT/scripts/audit_svg.py" path/to/scoped-assets --fail-on-warning
```

Files or explicit directories are accepted. Directory traversal is recursive and skips symlink files. No default whole-repository scan, network fetch, auto-fix or source rewrite occurs. `--json` emits to stdout; redirect to a report file when needed. Input uses UTF-8/UTF-8 BOM and a 4 MiB default file limit. `--max-bytes` deliberately increases the latter after review.

Exit codes: **0** means no policy-blocking finding; **1** means errors or warnings promoted by `--fail-on-warning`; **2** means input/CLI failure. Informational SMIL review notes do not fail a run.

Checks include XML well-formedness, root namespace/viewBox, some intrinsic dimension issues, duplicate/empty IDs, common local references, ARIA IDREFs, common SMIL timing references, active/external content, a few animation parameter errors, a cheap morph signature and conservative static-export policies.

`--baseline` compares root viewBox numerically and checks for removed IDs. It does not compare every shape, transform, label, root size, style, anchor or external consumer. Use a source diff and visual/integration checks as well. Approved contract changes should be explained, not hidden to obtain a green check.

This is not full SVG validation, a complete CSS/path parser, a topology normaliser, a sanitizer, an optimiser or an accessibility certification. Regex-based CSS inspection cannot cover every escaped/indirect syntax. A missing reduced-motion query is a review prompt; the presence of one does not prove it works.

### Timed browser capture

After reviewing the source and installing the optional dependencies:

```text
python "SKILL_ROOT/scripts/render_svg.py" asset.svg --out artifacts/review --size 320x320 --times 0,0.2,0.7,1.2 --reviewed
python "SKILL_ROOT/scripts/render_svg.py" asset.svg --out artifacts/review-reduced --size 320x320 --times 0,0.2,0.7 --reduced-motion --reviewed
python "SKILL_ROOT/scripts/render_svg.py" loop.svg --out artifacts/loop --frames 24 --duration 2.4 --reviewed
```

The output directory must be new or empty. Existing files are not overwritten. Outputs are PNG frames, a static HTML gallery and `manifest.json`. A failed capture may leave a manifest marked `incomplete`; do not pass it off as a complete review.

Useful options: `--background transparent|white|black|checker`; `--scale 1..4` for device scale; `--color-scheme light|dark`; `--browser chromium|firefox|webkit` after installing that browser. `--executable` supports an explicitly chosen, trusted Chromium binary only; the normal path uses the Playwright-managed browser. This release's execution tests used Chromium, not all the selectable engines.

The viewport is in CSS pixels. Root CSS width/height are fitted to that viewport, while the source viewBox/aspect-ratio policy still controls content. This deliberately emulates a simple isolated inline host; verify intrinsic sizing and actual embedding separately. A wrong chosen aspect ratio can therefore reveal letterboxing rather than silently stretching the drawing.

The renderer pauses and seeks SMIL via SVG clocks, and pauses instantiated CSS/Web Animation objects before assigning their current time. It captures with animations allowed because screenshot-level disabling can cancel/fast-forward effects. It retains animation objects between frames, including effects that finish later. Sources: S8 and S9.

`--frames N --duration T` samples `i*T/N`, omitting a duplicate endpoint. Explicit `--times` preserves the supplied order and can include seams/endpoints. Delays are part of the timeline; a requested 0.2 seconds is not 20% progress unless the duration/offset make it so. Times are finite seconds, limited to 240 frames and a bounded output pixel budget.

Reduced-motion mode **emulates the preference**, rather than forcibly freezing an otherwise broken implementation. Hidden SMIL clocks may continue to be sampled while the actual static fallback is displayed. If reduced-mode frames still visibly move, fix the asset; do not hack the capture tool to hide the defect.

Do not use this tool for arbitrary page JavaScript, procedural animation, scroll/view timelines, event-triggered setup or remote assets. For those, instrument the trusted host application's state/clock. It does not pack sprite atlases, make videos or produce an engine rig.

## Visual and behavioural review

Inspect intended sizes, transparent/light/dark contexts where relevant, first/fallback frame, extrema, intermediate poses and final state. For loops sample the seam on both sides, not just an exact duplicate endpoint. For finite animations verify the retained/returned state after completion. For morphs inspect winding, holes, contour correspondence and shape collapse at intermediate values.

Check pivots, clipped paint/filter extents, labels, optical balance, path/stroke joins and small-size readability. A geometric bounding box in the manifest is diagnostic data, not a complete painted-pixel bound.

For controlled components, test two independently operating instances, interrupted/reversed playback, unmount cleanup, preference changes and host semantics. For engine assets, import into the installed engine and inspect anchors, texture sizes, filtering, zoom and representative instance counts.

Use visual judgement only when the actual frames were opened by a visual-capable reviewer. A text-only agent should provide the gallery and mark inspection pending. Do not infer a smooth animation solely from fixed frame samples; inspect live playback when continuous motion quality matters.

## Before/after optimisation

Run the same scene/size/times in the same browser/environment. Compare source contracts, integration tests and representative images. Differences in fonts, OS or browser can affect pixels, so hashes are useful only for appropriate controlled comparisons. Rendering manifests record versions and input hashes to make that distinction visible.

## Run this package's tests

From the skill root:

```text
python -m unittest discover -s tests -p "test_*.py" -v
python tests/browser_checks.py
node --check assets/waapi-gate-controller.mjs
```

The first suite has no non-standard dependencies. The browser suite requires Playwright + Chromium. `node --check` is optional syntax validation for the sample module; Node is not required by either Python utility. With an existing Chromium, set `SVG_SKILL_CHROMIUM_EXECUTABLE` to its trusted executable path for the browser tests.

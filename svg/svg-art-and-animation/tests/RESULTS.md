# Release verification — 1.0.0

Build date: **2 October 2026**.

## Checks actually executed

| Check | Observed result |
| --- | --- |
| Standard-library unit/support tests | **45 passed**, including reference checks, XML/active-content policies, baseline invariants, CLI behaviour, input limits and sampling rules. |
| Optional Chromium integration tests | **8 passed**, including CSS seeking, SMIL sampling/repeat, genuine reduced-motion output, repeatable frame hashes, static components, missing-fallback detection, independent WAAPI instances, preference changes, pose bounds and cleanup. |
| JavaScript module syntax | `node --check assets/waapi-gate-controller.mjs` passed. |
| Skill frontmatter and packaging checks | Required field types/lengths, name/folder match, metadata string values and short main-file limit checked with a local validation script. This was not the official `skills-ref` CLI. |
| Markdown references | 17 local Markdown links resolved before release. |
| SVG fixtures | All three fixtures passed the web policy without errors; the component fixture also passed the conservative Godot policy. That is not an engine import test. |
| Visual review | The included contact sheet was opened and inspected: CSS intermediate/final states, corresponding SMIL shapes and return pose, reduced-motion static outputs, and closed/open WAAPI gate poses. |

## Environment actually used

- Linux; Python **3.13.5**.
- Playwright Python **1.57.0**.
- Chromium **144.0.7559.96**, selected from a locally installed executable.
- Node.js **22.16.0** for the optional module syntax check.

The dependency range can select a different Playwright 1.x release on installation. Browser versions, operating systems and fonts can change pixels; frame hashes are not a promise of identical cross-platform rasterisation.

## Evidence

The actual run logs are `evidence/unit-tests.txt` and `evidence/browser-tests.txt`. The inspected contact sheet is [evidence/visual-review.png](evidence/visual-review.png). Its rows show CSS times, SMIL times, reduced-motion samples and WAAPI poses. It is supporting evidence, not an automatic visual-quality or accessibility certification.

The blank CSS frame at time zero is the authored beginning of a short reveal; the unanimated base and reduced-motion state are the complete status mark. The SMIL example's reduced-motion branch is visually static even though the hidden timeline is not removed.

The gate fixture's open-pose bounds were checked and its hinge placement adjusted to keep the full arm within the viewport. The controller cleanup test also verifies that an unrelated host opacity change is retained.

## Not tested / not claimed

Native Windows execution; live discovery inside OpenCode/Codex/Claude Code; Firefox or WebKit execution; real `<img>`/`<object>` embedding; actual Godot import/playback; production-scale performance; hostile-input security; full SVG/CSS/path correctness; full accessibility conformance; cross-model skill quality.

Fixed-frame inspection is not a claim that continuous playback has been perceptually evaluated at every frame. The behavioural prompts in `SCENARIOS.md` are supplied for future agent evaluations and were not executed across models here.

The checker is a limited engineering lint tool, not a sanitizer or full standards validator. The capture tool is for reviewed self-contained source, not a hostile-upload service.

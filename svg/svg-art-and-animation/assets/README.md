# Original examples and planning templates

These are small, readable fixtures demonstrating techniques, not a comprehensive art library or a mandatory visual style. Open the SVGs directly in a suitable browser for a quick preview; use the capture tool for timed evidence. Their internal CSS/SMIL behaviour is not an engine rig.

| File | Demonstrates |
| --- | --- |
| `css-status.svg` | Finite ring/mark reveal, pathLength-based stroke drawing, explicit transform box, useful static base, CSS reduced motion. |
| `smil-morph.svg` | Corresponding cubic segments, spline timing, repeat seam and a visually static reduced-motion branch. |
| `component-gate.svg` | Portable static geometry, fixed parent placement, local boom pivot and distinct component groups. |
| `waapi-gate-controller.mjs` | Trusted-host play/pause/seek/cleanup, independent instances and live reduced-motion preference handling. |
| `asset-contract.example.json` | Illustrative project planning convention; not a consumed or validated runtime schema. |
| `review-report.template.md` | Explicitly separates checks executed, visuals inspected and work still pending. |

## Controlled gate example

Insert the actual contents of `component-gate.svg` inline in the host component, using a stable per-instance ID namespace. After it has mounted in a trusted application module:

```javascript
import { createGateMotion } from './waapi-gate-controller.mjs';

// Query within your component, not globally across all SVGs on the page.
const svg = componentElement.querySelector('svg');
const motion = createGateMotion(svg, { durationMs: 1800 });
motion.seek(0.8); // Seconds, paused for inspection.
// motion.play(); motion.pause();
// On component unmount:
// motion.destroy();
```

This illustrative gate opens and closes once. It is not a production state machine, and its closed reduced-motion state is specific to the demo. In a real controlled gate, snap to the actual semantic open/closed state instead of erasing state information. The controller owns only `transform-box` and `transform-origin` inline properties and preserves unrelated host style changes when destroyed.

The Python capture helper does not load this module. Test host JavaScript in the real application or a trusted application harness, as demonstrated by the optional browser integration tests.

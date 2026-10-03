# Animation: design first, then choose a mechanism

## Define the behaviour

Write a compact timeline/state table before implementing complex motion. Include target element, property, base state, start/delay, duration, easing, key poses, loop count/direction, trigger, interruption behaviour and reduced-motion state. Use seconds in the design and document conversions at API boundaries.

Choose motion to communicate something: progress, confirmation, cause and effect, attention, or a character state. Do not default every element to a perpetual loop. For a finite confirmation, the end frame should remain legible; for a loading loop, provide equivalent static state information and any required pause controls.

Easing is a design choice. Use linear timing for constant-speed rotation or uniform progress; use gentle ease-out for settling and smooth endpoint derivatives for an idle oscillation. Avoid pronounced overshoot where it makes UI state ambiguous. Repeated motions need compatible positions and velocities at the seam, not merely matching screenshots at start and end.

## Mechanism selection

**CSS** fits declarative transforms, opacity and stroke reveals. Scope selectors and keyframes. Distinguish the SVG presentation `transform` attribute from the CSS `transform` property: an animated CSS transform can replace what was intended as static placement. Put fixed translation on one group and animated rotation/scale on a child. For CSS pivots, set an explicit `transform-box` and `transform-origin`; for literal joints consider local-origin geometry. Source: S7.

**SMIL** fits SVG-native attribute changes, path motion and compatible path morphing. Verify `attributeName`, target, begin/dur, repeatCount, fill and interpolation. SVG `fill="freeze"` is a timing attribute on the animation, not a shape paint instruction. Use explicit pivot coordinates for `animateTransform` rotation where suitable. Do not call SMIL universally deprecated or universally supported in all SVG consumers. Source: S5.

**WAAPI/host JavaScript** fits play/pause/seek, interactive state transitions and application orchestration. Reuse a suitable installed library rather than automatically introducing one. Verify the current API and licensing before adding a library. Cancel animations and listeners on destruction; preserve the current pose on interruption, or explicitly define restart semantics. Author deterministic state setters for screenshot tests; arbitrary timers or spring simulations cannot be accurately sampled merely by setting an SVG clock. Sources: S8 and S9.

## Stroke drawing

Use a stable base path and animate `stroke-dashoffset`. Normalising with `pathLength="1"` is useful when the target supports it; test the actual consumer. Avoid percentage assumptions about path length. Rounded caps can leave a dot at the nominally hidden endpoint. Set the meaningful fallback in base attributes, then apply the reveal effect; do not make content permanently invisible when animations are unavailable.

## Path morphing

Choose a morph only when its shapes have sensible correspondence. Establish the same subpath count/order, winding direction, closure and segment correspondence. Convert to a consistent command representation when needed; handle relative versus absolute coordinates, shorthand expansion and implicit repeated segments. Compatible syntax is necessary but not sufficient: compare intermediate shapes for twisting, collapsing holes or unintended self-intersections. Source: S6.

For a difficult morph, resample/rebuild paths with deliberate anchors or use a tested normaliser already available. State topology compromises. A crossfade, clipping reveal or component transform may be more robust. Never “repair” a shape by dropping points until counts match.

The bundled audit only compares a cheap explicit-command/numeric-slot signature for SMIL `d` values. It is not a full path parser or a topology normaliser. Equivalent compact forms can warn; matching signatures can still animate badly. It skips the compatibility warning for `calcMode="discrete"`, where interpolation is not intended.

## Characters and reusable rigs

Separate body placement, facing, limb pivots and secondary motion. Use named joints and a consistent ground/contact anchor. Begin with idle and one movement cycle, then add states. Keep feet/contact points plausible, avoid random jitter every frame, and use seeded variation where multiple characters should differ reproducibly.

Do not require path morphing for a joint rotation. Do not let visual idle bobbing change simulation position or navigation. For four directions, document mirroring policy, handedness, attachment continuity and z-order rather than assuming a left-facing flip is always acceptable.

## Reduced motion is not one CSS line

For CSS, prefer a legible base/final state with the relevant animations disabled under `prefers-reduced-motion`. For controlled motion, listen for preference changes and stop/reduce only the non-essential effects while preserving state information.

CSS `animation: none` does not stop SMIL. For self-contained SMIL, a practical visual fallback is a separately drawn static state with the animated branch hidden under the media query. This suppresses the visible motion, not necessarily the hidden timeline's computation. A host controller can explicitly pause/remove SMIL when required. The example uses the static-branch method. Reduced motion also does not automatically supply every pause/stop mechanism required by the host interface. Sources: S10 and S11.

# Web integration and controlled SVG

## Treat each instance as an independent component

Keep the actual SVG geometry local to the component. Scope styling; rewrite all fragment and accessibility references consistently when assigning a unique instance prefix. Do not use global `document.querySelector()` to control the first matching asset. Query within the supplied root. Test two instances with separate controls on the same page.

Choose the embedding explicitly. An image URL is excellent for an isolated illustration but does not expose individual paths to page code. Inline SVG allows DOM control but interacts with the document's CSS and ID space. The isolated capture tool intentionally does not verify host CSS, SSR, focus handling or image embedding. Source: S4.

## Controlled motion interface

For a reusable host animation, prefer a small interface such as:

```text
play()                  start/resume according to the defined behaviour
pause()                 retain the current pose
seek(timeSeconds)       deterministic inspection; clarify loop/delay semantics
setState(state)         update semantic UI state, not just visual decoration
destroy()               cancel effects and detach listeners
```

Not every asset needs every method. Avoid constructing a universal motion framework for a single checkmark.

The sample `assets/waapi-gate-controller.mjs` returns `play`, `pause`, `seek` and `destroy` for the supplied gate SVG. It is a finite open/close **demonstration**, not a production gate state machine. It retains the current time on pause, updates for reduced-motion changes, and does not autoplay. Its base artwork remains meaningful after destruction. Integrate it into a trusted host module, not by putting JavaScript into an image SVG.

## Frameworks and lifecycle

Read the host project's current framework version and conventions before changing integration. In Svelte or other SSR-capable frameworks, create browser animations after the DOM exists, keep SSR output static and stable, and destroy on unmount. Do not run `window` access at module initialisation on the server. Do not repeatedly recreate effects on unrelated reactive updates. Preserve external component props/public APIs unless a change is intentional and approved.

For interactive states, define what happens on rapid reversal, disabled state, cancelled operations, navigation and hidden tabs. Do not leave stale callbacks that overwrite a newer state. Keyboard access, focus appearance, accessible name and state belong in the host control; decorative SVG movement is not the control itself.

## Deterministic testing

For CSS/SMIL, the bundled renderer seeks clocks. For host WAAPI effects, use an application test adapter that constructs effects before seeking and exposes the relevant state. For procedural `requestAnimationFrame`, physics or timers, expose a pure `renderAt(time, state, seed)` path or drive the application's clock. Do not claim arbitrary JavaScript has been frozen by `getAnimations()`.

Include both slow/fast interaction and separate instances in integration tests. Verify reduced-motion changes after initial render, not only on page load. Test output inside the real host element at intended sizes, colour schemes and scale factors. Sources: S8–S10.

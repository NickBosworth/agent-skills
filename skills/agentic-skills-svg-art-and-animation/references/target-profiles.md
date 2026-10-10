# Choose the consumer before the implementation

These are recommended delivery profiles, not claims that every renderer implements the full SVG specification. Re-check the actual consumer and installed version. Technical sources: [SOURCES.md](../SOURCES.md), especially S4, S5 and S12.

| Profile | Suitable delivery | Preferred motion | Important boundary |
| --- | --- | --- | --- |
| `web-static` | Browser image or inline icon | None | Choose external image versus inline styling deliberately. |
| `web-self-contained` | `.svg` opened in a browser, or used as an image | Embedded CSS; SMIL when appropriate | No dependency on page scripts, page CSS variables or external fonts. |
| `web-controlled` | Inline SVG in an application | Existing CSS/WAAPI/timeline tooling | Lifecycle, multi-instance scoping, controls and interruption matter. |
| `portable-static` | Design exchange, conservative renderers, build assets | None in the delivered SVG | Resolve fonts, inherited style and effects deliberately; test the real importer. |
| `godot-components` | SVG source/components + engine scene | Engine transform/state animation | An imported SVG texture is not a collection of addressable SVG groups. |
| `baked-frames` | PNG sequence/sprite sheet/video pipeline | Bake a source timeline | Frame times, alpha, bounds and playback metadata become part of the contract. |

The checker exposes `web`, `portable` and `godot` policy names. These are **lint policies**, not separate rendering backends or exhaustive conformance validators. `portable` and `godot` intentionally flag some features that particular renderers may support. Do not rewrite a working project just to silence a conservative policy warning.

## Browser embedding is not interchangeable

With an inline SVG, host code can address elements and host CSS can interact with them. Scope styles: an SVG `<style>` inserted inline should not be treated as a private stylesheet. Root IDs, fragment references, classes and keyframe names can collide with sibling instances.

SVG used as an `<img>` or CSS image has an image context. It does not provide the host with its internal DOM or run its embedded JavaScript. Declarative animation is a separate matter: do not incorrectly claim that every SVG image must be static. Test embedded CSS/SMIL in the actual consumer. Use the HTML image's `alt`, or empty `alt` for decoration, rather than assuming the internal `<title>` will supply the accessible name.

Opening an SVG directly, embedding it in `<object>`, and importing it as a texture each have different constraints. A direct browser preview is not proof of all three. Do not recommend `<object>` just to evade image-context limitations; consider the active-content/security consequences and integration needs.

## Defaults when context is sparse

Preserve an existing target. For a new UI component already inside an app, use that app's established framework and animation system. For a downloadable self-contained animation, avoid requiring a CDN library or page script. For an engine asset, start with portable static components and explicit anchors. State the assumption before building a substantial asset family.

For print/email/document consumers, prefer a tested static variant; do not promise browser motion survives export. Raster output is a derivative, not an editable SVG replacement.

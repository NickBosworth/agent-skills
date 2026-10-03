# SVG source and engine-native assets

This is an optional profile for game work. Do not apply it to an unrelated web asset. Use the actual engine/project version, not a blanket historical claim.

## What an SVG import does and does not give you

Godot's ordinary SVG texture workflow rasterises by default. Current documentation also describes DPITexture/runtime rasterisation options. These are texture workflows, not a browser DOM, CSS/SMIL playback engine or automatic conversion of every SVG group into an engine node. Verify feature support and import settings in the installed version. Source: S12.

For a reusable articulated actor or prop, retain SVG as editable source and produce separate components or prepared regions for native 2D composition. Animate the engine's nodes/transforms/state system. A single SVG file containing named groups is not, by itself, an engine rig.

## Asset contract

For an asset family, define a machine-readable project contract with:

- Source coordinate system, shared scale, intended zoom range, and stroke/palette rules.
- Ground/contact anchor, local pivots and attachment sockets with units.
- Part names, draw order, facing rules, recolouring regions and allowed variation.
- Exported component filenames/regions, intended import dimensions and engine mappings.
- States, clip durations, event meanings, loop policy and ownership boundaries.

Use `assets/asset-contract.example.json` as a planning starting point, not a built-in engine format. Its example dimensions/palette are illustrative, not mandatory project choices. Document how the project consumes its own contract; the supplied scripts do not generate engine scenes or validate this JSON automatically.

## Recommended architecture

Keep the core simulation independent from rendering. Navigation position, state transitions, scheduling and task outcomes should not depend on an SVG clock or a visual animation callback. A visual adapter reads state and chooses presentation. Animation may interpolate visual pose but must not mutate simulation truth.

For a modular character, share a rig and reusable component definitions. Use deterministic appearance choices keyed by a stable seed. Keep luggage/equipment attachments continuous across states and facings. Where four-direction output is needed, explicitly specify foreground/background limb order and whether mirroring preserves the intended asymmetry.

Prefer transform animation for rigid parts. Use a limited number of native nodes and reusable textures; cache colour/facing variants where measured costs warrant it. Do not generate and rasterise a fresh SVG per character per frame. Prototype the expected on-screen population and zoom levels before expanding the asset catalogue; report actual profiling numbers, not assumed capacity.

## Conservative export policy

The `godot` audit profile rejects active animation, embedded/style CSS, text, external resources, raster embedding and some advanced effects as a conservative baseline. This deliberately exceeds the minimum restrictions of some Godot versions. Use presentation attributes, supported basic geometry and explicit colours for portable derivatives. A warning/error from this policy is not proof the engine can never render that feature.

Preserve the richer editable source when flattening is needed. Test import, intended pixel size, filtering, mipmaps where relevant, recolouring and anchor alignment in the engine. A Chromium preview is not an engine import test.

## Baked frames only when that is the requested target

For a loop of duration `T` at `N` frames, sample `i*T/N` for `i = 0..N-1`; do not include a duplicate `T` frame in the playback strip. Seam **review** may additionally sample `T−epsilon`, `T` and `T+epsilon`. Include FPS/duration, frame order, bounds, pivot, colour/alpha policy and padding/extrusion expectations for a packed atlas.

The bundled renderer makes PNG frames and a review gallery. It does **not** pack an atlas, export GIF/video, create Godot scenes or guarantee engine-ready performance. Use the project's existing exporter/packer and verify playback after import.

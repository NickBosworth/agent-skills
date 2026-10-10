# Structure, geometry and non-destructive editing

## Inventory and preserve

Record `viewBox`, root width/height, `preserveAspectRatio`, namespace declarations, relevant IDs, layers/groups, transforms, CSS selectors, text styling, definitions, fragment references and animation hooks. Search host code for consumers of IDs/classes. Read the actual source, not only a rendered thumbnail.

For a narrow edit, change the smallest subtree or attribute set. XML reserialization may alter prefixes, formatting and significant text whitespace. A diff is part of review. Keep the original file in version control or as an explicit baseline; do not silently reformat a large asset library.

Treat an ID as a potentially public API. Renaming requires updating `url(#...)`, `href`/`xlink:href`, ARIA IDREFs, CSS selectors, SMIL timing references and external consumers. Namespace collisions become especially visible when two instances appear on one page. A filename prefix solves asset-to-asset collisions, not repeated instances of the same asset.

## Geometric discipline

Use a finite, positive-width/height `viewBox`; preserve an existing coordinate contract. Use root dimensions for intended intrinsic size, with the host controlling layout as required. Do not “fix” a mismatch by stretching artwork without permission. Percentage sizes, `preserveAspectRatio` and nested viewports should be verified in context.

Prefer circles, rectangles and simple strokes for genuine primitives. Use paths where curvature or a compound shape requires them. Choose a repeatable grid, corner radii, stroke weights and padding. Judge at the actual small display size, not only at a large editor zoom. A narrow stroke that disappears at 16 px is not rescued by valid path data.

For literal anchors, place geometry near a local origin and compose parent transforms. SVG transform order matters. Do not remove nested groups or bake transforms without checking masks, stroke scaling, gradient coordinates, pivot semantics and consumers. Preserve `vector-effect` deliberately rather than adding it everywhere.

Specify clipping and masking units intentionally. Distinguish hard clipping from alpha/luminance masks. Expand filter regions only when needed and test the painted extent; default or aggressive filter bounds can crop shadows and glows. `getBBox()` is not a complete measurement of every painted pixel, filter or marker.

## Layers and names

Choose deterministic readable names such as `gate-hinge`, `gate-boom`, `gate-title`. Group by semantic component or independent motion. Preserve z-order. Avoid IDs like `path7319` in new authored assets; do not rename legacy IDs without a reason. Share definitions only when they really share appearance/behaviour. A reused `<symbol>` is not automatically a good independently animated rig part.

For repeated UI components, accept an instance-specific prefix from the caller or use the framework's stable ID mechanism. Do not generate fresh random IDs on every render; that can complicate SSR/hydration and break references. Keep CSS class and keyframe scoping separate from ID replacement.

## Typography and data graphics

Keep text editable when the consumer supports the agreed fonts. Do not ship font binaries or presume a local font exists elsewhere. For a portable outlined-text derivative, retain the editable source and explain the loss of text semantics. In a game, consider engine-rendered labels rather than baking all text into SVG.

For charts, derive coordinates from actual data and verify domains, units, ticks, baselines, rounding and legends. Do not invent missing observations. For diagrams, preserve node identities, directionality, cardinality and label associations. Optimise the layout only after verifying the meaning. Use a layout engine already in the project when appropriate rather than manually guessing hundreds of coordinates.

## Conversion and optimisation

A screenshot cannot recover original paths, layers or fonts. Label reconstruction or tracing as approximation, not lossless conversion. Do not replace an editable vector deliverable with a PNG hidden inside an SVG.

Keep a source/delivery split when optimisation is useful. Inspect SVGO's installed configuration; do not assume defaults preserve groups, IDs or morph topology. Review ID cleanup, group collapse, path conversion/merge, attribute cleanup, hidden element removal and metadata removal. A prefix plugin does not by itself guarantee instance uniqueness or rewrite all external host references. Render representative before/after frames and compare the integration hooks. Sources: S6, S13, S14.

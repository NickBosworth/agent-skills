# Voxel art and asset pipeline

Use when voxel models are game assets or when imported volume data feeds editable objects. First decide whether gameplay needs interior cells or only the rendered surface. For fixed models, use the engine's normal asset path; do not create a terrain engine merely to retain a voxel appearance.

## Inspect one representative source

Record the authoring tool/version, format, source model units, axes, intended pivot, palette/materials, hierarchy, layers, animation, and any collision/attachment markers. Keep authoring sources and import settings reproducible. Test a representative model before mass conversion.

For MagicaVoxel, consult the author's [base format](https://github.com/ephtracy/voxel-model/blob/master/MagicaVoxel-file-format-vox.txt) and [extension specification](https://github.com/ephtracy/voxel-model/blob/master/MagicaVoxel-file-format-vox-extension.txt). Base voxel/color data does not describe the entire extended scene: transforms, groups, layers, material properties and animation-related records require explicit support. A parser that reads only one model's cell coordinates may appear successful while losing scene placement or other content. Inspect the selected importer's implementation and fixtures.

## Choose a reproducible route

| Need | Route to investigate | Acceptance evidence |
| --- | --- | --- |
| Fixed voxel-styled prop | Export/import a surface mesh, typically through an engine-supported interchange format | Scale, pivot, appearance and collision in the target build |
| Art scene with multiple models | Preserve hierarchy/transforms or deliberately bake them | All visible parts in the correct position; hidden layers handled intentionally |
| Animated character | Preserve animation through a supported export or split/rig parts in a normal DCC workflow | Clips, pivots, attachments and playback work after reimport |
| Editable/destructible object | Preserve occupancy/material volume separately from derived mesh | Interior edits, remeshing, collision and persistence agree |
| Repeated scenery | Reuse shared mesh/materials and appropriate instancing | Bounds, culling, material variation and resource lifetime |

Treat these as workflow candidates, not guarantees that a particular importer supports every row. Godot documents its supported [3D import formats](https://docs.godotengine.org/en/stable/tutorials/assets_pipeline/importing_3d_scenes/available_formats.html). Three.js provides an official [VOXLoader](https://threejs.org/docs/pages/VOXLoader.html); inspect the installed revision for the actual chunks/features it handles. Verify other engine importers against their pinned versions rather than assuming native `.vox` support.

## Preserve meaning through conversion

Define one coordinate conversion for positions, rotations and normals; apply it consistently to hierarchy, animation and collision. Convert cell scale into game units once. Test a deliberately asymmetric object with colored axis markers so a mirrored or rotated import is obvious.

Keep a palette index separate from a persistent gameplay material identity. Choose whether the shader consumes vertex colors, a texture palette, atlas or texture array. Check color space, alpha/cutout rules, roughness/metalness and emissive behavior under representative lighting. A color match in an unlit preview does not establish a material match in the game.

Remove hidden interior faces where appropriate for a fixed surface model. Preserve hard normals at intended voxel edges. If merging faces, preserve shading/material/texture equivalence; do not smooth away the requested visual style. Avoid one engine object per cell for a dense static prop unless the object count is demonstrably acceptable.

Define collision independently: a simple prop may use a small compound shape; detailed static scenery may need a static mesh collider; movable or destructible objects need the engine's supported dynamic path. Do not assume a concave visual mesh is suitable for a dynamic rigid body.

For fractured/destructible volumes, agree on disconnected-component behavior, mass/center-of-mass approximation, collider generation, and fragment budgets. Cap tiny fragments and define retirement/pooling. Destruction is an optional gameplay subsystem, not a requirement for voxel art.

## Verify the import, not just the file

Use a small fixture set: asymmetric single model, multi-model scene, nested transform, hidden layer, transparency/emission, and an animated sample when applicable. Check scale, placement, pivot, colors, normals, collision and animation in the actual engine. Reimport after changing the source and ensure authored gameplay components are preserved through the intended inheritance/import workflow.

Run the packaged/exported build because editor import caches and authoring tools may hide missing runtime assets. Compare bounds and draw/triangle/material counts for a repeated-prop scene. Keep screenshots or an inspection record alongside the actual import settings; do not claim an unrendered conversion is visually correct.

The routing and acceptance procedures here are original engineering recommendations. The linked specifications establish file and importer behavior; they do not guarantee a complete game asset pipeline.

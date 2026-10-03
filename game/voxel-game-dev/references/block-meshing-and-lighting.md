# Block meshing, materials and lighting

Use this workflow for worlds built from discrete cells. Confirm whether cells contain full cubes, partial models or both; algorithms for full opaque cubes do not automatically handle every block type.

## Contents

- [Inspect and establish an oracle](#inspect-and-establish-an-oracle)
- [Define face visibility](#define-face-visibility)
- [Implement and verify greedy merging](#implement-and-verify-greedy-merging)
- [Handle textures and render passes](#handle-textures-and-render-passes)
- [Add local AO and propagated light](#add-local-ao-and-propagated-light)
- [Invalidate and commit derived results](#invalidate-and-commit-derived-results)
- [Choose acceptance fixtures](#choose-acceptance-fixtures)

## Inspect and establish an oracle

Inspect chunk dimensions, indexing, neighbour lookup, render material allocation, face winding, mesh upload and collider creation. Capture a reproducible scene and measure rebuilding separately from rendering before replacing a working mesher.

Implement or retain a simple exposed-face reference: for each owned cell, evaluate its six directed interfaces and emit the visible ones. Keep this implementation small enough to inspect. [Lysenko's original meshing article](https://0fps.net/2012/06/30/meshing-in-a-minecraft-game/) describes exposed-face and greedy approaches and the tradeoff between smaller meshes and rebuild latency. Use its algorithmic ideas; measure performance on the actual target.

For ordinary opaque full cubes surrounded by air, require these oracle results:

| Fixture | Exposed unit faces |
| --- | --- |
| Empty volume | 0 |
| One cell | 6 |
| Two face-adjacent cells | 10 |
| Isolated solid `N` by `N` by `N` volume | `6*N*N` |

Do not apply these counts to special internal interfaces, transparent materials or a volume whose surrounding cells are solid.

## Define face visibility

Model directed interface visibility as a policy of both cells, the face direction and relevant shape coverage. Do not reduce every decision to `neighbour != air`.

Record expected outcomes for opaque/air, opaque/opaque, water/air, water/water, glass/glass, different transparent media and partial models. Decide whether a material interface needs zero, one or two directed surfaces. Avoid accidental coplanar duplicates. Keep collision occupancy and light transmission separate from the rendering rule.

For slabs, stairs or arbitrary models, use verified face coverage/culling metadata or a suitable model mesher. A cube's six-face oracle is a limited reference, not a substitute for shape-aware culling. Treat fluid level geometry as its own policy if gameplay requires it.

## Implement and verify greedy merging

Sweep directed slices, build a mask of visible face descriptors, then merge compatible rectangles. Use a deterministic traversal order so failures are reproducible. Keep opposite directions distinct even when they lie in the same plane. [Lysenko's follow-up](https://0fps.net/2012/07/07/meshing-minecraft-part-2/) explicitly addresses type and orientation separation.

Define a conservative merge descriptor from the properties that must survive the merge:

```text
face descriptor:
    direction and geometric plane
    material / texture layer and texture orientation
    render pass, tint and other shader-visible attributes
    shading compatibility, including vertex AO / baked light
```

Do not blindly equate a block ID with a face material: top, bottom and side faces may differ. Do not merge across a UV rotation or material boundary. For arbitrary vertex lighting, prove that interpolation over the larger rectangle preserves the required values, or retain subdivisions. Matching only the four outer corners can erase interior lighting changes.

Verify output by expanding each greedy rectangle into its oriented unit-face identities and comparing that set, including material semantics, with the oracle. Require exact coverage without overlaps, reversed faces or extra surfaces. Counts alone can hide a missing face compensated by an extra one elsewhere.

**Heuristic:** enable greedy meshing when measured draw/geometry cost justifies its rebuild complexity. A two-stage quick mesh followed by refinement is optional; add it only with revision handling and evidence that it improves the game's latency budget.

## Handle textures and render passes

Choose texture arrays when their format, dimensions, sampling and platform support fit the game. Otherwise design an atlas with explicit tile borders, mip generation and wrapping behaviour. Check the selected engine/backend rather than inheriting old platform assumptions.

Test repeated textures across a long merged quad. Simple atlas UV wrapping can produce both cross-tile mip contamination and incorrect derivative-based mip selection at wrapping discontinuities; [Lysenko's atlas analysis](https://0fps.net/2013/07/09/texture-atlases-wrapping-and-mip-mapping/) distinguishes these failures. Padding the base texture alone does not prove that the full mip chain is correct.

Separate opaque, cutout and blended rendering where the engine requires it. Establish transparency sorting and depth-write behaviour; excessive merging of transparent surfaces may conflict with sorting granularity. Inspect oblique angles, distance, mip transitions and neighbouring high-contrast tiles. Verify materials in the shipping renderer.

## Add local AO and propagated light

For full-cube local vertex AO, evaluate the two side cells and the diagonal corner relevant to the face vertex. Handle the case where both side cells occlude, independent of the diagonal. Keep vertex ordering consistent across orientations and quad diagonal selection. [Lysenko's AO article](https://0fps.net/2013/07/03/ambient-occlusion-for-minecraft-like-worlds/) supplies the neighbourhood rule and explains shading-sensitive merging and diagonal interpolation.

Treat that AO model as an appearance heuristic. Partial models, translucent media or an art-directed light curve require a documented adaptation. AO does not establish sunlight visibility, emission propagation or global illumination.

For propagated block light, specify sources, attenuation, opaque barriers, sky boundaries and unloaded regions. Implement both addition and removal: removing a source or adding an obstruction must invalidate formerly lit paths. Define how independent surviving sources relight the affected region. Test light crossing a chunk border, opening and closing a cave, and removing one of two overlapping sources.

Keep lighting state/version distinct from geometry when their update rates differ. A mesh using baked vertex lighting depends on the sampled light values even when block occupancy is unchanged.

## Invalidate and commit derived results

Derive invalidation from the actual reads. Axial face visibility, diagonal AO and propagated lighting have different dependency sets. Editing a corner can invalidate a diagonally adjacent chunk's shading; updating only six axial neighbours is insufficient for every mesher.

Acquire a consistent input snapshot or use the project's locking model. Capture geometry, neighbour, material and lighting revisions that affect output. Before upload, reject results whose dependencies changed or whose chunk was unloaded/replaced. Do not let a late job restore an obsolete mesh or collider.

Bound queued work and retained input memory; prioritize interaction near the player. Production implementations document substantial neighbouring-data and locking costs; [Voxel Tools' performance discussion](https://voxel-tools.readthedocs.io/en/latest/performance/) is evidence for measuring these operations rather than assuming worker threads make them free. Its historical engine timings are not universal budgets.

## Choose acceptance fixtures

- Checkerboards, isolated cells, long walls, internal cavities and mixed top/side materials.
- The same world meshed whole and partitioned, including negative coordinates and chunk face/edge/corner edits.
- All local AO occupancy combinations and nonuniform AO on both quad diagonals.
- Atlas/array textures at grazing angles, mip transitions, UV rotations and high-contrast neighbouring tiles.
- Transparent interfaces, partial models and selected fluid levels, with their declared visibility expectations.
- Deliberately reordered jobs after edits, lighting changes and unload/reload.
- Large world positions and the target renderer to expose precision-sensitive seams; do not assume greedy T-junctions are always harmless or always defective.

Stop optimization after the agreed correctness and frame/edit budgets pass. Preserve profiling evidence and unresolved renderer-specific limitations with the implementation handoff.

# Smooth terrain and level of detail

Use this reference after choosing a sampled scalar-field representation. Implement a verified single-resolution surface first unless an existing tested LOD implementation already supplies the required pipeline.

## Contents

- [Establish field semantics](#establish-field-semantics)
- [Choose surface extraction](#choose-surface-extraction)
- [Implement a single-resolution slice](#implement-a-single-resolution-slice)
- [Add LOD with an explicit seam contract](#add-lod-with-an-explicit-seam-contract)
- [Integrate editing and streaming](#integrate-editing-and-streaming)
- [Verify geometry and behaviour](#verify-geometry-and-behaviour)

## Establish field semantics

Inspect the generator, brush operations, stored sample format and existing material encoding. Record sample positions, world units, isolevel, sign, interpolation and quantization. Never mix tables or code fragments with different sign, corner-numbering or winding conventions.

Choose a signed convention and use it everywhere. For example, with negative-inside values and isolevel zero:

```text
plane(p)  = dot(unit_normal, p) - offset
sphere(p) = length(p - centre) - radius
surface   = positions where field(p) == 0
```

These analytic fixtures are useful references for geometry and normals. Keep material identity separate from the sign test so a cut can expose the intended interior material.

Do not treat arbitrary density values as exact distances. [Voxel Tools describes both exact distance intuition and practical clamping/approximation](https://voxel-tools.readthedocs.io/en/latest/smooth_terrain/). Use field magnitude for safe marching or penetration correction only if the required distance bound is established. Quantization and clipping can change small features and interpolation; include them in the chosen representation's error budget.

## Choose surface extraction

Inspect an existing engine integration before proposing a replacement. Select the simplest validated algorithm that satisfies the game's editing, topology, materials, scale and performance requirements.

| Candidate | Require before adopting | Main validation concern |
| --- | --- | --- |
| Marching Cubes variant | Known table conventions and ambiguity policy | Consistent shared faces, topology and interpolation |
| Surface nets | Defined vertex placement and connectivity | Non-manifold cases and ownership across chunks |
| Dual contouring | Useful Hermite intersections/normals and stable QEF solver | Degeneracy, escaped vertices and adaptive connectivity |
| Transvoxel integration | Compatible regular mesher and supported LOD sampling relationship | Transition orientation, shared samples and seam coverage |

Conventional compact Marching Cubes lookup tables can leave ambiguity unresolved; [Lewiner and colleagues provide a topology-aware MC33 implementation](https://thomas.lewiner.org/pub/marching_cubes_jgt.html). Choose validated ambiguity handling when topology matters. Do not fabricate missing tables or infer correctness from a sphere screenshot.

[Dual contouring's original paper](https://www.cs.rice.edu/~jwarren/papers/dualcontour.pdf) requires edge intersections and normals and explicitly addresses unstable or nearly singular QEF systems. Treat stable solving, rank-deficient cases and vertex placement policy as part of the implementation. An unconstrained matrix inverse is not a complete solver. If using surface nets, document its topology limitations; [Lysenko's implementation discussion](https://0fps.net/2012/07/12/smooth-voxel-terrain-part-2/) is a useful starting reference rather than a current performance benchmark.

**Heuristic:** prefer a maintained engine-compatible implementation over a new advanced mesher when its behaviour and licence fit. Prototype custom extraction when requirements genuinely need it, and preserve a reference mode.

## Implement a single-resolution slice

1. Generate a finite analytic fixture with surrounding sample context.
2. Define one owner for every output cell; supply shared boundary samples without duplicate output ownership.
3. Apply one consistent sign classification, including exact-isolevel values.
4. Extract positions using the chosen algorithm's conventions.
5. Produce stable normals and material attributes.
6. Upload geometry and construct collision using engine-supported APIs.
7. Verify the fixture before adding noise, streaming or LOD.

For an edge with scalar endpoints `f0` and `f1`, interpolate an isolevel `k` using:

```text
t = (k - f0) / (f1 - f0)
p = p0 + t * (p1 - p0)
```

Only apply this where the algorithm establishes a crossing. Define behaviour for equal/near-equal endpoints, exact zeros and nonfinite samples; do not hide invalid input by indiscriminately clamping every result. Use a consistent edge identity if sharing vertices or intersection caches.

Compute normals from the actual field or another documented surface rule. Central differences require additional samples around the gradient query. Normalize safely and choose a fallback for a zero/invalid gradient. Verify that normals point outward under the selected sign convention. Local coordinates can reduce numeric error; persistent world identity remains global.

## Add LOD with an explicit seam contract

Establish the projected error or distance rule, supported levels, update hysteresis, neighbour restrictions and behaviour while replacement geometry is pending. Choose a measurable visual target rather than an arbitrary maximum LOD count.

[Transvoxel joins resolutions at exactly a 2:1 sampling relationship through transition cells](https://transvoxel.org/). Preserve its required sample relationships, compatible regular-cell behaviour and orientation conventions. Do not assume it stitches arbitrary independently generated meshes or any resolution ratio. Use [the author's official tables](https://github.com/EricLengyel/Transvoxel), record the imported revision and retain their licence when redistributing them.

For a Transvoxel-style implementation:

1. Enforce supported neighbouring LOD differences or provide the required intermediate levels.
2. Obtain shared coarse/fine samples according to the implementation's sampling contract.
3. Generate regular and transition cells with consistent ownership and winding.
4. Handle all six boundary orientations and combinations at edges/corners.
5. Commit a coherent replacement or retain a valid older surface while dependencies are pending.

Do not hide a sampling/ownership bug with arbitrary skirts or welding. Those techniques can be deliberate visual compromises, but they must have explicit collision and topology implications. Independent noise reevaluation, averaging and decimation are not interchangeable coarse-field policies: choose one compatible with the mesher and test feature loss.

## Integrate editing and streaming

Apply edits to authoritative samples or the project's versioned edit representation. Update every affected output dependency: geometry, gradients, materials, collision, transition meshes and relevant coarse representations.

Define brush bounds in sample space, including interpolation and normal dependencies. When maintaining coarse caches, specify how edits propagate and when a coarse level becomes valid again. A change confined visually to one fine chunk may still invalidate adjacent transitions.

Capture revisions for all inputs to asynchronous jobs, including LOD assignment and transition neighbours. Reject stale results; do not combine a new fine mesh with an incompatible old transition. Keep collider replacement and navigation behaviour explicit so players cannot fall through a temporary edit boundary.

Prioritize nearby interaction, bound generation/mesh queues and measure upload/collision work separately. The performance benefit of fewer polygons can be lost to rebuilding, allocations or synchronization; choose budgets from the actual game and target hardware.

## Verify geometry and behaviour

Use independently specified expected outcomes, not only snapshots produced by the implementation itself:

- Constant positive and negative fields: no internal surface.
- Planes in every orientation: correct position, winding and normal direction.
- A contained sphere: expected closed component, finite geometry and bounded surface error.
- Saddle/ambiguous cells, exact isolevel samples and nearly equal endpoints: deterministic resolution without holes or invalid vertices.
- Thin walls, small cavities and sharp features: document the smallest reliably represented scale at each LOD.
- Whole-volume versus chunked extraction: agreement on shared boundaries, including negative coordinates and differing generation order.
- Every supported coarse/fine face orientation, a cave entrance and a surface tangent to the boundary: seam coverage under static and changing LOD.
- Edits during LOD changes and delayed jobs: no obsolete geometry or mismatched transitions replacing current results.

Check indices, finite positions/normals, duplicate or degenerate triangles and boundary-edge ownership. For closed manifold fixtures, require the appropriate two-face edge incidence and component expectations; do not impose closed-manifold assertions on intentionally open chunks or algorithms that permit non-manifold output.

Pair structural checks with screenshots and collision traversal in the target build. Report measured visual/latency limits. Passing a reference mesher's own tests does not establish correctness of an unconnected production mesher.

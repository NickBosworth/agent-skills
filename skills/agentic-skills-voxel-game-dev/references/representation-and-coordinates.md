# Representation, coordinates and picking

Use this reference to establish the data and spatial contracts before implementing storage, terrain editing, meshing or voxel queries. Preserve a working project's conventions unless evidence justifies a migration.

## Contents

- [Choose the representation](#choose-the-representation)
- [Record the spatial contract](#record-the-spatial-contract)
- [Implement chunk arithmetic](#implement-chunk-arithmetic)
- [Separate ownership from dependencies](#separate-ownership-from-dependencies)
- [Specify voxel picking](#specify-voxel-picking)
- [Verify the contracts](#verify-the-contracts)

## Choose the representation

Inspect the requested gameplay, existing world data, editing tools, collision requirements and import pipeline. Ask about a consequential unresolved choice once, with the consequences and a justified recommendation. Do not assume that a voxel aesthetic requires a runtime voxel terrain engine.

| Requirement | Candidate starting point | Decision to establish |
| --- | --- | --- |
| Voxel-shaped authored scenery or characters | Imported meshes, instances and ordinary engine collision | Whether gameplay needs editable volume data at all |
| Place/remove discrete blocks | Material or occupancy cells in chunks | Full cubes versus partial models; transparency and collision rules |
| Sculpt caves or continuous terrain | Samples of a scalar field plus material data | Sampling convention, isolevel, brush semantics and surface extraction |
| Preserve sharp features in an adaptive volume | Hermite data with a suitable dual-contouring implementation | Reliable intersections/normals, stable solving and adaptive connectivity |

Treat these as design candidates, not a mandatory hierarchy. A small finite object may need no streaming; an existing engine extension may already solve terrain storage and editing. Combine representations only after defining which owns interaction and how their boundaries meet.

Distinguish scalar-field values from exact distances. An isosurface uses a threshold of a scalar field; a signed distance field additionally describes distance to a surface. Approximate or clamped fields can be useful for meshing, but their magnitudes are not automatically safe sphere-tracing steps or exact collision distances. See [Voxel Tools' field explanation](https://voxel-tools.readthedocs.io/en/latest/smooth_terrain/) and the [original dual-contouring paper](https://www.cs.rice.edu/~jwarren/papers/dualcontour.pdf) for the differing data requirements.

**Default heuristic:** for a new block-building game, start with a finite chunked occupancy/material world and exposed-face meshes. Introduce additional representation complexity when gameplay or measured limits require it.

## Record the spatial contract

Write down the following in the project's existing architecture location, with a tiny worked example:

1. Axis directions, handedness, up axis and engine front-face winding.
2. Voxel size, world origin and mapping between voxel coordinates and engine positions.
3. Whether a stored value belongs to a cell, its centre or a lattice sample.
4. Chunk dimensions and array indexing order; do not silently interchange axis order.
5. Integer ranges, valid world bounds and out-of-range behaviour.
6. For fields, the isolevel, sign convention, quantization and interpolation rule.
7. Material identifiers and the separate meanings of solid, collidable, opaque and light-blocking.
8. Policies for missing data and for edits into unloaded regions.

For a uniform grid with voxel size `s > 0` and world-space origin `o`, a cell can own the half-open interval `[o + w*s, o + (w+1)*s)` on each axis. Its centre is `o + (w+0.5)*s`. Use `floor((p-o)/s)` for position-to-cell mapping, subject to the defined floating-point boundary policy.

For transformed terrain, transform queries into grid space first. Preserve the ray parameter or account for scale when enforcing a world-distance interaction range. Nonuniform scale makes an unexamined local normalized direction particularly hazardous.

## Implement chunk arithmetic

For integer coordinate `w` and positive chunk extent `N`, use Euclidean division:

```text
c = floor_div(w, N)
l = w - c*N
require 0 <= l < N
require w == c*N + l
```

Implement this per axis, using integer operations and overflow-aware types. Do not route large integer world positions through floating-point division merely to obtain a floor. In languages whose integer division truncates toward zero, adjust a negative remainder. Inspect the language's actual division and remainder semantics.

For `N = 16`:

| World coordinate | Chunk | Local coordinate |
| --- | --- | --- |
| -17 | -2 | 15 |
| -16 | -1 | 0 |
| -1 | -1 | 15 |
| 0 | 0 | 0 |
| 15 | 0 | 15 |
| 16 | 1 | 0 |

Use one shared conversion implementation in generation, saves, networking, picking and meshing. Specify a checked overflow policy for coordinate products and flattened indices. For large worlds, consider integer chunk coordinates plus bounded local render positions; origin rebasing is a rendering/physics transform, not a reason to change persistent world identities.

## Separate ownership from dependencies

Assign each output cell or face exactly one owner. Supplying neighbouring input must not make a chunk emit its neighbour's geometry.

For a corner-sampled field, `N` cells require `N+1` lattice samples per axis before additional algorithm padding. Central-difference gradients or transition cells may require further samples. Derive the complete input bounds from every operation rather than assuming one universal halo width.

Keep boundary samples consistent through shared authoritative data or deterministic evaluation at the same global coordinates. Do not independently seed a field by chunk when adjacent chunks must agree. A mesher may explicitly treat padded voxels as neighbour context rather than owned output; [Voxel Tools exposes this contract through its mesher API](https://voxel-tools.readthedocs.io/en/latest/api/VoxelMesher/).

Define a missing-neighbour policy: defer output, generate provisional boundaries, or query known deterministic base data with applicable edits. Record the dependency and invalidate provisional results when data becomes available. Unknown space is a state, not automatically air.

## Specify voxel picking

Use a grid traversal for cell-based interaction when it matches the representation. [Amanatides and Woo's original algorithm](https://www.eecs.yorku.ca/~amana/research/grid.pdf) advances through successive cell-boundary times; adapt its traversal to an explicit gameplay contract.

1. Validate the ray and range; reject a zero vector or nonfinite inputs.
2. Intersect finite grid bounds when starting outside them.
3. Establish the starting cell and whether an inside-solid start counts as a hit.
4. Track the next boundary time and time-per-cell for each nonzero axis; mark zero axes inactive without `0*infinity` or division-by-zero NaNs.
5. Advance until a hit, unknown-data outcome, grid exit or range limit.
6. Return the cell, distance, and entered-face or placement-target information defined by the caller's contract.

Choose edge/corner semantics before implementation. Traversing cells with positive-length ray intervals differs from a conservative supercover that includes touched neighbours. Decide how simultaneous boundary times advance and how an ambiguous entered face affects placement. Do not introduce arbitrary epsilons that silently change reach or skip thin features.

For partial blocks or smooth terrain, cell traversal identifies candidates; refine against the actual shape or field. Hitting an occupied containing cell is not necessarily hitting its surface.

## Verify the contracts

- Property-test chunk split/recompose for negative boundaries, non-power-of-two extents and large supported integers; test overflow rejection separately.
- Translate identical fixtures across the origin and chunk boundaries; require equivalent data and interaction results.
- Compare shared field samples and geometry under different chunk generation orders.
- Compare picking with independent ray–cell slab intersections under the same declared boundary convention.
- Include all ray octants, axis-parallel rays, exact grid planes, edge/corner ties, inside-solid starts, finite range, transformed grids and unknown chunks.

Connect bundled oracles to the consuming game's adapters or port these invariants into its own tests. Passing standalone reference tests does not establish that the game's coordinate implementation is correct.

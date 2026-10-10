# Testing and performance

Use this reference for regressions, architecture changes, and performance work. The fixture matrix and budgeting workflow are original recommendations. Select checks that exercise the changed subsystem and its concrete risks; do not require every fixture for a small unrelated edit.

## Contents

- Preserve a deterministic reproduction
- Failure-driven fixtures
- Profile the complete pipeline
- Set and enforce budgets
- Diagnose before changing architecture
- Report evidence honestly

## Preserve a deterministic reproduction

Record engine/plugin/build versions, platform, world seed and generator configuration, chunk sizes, coordinates, settings, and the input/edit sequence. Keep tiny synthetic fixtures separate from representative gameplay worlds. A small flat chunk is useful for correctness but does not establish throughput for caves, vegetation, transparency, or continuous edits.

Keep expected output independent where practical: a simple slow face-emission oracle, explicit coordinate cases, known solid/empty volumes, or saved logical voxel values. Use property tests for invariants and targeted regressions for observed faults. Avoid tests that merely repeat the same optimized implementation.

## Failure-driven fixtures

| Failure to expose | Fixture and required observation |
| --- | --- |
| Negative-coordinate aliasing | Test `-N-1, -N, -1, 0, N-1, N, N+1` on all axes. Require unique addressing, valid local coordinates, and exact reconstruction. Include terrain offsets/scale. |
| Border seams or stale neighbors | Edit a face, edge, and corner shared by chunks; load neighbors before and after meshing. Require all affected products to update without missing or duplicate visible boundaries. |
| Old jobs replacing new state | Pause jobs at controlled barriers, complete revisions out of order, and change sampled neighbor/material/LOD configuration. Require stale results to be discarded. |
| Pooled chunk reuse | Unload a chunk with generation, mesh, collision, or navigation pending; reuse its object/coordinate. Require the old lifetime's completion to release resources without publishing. |
| Order-dependent terrain | Generate the same region in multiple orders and worker counts, repeat chunks, and include structures crossing boundaries. Compare the output promised by the determinism contract. |
| Lost edits during generation | Start a load/generation task, apply an authoritative edit, then complete the older task. Require the accepted edit to survive. |
| Incorrect face merging | Use empty, solid, single-voxel, checkerboard, mixed-material, transparent, and lighting/AO-discontinuity fixtures. Compare surface coverage and required attributes, not only triangle count. |
| Smooth terrain/LOD cracks | Place a plane, sphere, thin feature, and chunk-crossing edit at mixed LODs. Check transitions, normals, winding, and collision at the promised resolution. |
| False save completion | Edit while saving, complete writes out of order, save/quit/reopen, and switch worlds with jobs pending. Require the last acknowledged durable state and isolation between worlds. |
| Corruption or migration loss | Load old-save fixtures; rename materials/change registries; truncate a copied save or inject write failure. Require a clear recoverable result and preservation of the last good state. |
| Unbounded demand | Move/teleport continuously while editing faster than normal use. Observe queue bytes, resident memory, canceled outputs, and recovery once demand stops. |
| Collision/nav lag | Spawn, sprint, fall, teleport, or replan while editing a path or support voxel. Require the documented readiness policy and no adoption of obsolete paths. |
| Boundary simulation loss | Place fluid/light/support operations across active/inactive regions, unload and reload. Require the declared pause/catch-up and cross-region semantics. |
| Multiplayer divergence, if present | Duplicate/reorder requests, edit concurrently, join during edits, reconnect, and send bounded invalid actions. Require authority, deduplication, snapshot/replay consistency, and recovery. |

For crash tests, inject failures into a test storage abstraction or disposable save copies. Do not damage the user's only save. SQLite's own atomicity validation varies failure points and then reopens to check complete-or-absent transactions: [atomic commit testing](https://sqlite.org/atomiccommit.html#testing_atomic_commit_behavior). Adapt that principle to the game's terrain/entity/inventory transaction boundary.

## Profile the complete pipeline

Instrument demand calculation, disk reads/decompression, generation, halo gathering, meshing, collision cooking, navigation, main-thread publication, GPU upload, render passes, simulation, serialization, and durable writes. Separate worker compute time from queue wait and end-to-end readiness latency. Count work requested, coalesced, canceled, discarded as stale, published, and retried.

Capture frame-time distributions and p50/p95/p99 for relevant jobs and player-visible edit/stream latency. Include run duration and sample count; percentiles from a few frames are not evidence. Measure on the specified target hardware and exported/release build where appropriate, with settings recorded. Voxel Tools documents main-thread budgets, collider cost, and editor-specific threading overhead: [performance](https://voxel-tools.readthedocs.io/en/latest/performance/). Treat its historical measurements as context, not portable constants.

Exercise stationary views, movement into uncached terrain, repeated edits, worst-case material fragmentation, autosave, and the chosen maximum gameplay workload. Report warm and cold cases separately. Track process/resident memory plus outstanding buffers, meshes, colliders, metadata, staging uploads, and cache sizes. Average FPS can hide stalls and does not show whether queues are accumulating.

## Set and enforce budgets

Derive the frame budget from the target rate: `1000 / FPS` milliseconds. Reserve measured time for gameplay, rendering, and the platform; allocate the remaining main-thread publication work explicitly. Choose limits for resident voxel bytes, completed job bytes, collision/nav generation per frame, save backlog, draw calls, and edit-to-feedback latency. Label provisional budgets as provisional.

Use arithmetic for capacity screening, then measure. A dense cubic chunk contains `N^3` cells. A full cubic radius `r` contains at most `(2r+1)^3` chunks before culling and special cases. Multiply by stored bytes per cell, then add actual overhead. For example, 4,913 chunks of `32^3` cells at two bytes per cell consume about 307 MiB for that channel alone. Compression, uniform chunks, column layouts, and sparse residency change that estimate; meshes and transient copies add costs. A budget estimator cannot certify a frame rate or benchmark a GPU.

## Diagnose before changing architecture

Identify the constrained stage before optimizing. Slow generation does not justify a more complex mesher; upload stalls may remain after meshing gets faster. Large chunks reduce chunk count but increase rebuild amplification and publication bursts. Smaller chunks improve locality of edits but add per-chunk overhead. Benchmark these tradeoffs against the actual action mix.

If workers outproduce publication, bound completions and reduce obsolete work instead of adding threads. If collision cooking dominates, compare collision extent, simplified geometry, direct voxel queries, and batching within gameplay constraints. If navigation rebakes stall, inspect source parsing separately from baking; Godot documents this distinction: [navigation meshes](https://docs.godotengine.org/en/stable/tutorials/navigation/navigation_using_navigationmeshes.html). If saving backs up, inspect serialization and transaction size before increasing writer concurrency; SQLite allows only one simultaneous write transaction: [transactions](https://sqlite.org/lang_transaction.html).

## Report evidence honestly

State the observed defect or baseline, change, relevant fixture outcomes, target build/hardware, measured distributions, and remaining limitations. Separate correctness checks, visual inspection, static capacity calculations, and runtime profiling. If an engine/editor or target device was unavailable, say which checks ran and leave performance claims unverified. After the relevant failure and required gates are covered, stop expanding the test suite and complete the task.

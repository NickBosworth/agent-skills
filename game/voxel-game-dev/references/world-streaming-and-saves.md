# World streaming and saves

Use this reference for resident voxel worlds, runtime edits, background generation, and persistence. The contracts below are original design recommendations; linked engine documentation supplies specific evidence and limitations. Adapt them to the existing engine instead of adding a second terrain framework.

## Contents

- Residency and coordinates
- Job publication and lifetime
- Bounded streaming
- Deterministic generation
- Persistent identity and durable saves
- Storage strategy and migrations

## Residency and coordinates

Represent voxel data residency separately from render, collision, navigation, simulation, and save readiness. Track each derived product's source revision. A visible mesh does not establish that collision is ready, and a completed mesh job does not make data durable. Luanti explicitly distinguishes loaded mapblocks from the smaller actively simulated set: [map terminology and coordinates](https://api.luanti.org/map-terminology-and-coordinates/).

Choose world units, voxel scale, axis orientation, integer coordinate width, and chunk dimensions explicitly. For each axis use `chunk = floor(voxel / N)` and `local = voxel - chunk * N`; require `0 <= local < N`, including negative positions. Convert engine positions through the terrain transform before addressing voxels. Keep persistent coordinates independent of floating-origin render offsets.

Distinguish known air, known material, and unavailable data. Decide how each caller handles unavailable space: a mesher may emit temporary border faces; movement, placement, and generation must follow their own documented policy. Do not silently treat unloaded data as empty buildable space. Include chunk boundaries and negative coordinates in the executable contract.

## Job publication and lifetime

Give each world session an identity and each resident chunk incarnation a lifetime epoch. Increment the epoch on unload/reuse even if a pooled object returns at the same coordinate. Track revisions for relevant channels such as occupancy/density, material, light, and simulation state; avoid rebuilding unrelated products when a channel changes.

Capture a coherent input snapshot and its complete dependency stamp before computation:

```text
world/session, chunk coordinate, lifetime epoch
required channel revisions for every sampled chunk
neighbor presence/lifetime where unavailable space was sampled
LOD level and transition-neighbor configuration
generator, mesher, material-library, and product settings revisions
```

Acquire that snapshot using the engine's ownership, locks, or immutable buffers. Merely reading revisions before and after unsynchronized mutable data is insufficient. At publication, accept a result only if its world, epoch, dependencies, and demand still match. Otherwise release its buffers and reschedule only if still needed. Cancellation is an optimization; this acceptance check provides correctness. Account for a neighbor becoming available after a border was meshed and for configuration changes without voxel edits.

## Bounded streaming

Bound queued, running, and completed-but-unpublished work by bytes as well as counts. Include input copies, halos, output meshes, collision cooking, and upload staging. Voxel Tools documents how preemptive copies can accumulate faster than workers consume them: [performance](https://voxel-tools.readthedocs.io/en/latest/performance/).

Prioritize playable collision and current edits, then visible terrain, then prefetch. Derive prefetch from speed and observed completion latency. Use unload hysteresis, coalesce repeated rebuild requests for the same product, and cap main-thread publication work. Do not coalesce away gameplay edits themselves. Release every allocation on success, cancellation, stale completion, and error. Keep dirty chunks or their immutable save snapshots alive until the chosen durability policy permits eviction. A teleport should retire obsolete demand without flooding a new unbounded queue.

## Deterministic generation

Define the reproducibility promise: same executable, compatible generator versions, or specified platforms. Record the generator version and configuration with the world. Pin the noise/PRNG implementation and stable coordinate hashing when saves depend on regeneration; a seed alone does not identify an algorithm. Godot explicitly treats its RNG implementation as an internal detail: [RandomNumberGenerator](https://docs.godotengine.org/en/stable/classes/class_randomnumbergenerator.html).

Derive feature randomness from seed, spatial identity, feature namespace, and version; avoid one shared mutable RNG whose call order follows worker scheduling. Give structures spanning chunks deterministic ownership and conflict rules, or compute deterministic blueprints and rasterize only their intersection with each chunk. Voxel Tools documents overlapping structures and unpredictable multipass generation order: [generators](https://voxel-tools.readthedocs.io/en/latest/generators/#determinism). Test regenerated output under reordered requests and repeated generation, including overlap regions. Keep gameplay edits separate from procedural output so regenerated terrain cannot overwrite them.

## Persistent identity and durable saves

Record a world identifier, schema version, generator/configuration identity, coordinate/chunk layout, voxel channel encodings, content registry mapping, and any persistent simulation clock. Use stable content names or explicitly persisted palettes; runtime enum ordinals and renderer model indices are not a safe implicit format. Voxel Tools distinguishes world-local numeric IDs from type/state identity: [blocky model names and IDs](https://voxel-tools.readthedocs.io/en/latest/blocky_terrain/#model-names-and-numerical-ids).

Save a coherent immutable snapshot at revision `r`. Serialize writes per key or reject writes older than the persisted revision. On completion, advance `persisted_revision`; clear dirty state only when the current revision is actually covered. An edit made during saving must remain dirty. Coordinate terrain changes with inventory/entity changes when gameplay requires an atomic operation.

Define whether “saved” means queued, written, or durably committed. Report the last successful durable checkpoint, propagate failures, and wait for required completion before closing or reopening a world. Keep save destinations immutable for pending jobs. Voxel Tools documents late asynchronous saves and corruption risk from changing a live stream's destination: [streams](https://voxel-tools.readthedocs.io/en/latest/streams/).

Use the storage engine's transactions when available. Otherwise implement and test a recoverable write protocol with checksums, bounded decoding, temporary files/journals, and platform-appropriate flush/replace semantics. Atomic rename alone does not establish power-loss durability. SQLite documents its atomic commit assumptions and crash testing: [atomic commit](https://sqlite.org/atomiccommit.html). Preserve the last good save on disk-full, torn-write, or decode failure; do not silently regenerate corrupt edited chunks.

## Storage strategy and migrations

| Strategy | Choose when | Account for |
| --- | --- | --- |
| Modified-chunk snapshots | Straightforward persistent editing | Larger writes; unchanged cells within a modified chunk are saved too |
| Generator plus voxel deltas | Regeneration is stable and cheap | Deltas depend on the exact base generator; explicit air/deletion values matter |
| Snapshot plus ordered edit log | Replay, undo, or frequent small edits justify complexity | Replay bounds, operation versions, deduplication, checkpoint/compaction crashes |

Choose one based on workload. Do not introduce an event log merely because multiplayer might be added later. A snapshot-plus-log checkpoint must identify its included sequence number; replay only the suffix and retire old records only after a successful checkpoint.

Keep old-save fixtures. Migrate through explicit schema steps without overwriting the sole original; handle renamed/removed materials and state metadata. Reject unsupported newer formats clearly. Luanti demonstrates aliases and activation-time block migrations: [keeping world compatibility](https://docs.luanti.org/for-creators/keeping-world-compatibility/). For generator changes, choose preservation, versioned generation, or deliberate migration and address newly generated border seams. Verify load, edit, save, restart, and interrupted migration against those fixtures.

# Planning and architecture

Use for a new project, substantial subsystem, or architecture repair. For a small bug, inspect the affected contract and fix it.

## Choose from the player experience

Establish what the player repeatedly does and what changes in the world. “Voxel” does not specify genre, camera, controller, persistence, or destruction. Define one observable loop: explore/mine, place/connect structures, manage workers, damage an object, or play among authored voxel models.

| Requirement | Initial candidate | Consequence to test |
| --- | --- | --- |
| Discrete mining and grid-aligned building | Block/material cells in chunks | Picking, collision, editing, material interfaces |
| Smooth digging, caves, blended surfaces | Scalar samples plus material data | Surface extraction, shared samples, gradients, LOD seams |
| Voxel look with fixed props/characters | Authored assets through engine import | Pivot, materials, animation, collision, draw cost |
| Block buildings on smooth terrain | Explicitly separated representations | Shared query/edit contract or a defined boundary |
| Mostly static sparse volume/ray tracing | Investigate hierarchical storage | Edit complexity, traversal, target hardware, tooling |

These are access-pattern hypotheses. Do not retrofit editable-world infrastructure to an art direction. Baking a volume into a surface mesh also loses interior data needed for arbitrary excavation.

## Inspect before selecting technology

Read manifests, languages, plugins, CI, target exports, code, instructions, and decisions. Prefer the established engine unless an actual requirement exposes incompatibility. If none exists, compare two or three choices against the user's skills, platform, licensing constraints, iteration speed, team size, and ecosystem. Recommend one and ask one consequential question.

Before adopting a plugin, verify release/commit, engine version, renderer, language bindings, exports, runtime editing, persistence, multiplayer, maintenance, and license terms. Build a small capability probe. An editor demo does not establish packaged-target support.

## Separate authority from derived work

Use boundaries that make ownership/invalidation testable. These are responsibilities, not mandatory folders or classes.

| Responsibility | Owns | Must not secretly own |
| --- | --- | --- |
| World store | Authoritative cells/samples, revisions, chunk lifetime | Mesh-derived gameplay state |
| Material/content registry | Stable IDs, properties, visibility rules | Unversioned save interpretation |
| Generator | Baseline from explicit reproducible inputs | Player edits or order-dependent global state |
| Edit service | Validated commands, transactions, dirty dependencies | Cross-thread scene mutation |
| Mesher/light builder | Output from declared snapshots/dependencies | Authoritative edits as a side effect |
| Streaming scheduler | Residency, priorities, bounded jobs, cancellation | Durability inferred from scheduling |
| Engine adapter | Resources, scene/physics publication, disposal | Untracked asynchronous lifetime |
| Persistence/network | Versioned snapshots/logs, protocol/completion | IDs tied to transient array order |
| Gameplay/simulation | Rules, entities, navigation, active regions | Visibility equated with residency/simulation |

A small prototype may implement these in a handful of modules. Avoid interfaces without a use, premature distributed systems, and invented frameworks. Choose boundaries for tests, parallel work, or failure isolation.

## Define invariants

Document coordinate mapping, cell/sample topology, storage order, empty/unknown states, materials, and channel ownership. State which derived systems read which neighboring values. Separate chunk identity from pooled objects; the same coordinate can be unloaded and acquire a different lifetime.

For a multi-step edit, decide whether readers can see intermediate values. If not, publish data and revisions atomically or use a coherent snapshot. Distinguish accepted data, visible mesh, ready collision, durable save, and server acknowledgement. Each can be a legitimate completion event; conflating them causes bugs.

For large coordinates, separate integer world addresses from local floating-point render/physics positions. If using a floating origin, test transforms, velocities, particles, queries, networking and save keys across rebasing. World size remains bounded by address ranges, storage, precision, or quotas.

## Plan a milestone that proves something

Specify a player action, observable result, relevant boundary case, and reproduction. Example: “Remove a block on either side of the origin/chunk boundary, walk through after the defined collision update, save, restart, and see the same opening.”

Put sophisticated generation, lighting, LOD, or networking after the smallest loop unless it is the task's purpose. Instrument generation, mesh building, publication, physics, and GPU work separately. Optimize one identified stage at a time.

Delegate independent modules after their coordinate/data/output contracts agree. Assign disjoint file ownership and one integration owner to verify the loop. Keep a terse checkpoint: milestone, decisions, exact commands, observed result, next unresolved issue.

## Repair existing architecture

Trace input through authoritative state, invalidation, jobs, publication, and persistence. Capture a small reproduction before refactoring. Retain a working implementation as an oracle when replacing a mesher/storage path. Prefer a staged migration or adapter when it preserves functionality and save compatibility. Remove old paths after accounting for callers and data.

This architecture is original engineering synthesis. Use the selected engine/subsystem references for implementation evidence. The package's focused workflow and conditional references follow the [Agent Skills format](https://agentskills.io/specification).

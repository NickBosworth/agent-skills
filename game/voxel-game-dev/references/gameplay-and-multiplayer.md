# Gameplay, simulation, and multiplayer

Use this reference to turn voxel technology into playable behavior. These are original implementation policies informed by the linked primary sources. Enable only systems required by the game or current task.

## Contents

- Choose the gameplay slice
- Apply edits consistently
- Collision and navigation readiness
- Simulation across streaming boundaries
- Optional multiplayer authority
- Integrate against actual engine capabilities

## Choose the gameplay slice

Write a short loop describing the player's intent, action, feedback, consequence, and ability to repeat it. Identify how voxels contribute: mutable terrain, destructible objects, construction cells, tactical occupancy, or an art pipeline. Do not impose mining, crafting, infinite terrain, or multiplayer on a game that needs none of them.

| Game requirement | Small useful slice | Proof beyond a terrain screenshot |
| --- | --- | --- |
| Exploration/building | Move, select, remove/place one material, revisit | Correct targeting, collision, persistence, and feedback |
| Destruction | Break one object or local surface | Visual and collision change agree; fragments follow a bounded policy |
| Colony/tactical play | Place an obstruction and move one agent | Placement changes reachable paths and simulation state |
| Voxel art only | Import one model into a playable scene | Materials, scale, camera, animation/collision meet the intended style |

Build the complete narrow interaction before multiplying biomes or block types. Include camera/input controls, targeting feedback, a recoverable start position, and a way to reproduce the scene. For a terrain-only repair, keep the existing gameplay loop and add only the fixture needed to demonstrate the fix.

## Apply edits consistently

Route player tools and simulation through a defined edit operation. Describe the affected voxel region, channels, intended material/state change, and expected authority. Validate against authoritative voxel data: reach, permitted material, world bounds, placement overlap, protection/ownership if present, and resource availability. Distinguish pointing at a visible mesh from selecting the voxel that the action will actually modify.

Define ray-hit conventions for face, edge, and corner ties, an origin inside a solid voxel, maximum reach, non-unit directions, transparent/selectable materials, and terrain transforms. Use the engine's tested voxel query when suitable. Voxel Tools provides a voxel-aware raycast independent of triangle collisions: [blocky terrain raycasts](https://voxel-tools.readthedocs.io/en/latest/blocky_terrain/#raycast).

Apply a multi-chunk brush or structure with a coherent mutation policy. Make inventory deductions, drops, ownership changes, and voxel mutation agree on success/failure. Return the actual changed region and channels. Invalidate each dependent mesh, collider, light field, and navigation region according to its sampling extent, including neighboring chunks. Coalesce derived rebuilds while preserving all accepted gameplay operations.

## Collision and navigation readiness

Choose the collision model for the material shapes and gameplay: grid/AABB queries for suitable block worlds, cooked surface collision for general shapes, or a deliberate hybrid. Avoid creating a rigid body per static voxel. Keep direct voxel collision and engine dynamic-body interaction consistent where both are used.

Specify what happens while nearby collision is unavailable or older than an edit. Options include reserving a ready movement region, prioritizing collision publication, or temporarily constraining entry. Test spawn, teleport, sprinting, falling, and terrain removed beneath a character. Do not allow render readiness alone to release the player into an unloaded area.

Define navigation by agent dimensions, clearance, slope/step/jump rules, traversable materials, and movement mode. Support separate policies for walkers and flying agents. Limit searches and rebuilds spatially; invalidate paths when their relevant terrain changes. Before following a delayed result, validate its request, agent, world, and region revisions, and recheck immediate movement against current collision.

Include neighboring geometry sufficient for agent clearance at navigation chunk edges. Godot documents threaded baking, main-thread scene parsing, and neighboring geometry requirements: [using navigation meshes](https://docs.godotengine.org/en/stable/tutorials/navigation/navigation_using_navigationmeshes.html). Prefer simplified procedural source geometry over repeatedly reading detailed render meshes when runtime rebuilding is expensive. Voxel Tools' grid pathfinder has specific character-size, material, and search-region limitations: [VoxelAStarGrid3D](https://voxel-tools.readthedocs.io/en/latest/api/VoxelAStarGrid3D/). Verify these rather than treating any A* class as a universal navigation system.

## Simulation across streaming boundaries

Separate simulation activity from data/render residency. Luanti uses distinct loaded and active regions: [mapblock status](https://api.luanti.org/map-terminology-and-coordinates/#mapblock-status). For each simulation, choose unloaded-region behavior: pause, bounded catch-up, analytical elapsed-time update, or persistent background activity. Make that a game rule instead of an accidental consequence of camera position.

Use bounded active sets, scheduled ticks, and region queues for fluids, growth, lighting, power, fire, or support checks. Avoid scanning every voxel each frame. Persist the clock, pending events, and random state only where needed to preserve the chosen behavior. Specify ownership and handoff of updates crossing chunk edges; unavailable neighbors must not silently consume events or act as empty space.

Choose fluid semantics explicitly: discrete level/source rules and conservation-based simulation produce different games. Specify update ordering and boundary transfer before adding visual flow. For lighting, test removal as well as propagation, including overlapping sources and edited occluders. For collapse/support, distinguish unreachable support from not-yet-loaded support. Keep cosmetic particles and transient debris separate from persistent gameplay state unless their persistence matters.

## Optional multiplayer authority

If multiplayer is required, define the authority model before duplicating world edits across peers. For a conventional authoritative server, send action intent; validate player identity, reach, resource cost, edit bounds, material/state values, and permissions on the server. Rate-limit frequency, brush volume, queued work, and message size. Godot recommends validating client requests and retaining server authority over important state: [high-level multiplayer](https://docs.godotengine.org/en/stable/tutorials/networking/high_level_multiplayer.html).

Assign accepted edits an authoritative ordering and deduplication identity. Include the world/session and relevant base revision. Specify whether conflicting edits are rejected, rebased, or serialized. Do not trust a client-provided full voxel buffer as an authorized edit. Prediction is optional; if used, reconcile terrain, inventory, and feedback when rejected or superseded.

For late join/reconnect, send a coherent snapshot with a sequence watermark, then the ordered suffix. Detect gaps and request resynchronization; reliable delivery does not by itself define ordering between independent channels or a snapshot and an edit stream. Validate generator/configuration and content registries before relying on local generation. Decide whether exposing the world seed is compatible with the game.

Give the server data/collision demand around every relevant player and simulation actor, including headless operation. Clients normally need terrain around their own interest region, not every remote player's world. Bound per-peer queues and avoid letting a slow client prevent persistence or simulation. Exercise duplicate requests, reordered completion, simultaneous edits, reconnect, and late-join state consistency.

## Integrate against actual engine capabilities

Check the pinned engine/plugin version. Voxel Tools documents an experimental authoritative terrain setup: [multiplayer](https://voxel-tools.readthedocs.io/en/latest/multiplayer/). Voxel Plugin documents deterministic generation but requires manual synchronization of runtime edits: [multiplayer support](https://docs.voxelplugin.com/knowledgebase/blueprints/multiplayer-support). Neither statement establishes a complete game-specific transaction, permission, prediction, or persistence protocol. Implement and verify the missing behavior required by the chosen slice.

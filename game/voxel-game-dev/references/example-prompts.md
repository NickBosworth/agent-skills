# Example prompts for the installed skill

Copy a prompt and replace bracketed details with your project information. Every prompt stands alone. Examples use `$voxel-game-dev`; select **Voxel Game Development** or use the host's equivalent invocation if its syntax differs. Give the agent access to the project and engine tools for implementation requests. It should inspect available evidence before asking questions.

Keep this file inside every exported, installed, or updated copy of the skill. New subskills added to a future package must also have named, ready-to-use examples here.

## Contents

1. Start a new voxel game
2. Build a Godot playable slice
3. Improve a Unity block mesher
4. Develop smooth terrain in Unreal
5. Build a browser voxel prototype
6. Import voxel art without editable terrain
7. Fix chunk seams and negative coordinates
8. Fix stale asynchronous results
9. Repair saves and compatibility
10. Add reproducible procedural generation
11. Investigate frame-time spikes
12. Improve materials, lighting and transparency
13. Add construction and navigation
14. Add authoritative multiplayer editing
15. Audit and maintain an existing voxel project
16. Continue the next milestone

## 1. Start a new voxel game

```text
Use $voxel-game-dev to design and start a small [genre] game for [platform].
The player should [core interaction], and I want [blocky / smooth / voxel-art]
visuals. Inspect the workspace first. Recommend an engine and representation
if they are not established. Ask consequential questions one at a time,
explaining the tradeoffs and your recommendation. Then implement the smallest
playable milestone, record the decisions, and give me run instructions and
the checks you actually performed. Avoid adding systems the first loop does
not need.
```

## 2. Build a Godot playable slice

```text
Use $voxel-game-dev in this Godot project. Implement a small block-building
slice: movement, block targeting, placement/removal, collision, visible
feedback and save/restart. Preserve the project's language and conventions.
Check the installed Godot and any Voxel Tools version before choosing APIs.
Cover edits across chunk boundaries and negative coordinates. Verify the
running scene and export if the tools are available, and clearly identify
anything that could not be checked.
```

## 3. Improve a Unity block mesher

```text
Use $voxel-game-dev to inspect this Unity chunk mesher and improve its
performance. Establish a reproducible baseline and retain the existing
implementation as a correctness reference where useful. Evaluate greedy
meshing and the installed Jobs/Burst/MeshData capabilities. Preserve material,
UV, AO and boundary behavior. Test actual emitted geometry rather than only
face counts, and measure mesh building, publication and collider cooking
separately. Implement the best justified change and report the comparison.
```

## 4. Develop smooth terrain in Unreal

```text
Use $voxel-game-dev to extend this Unreal project with smooth, editable cave
terrain. Inspect the engine and plugins before selecting runtime mesh APIs.
Define scalar samples, materials, surface extraction and edit/collision
behavior. Implement a small digging slice first. Add LOD only if the target
scale needs it, and test every supported transition orientation and edits
near seams. Verify that the chosen functions work in a packaged runtime.
Ask one consequential question at a time when the requirements leave a
material choice unresolved.
```

## 5. Build a browser voxel prototype

```text
Use $voxel-game-dev to build a small voxel construction prototype in this
existing web project. Keep the current renderer and tooling if suitable.
Include controls, a tiny editable world, targeting, placement/removal and
clear feedback. Generate exposed surfaces and bound worker/mesh work.
Handle stale results and GPU resource cleanup. Test the production build in
a real browser and record the browser, workload and observed limitations.
```

## 6. Import voxel art without editable terrain

```text
Use $voxel-game-dev to integrate these [MagicaVoxel / other] assets into this
[engine] game. The terrain and props are fixed; I need the voxel art style,
not cell-level terrain editing. Inspect units, pivots, scene hierarchy,
palette/materials, animation and collision. Establish a repeatable import
workflow using one representative model, then apply it to the supplied set.
Verify the assets in the running and packaged game and explain any source
features the importer cannot preserve.
```

## 7. Fix chunk seams and negative coordinates

```text
Use $voxel-game-dev to investigate holes or extra faces near chunk boundaries,
especially on the negative side of the origin. Reproduce the issue with a
tiny deterministic world, trace coordinates, ownership and neighbor reads,
and implement the fix. Add focused tests for faces, edges and corners,
negative coordinates, neighbor loading/unloading and actual mesh coverage.
Preserve the existing engine and save format.
```

## 8. Fix stale asynchronous results

```text
Use $voxel-game-dev to fix terrain flickering back to older geometry during
rapid edits or after teleporting away and returning. Inspect chunk lifetime,
job input snapshots, dependencies, queues and publication. Build a controlled
out-of-order completion test and implement the necessary fix. Verify buffer
cleanup, neighbor changes and unload/reload behavior. Report the reproduced
cause and evidence that obsolete work cannot replace current output.
```

## 9. Repair saves and compatibility

```text
Use $voxel-game-dev to investigate world edits disappearing or changing after
restart. Trace generator versions, content IDs, dirty revisions and save
completion. Preserve existing saves and reproduce the failure on copies.
Implement a tested fix or migration, including edits during saving, older
fixtures, unsupported formats and interrupted writes as relevant. State
exactly what the game means by a successful save.
```

## 10. Add reproducible procedural generation

```text
Use $voxel-game-dev to add [biomes / caves / structures] to this voxel world.
Generation must remain reproducible under different chunk request and worker
orders. Preserve player edits. Define the seed, algorithm/configuration and
content versions, and a policy for structures crossing chunk boundaries.
Implement a small representative feature set and tests for reordered
generation, repeated generation, neighboring chunks and saved worlds.
```

## 11. Investigate frame-time spikes

```text
Use $voxel-game-dev to diagnose stutter while [moving / digging / building]
in this game. My target is [device, resolution, frame-rate target]. Capture
the current workload and separate generation, meshing, main-thread/GPU
publication, collision, saves and allocation costs. Include frame-time and
edit-latency percentiles, queue depth and memory peaks. Use estimates only
for capacity planning. Implement a measured improvement and compare the
same workload before and after.
```

## 12. Improve materials, lighting and transparency

```text
Use $voxel-game-dev to implement or repair [AO / sunlight / glass / water /
texture tiling] in this block world. Inspect the material visibility and
greedy-merge rules first. Define boundary dependencies and update behavior.
Add small fixtures that reveal incorrect culling, illegal merges, diagonal
shading, or atlas/mipmap artifacts, then verify the result in the renderer.
Keep collision and light-transmission semantics distinct from visibility.
```

## 13. Add construction and navigation

```text
Use $voxel-game-dev to implement a construction slice for this voxel
management game: select a build item, preview placement, validate space and
resources, commit the build, and let an agent navigate around it. Reuse the
current gameplay architecture. Define what happens while collision or
navigation updates and while neighboring regions are unloaded. Add the
smallest tests and playable scenario that prove the complete loop.
```

## 14. Add authoritative multiplayer editing

```text
Use $voxel-game-dev to add authoritative terrain editing to this existing
multiplayer prototype. Inspect the networking stack and define server
validation, accepted edit order, duplicate requests, concurrent edits,
late joins, reconnects and snapshot/replay consistency. Keep client feedback
responsive without making client voxel state authoritative. Implement one
tested end-to-end edit flow before generalizing it. Ask consequential
questions one at a time with a recommendation.
```

## 15. Audit and maintain an existing voxel project

```text
Use $voxel-game-dev to audit this project's voxel architecture against its
current requirements. Inspect code, tests, engine/plugin versions, design
records and known issues. Identify concrete correctness, compatibility and
performance risks with evidence. Fix the well-scoped issues that are safe
to resolve now, reconcile stale decisions with the implementation, and
propose one justified next milestone for larger work. Preserve working
conventions and avoid a wholesale rewrite.
```

## 16. Continue the next milestone

```text
Use $voxel-game-dev to continue this game from its existing task and decision
records. Verify the current state, choose the next dependency-ready milestone
within the agreed scope, and implement it. Carry forward established
decisions, ask only about consequential new uncertainty, run appropriate
checks, and update the record with what now works and what remains.
```

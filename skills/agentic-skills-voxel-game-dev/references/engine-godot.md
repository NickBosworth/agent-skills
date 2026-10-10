# Godot adapter

Read this adapter only when the project uses Godot or Godot is being evaluated. Preserve the existing engine and language. Treat API names below as documentation lookup landmarks: verify signatures, platform support, and ownership against the installed version before coding.

## Inspect and choose the smallest integration

Read `project.godot`, the actual executable's `--version` and `--help`, export presets, `.csproj` files, enabled plugins, and `.gdextension` descriptors. Record renderer, physics backend, target platform, and available export templates. Preserve resource identifiers and existing scene organization. A `.NET` SDK build alone cannot establish that the Godot project imports or runs.

If terrain already works, extend its data and meshing contracts before replacing it. For a new editable world, compare a small custom `ArrayMesh` path with an existing voxel integration. Limit plugin evaluation to the requirements that matter: blocky/smooth terrain, editing, streaming, language bindings, export binaries, and maintenance/license constraints.

[Voxel Tools installation guidance](https://voxel-tools.readthedocs.io/en/latest/getting_the_module/) distinguishes module builds from GDExtension, warns against installing both together, and documents C# integration caveats. Confirm the selected release's actual bindings and export targets with a minimal run/export spike. Do not invent strongly typed C# classes from GDScript examples or assume a development snapshot is a stable compatibility promise.

## Own data, meshes, and publication explicitly

Build chunk samples and mesh buffers from an immutable snapshot or other documented synchronization scheme. Return chunk coordinates, a residency/generation token, voxel revision, and sampled neighbor revisions. Validate them when publishing; a deferred callback can execute after a chunk unloads or changes.

Keep scene-tree changes and default mesh/collider publication in their owning main-thread context. The [threading guide](https://docs.godotengine.org/en/stable/tutorials/performance/thread_safe_apis.html) distinguishes scene-tree restrictions, shared-resource hazards, server settings, and GPU synchronization. Use a different thread only after verifying that exact API and configuration. `call_deferred` schedules work; it does not prove that its payload is current or uniquely owned.

For [ArrayMesh](https://docs.godotengine.org/en/stable/classes/class_arraymesh.html), verify array layouts, attribute lengths, winding, normals, indices, bounds, and material surfaces. Rebuild topology when edits require it; reserve buffer-region updates for compatible layouts. Avoid sharing a mutable mesh resource accidentally between independently editable chunks.

Use [MultiMesh](https://docs.godotengine.org/en/stable/classes/class_multimesh.html) for appropriate repeated geometry in spatial groups. Its aggregate visibility bounds make one widely scattered batch a poor default. Instancing cubes does not remove their hidden interior faces.

Budget visual uploads and collider creation independently. Keep a safe spawn region unavailable until required collisions are ready; define what happens when rendering advances ahead of collision. Cancel obsolete work, then reject any late completion. Release owned nodes, resources, and server handles through their documented lifecycle; do not free shared assets or reuse worker buffers prematurely.

## Verify the engine and the playable result

Derive commands from the installed executable and the project's existing test/export setup. Follow the [command-line guide](https://docs.godotengine.org/en/stable/tutorials/editor/command_line_tutorial.html): perform the required import/build, run a bounded headless logic scenario, inspect logs and exit status, then export and run the intended target when available. Unknown flags can be ignored, so verify expected outputs as well as command completion.

Headless success does not verify rendered surfaces, shaders, input feel, or collision behavior that the scenario never exercised. Inspect a rendered run with collision visualization: spawn, walk, mine/place across a boundary, cross negative coordinates, teleport during jobs, and unload/reload edited chunks.

Measure generation, meshing, publication, collision readiness, and cleanup separately. The [Godot profiler guide](https://docs.godotengine.org/en/stable/tutorials/scripting/debug/the_profiler.html) documents its coverage and C# limitations; choose language-appropriate instrumentation. Report unavailable target, graphics, or export checks plainly rather than marking them passed.

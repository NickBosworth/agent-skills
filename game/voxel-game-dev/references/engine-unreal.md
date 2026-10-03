# Unreal Engine adapter

Read this adapter only for Unreal projects or a bounded Unreal evaluation. Preserve the project's engine association and existing terrain/component choice. Treat API names as lookup landmarks, not permanent capability guarantees; inspect installed headers, module dependencies, plugin source, and documentation for the actual engine version and target.

## Inspect before selecting a mesh component

Read `.uproject`, `.uplugin`, `.Build.cs`, target files, engine/build information, enabled runtime/editor modules, packaging settings, and the existing automation workflow. Identify authoritative voxel storage separately from actors, rendering components, and physics bodies. Record coordinate units, up axis, render features, collision requirements, and supported platforms.

Compare the existing component with the smallest viable alternative. [UProceduralMeshComponent](https://dev.epicgames.com/documentation/unreal-engine/API/Plugins/ProceduralMeshComponent/UProceduralMeshComponent) is documented as experimental. [UDynamicMeshComponent](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/GeometryFramework/UDynamicMeshComponent) and Geometry Scripting offer another path. Consider a third-party voxel/runtime-mesh plugin only when it closes a concrete requirement; check the installed release, runtime binaries, license, API access, and packaged support through a small spike.

The [Geometry Scripting guide](https://dev.epicgames.com/documentation/en-us/unreal-engine/geometry-scripting-users-guide-in-unreal-engine) distinguishes runtime operations from editor-only operations and lists Dynamic Mesh rendering limitations. Verify Nanite, Lumen, distance fields, LOD, and instancing independently for the selected component/plugin. Do not promise them merely because the engine supports them elsewhere. Generated Dynamic Mesh Actor editor rebuilding is not a substitute for a demonstrated packaged gameplay update path.

## Separate work, object ownership, and rendering

Generate voxel samples and surface data in tasks using immutable snapshots or explicitly synchronized data. Keep UObject/component mutation in the supported owning context. The [threaded rendering guide](https://dev.epicgames.com/documentation/en-us/unreal-engine/threaded-rendering-in-unreal-engine) describes game-thread/render-proxy ownership and garbage-collection hazards; do not dereference live actors or shared mutable components from a meshing task simply because a pointer was captured.

Attach chunk coordinates, residency token, voxel revision, and neighbor dependency revisions to each result. Validate lifetime and revisions when returning to the game thread. Coordinate task completion with world teardown. Weak references can help identify dead objects but do not make arbitrary concurrent access safe.

Use documented mesh/component notifications and update APIs. Verify winding, normals, tangents where needed, material sections, bounds, and topology. For a custom render path, explicitly design buffer initialization, upload, fences, and deferred release. Avoid per-chunk blocking render flushes. Keep material/section counts bounded rather than assigning an independent material per voxel.

Do not assume a Blueprint Geometry Scripting call is asynchronous: the guide says calls run on the game thread and internally parallel work finishes before the function returns. Establish a measured worker path where necessary instead of adding more Blueprint loops.

## Make collision and residency observable

Give collision cooking a separate queue, radius, budget, and revision. Verify the selected component's asynchronous-cooking support and completion behavior. Define when a player may enter newly streamed terrain and how edits behave while replacement collision is pending. Use suitable separate collision for detached moving pieces; do not assume static concave terrain collision transfers unchanged to simulated debris.

Treat actor/world streaming as an integration boundary, not an automatic mutable-voxel persistence system. Preserve edits across unloads and validate reconstruction independently of rendered components. Release chunks only after owned task/render/physics dependencies are safely retired.

## Verify compiled and packaged behavior

Use the repository's real build and AutomationTool/test entry points with the installed toolchain. Compile affected modules, run focused data/geometry and functional physics scenarios, then cook/package and run the target build. Check logs and explicit result artifacts; editor success can conceal editor-only APIs or missing runtime plugin binaries.

A headless or non-rendering run verifies only the exercised logic. Inspect rendered seams, culling, materials, and collision while spawning, editing boundaries, teleporting during jobs, and revisiting saved edits. Capture [Unreal Insights](https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-insights-in-unreal-engine) timing/memory traces with named chunk stages. Report target/build configuration and unperformed checks separately.

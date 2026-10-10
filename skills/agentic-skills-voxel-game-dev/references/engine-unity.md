# Unity adapter

Read this adapter only for a Unity project or a bounded Unity evaluation. Keep the established Editor version, render pipeline, and serialization conventions. Treat named APIs as lookup landmarks; consult installed assemblies/package source and matching official documentation before implementation. Versioned links below are researched examples, not upgrade instructions.

## Inspect the actual project

Read `ProjectSettings/ProjectVersion.txt`, `Packages/manifest.json`, the package lockfile, `.asmdef` boundaries, build profiles, physics settings, and existing tests. Locate the correct Editor executable and target-platform modules. Check whether Burst, Collections, Jobs, or Entities are actually dependencies; do not introduce them merely because terrain uses voxels. Preserve `.meta` identities and serialized scene/prefab references.

Find the current authoritative voxel store, rendering owners, collision owners, and unload path. Extend a working implementation before proposing a plugin replacement. Evaluate a new plugin against a small editable/exported scene, target support, source/API accessibility, license, and integration cost. Do not migrate the project to DOTS or a new render pipeline without a requirement and evidence.

## Schedule mesh work without losing ownership

Use a simple validated chunk mesher first. For a justified parallel path, inspect [Mesh.MeshData](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Mesh.MeshData.html), `Mesh.AllocateWritableMeshData`, and `Mesh.ApplyAndDisposeWritableMeshData`. Writable mesh data supports worker/job access; that permission does not extend to arbitrary `GameObject`, component, or mesh operations.

Specify vertex layout, index format, submeshes, bounds, normals, and material grouping explicitly. Validate generated indices and counts before relaxing mesh-update validation. Consider batched allocations only within measured queue/memory limits; one huge batch can increase latency and retained memory.

Track every native allocation's owner and every job dependency. An unload may invalidate publication without stopping a running job: complete or otherwise safely retire its ownership before disposing/reusing memory. Publish only results whose chunk residency token, voxel revision, and sampled neighbor revisions still match. Avoid immediately calling `Complete` after every schedule and disguising synchronous work as a background pipeline.

Create, assign, replace, and destroy Unity objects in their documented owning context. Distinguish runtime-owned meshes/materials from shared imported assets. Account for pooling, scene teardown, and repeated Play-mode entry; clearing a dictionary is not resource disposal.

## Separate collider preparation from visual updates

Choose collision geometry for gameplay, with its own update radius, revision, budget, and readiness policy. The [mesh cooking guide](https://docs.unity3d.com/6000.0/Documentation/Manual/prepare-mesh-for-mesh-collider.html) explains why removing cleaning/welding requires replacement validation and why readability settings matter. Do not apply blanket “fast” cooking flags to arbitrary generated geometry.

Where supported, [Physics.BakeMesh](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Physics.BakeMesh.html) can distribute cooking across threads for different meshes. Concurrent baking of the same mesh is undefined. Verify geometry stability, matching cooking options, transforms, and Player readability before expecting reuse. Keep the source mesh alive until baking finishes; changing or assigning it carelessly can trigger another bake.

Test edited terrain with the selected rigidbody/character setup. Rendering a cavity does not prove that collision has updated, and terrain triangle surfaces do not establish a robust moving/destructible-body collision representation.

## Verify in tests and a Player

Use the installed project test runner and actual Editor executable. Run focused geometry/data tests in Edit mode and lifecycle/physics scenarios in Play mode; inspect test result files, logs, and process status. Build the intended Player configuration through the existing build entry point and run the same spawn/edit/boundary/unload scenario.

[Headless operation](https://docs.unity3d.com/6000.0/Documentation/Manual/desktop-headless-mode.html) and batch test completion do not establish shader, culling, or visual correctness. Capture a rendered run and collision diagnostics. [Profile on the target platform](https://docs.unity3d.com/6000.0/Documentation/Manual/profiling-target-device.html), measuring job wait time, main-thread publication, cooking, GC/native allocations, and retained objects after travel. State separately which Editor, Player, graphical, and device checks ran.

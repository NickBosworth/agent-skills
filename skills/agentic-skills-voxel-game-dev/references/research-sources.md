# Research sources and evidence boundaries

Package version: **1.0.0**. Research checked: **3 October 2026**.

## Contents

- How to use the evidence
- Source catalog: skill format, meshing, world systems, engine integration, art
- Refresh procedure

This package combines original engineering workflows with primary algorithm publications, author-maintained implementations, engine documentation, and mature voxel-project documentation. Source links occur beside the technical claims in each reference; this catalog provides a refresh path. The code in the bundled helpers is original. No third-party algorithm tables, engine binaries, plugins, or game assets are bundled.

## How to use the evidence

- Treat mathematical definitions and algorithm assumptions separately from changing engine APIs.
- Verify the project's installed engine/plugin release, source headers or bindings, target renderer, language and export platform before implementing an API example.
- Links containing `stable`, `latest`, `master`, or an unversioned engine path can change. Resolve a version/commit when the project adopts a dependency. Unity 6000.0 links describe that documentation version, not a requirement to use it or a claim that it is newest.
- The 0 FPS articles are the author's original algorithm discussions. Retain their geometry and shading insights; do not reuse historical timing numbers or hardware/platform support claims as current guidance.
- Voxel Tools performance documentation mixes practical constraints with historical engine observations. Measure the installed configuration rather than promoting illustrative ratios into universal constants.
- Chunk sizes, scheduling policies, storage layouts, architecture boundaries, acceptance scenarios and many test recommendations are original design synthesis. They are candidates to justify against the game, not standards imposed by the cited projects.
- The memory helper calculates a declared model. Its results are not measured benchmarks. The opaque-face helper proves its documented coverage contract only after the actual game output is adapted to it.
- If importing third-party code/tables later, check the actual license and retain required notices. Linking a research source is not an import of its implementation.

## Source catalog

Each source appears once; multiple package references may use it. Titles describe the linked evidence, not an endorsement of a complete engine or plugin.

### Agent skill format

- [Agent Skills specification](https://agentskills.io/specification)
- [Skill creation best practices](https://agentskills.io/skill-creation/best-practices)

### Representation and meshing

- [Voxel Tools' field explanation](https://voxel-tools.readthedocs.io/en/latest/smooth_terrain/)
- [original dual-contouring paper](https://www.cs.rice.edu/~jwarren/papers/dualcontour.pdf)
- [Voxel Tools exposes this contract through its mesher API](https://voxel-tools.readthedocs.io/en/latest/api/VoxelMesher/)
- [Amanatides and Woo's original algorithm](https://www.eecs.yorku.ca/~amana/research/grid.pdf)
- [Lysenko's original meshing article](https://0fps.net/2012/06/30/meshing-in-a-minecraft-game/)
- [Lysenko's follow-up](https://0fps.net/2012/07/07/meshing-minecraft-part-2/)
- [Lysenko's atlas analysis](https://0fps.net/2013/07/09/texture-atlases-wrapping-and-mip-mapping/)
- [Lysenko's AO article](https://0fps.net/2013/07/03/ambient-occlusion-for-minecraft-like-worlds/)
- [Voxel Tools' performance discussion](https://voxel-tools.readthedocs.io/en/latest/performance/)
- [Lewiner and colleagues provide a topology-aware MC33 implementation](https://thomas.lewiner.org/pub/marching_cubes_jgt.html)
- [Lysenko's implementation discussion](https://0fps.net/2012/07/12/smooth-voxel-terrain-part-2/)
- [Transvoxel joins resolutions at exactly a 2:1 sampling relationship through transition cells](https://transvoxel.org/)
- [the author's official tables](https://github.com/EricLengyel/Transvoxel)

### World systems and gameplay

- [map terminology and coordinates](https://api.luanti.org/map-terminology-and-coordinates/)
- [RandomNumberGenerator](https://docs.godotengine.org/en/stable/classes/class_randomnumbergenerator.html)
- [generators](https://voxel-tools.readthedocs.io/en/latest/generators/)
- [blocky model names and IDs](https://voxel-tools.readthedocs.io/en/latest/blocky_terrain/)
- [streams](https://voxel-tools.readthedocs.io/en/latest/streams/)
- [atomic commit](https://sqlite.org/atomiccommit.html)
- [keeping world compatibility](https://docs.luanti.org/for-creators/keeping-world-compatibility/)
- [using navigation meshes](https://docs.godotengine.org/en/stable/tutorials/navigation/navigation_using_navigationmeshes.html)
- [VoxelAStarGrid3D](https://voxel-tools.readthedocs.io/en/latest/api/VoxelAStarGrid3D/)
- [high-level multiplayer](https://docs.godotengine.org/en/stable/tutorials/networking/high_level_multiplayer.html)
- [multiplayer](https://voxel-tools.readthedocs.io/en/latest/multiplayer/)
- [multiplayer support](https://docs.voxelplugin.com/knowledgebase/blueprints/multiplayer-support)
- [transactions](https://sqlite.org/lang_transaction.html)

### Engine integration

- [Voxel Tools installation guidance](https://voxel-tools.readthedocs.io/en/latest/getting_the_module/)
- [threading guide](https://docs.godotengine.org/en/stable/tutorials/performance/thread_safe_apis.html)
- [ArrayMesh](https://docs.godotengine.org/en/stable/classes/class_arraymesh.html)
- [MultiMesh](https://docs.godotengine.org/en/stable/classes/class_multimesh.html)
- [command-line guide](https://docs.godotengine.org/en/stable/tutorials/editor/command_line_tutorial.html)
- [Godot profiler guide](https://docs.godotengine.org/en/stable/tutorials/scripting/debug/the_profiler.html)
- [Mesh.MeshData](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Mesh.MeshData.html)
- [mesh cooking guide](https://docs.unity3d.com/6000.0/Documentation/Manual/prepare-mesh-for-mesh-collider.html)
- [Physics.BakeMesh](https://docs.unity3d.com/6000.0/Documentation/ScriptReference/Physics.BakeMesh.html)
- [Headless operation](https://docs.unity3d.com/6000.0/Documentation/Manual/desktop-headless-mode.html)
- [Profile on the target platform](https://docs.unity3d.com/6000.0/Documentation/Manual/profiling-target-device.html)
- [UProceduralMeshComponent](https://dev.epicgames.com/documentation/unreal-engine/API/Plugins/ProceduralMeshComponent/UProceduralMeshComponent)
- [UDynamicMeshComponent](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/GeometryFramework/UDynamicMeshComponent)
- [Geometry Scripting guide](https://dev.epicgames.com/documentation/en-us/unreal-engine/geometry-scripting-users-guide-in-unreal-engine)
- [threaded rendering guide](https://dev.epicgames.com/documentation/en-us/unreal-engine/threaded-rendering-in-unreal-engine)
- [Unreal Insights](https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-insights-in-unreal-engine)
- [Three.js voxel example](https://threejs.org/manual/pages/voxel-geometry.html)
- [Web Workers guide](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers)
- [InstancedMesh](https://threejs.org/docs/pages/InstancedMesh.html)
- [Three.js disposal guide](https://threejs.org/manual/pages/how-to-dispose-of-objects.html)

### Voxel art and import

- [base format](https://github.com/ephtracy/voxel-model/blob/master/MagicaVoxel-file-format-vox.txt)
- [extension specification](https://github.com/ephtracy/voxel-model/blob/master/MagicaVoxel-file-format-vox-extension.txt)
- [3D import formats](https://docs.godotengine.org/en/stable/tutorials/assets_pipeline/importing_3d_scenes/available_formats.html)
- [VOXLoader](https://threejs.org/docs/pages/VOXLoader.html)

## Refresh procedure

When the target project or dependency changes, open the relevant primary source, compare it with the installed API/source, record the selected version and capability probe, then update the affected guidance or project decision. Do not change architecture solely because a rolling documentation page changed. Preserve `references/example-prompts.md` with the package and keep its named workflows aligned with the skill.

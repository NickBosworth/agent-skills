---
name: agentic-skills-voxel-game-dev
license: CC0-1.0
description: Design, implement, debug, extend, and optimize voxel-based games in new or existing projects. Use for block worlds, editable scalar-field terrain, voxel art game assets, chunk meshing, terrain streaming, procedural generation, mining/building, collision, lighting, world saves, and voxel multiplayer. Adapt to Godot, Unity, Unreal, web, or custom engines. Inspect the project, choose the representation, deliver playable increments, and verify voxel-specific correctness and performance. Exclude medical/scientific voxel analysis, standalone voxel-style images, and unrelated game work.
metadata:
  version: "2.0.0"
---

# Voxel Game Development

Turn the requested player experience into an implemented, verified increment. Preserve the project's engine, useful architecture, save compatibility, and established instructions. This skill does not mandate a rewrite or every possible voxel subsystem.

## Start here

1. Read the request and applicable project instructions. Inspect the repository, engine manifests, pinned packages/plugins, relevant code, tests, and task records. Find the real build/run/test commands; do not invent them.
2. Identify **block cells**, a **sampled scalar field**, **voxel art assets**, or a deliberate hybrid. Voxel appearance alone does not require an editable world. Read [representation and coordinates](references/representation-and-coordinates.md) before changing world data, meshing, or picking; use [asset pipeline](references/asset-pipeline.md) for art-only work.
3. Choose the smallest route below. Load only relevant references and the matching engine adapter.
4. Resolve the first consequential uncertainty, then do the authorized work. Do not stop at a design or checklist when implementation is requested.

| Request | First actions | Reference |
| --- | --- | --- |
| New game or substantial architecture change | Establish player loop, representation, platform, engine, and one playable milestone | [Planning and architecture](references/planning-and-architecture.md) |
| Feature or extension | Trace current contracts and data flow; implement a narrow end-to-end change | Relevant subsystem below |
| Bug, seam, corruption, wrong picking | Reproduce a tiny deterministic case; identify the broken invariant | [Testing and performance](references/testing-and-performance.md) plus affected subsystem |
| Performance or large worlds | Capture a repeatable baseline; identify the limiting stage | [Testing and performance](references/testing-and-performance.md), [streaming and saves](references/world-streaming-and-saves.md) |
| Terrain rendering | Establish representation, visibility, dependencies, output ownership | [Block meshing and lighting](references/block-meshing-and-lighting.md) or [smooth terrain and LOD](references/smooth-terrain-and-lod.md) |
| Mining, building, navigation, simulation, networking | Define authoritative edits and player-visible completion | [Gameplay and multiplayer](references/gameplay-and-multiplayer.md) |
| Voxel model import | Inspect format, units, hierarchy, materials, animation, and export | [Asset pipeline](references/asset-pipeline.md) |

**Engine adapters:** [Godot](references/engine-godot.md), [Unity](references/engine-unity.md), [Unreal](references/engine-unreal.md), [web/custom](references/engine-web-and-custom.md). Named APIs are lookup landmarks. Verify installed engine/package versions and target capabilities before coding.

## Ask useful questions, one at a time

Infer answers from the user and repository first. Ask when uncertainty changes player experience, compatibility, a major dependency, scope, or substantial rework. Explain what you observed, what remains unknown, why it matters, two or three realistic options, and a justified recommendation. Ask one question, wait for its answer, and carry it forward.

Example: “The brief asks for digging caves but does not specify the surface style. That changes the world data and mesher. Do you want discrete blocks, smooth terrain, or both? I recommend blocks for this small building prototype because edits, placement, and collision can share a cell grid.”

Do not impose a fixed questionnaire. Prefer the existing engine; evaluate an available plugin before custom infrastructure. State reversible assumptions and proceed. Do not add an approval ceremony for ordinary implementation. Respect actual user/host permissions for paid dependencies, destructive changes, publishing, and external actions.

## Establish the contract

Reuse existing design/task documents. For substantial work, adapt [project brief](assets/templates/project-brief.md), [voxel contract](assets/templates/voxel-contract.md), or [milestone](assets/templates/milestone.md) into established locations. Fill relevant sections; do not create parallel documentation or treat placeholders as decisions.

Record or confirm:

- Playable interaction, camera/controller, world and voxel scale, target device/build, desired frame rate, memory constraints, and acceptance scenario. Mark unmeasured budgets as hypotheses.
- Cell versus sample semantics; axes/handedness; world/chunk/local transforms; negative coordinate and boundary rules; material identities and visibility; authoritative data versus caches.
- Editable channels and dependency stencils; job ownership/revisions/lifetime; unloaded-neighbor policy; mesh/collision/navigation publication.
- For persistent/networked worlds: save schema, generator/config/content versions, edit ordering, durability/acknowledgement meaning, migrations, and source of truth.

A sparse chunk lookup with contiguous local storage is a candidate for a conventional editable block world, not a universal prescription. Compare alternatives when access patterns justify them. Chunk sizes such as 16 or 32 are experiment candidates, never established optimums. Add octrees, ECS, GPU meshing, LOD, multiplayer, or infinite streaming only for a requirement or measured reason.

## Implement playable increments

Adapt this sequence for a new editable-world game. Enter at the relevant step for a narrow existing-project task.

1. **Prove the loop.** Render a tiny world; move/look; target an object/cell; perform the interaction; show feedback. Make placement visibly succeed or fail for a clear reason. For art-only games, use the normal engine asset/gameplay path.
2. **Prove correctness.** Implement coordinates, boundary sampling, meshing, and collision with small fixtures. Keep a simple oracle while optimizing. Cover negative positions, seams, empty/full chunks, material boundaries, and repeated edits.
3. **Prove persistence when required.** Save an edit, restart, reload, and verify the same world. Cover rejected/corrupt/older data according to the compatibility promise. A queued save does not establish durability.
4. **Bound scale.** Add required streaming, queues, batching, cancellation, and prioritization. Reject stale jobs. Measure memory and generation/mesh/upload/collider costs separately.
5. **Optimize the measured bottleneck.** Compare the same build, scene, seed, movement/edit workload, and hardware. Retain correctness tests. Introduce LOD or a more complex algorithm only when simpler work establishes a need.

Separate data algorithms from scene mutation where practical. Use immutable snapshots or explicit synchronization. Publish render/physics resources on the thread and API path permitted by the actual engine. Reclaim arrays, GPU buffers, colliders, and pooled identities from canceled/stale jobs.

## Preserve these invariants

- **Negative coordinates:** use mathematical floor division and nonnegative local coordinates. Require `world = chunk * size + local`. Engine integer division may truncate toward zero.
- **Boundaries:** emit owned cells using the exact read halo. Invalidate every output whose dependency stencil includes an edit; edges/corners can involve diagonal chunks. Neighbor load, unload, or replacement can change the result too.
- **Scalar fields:** distinguish cells from corner samples. Define isovalue, inside sign, interpolation, equality policy, gradients, and precision. Arbitrary density/noise is not automatically a signed distance field.
- **Greedy meshing:** merge only faces whose direction, material/render pass, texture rule, and relevant interpolated shading stay equivalent. Triangle count does not prove correctness.
- **Asynchronous jobs:** stamp outputs with world/session identity, chunk lifetime, channel revisions, relevant neighbor/sample revisions, and mesher/material/LOD configuration. Checking only the center chunk's voxel revision can accept stale output.
- **Collision and queries:** decide when edits affect picking, movement, rendering, physics, and navigation. If updates lag, define temporary behavior and an acceptable delay.
- **Generation and saving:** preserve an algorithm/config/content contract, not just a seed. Do not regenerate away edits or silently reinterpret material IDs. Verify compatibility changes against old fixtures.
- **Scale:** budget resident data, halos, old/new mesh overlap, in-flight copies, GPU buffers, collision, navigation, entities, and caches. Instancing does not remove hidden faces; fewer triangles do not guarantee a cheaper frame.

## Validate and report evidence

Use [testing and performance](references/testing-and-performance.md) to select cases relevant to the change. See [tooling](references/tooling.md) for the bundled Python helpers:

- `scripts/voxel_oracles.py`: exact coordinate, index, dependency, and opaque-face fixtures; compare adapted engine output where appropriate.
- `scripts/voxel_budget.py`: transparent storage/geometry estimates from declared inputs, with no FPS prediction.
- `scripts/test_voxel_tools.py`: regression checks for the helpers themselves.
- `scripts/validate_package.py`: offline structure/link checks that require the example prompts to remain present when updating or exporting the package.

Run helpers with Python 3.10+ and `--help`. Resolve paths from the installed skill directory, not the game's working directory. They need no third-party Python packages. If Python is unavailable, use the documented mathematics in the project's test framework.

Validate changed game code separately: package self-tests do not validate an engine renderer, save system, or gameplay. Inspect a running build or captured frames and interaction/collision behavior when possible. Headless tests cannot establish visual quality, player feel, or target-device performance. State which checks ran and which could not run; never fabricate benchmarks or claim unobserved behavior works.

Adapt [benchmark scenario](assets/templates/benchmark-scenario.json) and [verification report](assets/templates/verification-report.md) when useful. Keep meaningful regression tests for the actual failure; avoid a new harness for a trivial change. Stop broadening checks once material remaining risks are covered.

## Finish the work

Summarize implemented behavior, decisions, changed files, run instructions/controls, evidence, and material limitations. Update the established task record for ongoing work. If a real capability is missing, finish independent work and identify the exact remaining action.

Always retain [example prompts](references/example-prompts.md) when copying, exporting, or updating this skill. They are part of the package. When explaining usage, provide a prompt suited to the immediate task. Examples use `$agentic-skills-voxel-game-dev`; adapt invocation to the host's supported picker or syntax.

Consult [research sources](references/research-sources.md) for primary evidence and refresh guidance. Recheck changing engine/plugin claims before coding; the publication date is not an API compatibility guarantee.

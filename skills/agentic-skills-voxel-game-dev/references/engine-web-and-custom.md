# Browser and custom-engine adapter

Read this adapter for browser engines, Three.js, or an existing custom native renderer. Preserve the established stack. Treat named APIs as documentation lookup landmarks; verify the installed library/backend version and actual device capabilities before coding. Do not convert an existing native game into a website simply to make a preview convenient.

## Inspect the runtime and its boundaries

For browser projects, inspect `package.json`, lockfiles, bundler configuration, renderer initialization, worker entry points, persistence, and existing test/build scripts. Determine the actual Three.js or other engine revision and whether production uses WebGL, WebGPU, or a documented fallback. Query supported features/limits rather than inventing a universal browser voxel capacity. Confirm the target browsers and input devices.

For native projects, inspect build files, dependency locks, graphics/physics interfaces, task scheduler, platform targets, and executable entry points. Read the backend's matching primary documentation and installed headers. Keep voxel data and meshing independent of API-specific graphics handles. Establish buffer ownership, upload submission, completion/fences, and deferred destruction through the existing renderer rather than creating a competing rendering abstraction.

## Build chunk surfaces and own transferred data

The [Three.js voxel example](https://threejs.org/manual/pages/voxel-geometry.html) demonstrates exposed-face generation, cell/chunk storage, negative-coordinate handling, and affected-neighbor updates. Use it as an implementation reference, not a promise that its example chunk size, texture atlas, or synchronous loops suit the target game. Remove hidden faces before pursuing draw-call optimizations for solid block terrain.

Move expensive generation/meshing to workers when profiling justifies it. The [Web Workers guide](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers) describes separate execution contexts and message/transfer semantics. Send plain data and typed buffers, not scene objects. Specify whether each payload is copied, transferred, or intentionally shared; transferred buffers cannot remain the sender's usable working copy. If shared memory is chosen, verify deployment prerequisites and define synchronization explicitly.

Include request identifiers, chunk residency tokens, voxel revisions, and neighbor dependencies. Reject stale replies, bound queued bytes/jobs, handle worker errors, and retire or restart workers cleanly. Cancellation must also define disposal of eventual results. Keep DOM and renderer work in their owning context unless an explicitly supported worker/offscreen rendering design is already established.

## Manage GPU resources and collision deliberately

For [InstancedMesh](https://threejs.org/docs/pages/InstancedMesh.html), verify shared geometry/material suitability, instance update flags, and bounds after transforms. Use spatial groups where helpful. Instancing does not remove internal terrain faces or provide a collision engine.

Follow the [Three.js disposal guide](https://threejs.org/manual/pages/how-to-dispose-of-objects.html). Removing an object from a scene does not dispose its geometry, material, or textures. Track which resources are shared; release them only after their last owner. Include render targets, listeners, controls, workers, and physics allocations in teardown. Inspect `renderer.info` alongside application memory counters rather than treating it as total process/VRAM accounting.

Define gameplay collision independently: a static voxel query or raycast is not sufficient proof of robust character movement, swept projectiles, or dynamic rigidbody contact. Integrate the project's physics backend or explicit movement solver and verify collision revisions against rendered edits. Keep authoritative voxel storage independent of GPU-only buffers and disposable scene objects.

## Verify production execution

Run the project's actual compiler/build and focused data tests, then serve and exercise the production output in a real supported browser. Type-checking, DOM emulation, and a mock graphics context cannot certify rendering. A headless browser using software graphics is useful for functional checks but cannot establish target GPU performance. For native projects, compile and run the actual executable and target build where available.

Exercise spawn, input capture/release, boundary edits, negative coordinates, resize, repeated travel/unload, save/reload, and worker failure. Inspect surfaces and collision in a rendered run. Capture frame-time distribution, generation/transfer/upload time, queue depth, geometry counts, and memory after repeated travel. Test graphics-context/device recovery when required by the product. Report exactly which browser/device/backend and graphical checks were available.

# Implementing a professional game interface

Use this reference after identifying the game's interaction needs and design direction. Adapt the architecture to the existing repository and the size of the change. A small pause-menu repair does not justify replacing the game's UI stack.

Linked engine details require version checks; the workflow is engineering synthesis.

## Contents

- [Inspect before choosing technology](#inspect-before-choosing-technology)
- [Use the engine's appropriate capabilities](#use-the-engines-appropriate-capabilities)
- [Separate data, presentation, and navigation](#separate-data-presentation-and-navigation)
- [Build complete component states](#build-complete-component-states)
- [Make layout and language robust](#make-layout-and-language-robust)
- [Provide semantics beyond rendered pixels](#provide-semantics-beyond-rendered-pixels)
- [Budget and measure UI performance](#budget-and-measure-ui-performance)
- [Handle asynchronous work honestly](#handle-asynchronous-work-honestly)
- [Verify behavior in the real runtime](#verify-behavior-in-the-real-runtime)
- [Leave an implementable handoff](#leave-an-implementable-handoff)

## Inspect before choosing technology

Read project instructions, engine/version manifests, package locks, current scenes or widgets, input configuration, localization tooling, save conventions, and supported platform targets.

Determine whether the requested result is a concept, an interactive prototype, a production implementation, or a repair. State unresolved constraints instead of quietly substituting a screenshot for a working interface. Prototype in the actual runtime when the risk concerns focus, timing, scene integration, spatial interaction, or layout behavior.

Inspect version-specific documentation before selecting APIs. Unversioned documentation can describe a newer release than the project uses. Check the exact package version as well as the engine version, and avoid introducing a second input or UI system merely because an example uses it.

## Use the engine's appropriate capabilities

| Environment | Inspect and use | Avoid assuming |
| --- | --- | --- |
| Unity | Existing UI stack, input package, render pipeline, UI Toolkit/uGUI capabilities, localization and accessibility integrations | That one UI system is always best, or that old feature gaps still exist |
| Unreal Engine | UMG/Slate structure, CommonUI if present or justified, Enhanced Input integration, local-player ownership, widget lifecycle | That visual stacking alone establishes input priority or focus |
| Godot | Control nodes, Containers, Themes, anchors, InputMap, focus neighbors, viewports and scaling | That automatic focus inference or fixed pixel offsets work for every layout |
| Web, custom engines, other frameworks | Retained or immediate rendering model, action routing, layout/text shaping, accessibility bridge, asset and lifetime management | That browser widgets or an engine add-on automatically provide game-appropriate interaction |

Unity's current comparison page lists capabilities by release and presents UI Toolkit and uGUI as choices with different authoring and runtime considerations. The reviewed page includes world-space UI and VR among UI Toolkit's supported use cases. Therefore, do not encode the outdated blanket rule that all world-space UI must use uGUI; inspect the installed release, existing content, and required features. [P07](sources.md#p07)

Unreal's CommonUI input guide describes active widget routing and synthetic-cursor behavior layered on UMG/Slate. When debugging controller activation, inspect user identity, pointer capture, focused target, and the active widget tree. Treat focus, input handling, and painted order as related mechanisms that require deliberate configuration. [P10](sources.md#p10)

Godot provides dedicated focus and scaling facilities. Use those facilities deliberately, then validate actual runtime behavior when controls hide, content changes, or the viewport resizes. Read the matching version documentation before applying property names or recipes. [P08](sources.md#p08) [P09](sources.md#p09)

## Separate data, presentation, and navigation

Keep authoritative game state outside the widget tree. The UI reads an appropriate view of the state and requests domain actions. A button should not become the only owner of inventory rules, spending validation, save state, or network authority.

Use the simplest separation that fits the codebase. A small game may need a few clear services and signals; a complex game may already have view models, commands, and navigation services. Preserve the established pattern when it is sound.

Define these contracts for meaningful screens:

| Contract | Questions it must answer |
| --- | --- |
| Data | Which values are authoritative, derived, editable drafts, or display-only? |
| Actions | What preconditions apply, and what result confirms success? |
| Lifetime | Who opens, closes, owns, subscribes, and releases the screen? |
| Navigation | Which context receives input, and where does focus return? |
| Persistence | What is committed, when is it saved, and to which scope? |
| Failure | What remains available after rejection, interruption, or partial failure? |

Model transitions explicitly enough to prevent impossible combinations. Loading, ready, empty, invalid, saving, failed, and disconnected are different conditions; a single boolean rarely communicates all of them. Define permitted interactions in each state. For example, the player may inspect cached equipment while a purchase request is pending, but cannot submit that same purchase twice.

Keep stable item identities through sorting, filtering, and list virtualization. When the underlying object disappears, dismiss or replace its details deliberately. Release event subscriptions and input registrations when their owner ends, and avoid callbacks targeting destroyed screens.

## Build complete component states

Create reusable components for patterns the project actually repeats: buttons, navigation rows, settings controls, inventory cells, tooltips, dialogs, HUD meters, and notifications. Separate semantic roles from their visual expression so the same interaction can adopt the game's materials, typography, and motion language.

Implement default, hover where relevant, focus, pressed, selected, disabled, loading, error, and success behavior as applicable. Specify transitions between them. A focused disabled option must not look like an enabled action; a selected tab must remain identifiable after focus moves elsewhere.

Use shared tokens or theme resources for spacing, type roles, colors, shapes, and motion. Support local exceptions when the gameplay requires them, and record the reason. Avoid hundreds of disconnected constants or a rigid design-system abstraction that makes a simple bespoke HUD difficult to maintain.

Input feedback should register promptly; decorative animation should follow rather than block repeated tasks. Ensure reduced-motion behavior still communicates state changes. Keep the interactive hit area and accessibility description aligned with the visible component during animation.

## Make layout and language robust

Use layout constraints, anchors, containers, and meaningful minimum sizes rather than reconstructing each resolution manually. Design overflow behavior for long labels and descriptions before content arrives. Choose wrapping, scrolling, pagination, disclosure, or an expanded panel according to the task; silent truncation cannot hide a critical consequence.

Separate UI resolution and scaling from world rendering where the engine supports it. A player lowering graphics resolution should not unnecessarily lose legible menus. For pixel-art projects, decide which surfaces preserve integer scaling and which use separately rendered readable typography. Godot documents different strategies for viewport scaling, integer scale factors, and independently scaled 3D rendering. [P09](sources.md#p09)

Localize complete meaningful messages using the project's localization system. Avoid assembling grammar from fragments. Plan for plurals, grammatical variants, numerals, units, punctuation, and right-to-left layouts. Directional controls, maps, and progress representations need individual review; blindly mirroring every asset may change meaning.

Use font resources with the required character coverage and shaping support, and test actual target scripts. Confirm fallbacks, inline icons, button glyphs, and text effects at the intended size. Keep informative text editable and searchable in the content pipeline instead of baking it into decorative textures.

Run pseudo-localization for expansion and missing keys, then test representative real languages for shaping and reading order. Pseudo-localization does not prove translation quality. Include unusually long player names, mixed scripts, line breaks, and numbers at the extremes the game can produce.

## Provide semantics beyond rendered pixels

Give interactive elements stable semantic names, roles, current values, states, and useful action descriptions. Keep reading order, navigation order, and visual hierarchy coherent. Inspect what the engine and each target platform can actually expose to assistive technology; do not claim screen-reader support because labels exist in a design file.

Where a supported narration or accessibility bridge exists, connect it to the same authoritative state as the visible UI. Avoid duplicate announcements and narration of rapidly changing decorative values. Allow important messages to be reviewed when their original timing makes them easy to miss.

Custom-drawn controls require explicit semantics and interaction support. Reusing a standard control can reduce work, but verify the themed result, input routes, and runtime integration. Document unsupported capabilities precisely rather than implying that every engine/platform combination has equivalent accessibility APIs.

## Budget and measure UI performance

Agree a UI budget within the game's frame, memory, loading, and input-response constraints. Profile on representative target hardware during the busiest relevant scene, with the largest realistic data set and expensive menus visible.

Unreal's UMG optimization guidance favors event-driven changes over raw attribute bindings that poll every frame, and describes invalidation, volatile widgets, and loading/lifetime tradeoffs. Frequently needed screens can merit preloading; rarely used heavy screens can load on demand. Apply these mechanisms to the measured problem and matching engine version, rather than treating all data binding in every framework as inefficient. [P11](sources.md#p11)

Inspect layout rebuilds, redraws, overdraw, draw calls, texture and font memory, allocations, text shaping, animation, and synchronization work. Update a visible value when its meaningful presentation changes; do not force every counter through an expensive rebuild each frame.

Virtualize long collections when useful, but verify focus, scrolling, selection identity, and accessibility with recycled rows. Cache static work appropriately, while invalidating it correctly when language, scale, theme, or data changes. Clean up invisible resources based on measured costs and response needs.

Prefer a simpler effect or composition when a flourish consumes the gameplay budget. Record measurements and the chosen tradeoff. Do not invent a universal maximum widget count, animation duration, or draw-call budget.

## Handle asynchronous work honestly

Design pending, success, failure, retry, cancellation, stale-data, and unavailable states for actions that can take time or fail. Prevent duplicate submissions without making the whole game unnecessarily unresponsive. Confirm the authoritative outcome before presenting an irreversible action as completed.

Keep progress truthful. Show a percentage only when there is a meaningful denominator; otherwise describe the work or an indeterminate state. Preserve player input after recoverable errors. Explain the next useful action in ordinary language.

Treat notifications as a queue with priority and lifetime rules. Related updates can combine, while consequential failures need a durable review path. Ensure a late response cannot overwrite a newer selection or reopen a screen the player intentionally closed.

## Verify behavior in the real runtime

Use targeted automated checks for state transitions, input ownership, persistence, formatting, and other behavior whose failure is consequential. Do not add tests that merely duplicate widget construction or create a large test harness for a trivial visual adjustment.

Perform a runnable task walkthrough: start, enter settings, change a preference, cancel or commit, resume, reach a representative game state, encounter an error, and recover. Add genre-specific interactions and the relevant device cases from [Platforms, displays, and input](platforms-and-input.md).

Capture real runtime images or video at critical states and supported sizes. Compare composition, clipping, focus, contrast, and motion against the design intent. Distinguish static inspection from an interaction test and an emulator check from hardware validation. If runtime access is unavailable, report the exact unverified behavior and provide concrete steps to verify it.

## Leave an implementable handoff

Deliver the changed UI, reusable resources, state and navigation decisions, relevant validation results, and known limitations. Include where the game's future UI work should obtain tokens, components, strings, and input mappings. Explain meaningful code sections and decisions using the repository's documentation conventions.

Remove temporary mock values from production paths or clearly isolate them in a preview fixture. Preserve useful fixtures for empty, crowded, error, and localization states. State whether the work is a tested implementation, an interactive prototype, or a design specification; visual polish alone must not obscure that distinction.

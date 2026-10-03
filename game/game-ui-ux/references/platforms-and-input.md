# Platforms, displays, and input

Use this reference when the game must work across devices or input methods, or when navigation, scaling, interruption, and local multiplayer are part of the task. Apply only the relevant routes. A platform label does not determine a visual style or genre.

The workflow and test suggestions are design synthesis. Linked sources identify the evidence and the scope of specific platform guidance; they do not make every recommendation a certification requirement.

## Contents

- [Establish the actual target](#establish-the-actual-target)
- [Define the input contract](#define-the-input-contract)
- [Make focus and navigation deliberate](#make-focus-and-navigation-deliberate)
- [Desktop and unusual displays](#desktop-and-unusual-displays)
- [Couch and handheld play](#couch-and-handheld-play)
- [Touch and mobile](#touch-and-mobile)
- [VR, AR, and mixed reality](#vr-ar-and-mixed-reality)
- [Local multiplayer and shared screens](#local-multiplayer-and-shared-screens)
- [Interruptions and persistence](#interruptions-and-persistence)
- [Choose a practical test matrix](#choose-a-practical-test-matrix)

## Establish the actual target

Record the smallest supported display, viewing distance, aspect ratios, operating-system scaling, safe areas, permitted orientations, and input devices. Distinguish a phone held in two hands, a tablet on a stand, a handheld with physical controls, and a television viewed across a room. Pixel resolution alone cannot describe any of these experiences.

Find the target platform's current public guidance and any applicable partner requirements available to the project. Record the source, revision, and applicability. Never invent console certification rules or assume that publicly available accessibility recommendations are the complete submission requirements.

For each supported configuration, answer:

| Decision | Evidence to record |
| --- | --- |
| What must remain visible? | Threat, ball, road, board, subtitle, pointer, hand, or instrument regions |
| What can change with available space? | Panel arrangement, columns, disclosure, pagination, HUD placement |
| What must preserve its geometry? | Board layout, aiming relationship, pixel art, spatial instrument, competitive viewport |
| What does the player physically do? | Reach, glance, drag, type, navigate focus, hold a controller, turn the head |
| What happens outside the ideal setup? | Resize, reconnect, rotate, dock, switch monitor, lose tracking, resume |

Support a meaningful minimum configuration. Do not claim support for every screen by shrinking controls until they technically fit.

## Define the input contract

Represent actions by meaning, such as confirm, back, inspect, pan, equip, and pause. Bind physical keys, buttons, gestures, and accessible alternatives to those actions. Generate instructions from the active mapping instead of embedding key names in artwork or prose.

Specify which context receives each action: gameplay, HUD interaction, menu, text entry, modal dialog, or platform overlay. The open-menu event must not unintentionally activate the first item, and closing a modal must not also fire a weapon or submit the screen beneath it. Explicitly document contexts where gameplay continues or mixed input is intentional.

An input transition should preserve the player's current task. Switch prompts after meaningful intentional input, using suitable dead zones and arbitration to prevent stick drift or an incidental pointer movement from repeatedly changing glyphs. Keep remapping, held buttons, simultaneous devices, and touch-to-controller handoffs in the test plan. Do not prescribe one debounce duration for every game.

Separate device availability from device ownership. A connected controller may belong to another local player. Reconnection should restore the correct player's controls without changing another player's selection. Define what happens if the device disappears during a hold, drag, text edit, or confirmation.

## Make focus and navigation deliberate

Treat focus as state, not as a decorative outline. Each interactive screen needs an initial target, predictable directional and sequential navigation, a visible focus treatment, an activation rule, and a return target. Distinguish selected, focused, hovered, pressed, checked, and disabled states.

Define navigation by the player's reading and task order. Explicit neighbors are especially valuable for irregular grids, overlapping panels, radial layouts, and multi-column inventories. Godot's own navigation guidance warns that inferred neighbors can behave unexpectedly, hidden controls can lose focus, and built-in UI actions should not be reused as gameplay actions. These are concrete Godot concerns to inspect rather than assumptions about every engine. [P08](sources.md#p08)

On opening a modal, move focus inside it and apply the intended input boundary. On closing it, restore the initiating control if it still exists; otherwise choose a documented nearby fallback. When a list changes, preserve selection by item identity, not a recycled row index. Do not let notifications, background refreshes, or decorative animation steal focus.

Check that scrolling brings the focused item into view. Explain why an unavailable action is unavailable when that information helps the player. A disabled control can remain discoverable for explanation without accepting activation. Never require hover to reveal information needed by controller or touch users.

## Desktop and unusual displays

Desktop support includes keyboard-only navigation, pointer precision, window resizing, display scaling, text input, fullscreen transitions, and external controllers when promised. Preserve ordinary text editing behavior in editable fields. Confine pointer capture to contexts that need it, and provide a reliable way to release it.

For ultrawide and multi-monitor layouts, decide separately how the world view and the interface use extra space. A larger field of view does not require pushing every status indicator to the farthest corners. Consider a player-adjustable HUD boundary, central task region, or explicit monitor assignment when the game benefits from them. Respect competitive visibility constraints already defined by the game.

Reflow dense menus before compressing typography. Preserve a suitable relationship between the pointer, selected object, tooltip, and details panel. Test dragging panels between different display scales, restoring a window after a monitor is removed, and reopening saved layouts on smaller displays. Clamp restored positions to usable bounds.

Choose an explicit strategy for aspect mismatch: reveal more world, recompose, crop only dispensable material, or letterbox. Godot documents separate viewport stretching, aspect handling, anchors/containers, and UI-versus-3D resolution scaling. These choices solve different problems; stretching the final rendered image is not a substitute for a responsive layout. [P09](sources.md#p09)

## Couch and handheld play

For couch play, verify readability from the intended seating distance and with the actual television setup. A controller interface should expose complete task paths, including error recovery, text entry, calibration, and quitting. Respect the platform's naming and button conventions without forcing another platform's layout onto them.

Select the relevant [measurement profile](accessibility.md#optional-measurement-profiles), then validate the rendered interface at the intended viewing distance. Evaluate spatial headset text in the headset itself.

For handhelds, protect physical readability while reducing simultaneous complexity. Consider compact and expanded information modes, accessible inspection panels, and fewer columns. Check long tooltips, inventory comparisons, chat entry, and the busiest gameplay moment at handheld size.

Valve's reviewed Steam Deck criteria require complete default controller access, matching active-input glyphs, and controller-usable text entry. The Deck-specific text requirement is readable characters at 30 cm, with a 9 px floor at 1280×800 and 12 px recommended where possible. These are review criteria for that device, not desirable universal typography sizes. Recheck the current checklist before a submission. [P01](sources.md#p01)

Test docking and undocking as a layout and input transition. Decide whether display-specific settings belong to the device, the connected display, or the player profile.

## Touch and mobile

Design around actual concurrent gestures. Ask whether moving, aiming, selecting, dragging, or using an ability must happen together, and which fingers perform each action. Provide alternatives where a gesture is difficult or ambiguous. Avoid requiring precision directly underneath an obscuring finger.

Apple's WWDC24 guidance recommends anchored interface sections, safe-area awareness, and touch controls adapted to gameplay. It gives 44×44 points as the default iPhone/iPad hit target, while warning that smaller controls are harder to select. Press feedback should remain perceptible around the finger, and controller glyphs should come from the actual device mapping. These are Apple-platform recommendations, not raw pixel measurements. [P03](sources.md#p03)

Google's YouTube Playables guidance recommends 48×48 dp touch targets with 8 dp spacing, distinct interaction states, keyboard access, and adaptive game canvases. These measurements use Android-style density-independent units and cannot be substituted numerically for Apple points or game-world units. [P04](sources.md#p04)

For menus, support direct selection instead of making players manipulate virtual gameplay controls to navigate. Ensure tap targets remain separate even if their visible artwork is smaller. Give gestures a cancellation path and preserve the distinction between a tap, a scroll, and a drag.

Account for notches, rounded corners, home indicators, keyboards, gesture edges, and orientation changes. Show an input field and its relevant action when the software keyboard opens. Test portrait, landscape, tablets, and foldable postures only where they are supported. Preserve task state during rotation; do not silently repeat an action.

## VR, AR, and mixed reality

Treat spatial UI as a separate interaction design problem. Identify the headset, tracking capabilities, seated or standing use, dominant hand, reach range, and direct versus distant interaction. Check comfort and legibility in the headset; a desktop capture cannot verify depth or physical effort.

Meta's display guidance explains why flat HUD overlays can conflict with stereoscopic depth cues. It recommends keeping sustained fixation content at least 0.5 m away and notes that roughly 1 m is often comfortable. This guidance concerns viewing comfort, not a universal placement rule for every briefly used direct-touch control. [P05](sources.md#p05)

Meta's hand-input guidance distinguishes reachable direct interaction from indirect targeting, emphasizes physical and angular target size, and recommends visible handoff feedback. Its current examples place direct touch around 42–46 cm and indirect interaction around 0.8–3 m. It also cautions against moving wrist-attached menus and competing simultaneous gaze/ray targets. Preserve the hand-input and device scope; validate the actual user and SDK. [P06](sources.md#p06)

Choose whether an element is world anchored, attached to an object, or follows the player. Document the reason and the recovery method when it leaves view. Consider adjustable height, distance, orientation, recentering, and equivalent seated access. Avoid sustained arm elevation for frequent menu work.

Keep critical information discoverable without requiring constant head searching. Test occlusion, depth, changing backgrounds, tracking loss, dominant-hand changes, and interrupted gestures. Feedback must still work when haptics are unavailable. For AR/MR, evaluate contrast against actual surroundings and the boundary between virtual content and physical obstacles.

## Local multiplayer and shared screens

Assign each UI instance an owning player, viewport, input route, and settings scope. Decide which screens are per-player and which are shared. One player's pause or accessibility panel must not accidentally consume another player's confirmation input.

Treat each split-screen viewport as a real smaller display. Redesign density and text for that area instead of scaling down the full-screen HUD wholesale. Protect critical play regions, identify players with redundant cues, and check spectator information separately from player information.

Document join, leave, reconnect, guest, profile-switch, and shared-pause behavior. Test different devices and accessibility preferences together. Make any restriction explicit, such as a shared game speed that cannot differ between players.

## Interruptions and persistence

Specify behavior for focus loss, platform overlays, controller disconnection, backgrounding, suspend/resume, network loss, and save conflicts. A menu overlay is not evidence that the simulation is paused. Make running, paused, reconnecting, and recovering states clear.

Persist committed preferences at the appropriate player or device scope. Keep an edit draft separate when a screen offers Apply and Cancel. Offer recovery from a display change that would otherwise leave the interface unusable, and retain the last working configuration until confirmation.

Valve explicitly advises excluding machine-specific video settings from Steam Cloud synchronization. Use that principle to review which settings travel with the player and which need local validation; do not indiscriminately synchronize all UI configuration. [P12](sources.md#p12)

## Choose a practical test matrix

Select configurations from the real support promise and highest risks. Use representative combinations plus deliberate extremes instead of claiming every possible permutation has been tested.

| Test dimension | Representative checks | Failure evidence |
| --- | --- | --- |
| Display | Smallest supported size; largest text; narrow and wide aspect; safe areas | Clipping, hidden actions, unusable reading distance |
| Input | Keyboard, pointer, controller, touch, spatial input as supported | Dead ends, wrong glyphs, accidental simultaneous actions |
| Focus | First entry; modal return; removed list item; disabled action | Lost or invisible focus; jump to unrelated content |
| Transition | Resize, rotation, hotplug, dock, suspend, overlay | Reset task, duplicate action, unresponsive input |
| Player ownership | Join/leave, two controllers, mixed settings, split view | Cross-player input or information leakage |
| Content | Long translations, empty/full inventory, large numbers, multiline names | Broken layout or changed reading order |
| Context | Busy scene, glare, couch distance, finger coverage, headset movement | Missed critical state or physical strain |

Record the device or emulator, build, settings, scenario, observation, and remaining limitation. Label simulated checks honestly. Shipping readiness requires evidence that players can complete the important tasks on the intended hardware, not only attractive screenshots.

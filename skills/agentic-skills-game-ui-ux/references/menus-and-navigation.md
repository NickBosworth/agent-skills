# Menus and navigation

## Contents

- [Design complete task flows](#design-complete-task-flows)
- [Entry, main, and pause surfaces](#entry-main-and-pause-surfaces)
- [Settings and reversible previews](#settings-and-reversible-previews)
- [Saves, continuation, and recovery](#saves-continuation-and-recovery)
- [Layers, focus, and action ownership](#layers-focus-and-action-ownership)
- [Inspection, selection, and commitment](#inspection-selection-and-commitment)
- [Maps, journals, and onboarding](#maps-journals-and-onboarding)
- [Asynchronous and unavailable states](#asynchronous-and-unavailable-states)
- [Check the complete loop](#check-the-complete-loop)

## Design complete task flows

Use this chapter as an engineering design contract, adapting its proposals to the game's actual rules. Read [accessibility.md](accessibility.md) for first-run access, input alternatives, narration, and measured profiles; read [platforms-and-input.md](platforms-and-input.md) for device behavior. Do not create every menu described here unless the requested game needs it.

Use established heuristics to question status visibility, consistency, recognition, and recovery. They guide inspection; they do not establish that a particular layout or control mapping will work for this audience. [F01](sources.md#f01)

Define each flow as **entry → understand → inspect/adjust → commit or cancel → observe result → return**. Name the source of truth and the commitment point. Distinguish an instantaneous local action, a pending request, and confirmed durable completion. Specify the effect of closing the screen at each stage.

Identify the menu's relationship to the game: a safe preparation space, an overlay during active play, a diegetic device with world constraints, a spectator tool, or a shared local-player surface. This decision controls available time, information density, input ownership, and recovery. Preserve intentional narrative and gameplay consequences while removing accidental interface ambiguity.

## Entry, main, and pause surfaces

| Surface | Design decisions |
| --- | --- |
| First run | Apply the access plan before mandatory content. Request only information needed for the next meaningful experience; make optional setup revisitable. Establish supported account, language, device, and player ownership where needed. |
| Title screen | Retain an input/account gate when it serves an actual platform or game requirement. Explain how to proceed and recover from a missing controller or account. Avoid a decorative gate that obscures the real entry action. |
| Main menu | Prioritize the current player's likely task using verified state: continue, start, choose mode, join, or load. Keep modes distinguishable by their consequences, not merely different artwork. |
| Pause/options overlay | Specify whether simulation, multiplayer, audio, timers, and background commands continue. Communicate ongoing exposure when the game cannot pause. Define which local player owns the overlay. |
| Results or intermission | Show confirmed outcomes, earned changes, save status where relevant, and the next available action. Preserve a route to inspect meaningful results before moving on. |

Make **Continue** a promise about the selected account, mode, and save. If no resumable state exists, present an appropriate starting action. If verification is pending, show that condition instead of briefly offering an invalid continuation. Differentiate continuing a checkpoint, resuming a suspended session, and joining another player's world when the game supports them.

For exit flows, state the consequence precisely: return to the lobby, leave the session, end the run, or quit the application. Explain unsaved progress when relevant. Avoid collapsing these into an ambiguous “Exit.” Do not add confirmations to harmless navigation by habit.

## Settings and reversible previews

Model each setting with its current committed value, edited value, permitted range, dependencies, persistence scope, and application policy. Separate account settings from device-specific display or input settings. Show unavailable settings with a reason when that information helps the player; do not imply that an unsupported feature is merely switched off.

| Policy | Required behavior |
| --- | --- |
| Immediate | The change takes effect as edited. State whether leaving preserves it and provide a deliberate reset or undo policy. |
| Preview then apply | Apply temporarily, distinguish the preview from the saved value, and restore the previous value on cancel. |
| Explicit apply | Keep edits pending until Apply; handle navigation away without silently discarding or committing them. |
| Restart required | Explain what requires restarting and whether the edited value is saved. Keep the active and next-start values distinguishable. |
| Dependent setting | Explain why changing one option enables, overrides, or limits another; preserve a reasonable recovery path. |

For consequential display changes, retain a known working configuration and offer a tested rollback when the player cannot confirm the new mode. Choose a confirmation policy suitable for the supported platform and access needs; do not import a universal countdown. Verify recovery if the image disappears, focus moves, the application loses foreground status, or a monitor disconnects. Where a confirmation timer is necessary, give the player a usable way to understand and respond to it.

Use previews that demonstrate the actual effect: text scale with representative labels, caption presentation with a sample, or audio balance with controllable playback. Make distressing content avoidable. A preview should use the same values and layout behavior as gameplay rather than an idealized thumbnail.

Name the scope of Reset: this control, category, device profile, or all settings. Preserve unrelated data. Handle persistence failure explicitly; a changed widget is not evidence the value survived a restart. Reopen the screen and relaunch the game in the verification loop.

## Saves, continuation, and recovery

Present enough provenance to make supported save choices understandable: character/world, mode, location or chapter, progress summary, timestamp with sensible local context, save type, and compatibility status. Use a screenshot where it aids recognition, while keeping meaningful metadata readable and accessible. Do not fabricate metadata unavailable from the save system.

Distinguish these states:

| State | Player-facing treatment |
| --- | --- |
| Valid save | Identify what will resume and any meaningful overwrite consequence. |
| Reading or synchronizing | Explain the pending operation; withhold unsupported conclusions about missing data. |
| Local/cloud disagreement | Present the available versions and consequences. Preserve recoverable copies if supported; require a deliberate resolution before replacement. |
| Incompatible version or content | Explain the actual dependency or restriction and any supported remedy. |
| Corrupt or unreadable | Preserve the original and offer verified backup/recovery options. Do not relabel corruption as an empty slot. |
| Restricted save/load | Explain the real game rule or account/storage restriction without promising a workaround the game lacks. |
| Save failed | State that progress was not confirmed saved and offer a feasible retry or safe continuation choice. |

Do not assume the newest timestamp contains the most valuable progress, that conflicting worlds can be merged, or that a cloud upload finished because a local write completed. Design the choice around what the actual storage system can verify.

Separate choosing a slot from overwriting it. Make destructive consequences reviewable and provide an accessible correction or cancellation route. Use plain error explanations without revealing sensitive account information. [A11](sources.md#a11)

Test interruption during save, storage exhaustion, account changes, and repeated activation where those states are possible. Preserve the game's established save architecture; a UI task does not authorize replacing persistence or inventing cloud functionality.

## Layers, focus, and action ownership

Specify the layer stack: gameplay, HUD interaction, menu, tooltip/popover, modal, and system overlay. Each active layer needs an owner, input policy, visibility policy, and return destination. Treat nested dialogs as explicit states; do not let successive Back presses dismiss unrelated levels through an uncontrolled cascade.

For each transition, define:

1. The semantic action and the player/device allowed to invoke it.
2. Whether the current action completes, cancels, or remains pending.
3. The new active layer and initial focus.
4. Whether background gameplay and commands remain active.
5. The return-focus target and fallback if that target disappears.

Give the opening, closing, or committing gesture one owning interaction and prevent it reaching unintended contexts. Preserve deliberately designed hold-open/release-select radial gestures or continuous in-world manipulation. A click release, key repeat, or held controller button must not accidentally fire a weapon, accept the next dialog, or purchase another item. Inspect the whole physical press/release sequence rather than only individual callback functions.

Restore focus by stable item identity where practical; a row index may refer to a different item after sorting or a network refresh. If the origin is gone, choose a predictable valid neighbor or screen-level control. Reconcile the visual focus, semantic focus, selection, and scroll position.

Provide equivalent task outcomes for controller, keyboard/mouse, and touch where supported. Do not make a tooltip available only by hover when it contains necessary information. Allow controller inspection and touch disclosure without accidentally committing the underlying action. Distinguish a tap used to select an item from the action used to equip or buy it.

Define behavior during opening and closing animations: when input starts, which actions can interrupt, and where a cancelled transition lands. Keep nonessential animation from unnecessarily delaying repeat use, without allowing interaction with an invisible or partially initialized screen.

## Inspection, selection, and commitment

For inventory, equipment, crafting, and loadout screens, separate what the player is **viewing**, **comparing**, **selecting**, **previewing**, and **committing**. Decide explicitly which actions apply immediately and which create a pending choice. Do not equip a new item merely because refreshed focus landed on it.

Present decision-relevant properties using consistent units and comparison bases. Explain whether a delta reflects the selected character, current equipment, temporary buffs, or a hypothetical loadout. Mark uncertain or conditional values. Recheck costs, capacity, ownership, and prerequisites when committing; a preview can become stale while the player reads it.

Support the collection's real scale. Useful patterns can include categories, search, sort, filters, favorites, batch selection, and loadout presets; choose those justified by actual player tasks. Keep active filters visible, explain an empty result, and preserve context when returning from inspection. Define what happens when a selected item is consumed, traded, removed, or becomes unavailable.

Only address a store when the game already has one or the user requests it. Show what is being acquired, quantity, currency, known total cost, and the commitment point. For real-money transactions, preserve the platform's purchase flow and show the actual monetary price or a clear route to it; do not hide required currency-bundle purchases behind an apparently smaller item price. Explain already-owned, unavailable, pending, cancelled, and failed transactions. Prevent duplicate purchases and confirm ownership before reporting success. Do not introduce monetization, urgency devices, or purchase prompts as visual polish.

## Maps, journals, and onboarding

Let the map support the player's legitimate question: where am I, what is known, what can I do, and what route information does this game intentionally provide? Separate discovered, rumored, inaccessible, and completed locations. Keep filters, legends, selection, and destination-setting understandable. A map selection must not silently trigger travel or spend a resource.

Connect journal entries, objectives, and known locations where the game permits it. Preserve the distinction between player knowledge and hidden world truth; avoid revealing spoilers through filters, narrated descriptions, or disabled entries. Provide a route back from detail to the same collection context.

Teach interactions near their first meaningful use, with a way to revisit guidance. Decide whether tutorials are dismissible, replayable, or required by the game; explain the consequence of skipping. Adapt hints to current bindings and completed learning steps. Avoid a tutorial that becomes impossible because the required item was already consumed or the relevant action was remapped.

Explain where an interaction leads and what information it expects. Notify players when an unavoidable asynchronous transition changes context, especially when entering gameplay from a waiting screen. [A10](sources.md#a10)

## Asynchronous and unavailable states

Define **loading, empty, filtered-empty, pending, stale, partial, failed, cancelled, disabled, and intentionally hidden** separately. A spinner does not explain all of these conditions.

Associate responses with the request and screen that produced them. Ignore or reconcile obsolete results when players change tabs, accounts, characters, or sessions. Retain entered values and selection when safe after an error. If a completed background action matters after its screen closes, provide an appropriate completion message without reopening a dismissed modal unexpectedly.

Tell players whether Cancel stops the underlying action or merely closes the view. Offer retry only when meaningful; prevent retries from duplicating committed operations. Keep an unavailable action's reason discoverable without making a disabled control behave like an active one. Hide information only when absence serves the design or protects intentionally unknown state.

## Check the complete loop

Before duplicating the design, exercise a representative path in the actual build: enter, inspect, change, cancel, repeat, commit, observe gameplay, return, and resume after interruption. Include delayed responses and lost focus. Verify that appearance, action prompts, state ownership, and persistence agree.

Record the transitions actually tested and the remaining unsupported conditions using [testing-and-review.md](testing-and-review.md). Deliver a working flow with a coherent return path; a set of attractive disconnected screens does not fulfill an implementation request.

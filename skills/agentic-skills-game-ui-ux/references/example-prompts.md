# Example prompts

Use these as complete starting requests after making the skill available to your agent. Replace bracketed project facts with actual facts; omit what the agent can inspect. The invocation name is `$agentic-skills-game-ui-ux` in environments that support that syntax. Other agents can be told to read this folder's `SKILL.md` and follow it.

## Improve an existing game

> Use $agentic-skills-game-ui-ux to inspect this game's current menus and HUD, identify the highest-impact design and interaction problems, and implement a focused improvement. Derive the styling from the actual game and preserve useful existing conventions. Check the affected flow in the game. Ask one question at a time only when the answer would materially change the result.

## Establish a new game's interface

> Use $agentic-skills-game-ui-ux to design the interface for this [genre/hybrid] game. Inspect its core loop, camera, art, and target platforms. Establish the player decisions, explore meaningful visual directions, select a justified direction, and implement one complete menu-to-gameplay loop before extending it. Keep deliberate challenge and hidden information intact.

## Audit without changing code

> Use $agentic-skills-game-ui-ux to audit the menus, HUD, settings, and onboarding in this project. Do not edit files. Give reproducible findings with the affected player tasks, severity, concrete recommendations, and evidence. Distinguish visual observations from runtime and human-playtest results, and identify any surfaces you could not assess.

## Airport or transport management

> Use $agentic-skills-game-ui-ux to improve this airport-management game's scheduling, construction, and delay-diagnosis interface. Help players move from a late flight to the responsible turnaround stage, affected people/vehicles, and an actionable change. Distinguish capacity, utilisation, queues, measured times, and estimates. Keep the visual direction consistent with this game's art and implement a representative working diagnosis flow.

## Fast action on controller and handheld

> Use $agentic-skills-game-ui-ux to redesign this action game's combat HUD for controller and handheld play. Prioritise the information needed during combat, preserve aiming and hazard visibility, support current bindings, and verify focus and readability at the smallest supported viewport. Compare candidate layouts over demanding gameplay scenes and implement the selected direction.

## Horror with deliberate uncertainty

> Use $agentic-skills-game-ui-ux to improve the interface of this horror game while preserving suspense and the existing information rules. Explore how its world and character can shape menus and status feedback. Provide readable and usable access alternatives. Identify any proposal that changes what the player knows or whether the world pauses before making that change.

## RPG inventory and build decisions

> Use $agentic-skills-game-ui-ux to implement a professional inventory and equipment-comparison flow for this RPG. Handle current build modifiers, item conditions, requirements, correct-slot comparisons, protected gear, empty states, and sell/equip confirmation where relevant. Make inspection usable through both controller and mouse, preserve return focus, and show the actual gameplay result of equipping an item.

## Strategy with complex information

> Use $agentic-skills-game-ui-ux to improve the map layers, outliner, tooltips, and notifications in this strategy game. Preserve useful complexity and intentional uncertainty. Help players explain a changed resource balance and a blocked action, then act without losing context. Test dense late-game data, long localisation strings, and the supported input methods.

## Narrative and visual novels

> Use $agentic-skills-game-ui-ux to refine this visual novel's dialogue, choices, backlog, auto/skip controls, saves, and reading options. Match the tone and artwork, make choice intent clear, avoid spoiler leaks, and verify narration and text timing with the game's actual engine support. Preserve the distinction between read and unseen text.

## Cards and private information

> Use $agentic-skills-game-ui-ux to design this multiplayer card game's hand, board, inspection, targeting, and resolution flows. Make modified costs, legal actions, ownership, and timing understandable. Preserve private information in all views, including narration, spectators, replays, and hot-seat transitions. Implement a complete inspect-to-play-to-result loop.

## Rhythm calibration and play

> Use $agentic-skills-game-ui-ux to improve this rhythm game's song selection, calibration, play HUD, results, and retry flow. Keep chart timing and judgment independent of decorative UI motion. Explain calibration values and recovery, test the actual supported audio/display paths, and keep dense charts readable under the requested access settings.

## Touch and asynchronous progress

> Use $agentic-skills-game-ui-ux to adapt this idle/management game's interface to mobile touch. Make resource amounts, rates, purchase quantities, offline progress, and reset consequences clear. Account for reach, finger occlusion, interruptions, orientation, and pending saves. Do not add monetisation or retention systems beyond the existing brief.

## XR or cockpit interface

> Use $agentic-skills-game-ui-ux to design this [XR/vehicle-simulation] game's setup, controls, instruments, and in-play information. Establish the intended fidelity, physical viewing/reach context, and input hardware. Validate apparent size and interaction in the actual target environment; do not transfer desktop pixel rules directly into world space.

## Visual polish within an established direction

> Use $agentic-skills-game-ui-ux to polish these existing interface screens without replacing their art direction. Improve composition, typography, icon consistency, component states, transitions, and sound feedback where the evidence supports it. Show the result against real gameplay, preserve interaction correctness, and verify long labels, scaling, and important state combinations.

## A narrow focus bug

> Use $agentic-skills-game-ui-ux to fix the controller focus loss when closing this inventory item's detail panel after filtering the list. Inspect the current navigation and data ownership, implement the smallest coherent correction, and verify return focus, removed items, scroll position, and input switching. Keep the task limited to this interaction.

## Accessibility and platform adaptation

> Use $agentic-skills-game-ui-ux to assess and improve this game's first-run settings, reading, focus, remapping, captions, and essential cue alternatives. Select and document the applicable accessibility and device guidance. Test actual supported narration and input paths, and report remaining barriers without claiming certification from a checklist.

## Extend to an unfamiliar hybrid

> Use $agentic-skills-game-ui-ux for this game even if it does not fit a familiar genre: [describe the actual player decisions and rules]. Identify which profiles transfer, which assumptions do not fit, and what must be tested. Derive the interaction and styling from this game's needs, then deliver the requested design or implementation scope.

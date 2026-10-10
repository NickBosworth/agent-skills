---
name: agentic-skills-game-ui-ux
license: CC0-1.0
description: Design, implement, audit, repair, and evolve game menus, HUDs, inventories, maps, settings, onboarding, and other player interfaces. Use for game UX/UI, interaction flows, information hierarchy, visual direction, accessible controls, and interface polish across action, strategy, simulation, RPG, narrative, puzzle, sports, rhythm, social, casual, and hybrid games on desktop, console, handheld, mobile, and XR. Derive decisions from the actual game, its players, mechanics, art direction, and platform; deliver working, verified increments when implementation is requested. Exclude ordinary websites, unrelated applications, and general gameplay programming without a player-interface task.
metadata:
  version: "2.0.0"
---

# Game UI and UX

Make the player able to perceive, understand, decide, act, and recover while the interface expresses the game's identity. Treat appearance, interaction, information, implementation, and playtesting as one design problem.

## Operating rules

1. **Start from the game.** Inspect the playable build, relevant code, design documents, screenshots or footage, existing interface, and applicable repository instructions. Distinguish observed behaviour, requirements, assumptions, and proposed changes. An absent screenshot is not permission to invent an existing visual language.
2. **Preserve intended play.** Separate accidental interface friction from deliberate uncertainty, discovery, pressure, mastery, and consequence. An exact prediction, full map, undo, pause, or enemy indicator can change the game. Confirm a consequential change when the evidence does not resolve it.
3. **Use genre as a hypothesis.** Combine the relevant genre profiles and platform modifiers. Let the decision being made determine the interface for that moment. A survival game may need action aiming, a crafting workbench, and a strategic map with different densities.
4. **Derive the style.** Build from the game's world, mood, camera, assets, audience, and creative brief. Support restrained, ornate, tactile, abstract, comic, realistic, retro, or experimental directions. Establish a coherent visual language; do not import a fixed palette, font, shape, layout, or animation recipe from this skill.
5. **Keep critical meaning perceivable.** Preserve readable text, distinguishable states, usable controls, recoverable navigation, and equivalent essential information across the supported access and input methods. Integrate those constraints from first run.
6. **Work at the requested scale.** Audit without edits when asked to audit. For a small repair, fix and verify the affected flow. For implementation, continue through integration and a representative working scene instead of stopping at a proposal. Do not introduce unrelated dependencies, architecture, monetisation, analytics, or repository policy.
7. **Report evidence honestly.** A screenshot review is not an interaction test; a contrast calculation is not accessibility certification; an agent walkthrough is not a human playtest. Identify what was actually inspected, run, measured, and left unverified.

## Load the relevant resources

Read the router, then the shared chapters needed for the task and only the matching genre profiles. For a narrow fix, use the specific relevant sections. Resolve citations through [sources.md](references/sources.md); its dated entries distinguish standards, guidance, developer examples, research, and their limits.

| Resource | Read for |
| --- | --- |
| [genre-router.md](references/genre-router.md) | Selecting genres, hybrid combinations, and platform modifiers; handling an unfamiliar game |
| [foundations.md](references/foundations.md) | Player decisions, information architecture, intentional difficulty, and design trade-offs |
| [art-direction.md](references/art-direction.md) | Visual identity, typography, composition, icons, motion, sound, and coherent tokens |
| [menus-and-navigation.md](references/menus-and-navigation.md) | First run, main/pause menus, settings, saves, inventory flows, modals, and recovery |
| [hud-and-feedback.md](references/hud-and-feedback.md) | HUD priority, diegetic/spatial choices, gameplay occlusion, maps, alerts, and state feedback |
| [accessibility.md](references/accessibility.md) | Perception, cognition, input access, captions, narration, localisation, and scoped measurements |
| [platforms-and-input.md](references/platforms-and-input.md) | Controller, keyboard/mouse, touch, couch, handheld, split-screen, and XR |
| [implementation.md](references/implementation.md) | Engine-aware delivery, focus and state ownership, data updates, layout, and performance |
| [testing-and-review.md](references/testing-and-review.md) | Playtest tasks, evidence, adverse states, quality gates, and prioritised findings |
| [genres-action.md](references/genres-action.md) | Shooters, MOBA, combat, action adventure, stealth, horror, platforming, fighting, and run-based action |
| [genres-strategy-management.md](references/genres-strategy-management.md) | RTS, tactics, 4X, grand strategy, builders, colony/tycoon, and automation/logistics |
| [genres-rpg-worlds.md](references/genres-rpg-worlds.md) | RPG, ARPG, MMORPG, party RPG, survival, crafting, sandbox, and player-created worlds |
| [genres-narrative-social.md](references/genres-narrative-social.md) | Narrative, visual novel, detective/adventure, party, social deduction, and cooperative play |
| [genres-specialist.md](references/genres-specialist.md) | Racing, sports, flight/vehicle simulation, puzzle, rhythm, cards/board/deckbuilding, autobattlers, idle, and learning games |
| [example-prompts.md](references/example-prompts.md) | Ready-to-adapt requests and examples of bounded scope |

Use templates as working aids, filling only relevant fields. Store resulting project documents in the project's established locations, not inside the installed skill. Do not generate every template for every task.

- [design-brief.md](assets/design-brief.md): context, player decisions, constraints, and selected direction.
- [screen-spec.md](assets/screen-spec.md): one complete screen/component contract and its transitions.
- [hud-inventory.md](assets/hud-inventory.md): information ownership, priority, timing, validity, and presentation.
- [design-system.md](assets/design-system.md): project-specific semantic tokens and component states without preset styling.
- [test-plan.md](assets/test-plan.md): representative tasks, target conditions, observations, and acceptance evidence.
- [review-report.md](assets/review-report.md): reproducible findings, decisions, changes, and unresolved risks.

## 1. Establish the design problem

Identify the work mode: **discover/design**, **implement**, **audit**, **repair/polish**, or **maintain**. Determine the intended result and the current project's constraints before selecting a toolkit or designing a screen.

Record the following in brief working notes, using [design-brief.md](assets/design-brief.md) for substantial work:

- Core loop, player goals, camera/perspective, decision tempo, time/pause rules, failure costs, and deliberately hidden information.
- Primary and secondary genres; audience experience, language/reading needs, and applicable accessibility goals.
- Target devices, input combinations, viewing distance, smallest supported viewport, aspect ratios, orientation, and local-player ownership.
- Existing engine/version, UI framework, asset pipeline, design tokens, localisation system, saved settings, networking authority, and current tests.
- Established visual identity, reusable assets, source/licensing constraints, and the part of the game that should command attention.
- Requested surfaces and states, implementation budget, and evidence available for verification.

Ask **one focused question at a time** only when the missing answer would materially change the design or authorised implementation. State what is unknown, why it matters, two or three viable options, and a justified recommendation. Continue independent work. Infer routine choices from the game and project. If the task is to establish a new direction, offer a small set of meaningfully different directions when useful; do not require a style interview for an obvious local fix.

For an unknown genre, describe the decisions, information, input, tempo, and failure conditions directly, then select the closest profiles. Record what those profiles fail to capture and test it. Extend the working design without changing this skill unless requested.

## 2. Model decisions, information, and flows

Write the player's task before designing its visual container. Use: **When [situation], the player needs to [decision/action], using [information], within [timing/attention constraint].**

For each requested surface:

1. Map entry, ordinary use, success, failure, cancellation, and return. Include empty, loading, unavailable, disconnected, stale, and partial states where the system can actually produce them.
2. Classify information as immediate, regularly consulted, deliberate inspection, or incidental. Include a reason for persistence, context appearance, or removal. Preserve stable spatial memory where it helps play.
3. Identify the source of truth, update conditions, units, ownership, permitted visibility, and uncertainty. Distinguish zero, unknown, hidden, stale, and not applicable. Never disclose authoritative hidden state through client UI, accessibility output, or spectator views.
4. Specify what each action does, what it costs, whether it can be reversed, when it becomes committed, and what feedback confirms it. Match preview and final execution to the same game rules.
5. Define focus order, default focus, back/cancel behaviour, layer priority, input capture, and return-focus policy. Name how focus recovers if its item disappears.
6. Add novice explanations and expert shortcuts without making routine play slower. Preserve meaningful game complexity; organise it into useful views rather than hiding required decisions.

Use [screen-spec.md](assets/screen-spec.md) and [hud-inventory.md](assets/hud-inventory.md) when multiple states or contributors need a shared contract. Draw a small flow diagram only when it clarifies branching or ownership better than prose.

## 3. Establish the visual and sensory direction

Read [art-direction.md](references/art-direction.md). Derive a short visual brief from actual game evidence: mood, world logic, material language, shape, typography, composition, semantic colour, texture, icon rules, motion, and sound. State how each consequential choice supports the player task or the game's identity.

For a broad redesign, explore low-cost alternatives in the **same representative gameplay context** before committing to polish. Use the selected direction to define a small reusable token and component system. For a repair, extend the existing language unless its failure is the task.

Resolve these decisions explicitly:

- Separation between expressive display elements and functional reading/control elements.
- Primary, secondary, and quiet information; sufficient negative space for the actual gameplay focus.
- Ordinary, focused, hovered, pressed, selected, disabled, pending, success, error, and unread states where relevant. Keep focus distinct from selection and disabled distinct from loading.
- Text fallback, line height, long labels, large numbers, localisation, and access scaling.
- UI scaling, anchors, safe areas, dense/expanded modes, and meaningful repositioning across devices.
- Feedback onset, transition sequencing, interruptibility, reduced-motion behaviour, and audio/haptic alternatives.

Build representative layouts with real or clearly labelled fixture content. Show the interface over bright, dark, busy, and transitional game frames. Use legitimate project assets or newly created assets with known provenance. Keep essential text, controls, and state indicators editable and semantic; a flattened mockup cannot serve as the working interface.

## 4. Implement a complete vertical slice

Inspect [implementation.md](references/implementation.md) and the installed engine's matching official documentation. Use the project's existing UI system when it supports the required behaviour. Explain a migration only when it solves a demonstrated constraint.

Select a representative loop such as **open inventory → inspect/compare → equip → see the gameplay change → close → regain control**, or **open settings → preview a change → apply/revert → reopen after restart**. Build that loop through behaviour, presentation, input, and persistence before duplicating components across many screens.

Keep implementation contracts explicit:

- Bind UI to authoritative game state through the project's established boundaries; keep decorative animation from changing gameplay truth.
- Separate semantic actions from device buttons and generate prompts from current bindings and supported device identities.
- Give each local player and modal layer clear focus and input ownership. Stop click-through and the action that closes a menu from also firing a weapon or buying an item.
- Preserve settings across the supported account/device lifecycle. Define apply, preview, cancel, category reset, and a safe recovery path for display changes.
- Make asynchronous states and retries honest; prevent duplicate irreversible commands. Avoid announcing completion before the server or save system confirms it.
- Keep layout, text, icons, audio, and access semantics reusable and localisable. Document non-obvious ownership, ordering, units, and rationale in the code using the project's native conventions.
- Profile representative content and worst-case populations on the intended hardware. Choose update rates by meaning and measured cost rather than refreshing every field each frame.

Use available editor/build tools to render and exercise the slice. If the actual engine cannot run, produce the most useful inspectable implementation or specification possible, identify the missing verification, and do not call it a verified playable result.

## 5. Verify in the conditions that matter

Use [testing-and-review.md](references/testing-and-review.md). Select representative cases from the genre and platform profiles. Establish acceptance conditions before the review; proposed time/error targets are project hypotheses until supported by observations.

At minimum for the affected scope:

1. Complete the primary task and its cancel/recovery path with every supported input mode.
2. Exercise focus restoration, scroll boundaries, changing availability, remapped prompts, device loss/reconnect, and modal transitions where applicable.
3. Inspect real rendered text, state contrast, occlusion, scaling, smallest viewport, relevant aspect ratios, longest supported labels, and dense content.
4. Check essential information and actions with the selected access settings; include first-run reachability and settings persistence.
5. Review the UI during actual high-demand play and interruption/re-entry, not only while the world is paused or empty.
6. Test the relevant failure states and data truth: save error, stale preview, empty inventory, changed selection, lost session, hidden information, and ownership.
7. Separate automated results, visual inspection, agent walkthroughs, human playtests, and unverified conditions in the record.

The optional Python 3.10+ standard-library helper measures **two opaque sRGB colours only**:

```sh
python3 <skill-directory>/scripts/check_contrast.py '#FFFFFF' '#202020' --minimum 4.5
```

Select the threshold from the applicable, scoped profile in [accessibility.md](references/accessibility.md). Without `--minimum`, the helper only reports a ratio. It does not inspect screenshots, alpha layers, HDR, spatial perception, or certify a screen. Validate the final composited result separately.

## 6. Review, improve, and deliver

Mark each applicable gate **pass**, **finding**, **unverified**, or **not applicable**, with evidence:

| Gate | Required evidence |
| --- | --- |
| Player fit | The right decisions and information are available at the right time without undermining intended play |
| Visual quality | A coherent game-specific direction, clear hierarchy, deliberate composition, and complete component states in real game context |
| Interaction | Correct actions, meaningful feedback, predictable focus/back behaviour, and recoverable failures |
| Access and platform fit | Supported input, reading, perception, scaling, locale, and device conditions are usable in the reviewed scope |
| Implementation | Correct state/data ownership, integration, persistence, and acceptable measured behaviour under representative load |
| Validation | Reproducible observations and actual checks support the claims; missing tests remain explicit |

Do not average away a blocking defect with a visual-quality score. Correct material findings in the authorised scope and repeat only the checks affected by the change. If uncertainty requires human testing or unavailable hardware, specify the exact remaining task and conditions.

Deliver the working artifacts or audit requested, the selected direction and why it fits, the affected surfaces and states, the checks performed, and any remaining consequential decision. For large work, retain a concise coverage ledger and prioritised next increment. Keep the complete deliverable usable without relying on this conversation.

# HUD and gameplay feedback

Use this reference to design the information shown during play and the signals that explain events. Treat the prescriptions as design hypotheses to validate in the target game. Preserve deliberate uncertainty, competitive information rules, accessibility requirements, and the game's established visual language.

## Contents

1. [Start with player decisions](#start-with-player-decisions)
2. [Choose display forms deliberately](#choose-display-forms-deliberately)
3. [Allocate attention across the whole frame](#allocate-attention-across-the-whole-frame)
4. [Specify visibility and transitions](#specify-visibility-and-transitions)
5. [Represent values and action states](#represent-values-and-action-states)
6. [Design feedback as a coordinated system](#design-feedback-as-a-coordinated-system)
7. [Place labels, targets, and navigation](#place-labels-targets-and-navigation)
8. [Make customization reliable](#make-customization-reliable)
9. [Validate demanding gameplay states](#validate-demanding-gameplay-states)
10. [Deliver an implementable HUD contract](#deliver-an-implementable-hud-contract)

## Start with player decisions

Before placing widgets, list what players must decide in each phase: dodge now, reload, retreat, select a target, spend a resource, compare equipment, find a route, or wait. Identify the decision deadline, consequence of a mistake, and whether the game intentionally withholds the information. Avoid adding a meter simply because comparable games have one.

Maintain an item ledger alongside the design:

| Field | Record and explain |
| --- | --- |
| Decision | Which player action this information supports. |
| Priority | Immediate survival/action, near-term planning, reference, or optional flavor; state the scenario. |
| Source | Authoritative game state, prediction, teammate report, last observation, or derived estimate. |
| Validity | When the value is valid, unknown, stale, exhausted, unavailable, or invalidated. |
| Disclosure | Which player, team, spectator, local viewport, or accessibility channel may receive it. |
| Precision | Exact count, approximate amount, threshold, range, direction, or deliberate uncertainty. |
| Delivery | Primary visual location and any equivalent audio, tactile, or narrated representation. |
| Lifetime | Entry event, persistence, refresh, decay, dismissal, and interrupted-transition behavior. |
| Interaction | Whether it is passive, selectable, focusable, or an action control. |
| Owner | Game system that owns the value, design decision, and acceptance check. |

Keep enemy information unknown until the rules disclose it. Avoid presenting a teammate's inferred location as a live tracked location. Prevent spectator-only information from entering a player's HUD or narration. Treat these as gameplay correctness requirements, including during replay, reconnection, and split-screen transitions.

## Choose display forms deliberately

Describe each element using two independent questions: does it exist in the fiction, and is it placed in the world?

| Form | Typical example | Main design risk to examine |
| --- | --- | --- |
| Non-diegetic overlay | Screen health bar or ability tray | Occlusion, attention travel, weak fit with the game's tone. |
| Diegetic world element | Readable instrument or suit-mounted meter | Perspective, animation, distance, lighting, and camera obstruction. |
| Spatial non-diegetic element | Target marker positioned above an enemy | Marker overlap, false depth, information leakage. |
| Meta representation | Screen-edge injury effect representing the character's condition | Ambiguous amount, obstructed vision, discomfort. |

Use combinations where they serve different needs; redundant information can improve resilience. A decorative sci-fi overlay is not automatically diegetic. The taxonomy describes presentation and does not establish immersion or quality.

Peacocke and colleagues found different outcomes for ammunition, health, weapon, and navigation displays. Their experiments isolated controller-based FPS tasks with experienced players; they did not establish a universally superior HUD or measure a complete game's immersion. Use the paper to justify testing the particular information task, not a fixed placement rule. [H02](sources.md#h02)

Treat Dead Space as a situated example: the lead designer's GDC session describes the development of its diegetic interface. The session listing verifies that focus; do not attribute detailed claims to an unwatched talk. [H12](sources.md#h12)

## Allocate attention across the whole frame

Identify likely gaze locations from camera behavior and player tasks, then test them. Aiming may concentrate attention around a reticle; platform traversal may require reading ahead of movement; tactical play may alternate between battlefield and map. Do not apply an assumed web reading pattern or universal corner assignment.

Compose over representative gameplay frames from the outset. Include character silhouettes, hit effects, interaction prompts, subtitles, damage indicators, teammate names, environment contrast, and camera motion. Reserve the space needed to read threats and movement. Treat art, VFX, audio, and HUD as competing contributors to the same attention budget.

Housemarque describes placing immediate combat information near Returnal's reticle and moving less urgent information outward. This is a useful response to its combat demands, not a rule for every camera or genre. [H01](sources.md#h01) Valve's Team Fortress 2 work similarly connects world and character readability to gameplay requirements. [H04](sources.md#h04)

Compare two or three arrangements using identical scenes and data. State what each arrangement trades: shorter gaze travel, unobstructed targets, map overview, familiar placement, or stronger fiction. Choose through evidence from representative tasks rather than a beauty-only ranking.

## Specify visibility and transitions

For each element, decide whether it is persistent, contextual, requested on demand, or optional. Give contextual elements explicit state rules. Define when a recently changed resource remains visible, when a critical value overrides auto-hide, and how the player recalls hidden information. Keep the spatial location stable when visibility changes unless testing supports movement.

Separate visibility from urgency. A permanently visible health display can become more salient near a meaningful threshold without flashing continuously. A newly unlocked journal entry can wait until combat ends. Deduplicate repeated notifications and choose whether later messages replace, group, queue, or expire earlier ones.

Handle interruptions: damage during a tutorial, inventory opened while an objective updates, death during a cooldown animation, and a cinematic ending with stale prompts. Specify the resulting state instead of relying on animation completion callbacks to establish gameplay truth.

Document pause behavior for every overlay. In a multiplayer game, a menu may cover the screen while simulation continues. Give the player accurate context and a quick return path; do not imply the session has paused. Crytek's proposed Hunt improvements explicitly address situational awareness and ready access to teammate loadouts. [H09](sources.md#h09)

## Represent values and action states

Choose the representation to match the decision. Use a number when an exact threshold or count matters, a bar when relative amount matters, and a small set of repeated symbols when individual units matter. Combine representations when both precision and rapid estimation are needed. State units, maximum changes, temporary capacity, and whether zero means empty or unavailable.

Distinguish ability states beyond available/unavailable: locked, ready, selected, charging, active, recovering, insufficient resource, blocked by status, invalid target, and disconnected. Show the reason an attempted action failed. Separate cooldown time from charges and duration remaining; include a recognizable readiness transition that does not rely only on color.

Keep critical combat state current even when decorative interpolation lags. Do not let a trailing damage bar suggest health is still available. Match range and area previews to the game's actual targeting rules, including height and obstacles where relevant. Distinguish confirmed hits, damage prevented, shields broken, and uncertain client prediction when those differences affect decisions.

## Design feedback as a coordinated system

For each consequential event, specify cause, result, urgency, and available response. Pair sensory channels where needed, but avoid playing every possible cue at full intensity. Distinguish the source and direction of incoming danger from the direction of outgoing hits. Make persistent status inspectable after a transient cue ends.

Design priority and interruption rules across audio and haptics. An imminent attack may pre-empt reward sounds; repeated pickups can combine; continuous warnings need a tolerable cadence. Use semantic signals that can survive reduced motion or muted audio. Provide a glossary or replayable example for unfamiliar sounds.

Naughty Dog documents visual threat indicators, narrated status, combat/traversal cues, and adjustable HUD and motion effects. ePARA's Street Fighter 6 collaboration demonstrates audio conveying opponent distance, attack height, and gauge state. Treat these as concrete alternatives to single-channel information, not proof that any added beep makes a game accessible. [H03](sources.md#h03) [H08](sources.md#h08)

Avoid escalating low health by making the action illegible. Test with vignette, shake, blur, flashes, blood, and haptics reduced or disabled; retain the information through another usable representation. Separate intended dramatic intensity from the player's ability to perceive and act.

## Place labels, targets, and navigation

Define label eligibility before drawing labels: range, line of sight, discovery, ownership, team, priority, selection, and current task. Specify clustering, occlusion, stable ordering, offscreen behavior, and maximum density for the actual content. Prevent a label from looking attached to the wrong actor when several overlap or cross the camera.

Preserve the aiming and interaction space. Use an unambiguous focused target when several interactables compete. Include action and object meaning where an icon alone would be unclear; update prompts from actual bindings. Do not expose an action before it can succeed without explaining why it is unavailable.

Select maps and guidance from navigation tasks: route following, searching, spatial learning, tactical planning, or orienting across floors. Decide between landmarks, compass, minimap, full map, route hints, and optional guidance. Label vertical differences when needed. Keep discovered, last-known, and live positions distinct. Housemarque links Returnal's map design to level verticality; Guerrilla provides different degrees of guidance in Horizon Forbidden West. [H01](sources.md#h01) [H10](sources.md#h10)

Treat pings as communication actions with an author, intent, location, expiry, and acknowledgement policy. Ensure map placement and world placement agree. Respawn's Arsenal update explains context-specific pings and more accurate map-to-world placement. [H07](sources.md#h07)

## Make customization reliable

Offer controls that address demonstrated needs without requiring players to repair an incoherent default. Preview relevant settings in context. Validate scale, contrast backgrounds, text length, icon alternatives, visibility, and input prompts together. Preserve essential meaning if decorative textures, color coding, or motion disappear.

Store preferences predictably and provide a recoverable reset. Check conflicting bindings, disconnected devices, and controller-only recovery. Avoid a hidden hard-coded shortcut that conflicts with customization: Celeste's changelog records replacing such a restart shortcut and strengthening menu rebinding. [H06](sources.md#h06)

Keep accessibility changes complete across surfaces. If a stat's color changes, update menus, HUD, descriptions, and relevant world indicators consistently. Dead Cells' accessibility updates document this cross-surface treatment alongside HUD scaling, readable effect icons, particle reduction, and sound prioritization. [H05](sources.md#h05)

## Validate demanding gameplay states

Use actual captures or clearly labeled representative prototypes. Inspect motion, not only isolated screenshots. Choose applicable scenarios:

- Peak combat density, mixed ally/enemy effects, low health, and depleted resources.
- Bright sky, dark interior, saturated environment, transparent geometry, and color-similar effects.
- Rapid target crossing, offscreen attack, overlapping interactables, and multiple floors.
- Long localized names, maximum text scale, subtitles, remapped prompts, and safe-area extremes.
- Controller, mouse/keyboard, touch, split-screen, or spectator conditions that the game supports.
- Reduced motion, muted audio, grayscale inspection, and assistive output with intended users.
- Death, revive, respawn, reconnect, save/load, pause/resume, and repeated menu interruption.

Ask players to perform decisions, then record missed cues, wrong interpretations, time to relevant action, accidental inputs, and recoverability. Record comfort and confidence separately from task success. Compare the same scenario before and after a change. Automated contrast or screenshot checks can detect some defects; they do not establish attention, comfort, or accessibility.

## Deliver an implementable HUD contract

Deliver the item ledger, representative phase layouts, component states, transition rules, targeting/occlusion behavior, sensory priorities, customization rules, and validation evidence. Link each consequential rule to a game requirement, observed problem, source, or explicit design hypothesis. Mark untested states and platform assumptions. Keep presentation decisions separate from the authoritative gameplay state so future visual changes do not silently change what players are allowed to know.

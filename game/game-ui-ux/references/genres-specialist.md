# Sports, simulation, puzzle, music, and other decision patterns

## Contents

- [Use the profiles](#use-the-profiles)
- [Racing, driving, and karting](#racing-driving-and-karting)
- [Sports and sports careers](#sports-and-sports-careers)
- [Flight, space, and vehicle simulators](#flight-space-and-vehicle-simulators)
- [Logic and physics puzzles](#logic-and-physics-puzzles)
- [Match, tile, merge, and word games](#match-tile-merge-and-word-games)
- [Hidden-object and search games](#hidden-object-and-search-games)
- [Rhythm, music, dance, and instruments](#rhythm-music-dance-and-instruments)
- [Cards, deckbuilding, and tabletop](#cards-deckbuilding-and-tabletop)
- [Autobattlers and automated combat](#autobattlers-and-automated-combat)
- [Idle and incremental games](#idle-and-incremental-games)
- [Learning, training, and children](#learning-training-and-children)
- [Asynchronous and unusual forms](#asynchronous-and-unusual-forms)

## Use the profiles

Treat the recommendations as original design synthesis to validate in the game. The named sources illustrate a specific implementation or framework; they do not prove a single correct genre UI. Combine these profiles with the [genre router](genre-router.md), [platform guidance](platforms-and-input.md), and [accessibility guidance](accessibility.md). Derive the styling independently through [art-direction.md](art-direction.md).

## Racing, driving, and karting

**Player decisions:** line and braking, passing/defending, nearby traffic, resource/boost use, pit/repair strategy, navigation, and race objectives. Separate arcade rules from motorsport simulation: a kart power-up and tyre-temperature strategy have different information needs.

**Useful surfaces:** protect the road, apex, vehicle trajectory, and mirrors. Select relevant speed/gear, position, lap/time, flags/penalties, fuel/energy/boost, damage, and proximity information. Show units and distinguish current lap, personal best, reference lap, and opponent gap. Explain whether a timing delta is live, sector-based, or a completed-lap result.

Make cockpit, chase, hood, and replay layouts intentional. A camera change can alter available in-world instruments and blind spots. Turn 10's Forza example uses a configurable proximity radar and separates replay information improvements; it supports treating view/mode as a design variable. [P13](sources.md#p13)

**Menus:** support input calibration and binding for the actual wheel, pedals, controller, or keyboard; accessible assists; pre-race setup; garage/tuning comparisons; results, penalties, and retry. Keep a route back from a failed hardware profile. Distinguish restart, rewind, replay, and return to event.

**Traps:** HUD blocking the next corner; confusing race position with class position; an unexplained penalty; a lap delta with an ambiguous sign; menu operation requiring an unavailable device; warnings that cover mirrors.

**Probe:** approach a corner with traffic while a race-state warning arrives. Can the player identify the relevant threat and understand the warning without losing the driving task? Repeat in supported cameras and with each promised hardware configuration, including a wheel-only menu path if that is supported, or its declared companion input.

## Sports and sports careers

**Player decisions:** possession, controlled athlete, positioning, execution timing, team tactics, substitutions, stamina, and match objectives. Support the actual sport's vocabulary and rules; golf, football, boxing, and athletics cannot share an identical match HUD.

**Useful surfaces:** protect the ball/puck, athlete, landing/aim region, and intended camera view. Where relevant, distinguish score, period/set/round, clock, possession, controlled player, stamina, penalties, and temporary advantages. Make control changes and target selection clear without obscuring the play.

**Menus:** separate live tactics/substitutions from roster preparation, career development, training, equipment, and replay. For a management layer, add the strategy profile's comparison and diagnosis patterns. State when a change becomes effective and whether the match continues while it is selected.

**Traps:** copying broadcast graphics without the information the player must act on; a selection marker disappearing on a bright pitch; ambiguous home/away or player/team ownership; an elaborate replay blocking a rapid rematch; control hints that obscure a timing target.

**Probe:** switch the controlled athlete during a crowded play, then make a substitution. Can the player identify both selections and the moment the substitution takes effect? Check the relevant sport-specific cases, including ties, overtime, advantage, or penalties when implemented.

## Flight, space, and vehicle simulators

**Player decisions:** navigation, vehicle mode, instrument reading, systems operation, procedure sequence, resource management, and abnormal-state diagnosis. Establish the intended fidelity and audience: a study-level cockpit, arcade spaceship, train cab, and construction machine need different instrument and assistance policies.

**Useful surfaces:** identify active modes and the source of navigation/control commands. Preserve relationships among instruments, units, alerts, and controls. Make optional enlargement, pop-out instruments, checklists, interaction labels, or overlays available when they fit the product. A realistic cockpit can remain the primary presentation while an accessible alternate view serves the same information.

Laminar Research's X-Plane manual provides a concrete example spanning hardware profiles, calibration, instruments, setup, checklists, replay, and display configuration. Use it as a product example, not an external standard for every simulator. [P16](sources.md#p16)

**Menus:** aircraft/vehicle and scenario selection; route/weather/environment where relevant; hardware binding and calibration; assistance/fidelity; camera/display; pause/save/replay. Label unit systems and input conflicts. If the user asks to repair a simulator interface, preserve established instrument conventions unless a scoped change is authorised.

**Traps:** beautiful but unreadable gauges; a hidden armed/active distinction; touch controls that obscure the operated switch; narration or overlays showing states the simulated operator cannot know; displaying a stale flight-plan value as current; silently changing fidelity to simplify UI.

**Probe:** identify a current mode, perform an intended procedure, and explain the resulting system state using the supported hardware. Test a common abnormal state and a hardware disconnect without claiming the game is certified real-world training equipment.

## Logic and physics puzzles

**Player decisions:** understand rules, interpret the current state, test a hypothesis, commit a move, and learn from its result. Determine whether discovery of the rules, memory, precision, or deduction is intentionally part of play.

**Useful surfaces:** preserve board geometry, object relationships, legal interaction, progress, and the relevant limits. Distinguish selection, preview, commitment, locked objects, and completed goals. If previews are allowed, show their actual scope; a physics trajectory preview must not imply certainty beyond the simulation's prediction.

**Menus:** puzzle/level selection, reset, supported undo, hint levels, completion/retry, and a replayable explanation of known rules. Explain reset scope. Let help reveal information gradually according to the game's design.

**Traps:** an invalid-action message revealing the solution; an automatic highlight removing intended deduction; decorative motion hiding a state change; a reset adjacent to a frequent action with weak differentiation; mandatory dragging without an alternative where feasible.

**Probe:** make an invalid move, recover, request the first hint, and reset or undo according to the rules. Can the player explain what changed while the intended reasoning remains theirs?

## Match, tile, merge, and word games

**Player decisions:** locate legal candidates, evaluate combinations, manage moves/time, satisfy goals, and understand cascades or scoring. Distinguish deterministic rules from random outcomes and optional aids.

**Useful surfaces:** keep board positions and tile identities readable. Encode critical types by shape/symbol as well as colour. Distinguish objective progress from decorative score. Communicate boosters, their availability/cost, and when selecting one commits it. During cascades, make it clear when the board will accept another action.

For word/trivia games, support the relevant alphabet, input method, diacritics, case, and language-specific rules. Make submitted, rejected, partially correct, and accepted states distinguishable. Explain how answer validation works only to the extent the rules intend; do not invent a dictionary or grading guarantee.

**Menus:** level selection, rules, assistance, undo where supported, results, replay, and pause/timing policy. Do not add lives, timers, monetised boosters, or forced reward flows to a game merely because comparable games have them.

**Traps:** colour-only tiles, moving hit areas during input, ambiguous remaining moves, bonus animation obscuring the next decision, keyboard/IME completion causing accidental submission, and language expansion breaking a letter grid.

**Probe:** play a dense board with reduced motion and altered colour perception; submit an accented or composed word where supported. Check the relationship between input acceptance, board resolution, displayed cost, and score.

## Hidden-object and search games

**Player decisions:** understand the target or clue, search, inspect, and decide whether an object matches. Preserve the designed search challenge while eliminating unreadable instructions and ambiguous input.

**Useful surfaces:** make target descriptions, found/remaining states, zoom/pan mode, and optional clues readable. Keep UI from covering valid search areas. If the game uses silhouettes or riddles, record that as an intentional information policy; do not replace it with a solution-revealing marker without direction.

**Menus:** scene selection, known objectives, hints, zoom/access tools, retry, and return to unfinished searches. Preserve relevant scene and list position.

**Traps:** a HUD-covered target; unclear art-versus-button affordance; touch targets smaller than the intended hit region; arbitrary penalties that cannot be understood; a hint revealing every remaining object when only one is requested.

**Probe:** identify the next target, inspect near a HUD edge, use one hint, and return after interruption. Diagnose whether failure arises from the intended search or an interface barrier.

## Rhythm, music, dance, and instruments

**Player decisions:** interpret timing and sequence, execute, monitor performance, and learn from errors. Separate timing-critical gameplay from ordinary menu interactions.

**Useful surfaces:** preserve chart/lane geometry, hit targets, approach direction, and judgment visibility. Distinguish chart speed, song tempo, visual delay, audio delay, judgment timing, and decorative animation in the implementation. Keep score/combo effects from covering upcoming notes. Provide readable alternatives for lane colours and relevant motion.

**Menus:** song/chart selection with actual difficulty information, practice/restart, device calibration, input profiles, audio levels, results, and adjustable aids supported by the game. Show calibration units, direction, effect, save scope, and a recoverable reset. The osu! documentation distinguishes universal adjustment from local content timing; an erroneous global change can affect every chart. Its sign convention must not be transplanted into another engine. [P14](sources.md#p14)

**Traps:** applying a UI animation clock to judgment; a calibration screen without meaningful feedback; assuming Bluetooth/TV/monitor paths have the same delay; compulsory long intros on retries; “reduce motion” unexpectedly altering the rule timing.

**Probe:** calibrate, play, retry, and compare an early/late judgment using the supported audio/display path. Include a dense chart and the requested access settings. For dance/fitness/XR, add reach, seated/alternate modes where supported, fatigue, and immediate interruption through the platform profile.

## Cards, deckbuilding, and tabletop

**Player decisions:** evaluate options, inspect rules and modifiers, manage resources, target, order actions, react to opponents, and commit. Identify whose knowledge and whose turn each view represents.

**Useful surfaces:** establish public/private zones, ownership, active player/priority, hand, deck/discard/exile where applicable, costs, legal targets, status, and resolution order. Distinguish a card's base description from its currently modified effect. A card can be affordable but illegal for another reason. Keep counterplay and response opportunities clear without exposing private future state.

**Menus:** deck construction, filters and searchable keywords, collection/acquisition, draft selection, legality checks, inspectable history, undo where rules permit, and match results. Offer usable inspection through focus or explicit selection as well as hover. Retain context during enlarged-card views.

For deckbuilders, show how a choice affects the actual current build and run persistence. For tabletop adaptations, preserve the rules and distinguish cosmetic handling from a committed move. For casino-style table/card games, make the declared stakes, balance type, rules, and actual outcome explicit; do not introduce a new wagering system as an interface enhancement.

**Traps:** microscopic rules at hand scale with no inspection route; accidental play while trying to inspect; preview exposing the opponent's private card; an effect log without ownership/order; cost highlights using stale state; “recommended” implying a solved strategy unsupported by game logic.

**Probe:** inspect a modified card, choose a legal target, respond during a reaction window, and reconcile the outcome. Check privacy through visual UI, tooltips, logs, narration, spectators, and hot-seat transitions.

## Autobattlers and automated combat

**Player decisions:** draft/buy/sell, position, combine, equip, manage economy, and interpret an automated result. Separate preparation, lock-in, combat, and post-round phases.

**Useful surfaces:** show the relevant budget, shop/refresh cost, bench/board limits, combinations, synergies, placement validity, current phase, and lock status. Explain what an action affects now versus the next round. Provide inspectable outcomes that reveal meaningful causes within the game's information policy.

**Menus:** team/build inspection, shop, item placement, phase controls, match history/results, and comparison. Preserve accessible routes to last-moment decisions; do not assume every game allows timer extension or action reversal.

**Traps:** preparation controls appearing actionable after lock-in; ambiguous sell/equip targets; excessive battle effects hiding informative outcomes; unclear capacity versus current count; introducing one optimal-build recommendation as neutral information.

**Probe:** perform a purchase and formation change near a phase boundary. Verify that accepted, rejected, and next-round actions have distinct outcomes and that the player can explain a relevant combat result.

## Idle and incremental games

**Player decisions:** allocate resources, compare upgrades, automate, return after absence, and assess a prestige/reset trade-off.

**Useful surfaces:** separate stock, production rate, multiplier, cost, affordability, purchase quantity, automation state, and estimated time. Keep increasingly large values readable with a consistent notation and inspectable detail. Label rate units and avoid rounding a price or balance into a misleading equality.

**Menus:** upgrade groups, purchases, automation configuration, progression, statistics, and clearly scoped prestige/reset. Summarise actual offline changes, caps, duration, and relevant conditions. State exactly what is lost and retained before a reset. Use the game's authoritative clock and persistence rules; the UI must not invent offline earnings from a local timer alone.

**Traps:** every affordable item pulsing; an endless sequence of reward dialogs on return; unclear ×10 versus buy-max behaviour; a prediction shown as guaranteed; hiding a permanent reset under “upgrade.”

**Probe:** return after a capped offline interval, explain the changes, compare two purchases, and preview a prestige/reset without committing. Include very large and very small values, a pending save, and the supported notation/locales.

## Learning, training, and children

**Player decisions:** understand a task, experiment, receive useful feedback, seek help, and recognise progress. Define the actual learning goal and age/developmental/reading range instead of treating “children” as one audience.

**Useful surfaces:** clear actions, appropriately scaffolded instructions, readable symbols/text, feedback that identifies the relevant concept, and recoverable mistakes. Preserve agency and avoid making an adult's explanation necessary for every transition. Distinguish learning progress from reward animation and teacher/parent controls from player controls when those roles exist.

UNICEF's RITEC framework offers a well-being-centred design perspective. Its cited underlying research focused on ages 8–12; do not generalise that evidence to every child or to professional training. [P15](sources.md#p15)

**Menus:** learner profile where required, activity choice, appropriate help, access settings, pause/resume, and transparent results. Avoid unnecessary data collection and social/store systems outside the brief. Implement adult/child boundaries according to the project's actual requirements.

**Traps:** instructions exceeding the intended reading level; punitive feedback without explanatory value; confusing progress measures; required precise input unrelated to the learning goal; treating an attractive mascot as evidence of usability.

**Probe:** observe intended learners attempting a task and recovering from an error without coaching the interface. Review whether they learned the intended concept. An adult agent simulation cannot establish developmental suitability or learning efficacy.

## Asynchronous and unusual forms

For asynchronous turns, persistent worlds, browser games, and unconventional hybrids, begin with the underlying decision profile. Add clear ownership, deadlines, pending/accepted state, stale-data recovery, and a re-entry summary. A player who returns after a connection loss must be able to tell whether the prior action happened before trying it again.

For audio-first, text-only, location-based AR, or an unfamiliar form, retain its intended strengths. Adapt navigation, information priority, orientation, and input to that presentation; do not automatically add a conventional visual HUD. Read the relevant accessibility/spatial sections and test the actual player's information and movement task.

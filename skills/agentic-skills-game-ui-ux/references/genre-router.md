# Genre and context router

## Contents

- [Route by decisions](#route-by-decisions)
- [Coverage map](#coverage-map)
- [Apply cross-cutting modifiers](#apply-cross-cutting-modifiers)
- [Compose hybrid profiles](#compose-hybrid-profiles)
- [Handle an unfamiliar game](#handle-an-unfamiliar-game)

## Route by decisions

Use this as a practical coverage taxonomy, not a claim that genre boundaries are fixed or that every game fits a closed list. The profiles are original design synthesis informed by the sources identified in each chapter. They suggest decisions to investigate, not a ready-made visual skin or a mandatory feature set.

Read the primary family for the moment being designed, then add only relevant secondary profiles. A new inventory may require a different profile from the same game's combat HUD. Keep platform, access, audience, monetisation, camera, and multiplayer as independent modifiers.

Establish these dimensions before choosing a pattern:

| Dimension | Alternatives that materially change UI |
| --- | --- |
| Controlled subject | One avatar, a party, selected units, a vehicle, a settlement, a faction, a board, or a creative tool |
| Time | Continuous, pausable, alternating turns, simultaneous planning, timed rounds, asynchronous, or persistent offline progress |
| Decision horizon | Immediate response, next action, encounter, production cycle, match, campaign, or long-term collection |
| Knowledge | Public, private, discovered, inferred, probabilistic, intentionally hidden, or unreliable |
| Skill expression | Execution, awareness, optimisation, deduction, exploration, memory, creativity, social judgment, or learning |
| Consequence | Reversible edit, scarce expenditure, soft failure, lost progress, elimination, permanent death, or social commitment |
| Spatial arrangement | First/third person, top-down, side view, board, cockpit, map, shared screen, split-screen, or spatial XR |

## Coverage map

Every named family below has a profile or an explicit composition route. Not all are mutually exclusive.

| Game type or common label | Primary reference | Adaptation focus |
| --- | --- | --- |
| FPS; arena/tactical/hero shooter | [Action](genres-action.md) | Aiming, threat, ammunition/resources, target identity; add team/role and economy where relevant |
| TPS; cover shooter | [Action](genres-action.md) | Camera and character occlusion, cover/stance, threat and interaction |
| Battle royale | [Action](genres-action.md) | Phase/zone, squad, looting, elimination/spectating, match re-entry |
| Extraction shooter | [Action](genres-action.md) | Raid preparation, inventory risk, extraction conditions, retained/lost outcomes |
| MOBA | [Action](genres-action.md) | Hero abilities, resources, teams, map/objectives, targeting and shop access |
| Action adventure; character action | [Action](genres-action.md) | Combat/exploration modes, context actions, target and resource clarity |
| Soulslike | [Action](genres-action.md) + [RPG/worlds](genres-rpg-worlds.md) | Stamina/commitment, enemy tells, equipment trade-offs, death/recovery and world persistence |
| Stealth | [Action](genres-action.md) | Detection/suspicion evidence and what the character can legitimately know |
| Horror; survival horror | [Action](genres-action.md) + [RPG/worlds](genres-rpg-worlds.md) | Tension, resource inspection, readable access alternatives, preserved uncertainty |
| Platformer; precision platformer | [Action](genres-action.md) | Movement space, checkpoints, contextual abilities, rapid retry |
| Metroidvania | [Action](genres-action.md) | Exploration memory, map layers, ability gates, discovered versus unknown routes |
| Fighting; arena fighter | [Action](genres-action.md) | Character/side identity, health/round/resources, practice and rematch |
| Brawler; beat 'em up | [Action](genres-action.md) | Crowd readability, combo/resource feedback, cooperative ownership |
| Shoot 'em up; twin-stick shooter; bullet hell | [Action](genres-action.md) | Collision/hazard area, survival resources, scoring and visibility; do not assume every shooter has extreme bullet density |
| Roguelike; roguelite; procedural run | Underlying genre + [Action](genres-action.md) run profile | Run versus persistent progress, draft/build choices, death/restart, seeds/modifiers when supported |
| Bullet heaven; survivors-like; auto-shooter | [Action](genres-action.md) | Dense hazards, automatic attacks, upgrade choices, retained visibility |
| RTS | [Strategy/management](genres-strategy-management.md) | Economy, selection, control groups, commands, production and offscreen threats |
| Real-time tactics | [Strategy/management](genres-strategy-management.md) | Unit capabilities, order/stance, simultaneous threats; economy only when present |
| Turn-based tactics; tactical RPG | [Strategy/management](genres-strategy-management.md) + [RPG/worlds](genres-rpg-worlds.md) | Turn/action budget, target legality, consequences, uncertainty, party development |
| Tower defence | [Strategy/management](genres-strategy-management.md#tower-defence) + [Action](genres-action.md) when directly controlled | Wave/path, range/coverage, costs, placement, upgrades and emergency prioritisation |
| 4X; grand strategy; wargame | [Strategy/management](genres-strategy-management.md) | Map lenses, campaigns, diplomacy, production, time, relationships and forecasting |
| City/colony builder; tycoon; management | [Strategy/management](genres-strategy-management.md) | Construction, people/services, capacity, economy, diagnosis and queues |
| Factory; automation; logistics | [Strategy/management](genres-strategy-management.md) | Inputs/outputs, rates, dependencies, blocked/starved processes and scale |
| Transport; airport; railway management | [Strategy/management](genres-strategy-management.md) | Schedules, allocation, paths, service dependencies, delay and capacity |
| RPG; action RPG; loot-driven RPG | [RPG/worlds](genres-rpg-worlds.md) | Build decisions, equipment, abilities, progression, quests and acquisition |
| CRPG; JRPG; party RPG | [RPG/worlds](genres-rpg-worlds.md) | Actor/party ownership, targeting, formations, resources and narrative continuity |
| MMORPG; persistent online RPG | [RPG/worlds](genres-rpg-worlds.md) | Role-aware HUD, group readiness, status, targeting, economy and layout presets |
| Survival; crafting; open-world exploration | [RPG/worlds](genres-rpg-worlds.md) + applicable [Action](genres-action.md) | Needs, threats, recipes, containers, conditions and persistence |
| Sandbox; creative; voxel building; UGC | [RPG/worlds](genres-rpg-worlds.md) | Tool modes, placement, selection, edit history, asset catalogue and ownership |
| Life/farming/social simulation; cozy games | [RPG/worlds](genres-rpg-worlds.md#life-farming-and-social-simulation) + [Strategy/management](genres-strategy-management.md) | Relationships, calendar, tending, crafting and goals; cozy is a tone, not a density rule |
| Point-and-click; adventure; escape-room | [Narrative/social](genres-narrative-social.md) + [Specialist](genres-specialist.md) | Verbs, discovered clues, inventory use, puzzle state and layered help |
| Detective; investigation | [Narrative/social](genres-narrative-social.md) | Evidence, interpretation, hypothesis, discovered knowledge and spoiler boundaries |
| Visual novel; interactive fiction; dialogue-led | [Narrative/social](genres-narrative-social.md) | Reading, speaker, choice intent, history, saves, auto/skip and narration |
| Party; minigame collection; local co-op | [Narrative/social](genres-narrative-social.md) | Join/rejoin, identity, turn/ready, shared/private screens and clear instructions |
| Social deduction; asymmetric multiplayer | [Narrative/social](genres-narrative-social.md) | Role/knowledge boundaries, voting/communication, host/participant permissions |
| Competitive or cooperative board/card game; CCG/TCG | [Specialist](genres-specialist.md) | Public/private zones, turn/priority, costs, targeting, rules and resolution |
| Deckbuilder; drafting game | [Specialist](genres-specialist.md) + underlying action/tactics profile | Card comparison, build/context, pile inspection, draft commitment and run consequences |
| Autobattler; auto-chess | [Specialist](genres-specialist.md) | Preparation/combat phases, shop/economy, synergy, positions and inspectable outcomes |
| Racing; driving; karting | [Specialist](genres-specialist.md) | Road/apex, speed/gear, race state, proximity, assists, tuning and results |
| Sports; combat sport; sports career/management | [Specialist](genres-specialist.md) + [Strategy/management](genres-strategy-management.md) | Play area, score/clock, control identity, tactics, roster and progression |
| Flight; space; train; maritime; vehicle/equipment simulator | [Specialist](genres-specialist.md) | Intended fidelity, instruments/modes, hardware, checklists and setup |
| Puzzle; logic; physics puzzle | [Specialist](genres-specialist.md) | Board/state, legality, consequences, undo, hints and intentional reasoning |
| Match; tile; bubble; merge; word/trivia | [Specialist](genres-specialist.md) | Board/tile identity, goals, valid actions, scoring/limits and language-dependent layout |
| Hidden object; search | [Specialist](genres-specialist.md) | Search targets, clues, zoom/inspection and optional help without obstruction |
| Rhythm; music; dance; instrument game | [Specialist](genres-specialist.md) | Timing lanes/targets, calibration, judgment, difficulty and session flow |
| Idle; incremental; clicker | [Specialist](genres-specialist.md) | Amount/rate, affordability, automation, offline outcome and prestige/reset |
| Educational; training; children's game | [Specialist](genres-specialist.md) + mechanical genre | Learning/developmental goals, agency, understandable feedback and scaffolding |
| Audio-first or text-only game | Mechanical genre + [Accessibility](accessibility.md) | Meaningful sound/text navigation, priority, repeat/query, pacing and equivalent access |

## Apply cross-cutting modifiers

Read [platforms-and-input.md](platforms-and-input.md) and [accessibility.md](accessibility.md) for the selected context. Add [menus-and-navigation.md](menus-and-navigation.md), [hud-and-feedback.md](hud-and-feedback.md), [art-direction.md](art-direction.md), and [implementation.md](implementation.md) as the actual task requires.

| Modifier | Additional questions |
| --- | --- |
| Desktop keyboard/mouse | Hover alternatives, direct selection, hotkeys, text input and scalable information density |
| Controller/couch | Directional traversal, focus, viewing distance, prompts and comfort |
| Handheld/mobile/touch | Physical size, reach, occlusion, orientation, interruptions and battery/performance conditions |
| XR/AR/spatial | Apparent size, depth, reach, stability, recentering, comfort and alternatives to required movement |
| Local/split-screen/shared devices | Input and focus ownership, per-player settings, private data and available physical area |
| Online/async/persistent | Accepted versus pending state, reconnect, stale data, deadlines, server truth and re-entry |
| Streaming/spectating/replay | Identity/privacy, latency, permitted knowledge, spoiler exposure and the observed player's perspective |
| Live service/store/UGC | Relevant session/transaction states and moderation tools; implement only the requested existing product scope |

## Compose hybrid profiles

Examples of composition, not prescribed layouts:

- **Airport management with direct vehicle control:** use diagnosis and scheduling for the management view, the vehicle profile for driving, and an explicit transition of camera/input ownership.
- **Cozy survival crafting on a handheld:** combine survival resource semantics, creative placement, short-session recovery, touch/controller constraints, and the project's warm visual direction. Preserve meaningful detail.
- **Multiplayer extraction RPG:** combine threat visibility, loadout/equipment comparison, retained/lost outcomes, group state, pending transactions, and private information policy.
- **Narrative deckbuilding roguelite:** combine reading and story knowledge, hand/stack resolution, run permanence, and a clear transition between dialogue and tactical decisions.
- **VR rhythm fitness game:** combine timing/calibration with spatial reach, seated or alternate movement where supported, fatigue, interruption, and clear safety/comfort recovery.

## Handle an unfamiliar game

If a label is missing, classify its real decisions using the dimension table. Identify its most demanding interface moment, knowledge boundaries, failure costs, and control constraints. Reuse only mechanisms whose assumptions fit. State the additional hypothesis and test it with a representative task. This fallback prevents the coverage map becoming a rule that new genres must imitate old ones.

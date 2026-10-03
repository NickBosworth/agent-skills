# Action, combat, and traversal game profiles

Select these starting hypotheses by the player's actual loop, camera, controls, information rights, and failure model. Combine profiles for hybrids and reconcile conflicts; genre does not determine style or HUD density.

Treat the guidance and probes as this skill's synthesis; linked developer examples establish particular considerations. Derive typography, materials, icon shapes, motion, and color roles from the target game's art direction.

## Contents

1. [FPS and third-person shooters](#fps-and-third-person-shooters)
2. [Battle royale and team survival](#battle-royale-and-team-survival)
3. [Extraction and high-stakes loadouts](#extraction-and-high-stakes-loadouts)
4. [MOBA and ability-driven team combat](#moba-and-ability-driven-team-combat)
5. [Action adventure and open-world exploration](#action-adventure-and-open-world-exploration)
6. [Stealth](#stealth)
7. [Horror and survival horror](#horror-and-survival-horror)
8. [Platformers and precision traversal](#platformers-and-precision-traversal)
9. [Metroidvania and ability-gated exploration](#metroidvania-and-ability-gated-exploration)
10. [Fighting games](#fighting-games)
11. [Brawlers and character-action combat](#brawlers-and-character-action-combat)
12. [Roguelike, roguelite, and run structure](#roguelike-roguelite-and-run-structure)
13. [Bullet hell and bullet heaven](#bullet-hell-and-bullet-heaven)
14. [Combine profiles and validate the result](#combine-profiles-and-validate-the-result)

## FPS and third-person shooters

**Decisions.** Support aiming, movement, reloading, target selection, ability timing, and retreat. Separate tactical, arena, hero, and campaign shooting by pacing and information rules.

**HUD.** Protect target silhouettes and the aiming area. Test health, armor, ammunition, firing mode, ability state, and damage direction in the actual camera. Account for third-person shoulder changes and the difference between camera aim and weapon clearance. Show an accurate reason when firing or an ability cannot succeed. Do not assume all critical data belongs at the reticle or in a corner.

**Menus.** Support legible equipment comparisons, remapped bindings, firing-range rehearsal, and clear team/readiness states where relevant. Show whether opening equipment pauses the game.

**Avoid.** Ambiguous hit confirmations, oversized score banners during danger, decorative reticles suggesting false precision, and labels that reveal undiscovered enemies.

**Probe.** Test reload decisions while tracking a moving target, shield damage versus health damage, ally/enemy overlap, and an offscreen attack. Compare actual detection and recovery rather than preferred screenshot alone. The FPS display experiments in [H02](sources.md#h02) support task-specific evaluation with clear limits.

## Battle royale and team survival

**Decisions.** Identify the information needed to choose a drop, loot, rotate, engage, revive, and survive the final phase. Define how much the player may know about opponents and distant events.

**HUD.** Differentiate storm/ring timing, safe region, squad identity, downed state, recovery window, and contextual communications. Protect the action view when multiple pings, loot labels, and damage messages compete. Distinguish teammate location, a suggested destination, an enemy report, and an acknowledged plan.

**Menus.** Preserve parties through results and rematches. Distinguish readiness, disconnection, spectating, and leaving. Explain loot compatibility without a long tooltip during danger.

**Avoid.** A single undifferentiated marker for every intent, disappearing squad context, and post-match promotion screens that delay regrouping.

**Probe.** Perform a no-voice squad rotation while one player is downed, the zone changes, and several pings overlap. Verify that the team agrees who marked what and whether it remains relevant. Respawn's contextual ping changes provide a concrete example. [H07](sources.md#h07)

## Extraction and high-stakes loadouts

**Decisions.** Clarify equipment at risk, extraction conditions, and persistence. Establish how insurance, contraband, stash limits, and equipment dependencies work before exposing them.

**HUD.** Provide trustworthy exit status, extraction progress, environmental threats, teammate state, and inventory capacity to the extent the rules allow. Distinguish an available exit from a discovered location or a conditional exit.

**Menus.** Support side-by-side comparison, saved loadouts, clear current selection, filter recovery, and explicit buy/equip/overwrite distinctions. Show the resulting kit and costs before a consequential commit. Preserve momentum from death through re-equipping to the next session.

**Avoid.** Mandatory serial comparison, hidden loadout changes, a console navigation model copied unchanged to mouse input, or a UI that obscures continued multiplayer action.

**Probe.** Rebuild a preferred kit after loss, compare alternatives while short of funds, cancel a replacement, and return after interruption. Crytek's account of its redesign shortcomings and proposed repairs is a useful corrective case, not proof that its exact layout suits every extraction game. [H09](sources.md#h09)

## MOBA and ability-driven team combat

**Decisions.** Support targeting, positioning, resource spending, cooldown timing, purchases, team coordination, and objective control. Separate local combat awareness from strategic map awareness.

**HUD.** Distinguish ability cooldown, remaining charges, resource shortage, disabled state, and target validity. Make team identity, crowd control, shields, and significant buffs readable without turning every effect into a priority alert. Preserve fog-of-war and observation rules across HUD, tooltips, pings, and spectator views.

**Menus.** Offer purchase comparisons and build information at appropriate depth; keep quick actions usable under time pressure. Provide a practice space and contextual explanations for unfamiliar mechanics. Resolve controller or touch targeting deliberately rather than shrinking a desktop ability bar.

**Avoid.** Cosmetic effects masking hit regions, unreadable stacked status icons, and purchases whose prerequisites or consequences are hidden.

**Probe.** Review a dense team fight with several cosmetic variants, a control effect, and an objective warning. Ask who can act, what disabled them, and which danger is avoidable. Riot explicitly links effect prominence to gameplay significance and checks clarity across skins and maps. [H11](sources.md#h11)

## Action adventure and open-world exploration

**Decisions.** Support alternating combat, traversal, searching, conversation, and longer-term objectives. Determine whether discovering routes is part of the intended challenge.

**HUD.** Define separate phase behaviors. A calm exploration view may suppress routine meters while still allowing recall; combat may reveal relevant resources. Use object prompts and route hints at the level of help the experience intends. Keep tracked objectives, optional discoveries, and map pins distinct.

**Menus.** Organize map, journal, equipment, and quest detail around player intentions. Preserve the selected location and zoom on return. Support re-entry after a long absence with accessible objective and control reminders.

**Avoid.** An unfiltered icon field, constantly repeated tutorial prompts, and guidance that solves every exploration question by default.

**Probe.** Resume after a week, recover the objective, navigate between floors, change tracking, and enter combat without stale prompts. Guerrilla documents adjustable guidance, HUD visibility, tutorial reference, and re-entry support in Horizon Forbidden West. [H10](sources.md#h10)

## Stealth

**Decisions.** Clarify whether the player must infer or directly read visibility, noise, suspicion, search, and detection. Match interface certainty to the simulation's certainty and the designer's intended information.

**HUD.** Distinguish suspicious, searching, alerted, and actively targeting states where the game uses them. Identify whose awareness is represented. If providing a directional warning, show a consistent reference frame and resolve several observers. Explain concealment or disguise changes without implying guaranteed safety when the system does not guarantee it.

**Menus.** Support tools, routes, distraction selection, and objective review with correct pause behavior. Make assistance and cue frequency configurable when supported by the design.

**Avoid.** An unexplained meter that fills for several unrelated reasons, visual-only detection warnings, and discovery markers revealing hidden threats.

**Probe.** Cross several fields of view, distract one observer, break sight, and resume from search. Ask the player what changed and why. Naughty Dog documents adjustable awareness indicators and alternative combat cues as one implementation example. [H03](sources.md#h03)

## Horror and survival horror

**Decisions.** Identify which uncertainty creates tension and which uncertainty merely obstructs control: threat location may be unknown while interaction success and inventory use must remain interpretable.

**HUD.** Consider restrained overlays, diegetic instruments, or mixed displays only where they remain usable under darkness, motion, damage, and camera obstruction. Give alternative readable status when the primary presentation cannot serve a player's needs. Treat sensory comfort controls as part of delivery; preserve threat information when intense effects are reduced.

**Menus.** State whether inventory management leaves the character exposed. Support comprehensible item combination, limited capacity, examine/use distinctions, and save or checkpoint consequences.

**Avoid.** Making all text distressed, illegible health represented only by red blur, and assuming fewer visible elements guarantees immersion. Dead Space's diegetic UI is a particular creative direction documented by its designer. [H12](sources.md#h12)

**Probe.** Use a recovery item at low health in a dark, visually busy encounter; repeat with reduced motion and muted audio. Verify that fear does not come from inability to operate required controls.

## Platformers and precision traversal

**Decisions.** Prioritize landing, trajectory, timing, available movement resources, checkpoints, and retry. Determine whether score, collectibles, or speedrun timing belongs in the moment-to-moment view.

**HUD.** Keep upcoming hazards and landing zones visible as the camera scrolls. Make a dash, jump count, stamina limit, or temporary power readable through a suitable world cue, HUD element, or both. Test all backgrounds and costume variants.

**Menus.** Provide a fast, discoverable retry flow with clear distinction between room retry, checkpoint restart, chapter restart, and save deletion. Preserve practice and assistance settings. Make menu bindings recoverable after remapping.

**Avoid.** Lengthy repeated failure presentation, intrusive collectible celebrations mid-jump, and restart shortcuts conflicting with custom controls.

**Probe.** Repeat a difficult section, pause during an input, remap controls, and restart using only that device. Celeste's documented control and restart changes illustrate these edge cases; its exact timing values are not universal targets. [H06](sources.md#h06)

## Metroidvania and ability-gated exploration

**Decisions.** Support orientation, route memory, newly reachable areas, resource recovery, and tool selection. Establish what the map intentionally records and what the player must discover.

**HUD.** Keep traversal resources and relevant tool states legible. Distinguish room discovery, visited routes, unvisited openings, player-added markers, and known gates. Avoid spoiling the solution through premature map information.

**Menus.** Make multi-region maps navigable with every supported input, retain location on return, and provide a usable legend. Explain ability effects through a safe demonstration or revisitable reference. Clarify what death drops and how recovery works if the game includes that system.

**Avoid.** Identical markers for explored and unexplored content, unreadable floor relationships, and presenting every obstacle as a quest waypoint.

**Probe.** Gain a movement ability, identify a previously blocked route, travel there, and recover after losing orientation. Run the same task with enlarged map text and a controller. Inspect whether helpful information preserves the intended discovery loop.

## Fighting games

**Decisions.** Prioritize spacing, attack recognition, defense, resource thresholds, round state, and match state. Separate one-on-one fighters, tag systems, arena fighters, and platform fighters; their cameras and victory conditions differ.

**HUD.** Keep player ownership unambiguous through side swaps. Distinguish health, recoverable health, guard, special meters, rounds, and relevant timers. Do not imply an unavailable move can be used. Preserve action and stage edges under hit sparks and overlays.

**Menus.** Support rapid rematch, character selection, button checks, command lists, input history, training states, and opponent/network status where applicable. Present practice explanation at the depth the learner requests.

**Avoid.** Ambiguous meter ownership, cosmetic signals resembling mechanics, and match UI conventions that fail in four-player or platform-fighter modes.

**Probe.** Swap sides repeatedly, use a meter-consuming action, enter a special state, and explain remaining options. Test supported audio representations with intended users; ePARA describes Street Fighter 6 cues for spacing, attack level, and meters. [H08](sources.md#h08)

## Brawlers and character-action combat

**Decisions.** Support crowd control, combo continuation, cancel windows, threat prioritization, dodging, and style or mission goals. Establish what expertise should come from learning animations versus explicit indicators.

**HUD.** Separate immediate danger from score celebration. Use offscreen threat cues where justified by camera and fairness. In local cooperative play, preserve identity during overlap and camera movement. Show combo or rank changes without covering attack telegraphs.

**Menus.** Connect move lists to demonstrations, practice, equipment effects, and recovery from failure. Explain why a move or upgrade is unavailable.

**Avoid.** Constant full-screen reward effects, unprioritized enemy bars, and a local-player panel detached from who the player controls after respawn.

**Probe.** Fight a dense mixed group with an offscreen attacker, an ally crossing the view, and a rank update. Verify that immediate threats remain identifiable and feedback explains a dropped combo or failed action.

## Roguelike, roguelite, and run structure

Apply this as a structural overlay to the actual combat or turn-based profile. Do not infer action gameplay from the word roguelike, or use permadeath as a visual style. Define the game's run reset, procedural variation, persistent progression, and recovery rules explicitly.

**Decisions and HUD.** Distinguish current-run resources from persistent currency, temporary buffs from permanent unlocks, and immediate risk from later build value. Expose stack counts, conditional effects, and relevant synergies at useful depth.

**Menus.** Support legible upgrade choices, comparisons against the current build, risk disclosures, a revisitable run summary, and quick return to play. Identify what will be retained or lost before abandoning a run. Show actual failure consequences without a moral judgment about assistance.

**Avoid.** Vague upgrade wording, hidden multiplicative conditions, indiscriminate celebration, and a restart control that silently discards persistent choices.

**Probe.** Choose between upgrades with overlapping effects, inspect the resulting build, die, and explain what persisted. Dead Cells documents improvements to effect/synergy icons and customizable presentation; adapt the principle to the target system. [H05](sources.md#h05)

## Bullet hell and bullet heaven

**Decisions.** Establish whether the player aims precisely, routes through projectile patterns, or manages positioning and upgrades amid automatic attacks. Similar visual density does not mean identical interaction.

**HUD.** Preserve the player, actual danger area, incoming trajectories, safe gaps, pickups, and urgent resources. Distinguish damaging projectiles from decorative or friendly effects. In automatic-attack games, keep build growth and next choice legible without burying navigation beneath damage numbers.

**Menus.** Prevent the gameplay input that opened a reward screen from accidentally choosing an upgrade. State whether choices pause or slow simulation, including multiplayer. Make later inspection possible when decisions recur quickly.

**Avoid.** Effects that erase the safe path, mandatory screen shake, and numerically large rewards dominating survival cues. Returnal's developer account explains hierarchy iteration during dense combat, not a requirement to reproduce its HUD. [H01](sources.md#h01)

**Probe.** Test the maximum intended enemy/projectile/build density with reduced particles, enlarged HUD, and each supported player count. Verify navigation and choice accuracy while the game still meets its performance target.

## Combine profiles and validate the result

Select the dominant loop and add relevant camera, team play, permadeath, platform, and accessibility requirements. Resolve contradictions: quick retry may suit room failure, while abandoning a long run needs clearer consequence handling. Optional exploration guidance can coexist with essential threat cues.

Map every supported phase to decisions, information rights, HUD state, menu path, and a demanding probe. Record intentional departures. Check representative gameplay and complete flows before accepting the design; recognizable conventions and polished mockups do not establish usable play.

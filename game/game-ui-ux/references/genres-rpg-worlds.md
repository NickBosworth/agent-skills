# RPGs, survival, and editable worlds

Apply these profiles to the relevant mode, alongside the game's combat or narrative profile. A fast action RPG, party-based CRPG, online raid, survival expedition, and creative sandbox can share inventory objects while needing very different interactions. The recommendations are original synthesis; the evidence notes describe bounded examples from official documentation.

## Contents

- [Establish the world and item contract](#establish-the-world-and-item-contract)
- [Action RPG and loot-driven progression](#action-rpg-and-loot-driven-progression)
- [CRPG, JRPG, and party systems](#crpg-jrpg-and-party-systems)
- [MMO and persistent online RPG](#mmo-and-persistent-online-rpg)
- [Survival, crafting, and building](#survival-crafting-and-building)
- [Life, farming, and social simulation](#life-farming-and-social-simulation)
- [Sandbox, life simulation, and user-created worlds](#sandbox-life-simulation-and-user-created-worlds)
- [Inventory and equipment comparisons](#inventory-and-equipment-comparisons)
- [Validate the connected experience](#validate-the-connected-experience)

## Establish the world and item contract

Identify the controlled character or party, relevant resource pools, item ownership, progression model, world persistence, and pause rules. Establish whether equipment changes are immediate, restricted, staged, or applied when another action completes. Make the affected actor and resource scope visible throughout menus.

Preserve intended scarcity, exploration, inventory constraints, and uncertainty. A discovery game may deliberately withhold a recipe, enemy property, map region, or quest outcome. Missing information required to operate an available control is a separate issue. Treat changes to disclosure, inventory capacity, automation, combat timing, or pausing as game-design decisions within the authorized scope.

Derive visual direction from the existing world and assets. Use the project's materials, typography, animation, sound, and tone while preserving hierarchy and state distinctions. Avoid assigning ornamental fantasy styling to every RPG or making every survival interface appear distressed.

## Action RPG and loot-driven progression

**Decisions.** Support immediate ability use, threat response, resource spending, recovery, pickup choice, and later build evaluation. Distinguish information needed during combat from information needed while comparing equipment.

**Useful surfaces and states.** Make relevant health, resource, cooldown, charge, targeting, and exceptional status information readable at gameplay speed. Show whether an ability is unavailable because of resource cost, cooldown, target restrictions, equipment, or another known condition. Scale pickup feedback to importance and collection volume. Provide readable ways to inspect, filter, mark, and act on loot where these fit the game's collection rules.

Separate equipped, selected, previewed, favorite, protected, and marked-for-disposal states. Make bulk actions reveal their scope and excluded items. Retain the comparison baseline when moving between loot, shops, inventory, and equipment. Show pending equipment or resource changes if the game applies them asynchronously.

**Tradeoffs.** Combat indicators compete with environmental and enemy signals. Preserve the required attention space and test under heavy effects. Loot filters, auto-pickup, automatic equipment choice, and bulk disposal can change the intended pacing or economy; adopt them according to the game's design.

**Traps.** Watch for item rarity mistaken for suitability, status icons that cannot be identified, unreadable stacked damage numbers, and accidental salvage caused by stale selection or shifting rows.

**Representative test.** Complete a demanding encounter, inspect a relevant drop, compare it to the correct slot and build, equip it, and dispose of unwanted items. Check whether the player understands the tradeoff and preserves protected equipment.

## CRPG, JRPG, and party systems

**Decisions.** Support actor selection, party composition, formation, equipment and skill assignment, shared-resource spending, combat sequencing, and story progression. Establish whether commands act on one member, the current formation, reserves, or the entire party.

**Useful surfaces and states.** Keep the active actor and selected recipient unmistakable. Show which resources are personal, shared, temporary, or tied to a mode. Give multi-target actions an inspectable target set. Represent initiative, active-time gauges, or simultaneous command resolution according to the actual combat model. Make queued commands, committed commands, reactions, and interrupted commands distinguishable.

Support comparison between relevant party members without losing assignment context. Explain known requirements for unavailable equipment and skills. Where menus bridge tactical and narrative systems, preserve the player-visible relationship between an ability, dialogue opportunity, quest condition, and required actor.

**Tradeoffs.** A rich party system can justify persistent detail and deliberate preparation. Fast menu navigation matters most when actions repeat frequently. Consider shortcuts and remembered selections, but validate that remembered targets remain appropriate after deaths, swaps, or formation changes.

**Traps.** Avoid applying an action to whichever character happens to occupy a reused slot, consuming the wrong resource pool, or hiding the reason a reserve member cannot participate. Do not expose future story checks through otherwise innocuous comparison text.

**Representative test.** Change one member's equipment and abilities, move them in the formation, spend a shared resource, and choose an action affecting several targets. Ask the player to identify the actor, recipients, cost, timing, and expected result before committing.

## MMO and persistent online RPG

**Decisions.** Support role execution, group coordination, targeting, communication, readiness, loot decisions, and management of persistent progression. Identify interactions that depend on host, leader, guild, account, character, or individual-player authority.

**Useful surfaces and states.** Provide useful role defaults for party information, relevant effects, target state, and critical encounters. Allow justified layout customization, saved presets, and a recoverable reset. Keep selected targets, focus targets, and the target's target distinct when the game supports them. Show group invitations, queue states, readiness, disconnection, reconnecting, and departure consequences clearly.

For shared loot, trade, or progression changes, communicate ownership, eligibility, consent, pending confirmation, and final outcome. Preserve an understandable state when another player changes or removes an object. Separate group messages, private communication, system notices, and encounter-critical information without relying solely on color.

**Tradeoffs.** Highly configurable interfaces serve varied roles and access needs but increase setup effort. Supply strong defaults and make customization reversible. Information restrictions and competition rules apply to every layout, plugin surface, spectator mode, and accessible representation.

**Traps.** Avoid treating local animation as proof that a transaction succeeded, hiding critical effects behind chat windows, or making a custom HUD necessary to complete ordinary tasks.

**Representative test.** Join a group, identify role and readiness, perform a role-relevant encounter action, resolve a loot decision, recover a connection interruption, and restore a preferred layout.

Evidence: FFXIV documents HUD templates, targeting, party coordination, and status presentation. Use this as evidence that these systems deserve explicit interaction design; copy only features justified by the current game. [G08](sources.md#g08)

## Survival, crafting, and building

**Decisions.** Support managing immediate threats, choosing supplies, finding resources, preparing recipes, using stations, building shelter, and planning expeditions. Establish whether inspection pauses play and whether dangerous conditions can change while the inventory is open.

**Useful surfaces and states.** Show relevant needs, conditions, carrying limits, tool state, and actionable warnings. For available recipes, identify permitted ingredient sources, required tools or stations, quantities, substitutions, and the resulting item. Distinguish a recipe being known from currently craftable. Explain known blockers without revealing undiscovered content.

Make consumption and reservation clear when crafting draws from multiple containers. Show whether output goes to a backpack, station, ground, or shared store. Clarify interruption and cancellation behavior. In construction, expose placement validity, connections, orientation, collision, access, and material requirements that the player may know.

**Tradeoffs.** Inventory manipulation, limited carrying space, and risky crafting can be intentional challenges. Improve clarity without silently removing them. Quick-access slots and automatic ingredient selection need explicit rules when rare materials, durability, quality, or shared property matter.

**Traps.** Watch for a safety-looking menu in a live world, unclear depletion warnings, ingredients silently taken from another owner, and placed structures whose nonfunctional state looks complete.

**Representative test.** Craft using permitted ingredients distributed across containers, explain the consumption before commitment, handle an interruption, and place a structure with an unmet prerequisite. Verify that the player can identify and resolve the actual issue.

## Life, farming, and social simulation

**Decisions.** Support choosing daily activities, allocating time and energy, tending crops or animals, preparing for seasonal events, and developing relationships. Establish whether time advances continuously, through actions, while menus are open, or during absence; these models create different planning needs.

**Useful surfaces and states.** Present the day, season, relevant opening hours, announced events, and known deadlines where the game makes them available. Distinguish planted, growing, harvestable, tended, neglected, and completed states when those conditions exist. Make recurring chores distinguishable from optional goals and one-time requests. Show whether a queued activity, selected tool, or inventory action consumes time, energy, or resources before commitment when the rules permit that knowledge.

For relationships, distinguish discovered preferences, remembered interactions, current observable mood, and longer-term relationship state. Preserve the intended uncertainty of other characters' reactions and routines. A journal or calendar should record legitimate knowledge without exposing unrevealed schedules, gift outcomes, or future scenes.

**Tradeoffs.** Cozy describes a desired tone rather than a compulsory difficulty or information density. Some players enjoy efficient scheduling; others enjoy wandering or decorating. Offer understandable reminders and inspectable detail appropriate to the design without automatically turning every activity into a mandatory checklist or optimizing the day for the player.

**Traps.** Watch for ambiguous day rollover, season-dependent plans shown as guaranteed, already-completed chores appearing outstanding, accidental gifting while inspecting an item, and reminders that create unintended urgency.

**Representative test.** Begin near a seasonal transition. Ask the player to plan an achievable day around tending, a known opening time, and an announced event; carry it out, inspect a discovered preference, and resume after interruption. Verify that they understand which information is known, predicted, or undiscovered.

## Sandbox, life simulation, and user-created worlds

**Decisions.** Support selecting, arranging, transforming, combining, saving, sharing, and simulating objects. Establish the boundary between authoring tools, playable world actions, and management of characters' needs or relationships.

**Useful surfaces and states.** Make the current tool, selected object set, coordinate or snapping mode, preview, and commit state visible. Distinguish manipulation from camera movement. Define undo and redo scope where supported, including actions involving simulation time or other players. Show save progress, revision identity, conflicts, compatibility, and missing content in understandable terms.

For catalogs and user-generated content, support relevant discovery, preview, provenance, dependencies, and permission states. Separate a local draft from an uploaded or shared version. Make publication scope and audience explicit. Where user submissions appear to others, include the platform's applicable reporting and moderation paths. Keep these controls consistent with project policy.

**Tradeoffs.** Creative freedom may need dense tools, while casual arrangement may need immediate manipulation. Offer focused modes or progressive access without obscuring which mode is active. Do not add asset publishing, cloud accounts, or external marketplaces merely to complete an unrelated local editor task.

**Traps.** Avoid hidden multi-selection, surprising snapping, stale previews, ambiguous overwrite behavior, and undo that appears to reverse another player's committed work.

**Representative test.** Build a small scene, duplicate and transform objects, switch to simulation, recover an allowed mistake, save a revision, and preview a share action. Check that the player understands the destination and affected content before publication.

## Inventory and equipment comparisons

Specify what is being compared, for whom, and under which conditions. Identify the destination slot when several slots accept the item. Keep base properties, active modifiers, conditional effects, and final derived values distinguishable. Explain omitted dimensions when the game cannot reliably calculate them. A favorable numeric delta does not establish that an item improves the player's intended build.

Use coherent units, aligned property ordering, and stable labels. Preserve meaningful unknown attributes. Keep selection and scroll position predictable when sorting, filtering, consuming, equipping, or receiving items changes the list. Provide alternatives to drag-and-drop for supported inputs. Inspect long localized names, empty inventories, full inventories, large stacks, disabled actions, partial operations, and changes made by other players.

Evidence: FFXIV offers equipped-item comparison while shopping as well as in inventory, with mouse and controller paths. This illustrates placing comparison within the acquisition decision. [G09](sources.md#g09)

## Validate the connected experience

Test transitions between world, combat, inventory, shop, crafting, party, and save states. Use actual game data and verify focus restoration, actor identity, resource scope, and accepted outcomes. Combine representative late-game density with the supported text and input settings. Distinguish a strategic tradeoff the player understood from an interface error that prevented the intended action.

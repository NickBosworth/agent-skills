# Strategy, tactics, and management

Apply the relevant profiles to each gameplay mode. A campaign map, tactical battle, construction tool, and research menu can require different interfaces inside the same game. The operational guidance below is original design synthesis. The short evidence notes identify specific developer findings; they do not make the recommendations universal standards.

## Contents

- [Establish the decision model](#establish-the-decision-model)
- [Real-time strategy and tactics](#real-time-strategy-and-tactics)
- [Tower defence](#tower-defence)
- [Turn-based tactics](#turn-based-tactics)
- [4X and grand strategy](#4x-and-grand-strategy)
- [City, colony, and tycoon management](#city-colony-and-tycoon-management)
- [Automation and logistics](#automation-and-logistics)
- [Airports and transport operations](#airports-and-transport-operations)
- [Specify information semantics](#specify-information-semantics)
- [Validate a representative slice](#validate-a-representative-slice)

## Establish the decision model

Identify what the player commands, the simulation clock, available knowledge, decision horizon, and recovery rules. Record whether the player operates individual units, formations, territories, production networks, or schedules. Establish whether menus pause play, whether orders execute immediately, and what other players can change concurrently. Show these states clearly wherever they affect commitment.

Separate unexplored, hidden, uncertain, delayed, and unavailable information. An unknown resource deposit and an observed empty deposit require different presentation. A forecast should expose the assumptions it can support. Respect fog of war, scouting, incomplete intelligence, intentional accounting work, and other established challenges. Treat revealing hidden state, adding automation, changing pause behavior, or enabling undo as game-design decisions; keep such changes proposed until they are within the authorized scope.

Derive presentation from the game's world, camera, assets, audience, and player role. Information density may change between overview and inspection. Choose readable layouts for the actual display and input without assigning parchment to historical games or technical dashboard styling to simulations.

Evidence: Halo Wars 2 organized interface decisions around explicit experience pillars and constraints. Into the Breach's presentation constraints also influenced its mechanics. These are examples of jointly designing gameplay and UI, not fixed genre templates. [G06](sources.md#g06) [G07](sources.md#g07)

## Real-time strategy and tactics

**Decisions.** Support prioritizing attention, selecting the intended force, issuing orders, allocating resources where applicable, and coordinating several simultaneous fronts. Distinguish an RTS with base production from a tactical game that has no economic layer.

**Useful surfaces and states.** Make selection identity, mixed-group composition, active command mode, commandable targets, and order acknowledgment legible. Show when an order is queued, executing, interrupted, blocked, completed, or rejected. Separate queued movement from replacement movement through understandable feedback. Keep unit readiness, relevant stance, ownership, cooldowns, and retreat conditions available at the required glance speed. Pair offscreen events with useful location access; identify which camera movement or selection change an alert will perform.

Offer input-appropriate routes to frequently used units, locations, formations, and commands. Preserve the player's selected group when inspecting production if the workflow requires returning to it. Make control-group assignment and recall distinguishable. In multiplayer, show the difference between a locally requested order and the state the game has accepted.

**Tradeoffs.** Persistent information improves monitoring but consumes battlefield area. Use priority, aggregation, optional inspection, and player configuration before adding further permanent panels. A tactical overview and a cinematic battle view may need separate modes. Assess whether command wheels help the target input and task frequency rather than importing them automatically.

**Traps.** Avoid unclear selection behind effects, visually identical friendly and hostile orders, alerts with no affected location, accidental replacement of a queue, and production indicators that conceal resource reservation. Recheck readability with maximum plausible selected units and overlapping status effects.

**Representative test.** Ask a player to select a mixed force, queue two orders, inspect production, return to the same force, and respond to an offscreen attack. Observe targeting errors, missed acknowledgment, context loss, and whether they can explain a blocked order.

## Tower defence

**Player decisions:** choose placement, coverage, upgrades, targeting priorities, and resource use against current or forecast waves. Establish whether the route is fixed, player-shaped, or dynamic, and whether planning can pause the world.

**Useful surfaces:** communicate the actual defended target and its condition, wave/phase, resources, valid placement, range, coverage, relevant attack properties, and upgrade costs. Distinguish theoretical reach from valid targets when obstacles, height, line of sight, or enemy type matter. Show path changes only to the extent the game rules permit; mark a preview as provisional if the simulation can invalidate it.

**Menus and transitions:** provide build/upgrade/sell inspection, supported targeting modes, preparation/next-wave controls, results, and retry. State refunds and the point of commitment. A hybrid with direct avatar combat also needs the action profile and a clear switch in control ownership.

**Traps:** overlapping range circles hiding enemies; an upgrade comparison without the current modifiers; placement looking valid until an unexplained rejection; accidentally starting a wave while navigating; showing an exact future enemy route in a game intended to keep it uncertain.

**Probe:** place and upgrade a defence near a constrained path, explain which enemies it can affect, start a wave, and respond to an emerging leak. Repeat with the actual controller/touch path and dense effect settings. This profile is design synthesis; validate its assumptions against the game's rules.

## Turn-based tactics

**Decisions.** Support movement, action spending, target choice, positioning, sequencing, and commitment. Establish whether turns alternate, use initiative, resolve simultaneously, or permit reactions and interruptions.

**Useful surfaces and states.** Show the active actor and phase, remaining action resources, reachable destinations, legal targets, relevant terrain, and consequences the rules permit the player to know. Label previewed costs and effects. Show which action a confirmation commits, especially when movement and attacks use similar gestures. Retain an inspectable explanation of results where interacting effects can be difficult to follow.

Distinguish a guaranteed outcome from a chance, interval, conditional result, or unresolved enemy response. Recalculate previews when targets, paths, equipment, statuses, or the underlying state change. If a preview omits a relevant effect, disclose the limitation at the decision point instead of allowing a precise-looking number to imply completeness.

**Tradeoffs.** Rich previews can improve informed choice while removing intended prediction or discovery. Match them to the combat design. Consider an optional detailed view for interactions that cannot fit the normal battlefield, and retain a clear route back to the planned action. Make permitted undo boundaries visible; do not invent reversibility when an action reveals information or changes randomness.

**Traps.** Watch for obstructed destination tiles, attack ranges confused with movement ranges, overlooked friendly damage, hidden reactions, and end-turn controls that appear interchangeable with ordinary confirmation. A disabled attack should reveal the actionable reason the player is entitled to know.

**Representative test.** Present a move involving cover, a status effect, and an interruption possibility. Ask the player to predict what is known, identify uncertainty, commit, and explain the result. Then test simultaneous planning separately if supported.

## 4X and grand strategy

**Decisions.** Support expansion, production, diplomacy, research, military planning, and long-term resource tradeoffs. A player should be able to move from a broad concern to relevant local evidence and return with context intact.

**Useful surfaces and states.** Provide map layers with explicit measures, legends, scope, and date or period where relevant. Use outliners, search, sorting, pinned subjects, and histories when the world's scale warrants them. At construction and policy decisions, expose applicable prerequisites and ongoing consequences. Show why an action is blocked without revealing restricted intelligence. Preserve comparison subjects when moving between related panels.

Structure notifications by relevance and required response. Establish which events interrupt, accumulate, expire, or remain in a log. Allow meaningful configuration where event frequency varies across playstyles. Distinguish simulated time, pause, speed, and any online timing restrictions. Explain whose territory, resources, troops, or diplomatic commitments an action affects.

**Tradeoffs.** Detailed systems can justify substantial data. Prioritize useful detail rather than treating low density as an inherent quality target. Offer broad summaries with inspectable components. Evaluate nested tooltips for pointer travel, controller focus, reading order, and dismissal. A help layer must remain usable when the game state changes beneath it.

**Traps.** Avoid showing unknown as zero, net changes without a period, offers without their conditions, and map colors without a stable legend. Do not bury the main cause of a deficit behind unrelated country statistics.

**Representative test.** Ask the player to explain a falling resource balance, identify contributing regions, inspect a blocked diplomatic action, and choose an intervention. Repeat with a late-game save and the intended console or handheld input.

Evidence: Victoria 3 added decision-relevant groupings and contextual explanations. CK3's console redesign used a control hierarchy and explicit switching between open interfaces and the map. Adapt the principles to the current game's tasks. [G03](sources.md#g03) [G05](sources.md#g05)

## City, colony, and tycoon management

**Decisions.** Support allocating space, money, staffing, services, and capacity while diagnosing interactions between systems. Include people-focused colony play, commercial tycoons, parks, hospitals, settlements, and similar management variants.

**Useful surfaces and states.** For construction, distinguish selected tool, preview, valid placement, invalid placement, committed order, construction in progress, and operational state. Show footprint, connections, relevant access restrictions, upfront cost, and recurring commitments. Distinguish a planned building from a working service in maps and summaries. Make selection, cancellation, relocation, demolition, and upgrades visibly different actions.

For operational inspection, connect aggregate symptoms to affected people, buildings, routes, and tasks. Expose evidenced limiting conditions such as access, materials, staff, working hours, power, or output storage when they apply. Show the time window behind satisfaction, income, utilization, or queue length. Let the player inspect representative individuals without assuming one individual's condition explains an entire population.

**Tradeoffs.** A simulation can support enjoyment through broad planning, detailed optimization, storytelling, or decoration. Provide the relevant level of explanation without automatically solving it. Aggregate recurring events when individual alerts add little value, while retaining severe or unusual events that demand attention.

**Traps.** A red warning is incomplete if the player cannot locate the affected system or understand the unmet condition. Avoid conflating stock with availability, nominal staffing with workers currently present, and building capacity with effective service. Explain known reasons for failed placement in the preview itself.

**Representative test.** Give the player a growing queue with several plausible causes. Ask them to investigate, describe supporting evidence, preview a change, and observe its effect over an appropriate simulated interval. Check whether they mistake delayed feedback for failure.

Evidence: Cities: Skylines II documented separate traffic overview and road inspection views. This supports connecting system and local observations; the observations alone do not establish a complete causal diagnosis. [G04](sources.md#g04)

## Automation and logistics

**Decisions.** Support choosing recipes, sizing production, connecting transport, balancing supply, managing storage, and identifying bottlenecks. Distinguish recipe definitions from particular machines, item stacks, shipments, and running processes.

**Useful surfaces and states.** Expose inputs, outputs, cycle or rate units, active modifiers, and prerequisites at the relevant object. Differentiate idle, waiting for input, waiting for output space, disabled, disconnected, damaged, and normally working states. A process that is deliberately paused should not appear broken. Let players trace links between a blocked output and the connected systems they may inspect.

For large networks, support locating and pinning relevant objects, navigating search results, and recognizing stale or incomplete results. Communicate pending searches without interrupting simulation responsiveness. Provide understandable bulk configuration scope and a reviewable count of affected objects. Clarify whether copied settings include names, filters, routing, priorities, permissions, or other properties.

**Tradeoffs.** Calculated throughput, auto-routing, recipe discovery, and optimization tools can change the challenge. Match assistance to established design intent. When providing a calculation, identify whether it describes ideal configuration, current conditions, or observed history. Avoid silently calculating with inaccessible or hypothetical upgrades.

**Traps.** Watch for misleading precision, inconsistent rate units, modifiers omitted from comparisons, inventory ownership ambiguity, and blueprint previews that conceal missing prerequisites. Avoid letting an item's tooltip suppress meaningful instance details such as condition or remaining life.

**Representative test.** Ask the player to trace a stalled product upstream, distinguish insufficient supply from constrained processing or transport, change one factor, and explain the observed result. Then test a large batch edit and cancellation before commitment.

Evidence: Factorio separated recipe and item inspection and adapted production information as mechanics became more complex. These examples support explicit data meaning while leaving the desired amount of player calculation a design choice. [G01](sources.md#g01) [G02](sources.md#g02)

## Airports and transport operations

**Decisions.** Support scheduling, stand or platform allocation, route capacity, vehicle preparation, connections, passenger or cargo movement, and recovery from disruptions. Reuse the management and logistics profiles; add an explicit event-and-dependency model.

**Useful surfaces and states.** Keep scheduled, estimated, requested, allocated, and actual times distinct. Identify the vehicle or flight, operator, service location, current stage, required resources, and known blockers. Connect a departure to its arrival, turnaround, crew or staff, servicing, loading, and passenger dependencies only where the simulation models them. Label local, game, or other time conventions.

Make conflicts visible before commitment when the rules allow prediction. Show which later services or connections may be affected by a change. Distinguish a usable resource from one reserved, occupied, incompatible, or unreachable. Allow schedule and spatial views to refer to the same selected operation.

**Tradeoffs and traps.** Detailed scheduling can become the game or support a broader builder. Fit interaction effort to that role. Do not display guaranteed departure times from an estimate that ignores queueing. An alert should identify the relevant operation and evidence, while preserving uncertainty about future events.

**Representative test.** Investigate a delayed flight from schedule to stand and services, explain the strongest known blocker, evaluate a recovery option, and identify affected departures. Check that the player understands which times are predictions.

## Specify information semantics

For every meaningful metric, record its unit, scope, time window, update cadence, and knowledge status. Keep these distinctions explicit:

| Distinction | Question the interface must answer |
|---|---|
| Stock and rate | Is this an amount held or a change per unit of time? |
| Available and reserved | Can this resource be spent by the selected action? |
| Capacity and utilization | Is this a limit, current use, or measured average? |
| Observed and forecast | What has happened, and what is being predicted? |
| Zero and unknown | Was an absence measured, or is the state unavailable? |
| Requested and accepted | Has the simulation committed this order? |
| Cause and correlation | What evidence supports the proposed explanation? |

For queues, document ordering, resource reservation, prerequisites, interruptions, cancellation, refunds, and ownership. Reordering must communicate any change in timing or dependencies that the system can predict. Keep pending states visible when results arrive asynchronously, and prevent an old preview from authorizing a materially changed action without appropriate revalidation.

## Validate a representative slice

Exercise one normal task, one blocked task, one interruption, and one recovery using real simulation states. Include late-game scale, long names, maximum supported text size, and the weakest supported display/input combination. Observe whether players find the decision, explain the evidence, predict permitted consequences, and recover context. Record interface errors separately from strategic mistakes. Do not remove a gameplay challenge merely because a player chose poorly after understanding the available information.

# Foundations for game interface decisions

## Contents

- [Evidence and purpose](#evidence-and-purpose)
- [Separate three design layers](#separate-three-design-layers)
- [Describe the player decision](#describe-the-player-decision)
- [Make information interpretable](#make-information-interpretable)
- [Organise complexity](#organise-complexity)
- [Protect the attention budget](#protect-the-attention-budget)
- [Apply human-factors principles carefully](#apply-human-factors-principles-carefully)
- [Preserve intentional challenge](#preserve-intentional-challenge)
- [Design for learning and return](#design-for-learning-and-return)
- [Resolve competing goals](#resolve-competing-goals)

## Evidence and purpose

Use this chapter as original design synthesis, not a claim that one research study establishes a complete game-design method. NN/g applies familiar usability heuristics to games: visible state, comprehensible conventions, recognition, control, error recovery, and useful help remain relevant in an entertainment context. These are inspection tools, not guarantees that a game is enjoyable. [F01](sources.md#f01)

Choose the experience first. A coherent interface can support tension, delight, mastery, curiosity, social cooperation, creativity, or careful optimisation. Measure its success against that experience and the actual player's tasks.

## Separate three design layers

| Layer | Main question | Typical work |
| --- | --- | --- |
| Game rules and knowledge | What should the player be able to do and know? | Visibility of enemy intent, pause rights, undo, resource commitment, probability, discovery |
| Interaction and information | How can the player understand and act on that? | Flows, selection, labels, forecasts, navigation, hierarchy, feedback, recovery |
| Visual and sensory expression | How should it feel and belong to this world? | Typography, shape, material, colour, composition, motion, sound, haptics |

Work across the layers, while keeping authority clear. A UI task can expose a rules problem; it does not automatically authorise redesigning the rules. Show the conflict and recommend an approach. Complete independent interface work while a consequential rule decision remains open.

Keep the distinction in design reviews. A well-composed screenshot cannot settle whether an action has the right consequences. A correct interaction can still feel visually generic or aesthetically unresolved. Evaluate both.

## Describe the player decision

For each important moment, establish:

1. **Situation:** what is happening in the game, and what interrupts the player?
2. **Goal:** what does the player want to accomplish?
3. **Evidence:** what facts, perceptions, estimates, and memories may legitimately inform that choice?
4. **Options:** which actions exist, which are possible now, and what constrains them?
5. **Commitment:** which costs, risks, targets, and consequences need to be understood before acting?
6. **Feedback:** what will make acceptance, progress, failure, and completion distinguishable?
7. **Recovery:** what can be cancelled, revised, retried, undone, or learned from?

Describe situations at a useful level. “The player needs the health bar” assumes a solution. “The player must decide whether they can survive another exchange while tracking an enemy” permits a conventional bar, a contextual readout, a diegetic cue, or a supported combination.

Make decisions concrete enough to test. For a management game: “Find why stand 12 is delaying departure, identify the limiting service, and inspect an available intervention.” For a card game: “Understand the modified cost and legal target before committing this card.”

## Make information interpretable

Give important values a semantic contract. Include unit, scope, time window, source, update condition, and validity. Use different presentations for:

| Distinction | Why it affects a decision |
| --- | --- |
| Amount and rate | A stockpile of 200 units is not production of 200 units per minute |
| Capacity and actual output | Maximum possible service differs from current completion rate |
| Available and reserved | Visible stock may already be committed to an order |
| Local and shared | A character's resource may differ from the party's or faction's |
| Current and forecast | A prediction can change after new information or interruptions |
| Base and modified | Displayed effects must account for the applicable current modifiers |
| Zero, unknown, hidden, stale, unavailable | The player should not read an absent measurement as an empty resource |

Choose precision by consequence. Use rounded overview values when exact digits distract, with inspectable detail when a decision depends on a threshold. Preserve sufficient precision to avoid a preview claiming an unaffordable action is affordable. Keep actual resolution and displayed rounding consistent.

For forecasts, state relevant assumptions and horizon. Do not fabricate a statistical confidence interval because the presentation would look professional. Use the game's genuine estimate, range, or conditional explanation.

## Organise complexity

Group around the player's mental model and task. An inventory can need search, filters, sorting, grouping, quick access, and comparison; a map can need layers and an object inspector. Choose these features from actual collection size and use, not a checklist of fashionable controls.

Make relationships visible: parent/child, prerequisite, owner, sequence, containment, spatial connection, and cause. Use tables for comparable values, trees for genuine hierarchy, maps for spatial relationships, and small diagrams for dependencies. A radial is an action selector, not a default presentation for a long catalogue.

Use progressive disclosure for infrequent detail. Keep needed context available during comparison; avoid forcing the player to remember one value while opening its counterpart. For nested information, preserve focus and return context. Do not hide essential data behind a hover-only tooltip or an unexplained icon.

Treat tooltips as short contextual support. Give long explanations, interactive content, and multi-step comparisons a stable inspection surface when the game warrants it. Distinguish “currently unavailable but learnable” from “irrelevant to this task.” Explain meaningful prerequisites instead of making actions mysteriously disappear.

## Protect the attention budget

Treat information as competing with the game world, other UI, sound, motion, and the player's current task. Specify which event should win if several occur together. An achievement, damage warning, dialogue line, incoming invitation, and loot animation cannot all claim the same prominent region without a priority policy.

Choose persistence deliberately:

- Persist information that the player must repeatedly consult or act on immediately.
- Reveal context information at a predictable trigger and retain it long enough for its task.
- Make deliberate inspection available through a stable action with a usable return path.
- Aggregate or defer low-urgency events, retaining a history if they may matter later.

Balance density against retrieval effort. A dense strategy view can be easier to use than a succession of sparse pages. A combat HUD can contain several useful signals yet leave the world visually dominant. Judge the complete decision loop under its real time pressure.

Avoid absolute rules about empty space, menu depth, number of choices, or where eyes must travel. Those can be useful design hypotheses, but input, familiarity, camera, device, and task alter the trade-off. Test the bottleneck actually present in the game.

## Apply human-factors principles carefully

Use established principles to generate testable design changes. Keep the movement, perception, and decision task in view; a named principle is not a substitute for observing the game.

| Principle | Useful application | Boundary to preserve |
| --- | --- | --- |
| Target acquisition and Fitts' law | Review target size, movement distance, and the actual pointing task when a control is difficult to acquire. [F03](sources.md#f03) | A pointer movement model does not automatically predict controller focus traversal, touch reach, or complex gameplay. Do not invent task-time estimates without appropriate measurements and parameters. |
| Gestalt proximity | Place a value, its label, and its action so their relationship reads as intended; separate unrelated groups. [F04](sources.md#f04) | Tight proximity must still leave usable hit areas and avoid confusing destructive and routine actions. |
| Gestalt similarity | Reuse visual treatment for elements that share meaningful function; deliberately differentiate incompatible roles. [F05](sources.md#f05) | Similar decoration can accidentally make an illustration appear interactive or make unrelated states look equivalent. Test the rendered group. |
| Recognition and consistent mapping | Preserve stable action names, icon meanings, and useful comparison context. | Familiarity depends on audience and input. A novel game metaphor can work when its behaviour becomes learnable and consistent. |
| Choice and information structure | Reduce irrelevant options, expose decision criteria, and provide search/grouping for large collections. | Fewer visible choices are not always easier if they create extra navigation or remove comparison context. Do not use a magic menu-item count. |

## Preserve intentional challenge

Document the intended source of difficulty before reducing friction. Examples include interpreting incomplete evidence, aiming precisely, planning scarce resources, remembering a rhythm, or bluffing another player.

Then ask whether a proposed convenience removes an unwanted barrier or changes that challenge. An optional objective reminder can support memory without solving a puzzle. Showing an undiscovered culprit in a tooltip cannot. A forecast of known recipe throughput can support planning; automatically optimising an entire factory may replace the intended task.

Maintain the same knowledge boundary in visual UI, narration, sound, logs, overlays, replays, and spectator views. Accessibility alternatives should convey the intended information through a usable channel. If an adaptation changes mechanics or competitive rules, identify it as a game-design decision and apply the project's established mode policy.

Do not preserve accidental friction merely because it exists. Require evidence or a defensible design intention for difficult interfaces, then test whether the intended audience experiences the intended challenge rather than confusion.

## Design for learning and return

Teach actions where their consequences can be understood. Prefer a small playable example, a safe preview, or concise contextual help when appropriate. Keep tutorials replayable and respect known inputs and remappings. Retain a route to settings before a player is asked to demonstrate a difficult action.

Separate onboarding from permanent clutter. An introductory explanation can shrink into a familiar cue; an expert shortcut can coexist with discoverable navigation. Offer an understandable default even when extensive customisation is available.

Support returning players with an accessible account of current goals, known facts, active orders, and recent meaningful events. Preserve relevant selection, filters, scroll position, camera, and focus when moving between related views. Include a clear way to reset a confusing view without resetting the game.

## Resolve competing goals

For each substantial trade-off, record the goal, evidence, alternatives, choice, and what would change the decision. Useful conflicts include immersion versus ready access; comparison density versus controller traversal; spectacle versus critical-cue visibility; immediacy versus confirmation; customisation versus learnable defaults.

Prototype the difficult state early. If a screen must support a long translated label, a nearly empty battery, six simultaneous statuses, or four local players, include that state before polishing the easy one. Accept a direction only with the evidence appropriate to the claim, then refine it through actual use.

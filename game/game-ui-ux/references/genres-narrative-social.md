# Narrative, adventure, and social play

Combine these profiles with the relevant combat, puzzle, world, or specialist profile. The guidance is original synthesis. Source notes identify bounded developer examples.

## Contents

- [Define agency and knowledge](#define-agency-and-knowledge)
- [Narrative adventure and dialogue](#narrative-adventure-and-dialogue)
- [Visual novels and interactive fiction](#visual-novels-and-interactive-fiction)
- [Point-and-click and detective games](#point-and-click-and-detective-games)
- [Party games and social deduction](#party-games-and-social-deduction)
- [Co-op and shared sessions](#co-op-and-shared-sessions)
- [Private and public presentation](#private-and-public-presentation)
- [Validate the whole interaction](#validate-the-whole-interaction)

## Define agency and knowledge

Establish whether the player is reading, expressing personality, gathering facts, choosing commitments, deducing relationships, coordinating actions, or concealing information from other players. Define what a choice means and whether it has a time limit, cost, irreversible effect, or opportunity for revision.

Record what the player character knows, what the human player has seen, what other participants know, and what the interface is allowed to reveal. These may differ. Preserve unreliable narration and deliberate uncertainty where intended. Missing speaker identity, unclear input focus, or misleading confirmation language is an interaction problem; a mystery with unresolved evidence can be functioning correctly.

Treat changes to timers, hint strength, dialogue consequences, rollback, knowledge visibility, or shared control as game-design decisions within the authorized scope. Derive art direction and pacing from the game's voice, assets, reading demands, and social setting.

## Narrative adventure and dialogue

**Decisions.** Support understanding the scene, recognizing available intentions, choosing responses, and returning to relevant story context. Establish whether dialogue is an exhaustive inquiry, a constrained conversation, a timed exchange, or a consequential branch.

**Useful surfaces and states.** Identify speakers through accessible combinations of name, layout, image, or other cues. Make a response's phrasing represent the intention the game will execute. Where short labels stand for longer lines, make tone or commitment legible enough for the intended choice. Distinguish optional elaboration, leaving the conversation, spending a resource, and committing to an action.

Support player-controlled reading or appropriate pacing options where compatible with the design. Show a timed-choice state clearly, including what happens if time expires. A history or recap should contain what the player has already encountered and preserve speaker attribution. If previously read choices change meaning because of new facts, present the current meaning coherently.

**Tradeoffs.** Exhaustive lists support methodical inquiry; limited contextual options can support dramatic momentum. Match the structure to the intended agency. Dialogue previews, consequence labels, and relationship indicators can change interpretation and discovery. Provide them only within the game's information policy.

**Traps.** Avoid a mild-looking response executing an unexpectedly hostile line, accidental choices from held input, skipping that crosses an unseen commitment, and interface motion preventing a response from being selected reliably.

**Representative test.** Ask a player to choose a response with a stated intention, explain what they expect, and compare it with the resulting line and action. Then resume a scene after a break using only the available history.

Evidence: Jon Ingold distinguishes exhaustive inquiry from dramatically structured conversation and describes context-sensitive questions. His account explicitly allows different conversation models for different games. [G10](sources.md#g10)

## Visual novels and interactive fiction

**Decisions.** Support reading, choosing branches, managing progression, revisiting permitted content, and resuming accurately. Establish whether progression is manual, automatic, voice-led, timed, or mixed.

**Useful surfaces and states.** Treat text reveal, immediate full-line reveal, advance, auto-advance, and skip as separate actions. Indicate which mode is active and how to stop it. Define whether skipping covers only previously seen text, whether it stops at choices, and what happens when new content appears. Prevent the input that reveals a line from accidentally selecting a newly appearing option.

Provide readable text layout, appropriate scaling, language support, speaker identity, and a useful backlog where the design permits it. Keep reading order coherent with self-voicing. Accessible descriptions should convey narrative meaning otherwise carried by images or typography while respecting the same spoiler boundary. Account for voice duration, speech speed, and the player's selected advance behavior.

Make saves identifiable through relevant chapter, location, timestamp, play state, or thumbnail information. Distinguish manual saves, automatic saves, quick saves, and overwriting when supported. Communicate rollback boundaries and whether previously seen content, unlocks, or persistent choices survive loading.

**Tradeoffs.** Immediate text, adjustable pacing, and voice replay can serve different access needs and reading preferences. Rollback, route maps, and completed-scene galleries can alter discovery or commitment; implement only the intended behavior.

**Traps.** Watch for speech cut off by automatic progression, unseen text silently skipped, unreadable ruby or annotation text, backlog spoilers, and save thumbnails that misrepresent the stored state.

**Representative test.** Read with self-voicing, change text speed, use skip, encounter unseen content, stop at a choice, review history, save, and resume. Verify the actual spoken output and state rather than only the appearance of controls.

Evidence: Ren'Py documents separate progression preferences and mechanisms for meaningful alternative text and narration. Check equivalent capabilities and custom-screen behavior in the project's engine. [G11](sources.md#g11) [G12](sources.md#g12)

## Point-and-click and detective games

**Decisions.** Support discovering interactable objects, selecting verbs, combining items, recording observations, testing hypotheses, and using optional assistance. Establish whether identifying a hotspot is itself a challenge or merely a route to the intended puzzle.

**Useful surfaces and states.** Make the active verb, selected item, target, and interaction outcome clear. Distinguish observed facts, character claims, player hypotheses, confirmed relationships, and unresolved questions where the game supports those categories. Maintain a coherent record of discovered evidence and its source. Journal entries should update when the player's knowledge changes without silently replacing useful context.

Where permitted, support layered hints that begin with orientation and progress toward stronger assistance through an explicit player choice. Preserve the ability to inspect past dialogue, evidence, maps, or relevant images without accidentally submitting a solution. Make invalid combinations understandable while retaining intended uncertainty about the solution.

**Tradeoffs.** Hotspot highlighting, objective markers, automatic deductions, and quest-completion percentages can substantially change investigation. Match them to the game's intended challenge. A sparse interface may serve observation, but required controls still need discoverable operation.

**Traps.** Avoid inaccessible interaction targets, critical information encoded only in decorative color, conclusions appearing before the evidence is known, and hints whose labels disguise a complete answer.

**Representative test.** Return after a gap, reconstruct the current question, inspect a clue, try an allowed combination, and request one hint level. Ask the player what is established, what is claimed, and what remains a hypothesis.

## Party games and social deduction

**Decisions.** Support joining, recognizing roles, understanding the immediate task, submitting privately or publicly, voting, waiting, and interpreting results. Establish the expected group size, viewing distance, device arrangement, and mix of first-time and experienced players.

**Useful surfaces and states.** Show join instructions, participant identity, ready state, host authority, current phase, required actor, timer, submission acknowledgment, and next transition. Make it clear whether a response can still be edited. Distinguish observers from participants and show any audience contribution without confusing its weight or ownership.

Use concise, demonstrable instructions at the relevant moment. Let repeat players bypass allowed explanations while ensuring new participants can access them. Keep essential settings reachable during play where they can change without invalidating the session. Explain locked settings. Provide the project's applicable ways to mute, remove, report, or moderate participants and submitted content.

**Tradeoffs.** Timers can create excitement, coordinate a group, or disadvantage participants using delayed streams or slower input. Use permitted timing options and test the resulting pacing. Private information may require a phone, personal panel, concealed handoff, or other supported design; a shared television cannot automatically provide secrecy.

**Traps.** Watch for submissions mistaken for votes, one participant advancing everyone unexpectedly, role information appearing on the public display, and instructions too small for couch play.

**Representative test.** Run a round with mixed devices and one new player. Observe whether each participant knows what to do and sees acknowledgment. Test a late submission, an allowed timer setting, private-role display, and the transition to results.

Evidence: Jackbox documents distinct host, player, audience, privacy, and timing controls, with capabilities varying by game. Adopt only the combination justified by the current session design. [G13](sources.md#g13)

## Co-op and shared sessions

**Decisions.** Support dividing responsibilities, coordinating goals, recognizing teammate state, sharing resources, and recovering from interruptions. Establish who owns the session, controls progression, can pause, and can change shared objects.

**Useful surfaces and states.** Make lobby configuration, participant roles, readiness, invitation status, start conditions, and departure consequences understandable. During play, distinguish local actions from shared commitments. Provide appropriate non-voice communication for goals, locations, requests, and acknowledgment. Let players identify who issued a marker or instruction and when it is no longer relevant.

Design joining, reconnecting, host changes, unavailable content, and mismatched session state as explicit flows where supported. Explain whether progress belongs to the host, each character, the group, or a shared world. Keep ownership clear for inventory, rewards, dialogue decisions, and construction.

**Tradeoffs and traps.** Shared decisions can be individual, unanimous, leader-controlled, or voted. Make the adopted model visible. Avoid a locally opened menu implying the whole game is paused, stale teammate markers appearing current, and two players receiving contradictory confirmation of the same shared action.

**Representative test.** Start a configured session, coordinate a goal without voice, make a shared decision, disconnect one participant, and resume. Ask each player who owns progress and what changed while they were away.

## Private and public presentation

Document an information matrix for player, teammate, opponent, host, moderator, spectator, local bystander, and stream audience as applicable. Apply it consistently to visible panels, tooltips, cursor targets, notifications, logs, narration, replay, and reconnect states. Preserve legitimate role differences without requiring users to remember which screen is safe to display.

A concealed value must remain concealed in alternate representations. A hidden panel alone is insufficient if narration or a public event log exposes its contents. Show secret information only through a surface appropriate to its audience and the project's rules. Explain transitions that make a submission or action public.

## Validate the whole interaction

Test scene and session transitions, not only isolated screens. Include long localized choices, maximum supported text size, voice or narration, delayed responses, lost focus, and supported input changes. Record accidental commitments, misunderstood intentions, spoiler leakage, actor confusion, and recovery failures. Assess dramatic or social pacing separately from mechanical task completion; both matter to the intended experience.

# Testing and review

## Contents

- [Establish the question and evidence](#establish-the-question-and-evidence)
- [Write representative player tasks](#write-representative-player-tasks)
- [Build an adversarial matrix](#build-an-adversarial-matrix)
- [Separate technical and human evaluation](#separate-technical-and-human-evaluation)
- [Use scoped automation](#use-scoped-automation)
- [Review quality without averaging away failure](#review-quality-without-averaging-away-failure)
- [Prioritize reproducible findings](#prioritize-reproducible-findings)
- [Iterate and deliver](#iterate-and-deliver)

## Establish the question and evidence

Treat review as an investigation of specific player tasks, not a hunt for visual defects alone. The workflow here is this skill's testing synthesis. Heuristics can direct attention to understandable status, familiar interaction, and recovery; a heuristic match is not measured evidence of usability. [F01](sources.md#f01)

Define the affected build, surfaces, game rules, player groups, inputs, hardware, access settings, and languages. State what must be learned: whether players notice a threat, understand a comparison, complete setup, recover a save, or maintain control during a transition.

Classify each claim before using it:

| Claim | How to handle it |
| --- | --- |
| Observed behavior | Record the build, starting state, actions, result, and evidence. |
| Project requirement | Cite the supplied requirement and identify the relevant acceptance condition. |
| External standard or guidance | Preserve source, version, platform scope, unit, exceptions, and normative status. |
| Design hypothesis | State the intended benefit and the observation that could support or disprove it. |
| Assumption | Name the missing information and its consequence. Do not report it as a finding. |

Avoid imported universal targets for menu completion, glance duration, animation speed, satisfaction, or participant count. Choose proposed targets from the game's decision window, task cost, existing baseline, and audience; keep them provisional until justified.

## Write representative player tasks

Describe a goal and starting situation without instructing the participant which control to press. Use valid game data and meaningful consequences. Preserve intended challenge: the aim is to inspect the interface, not automatically remove uncertainty, memory, timing, or strategic trade-offs from the game.

Examples to adapt:

| Game context | Task |
| --- | --- |
| Action or survival | Recover from a dangerous state, use the needed item, and resume movement while the world continues. |
| RPG or loadout | Compare valid equipment against a stated goal, commit a choice, and explain what changed. |
| Strategy or management | Find the cause of a production or resource warning and reach the relevant corrective action. |
| Narrative or investigation | Return after an interruption and identify the current known lead without revealing a hidden solution. |
| Racing or simulation | Find the information needed for an upcoming maneuver while maintaining the intended driving/flying task. |
| Puzzle, cards, or tactics | Preview an action, identify its valid consequences, and commit or cancel under the game's rules. |
| Rhythm or time-critical play | Change an allowed setting and regain timing context without accidental input or missed state. |
| Social or cooperative | Identify whose action is required, communicate through a supported channel, and recover from a participant change. |
| Cross-genre menus | Continue the intended save, change a setting, revisit its value, and safely leave the current session. |

For each task, specify valid success, intentional failure, recovery, information the player may know, and evidence to collect. Include novice and experienced routes where relevant. Test first use and repeated use; a guided demonstration cannot show unaided discoverability.

Observe what the player understood before explaining the design. Record assistance, mistaken expectations, hesitation, wrong turns, missed cues, and successful workarounds. For attention-sensitive play, choose observation or retrospective questions instead of assuming continuous verbal explanation is an equivalent gameplay condition. Compare alternatives consistently.

## Build an adversarial matrix

Choose combinations with plausible failure interactions rather than exhaustively multiplying every setting. Cover the intended target range and the risks introduced by the change. Record omitted cases explicitly.

| Dimension | Adverse conditions to select |
| --- | --- |
| Gameplay demand | Dense combat, many units, rapid movement, overlapping alerts, or a consequential decision occurring while a menu is open. |
| Visual background | Bright and dark scenery, particles, changing exposure, map detail, and the busiest relevant world composition. |
| Layout | Smallest supported viewport, unusual supported aspect ratio, safe-area insets, largest supported text, split-screen, or orientation change. |
| Content | Long supported strings, large values, missing values, identical names/icons, empty collections, and the largest representative inventory. |
| Input | Remapping, controller/keyboard switching, held inputs, repeat, drag cancellation, touch occlusion, disconnect/reconnect, and multiple local players. |
| Focus/layers | Nested modal, opening/closing animation, removed selection, sorted list, tooltip, on-screen keyboard, system overlay, and return to gameplay. |
| Asynchrony | Delayed, failed, repeated, partial, and out-of-order responses; navigation away before completion; stale previews. |
| Persistence | Restart, suspended session, changed account, failed save, unavailable storage, and supported conflict/recovery behavior. |
| Access and language | Narration with rapid changes, captions with other overlays, alternate cues, reduced motion, long translations, and RTL/CJK where supported. |
| Knowledge and ownership | Fog of war, unearned knowledge, private player information, spectator limits, shared-device controls, and account changes. |
| Return to play | Long interruption, resumed session, changed objectives, completed tutorial steps, and an already-consumed required item. |

Use legitimate fixtures or controlled test environments for failures. Avoid destructive experiments on real player progress, transactions, or production services. If the actual platform cannot be tested, retain the corresponding condition as unverified rather than substituting an unrelated desktop demonstration.

## Separate technical and human evaluation

| Evidence method | What it can establish | What it cannot establish alone |
| --- | --- | --- |
| Source/design inspection | Intended state flow, ownership, semantics, and apparent missing cases | Actual rendered behavior or player comprehension |
| Automated behavior test | A reproducible contract holds for specified fixtures and inputs | Broad usability or aesthetic quality |
| Screenshot/render inspection | Layout, visible state, composition, and sampled legibility | Focus, timing, interaction, persistence, or dynamic contrast throughout play |
| Agent walkthrough | A tool-driven path completed and its visible results | Human attention, comfort, fatigue, learning, or enjoyment |
| Human usability session | Observed behavior and feedback for those participants and conditions | Universal preferences or comprehensive absence of barriers |
| Target-hardware profiling | Measured performance under the recorded workload | Performance on untested hardware or content |

Label synthetic scenarios and fixtures. Do not invent participant statements, success rates, telemetry, expert endorsements, or results from tools that were unavailable. Ask an independent reviewer to complete a task from the artifact and ordinary task context; do not hand them the desired outcome and then treat agreement as independent validation.

Use [accessibility.md](accessibility.md) for access-specific participant planning and measurement limits. A simulated impairment, monochrome screenshot, or accessibility toggle does not represent the range of real player experience. Recruit and support participants suited to the actual questions; report the scope and limitations of the sample.

## Use scoped automation

Automate stable, observable contracts when the change warrants it. Useful candidates include action-to-glyph mapping after rebinding, valid navigation after list changes, modal input ownership, persistence across restart, rejected stale responses, and prevention of duplicate commitments. Prefer these outcome checks to tests that repeat implementation details without challenging behavior.

Use controlled failure injection for asynchronous services when the project supports it. Confirm that the visible result and authoritative state agree after a retry, cancellation, or delayed completion. A success animation is not a transaction assertion.

Capture representative renders for text expansion, scaling, dense collections, and important component states. Compare deliberately changed regions in context; do not bless every new image as an approved baseline. Keep dynamic values and animations controlled where necessary for reproducibility.

The bundled contrast helper evaluates two opaque sRGB colors. It does not measure composited alpha layers, actual scene coverage, HDR, motion, or headset perception. Select any threshold from the applicable profile and inspect the final rendered case separately. Keep unmeasured conditions explicit.

Profile relevant workloads using the project's existing tooling. Record device, rendering settings, content population, and measured costs. Investigate measured bottlenecks; avoid speculative architecture changes.

## Review quality without averaging away failure

Review the following dimensions with the project's agreed direction and observed tasks:

| Dimension | Questions to resolve |
| --- | --- |
| Player fit | Does the interface support the intended decision at the right time, while preserving deliberate challenge and hidden information? |
| Visual quality | Do composition, typography, assets, spacing, motion, and state treatment form a coherent game-specific language in actual gameplay? |
| Interaction | Are commitment, feedback, focus, cancellation, return, and error recovery predictable and correct? |
| Access/platform fit | Can the supported users and inputs operate the reviewed flow under relevant display, locale, and access conditions? |
| Implementation | Does presentation match authoritative state, ownership, persistence, and measured performance? |
| Validation | Do the available observations support the claim, and are consequential missing checks identified? |

Assign each applicable gate **pass**, **finding**, **unverified**, or **not applicable**:

- **Pass:** the stated condition was met in the documented scope, with evidence.
- **Finding:** an observed discrepancy or supported design issue needs resolution.
- **Unverified:** the condition matters but suitable evidence is missing.
- **Not applicable:** the game or requested scope does not contain the condition; state why.

Do not award a subjective “professional,” “AAA,” or letter grade as proof. Do not average an unusable control into a passing visual score. Checklist completion records coverage; the underlying observations determine what has been demonstrated.

## Prioritize reproducible findings

Use impact, reach, recoverability, and task importance to assign severity. Treat the following as project review categories, not universal numerical scales:

| Priority | Definition and examples |
| --- | --- |
| Blocker | Prevents an essential supported task, loses progress, causes an unintended irreversible action, exposes forbidden information, or creates a serious safety concern. |
| High | Makes an important recurring task substantially unreliable or inaccessible under relevant conditions; recovery is difficult or depends on assistance. |
| Medium | Causes meaningful confusion, extra work, missed information, or inconsistency with a practical recovery path. |
| Low | Local presentation or interaction refinement with limited demonstrated effect on successful task completion. |

Write a finding as **task/context → reproduction → observed result → expected result and basis → player impact → proposed correction → verification**. Attach the relevant frame, trace, or recording. Separate a confirmed defect from a hypothesis about its cause. Raise a coherent design concern even when no single pixel is “wrong,” but identify the evidence needed to assess its impact.

Respect authored game rules. An intentionally difficult puzzle, costly inventory choice, or unsupported platform is not automatically a UI defect. Conversely, calling friction “immersive” does not explain why a requested task is accidentally blocked.

## Iterate and deliver

Fix consequential findings in the authorized scope, then repeat the affected task and plausible neighboring paths. Broaden testing only for a concrete remaining risk or required project gate.

Deliver the affected surfaces, selected direction and rationale, implemented behavior, checks performed, remaining findings, and exact unverified conditions. Use the [review-report.md](../assets/review-report.md) template when helpful. Retain enough build/state context to reproduce the result without this conversation.

If human testing or hardware is unavailable, complete the inspectable work and provide the next specific validation task. Report the actual delivery and validation state.

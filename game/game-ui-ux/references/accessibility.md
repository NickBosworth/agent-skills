# Accessible game interfaces

## Contents

- [Choose the applicable guidance](#choose-the-applicable-guidance)
- [Optional measurement profiles](#optional-measurement-profiles)
- [Make the first interaction accessible](#make-the-first-interaction-accessible)
- [Specify input and focus behavior](#specify-input-and-focus-behavior)
- [Communicate across sensory channels](#communicate-across-sensory-channels)
- [Control timing, motion, and overload](#control-timing-motion-and-overload)
- [Localize meaning and operation](#localize-meaning-and-operation)
- [Run acceptance gates](#run-acceptance-gates)
- [Report evidence and remaining barriers](#report-evidence-and-remaining-barriers)

## Choose the applicable guidance

Build accessibility into the actual player experience: launching, choosing a mode, configuring controls, understanding the HUD, recovering from errors, and returning after a break. Begin with barriers to perceiving information, providing input, understanding decisions, and sustaining play. Use AbleGamers APX to explore alternative solutions while preserving the game's intended experience; it is an ideation framework, not a universal interface template. [A16](sources.md#a16)

Classify every external rule before applying it:

| Evidence class | Application |
| --- | --- |
| Actual platform or contractual requirement | Verify the current applicable document, platform, version, and release scope. Record the requirement separately. |
| Xbox Accessibility Guidelines (XAGs) | Use as detailed game design and evaluation guidance. Microsoft explicitly excludes legal or compliance validation from their purpose. [A01](sources.md#a01) |
| Game Accessibility Guidelines | Use the motor, cognitive, vision, hearing, speech, and general categories to discover overlooked barriers. Its basic/intermediate/advanced grouping describes implementation considerations, not player importance or certification levels. [A15](sources.md#a15) |
| WCAG 2.2 | Apply its normative success criteria when evaluating a web interface against a declared conformance target. Do not label an entire native game WCAG conformant from a few borrowed checks. [A17](sources.md#a17) |
| XR Accessibility User Requirements | Use as exploratory guidance for spatial interfaces, assistive technology, and alternate movement. It is a W3C Working Group Note, explicitly not baseline technical requirements. [A18](sources.md#a18) |

Treat the implementation contracts and test tasks below as this skill's engineering synthesis. Adapt them to the supported hardware, intended challenge, and available accessibility technology. Record a barrier and proposed alternative when a recommendation cannot be implemented; do not silently remove the requirement or pretend an unsupported feature exists.

## Optional measurement profiles

Choose and document a measurement profile. These values are source-specific recommendations or web success criteria, not a universal game UI standard. A game can require larger or differently arranged elements after testing.

| Profile | Verified reference values | Measurement caveat |
| --- | --- | --- |
| XAG 101 text | Minimum default rendered body height at 1080p: console **26 px**, PC/VR **18 px**; at 4K: **52 px** and **36 px**. Mobile/game streaming: **18 px at 100 DPI**, scaling linearly with DPI. Support enlargement to **200%** of those minimums without lost meaning or operation. | Measure visible glyph body height from ascender to descender in the rendered output. Engine font size, points, and CSS pixels are different quantities. Include text inside controller glyphs. [A02](sources.md#a02) |
| XAG 102 contrast | Meaningful standard text and visuals: **4.5:1**. Large text/visuals and inactive text: **3:1**. Its high contrast mode guidance: **7:1**. Large text at 1080p means **52 px console**, **36 px PC/VR**, doubling at 4K. | Check the least contrasting adjacent background, including changing scenes. These inactive-text and non-text rules differ from WCAG. Provide configurable backgrounds/colors where useful. [A03](sources.md#a03) |
| XAG 107 touch | Suggested default target sizes: phones **15 × 15 mm**, tablets **24 × 24 mm**, or equivalent diameter. | Physical targets, not device-independent pixels. These are generous game accessibility recommendations; preserve spacing and provide adjustment of size and position. [A07](sources.md#a07) |
| WCAG 2.2 web pointer targets | AA criterion 2.5.8: **24 × 24 CSS px**, subject to its spacing and other exceptions. AAA criterion 2.5.5: **44 × 44 CSS px**, with its own exceptions. | CSS pixels are density-independent. Neither value specifies a native touch game's ideal control size or an XR target's angular extent. [A17](sources.md#a17) |

For headset UI, validate apparent size, depth, stability, reach, and readability inside the target headset. The PC/VR entry in XAG 101 does not establish a universal world-space text size. Preserve game artwork and typography through a readable default and optional simplified presentation, rather than forcing every title into the same visual style.

## Make the first interaction accessible

Make the route to accessibility settings usable before an introduction, agreement, account flow, or mandatory tutorial can block the player. XAG 112 describes an accessible first settings screen, accessible defaults, and supported platform preferences as approaches. Include narration when required to reach configuration; respect readable platform preferences when available. Do not require someone to discover an unreadable toggle in order to read the menu. [A08](sources.md#a08)

Use concise, effect-based setting names and explain their consequences. Show a safe preview when it helps a player choose; let the player avoid a potentially distressing preview. Keep related settings discoverable from their natural category and an accessibility index. Store changes reliably and preserve them between sessions. Offer reversible presets as starting points, followed by individual adjustments. [A10](sources.md#a10) [A15](sources.md#a15)

**Implementation contract:** declare which settings apply immediately, which need confirmation or restart, how cancel behaves, what reset affects, and how to recover from an unusable control/display configuration. A general settings reset should not quietly destroy unrelated player progress. Design previews and recovery paths as part of the requested feature, not as an additional onboarding questionnaire.

## Specify input and focus behavior

Provide in-game action rebinding and update prompts, tutorials, diagrams, and narrated instructions to the current mapping. Make menu operation possible with sequential digital presses. Offer alternatives to compulsory holds, repeated presses, simultaneous buttons, complex gestures, and precise dragging. Remapping alone cannot resolve a sustained-hold fatigue barrier. Support cancellation of pointer mistakes; release activation suits ordinary buttons, while timing-critical gameplay such as musical instruments can need press activation. [A07](sources.md#a07)

Define a complete navigation contract for each supported input:

| Concern | Contract to implement |
| --- | --- |
| Directional and sequential navigation | Specify initial focus, each directional neighbor, reading order, and behavior when items disappear, disable, reflow, or filter. |
| Mixed input | Preserve context when switching controller, mouse, keyboard, or touch; show appropriate current glyphs without repeatedly stealing focus. |
| Selection | Distinguish hover, focus, selected value, active tab, pressed, and disabled states. A saved selection and current focus can differ. |
| Modal dialogs | Move focus into the dialog, contain interaction there, expose a cancel/back action, and restore a sensible origin when it closes. |
| Scroll and overlays | Bring the focused control into view; prevent tooltips, sticky regions, keyboards, or other overlays from hiding the task. |
| Rebinding capture | Explain capture mode, resolve conflicts, provide a reachable cancel operation, and retain a recovery path. |

Give focus a clearly visible indicator on every background; do not rely on a subtle glow or color change alone. Keep focus out of hidden controls and behind-modal content. This applies to layouts with custom artwork as well as ordinary widgets. [A09](sources.md#a09)

Keep confirm/back conventions consistent. Offer more than one retrieval method for large inventories, quest logs, or other complex collections. If following XAG menu wrapping, apply it to linear lists and offer configuration; do not mechanically wrap arbitrary spatial grids. Recompute navigation after scaling or reflow. [A08](sources.md#a08)

## Communicate across sensory channels

For each consequential cue, record the information it conveys, required response, urgency, and supported alternatives. Color plus shape helps color discrimination; both remain visual. Critical visual information may also need sound, haptics, or narration. Important sound needs a usable visual/text equivalent. Do not treat a colorblind simulation filter as proof of accessibility or a substitute for players with color vision differences. [A04](sources.md#a04)

Examples for design exploration: pair a directional damage indicator with a directional sound; make a selected build mode identifiable through a named state and shape; expose an economy warning through persistent text with a relevant action. Choose the channels that carry equivalent useful information without overwhelming the player or exposing information the game intentionally withholds.

### Narration and semantics

Expose each interactive element's purpose, control type, state/value, group context, and available operation. Narrate context changes and relevant updates; associate tables with row/column meaning. Ignore decorative artwork. Use meaningful action labels instead of speaking arbitrary Unicode symbol names. On focus changes, interrupt obsolete narration; support repeat/cancel and controllable voice settings. Avoid a queue of rapidly changing HUD values that prevents the player hearing the focused action. [A06](sources.md#a06)

**Implementation contract:** define semantic metadata alongside the visual component, not as a late screenshot description. Choose a supported platform accessibility API or a tested in-game narration mechanism. Treat canvas rendering, custom shaders, and engine widgets as unverified until their actual accessibility behavior is observed. Prioritize urgent announcements without stealing focus; provide queryable detail and history for less urgent information.

### Subtitles and captions

Cover spoken content and important non-speech sound. Identify speakers and useful offscreen direction without depending on color. Make captions available before the first relevant audio; keep controls discoverable during play and inherit supported platform preferences where possible. Allow caption categories to be adjusted when the volume of information demands it. [A05](sources.md#a05)

Separate subtitle/caption sizing from HUD density where needed. Allocate space for captions, prompts, objectives, and cooperative player views together. Test simultaneous speech, speaker changes, localization, loud action, and muted playback. Preserve useful timing and meaning; do not solve overflow through indiscriminate abbreviation or by removing the cue.

## Control timing, motion, and overload

Distinguish interface time pressure from intended gameplay challenge. XAG 116 addresses non-core UI time limits, with exceptions for essential or real-time events. Its alternatives include removing the limit, allowing adjustment to at least **10 times** the default, or a warning with at least **20 seconds** to extend and at least **10 extensions**. Important expiring text can instead remain until advanced or dismissed. Do not automatically apply these thresholds to race timers, rhythm windows, or live matchmaking. [A12](sources.md#a12)

Let players reduce decorative movement and control auto-updating menu content. Consider independent camera-shake, bob, blur, sway, and automatic-camera controls. Make text readable over unavoidable live action through positioning and optional opaque backing. Reduced UI motion should preserve feedback and state changes; it does not imply freezing all gameplay behind an overlay. [A13](sources.md#a13)

Assess flashing and repetitive patterns across actual gameplay, including overlapping effects and user-triggered combinations. XAG 118 recommends testing all visually presented games and removing harmful triggers ahead of relying on warnings. Do not pronounce content safe from a screenshot, an animation duration, or a single flashes-per-second rule: luminance, saturated red transitions, affected area, and spatial patterns also matter. Use appropriate analysis and qualified review. [A14](sources.md#a14)

For XR, explore alternate movement/reach, configurable targets, orientation recovery, and an immediate route to a calm environment. Announce critical events without forcing an unrelated focus change. Test seated use and alternate input combinations against the particular experience. [A18](sources.md#a18)

For cognitive access, expose current objectives, replayable instructions, recoverable history, and clear next actions. Provide reminders at the point of need; reduce unnecessary memory tests. Evaluate support alongside the intended puzzle or strategy challenge instead of revealing its solution by default. [A15](sources.md#a15)

## Localize meaning and operation

Provide complete supported-language glyph coverage, readable alternative typefaces where stylization impairs reading, and alignment suited to the language. Enlarged text must retain hierarchy and content. [A02](sources.md#a02)

**Implementation contract:** keep functional labels separate from artwork; externalize whole translatable messages, supply context for translators, and handle plurals and variables without concatenating sentence fragments. Test right-to-left layout and mixed-direction player names, long translations, CJK text, fallback fonts, and the narration language. Localize action names and units while retaining recognizable input glyphs. Do not use a flag as the only language identifier. Pseudolocalization exposes layout risks; native-language review assesses meaning and usability.

## Run acceptance gates

Choose representative tasks from the actual genre and test on intended hardware. These are engineering checks, not a certification claim.

| Gate | Task and evidence |
| --- | --- |
| First launch | Start with a fresh profile using each supported input; reach and configure required accessibility features before content begins. Record blockers. |
| Focus continuity | Complete a settings change and an inventory/menu action using only digital navigation. Open/cancel a modal, filter a list, reconnect input, and repeat after reflow. |
| Rendering | Capture the busiest plausible scenes and each important state at the smallest supported viewport and largest supported text. Measure the selected contrast/text profile. |
| Narration | Navigate without relying on the picture. Confirm labels, state/value, errors, context changes, action prompts, and update priorities using the actual supported narrator. |
| Alternate cues | Complete a consequential task with audio unavailable, then assess essential visual information with the intended alternatives. Do not equate muted play with all hearing-access needs. |
| Motor interaction | Rebind an action and inspect every prompt; verify hold/gesture alternatives and touch customization. Test cancellation without requiring the difficult input being replaced. |
| Recovery | Attempt an invalid value, lost connection, unsaved-settings exit, and destructive action. Verify a clear explanation and a feasible correction/cancel path. |
| Language and cognition | Revisit after an interruption; recover the objective. Inspect long/RTL/CJK content where supported with narration and scaling combined. |
| Motion and safety | Compare reduced-motion behavior and inspect representative motion/flash captures; document the analysis scope and unresolved cases. |

Recruit players whose access needs match the game's likely barriers. Combine task observation, technical measurements, and participant feedback; simulations and automated scans cover only part of the evidence. Provide accessible recruitment/test materials and avoid deliberately exposing participants to suspected hazardous effects. [A15](sources.md#a15)

## Report evidence and remaining barriers

Record: **player task → barrier → observed impact → proposed change → source or design rationale → verification result**. Separate implemented, tested, unsupported, and awaiting-player-feedback claims. Explain error causes and recovery clearly; allow review, cancellation, or reversal before destructive changes, and provide alternatives to mandatory hold-to-confirm. [A11](sources.md#a11)

State the settings, device, build, language, input, and scenes actually assessed. A polished screenshot, semantic labels in source code, or the presence of an accessibility menu does not establish usable accessibility across the game.

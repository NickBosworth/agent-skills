# Art direction and visual craft

## Contents

- [Derive a direction](#derive-a-direction)
- [Build a visual hierarchy](#build-a-visual-hierarchy)
- [Design typography for the task](#design-typography-for-the-task)
- [Use colour and material with meaning](#use-colour-and-material-with-meaning)
- [Make icons a coherent language](#make-icons-a-coherent-language)
- [Compose against the game](#compose-against-the-game)
- [Design motion, sound, and feel](#design-motion-sound-and-feel)
- [Create a reusable design system](#create-a-reusable-design-system)
- [Evaluate polish](#evaluate-polish)

## Derive a direction

Treat the workflow in this chapter as design synthesis. Derive an aesthetic from the specific project; none of the examples below is a required genre style.

Start with evidence: world art, character design, camera, story, sound, physical materials, era, technology, emotional tone, player role, and existing interface. Ask what the player should feel while using a menu: commanding, investigating, preparing, tending, performing, surviving, or exploring. A menu can express that role without pretending every control physically exists in the world.

Write a concise direction with operational meaning. “Tense and improvised” might justify a restrained hierarchy, functional labels, imperfect surfaces away from text, and quiet alert preparation. “Playful and theatrical” might justify bold display typography, expressive transitions, and tactile response. Neither description dictates a palette, font, or panel shape.

For a new visual direction, explore a small number of genuinely different candidates on the same difficult screen. Change meaningful variables such as composition, type personality, material, or interaction metaphor. Evaluate against the same readability, information, and input requirements. Do not present trivial colour swaps as distinct concepts.

Use reference games to study specific mechanisms: how they signal selection, compare objects, pace transitions, or balance world and UI. Record what is being learned and why it transfers. Keep the game's own creative direction and asset rights. Do not represent unlicensed copied artwork as deliverable original assets.

## Build a visual hierarchy

Define the primary read, the next useful read, and quiet supporting information for each state. Use deliberate differences in scale, placement, weight, spacing, contrast, saturation, shape, grouping, and motion. Do not make every label an accent or every button a primary action.

Preserve hierarchy during exceptions. The focused item must remain clear over both selected and unselected backgrounds. An error should stand out without resembling a reward. A low-priority notification should yield to an immediate threat. A large title can provide identity while a smaller functional label carries the action precisely.

Riot's account links effect prominence to gameplay importance and tests recognisability across cosmetic and map variations. Its competitive-game context is a useful example of art and information being reviewed together. [H11](sources.md#h11)

Evaluate hierarchy through tasks: after a brief view, can a player identify the current state and likely next action? During play, can they find the value that changes the decision? These are review questions, not a universal timed scientific test.

Keep interactive and decorative elements distinguishable. Rich decoration can frame a control, but a decorative plaque must not look more actionable than the real button. Shape changes should carry a consistent purpose where repeated.

## Design typography for the task

Choose type by job: display, action label, body text, numerical readout, chat, captions, and world-space annotation. An expressive display face may suit a title while a calmer companion serves fast scanning. Use the actual game alphabet, language coverage, numerals, punctuation, weight, and rendering pipeline when judging a face.

Test awkward but plausible content: similar glyphs, minus signs, percentages, decimal separators, small counters, long player names, abbreviations, and high-value resources. Consider tabular numerals for changing aligned values, provided the chosen font supports them. Keep signs, units, and comparison direction visible; colour alone must not communicate an increase or loss.

Tune type in rendered output. Font metadata, editor zoom, and mockup point size do not establish game readability. Inspect the smallest intended viewport and relevant viewing distance. Use [accessibility.md](accessibility.md) for scoped text measurements and scaling requirements.

Plan reflow and line height rather than shrinking every long string. W3C's internationalisation guidance explains why translation changes width and height and why short source labels can expand substantially. A fixed expansion percentage is insufficient for every string and language. [F02](sources.md#f02)

Do not bake functional text into a background texture. Preserve shaping, localisation, resizing, and speech semantics. For pixel art, choose a deliberate rendering strategy: integer scaling where appropriate, careful glyph coverage, and a readable alternative when the art face does not work at required sizes. Pixel aesthetics do not justify clipping or missing characters.

## Use colour and material with meaning

Define semantic roles before choosing their exact values: surface, primary text, secondary text, focus, selection, warning, error, success, team/owner, rarity, and unavailable state. Several roles can share a colour only when the surrounding context keeps them distinguishable. Avoid making one colour simultaneously mean friend, health, selection, and improvement in a way that creates ambiguity.

Check those roles over the final background, not just a palette sheet. Texture, transparency, bloom, vignette, grading, HDR output, compression, and world motion alter the result. Use an adequate backing plate or treatment when needed; do not assume an outline or drop shadow guarantees readable contrast.

Keep accessible variants coherent with the chosen art direction. A readable alternative can preserve motifs, spacing, shape, and hierarchy while changing contrast, type, decoration, or background opacity. High contrast does not require removing all identity.

Use materials intentionally. A metal frame, painted card, paper journal, glass projection, vector display, or flat field should have a reason within the game. Choose restrained texture near detailed data; reserve higher visual complexity for areas that do not compete with reading or targeting.

## Make icons a coherent language

Specify grid, optical size, stroke or fill treatment, corner/curve language, perspective, state treatment, and semantic family. These are project choices, not a universal numerical grid. Compare icons at actual rendered size and in their dense groups.

Prioritise recognisable silhouettes and distinguish similar actions. Pair unfamiliar or consequential icons with text, especially when the same image could mean inspect, equip, use, sell, or discard. Provide usable labels in tooltips and narration without making hover the only access method.

Separate input glyphs from action icons. Use the current binding for “interact” or “confirm,” and the supported device glyph family. Do not draw a fixed controller button into artwork that must survive remapping and input switching.

Track asset provenance and editable sources. If using generated art, inspect transparency, padding, edge quality, consistency, and licensing constraints applicable to the project. Keep meaningful controls and text semantic. A generated image can supply material or illustration; it cannot supply correct interaction states by itself.

## Compose against the game

Identify the valuable gameplay regions: aim/target, movement path, horizon, character silhouette, interaction object, formation, board, or construction area. Reserve space by camera and task rather than assuming the centre must always be empty or occupied.

Build a consistent spatial grammar. Align related controls, create useful groups, establish a rhythm of spacing, and make overlays belong to their parent task. Avoid unrelated centre alignment or arbitrary panel widths that break scanning. Use optical adjustments when mathematically equal spacing looks uneven.

Test composition under the real extremes: bright sky, dark interior, effects-heavy combat, a crowded inventory, multiple party frames, large text, long captions, and the supported aspect ratios. An ultrawide layout may need a bounded central HUD region; a handheld may need a different inspection composition; split-screen needs per-player allocation.

Review screen transitions as compositions too. Maintain orientation between related views. Show enough context to understand whether the player opened detail, changed mode, or left the current session.

## Design motion, sound, and feel

Assign a purpose to each effect: acknowledge input, explain a spatial relationship, reveal a state change, mark urgency, or express personality. Remove or reduce motion that delays repeated actions without supporting the experience.

Specify onset, duration, easing, interruptibility, completion state, and reduced-motion substitute. Choose actual values in the game and on its input path. Do not enforce a universal “all transitions take 200 ms” rule. A fighting-game retry and a celebratory campaign result can justify different pacing.

Make interaction feedback begin when the input is accepted. The decorative completion may occur later, but it must not leave an enabled action feeling unresponsive. Keep keyboard/controller repeat behaviour and rapid input predictable during animation. Decide whether repeated actions replace, queue, merge, or cancel effects.

Compose audio and haptics with the same hierarchy. Differentiate focus movement, commitment, cancellation, denied action, and urgent feedback where appropriate. Avoid a loud identical sound on every trivial movement. Respect audio settings, caption alternatives, reduced-motion preferences, and haptic availability.

Protect timing-critical gameplay from visual polish. UI animation must not move hit targets unexpectedly, obscure telegraphs, distort rhythm timing, or imply game state that has not occurred. Use snapshots and source-of-truth events when showing predicted or pending state.

## Create a reusable design system

Use [design-system.md](../assets/design-system.md) to record selected roles and values. Keep the system small enough to implement and broad enough to prevent drift. Include typography, colours/materials, spacing, layout constraints, icon rules, motion/sound, and component contracts.

Create representative specimens with actual game content: buttons, tabs, list rows, cards, tooltips, sliders, toggles, prompts, alerts, captions, and the relevant HUD elements. Show necessary states, combinations, and supported input variants. The specimen is a working aid, not an excuse to design unused components.

Give unusual exceptions an explicit reason. Preserve a shared semantic vocabulary across regions, factions, themes, and game modes even when their decorative treatment differs. Validate the default experience before relying on customisation.

## Evaluate polish

Review hierarchy, composition, typography, icon coherence, state distinction, material quality, animation continuity, sound hierarchy, and integration with the world. Identify concrete issues: clipped ascenders, shifting counter widths, competing accents, muddy transparent panels, inconsistent focus boundaries, misaligned icons, aliasing, or a transition that steals input.

Separate taste from failure. “I prefer rounded panels” is a preference. “The selected and focused states become indistinguishable over this background” is an observable problem. Explain why a stylistic proposal fits the game and what evidence would favour another direction.

Use real renders and interactive checks to refine the work. A coherent result with verified behaviour is a stronger completion claim than an aesthetic score assigned without a testable rubric.

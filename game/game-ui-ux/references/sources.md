# Research sources and scope

Research checked on **3 October 2026**. This is an annotated source index for the skill, not a list of universal game-interface requirements. Most entries are official developer/platform documentation, first-person development accounts, or primary research. H12 is explicitly supplementary and abstract-only.

The operational workflows, templates, taxonomy, and genre profiles are original design synthesis. Source citations identify specific supporting observations. A developer example demonstrates an approach in its own game; a small study supports only its tested conditions. Preserve those limits when making recommendations.

Use the bundled guidance offline where appropriate. When a task depends on a changing engine API, platform review criterion, or formal requirement, inspect the installed version and verify the relevant official documentation. Do not load every source for every task or claim a linked talk was watched when only its abstract was available.

## Contents

- [Foundations](#foundations)
- [Accessibility](#accessibility)
- [HUD and action examples](#hud-and-action-examples)
- [Strategy, world, and narrative examples](#strategy-world-and-narrative-examples)
- [Platforms, engines, and specialist examples](#platforms-engines-and-specialist-examples)

## Evidence policy

- **Standard or requirement:** apply only its actual scope and current version. WCAG is a web standard; XAGs are accessibility recommendations, not Xbox certification.
- **Official guidance:** use the stated assumptions and platform context; distinguish pixels, points, physical size, and spatial/angular measurements.
- **Developer case:** transfer the reasoning only when the game context fits. Feature availability is not proof of accessibility or superiority.
- **Research:** record the task, sample/context, measured outcome, and uncertainty. Do not turn limited findings into universal display rules.
- **Synthesis:** test the proposed design against this game and audience. Do not invent measurements, participant results, or conformance claims.

No third-party screenshots, fonts, audio, or source articles are bundled. The package uses original instructions, short paraphrases, and links.

## Foundations

### F01

**[10 Usability Heuristics Applied to Video Games](https://www.nngroup.com/articles/usability-heuristics-applied-video-games/)**

- **Publisher / evidence:** Alita Kendrick / Nielsen Norman Group — Authoritative practitioner guidance.
- **Checked:** 2026-10-03.
- **Supports:** Uses interface heuristics to inspect game feedback, conventions, recognition, control, and recovery.
- **Limits:** Heuristic framing, not a measured guarantee of enjoyment or task performance.

### F02

**[Text size in translation](https://www.w3.org/International/articles/article-text-size.en.html)**

- **Publisher / evidence:** W3C Internationalization — Standards-body internationalisation guidance.
- **Checked:** 2026-10-03.
- **Supports:** Explains variable translation width and height and the value of flexible layouts.
- **Limits:** Web examples; no single expansion ratio predicts every game string, script, or font.

### F03

**[Fitts' Law as a Research and Design Tool in Human-Computer Interaction](https://www.yorku.ca/mack/hci1992.html)**

- **Publisher / evidence:** I. Scott MacKenzie / Human-Computer Interaction; author-hosted at York University — Peer-reviewed research and methodological review.
- **Checked:** 2026-10-03.
- **Supports:** Relates pointing performance to target and movement characteristics and examines appropriate modelling methods.
- **Limits:** Model parameters and movement task matter; it is not a universal predictor of game-menu speed.

### F04

**[Proximity Principle in Visual Design](https://www.nngroup.com/articles/gestalt-proximity/)**

- **Publisher / evidence:** Nielsen Norman Group — Authoritative practitioner guidance.
- **Checked:** 2026-10-03.
- **Supports:** Explains how spacing creates perceived groups and relationships.
- **Limits:** Interface examples illustrate the principle; they do not fix a universal game spacing scale.

### F05

**[Similarity Principle in Visual Design](https://www.nngroup.com/articles/gestalt-similarity/)**

- **Publisher / evidence:** Nielsen Norman Group — Authoritative practitioner guidance.
- **Checked:** 2026-10-03.
- **Supports:** Explains visual similarity as a grouping cue and how misleading similarity changes interpretation.
- **Limits:** Apply to actual game semantics and rendered states; no prescribed icon or colour style.

## Accessibility

### A01

**[Xbox Accessibility Guidelines V3.2](https://learn.microsoft.com/en-us/xbox/accessibility/guidelines)**

- **Publisher / evidence:** Microsoft Learn / Xbox — Official game accessibility guidance.
- **Checked:** 2026-10-03.
- **Supports:** Describes XAGs as best practices for design, development, and testing, developed with industry and disabled players. Provides scoping questions and linked topic guidance.
- **Limits:** Explicitly not a legal or compliance checklist. Individual example screenshots demonstrate one highlighted concept, not complete accessibility. Recheck applicable certification requirements separately.

### A02

**[Xbox Accessibility Guideline 101: Text display](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/101)**

- **Publisher / evidence:** Microsoft Learn / Xbox — Official game accessibility guidance.
- **Checked:** 2026-10-03.
- **Supports:** Rendered text body-height recommendations distinguish console, PC/VR, and mobile density. Covers text/glyph scaling, readable alternatives, language coverage, spacing, and language-appropriate alignment.
- **Limits:** Values measure visible ascender-to-descender body height, not an engine font-size parameter. Headset world-space readability still needs headset-specific evaluation. Recommendations, not certification rules.

### A03

**[Xbox Accessibility Guideline 102: Contrast](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/102)**

- **Publisher / evidence:** Microsoft Learn / Xbox — Official game accessibility guidance.
- **Checked:** 2026-10-03.
- **Supports:** Defines game text/visual contrast profiles, inactive-text treatment, high contrast modes, configurable colors/backgrounds, and measurement against the least contrasting background area.
- **Limits:** Its size definitions and non-text/inactive contrast recommendations differ from WCAG. Constantly changing gameplay needs representative worst-case checks. Decorative/logo exceptions do not excuse meaningful cues.

### A04

**[Xbox Accessibility Guideline 103: Additional channels for visual and audio cues](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/103)**

- **Publisher / evidence:** Microsoft Learn / Xbox — Official game accessibility guidance.
- **Checked:** 2026-10-03.
- **Supports:** Critical information needs additional sensory representation; color conveys meaning alongside another signifier. Semantic text alternatives should describe graphics' intended function.
- **Limits:** Multiple visual signifiers do not replace a nonvisual channel for blind players. Color-vision simulations are internal aids and cannot replace testing with relevant players.

### A05

**[Xbox Accessibility Guideline 104: Subtitles and captions](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/104)**

- **Publisher / evidence:** Microsoft Learn / Xbox — Official game accessibility guidance.
- **Checked:** 2026-10-03.
- **Supports:** Distinguishes speech subtitles from captions for meaningful audio. Covers speaker identity, direction, initial availability, discoverable settings, caption categories, and platform preferences.
- **Limits:** Direction and identity are contextual; avoid redundant or misleading labels. This chapter supplies no universal subtitle reading speed, line count, or screen placement rule.

### A06

**[Xbox Accessibility Guideline 106: Screen narration](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/106)**

- **Publisher / evidence:** Microsoft Learn / Xbox — Official game accessibility guidance.
- **Checked:** 2026-10-03.
- **Supports:** Covers core UI narration, purpose/type/state/value, group enumeration, contextual focus order, decoration exclusion, interruption, repeat/cancel, relevant events, and accessible table relationships.
- **Limits:** Implementation depends on platform screen-reader support or tested game narration. Announcing every update can obscure important content. A static text alternative alone does not prove operative narration.

### A07

**[Xbox Accessibility Guideline 107: Input](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/107)**

- **Publisher / evidence:** Microsoft Learn / Xbox — Official game accessibility guidance.
- **Checked:** 2026-10-03.
- **Supports:** In-game rebinding with updated prompts; sequential digital UI input; alternatives to strenuous or complex input; pointer cancellation; configurable touch targets and platform assistive input.
- **Limits:** Touch recommendations are physical sizes. Press activation can be essential to particular gameplay. Rebinding does not by itself remove fatigue or timing barriers. Platform support constrains available assistive inputs.

### A08

**[Xbox Accessibility Guideline 112: UI navigation](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/112)**

- **Publisher / evidence:** Microsoft Learn / Xbox — Official game accessibility guidance.
- **Checked:** 2026-10-03.
- **Supports:** Accessible initial pathways; consistent interactions; logical navigation; alternatives for complex collections and maps; reflow-aware focus; escape from controls; configurable linear menu wrapping.
- **Limits:** Linear wrapping guidance does not apply to arbitrary multidirectional grids. Platform settings can influence initial narration. Methods unsupported by the platform cannot be assumed available.

### A09

**[Xbox Accessibility Guideline 113: UI focus handling](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/113)**

- **Publisher / evidence:** Microsoft Learn / Xbox — Official game accessibility guidance.
- **Checked:** 2026-10-03.
- **Supports:** Focus must be highly visible, remain on screen, and stay inside an active dialog instead of reaching obscured underlying controls.
- **Limits:** Specific visual treatments are examples, not a required aesthetic. Test actual backgrounds and layouts. The page's historical external WCAG link should not be treated as the current WCAG criterion numbering.

### A10

**[Xbox Accessibility Guideline 114: UI context](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/114)**

- **Publisher / evidence:** Microsoft Learn / Xbox — Official game accessibility guidance.
- **Checked:** 2026-10-03.
- **Supports:** Orient players in the interface, explain control purpose and consequences, identify external context changes, associate labels with controls, and explain expected form input.
- **Limits:** Some transitions are automatic, including loading and multiplayer progression; announce them rather than assuming all context changes can wait for explicit input.

### A11

**[Xbox Accessibility Guideline 115: Error messages and destructive actions](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/115)**

- **Publisher / evidence:** Microsoft Learn / Xbox — Official game accessibility guidance.
- **Checked:** 2026-10-03.
- **Supports:** Explain actionable errors in multiple ways, highlight the affected input, allow review/correction/reversal, and protect destructive actions with accessible alternatives to button holds.
- **Limits:** Error explanations must not expose information that compromises security. Meaningful confirmation is targeted to consequences; the source does not justify repetitive dialogs for every harmless interaction.

### A12

**[Xbox Accessibility Guideline 116: Time limits](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/116)**

- **Publisher / evidence:** Microsoft Learn / Xbox — Official game accessibility guidance.
- **Checked:** 2026-10-03.
- **Supports:** Provide enough time for non-core UI tasks and expiring information through adjustment, extensions, disabling, or player-paced advancement.
- **Limits:** Excludes core gameplay timers and recognizes essential/real-time events, including multiplayer start timers. Its adjustment and warning thresholds must not become blanket rules for rhythm, race, or competitive mechanics.

### A13

**[Xbox Accessibility Guideline 117: Visual distractions and motion settings](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/117)**

- **Publisher / evidence:** Microsoft Learn / Xbox — Official game accessibility guidance.
- **Checked:** 2026-10-03.
- **Supports:** Control distracting menu animation and auto-updates; offer options for camera shake, blur, bob, and other motion; improve text over moving gameplay.
- **Limits:** The menu-background guidance does not demand that all ongoing gameplay be frozen. Camera alternatives must be evaluated against the particular game and viewing environment.

### A14

**[Xbox Accessibility Guideline 118: Photosensitivity](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/118)**

- **Publisher / evidence:** Microsoft Learn / Xbox — Official game accessibility guidance.
- **Checked:** 2026-10-03.
- **Supports:** Test visually presented games for problematic flashing and patterns; prefer removing triggers to warnings; consider luminance, red flashes, extent, and spatial patterns.
- **Limits:** Published failure descriptions include approximate thresholds. No isolated frequency number or screenshot check can establish safety; representative moving-content analysis is necessary.

### A15

**[Full list — Game Accessibility Guidelines](https://gameaccessibilityguidelines.com/full-list/)**

- **Publisher / evidence:** Game Accessibility Guidelines collaborative group — Specialist collaborative game accessibility guidance.
- **Checked:** 2026-10-03.
- **Supports:** Cross-impairment coverage, reminders, replayable information, saved settings, alternatives for communication, and inclusive player testing.
- **Limits:** A broad prioritization reference, not certification or proof that every technique fits every genre. Complexity labels do not imply that a player's access need is optional.

### A16

**[Accessible Player Experiences (APX)](https://accessible.games/accessible-player-experiences/)**

- **Publisher / evidence:** AbleGamers / Accessible Games — Specialist player-informed design framework.
- **Checked:** 2026-10-03.
- **Supports:** Identify shared player barriers and develop creative access/challenge solutions while maintaining the intended game experience.
- **Limits:** Patterns support ideation and communication. They are neither prescriptive layouts nor an accessibility certification checklist.

### A17

**[Web Content Accessibility Guidelines (WCAG) 2.2](https://www.w3.org/TR/WCAG22/)**

- **Publisher / evidence:** World Wide Web Consortium (W3C) — Normative web accessibility standard.
- **Checked:** 2026-10-03.
- **Supports:** Provides web success criteria for text/non-text contrast, focus, reflow, target size, pointer cancellation, semantics, and declared conformance levels.
- **Limits:** Web conformance has a defined scope and exceptions. CSS pixels differ from physical/hardware pixels. Borrowing criteria does not establish native game or XR conformance; XAG contrast details differ.

### A18

**[XR Accessibility User Requirements](https://www.w3.org/TR/xaur/)**

- **Publisher / evidence:** W3C Accessible Platform Architectures Working Group — Exploratory W3C Working Group Note.
- **Checked:** 2026-10-03.
- **Supports:** Explores semantic spatial interfaces, alternate movement/input, customizable targets, orientation, critical alerts, and rapid access to a calm environment.
- **Limits:** Explicitly not baseline requirements, a formal working-group position, or a W3C Recommendation. Some proposed needs require platform support; it supplies no universal world-space pixel recipe.

## HUD and action examples

### H01

**[Unpacking Returnal’s UX design: Gameplay-first UI, retro-futuristic tech, and accessibility](https://blog.playstation.com/2021/05/11/unpacking-returnals-ux-design-gameplay-first-ui-retro-futuristic-tech-and-accessibility/)**

- **Publisher / evidence:** Johannes Koski, UI/UX Director, Housemarque; PlayStation.Blog — Primary developer design account.
- **Checked:** 2026-10-03.
- **Supports:** Combat information hierarchy, maps responding to verticality, coordinated sensory feedback, game-derived art direction, and previews for settings.
- **Limits:** One developer account about Returnal, not comparative evidence that central HUD placement, aggressive low-health effects, or its aesthetics suit other games.

### H02

**[An Empirical Comparison of First-person Shooter Information Displays: HUDs, Diegetic Displays, and Spatial Representations](https://www.yorku.ca/mack/ec2018.html)**

- **Publisher / evidence:** Margaree Peacocke, Robert J. Teather, Jacques Carette, I. Scott MacKenzie, Victoria McArthur; Entertainment Computing 26 (2018), author-hosted at York University — Peer-reviewed empirical research; author-hosted full text.
- **Checked:** 2026-10-03.
- **Supports:** Display choice depends on the information task; HUD and in-world alternatives have different performance and preference tradeoffs.
- **Limits:** Small studies with experienced FPS players and isolated controller tasks; no full-game immersion test. Weapon performance differences were not statistically significant despite the abstract's compressed summary. Navigation aids conveyed different amounts of route information.

### H03

**[The Last of Us Part II: Accessibility Features Detailed](https://www.naughtydog.com/blog/the_last_of_us_part_ii_accessibility_features_detailed)**

- **Publisher / evidence:** Matthew Dunnerstick; Naughty Dog — Official developer feature specification.
- **Checked:** 2026-10-03.
- **Supports:** Adjustable threat indicators, narrated status, alternate combat and traversal signals, HUD presentation, motion effects, and accessibility presets.
- **Limits:** A feature inventory for one narrative action game, not proof of universal effectiveness or a complete transferable accessibility implementation.

### H04

**[Illustrative Rendering in Team Fortress 2](https://steamcdn-a.akamaihd.net/apps/valve/2007/NPAR07_IllustrativeRenderingInTeamFortress2_Slides.pdf)**

- **Publisher / evidence:** Jason Mitchell, Moby Francke, Dhabih Eng; Valve, 2007 presentation slides — Primary developer technical presentation.
- **Checked:** 2026-10-03.
- **Supports:** Gameplay-driven readability, silhouette recognition, value contrast, and reducing unnecessary environmental visual noise.
- **Limits:** Primarily rendering and art direction in one class-based shooter; its illustrative style and team palette are not mandatory UI conventions.

### H05

**[Accessibility](https://deadcells.com/patchnotes/29)**

- **Publisher / evidence:** Dead Cells development team; official Update 29 patch notes, Motion Twin / Evil Empire — Official developer patch notes.
- **Checked:** 2026-10-03.
- **Supports:** HUD scaling and transparency, cross-surface stat presentation, clearer effect/synergy icons, reduced particles, sound priority, and recovery assists.
- **Limits:** Product-specific updates and fixes; listed options are examples, not a benchmark of comprehensive accessibility or proof every player benefits.

### H06

**[Celeste - Changelog - v1.4.1.0](https://www.celestegame.com/changelog.html)**

- **Publisher / evidence:** Celeste development team; Extremely OK Games / Maddy Makes Games — Official developer changelog.
- **Checked:** 2026-10-03.
- **Supports:** Recoverable control remapping, menu binding conflicts, explicit quick restart, reduced screen effects, and retry-related edge cases.
- **Limits:** Historical iteration notes across many versions; exact timing values, reset policies, and speedrun rules should not be generalized.

### H07

**[Apex Legends™: Arsenal Patch Notes](https://www.ea.com/ea-play/news/arsenal-patch-notes)**

- **Publisher / evidence:** Respawn Entertainment / Electronic Arts — Official developer patch notes with design rationale.
- **Checked:** 2026-10-03.
- **Supports:** Contextual non-verbal combat communication, alternate ping choices while downed, and accurate map-to-world marker placement.
- **Limits:** A historical update explaining specific design changes; neither a full ping specification nor evidence all choices remain current.

### H08

**[Street Fighter 6 with improved sound accessibility designed with ePARA Inc. to launch June 2](https://epara.jp/ennews-streetfighter6-230501/)**

- **Publisher / evidence:** ePARA, commissioned accessibility collaborator with Capcom — Primary accessibility collaborator report.
- **Checked:** 2026-10-03.
- **Supports:** Audio conveying opponent distance, attack height, and gauge state, developed with disabled participants.
- **Limits:** Firsthand collaboration announcement, not controlled outcome research or evidence that audio cues alone make all fighting games accessible.

### H09

**[Developer Insight—Upcoming UI Improvements](https://www.huntshowdown.com/news/developer-insight-upcoming-ui-improvements)**

- **Publisher / evidence:** Hunt: Showdown 1896 team; Crytek, 14 February 2025 — Primary developer retrospective and proposed design changes.
- **Checked:** 2026-10-03.
- **Supports:** Input-specific usability, simultaneous loadout comparison, clear equip/overwrite actions, selection feedback, preserved context, and mission awareness.
- **Limits:** The article includes planned changes and explicitly nonfinal images; do not report every proposal as shipped or empirically validated.

### H10

**[Accessibility features in Horizon Forbidden West](https://blog.playstation.com/2022/02/10/accessibility-features-in-horizon-forbidden-west/)**

- **Publisher / evidence:** Brian Roberts, Principal Designer, Guerrilla; PlayStation.Blog — Primary developer feature account.
- **Checked:** 2026-10-03.
- **Supports:** Configurable navigation guidance and HUD visibility, revisitable tutorials, re-entry support, and adjustable sensory presentation.
- **Limits:** One game's launch-era capabilities; some assistance depends on difficulty and platform. Do not equate a feature list with comprehensive accessibility.

### H11

**[Clarity in League](https://www.leagueoflegends.com/en-us/news/dev/clarity-in-league/)**

- **Publisher / evidence:** bananaband1t; Riot Games, 12 March 2021 — Primary developer design principles and examples.
- **Checked:** 2026-10-03.
- **Supports:** Action readability, effect hierarchy, reduced visual noise, recognizable silhouettes, hit-region communication, and cosmetic clarity across maps.
- **Limits:** Principles and examples for a competitive MOBA; no universal numerical salience threshold or requirement to reproduce League's appearance.

### H12

**[Crafting Destruction: The Evolution of the Dead Space User Interface](https://gdcvault.com/play/1017723/Crafting-Destruction-The-Evolution-of)**

- **Publisher / evidence:** Dino Ignacio, Visceral Games / Electronic Arts; GDC 2013 — Official conference session abstract; supplementary reference.
- **Checked:** 2026-10-03.
- **Supports:** Confirms a firsthand account of the iterations that led to Dead Space's diegetic UI.
- **Limits:** Only the official session description was inspected; the full recording was not watched. It does not prove that diegetic interfaces universally improve immersion.

## Strategy, world, and narrative examples

### G01

**[Friday Facts #318 - New Tooltips](https://factorio.com/blog/post/fff-318)**

- **Publisher / evidence:** Wube Software / Factorio; Twinsen and Rseding — Primary developer blog.
- **Checked:** 2026-10-03.
- **Supports:** Meaningful tooltip grouping and separation of recipes, item definitions, and placed-entity state.
- **Limits:** A specific game's redesign; does not prescribe a universal tooltip density or visual style.

### G02

**[Friday Facts #426 - Resource search & Assembler GUI improvements](https://www.factorio.com/blog/post/fff-426)**

- **Publisher / evidence:** Wube Software / Factorio; Klonan — Primary developer blog.
- **Checked:** 2026-10-03.
- **Supports:** Resource search, tracked depletion, calculated production, and distinct recipe versus product inspection.
- **Limits:** Calculation assistance was a contextual design choice, not an instruction to automate every planning challenge.

### G03

**[Dev Diary #74 - UX Improvements](https://www.paradoxinteractive.com/games/victoria-3/news/dev-diary-74-ux-improvements)**

- **Publisher / evidence:** Paradox Interactive / Victoria 3; Henrik, UX Designer — Primary developer diary.
- **Checked:** 2026-10-03.
- **Supports:** Decision-relevant views, contextual explanations, notification relevance, and access to blocked-action requirements.
- **Limits:** Game-specific changes; stated improvements and notification benchmarks are not general usability guarantees.

### G04

**[Development Diary #2: Traffic AI](https://colossalorder.fi/news/development-diary-2-traffic-ai/)**

- **Publisher / evidence:** Colossal Order Ltd — Primary developer diary.
- **Checked:** 2026-10-03.
- **Supports:** Distinct citywide traffic and road-specific inspection, including different measures of traffic behavior.
- **Limits:** An overlay reveals observations; this source does not establish that a heatmap alone diagnoses causes.

### G05

**[Console DD #3: UI/UX and Controls](https://steamcommunity.com/games/1158310/announcements/detail/3095668032157756020)**

- **Publisher / evidence:** Paradox Interactive / Lab42; official Crusader Kings III announcement — Primary developer announcement.
- **Checked:** 2026-10-03.
- **Supports:** Input-specific control hierarchy, contextual prompts, and switching focus between interfaces and the game map.
- **Limits:** The console adaptation's choices do not prove that virtual cursors or fullscreen menus are always unsuitable.

### G06

**[Halo Wars 2: A UX Postmortem](https://media.gdcvault.com/gdc2018/presentations/Szlagor_Max_Halo_Wars_2.pdf)**

- **Publisher / evidence:** Microsoft / 343 Industries; Max Szlagor, GDC 2018 — Primary developer conference slides.
- **Checked:** 2026-10-03.
- **Supports:** Explicit experience pillars, platform constraints, iteration, and deliberate UX tradeoffs.
- **Limits:** Slides contain limited explanatory prose; do not infer quantified benefits from before-and-after images.

### G07

**[Into the Breach Design Postmortem](https://media.gdcvault.com/gdc2019/presentations/Into%20the%20Breach%20Postmortem%20Final.pdf)**

- **Publisher / evidence:** Subset Games; Matthew Davis, GDC 2019 — Primary developer conference slides.
- **Checked:** 2026-10-03.
- **Supports:** Interaction between readability, tactical presentation, telegraphed attacks, and mechanical design constraints.
- **Limits:** Deterministic previews are a defining choice of this game, not a requirement for all tactics games.

### G08

**[Navigating the Game Screen | Game Manual | FINAL FANTASY XIV](https://na.finalfantasyxiv.com/game_manual/view/)**

- **Publisher / evidence:** Square Enix / The Lodestone — Primary official game documentation.
- **Checked:** 2026-10-03.
- **Supports:** HUD configuration, targeting, party coordination, status presentation, and supported interaction paths.
- **Limits:** Living product documentation; feature availability and input mappings must be verified for the target project.

### G09

**[Comparing Gear Side-by-side | UI Guide | FINAL FANTASY XIV](https://na.finalfantasyxiv.com/uiguide/equipment/equipment-compare/equipment_compare.html)**

- **Publisher / evidence:** Square Enix / The Lodestone — Primary official game documentation.
- **Checked:** 2026-10-03.
- **Supports:** Equipped-item comparison during inventory and shopping decisions with mouse and controller access.
- **Limits:** Does not establish a universal definition of better equipment or account for other games' build rules.

### G10

**[Designing Investigate Conversations](https://www.gamedeveloper.com/design/designing-investigate-conversations)**

- **Publisher / evidence:** Jon Ingold / inkle; first-person developer essay published by Game Developer — Primary developer essay.
- **Checked:** 2026-10-03.
- **Supports:** Intentional choice of exhaustive versus dramatically structured conversation and knowledge-aware topic relevance.
- **Limits:** The author accepts different models for different games; do not generalize a fixed number of choices.

### G11

**[Preference Variables - Ren'Py Documentation](https://www.renpy.org/doc/html/preferences.html)**

- **Publisher / evidence:** Ren'Py official documentation — Primary official engine documentation.
- **Checked:** 2026-10-03.
- **Supports:** Distinct text, auto-advance, skipping, choice, transition, and voice-completion preferences.
- **Limits:** Engine-specific capabilities; inspect the installed version and actual custom-screen implementation.

### G12

**[Self-Voicing - Ren'Py Documentation](https://www.renpy.org/doc/html/self_voicing.html)**

- **Publisher / evidence:** Ren'Py official documentation — Primary official engine documentation.
- **Checked:** 2026-10-03.
- **Supports:** Alternative text, meaningful narrated context, descriptive narration, and development inspection of spoken output.
- **Limits:** Engine support alone does not establish that a game's custom interfaces or narrative are accessible.

### G13

**[Streaming, Moderation, and Accessibility Features in The Jackbox Party Pack 8](https://www.jackboxgames.com/blog/streaming-moderation-accessibility-features-jackbox-party-pack-eight)**

- **Publisher / evidence:** Jackbox Games — Primary official game feature documentation.
- **Checked:** 2026-10-03.
- **Supports:** Distinct session roles, private room controls, moderation, and game-dependent timing options.
- **Limits:** Capabilities vary by game and do not define one correct configuration for every party or social experience.

## Platforms, engines, and specialist examples

### P01

**[Steam Deck and Steam Machine Compatibility Review](https://partner.steamgames.com/doc/steamhardware/compat)**

- **Publisher / evidence:** Valve — Steamworks Documentation — official platform review criteria.
- **Checked:** 2026-10-03.
- **Supports:** Default controller completeness, matching glyphs, controller text entry, and Deck-specific display review criteria.
- **Limits:** A compatibility badge checklist for named devices, not a universal readability standard; recheck before submission. The older Steam Deck URL redirects here.

### P03

**[Design advanced games for Apple platforms](https://developer.apple.com/videos/play/wwdc2024/10085/)**

- **Publisher / evidence:** Apple — WWDC24 — official design presentation and transcript.
- **Checked:** 2026-10-03.
- **Supports:** Game-specific adaptive layout, safe areas, touch adaptation, platform input mapping, press feedback, and points-based sizing recommendations.
- **Limits:** 2024 Apple-platform guidance. Points are not raw device pixels. Current SDK behavior and platform requirements need separate verification.

### P04

**[Playables design best practices](https://developers.google.com/youtube/gaming/playables/certification/best_practices_design)**

- **Publisher / evidence:** Google for Developers — YouTube Playables — official platform design guidance.
- **Checked:** 2026-10-03.
- **Supports:** Responsive game canvases, touch hit targets, component states, keyboard navigation, brief onboarding, and clear pause/end states.
- **Limits:** Written for YouTube Playables. Its quick-entry assumptions and density-independent dimensions should not become genre-independent rules.

### P05

**[Display](https://developers.meta.com/vr/design/display/)**

- **Publisher / evidence:** Meta — Meta Horizon OS Developers — official XR design guidance.
- **Checked:** 2026-10-03.
- **Supports:** Stereoscopic depth consistency, sustained viewing comfort, and reasons to redesign conventional flat HUD overlays for immersive environments.
- **Limits:** Scoped to stereoscopic Meta VR experiences; comfort varies with user, hardware, content, and fixation duration. Direct-touch ergonomics need separate consideration.

### P06

**[Hands UI best practices](https://developers.meta.com/vr/design/hands-ui-best-practices/)**

- **Publisher / evidence:** Meta — Meta Horizon OS Developers — official hand-input design guidance.
- **Checked:** 2026-10-03.
- **Supports:** Direct and indirect interaction, target sizing, handoff feedback, ergonomic placement, stable menus, and hand-input confirmation.
- **Limits:** Updated September 24, 2026. Hand-input guidance and SDK conventions must not be treated as universal requirements for every XR controller or headset.

### P07

**[Comparison of UI systems in Unity](https://docs.unity3d.com/Manual/UI-system-compare.html)**

- **Publisher / evidence:** Unity — Unity Manual — official engine documentation.
- **Checked:** 2026-10-03.
- **Supports:** Choosing UI technology according to capabilities, authoring needs, existing content, and installed engine release.
- **Limits:** The unversioned page reviewed identifies Unity 6.6; it is not evidence of capabilities in earlier installed versions.

### P08

**[Keyboard/Controller Navigation and Focus](https://docs.godotengine.org/en/stable/tutorials/ui/gui_navigation.html)**

- **Publisher / evidence:** Godot Engine — stable documentation — official engine documentation.
- **Checked:** 2026-10-03.
- **Supports:** Focus modes, explicit neighbors, initial focus, hidden-control behavior, and separation of UI navigation actions from gameplay.
- **Limits:** The stable alias changes over time. Match documentation to the project's installed Godot version.

### P09

**[Multiple resolutions](https://docs.godotengine.org/en/stable/tutorials/rendering/multiple_resolutions.html)**

- **Publisher / evidence:** Godot Engine — stable documentation — official engine documentation.
- **Checked:** 2026-10-03.
- **Supports:** Distinct resolution/aspect strategies, anchors and containers, integer pixel-art scaling, high-DPI considerations, and independent 3D resolution scaling.
- **Limits:** Illustrative defaults are not a universal game design prescription. Verify properties and supported behavior for the installed release.

### P10

**[CommonUI Input Technical Guide for Unreal Engine](https://dev.epicgames.com/documentation/en-us/unreal-engine/commonui-input-technical-guide-for-unreal-engine)**

- **Publisher / evidence:** Epic Games — Epic Developer Community — official engine documentation.
- **Checked:** 2026-10-03.
- **Supports:** CommonUI active widget routing, UMG/Slate focus, synthetic cursors, input ownership, and pointer-capture debugging.
- **Limits:** The retrieved documentation identifies Unreal Engine 5.8. Check project/plugin versions and integration before using API-specific instructions.

### P11

**[Optimization Guidelines for UMG in Unreal Engine](https://dev.epicgames.com/documentation/en-us/unreal-engine/optimization-guidelines-for-umg-in-unreal-engine)**

- **Publisher / evidence:** Epic Games — Epic Developer Community — official engine performance guidance.
- **Checked:** 2026-10-03.
- **Supports:** UI budgets, invalidation, event-driven updates, widget loading/lifetime, and avoiding unnecessary per-frame work.
- **Limits:** Engine-specific guidance about raw UMG attribute bindings is not a claim that every data-binding framework polls per frame. Profile the actual workload.

### P12

**[Steam Cloud](https://partner.steamgames.com/doc/features/cloud)**

- **Publisher / evidence:** Valve — Steamworks Documentation — official platform implementation documentation.
- **Checked:** 2026-10-03.
- **Supports:** Reviewing persistent state scope and excluding machine-specific video configuration from cross-device cloud synchronization.
- **Limits:** Steam-specific storage behavior. Other platforms and the game itself need explicit save, migration, conflict, and settings policies.

### P13

**[Forza Motorsport Update 10 Release Notes](https://forza.net/news/forza-motorsport-update-10-release-notes)**

- **Publisher / evidence:** Turn 10 Studios — Forza — first-party game case example.
- **Checked:** 2026-10-03.
- **Supports:** Camera-dependent racing awareness through configurable proximity radar and different information needs in replay interfaces.
- **Limits:** A July 2024 release-note example, not a controlled study, generic racing HUD prescription, or statement of every current Forza feature.

### P14

**[Universal offset](https://osu.ppy.sh/wiki/en/Offset/Universal_offset)**

- **Publisher / evidence:** osu! — project wiki — first-party project documentation.
- **Checked:** 2026-10-03.
- **Supports:** Rhythm-game calibration, setup-dependent timing adjustment, and the difference between global and individual-content offsets.
- **Limits:** Documents osu!'s behavior. Other games can use different sign conventions, timing models, and calibration methods; do not copy numeric settings blindly.

### P15

**[RITEC Design Toolbox](https://www.unicef.org/childrightsandbusiness/workstreams/responsible-technology/online-gaming/ritec-design-toolbox)**

- **Publisher / evidence:** UNICEF — Child Rights and Business — research-informed design toolkit.
- **Checked:** 2026-10-03.
- **Supports:** Child well-being as a design and evaluation goal, including agency, competence, inclusion, creativity, and safety.
- **Limits:** Underlying framework research focuses on children aged 8–12; validate other ages and learning needs separately. This is not a legal compliance checklist.

### P16

**[X-Plane 12 Desktop Manual](https://www.x-plane.com/manuals/desktop/)**

- **Publisher / evidence:** Laminar Research — X-Plane — first-party simulation manual.
- **Checked:** 2026-10-03.
- **Supports:** Simulation-specific configuration, controller calibration and profiles, searchable setup, instruments, checklists, replay, and multi-display operation.
- **Limits:** Manual identifies version 12.0 and a May 2024 update. This is a product example, not a general interface standard or aviation training authority.

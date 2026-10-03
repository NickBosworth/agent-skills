# Game interface design system

Populate from the chosen game direction. This template intentionally contains no preset palette, typeface, corner style, spacing scale, or animation duration. Use the project's actual asset and token formats when implementing it.

## Direction

- Creative intent and evidence:
- Player role and desired feel:
- Relationship to world art and gameplay:
- Functional invariants across themes/modes:
- Asset provenance and editable source location:

## Semantic tokens

| Role | Chosen value/asset | Use and rationale | Variant/scaling | Constraint/test |
| --- | --- | --- | --- | --- |
| Primary readable text | | | | |
| Supporting text | | | | |
| Display typography | | | | |
| Numerical readout | | | | |
| Surface/backing | | | | |
| Focus | | | | |
| Selection/active state | | | | |
| Warning/error/success | | | | |
| Ownership/team/status | | | | |
| Spacing and grouping | | | | |
| Icons and input glyphs | | | | |
| Motion/sound/haptics | | | | |

Split rows when distinct semantic roles need different values. Store units and output assumptions with numbers. Keep inactive readable content distinct from decorative content. Record source-scoped thresholds separately from stylistic choices.

## Component specifications

| Component | States required | Input/navigation | Semantic label/value | Reflow/localisation | Relevant token roles |
| --- | --- | --- | --- | --- | --- |
| | | | | | |

## Responsive and access behaviour

- Anchors, safe regions, minimum/maximum bounds:
- Layout changes by aspect, device, orientation, and local-player count:
- Text/UI scale, line-height, wrapping, and overflow:
- Font coverage, fallbacks, shaping, and right-to-left handling:
- Alternative contrast, reduced-motion, caption, and narration treatments:
- Configurable HUD elements and reset/recovery behaviour:

## Motion and feedback contracts

| Event | Purpose | Onset/completion | Interrupt/repeat rule | Reduced-motion alternative | Sound/haptic alternative |
| --- | --- | --- | --- | --- | --- |
| | | | | | |

## Specimens and evidence

- Representative in-game frames and dense states:
- Actual render conditions and input checks:
- Decisions requiring additional playtest:
- Allowed exceptions and why they are necessary:

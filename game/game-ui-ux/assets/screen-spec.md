# Screen or component contract

Use for one meaningful screen, component, or flow. Mark a field not applicable when the game does not need it. Do not treat this template as a requirement to add features.

## Identity and task

- Name and owning game mode/player:
- Player goal and situation:
- Entry conditions and invocation:
- Information legitimately available to this player:
- World/time behaviour while open:
- Success, cancel, and failure destinations:

## Information and layout

| Element | Decision served | Data source/unit | Validity/ownership | Priority | Layout/overflow |
| --- | --- | --- | --- | --- | --- |
| | | | | | |

- Game-specific visual direction and token references:
- Camera/world regions to protect:
- Smallest and largest layout conditions:
- Text scaling, supported scripts, and long-content behaviour:
- Relevant default, selected, focused, hovered, pressed, disabled, pending, error, and success treatments:

## Action and state contract

| State/event | Available action | Guard and cost | Result/commit point | Feedback | Cancel/recovery |
| --- | --- | --- | --- | --- | --- |
| | | | | | |

Include actual empty, loading, stale, permission-limited, partial, error, and disconnected states. Specify whether previews are simulated or authoritative. State how data changes during inspection are handled.

## Navigation and input

- Semantic actions and supported devices:
- Initial focus and directional/sequential order:
- Focus-versus-selection behaviour:
- Modal capture, underlying input, gesture ownership across transitions, and prevention of unintended activation:
- Back/cancel at each layer:
- Return focus if the origin still exists; fallback if it does not:
- Scroll, filter, virtualised-row, reflow, and tooltip behaviour:
- Binding capture, prompt update, device change, and hotplug behaviour:
- Local player or host ownership:

## Semantics and feedback

- Accessible names, control types, values, groups, and descriptions:
- Narrated state changes and interruption/priority policy:
- Nonvisual and non-audio equivalents of essential cues:
- Caption, reduced-motion, contrast, and scaling considerations:
- Input acknowledgment, pending state, completion, error, and audio/haptic events:
- Timing and interruptibility; rationale for chosen values:

## Integration and verification

- Source of truth and UI lifecycle ownership:
- Saved state and settings apply/cancel/reset behaviour:
- Async completion, cancellation, retry, and duplicate-command handling:
- Measured performance conditions relevant to this surface:
- Task, failure, input, layout, access, and privacy checks:
- Actual evidence and remaining unverified conditions:

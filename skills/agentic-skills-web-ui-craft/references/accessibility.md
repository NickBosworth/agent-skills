# Accessibility

Use native semantic elements, associated labels, meaningful heading order and
correct accessible names. Keyboard operation, visible focus, logical focus order,
status feedback and recoverable errors are part of the task. Avoid ARIA where native
HTML already supplies the correct behaviour; test custom widgets against the
[WAI-ARIA APG patterns](https://www.w3.org/WAI/ARIA/apg/patterns/).

Apply [WCAG 2.2](https://www.w3.org/TR/WCAG22/) criteria in their actual scope.
For common Level AA web text contrast, normal text uses 4.5:1 and qualifying large
text 3:1; exceptions and the definition of large text matter. Relevant non-text
controls/graphics have separate contrast requirements. Color cannot be the only
signal. Targets, reflow, zoom and focus criteria have distinct exceptions and levels;
read the applicable criterion rather than copying one number everywhere.

Provide reduced-motion behaviour without hiding required information. Images need
purpose-appropriate alternative text; decorative images should not add noise.
Check real keyboard and focus paths and representative assistive technology when
available. An automated scan, pairwise color measurement or screenshot cannot
establish full conformance. Report exact checked criteria, environments and limits.

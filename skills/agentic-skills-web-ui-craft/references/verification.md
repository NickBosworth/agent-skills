# Verification and evidence

Use four passes: task/truth, composition/identity, behaviour/inclusion and
resilience/implementation. Each finding needs a route/state, observable evidence,
user consequence, severity, repair and verification step. A preference without a
contextual consequence is not automatically a defect.

Run inspected build/type/lint and relevant tests, then exercise the main task and
an important failure/recovery path in an authorized environment. Check appropriate
viewports, zoom, realistic content, keyboard/focus, runtime errors and relevant
accessibility. Use stable fixtures and explicitly declared screenshot conditions.

Actually inspect screenshots when vision is available. Otherwise report visual
review as pending. Do not replace baseline images or accepted tests simply because
a change produced a diff. Laboratory measurements, simulated inputs and emulated
devices have boundaries; record them rather than claiming universal compatibility.

Stop when agreed acceptance is met and no required blocker remains. Report remaining
findings and unavailable checks. No bundled probe/scoring tool exists in this package;
use the project's established tools. Packaging validation is not UI validation.

# Testing, safe refactoring and final review

DNC-TEST-001, DNC-VERIFY-001; sources S10, S34–S35, S43, S52.

Use the actual repository framework/runner, not a favorite replacement.
Tests SHOULD show meaningful scenario and observable outcome with understandable
arrangement/action/assertions. Related assertions can establish one outcome.
No arbitrary one-assertion or 100%-coverage rule. Helpers remove distracting setup,
not crucial data or intent. Avoid sleeps, real clocks, uncontrolled randomness,
production networks and shared mutable state; use deterministic fixtures and
appropriate integration tests. Existing clocks/TimeProvider and an installed
FakeTimeProvider may serve time contracts without a custom clock framework.

Before consequential refactoring MUST inspect callers, characterization tests,
invariants, external APIs/serialization, persistence and performance requirements.
MUST preserve evaluation order, equality, allocation-sensitive constraints,
laziness, exception types/timing, cancellation, transaction/stream ownership,
routes/JSON and external side effects unless authorized behavior changes require
otherwise. Do not edit expected assertions to fit a regression. A legitimate
expectation change traces to a changed requirement.

## Human readability review

MUST review changed meaningful symbols:
- What does the operation do, and why does it exist?
- Is the business rule visible along the normal path?
- What changes, fails or cancels, and who owns resources/state?
- Can a maintainer understand critical types in a plain diff?
- Is a simpler equally correct version available without weakening constraints?

Names, guards, abstraction levels, real boundaries and coherent member/file
ownership are the checks. Arbitrary lengths/metrics are only review triggers.
Leave clear code unchanged, including a long coherent operation or justified loop.

## Comments and XML review

MUST inspect nearby comments and changed contracts:
- Significant non-obvious invariants explained; no tautology or fabricated history.
- Effective external/shared internal API coverage; no noisy private/test boilerplate.
- Exact param/typeparam names; eventual returns/absence/ownership stated correctly.
- Nullability, exceptions, commit/cancellation and observable implementation agree.
- XML/cref compile; actual packaged/rendered inheritance/links checked when required.

## Final diff and evidence

MUST inspect complete in-scope diff for unintended formatting, public breaks,
generated/vendor changes, test weakening, exclusions/suppressions, secrets and
unrelated configuration/dependencies. Correct findings and rerun affected checks.

Report each required check with name, scope, exact command, selected versions,
result and local evidence location. PASS means executed success; FAIL means
observed failure; BLOCKED/NOT RUN means unavailable/unexecuted; NOT APPLICABLE
needs a scope rationale. State uncovered frameworks/configurations and accepted
baseline findings. Zero expected tests is not PASS. Never claim human approval
from agent review or semantic correctness from regex/CS1591/formatter success.

Use the [compact completion template](../assets/completion-report.md) when useful.
Keep each required gate even when blocked or unrun, separate completed scope from
uncovered targets, and give the next corrective prerequisite. The verifier's
reason_code identifies the blocked category without exposing exception text.

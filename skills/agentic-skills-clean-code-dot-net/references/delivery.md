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

For rename/move/extraction work, use [binding-aware refactoring](refactoring.md).

## Demonstrate test value proportionately

For a consequential fix, map the approved requirement to the production entry
point, concrete input and distinguishing assertion. Derive expected behavior from
the requirement or supported protocol, not the implementation under test.
Record the tested revision; for uncommitted work use base revision plus a patch
identity covering relevant untracked files. Relevant changes invalidate old evidence.

In an owned isolated workspace, retain the regression test and restore the actual
old defect: observe its intended assertion fail, restore the correction, rebuild
and observe the same test pass. For a feature, use a buildable missing/wrong-behavior
variant rather than a missing-symbol compilation failure. Infrastructure failure
does not prove detection. Do not weaken assertions or deliver the defective variant.
Use separate or freshly rebuilt outputs; confirm the named tests actually execute.
Existing tests count when they distinguish the relevant wrong behavior.

Behavior-preserving refactoring tests should pass on both variants. Documentation
without an executable-contract change can be NOT APPLICABLE with a reason.
Keep this bounded to changed consequential contracts; no mandatory full mutation
campaign or redundant tests for trivial changes. Advisory/read-only conclusions
remain static unless execution is authorized. Unavailable paired evidence is
unverified, not proof of a product defect. See the comparative
[test-value workflow](https://github.com/dotnet/skills/blob/main/plugins/dotnet-test/skills/test-value-evidence/SKILL.md).

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

For packaged libraries and promised trimming/AOT deployments, load
[library delivery](packaging.md). Include applicable package/API comparison and
published-artifact smoke gates in completion evidence; a build-only PASS does not
cover those obligations.

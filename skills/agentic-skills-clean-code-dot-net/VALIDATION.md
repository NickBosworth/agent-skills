# Validation and limits

Current method-body review follow-up: see the **1.3.3** checkpoint at the end. Earlier
VSTest-only and no-model-comparison statements describe their historical scope.

Initial 1.0.0 research and execution checkpoint: 2026-10-13, macOS arm64.
Initial result counts below are historical; versioned follow-ups appear at the end.
Source access dates are recorded in [SOURCES](SOURCES.md), not claimed publication
dates. This file distinguishes execution from defined evaluation scenarios.

## Toolchain observed

- Python 3.12.11; pinned PyYAML 6.0.3 and skills-ref 0.1.1.
- .NET SDK 10.0.400; target net10.0, default C#14.
- Compiler 5.9.0-1.26379.115 (14fbf8d5271c98133561eb55185fdb05b286f578).
- MSBuild 18.9.6+14fbf8d52.
- SDK NetAnalyzers assembly 10.0.400.0.
- dotnet format 10.0.400-servicing.26379.115+14fbf8d5271c98133561eb55185fdb05b286f578.
- Gitleaks 8.30.1 is available for the independent privacy checks.

The fixture pins that SDK with prereleases disabled and roll-forward disabled.
This is a fixture selection, not a recommended permanent consumer security-update
policy. No StyleCop, CSharpier or DocFX version was executed.

## Executable checks

Run the Python helper suite with:
python -m unittest discover -s tests -p 'test_*.py' -v

Select the real SDK suite explicitly:
DNC_DOTNET_TESTS=1 python -m unittest discover -s tests -p 'test_*.py' -v

The SDK suite copies good source to a disposable directory. It verifies the profile,
fresh compilation/XML output, formatter idempotence, 15 observable behavioral
assertions and injected diagnostic failures followed by successful repairs.
The source-read-only verifier is executed on that disposable good fixture.
The selected diagnostic cases cover CS1591, CS1570, CS1574, CS1572, IDE1006
(including static/constant overlap), IDE0005, IDE0011, IDE0008, IDE0161,
CA2016, CA1849, CA2012, CA1851, contextual CA2007, CA2254, CA2200 and CA2000.
Whitespace injection separately demonstrates a failing formatting check.

Helper tests cover inventory, path containment, argument-array invocation,
configuration matching, missing SDK, timeout, restore/format failure propagation,
explicit test scope/exemption, parsed TRX counts, exit-zero-without-results,
nested SDK boundary rejection and preservation of existing report/log files.
TRX parsing has synthetic edge cases and a real two-framework xUnit/VSTest fixture.
The service/async-stream behavioral fixture uses a dependency-free console
self-check. The runner fixture has three pinned optional test dependencies;
skill-only checks do not require .NET or package restore. No real MTP runner is
claimed supported. See the 1.1.0 checkpoint for executed runner scope.

## Observed enforcement limits

Build-time IDE0005 requires XML generation in this tested SDK. The self-check
project enables XML output explicitly; it does not weaken production warnings.
The compiler output retains inheritdoc; no expanded/rendered API site is claimed.
CA2000 did not flag either local MemoryStream allocation or an owned FileStream
probe in the tested conditions. A CancellationTokenSource leak emitted CA2000.
Ownership review therefore remains mandatory. A configured ID is not proof that
every violation will be detected.

No arbitrary 120-column wrapping is asserted. Readability, naming meaning,
documentation truth, compatibility, cancellation consistency and framework
ownership require semantic review. Broad suppression was not used to obtain pass.

## Not established by this checkpoint

At the initial checkpoint, 42 agent scenarios were defined, not executed. No host/model benchmark, native host
discovery, human approval, rendered docs, Linux/Windows execution, older/multi-target
compatibility, real EF/ASP.NET/database/HTTP integration or performance benchmark
was executed. CI is configured but a GitHub run requires subsequent publication.
Compiler/formatter/helper success cannot establish guaranteed obedience or security.

No unrelated repository adoption, global skill installation, commit, push,
release publication or branch-protection change is part of this task.

## Final observed results

- DNC_DOTNET_TESTS=1 .venv/bin/python tools/run_checks.py: PASS. Ten official
  package validators and 254 regression tests, including 20 new helper/SDK tests,
  with no skips in the selected SDK suite. The fixture includes 20 diagnostic
  injection/repair cases and nine behavioral assertions.
- The skill-creator quick validator and official skills-ref validator: PASS.
- tools/check_library.py: PASS for candidate structure/privacy and local links.
- --staged: PASS against the unchanged real index. New files were not staged;
  they were checked as candidates, not falsely claimed as index contents.
- --history and redacted Gitleaks history scan: PASS for existing reachable history.
- Redacted Gitleaks directory scan of this package and git diff --check: PASS.
- tools/release.py with temporary output outside the checkout: PASS for CRC,
  SHA-256 inventory and fresh extraction; the temporary archive was removed.
- Manual semantic/contradiction/enforcement review completed by the implementing
  agent: mandatory rules map to execution, named review or permission boundaries.
  No assertion weakening, broad suppression, new dependency or binary asset was used.

These results do not renew historical product/browser checks. No executable-product
files changed, and its runtime tests were not rerun. Raw build logs and machine paths
are not retained in public evidence.

## 1.0.1 verifier corrections — 2026-10-13

The review's configuration mismatch and unsuccessful-summary acceptance are fixed.
Each command receives the selected Configuration environment property; reports
record that configuration. The real SDK regression confirms that a conditional
Release-only formatting violation fails in Release, is outside Debug's evaluated
scope, and passes in Release after repair.

TRX parsing now requires a completed/passed summary and consistent nonnegative
total/executed/passed/failed counts. Nonzero failure, abort, pending and other
unsuccessful counters are rejected. Mixed skipped/passing results remain accepted;
VSTest's total-versus-notExecuted distinction is covered by synthetic fixtures.
A zero-exit runner with a Failed summary now yields FAIL.

Executed with the same Python 3.12.11 and SDK 10.0.400 toolchain:
- DNC_DOTNET_TESTS=1 .venv/bin/python tools/run_checks.py: PASS, all ten official
  validators and 257 regression tests (234 existing plus 23 in this package).
- The package suite separately passed all 23 tests with SDK checks selected.
- Creator validation, candidate/staged/history privacy, redacted Gitleaks
  history/package-directory scans and whitespace checks passed. The real index
  was unchanged; edits were covered by candidate checks.
- Manual caller/diff review covered both build-target and explicit-test-project paths.
- Two additional behavioral scenarios bring the current catalogue to 44 defined,
  unexecuted cases. No host/model run is implied.

Real VSTest adapter execution, per-framework coverage verification, decoding-failure
handling and public-safe assertion output remain follow-up recommendations.
No unrelated product checks, commit, push or publication were performed.

## 1.1.0 robustness follow-up — 2026-10-13

Completed recommendations 3–8 from the review. Test scope is evaluated from each
explicit project's imported TargetFramework/TargetFrameworks properties in the
selected configuration. Every framework gets its own test command and temporary
TRX directory; empty sibling frameworks cannot borrow passing evidence.

Executed on macOS arm64 with Python 3.12.11 and SDK 10.0.400:
- All ten official validators and 264 library regressions passed with
  DNC_DOTNET_TESTS=1 (234 existing plus 30 in this package), no package skips.
- Actual xUnit/VSTest execution passed on net8.0 and net10.0 using
  Microsoft.NET.Test.Sdk 17.14.0, xUnit 2.9.3 and adapter 3.1.5. Local installed
  runtimes were Microsoft.NETCore.App 8.0.21 and 10.0.11. Failing, skipped-only,
  empty and net10.0-only empty cases produced FAIL; repaired cases produced PASS.
  Skipped/empty runs exited zero, demonstrating the evidence gate separately
  from command failure. CI now installs both pinned SDKs for these runtimes.
- The service self-check passed 15 assertions, including six async-stream checks:
  deferred null validation, borrowed identity/order, token forwarding and source
  completion disposal, early-exit disposal, combined cancellation before yield,
  and upstream failure/disposal. No sleeps or external service were used.
- Mocked and real invalid UTF-8 output returned structured BLOCKED results.
  Missing-diagnostic assertion regression withholds synthetic raw-output markers.
- Three independent agent trials executed in isolated temporary workspaces;
  their patches, scope and evidence were reviewed and all 15 behavioral assertions
  were rerun per trial. See [input recipes](evals/trials.json) and
  [reviewed results](evals/results.md). These are separate from the still-unexecuted
  44-scenario catalogue; exact model/settings were unavailable.
- Creator, candidate/staged/history privacy, redacted Gitleaks, whitespace and
  temporary archive CRC/SHA-256/fresh-extraction checks passed. The real index remained unchanged;
  new edits were checked as candidates. No new binary asset was added.

The test dependencies are confined to the optional runner fixture; ordinary
skill-only maintenance remains Python-only. Older SDKs, alternative adapters/MTP,
Linux/Windows, remote CI, native discovery, rendered docs, broad agent reliability
and real production integrations remain unverified. Executable-product tests
were not rerun. No commit, push, global installation or publication occurred.

Remaining recommendations: distinguish blocked causes (11), provide a compact
completion template (12), add direct per-rule primary-source links (10), then
prune ignored discovery subtrees (9). None is required to claim broader support.

## 1.1.1 remaining review items — 2026-10-13

Completed recommendations 9–12. Discovery uses top-down traversal to prune ignored
subtrees before reading them and fails closed on included-directory read errors.
Blocked command, option, inventory, framework and output causes now have safe
reason codes and corrective explanations; existing evidence is preserved.
All 27 rules link their Evidence IDs directly to registered primary sources.
The compact completion template is routed from SKILL.md and delivery guidance.

Executed on the same macOS arm64/Python 3.12.11/SDK 10.0.400 toolchain:
- DNC_DOTNET_TESTS=1 .venv/bin/python tools/run_checks.py: PASS, all ten official
  validators and 270 regressions (234 existing plus 36 package tests).
- Six new regressions exercise pre-descent pruning, inventory read failure,
  distinct private command blockers, log write/directory errors and safe invalid
  target reporting. Existing log/report preservation checks assert reason codes.
- The focused 26-test helper suite passed again after the final safe option-error
  handling change. The full suite retained real two-framework VSTest and all
  15 service/async-stream assertions; no selected package test was skipped.
- Creator, candidate/staged/history privacy and redacted Gitleaks checks passed;
  the real index remained unchanged and candidate checks cover the new work.
- Temporary archive CRC, SHA-256 inventory and fresh-extraction checks passed.
- Manual review covered callers, helper branches, template status semantics,
  direct source mappings and the complete in-scope diff. No warning or assertion
  was weakened, no new dependency was added and no binary asset was introduced.
- Two positive/negative report scenarios bring the catalogue to 46 defined,
  unexecuted cases. The three earlier isolated trials were not rerun or expanded.

All twelve recommendations from the original review are addressed. No additional
mandatory implementation item was identified within this review's scope.
The next useful work is an optional pilot in a real consuming .NET repository
using its existing SDK, formatter and gates, then targeted trials for any observed
failure. Do not add broad compatibility claims based on this local checkpoint.
Remote CI, other operating systems, alternate runners/formatters, rendered docs,
native discovery and broad agent reliability remain unverified. No product runtime
checks, global installation, commit, push or publication were performed.

## 1.2.0 conditional coverage extensions — 2026-10-13

Added everyday security, package compatibility, concrete cache/concurrency and
trimming/Native AOT guidance, with conditional loading. Four new traceable rules
bring the catalogue to 31; eight added behavioral definitions bring it to 54.
The default production profile, SDK selection and verifier command scope are unchanged.

Executed with the same macOS arm64/Python 3.12.11/SDK 10.0.400 toolchain:
- All ten official validators and 271 library regressions passed with SDK checks
  selected (234 existing plus 37 in this package), no package skips.
- The existing injection/repair harness passed 21 cases, including CA5359 for an
  always-true certificate callback under a narrow fixture-only severity. The
  insecure callback was compiled but never executed against a network.
- SelfCheck passed 19 assertions. Four added checks force competing dictionary
  factories with dedicated workers and a bounded barrier, verify retained identity,
  and verify one initialization through retained Lazy wrappers. No sleep is used.
- A local SDK package check inspected DLL/XML assets and ran a consumer restored
  from an isolated local feed. Making Find internal failed baseline validation
  with CP0002; restoring the public method passed. The temporary baseline path
  avoided baseline downloads and publication. This is one representative case,
  not a complete package/source/binary/behavioral compatibility certification.
- One independent review-only trial exercised security and factory repetition with
  offline synthetic probes. All source/policy bytes stayed unchanged. The evaluator's
  overconfident interpretation of cache recording cardinality led to a narrow
  guidance clarification; a second model trial has not been run. See trial results.
- Creator, candidate/staged/history privacy, redacted Gitleaks, whitespace and
  temporary archive CRC/SHA-256/fresh-extraction checks passed. The index was
  unchanged; new work was checked as candidates.

Native AOT/trim analyzer or published-artifact smoke tests were not executed.
Conditional guidance describes required evidence for consumers that promise those
modes; it does not claim this package's fixtures support them. No additional runtime
or development dependency was introduced. No product runtime tests, global install,
commit, push or publication occurred. All original review items remain addressed.

Outstanding recommendations are validation: a real consuming-repository pilot;
actual trimmed/Native AOT smoke coverage before claiming those modes; and targeted
agent trials for package/deployment decisions and the cache-contract clarification.
Other hosts, alternate runners/formatters and broader model reliability remain
unverified. No additional mandatory implementation gap was identified in this pass.

## 1.3.0 comparative research implementation — 2026-10-13

All seven research recommendations are implemented: conditional semantic
refactoring, revision-bound regression proof, test-platform selection and native
MTP execution, Options lifetimes/validation, nullable helper contracts, performance
measurement guidance and controlled paired agent evaluations.

Executed on macOS arm64, Python 3.12.11 and SDK 10.0.400:
- All ten official validators and **285 regressions** passed with
  DNC_DOTNET_TESTS=1: 234 existing library tests and 51 package tests, no package skips.
- The new contract fixture passed **14 checks** covering nullable runtime truth,
  provider-driven Options changes, stable cached/scope values, new-scope freshness,
  subscription disposal, invalid/cross-property startup validation and deliberately
  deferred validation, plus default-only validator name selection.
  Removing NotNullWhen/NotNullIfNotNull/MemberNotNull caused
  the expected CS8602/CS8618 failures; each repaired build passed.
- Refactoring preservation passed Debug/Release with partial/generated-input,
  unrelated binding and reflection-name checks. Wrong boundary, unrelated result
  and external visibility variants failed unchanged assertions and passed after
  repair. Generator output was checked from its owning input.
- Native MTP **2.0.2**, MSTest **4.0.2** and TRX extension **2.0.2** passed actual
  success/failure/skipped-only/empty/repair cases. Skipped-only native execution
  returned exit 8; VSTest's existing exit-zero empty-evidence checks remain intact.
  Native command selection, per-framework executable properties and mismatches
  have focused regressions. Bridge, other frameworks and other SDKs are not established.
- The evaluation harness has integrity regressions for unchanged matched inputs,
  package placement/preservation, source identities, missing/invalid usage,
  visible-read classification, stopped/failed execution, private timeout evidence
  and independent old/corrected/strengthened-test oracles.
- **Twenty accepted paired model runs** completed, with all twenty independent functional
  outcomes passing after corrected oracle review. Both arms tied on the selected
  tasks; all four controlled selection observations were correct. No-op source
  remained unchanged. Model, settings, timings, token counts, artifact identities,
  excluded preparatory attempts and grader correction are recorded in
  [comparison evidence](evals/comparison.md). No general superiority is claimed.
  Final audit excluded a pilot with maintenance graders accessible, despite no
  observed use. Fresh sampling withheld those resources, verified unchanged views
  and matched inputs, and reproduced the twenty passes. The stricter successful
  content-read parser was applied to all saved trajectories.

The package retains 31 rules and has **68 defined, unexecuted broader scenarios**,
separate from four earlier isolated trials and the new controlled comparisons.
Performance guidance does not claim an application benchmark result or introduce
mandatory dependencies. Native AOT/trim publishing, rendered docs, other hosts,
remote CI, native discovery and production integration remain outside executed scope.
The test/instruction snapshots and timing limitations are explicit; final parser/
reporting refinements and one named-Options fixture assertion are not silently
attributed to an earlier snapshot.

Creator validation, candidate and actual-index privacy, reachable-history privacy,
redacted Gitleaks history/package scans, whitespace review and temporary archive
CRC/extraction validation passed in their recorded scopes. No files were staged;
index checks cover the real index, while changed/new files are candidate checks.
The implementing agent reviewed the source/diff and public numeric summaries; raw
model/SDK logs remain outside the checkout. No new tracked binary, product check,
global install, commit, push or publication occurred.

## 1.3.1 semantic contract XML gate — 2026-10-14

The existing mandatory XML policy is now tied to an explicit pre-completion
inventory and semantic review of changed production contracts, including interfaces
and DTO constructors/properties. Clear names and minimal-change guidance cannot
waive caller obligations. Compiler/generator results and semantic review are
separately reported; no word/tag quotas or new dependencies were introduced.

Executed on macOS arm64, Python 3.12.11 and SDK 10.0.400:
- The complete package suite passed **53 tests** with DNC_DOTNET_TESTS=1 selected,
  no skips. After the final weak-example wording refinement, the two focused
  documentation tests passed again; guidance/report refinements were reviewed.
- Both bulk XML variants compiled under warnings-as-errors, passed formatting
  verification and the same **16 runtime contract checks**, and emitted the same
  public XML member inventory with retained inheritdoc. Removing interface XML
  failed with CS1591. Reversed output order and thrown validation errors compiled
  but failed their expected unchanged runtime assertions; repaired runs passed.
  An initially symmetric ordering input was strengthened so reversal is detectable.
- The implementing agent reviewed the complete variant's interface/method, two
  DTO constructors and four properties against code/tests. Superficial XML was
  assessed as inadequate despite compiling. Private/test helpers need no narration.
  These are semantic review findings, not an automated English-quality oracle.
- Creator and official skills-ref validation passed; **27 library-tool regression
  tests** passed. Scoped package structure, all candidate-file privacy, actual-index
  privacy, reachable-history privacy, redacted Gitleaks history/package scans and
  whitespace review passed. The index was unchanged, so new work was checked as
  candidates rather than falsely attributed to the staged scan.
- Full check_library.py and run_checks.py were attempted and **BLOCKED** by the
  pre-existing catalogue entry for the removed Professional Code Comments package.
  Root reference review also found its stale README link. No rule, expected result
  or exclusion was changed to obtain a false full-library PASS. Release validation
  was not run because the same catalogue prerequisite is unmet.

Eight added behavioral definitions bring the catalogue to **76 unexecuted
scenarios**. Earlier executed agent comparisons remain historical; no new model
trial, native discovery, doc-generator rendering or broad reliability evidence is
claimed. This change was reviewed through its final diff; raw SDK diagnostics stay
outside the checkout. No consuming application, product runtime, global installation,
commit, push or publication was changed. The library inconsistency needs separate
reconciliation before its full gate can pass.

## 1.3.2 retired comments-package references — 2026-10-14

Removed the comparison to the retired comments skill; .NET guidance remains
self-contained. The surrounding library catalogue and active routes now match its
nine existing packages, resolving the previous full-library blocker. Migration
retains a retired-name redirect for C#/.NET, with other-language policies preserved.

Nine official package validators and 275 library/package tests passed with SDK
checks selected, including all 53 .NET tests. Creator, candidate/index/history
privacy, redacted Gitleaks through the actual pre-push hook, whitespace and temporary
archive CRC/SHA-256/fresh-extraction checks passed. Historical evidence is unchanged.
No helper or executable contract changed; the 76 broader scenarios remain
unexecuted, and no model, product runtime or documentation-generator run is implied.
No files were staged, committed or pushed; no global installation was changed.

## 1.3.3 method-body explanation review — 2026-10-18

The existing non-obvious-comment policy now has an explicit pre-completion review
of new and meaningfully changed method bodies, including private methods, for
missing explanations. Useful collective block purpose is included alongside
constraints that a plausible future edit could break. Guidance covers placement,
evidence, lifecycle, minimal-change interactions and clear code needing no comments.
The existing review field reports material omissions without a per-method ledger.

Executed on macOS arm64, Python 3.12.11 and SDK 10.0.400:
- DNC_DOTNET_TESTS=1 python tools/run_checks.py passed all nine official package
  validators and 275 tests, including the 53 .NET package tests, without package skips.
  No helper or test assertion was changed or added for a prose-only requirement.
- Both changed C# files match the base executable source after ordinary own-line
  comments are removed. The receipt fixture now explains validation timing and
  stream/commit boundaries; the bulk reader explains order and repeated matches.
  Existing lifetime, cancellation, ordering and failure assertions still pass.
- Separate disposable copies with those implementation comments removed passed
  19 receipt/self-check assertions and 16 bulk-read contract checks. This is actual
  evidence that comment omission can escape compiler/runtime gates; semantic
  comment quality and agent adherence are not established by these executions.
- The implementing agent reviewed comment truth against implementation/tests,
  matching before/after examples, necessary test-setup rationale, unchanged clear
  helpers, completion routing and the final diff. Unknown history is not invented.

Eight added definitions bring the catalogue to **84 unexecuted broader scenarios**.
They cover absent ordering rationale, block purpose, private lifetime, coordination,
Ponytail, restraint, unverified intent and stale comments. No new model trial or
renewal of historical comparison evidence is claimed. Review-only and scoped-edit
boundaries remain intact; no new dependency, helper, quota or analyzer is introduced.

Creator validation, candidate/index/history privacy, redacted Gitleaks history/package
scans, whitespace review and temporary archive CRC/SHA-256/fresh-extraction checks
passed in their stated scopes. The actual pre-push hook passed without a push.
The index was unchanged; new work was checked as candidates. Raw diagnostics remain
outside the checkout. No product runtime, consuming repository, global installation,
commit, push or publication was changed.

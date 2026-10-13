# Validation and limits

Local research and execution checkpoint: 2026-10-13, macOS arm64.
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
fresh compilation/XML output, formatter idempotence, nine observable behavioral
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
TRX parsing is tested with synthetic evidence; a real VSTest adapter/framework
package was not installed or executed. The behavioral fixture uses a dependency-free
console self-check instead. No real MTP runner is claimed supported.

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

42 agent scenarios are defined, not executed. No host/model benchmark, native host
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

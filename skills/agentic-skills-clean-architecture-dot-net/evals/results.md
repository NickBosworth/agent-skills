# Executed architecture trials — 2026-10-21

These are bounded synthetic observations, reviewed by the primary agent. They are
not human approval, production validation, native discovery or a reliability study.
The [recipes](trials.json) and [comparison data](comparison.json) are separate from
the 44 broader scenario definitions, which remain unexecuted as a catalogue.

## Exposure and identities

Trials used disposable projects outside source. Evaluated agents received raw task
files and an allowlisted operational view; graders, scenario expectations, historical
validation and results stayed outside permitted reads. Operational worked examples
were available, so these are near-transfer tasks rather than proof of unseen-domain
performance. The shipped package remains complete.

The current operational identity is
`6155ec43de8adfe429b7c914eda9c4ae870b7324201d200596cdd400012373b8`.
It matches the frozen view used for both controlled skilled runs. Earlier pilots,
the lifecycle and non-web trials used
`b3f102b14cfcd1fd20c9d2fef6603ac7dfcb405aa49da98cadb82a78e3a82804`.
The only operational difference is the organization example's clarification that a
same-assembly policy can remain internal. Lifecycle, audit, rule and pattern
instructions are identical between these views. Each supplied view remained unchanged.

The preparation helper records raw-file hashes, prompt hashes are recorded separately,
and comparison data contains exact raw/operational identities. Private evidence
contains prompts, output, source snapshots, commands, independent checks and timing.
No raw transcript, local host configuration, generated patch or database is shipped.

## Reviewed outcomes

| Workflow | Actual observation and independent evidence |
| --- | --- |
| Decision lifecycle | Four real sequential agent turns with three evaluator-supplied synthetic answers. Initial ownership discussion and later deployment discussion preserved all file hashes. Saving ownership changed only AGENTS.md, README and ADR-002; source and ADR-001 stayed unchanged. Later acceptance created ADR-003, preserved ADR-001's rationale, linked supersession in both directions and updated the active route. Billing ownership and the public format remained accepted; protocol/storage remained deferred and implementation/checks inactive. |
| Ownership refactor | Both controlled arms completed API/worker/composition changes with one Capacity-owned comparison. Independent copies restored the original 102 assertions and passed Debug and Release. A buildable wrong boundary (`>` in place of `>=`) failed the original assertion, then repair passed. Billing/Audit and project/configuration bytes were unchanged; debt records matched inspected caller routing. |
| Dependency enforcement | Both controlled arms passed independent checks for normal composition and an unrelated same-named type. Five compile-valid violations failed: Domain public signature, nested generic Provider type, Provider alias, aliased Host construction and nested-type composition bypass. Every repair passed. A separately compiled, unchanged semantic loader confirmed probe validity; invalid source stayed a compilation failure. Original policy, fixture sources and loader bytes were preserved. |
| Public library audit | Identified the borrowed-stream ownership violation from StreamReader disposal and the recorded contract. Proposed preserving the public API; no invented persistence/layer requirement or unnecessary decision question. Independent hashes confirmed no changes. No build/runtime execution was claimed by this source-review trial. |
| Legacy desktop audit | Identified direct WPF control mutation from Task.Run against the UI-thread rule. Kept .NET Framework 4.8, disclosed the unavailable Windows runtime/build coverage and separated possible view coupling from an unproven lifetime leak. Independent hashes confirmed no changes. |

The lifecycle used an independent fresh-context subagent and actual follow-up
messages. Its interface did not expose exact model/settings or a complete command
trace. The primary reviewer inspected all resulting documents, relative links,
source hashes, debt statements and historical rationale. The non-web cases used
CLI explicit-path invocation; default model/settings were not fixed or exposed,
so they are qualitative observations, not part of the controlled comparison.

## Controlled comparison

CLI **0.163.0-alpha.10.2**, model **gpt-6.1-sol**, reasoning **medium**, macOS arm64,
SDK **10.0.400**. These model settings match the host's configured default and were
pinned equally. Both arms used the same raw input bytes, tasks, permissions and
tools; only the skilled arm received the operational view and loading instruction.
User configuration, automatic project-document loading, host skill discovery,
skill search, apps and web search were disabled for these invocations. The prompt
required reading each fixture's AGENTS.md explicitly.

| Task | Arm | Independent result | Wall seconds | Input tokens | Cached input tokens | Output tokens |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| Refactor | Skill | Pass | 52.653 | 157646 | 131840 | 2080 |
| Refactor | Baseline | Pass | 55.043 | 138279 | 115584 | 2243 |
| Guard | Skill | Pass | 143.687 | 196384 | 172416 | 5800 |
| Guard | Baseline | Pass | 171.813 | 243295 | 209152 | 6316 |

Both arms tied on the reviewed correctness criteria. One run per arm/task cannot
establish superiority, savings or reliability. Wall time includes local tools and
startup; concurrent execution and cache state confound timing. Reported input tokens
are cumulative and include cached input; these columns must not be added together
as separate costs. No monetary estimate is inferred. Visible command review found
no grader/result reads; this is access evidence, not filesystem containment proof.
The experimental host-discovery switch emitted an instability warning, retained in
private evidence rather than suppressed.

## Pilots and grader correction

Four earlier CLI runs covered both refactor and guard arms. Their default model and
reasoning settings were not fixed/exposed, so all four are excluded from comparison.
Their outputs also passed reviewed scoped checks; they do not enlarge the controlled
sample. They remain private evidence rather than silently discarded attempts.

An initial independent guard grader assumed a specific punctuation mark in a status
message and incorrectly rejected valid outputs. The revised grader independently
compiled each probe through the unchanged semantic loader before checking the rule
failure and repair. Original grading output is retained; no model fix or weakened
architectural expectation was needed. Model-authored self-check counts were not
substituted for the primary reviewer's independently executed probes.
The compiler fixture uses the compilation/symbol distinction described in Microsoft's
[semantic analysis documentation](https://learn.microsoft.com/en-us/dotnet/csharp/roslyn-sdk/get-started/semantic-analysis).

## Technical counterexample and limits

A separate deterministic SQLite **3.53.4** experiment executed read/read/insert/commit/
insert/commit. Both readers observed zero bookings; two distinct versioned rows then
committed against a one-place limit. Conditional decrements of one authoritative
capacity row instead affected one row and then zero. This demonstrates the distinction
between atomic statements and the business invariant for that schedule. It is not
an EF Core execution, production-provider test or general concurrency guarantee.

No production refactor, distributed delivery, EF provider concurrency, Windows WPF
runtime, legacy build, host discovery or broad domain correctness was verified.
The generated guards cover the supplied semantic compilations; reflection, raw SQL,
dynamic behavior and other runtime paths require separate checks. No consumer CI
guard was installed merely by validating this skill.

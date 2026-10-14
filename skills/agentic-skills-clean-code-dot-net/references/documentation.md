# Comments and XML contracts

Every task loads comments guidance; contract/documentation tasks also apply all XML
sections. This package bundles accuracy-first comments and .NET contract guidance
independently. Sources: S05–S10, S50. Policies: DNC-DOC-001 through DNC-DOC-004.

## Implementation comments

MUST explain significant facts a maintainer cannot reasonably recover: business
invariants, ordering constraints, interoperability workarounds, concurrency
protocols, measured compromises, difficult algorithms and dangerous edge cases.
First improve names/structure; do not defend confusing code with paragraphs.
“What” is useful for difficult regex, math, binary or synchronization mechanisms.

SHOULD use nearby own-line // prose with one space, sentence capitalization and
punctuation. Preserve license headers, executable directives and meaningful block
conventions. No tautological narration, assistant chatter, promotional claims,
commented-out implementations, decorative banners or author/date diaries.
TODO/FIXME identifies a real actionable issue and only real required tracking
references. An unfinished requirement cannot be hidden behind TODO.

MUST NOT invent customer history, observed races, vendor behavior, measurements
or historical rationale. If history is unknown, state the verified constraint.
Investigate warnings before deleting them. Update nearby comments with code and
test critical invariants where testable. Comment count is never a quality gate.

Before: // Increment the counter. followed by completedCount++.
After: completedCount++; (no comment).
Before: cancellationToken.ThrowIfCancellationRequested(); after a successful write.
After: remove that post-commit check and explain the verified boundary:
“Do not observe caller cancellation after this write commits; success must stay success.”
This is correct only when the implementation/tests actually establish that boundary.

## Coverage

Implementation comments and contract XML serve different readers. Comments explain
significant non-obvious implementation facts; XML explains how callers use an API
correctly. Clear naming removes redundant narration, not caller obligations.
Concise means omitting repetition while retaining applicable contract facts.

MUST document effective externally visible production types and public/protected
contracts: constructors, methods, properties/indexers, events, enums and meaningful
values, delegates and extension points. A public member inside an internal type
is not automatically external. Significant internal abstractions/shared module
contracts and non-obvious caller contracts MUST have useful XML too.
Obvious private helpers/fields and locals need none. Public test methods normally
express intent through names/arrangement/assertions; production rules do not
require boilerplate there. Generated/vendor/framework exemptions require provenance
and narrow scope, not a production-solution CS1591 suppression.

## Content and structure

MUST align docs with implementation, nullability, tests and caller needs:

| Tag | Required meaning when applicable |
| --- | --- |
| summary | Specific purpose/operation in a complete sentence; not an expanded name |
| param / typeparam | Every applicable parameter/generic parameter, exact name, meaning/constraints/units/null/ownership |
| returns | Eventual Task/ValueTask result; task completion meaning; absence, order, snapshot/deferred behavior and ownership |
| value | Important property/indexer range, default, mutability, units or null semantics |
| remarks / para / list | Real side effects, commit/cancellation boundaries, threading, caching, idempotency or deferred behavior |
| exception cref | Caller-relevant type and triggering condition; distinguish synchronous validation, await and enumeration |
| see / seealso | Compiler-resolved types/members/overloads; langword for null/keywords |
| paramref / typeparamref | Exact symbol references rather than repeated prose names |
| c / example / code | Brief usable examples tied to compiling/executing fixtures |

Do not dump every transitive exception into XML or promise rollback/immediate
cancellation without an actual guarantee. Do not describe a Task as a synchronous
value. Summary-only coverage is not sufficient for a multi-parameter contract.
Namespace/module explanations belong in supported docs/README, not unsupported
namespace XML pretending to be compiler-emitted documentation.

XML requires escaping: &amp;, &lt;, &gt; and quoted attributes. code does not
disable parsing. CDATA may help where the consumer supports it; its closing
sequence cannot occur within content. Generic cref uses compiler syntax such as
IReadOnlyList{T}; do not invent member IDs. Malformed XML, unresolved cref and
mismatched tags need compiler checks; missing tags and false English need review
or a deliberately configured compatible analyzer.

## Inheritance and delivery

MUST keep one authoritative base/interface contract when shared. inheritdoc is
appropriate only with a useful target and matching semantics; implementation
remarks can add guarantees without contradicting it. Do not inherit synchronous
returns into an async contract with different failure/lifetime behavior.

Source XML, IDE tooltips, emitted compiler XML and rendered docs are different
artifacts. An IDE's inherited display does not prove expanded compiler output.
Compiler XML can retain inheritdoc; DocFX expansion/link/example rendering must
be verified with the selected generator/version (S09). Distributable libraries
must inspect their actual packaged XML, not merely a source build.
Small applications need no automatic documentation website.

The [good fixture](../examples/good/DocumentationExamples.cs) exercises generics,
nullable results, properties/indexers, constructors, enums, delegates/events,
interface inheritance, override, positional records, primary constructors and
async streams. The library fixture also exercises cancellation and stream ownership.
Compiler success establishes selected structural checks, not prose truth.

## Mandatory semantic contract review gate

Before completion, MUST inventory new and meaningfully changed production contracts
from the diff and affected declarations, including effective external APIs,
significant shared/internal contracts, interface members and DTO constructors and
properties. Classify applicable coverage and justified exemptions; do not expand
an incremental task into unrelated API cleanup. Review each covered contract's XML
against its implementation, actual callers and relevant tests. Follow an authoritative
interface/base contract when inheritance is appropriate; review that target too.

Check these dimensions where applicable, rather than requiring every tag on every symbol:

| Caller question | Review obligation |
| --- | --- |
| Why and when do I use this? | Purpose and intended use, beyond expanding the symbol name |
| What do I supply? | Input meaning, units, accepted values, constraints and validation; required/optional, null and empty distinctions |
| What do I receive? | Success, absence and failure shapes; failure-as-data versus thrown exceptions; DTO constructor invariants and property meanings |
| Which results qualify, and in what sequence? | Ordering, filtering, duplicate handling, boundary inclusivity and date/time basis |
| What changes or stays mine? | Side effects, resource/data ownership, deferred versus snapshot results and transaction boundaries |
| Can I repeat or overlap calls? | Established idempotency and concurrency guarantees or caller restrictions |
| When does work finish or fail? | Eventual async result/completion, observed cancellation, synchronous versus awaited/enumeration exceptions |

MUST investigate consequential unknowns rather than infer guarantees from a method
name, token parameter, readonly property or green test. State only established
behavior; do not fabricate cancellation responsiveness, rollback, idempotency or
thread safety. Do not implement a new guarantee merely to make prose convenient.
Use useful params/returns/value/remarks/exception tags as needed, keeping shared
facts authoritative rather than duplicating an interface contract on implementations.

The gate fails when a caller-relevant obligation is missing or contradicted, even
if every symbol has XML and compiler checks pass. Correct in-scope omissions before
claiming completion. If evidence or authorized scope prevents correction, report
the affected contract/dimension and limitation: FAIL for known omissions, BLOCKED
for unavailable necessary evidence, or NOT RUN for an unperformed review; never PASS. A scope-based exemption can be NOT APPLICABLE.
Keep a compact review inventory in working notes; completion reports summarize
reviewed scope, material omissions and unverified guarantees, not every symbol.

[Bulk-read example](../examples/documentation/README.md) contrasts name-expansion
XML with complete caller contracts on the same executable API. Both variants
compile: compiler XML coverage/selected diagnostics and documentation-generator
output establish different facts from this semantic source-contract review.

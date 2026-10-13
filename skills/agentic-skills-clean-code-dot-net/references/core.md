# Core readability, organization and semantics

Read with the documentation and tooling guides for every C# task. Stable rule IDs
and enforcement obligations live in [rules](rules.md); source IDs resolve in
[the register](../SOURCES.md). These are original operational policies reconciled
with S01–S04, not a universal Microsoft mandate.

## Comprehension and names

MUST make the business rule and normal path visible (DNC-READ-001). Read a method
top to bottom at a consistent level of abstraction. Guard clauses SHOULD reduce
unnecessary nesting, but check short-circuit behavior, validation order, cleanup
and effects before moving conditions. Explain a domain concept with a local or
helper when it removes consequential duplication, separates a real phase or
exposes a useful boundary. Do not extract merely to meet a line limit.

Names SHOULD use consistent domain vocabulary across implementation, tests and
contracts: verbs for operations, nouns for data, collections named by contents.
Avoid unexplained abbreviations and competing vague names. Do not ban words
mechanically: result in a tiny method, a meaningful domain Manager or a short LINQ
parameter can be clear. Positive booleans such as canRetry clarify conditions;
named arguments can clarify a flag. A collection of flags obscuring the contract
may warrant a meaningful type or distinct operations.

Common naming conventions (S02) are PascalCase types/namespaces/members/constants,
camelCase parameters/locals, I-prefixed interfaces, descriptive TItem/TResult
parameters and Async suffixes. Framework contracts and compatibility are real
exceptions. Tests can retain descriptive underscore naming.

The original default profile uses _camelCase private instance fields and
s_camelCase private static fields, including static readonly fields. Constants
use PascalCase and override the static/field rules. Do not encode incidental
types in names. See the tested overlapping naming selectors in
[the profile](../assets/default.editorconfig).

## Organization and design

One principal production type per matching file SHOULD be the default.
Cohesive feature-local supporting types, vertical slices, generated partials and
interop contracts can justify exceptions. Namespaces reflect ownership/modules,
not every incidental directory. Prefer supported file-scoped namespaces when
consistent. Group state/construction, usable surface and supporting behavior;
keep related overloads together and respect analyzer-enforced ordering.

MUST preserve initialization/registration order where it can affect behavior.
Do not alphabetize fields or declarations blindly. Avoid regions as a disguise
for complexity; retain deliberate generated/interop navigation policy.
Shared code needs a stable purpose and owner; Helpers/Common/Utilities are not
owners. A second superficially similar call site does not justify extracting a
domain rule to a generic shared library.

SHOULD use explicit dependencies, encapsulated invariants, cohesive responsibilities
and the smallest public surface appropriate to the approved contract. SOLID/DRY
are reasoning aids. No mandatory Clean Architecture, DDD, CQRS, mediator,
repository pattern, layer count, interface per class, BCL wrapper or speculative
base class. Constructors should not unexpectedly do I/O or start background work.
Keep service resolution at composition boundaries, not hidden in business logic.

MUST preserve existing public compatibility unless a change is authorized.
Names (including parameters used by named callers), optional defaults, overloads,
JSON names, routes, events, nullable contracts, accessibility and extensibility
are part of that review (S43). Do not seal an extensible public class or delete a
public member merely because local references are absent. Check reflection,
serialization and framework discovery before removing apparently dead code.
Expensive I/O and side effects should be operations, not surprising properties.

## Syntax, state and collections

SHOULD prefer var for an immediately evident type (new/cast), explicit types for
obscure factories, numeric behavior, nullability and collection shape.
Do not combine var everywhere and explicit everywhere. Modern features are
options: target-typed new, collection expressions, patterns, primary constructors,
switch expressions and expression bodies must clarify rather than conceal.
Check overload resolution, allocation/collection semantics, capture and
initialization order. Use block bodies for phases or meaningful branching.
Reject dense nested ternaries, incidental expression mutation and convoluted
boolean/pattern expressions; parentheses can make mixed operators understandable.
Do not impose universal method lengths, complexity scores or coverage percentages.

MUST retain meaningful null/empty/absent states. Nullable analysis is compile-time,
not boundary validation (S21). New modern projects enable it; existing projects
retain their accepted migration plan. Resolve contracts with annotations, flow
and appropriate attributes/guards instead of !, null!, empty strings, zero or
empty GUIDs to quiet warnings. required does not validate external input.
A framework initialization seam or deliberate invalid-input test may justify a
local, documented exception. Trusted private helpers need no reflexive guards.
For conditional Try/output/initialization helpers, load the compact
[nullable contract decisions](configuration-nullability.md#nullable-helpers).

Records fit value-oriented data, not identity-based or EF-tracked entities.
Records/init/readonly/read-only interfaces do not guarantee deep immutability
(S22). Distinguish a snapshot from a live view. Use structs, tuples, enums and
value objects for actual semantics; do not wrap every primitive to demonstrate
a pattern. Reflection, dynamic, unsafe and source generation need a concrete
requirement plus tests/explanation of the non-obvious mechanism.

LINQ SHOULD express understandable queries/transforms; loops SHOULD express
clear state changes, early exits or branching. No side effects in Select.
MUST preserve lazy/eager execution, ordering, equality comparers and lifetime.
Avoid repeated enumeration of expensive/stateful sources; materialize when a
snapshot/reuse/lifetime boundary warrants its cost (S42). IQueryable translation
is not in-memory IEnumerable execution (see the framework guide).

MUST preserve representation contracts: parsing culture, encodings, decimal
precision, rounding, units and serialization are behavior, not style.
Use appropriate explicit string comparers: ordinal for many non-linguistic
identifiers, culture-sensitive rules for user language (S33); do not lower-case
arbitrary identifiers to simulate equality. TimeSpan represents durations;
DateTimeOffset is an instant/offset, not a named zone. Preserve local calendar
rules rather than turning every date into UTC. Use existing clocks or TimeProvider
where suitable (S35/S52), with deterministic tests. Optimize only against measured
requirements; never invent performance results.
Use the conditional [measurement workflow](performance.md) when measurement is needed.

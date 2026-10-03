# The quality standard

## Contents

- [The reader's task](#the-readers-task)
- [What and why](#what-and-why)
- [Choose the right granularity](#choose-the-right-granularity)
- [Write clear prose](#write-clear-prose)
- [Ground intent in evidence](#ground-intent-in-evidence)
- [Document contracts](#document-contracts)
- [Place and maintain comments](#place-and-maintain-comments)
- [Special situations](#special-situations)
- [Acceptance rubric](#acceptance-rubric)

## The reader's task

Write for a competent engineer who knows the language but does not know this system. The reader should be able to answer:

1. What responsibility does this unit have?
2. What are the important steps and outcomes?
3. Why are these steps, limits, and choices necessary?
4. What can a caller assume, and what must the caller do?
5. What would be easy to break when changing it?

Use these questions to assess understanding, not to force five headings into every comment. Comments are a small maintained explanation beside the relevant code. Put a large design discussion in the project's existing design documentation and link to it; retain the short reason beside the decision so an unavailable link does not erase the explanation.

This skill deliberately sets a more explanatory default than minimalist house styles: all meaningful sections need understandable behaviour and supported intent. Respect explicit user and project instructions, including where a project puts explanations. Do not add redundant prose simply to increase coverage statistics.

## What and why

**What** means the operation's purpose or effect in the problem domain. **Why** means the requirement, constraint, invariant, trade-off, or failure the operation addresses. **How** can explain an algorithm or representation where its mechanics are otherwise difficult to follow.

| Weak wording | Stronger wording, when evidence supports it |
| --- | --- |
| Loop over accounts. | Apply each account's pending entries in order so later entries see the updated balance. |
| Check for null. | Return no result when the customer has been removed, because old events can still refer to that customer. |
| Wait for the lock. | Hold the lock across the lookup and insert so two callers cannot create the same entry. |
| Divide by 1000. | Convert milliseconds to seconds before passing the timeout to the client. |
| Use a hash set for performance. | Track identifiers in a set so repeated identifiers can be skipped without rescanning earlier items. |
| Retry to make this robust. | Retry a failed read at most twice; the operation has no side effects and the caller's deadline limits further attempts. |
| Magic fix; do not remove. | Reset the flag before notifying listeners so a listener can safely start another load. |

These are examples of writing, not facts to paste into a project. Verify the behaviour, ordering, API units, retry semantics, lock boundaries, and re-entrancy in each real case. Do not claim a speed improvement or safety guarantee without the relevant evidence.

## Choose the right granularity

A meaningful section is the smallest useful group of statements with one goal. Boundaries often occur when the code changes from validating to transforming, starts a transaction, crosses an I/O boundary, handles an exceptional case, changes state, or cleans up a resource.

- Put one short explanation above a cohesive section. Explain the shared purpose and reason once.
- Add a more local explanation for a surprising line whose reason is not conveyed by that section.
- In a short, simple function, the API description can cover its single implementation section. Do not add a second version of the same sentence.
- Cover branches with distinct business meaning. A single comment saying “Handle errors” does not explain rejection, fallback, cancellation, and retry decisions.
- Explain dense formulas, regular expressions, bit operations, indexing, overflow avoidance, units, normalization, and ordering assumptions as needed. A small worked example can be clearer than a paragraph.
- Do not comment braces, imports, property access, or routine assignments individually unless they carry a relevant decision. Group setup under its purpose.
- If detailed annotation is explicitly requested, explain each meaningful statement without mechanically translating its tokens. Preserve syntax and place explanations outside literal data or embedded code where required.

There is no universal lines-per-comment rule. Five ordinary assignments may need one section comment; one memory-ordering operation may need several sentences and a reference. If a comment must explain many unrelated actions, consider whether a refactor would help and report it without exceeding the task's authority.

## Write clear prose

Prefer active verbs: read, select, group, check, reject, keep, sort, save, retry, release. Prefer “use” to “utilize,” “before” to “prior to,” and “to” to “in order to.” Say which value, caller, account, or operation is affected instead of using an unclear “it” or “this.”

Use one main idea per sentence. Keep identifiers, units, protocol names, and error names exact. Explain a necessary term locally: “Keep the operation idempotent: repeating the same request must not create a second payment.” Only make that promise if the implementation and wider system establish it.

Follow the repository's spelling, capitalization, punctuation, and line-width conventions. Without a local rule, use full sentences and wrap ordinary prose at roughly 80–100 columns; apply narrower ecosystem requirements where relevant. Do not wrap links, directives, structured tags, literal examples, or significant whitespace blindly. Use code formatting supported by the selected doc renderer; Markdown is not universal.

Remove empty phrases such as “This function is responsible for,” “obviously,” “simply,” “clever,” “for efficiency,” and “for safety” unless the following text explains a specific useful fact. Avoid jokes at someone's expense, complaints about colleagues, excessive punctuation, decorative banners, author-by-line histories, and unsupported absolutes such as “always,” “never fails,” or “thread-safe.”

## Ground intent in evidence

Separate four kinds of statement:

| Kind | Example | Requirement |
| --- | --- | --- |
| Observed behaviour | An error returns an empty list. | Check the relevant branches and dependencies. |
| Intended contract | A failed lookup must deny access. | Locate a current requirement or authoritative contract. |
| Demonstrated technical reason | Sorting permits adjacent equal identifiers to be combined. | Check that the implementation depends on this ordering. |
| Historical/product reason | The timeout was chosen for a supplier's rate limit. | Find the actual decision or ask; do not infer it from the number. |

Tests support the tested behaviour, not every input and not necessarily the original business intent. Existing comments can be stale. History can explain an earlier decision that no longer applies. A type name is not proof of security, transactional, concurrency, or performance guarantees.

When the reason is unknown, describe the known operation without inventing a story. Record the unknown reason as an audit finding. Keep conjecture in clearly labelled working notes, not a polished API guarantee. If the missing fact materially affects a correction, ask one question with the options and a recommendation supported by current evidence.

If a comment describes a desirable property that the code violates, report a contract conflict. Do not silently edit the comment to make a suspected bug look intentional. For a comment-only task, leave the behavioural decision for an authorized fix and complete independent safe improvements.

## Document contracts

Document information a caller cannot safely infer from a name or type:

- **Inputs:** domain meaning, units, boundaries, locale/time zone, null/empty rules, ordering, encoding, accepted representation, defaults, validation responsibilities.
- **Outputs:** result meaning, ordering, missing-value semantics, snapshots versus live views, lazy evaluation, ownership, identity, stability, partial results.
- **Effects and lifetime:** changes to inputs or shared state, database/network/file effects, transaction scope, disposal, resource retention, subscriptions, callbacks, re-entrancy.
- **Failure:** errors intentionally surfaced, cancellation timing, fallback, retry eligibility and limits, partial completion, cleanup, caller recovery duties.
- **Concurrency:** who owns synchronization, valid thread/context, sharing limits, happens-before relationships when relevant, cancellation versus completion races.
- **Algorithm limits:** supported sizes, precision, overflow, complexity with assumptions, deterministic inputs, measurements with conditions and a real source.

This is a relevance checklist, not mandatory boilerplate for every function. Do not document every transitive exception a runtime could theoretically produce. Do not use native documentation tags to promise effects the code does not enforce. Inherit a contract only when it really applies to the implementation.

## Place and maintain comments

Attach API docs where the language/tool extracts them; put local reasons close to the decisions they explain. Preserve indentation, delimiter spacing, documentation attachment, header ordering, and comment nesting rules. Keep the authoritative contract in one place and put implementation-specific reasons beside implementation details.

When editing code, recheck old comments in the enclosing unit and dependent public documentation. Changes to a unit, predicate, timeout, parameter, result, retry policy, null rule, or transaction boundary often invalidate multiple sentences. Move the explanation with the code. Delete proven-obsolete commentary rather than leaving contradictory history.

Preserve useful stable links and identifiers. Include enough local context to understand a workaround without opening its issue. Only add TODO/FIXME markers for concrete known work. Follow the repository's format; include the actual issue, owner, or removal condition only when known. Do not invent placeholder tickets, assign ownership, or turn every uncertainty into a permanent TODO.

## Special situations

- **Tests:** Explain why a fixture is unusual and what regression or contract an assertion protects. A good test name may already state the main scenario; avoid repeating it over arrange/act/assert syntax.
- **Security:** State the checked boundary and the responsibility that remains with the caller. Never include real secrets or assert that an algorithm is secure merely because it uses a hash or encryption API.
- **Performance:** Explain a verified mechanism or constraint. Quantitative claims require the workload, assumptions, and supporting benchmark; avoid speculative “fast path” explanations.
- **Generated/vendor files:** Change the maintained source/template under the requested scope. Do not edit generated bodies, legal headers, vendored code, lockfiles, signatures, or snapshots merely to add comments. Mark exclusions explicitly.
- **No-comment formats:** Use supported schema descriptions or adjacent documentation keyed by actual field names/paths. Do not change data to mimic comments.
- **Tool directives:** Treat pragmas, suppressions, type annotations, optimizer hints, build tags, and code-generator comments as operational content. Do not “tidy” their spelling, location, or scope.

## Acceptance rubric

For each applicable gate, record **pass**, **finding**, **unverified**, or **not applicable**, with evidence. Assess accuracy, intent, meaningful-section/API coverage, clarity, format, behavioural preservation, maintenance, and verification. Do not average away a false safety claim with good punctuation. Do not assign an “A grade” using comment density or a heuristic script. Use “ready in the reviewed scope” only when no material finding or required unverified check remains.

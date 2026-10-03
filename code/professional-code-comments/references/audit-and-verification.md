# Audit and verification

## Contents

- [Scope and modes](#scope-and-modes)
- [Inventory](#inventory)
- [Review each unit](#review-each-unit)
- [Classify findings](#classify-findings)
- [Verify changes proportionately](#verify-changes-proportionately)
- [Maintain coverage and report](#maintain-coverage-and-report)
- [Repository adoption](#repository-adoption)

## Scope and modes

Determine the authorized action first. “Audit” alone means inspect and report. “Audit and fix comments” includes correcting documentation, with executable behaviour preserved. A requested behaviour change also authorizes updating its associated comments. A policy request authorizes adapting the supplied policy asset into the existing project structure, not introducing unrelated tooling.

For repository-wide work, identify all relevant modules and file types before editing. Review in bounded batches, prioritize consequential contracts and decisions, and retain a ledger. Finish all eligible files before claiming a full audit; if resources or access prevent this, identify the remainder precisely. For a diff, also inspect the unchanged surrounding unit and docs that depend on the changed contract.

Before editing, inspect the working tree so user changes are not overwritten. Keep original scope and evidence through the task. If the repository's build or documentation steps are unfamiliar, read their definitions before running them.

## Inventory

The optional `scripts/comment_inventory.py` is a planner. It classifies paths and reports exclusions, ambiguity, and heuristic markers. Read its `--help` and output notes. It cannot identify all generated files or embedded languages, parse comments, distinguish a marker inside a string, discover intent, or establish that a file is professionally documented.

The helper uses Python 3.10+ and the standard library, with optional Git. It reads at most 16 KiB from recognized text files, skips files larger than 1 MiB, and reports these limits. On platforms without safe no-follow reads, it performs filename classification only. Its focused self-checks use disposable fixtures: `python3 -m unittest discover -s <skill-directory>/scripts -p test_comment_inventory.py`.

Check tracked and relevant untracked files using the repository's existing tools. Exclude dependencies, generated/minified output, binaries, caches, lockfiles, secrets, and other noneditable artifacts from comment insertion, while locating their maintained source when needed. Include handwritten tests, scripts, templates, configuration, SQL, and schemas. Treat documentation and strict data formats appropriately; an exclusion from insertion is not an exclusion from understanding their contract. Directory names such as `bin`, `build`, and `vendor` are only ownership hints: confirm them before accepting exclusions. Handwritten scripts or other requested source in those directories still need review, using direct reads or a separately scoped inventory when necessary.

Do not infer an exact grammar from `.m`, `.h`, `.pl`, `.inc`, `.conf`, or `.ini`. Inspect the build system, dialect declaration, consuming tool, and safe representative content. Recognize embedded languages in components, notebooks, HTML, templates, SQL strings, CI YAML, and Docker heredocs.

For every language or region, establish ordinary comment syntax, API documentation syntax, required attachment, documentation parser/version, and operational comment forms. If unsupported by the profiles, verify the actual official documentation before changing it.

## Review each unit

1. Read the entire unit claimed as reviewed. Locate its entry points, outcomes, and meaningful sections.
2. Build an outline of the behaviour: inputs, checks, selection, transformation, state changes, errors, cleanup. Adjust the outline to the code rather than imposing these phases.
3. Match comments to their actual scope. Check each claim against branches, types, calls, tests, and authoritative requirements.
4. Check every consequential choice: order, boundaries, conversion, synchronization, retry, fallback, exceptional exits, unsafe calls, data lifetime, and domain rules.
5. Check public contracts independently of implementation notes. A caller should not need to read the body to learn null rules, units, side effects, or failure semantics.
6. Identify uncovered sections, stale explanations, speculative reasons, redundant prose, broken links/tags, and directives at risk.
7. Draft the smallest accurate correction. Preserve behaviour for a comment-only task. Where a behavioural defect or requirement conflict emerges, report it and continue independent comment improvements.
8. Re-read the edited code and its comments together. Ask whether a competent newcomer can now explain both the flow and its reasons.

Do not report a file as audited because a search found a docstring or because its public members have tags. A missing explanation can be inside a fully documented function. Conversely, clear single-section documentation can be adequate without inline comments on every statement.

## Classify findings

Use severity based on the consequence in this repository, not on which tag is missing.

| Class | Examples | Typical consequence |
| --- | --- | --- |
| Contract conflict | “Rejects errors” beside a fail-open branch; “seconds” beside milliseconds | Misuse, defects, unsafe maintenance |
| Unsupported assurance | “Thread-safe,” “constant-time,” “atomic,” “always unique” without evidence | False confidence in critical properties |
| Missing intent | Unexplained ordering, threshold, retry, ownership, suppression, or workaround | A later edit removes a necessary constraint |
| Coverage gap | Public API lacks contract; a distinct implementation phase has no meaningful explanation | Readers must reconstruct purpose and assumptions |
| Documentation format defect | Wrong tag dialect, bad attachment, invalid XML, unresolved reference | Missing or misleading generated docs |
| Operational comment risk | Repositioned build directive; changed executable example or type annotation | Behaviour or tooling changes |
| Staleness/duplication | Old parameter, changed unit, obsolete workaround, copied divergent contract | Conflicting explanations |
| Clarity/style | Signature repetition, vague prose, inconsistent local formatting | Reading and maintenance cost |

Suggested priority labels: **critical** for immediate significant misuse or behaviour risks; **high** for misleading contracts or important unexplained decisions; **medium** for missing coverage or broken docs; **low** for cosmetic issues. Adjust by actual impact. A missing safety precondition can be critical even if phrased as a missing paragraph.

For each finding record path and symbol/section, observed text or omission, evidence, impact, proposed correction, and whether intent is known. Keep evidence concise. Do not copy secrets or large source blocks into reports.

## Verify changes proportionately

Use existing local tooling, with the project's pinned versions and configuration. Do not add a testing framework for prose-only edits or tests that merely match the new wording. Run existing focused checks when they resolve a concrete risk.

| Change/risk | Useful verification |
| --- | --- |
| Ordinary comments in an established grammar | Full diff review; existing formatter/parser check where needed |
| API tags, names, references, inheritance | Existing documentation extraction/build, warning review, representative rendered output |
| XML/HTML/Markdown markup | Existing parser/doc renderer; check literal escaping, links, and code blocks |
| Docstrings, `@doc`, type-bearing comments, attributes | Check runtime/tool consumers; existing compiler/analyzer or focused tests |
| Executable documentation | Review example side effects; run safe, scoped doctests/examples through existing tooling |
| Embedded languages or whitespace-sensitive syntax | Correct host and embedded parser/build; inspect generated output if comments can leak or shift whitespace |
| Directives/suppressions/build flags | Exact preservation check of contents and attachment; corresponding existing diagnostic/build |
| Strict JSON/CSV/TSV | Parse with the actual format; confirm that no fake rows/fields/comments were added |
| Generator/template edits | Established regeneration in a safe local context; inspect the resulting diff |
| Signed/canonicalized assets | Avoid rewriting without the requested signing/canonicalization workflow |

A compiler passing does not establish truthful intent or accurate documentation. A documentation generator passing does not establish that the examples or promises match runtime behaviour. Perform the semantic review as well.

Do not strip comments with a generic regex and compare the remaining text: strings, nested comments, continuation, preprocessing, automatic semicolon insertion, and mixed grammars make this unsound. A lexer/token comparison is supporting evidence only; it can still miss observable docstrings, generated metadata, line-sensitive directives, or source inspection consumers.

Documentation builds may import application modules, execute plugins or snippets, download dependencies, invoke build scripts, or publish. Review commands and configuration before use. Prefer local parse/check modes and existing task aliases. Avoid dependency restoration, installation, environment mutation, infrastructure plan/apply, migrations, or external services unless already authorized by the actual task. Report an unavailable tool without claiming that a replacement check proves the same thing.

Record the exact check, its target and result. Distinguish **passed**, **failed**, **not run**, and **not applicable**. If a pre-existing failure prevents a clean result, say which part it blocks. Do not weaken project gates to manufacture a pass.

## Maintain coverage and report

Use the audit report asset for multi-file work. Maintain per-file state: pending, reviewed, edited, excluded, or blocked. Add unresolved symbols/sections within reviewed files where necessary. Exclusions need a reason; uncertain generated classification needs confirmation. Do not lose pending work when changing batches or handing over to another agent.

In the result, lead with the most consequential finding or improvement. State the exact scope and whether it was exhaustive or sampled. Give concrete examples of better explanations, the evidence needed for unresolved intent, and actual validation limits. Prefer an actionable finding over a numerical quality score.

For a clean result, use a bounded claim such as “No material comment defects found in the six reviewed files; XML docs built successfully.” Do not claim that all future generated code will automatically comply merely because this skill exists.

## Repository adoption

A skill is a reusable workflow, not a universal enforcement mechanism. To apply it consistently in a project, use the current host's supported skill discovery and add a short instruction to the appropriate existing repository guidance when the user requests adoption. Adapt `assets/repository-policy.md`; preserve unrelated rules and avoid contradictory copies in several instruction files.

Keep the portable skill folder and its relative resources together. Agents without this skill can follow the policy's core rules, but detailed language guidance and audit tooling require the package or equivalent resources. Do not assume every host discovers the same directory or invocation syntax. Use the installed host's established convention.

When CI enforcement is requested, propose checks that match the actual languages and documentation tools. Start with a scoped baseline of existing debt, fail only newly introduced issues where appropriate, and keep semantic human/agent review. Missing-doc and tag linters are useful gates; they cannot guarantee truthful explanations or recover a lost design decision.

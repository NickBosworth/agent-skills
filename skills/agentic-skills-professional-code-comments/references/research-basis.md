# Research basis and design choices

Reviewed on 3 October 2026. This is an original, portable engineering standard informed by the primary sources below and the official language/tool references linked in each profile. It is not a certified industry grading scheme.

## Contents

- [What the evidence supports](#what-the-evidence-supports)
- [How the standard resolves differences](#how-the-standard-resolves-differences)
- [Why verification has several layers](#why-verification-has-several-layers)
- [Use the sources responsibly](#use-the-sources-responsibly)

## What the evidence supports

| Primary source | Relevant finding | Design consequence |
| --- | --- | --- |
| [Google engineering review guidance](https://google.github.io/eng-practices/review/reviewer/looking-for.html#comments) | Distinguishes reasoning comments from API documentation about purpose, usage, and behaviour; complex algorithms can need explanations of their mechanics. | Separate caller contracts from implementation explanations. |
| [LLVM commenting standard](https://llvm.org/docs/CodingStandards.html#commenting) | Emphasizes purpose and reasons, clear prose, and useful information beyond a signature. | Explain domain behaviour and intent; do not mechanically narrate tokens. |
| [PEP 8 comments](https://peps.python.org/pep-0008/#comments) | Prioritizes consistency with current code and understandable sentences; warns against stale or obvious comments. | Update explanations with edits and treat contradictions as material defects. |
| [Linux kernel commenting standard](https://docs.kernel.org/process/coding-style.html#commenting) | Prefers concise purpose-oriented comments and its own kernel-doc API format; discourages excessive internal commentary. | Treat house style and documentation format as project-specific, not universal. |
| [Rani et al., A Decade of Code Comment Quality Assessment, 2022](https://arxiv.org/abs/2209.08165) | The review reports varied definitions of quality and substantial reliance on manual assessment and heuristics; many studies concern Java. | Do not claim a language-independent automated grade or use density as a proxy for understanding. |
| [Oxenhorn et al., The Paradox of Function Header Comments, 2024](https://arxiv.org/abs/2401.07704) | Its developer survey and Python analysis highlight the tension between documentation's value, maintenance concerns, and uninformative template output. | Require additional useful information and maintenance, rather than completed boilerplate alone. |

The empirical findings are evidence about observed practices and evaluation limitations. They do not prove that one exact comment density improves every project's performance. This package's specific workflow, acceptance gates, and default section coverage are design recommendations.

## How the standard resolves differences

There is no single comment format or optimal density shared by all languages. Even respected project standards emphasize different aspects of “what,” “why,” and “how.” Do not merge their strictest sentences into a contradictory universal rule.

For this skill, choose a deliberate default: explain every meaningful implementation section in domain terms and give a supported reason or constraint. Add individual-line explanations when the detail needs them. This serves engineers and future agents who know the language but do not know the system. A short single-section function can be covered by its documentation; punctuation and routine syntax do not need duplicated narration.

Use the user request and applicable repository rules to choose placement and detail. Preserve useful established conventions. Where a repository puts detailed reasoning in a design note, retain a short local reason and a stable reference. Never turn a style preference into permission to invent intent or break grammar.

Apply API documentation using the actual generator and version. XML documentation, Javadoc, KDoc, rustdoc, Go documentation, docstrings, DocC, dartdoc, Doxygen, PHPDoc, and schema descriptions serve related purposes but have different attachment, linking, and metadata rules. Their authoritative syntax sources live beside the relevant profile so an agent can load only the languages it needs.

## Why verification has several layers

A comment can be valid text and still be false. It can be truthful prose and still be ignored by the documentation tool. It can look like a comment and still influence compilation, type checking, generated code, runtime metadata, or test execution.

Therefore combine semantic review, native-format checks, preservation review, and applicable existing builds/tests. Use the inventory helper only to plan coverage. Avoid universal comment-stripping or regex-based claims of equivalence. Report incomplete evidence and unavailable tooling explicitly.

No package can guarantee invocation by every LLM host, perfect understanding of an unseen system, or recovery of an undocumented business decision. A repository policy helps make the workflow persistent; existing lint/build checks catch mechanical defects; engineering review resolves semantic uncertainty. These limits are part of honest quality control rather than reasons to skip useful work.

## Use the sources responsibly

Treat linked official specifications and tool documentation as syntax authorities, and project guides as context-specific engineering practice. Check the installed version before applying newer features, especially Java Markdown docs, Scala markup, Erlang native docs, Zig syntax/build APIs, OpenAPI dialects, and evolving documentation tools. Development-version links are references to verify, not a demand to upgrade.

When offline, use the pinned repository tools and bundled baseline guidance. If a syntax or tool behaviour remains uncertain, report that uncertainty and avoid speculative metadata changes. Prefer primary documentation when further research is necessary. Examples in this package are original illustrations; adapt their names, policies, and claims to real evidence before use.

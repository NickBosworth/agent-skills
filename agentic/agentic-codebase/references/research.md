# Research basis and update guidance

Evidence checked: **2026-10-03**. Recheck living documentation before changing tool adapters.
Use this reference when revising the standard, evaluating a disputed convention, or updating compatibility.
Treat it as an evidence register, not instructions to load every source into every coding session.

## Contents

- [Evidence discipline](#evidence-discipline)
- [Empirical studies](#empirical-studies)
- [Primary engineering sources](#primary-engineering-sources)
- [Compatibility findings that need version checks](#compatibility-findings-that-need-version-checks)
- [How the evidence informs this standard](#how-the-evidence-informs-this-standard)
- [Unresolved questions and verification limits](#unresolved-questions-and-verification-limits)
- [Updating this reference](#updating-this-reference)

## Evidence discipline

- Distinguish controlled measurements, vendor case studies, product specifications, and practitioner advice.
- Use product documentation to establish supported behavior; use an actual runtime probe to establish local behavior.
- Treat benchmark findings as conditional on tasks, models, harnesses, and evaluation criteria.
- Prefer the latest paper revision and inspect its limitations, not an older abstract or headline.
- Label recommendations derived from sources as design judgments rather than measured outcomes.
- Do not describe this skill's directory tree, metadata schema, or soft size budgets as an industry standard.
- Do not infer that a valid file format guarantees discovery, instruction following, or safe execution.
- Do not turn a useful case study into a guaranteed productivity claim.

## Empirical studies

### E1. Evaluating AGENTS.md

Title: *Evaluating AGENTS.md: Are Repository-Level Context Files Helpful for Coding Agents?*
Authors: Thibaud Gloaguen and colleagues.
Submitted: 2026-02-12. Relevant version: **v3, revised 2026-09-29**.
Sources: [Abstract and revision history](https://arxiv.org/abs/2602.11988), [v3 full text](https://arxiv.org/html/2602.11988v3).

Findings:

- Neither generated nor developer-written context files significantly improved resolution against no context.
- Generated context increased mean inference cost by approximately 20% on SWE-bench and 23% on CTXbench.
- Developer context improved resolution by 2.4% on average against no context, but not significantly (`p=.21`).
- Developer context outperformed generated context in that comparison (`p=.038`).
- Instructions were generally followed; repository overviews did not improve the measured navigation outcome.
- File length and removal of particular instruction categories showed no strong effect in the reported ablations.

Limitations:

- Python-focused evaluation; the results do not establish effects for every language or private repository.
- Particular model/harness combinations and one sampled completion per agent/task configuration.
- Task resolution does not measure all security, maintainability, or organizational-alignment benefits.

Interpretation: include useful additional requirements and evaluate locally.
Do not generalize v1 headlines or claim a proven size optimum.

### E2. Efficiency of AI coding agents

Title: *On the Impact of AGENTS.md Files on the Efficiency of AI Coding Agents*.
Authors: Jai Lal Lulla, Seyedmoein Mohsenimofidi, Matthias Galster, Jie M. Zhang, Sebastian Baltes, Christoph Treude.
Submitted: 2026-01-28. Relevant version: **v2, revised 2026-03-30**.
Sources: [Abstract and revision history](https://arxiv.org/abs/2601.20404), [v2 full text](https://arxiv.org/html/2601.20404v2).

Findings:

- Across 10 repositories and 124 PRs, median runtime fell 28.64% and median output tokens fell 16.58%.
- These are observed efficiency effects in the tested paired setup, not universal expected savings.

Limitations:

- One Codex configuration using `gpt-5.2-codex`; qualifying repositories had one root `AGENTS.md`.
- PRs were constrained to at most 100 changed lines and five modified files.
- The paper explicitly leaves correctness and developer-intent alignment evaluation to future work.
- Faster completion must not be described as equally correct completion established by this study.

Interpretation: efficiency evidence is mixed across settings; evaluate correctness and overhead together.
The two studies ask related but different questions and should not be reduced to a single verdict.

## Primary engineering sources

### S1. Claude Code best practices

Source: [Official best practices](https://code.claude.com/docs/en/best-practices).
Date: living documentation, checked 2026-10-03. Type: vendor operational guidance.

- Provide a runnable verification signal and report evidence instead of an unsupported success assertion.
- Keep persistent instructions specific; move workflows needed only sometimes into skills.
- Plan in proportion to uncertainty and scope; simple changes need not have a formal planning phase.
- Review instructions when behavior fails, and remove guidance that adds no value.
- Independent review can help, but findings should concern correctness or stated requirements rather than speculative polish.

Limit: these are starting patterns, not controlled evidence for a mandatory workflow on every task.

### S2. Context engineering

Source: [Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents).
Published: 2025-09-29. Type: Anthropic engineering guidance.

- Select relevant, high-value context rather than repeatedly loading all available material.
- Retrieve detail when needed and preserve useful state across long work.
- Context design includes tool results and accumulated conversation, not only prompt files.

Interpretation: give each reference a clear retrieval trigger and keep routine entry points small.
Limit: no universal token budget or directory arrangement is established.

### S3. Agent Skills design and authoring

Sources: [Skills engineering article](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills),
[official authoring guidance](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices).
Dates: article published 2025-10-16, open-standard update 2025-12-18; authoring documentation checked 2026-10-03.

- Progressive disclosure loads metadata, then the skill body, then relevant supporting resources.
- Package reusable procedures and deterministic utilities rather than only narrative advice.
- Define representative evaluations before expanding instructions; compare behavior with a baseline.
- Link important reference files directly from `SKILL.md`; document actual runtime dependencies.
- Inspect unfamiliar skills, their dependencies, scripts, and network behavior before trusting them.

Limit: the suggested 500-line `SKILL.md` budget is authoring guidance, not a proven optimum.
Content-format portability does not imply identical discovery paths or permission semantics.

### S4. OpenAI harness engineering

Source: [Harness engineering: leveraging Codex in an agent-first world](https://openai.com/index/harness-engineering/).
Published: 2026-02-11. Author: Ryan Lopopolo. Type: internal engineering case study.

- Use a short entry point into deeper repository knowledge rather than one large instruction manual.
- Version significant execution plans, progress, decisions, and known technical debt.
- Combine mechanical documentation checks with review for stale descriptions of real behavior.
- Enforce useful architectural invariants rather than prescribing every implementation detail.
- Repair small consistency problems regularly before repeated agent work spreads them.

Limit: the reported team experience and productivity estimate do not establish general causal speedups.
The article explicitly leaves long-term architectural coherence over years unresolved.

### S5. Long-running work and later simplification

Sources: [Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents),
[Harness design for long-running application development](https://www.anthropic.com/engineering/harness-design-long-running-apps).
Published: 2025-11-26 and 2026-03-24 respectively. Type: Anthropic experimental engineering accounts.

- Explicit progress and acceptance evidence address lost state and premature completion across sessions.
- Restartable setup and understandable handoffs reduce repeated reconstruction of the environment.
- The later work removed sprint machinery as newer model capabilities made it unnecessary.
- Re-evaluate the harness when models change; preserve components that help and remove obsolete workarounds.

Limits: these examples focus on application development and are not universal workflow benchmarks.
Do not mandate hundreds of JSON tasks, rigid sprint cycles, or a fixed multi-agent organization from these examples.

### S6. Architecture and decision records

Sources: [Documenting Architecture Decisions](https://www.cognitect.com/blog/2011/11/15/documenting-architecture-decisions),
[ARCHITECTURE.md](https://matklad.github.io/2021/02/06/ARCHITECTURE.md.html).
Published: 2011-11-15 by Michael Nygard; 2021-02-06 by Aleksey Kladov. Type: practitioner guidance.

- Record significant decisions with context, status, consequences, and the rationale future maintainers need.
- Retain superseded decisions and link replacements; do not erase why an earlier choice was made.
- Explain boundaries, dependency direction, invariants, and cross-cutting concerns that source browsing may miss.
- Distinguish current implementation from accepted target architecture during a migration.

Limit: these are durable engineering practices, not evidence that a particular document tree improves benchmark scores.
The current-versus-target distinction is this standard's interpretation for preventing false drift repairs.

### S7. Security and collaboration

Sources: [Claude Code security](https://code.claude.com/docs/en/security),
[agent teams](https://code.claude.com/docs/en/agent-teams), [Git worktrees](https://git-scm.com/docs/git-worktree).
Date: living documentation, checked 2026-10-03. Type: product documentation.

- Permission prompts, sandbox isolation, workspace trust, and MCP configuration have different enforcement roles.
- Repository prose is not an operating-system security boundary or authorization to broaden permissions.
- Separate worktrees isolate working files, but agents still need task ownership and integration coordination.
- A Markdown claim or task status is not an atomic lock for simultaneous writers.

Limit: tool safeguards do not eliminate prompt injection; team capabilities depend on the runtime and version.
The warning about Markdown locking is an engineering inference, not a promised product feature.

## Compatibility findings that need version checks

Source: [Claude Code memory documentation](https://code.claude.com/docs/en/memory), checked 2026-10-03.

Claude Code's AGENTS support illustrates why compatibility must be checked against
the installed version, settings and existing instruction files. Keep the detailed
current recipes in [the adapter reference](adapters.md), rather than maintaining
another version-specific rule list here.

Do not extrapolate these rules to another agent. Check that agent's current official documentation and local configuration.
Do not assume a linked file is loaded automatically; distinguish a runtime import from a human-readable pointer.

## How the evidence informs this standard

| Design choice | Basis | Strength and practical boundary |
| --- | --- | --- |
| Small entry point and conditional references | E1, S1–S4 | Reasoned convention; no proven optimal line count. |
| Useful additional instructions, limited duplication | E1, S1 | Avoid unnecessary cost; still preserve accepted project requirements. |
| One authoritative source per fact or decision | S4, S6 | Consistency design; adapt to an existing authoritative tracker or document. |
| Explicit observed, proposed, accepted, and historical states | S6 | Prevent invented decisions and incorrect repair of intended architecture. |
| Mechanical checks plus semantic review | S1, S4 | Machine checks establish only the properties they actually inspect. |
| Evidence attached to meaningful completion claims | S1, S5 | Task-appropriate proof; do not require every possible test. |
| Resumable plans for substantial work | S4, S5 | Apply proportionately; avoid a permanent plan for trivial edits. |
| Change-sensitive freshness review | S4 | Date alone cannot establish correctness or staleness. |
| Optional parallel coordination | S5, S7 | Use when benefits exceed coordination costs and runtime support exists. |
| Version-aware adapters and runtime probes | Product documentation | File creation alone does not establish discovery. |
| Removal of obsolete rules and scaffolding | S1, S5 | Re-evaluate after agent/model changes and recurring failure analysis. |
| One contextual question at a time | User-required interaction contract | Explain uncertainty, options, and a justified recommendation; do not invent empirical support. |

## Unresolved questions and verification limits

- No source proves a universal agentic repository structure, ideal documentation size, or optimal agent count.
- A successful structural audit cannot establish complete semantic consistency or future instruction adherence.
- An old stable decision can remain correct; a newly edited document can already be wrong.
- Current code is evidence of implementation, not automatic authority to repeal an accepted constraint.
- Existing conventions may encode requirements absent from public documentation; investigate before replacing them.
- Runtime discovery, effective scope, imports, hooks, and permissions require verification in the selected host.
- Verification commands must be inspected for scope and dependencies; documentation is not permission to execute them.
- Preserve an explicit unverified result when runtime, network, credentials, or relevant evidence are unavailable.
- Human judgment remains necessary for unresolved requirements, significant tradeoffs, and conflicting authorities.

## Updating this reference

1. Identify the concrete behavior or design assumption under review.
2. Reopen the relevant primary source; record the checked date and product/paper version.
3. Compare revised findings and limitations with the claims above before changing a convention.
4. Verify runtime-specific claims with a small local probe when the runtime is available.
5. Exercise representative setup, maintenance, and repair scenarios; include preservation and failure cases.
6. Measure correctness, useful completion, questions, unnecessary edits, and execution/context overhead separately.
7. Update only claims supported by new evidence; keep unresolved questions visible.

# Development Planning

**Version 1.0.0 · 9 October 2026**

A guided, repository-aware planning skill for engineers adding functionality or changing an existing codebase. Start with rough notes, a ticket, acceptance criteria, or files. The agent investigates what exists, identifies protected rules and indirect consequences, and asks one clear decision question at a time before producing a detailed implementation plan.

The skill's display name is **Development Planning**. Its machine-readable name and folder are **`development-planning`**.

## Install

Keep the entire `development-planning` folder together. `SKILL.md` is the entry point; the references and templates are loaded when needed. Copying only `SKILL.md` loses the supporting material.

Use the skill location recognised by your coding agent. For a project using OpenCode, a documented agent-compatible location is:

```text
<repository>/
└── .agents/
    └── skills/
        └── development-planning/
            ├── SKILL.md
            ├── references/
            ├── assets/
            ├── examples/
            └── evals/
```

OpenCode also documents `.opencode/skills/development-planning/` for a project and `~/.config/opencode/skills/development-planning/` for user-wide installation. Choose one location rather than installing duplicate copies. Other agents may use different discovery paths or import mechanisms; use their actual supported mechanism. These OpenCode locations were checked against its official documentation on 9 October 2026; see the research notes.

The package is ordinary Markdown plus an optional evaluation fixture. It requires no runtime service or script to use the planning workflow. The coding agent needs authorised repository access. Browsing, history, tests and execution depend on the host's tools and permissions. Python 3.10+ is needed only to run the supplied synthetic evaluation fixture, not to use the skill.

A local model server is not itself evidence that a coding agent can load skills. Configure the skill in the agent/harness that reads files and performs repository work. If native skill discovery is unavailable but the agent can read files, explicitly instruct it to read this folder's `SKILL.md` and the referenced files when their stages apply. This manual route is not a claim of native integration with every host.

## Start using it

After installation:

```text
Use Development Planning for this change. Start with my notes below, inspect the
repository and its existing rules, and guide me one question at a time. Produce
the plan before making implementation changes.

[Paste the brain dump, ticket, acceptance criteria, or relevant files here.]
```

You can also simply say, “Use Development Planning. I have a change to discuss.” The agent should ask for your starting material. If you already supplied the ticket or files, it should read them instead of asking you to send them again.

More examples, including plan-only use, resuming a session, rule changes and tests-first execution, are in [examples/prompts.md](examples/prompts.md).

## The experience

1. **Supply whatever you have.** Rough notes are enough. Do not include secrets or unnecessary personal information.
2. **The agent investigates.** It reads relevant instructions, rules, AC, architecture decisions, code, tests, contracts, deployment information and useful history. It distinguishes recorded reasons from inference.
3. **Make one decision at a time.** Each question explains why it matters, what already exists, at least three realistic options with one justified recommendation, and longer-term considerations.
4. **Settle the delivery choices.** Each actual breaking change is addressed at the correct boundary; data risks are separate. You choose testing order, any human test-review checkpoint, documentation for the change, and whether to audit/update documentation outside scope.
5. **Review a concrete plan.** It identifies the selected design, actual files/conventions, ordered tasks, preserved rules, acceptance tests, compatibility/migration/recovery, documentation and completion criteria.
6. **Approve execution or keep the handoff.** The agent declares readiness but does not treat that as permission to edit. After approved implementation and verification, it supplies an accurate suggested commit message in a copyable chat block.

The skill is intentionally language-, framework- and architecture-neutral. It should use your repository's conventions, not install a competing planning system or force a particular design.

## Important design decisions

**Planning and execution are separate.** Planning is read-only by default. Saving planning files requires applicable permission, and permission to save a plan does not permit editing source, tests, rules or documentation. Implementation, Git writes, production deployment and destructive shared-data operations are distinct authority boundaries.

**Rules are guardrails, not immutable mistakes.** The agent must challenge direct and indirect conflicts. You can select a legitimate rule revision, but the affected intent, approver, tests, documents, consumers and separate compatibility consequences are recorded. It must not rewrite rules to match a bug or silently weaken tests.

**The three options must be real.** Where only two technical approaches are credible, the third can be to narrow scope, investigate or defer—not a fabricated design. The agent still recommends one based on evidence.

**The interview should converge.** Resolved answers are reused. Repository facts are researched rather than delegated back to you. Small changes get smaller plans. Missing critical evidence creates a blocked draft or bounded investigation, not endless speculation or false readiness.

**A broader documentation audit is explicit and separate.** The skill offers a full audit with evidence-backed updates, a report-only audit, and no broader audit. It records boundaries and coverage; a sample is not presented as a full audit. Optional work does not silently expand the implementation scope.

**“Complete” requires evidence.** Missing required verification is reported as blocked, not passed. Planning alone does not produce a fictional implementation-success commit message. The suggested message never implies that a commit or deployment has actually happened.

## Package contents

| Location | Purpose |
| --- | --- |
| `SKILL.md` | Main workflow, interaction contract and gates |
| `references/discovery-and-impact.md` | Repository discovery, intent/rationale and indirect-effect analysis |
| `references/question-protocol.md` | One-question format, recommendations and answer handling |
| `references/compatibility-and-migrations.md` | Contract, behaviour, mixed-version and database/data decisions |
| `references/testing-documentation-and-delivery.md` | Test sequencing, truthful verification and the two documentation decisions |
| `references/planning-and-execution.md` | Directional plans, approval, task execution and resumption |
| `references/research-notes.md` | Primary sources and how they informed this design |
| `assets/` | Plan, state, rule-change, audit, readiness and completion templates |
| `examples/` | Ready-to-use prompts and a worked question-format example |
| `evals/` | Behavioural evaluation scenarios and a synthetic repository fixture |
| `VALIDATION.md` | Checks actually performed on this release and their limitations |

## Evaluating and adapting

The main instructions stay in `SKILL.md`; heavier detail is split into stage-specific references. Keep that structure when extending the skill. Do not paste every reference into the main file, add agent-specific tools without checking availability, or change the one-question and approval contracts casually.

Run the behavioural scenarios using your intended coding agent/model and inspect its transcript, tool actions and diffs. Repeat after significant edits or model changes. The included fixture is only an example, not proof that an agent will obey the skill in every repository. See [evals/README.md](evals/README.md) and [VALIDATION.md](VALIDATION.md).

For tailoring, prefer adjusting repository conventions, reference examples and justified defaults. Preserve the explicit rule, data, verification and approval boundaries. This is a reusable guidance package, not a deterministic access-control mechanism; host permissions and human review remain necessary.

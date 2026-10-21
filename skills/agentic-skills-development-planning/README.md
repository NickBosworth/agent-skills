# agentic-skills · Development Planning

Version **2.0.3** · Licence **CC0-1.0**

Turn rough requirements into a concrete plan with explicit compatibility and delivery decisions.

## Installation and use

Copy the entire `agentic-skills-development-planning` folder into your agent host's documented
skill directory. Keep its resources and licence together. Confirm that the skill
appears in the host's picker, then invoke it using that host's supported syntax.

If upgrading from a pre-2.0.0 copy, check your local customizations and remove the
old installation. Keeping both names installed can cause ambiguous activation.

```text
Use $agentic-skills-development-planning to inspect this change and produce an evidence-backed plan before implementation.
```

Read [SKILL.md](SKILL.md) for the workflow, supporting resources and any helper
requirements. The written guidance needs no runtime service. Use only tools that
are available and authorized in your project.

Decision questions use a bold **Question N** label, explain the purpose and current
code, then present **Options** with a justified recommendation first. After the
alternatives, explain the recommendation in more detail. See the [worked example](examples/worked-conversation.md).

## Scope and verification

**Use it for:** Plan an order-cancellation feature against the supplied accounting rules.

**Choose another skill for:** Implement an approved two-line CSS change without reopening settled decisions.

The [behavioural scenarios](evals/scenarios.json) describe tests to run; they are
not completed model benchmarks. Read the [evaluation guide](evals/README.md) before
testing. Package validation and helper tests do not establish native host discovery,
domain certification, visual quality or target-engine compatibility. Source-review
dates remain unchanged: rebranding did not refresh every source.

## Release changes

Version 2.0.0 introduced the `agentic-skills` names and self-contained packages,
preserving existing helper behaviour and legal notices. Missing planning and web UI
resources were replaced with new original material; unavailable original helpers
and catalogues were not recovered.

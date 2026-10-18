# agentic-skills · Agentic Codebase

Version **2.1.0** · Licence **CC0-1.0**

Set up, audit, maintain and repair repository guidance, decisions, task routes and agent adapters.

## Installation and use

Copy the entire `agentic-skills-agentic-codebase` folder into your agent host's documented
skill directory. Keep its resources and licence together. Confirm that the skill
appears in the host's picker, then invoke it using that host's supported syntax.

If upgrading from a pre-2.0.0 copy, check your local customizations and remove the
old installation. Keeping both names installed can cause ambiguous activation.

```text
Use $agentic-skills-agentic-codebase to inspect this repository and maintain its agent guidance without changing unrelated application behavior.
```

For a new project, request a compact agent environment and supply its first useful
outcome and confirmed constraints. Application implementation is separate scope.
For an audit, explicitly request read-only review. For migration, identify which
existing structure should be consolidated and which decisions must be retained.
See [worked examples](examples/worked-examples.md) for all three workflows.

Read [SKILL.md](SKILL.md) for the workflow, supporting resources and any helper
requirements. The written guidance needs no runtime service. Use only tools that
are available and authorized in your project.

## Scope and verification

**Use it for:** Audit this repository’s agent guidance without edits.
Also use it to scaffold a grounded environment or reconcile stale and duplicated
guidance while retaining useful existing conventions.

**Choose another skill for:** Translate this paragraph into French.

The [behavioural scenarios](evals/scenarios.json) describe tests to run; they are
not completed model benchmarks. Read the [evaluation guide](evals/README.md) before
testing. Package validation and helper tests do not establish native host discovery,
domain certification, visual quality or target-engine compatibility. Source-review
dates remain unchanged: rebranding did not refresh every source.
The [2.1.0 validation record](VALIDATION.md) separates helper regressions,
controlled explicit-path agent trials, and unverified native host discovery.

## Release changes

Version 2.1.0 hardens registry writes and preservation checks, expands host artifact
inventory, corrects OpenCode V2 guidance and adds concrete workflow/evaluation inputs.
Helper 1.1.0 retains registry schema 1 and standard 1.0.0. Incomplete older runtime
adapter assertions remain review warnings; supported extension fields are preserved.

Version 2.0.0 introduced the `agentic-skills` names and self-contained packages,
preserving existing helper behaviour and legal notices. Missing planning and web UI
resources were replaced with new original material; unavailable original helpers
and catalogues were not recovered.

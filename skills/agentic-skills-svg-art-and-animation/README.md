# agentic-skills · SVG Art and Animation

Version **2.0.2** · Licence **MIT**

Create and repair editable SVG geometry and motion for the actual delivery target.

## Installation and use

Copy the entire `agentic-skills-svg-art-and-animation` folder into your agent host's documented
skill directory. Keep its resources and licence together. Confirm that the skill
appears in the host's picker, then invoke it using that host's supported syntax.

If upgrading from a pre-2.0.0 copy, check your local customizations and remove the
old installation. Keeping both names installed can cause ambiguous activation.

```text
Use $agentic-skills-svg-art-and-animation to inspect this SVG and repair its geometry or motion with appropriate visual evidence.
```

Read [SKILL.md](SKILL.md) for the workflow, supporting resources and any helper
requirements. The written guidance needs no runtime service. Use only tools that
are available and authorized in your project.

## Scope and verification

**Use it for:** Repair a gate pivot while preserving IDs used by its host application.

**Choose another skill for:** Generate a photorealistic bitmap portrait.

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

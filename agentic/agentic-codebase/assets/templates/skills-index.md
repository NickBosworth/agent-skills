# Repository skills

Place a reusable, repository-specific procedure in `<skill-name>/SKILL.md`.
Use lowercase kebab-case names and a concise description saying when it applies.
Bundle supporting scripts, references or templates only when they improve the
procedure. Keep the skill's main instructions focused and link deeper detail.

Create a skill for a recurring workflow that needs project knowledge, such as
adding a module or diagnosing a particular integration. Do not create a skill
merely to repeat general programming advice or document a one-off task.

`.agents/skills` is this project's canonical location. Discovery and invocation
depend on the agent host. Record necessary adapters and their source ownership
in the project manifest. Test that the intended host actually discovers the
skill; a correctly named folder is not runtime verification.

Keep personal preferences and credentials outside this tracked directory.

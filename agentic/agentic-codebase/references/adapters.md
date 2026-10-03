# Agent host adapters

Documentation checked: **2026-10-03**. Recheck the relevant official source when the installed version or observed behavior differs.
Use this reference when choosing, repairing, or verifying host-specific instruction and skill discovery.

## Contents

- [Boundaries](#boundaries)
- [Compatibility table](#compatibility-table)
- [Inspect before adapting](#inspect-before-adapting)
- [Setup recipes](#setup-recipes)
- [Copies and ownership](#copies-and-ownership)
- [Verify the result](#verify-the-result)
- [Maintain adapters](#maintain-adapters)
- [Sources](#sources)

## Boundaries

- Use root `AGENTS.md` and `.agents/skills/<name>/SKILL.md` as this skill's canonical convention when adopting a new layout. Preserve an effective existing layout when migration has no material benefit.
- The Agent Skills specification defines package contents; it **does not mandate `.agents/skills` discovery**. Host support, settings, version, and session type determine loading [S1, S2].
- Add no adapter when the selected host can discover the canonical files. Do not generate every vendor directory in anticipation of possible future use.
- Treat Markdown links and prose pointers as retrieval guidance unless the selected host documents native import syntax. A file's existence proves neither discovery nor compliance.
- Keep portable skill frontmatter to the standard fields. Do not depend on vendor-only `paths`, hooks, shell injection, fork behavior, or argument substitution across hosts [S1, S12].
- Keep enforcement in the relevant permissions, linters, tests, or CI. Instruction files guide behavior; they do not replace those controls or override higher-priority session instructions.

## Compatibility table

The entries below describe documented capability, **not a claim that this package has been executed in each host**.

| Host / surface | Instruction entry point | Skill location for this convention | Material caveat |
| --- | --- | --- | --- |
| Codex CLI / IDE / repository session | Root and applicable ancestor `AGENTS.md` | `.agents/skills/<name>/SKILL.md` | Initial instruction discovery ends at launch CWD; `AGENTS.override.md` can hide same-directory `AGENTS.md` [S3, S4]. |
| OpenCode V1 | `AGENTS.md` | `.agents/skills/<name>/SKILL.md` | `CLAUDE.md` is a fallback; ordinary file references are not automatic imports [S5, S6]. |
| OpenCode V2 | `AGENTS.md` | `.agents/skills/<name>/SKILL.md` | No `CLAUDE.md` fallback; configured `instructions` files/globs/URLs are not currently resolved [S7, S8]. |
| Cursor Agent | Root and nested `AGENTS.md` | `.agents/skills/<name>/SKILL.md` | Native rule files require `.cursor/rules/*.mdc`; personal skills do not automatically travel to cloud sessions [S9, S10]. |
| Copilot cloud agent / CLI | `AGENTS.md`; native Copilot instructions also supported | `.agents/skills/<name>/SKILL.md` | Check the actual Copilot surface; support is not uniform across IDEs and features [S13, S14, S15]. |
| Copilot in VS Code | `AGENTS.md` for Chat; native instruction files also supported | `.agents/skills/<name>/SKILL.md` for agent skills | Do not infer that other IDEs or review surfaces have identical instruction support [S13, S15]. |
| Other Copilot surfaces | Consult support matrix; often `.github/copilot-instructions.md` | Verify that surface's skills support | GitHub.com Chat and Visual Studio Chat do not list `AGENTS.md` support in the matrix [S13]. |
| Claude Code | Conditional native `AGENTS.md`, or root `CLAUDE.md` importing it | Reviewed copy under `.claude/skills/<name>/` | Native `AGENTS.md` requires v2.1.277+ and can be suppressed by Claude instruction files; `.agents/skills` discovery is not established by the skills docs [S11, S12]. |

## Inspect before adapting

1. Identify the requested hosts, exact surfaces, launch directories, and versions from available evidence. Do not modify global settings merely to standardize a repository.
2. If a missing host/version changes the required setup, ask **one question**: explain the uncertainty, give options, recommend the smallest supported configuration, and state why. Continue independent inventory work.
3. Inventory root and nested `AGENTS.md`, overrides, `CLAUDE.md`, `.claude/CLAUDE.md`, `CLAUDE.local.md`, `.cursor/rules`, `.github` instruction files, OpenCode config, and skill directories. Include ignored/local files only where relevant and accessible; do not copy private contents into reports.
4. Identify links, generated regions, independent custom text, source ownership, duplicate skill names, and existing provenance records. Treat unseen global/team policies as unknown, not absent.
5. Determine which files actually enter context for the target host. Read relevant configuration and use host diagnostics where available; do not assume the nearest file always wins in every host.
6. Preserve project decisions and valid specialized instructions. Resolve contradictions at their authoritative source before generating projections. Ask the owner about genuine policy conflicts; do not choose by newest timestamp alone.
7. Choose no adapter, an explicit import, a retrieval pointer, or a reviewed projection/copy. Record the reason and expected loading behavior before editing.

## Setup recipes

### Codex

1. Keep root `AGENTS.md` and canonical `.agents/skills`; create no duplicate `.codex` content solely for compatibility.
2. Inspect same-directory overrides and configured fallback names before concluding a file is active. Codex loads at most one instruction file per directory, root-to-CWD, with a default combined 32 KiB limit [S3].
3. Keep the root concise. Instruct the agent to inspect applicable nested guidance before editing; do not promise that starting at the root preloads all descendants.
4. Use unique skill names. Codex does not merge same-name skills, and skill-catalog descriptions can be shortened when numerous skills are installed [S4].
5. Verify a fresh repository session and a representative subdirectory session. Record discovered sources; optional `agents/openai.yaml` is UI metadata, not the portable workflow [S4].

### OpenCode V1

1. Retain `AGENTS.md` and `.agents/skills`. Preserve relevant existing OpenCode configuration.
2. Put explicit conditional reading instructions in `AGENTS.md`, such as: “Before editing persistence, read `docs/architecture/persistence.md`.” A link or `@path` alone does not cause native import [S5].
3. Use V1's `instructions` setting only for a concrete need to preload verified sources. Merge intentionally; avoid broad globs that load unrelated subsystem rules together [S5].
4. Check for Claude-compatible fallbacks and duplicate skill definitions. Do not remove independent Claude content merely because OpenCode currently prefers another file [S5, S6].

### OpenCode V2

1. Use active `AGENTS.md` guidance and canonical skills. Do not add a `CLAUDE.md` fallback or an `instructions` array as a working import mechanism [S7].
2. Make scopes explicit and eliminate contradictions. V2 combines global guidance with nearest-to-ancestor project files and does not resolve conflicts; nested files also load during exploration [S7].
3. Keep skill directory, standard frontmatter `name`, and intended invocation ID aligned. V2 derives the ID from the path and treats `name` as a display label [S8].
4. Inspect duplicate IDs across native, compatibility, and configured sources; later registered definitions can override earlier ones. Do not rely on that ordering as a portable technique [S8].
5. Recheck nested instruction changes in a fresh session. Do not transplant V1 config or permission syntax into V2.

### Cursor

1. Use canonical `AGENTS.md` and `.agents/skills` without an extra `.cursor/rules` bridge [S9, S10].
2. Preserve existing `.mdc` rules; move substantive shared policy to its canonical source only after reviewing scope and activation semantics.
3. Add a native `.mdc` projection only when file-pattern or Cursor-specific activation is required. Verify `alwaysApply`, `globs`, and `description`; a plain `.md` rule file is not recognized [S9].
4. Verify nested guidance against a representative file. Cursor's nested skills and rules can be scoped by the touched area; do not infer identical behavior in other hosts [S9, S10].
5. For cloud use, prefer committed project skills. Confirm availability in the remote environment rather than assuming personal `~/.agents/skills` was copied there [S10].

### GitHub Copilot

1. Select the exact surface from the support matrix. For a surface supporting canonical `AGENTS.md` and skills, create no redundant native files [S13, S15].
2. Preserve `.github/copilot-instructions.md` and path-specific instructions that already contain useful guidance. Matching native instruction sources can both apply [S14].
3. Where a native entry point is needed, merge a small retrieval instruction into it:

   ```markdown
   Before changing repository files, read the root AGENTS.md and the
   applicable nested instructions for the paths you will edit.
   Follow its links when the task requires the referenced guidance.
   ```

4. Label this as a **retrieval pointer**, not an automatic import. Verify that the selected surface can and does read the target.
5. If that surface cannot retrieve the source, project only the essential applicable requirements into its supported instruction file. Identify the canonical source, generated region, scope, and baseline hashes; preserve unrelated human-authored sections.
6. Do not silently promote a pointer to `runtime-tested`. Test a representative operation or record the remaining limitation. Avoid unsupported claims about all Copilot IDEs, reviews, or chats behaving identically.

### Claude Code

1. Inspect version, instruction settings, and ancestor Claude files. Native `AGENTS.md` starts at v2.1.277; some sessions before v2.1.281 have further limitations [S11].
2. When native loading is available and confirmed, add no instruction bridge. Otherwise merge this into a root `CLAUDE.md`, preserving existing custom instructions:

   ```markdown
   @AGENTS.md
   ```

3. Resolve the path relative to the importing file. The snippet is for a **root** `CLAUDE.md`; `.claude/CLAUDE.md` needs the corresponding relative path [S11].
4. Check suppression carefully: project/ancestor `CLAUDE.md`, `.claude/CLAUDE.md`, or `CLAUDE.local.md` can disable default native AGENTS loading. Do not delete personal files or change global settings to force it [S11].
5. Check nested scopes separately. A root import does not establish that every nested `AGENTS.md` is loaded. Add matching local bridges only where needed, or document and verify explicit retrieval.
6. Do not rely on `AGENTS.override.md` or instruction files under `.agents/` for Claude native instruction loading [S11].
7. For skills, retain `.agents/skills/<name>/` as the source and make a **reviewed complete copy** at `.claude/skills/<name>/`. Include supporting resources so relative paths work [S12].
8. Prefer reviewed copies over symlinks as the cross-platform default, especially on Windows. Use symlinks only when the user's environment supports and already favors them; detect aliases during auditing.
9. Apply the ownership procedure below to every copied file. Do not independently customize both copies. Verify discovery in a fresh session or the documented skill reload mechanism.

## Copies and ownership

There is **no automatic synchronization command supplied by this skill**. Perform deliberate, reviewed updates with ordinary file tools.

1. Choose one authoritative source per instruction or skill. If an existing native file is authoritative, preserve that fact until a reviewed migration establishes a new source.
2. Record provenance in the optional `.agents/project.json` `adapters` array, or the established maintenance record. Use repository-relative paths. Record host, surface, observed version, `verification`, `checked_on`, `source_url`, and `notes`; put source/target mappings in `generated` with mode `copy`, `projection`, or `import`.
3. For copied skills, record a sorted list of relative file paths and SHA-256 hashes for source files and destination files at the accepted baseline. Keep provenance outside exact copied files; adding a header would change their hashes.
4. For mixed-ownership files, mark the managed region and describe its boundary/selection rule in `notes`. Each mapping's `source_sha256` and `target_sha256` describe the complete files at baseline; compare the diff to distinguish human edits from generated-region drift. An import contains the reference, not a duplicate of the source rules. Hashes cannot validate semantic equivalence.
5. Before updating, compare current source and destination with their respective baselines:

   | Change since baseline | Action |
   | --- | --- |
   | Neither changed | Leave content alone. |
   | Source only | Review source changes; regenerate/copy the managed content and verify. |
   | Destination only | Treat as a local customization; resolve ownership and migrate intended changes before replacement. |
   | Both changed | Reconcile explicitly; do not overwrite or pick the newest file automatically. |
   | No reliable baseline | Inspect contents and establish ownership before first synchronization. |

6. Update baseline hashes only after comparing the current source and adapter, reviewing the diff, and completing available validation. Never refresh hashes merely to silence divergence. A matching hash proves content identity, not that the host used it.
7. Avoid duplicate skill definitions in hosts that discover both directories. Confirm whether the host deduplicates aliases, exposes both, or shadows one; remove unnecessary copies only after preserving custom content and verifying the canonical definition.

Example of the record shape for a reviewed root Claude import; merge it into an existing manifest rather than replacing that manifest:

```json
{
  "adapters": [{
    "host": "claude-code",
    "surface": "cli",
    "version": "unknown",
    "verification": "documentation-only",
    "checked_on": "2026-10-03",
    "source_url": "https://code.claude.com/docs/en/memory",
    "notes": "Root import; runtime loading not checked.",
    "generated": [{
      "source": "AGENTS.md",
      "target": "CLAUDE.md",
      "mode": "import"
    }]
  }]
}
```

Add measured `source_sha256` and `target_sha256` values to the mapping after review; do not invent hashes. For a skill copy, use one mapping per copied file. Treat this manifest as evidence to inspect, not an automatic synchronizer; use helper hash checks only if an available helper actually implements them.

## Verify the result

Use the smallest checks that establish the requested host behavior. Do not start paid remote runs or change accounts solely for optional verification.

1. Check files, relative links, naming, frontmatter, copy hashes, and source ownership. Confirm no secrets or personal machine paths were projected into shared files.
2. Launch or inspect the selected host in the intended repository context. Use its documented diagnostics to identify loaded instruction sources and discover the skill.
3. Ask it to state one actual project requirement and identify its source, then load the skill and identify a bundled reference. A correct guess or quoted filename alone is weak evidence.
4. For nested guidance, use one representative path and verify both repository-wide context and the applicable local requirement. Confirm irrelevant subsystem guidance was not introduced by an overly broad adapter.
5. Record the evidence accurately:

   | Status | Meaning |
   | --- | --- |
   | `runtime-tested` | Observed loading/behavior on the recorded host, surface, version, and paths; retain concise evidence. |
   | `documentation-only` | Current official docs support the recipe; the target host was unavailable or not exercised. |
   | `unknown` | Behavior is untested/inferred or the required capability is unresolved. Record failed checks and corrective steps in `notes`; do not label a failed target runtime-tested. |

6. Report limited coverage honestly. Package/schema validation is not host validation; one host's success is not another's. Do not call documentation-only compatibility “tested.”

## Maintain adapters

- Revisit adapters when canonical policy, copied resources, host version, launch directory, enabled extensions, or session type changes.
- Audit imports, suppression, duplicate names, stale projections, and baseline drift. Keep source dates as evidence dates, not promises of perpetual compatibility.
- Preserve valid native features that the shared convention cannot express. Keep them scoped and label their host dependence.
- Remove an obsolete adapter only after verifying the canonical path works and reconciling any custom content. Recheck the affected host once; avoid repeated broad testing without a concrete unresolved risk.

## Sources

- **S1:** [Agent Skills specification](https://agentskills.io/specification).
- **S2:** [Agent Skills client implementation](https://agentskills.io/client-implementation/adding-skills-support).
- **S3:** [Codex AGENTS.md discovery](https://learn.chatgpt.com/docs/agent-configuration/agents-md).
- **S4:** [Codex and ChatGPT skill authoring/discovery](https://learn.chatgpt.com/docs/build-skills).
- **S5:** [OpenCode V1 rules](https://opencode.ai/docs/rules/) — page dated 2026-10-02.
- **S6:** [OpenCode V1 skills](https://opencode.ai/docs/skills/).
- **S7:** [OpenCode V2 instructions](https://opencode.ai/v2/docs/instructions).
- **S8:** [OpenCode V2 skills](https://opencode.ai/v2/docs/skills).
- **S9:** [Cursor rules](https://cursor.com/docs/rules).
- **S10:** [Cursor skills](https://cursor.com/docs/skills).
- **S11:** [Claude Code instructions and memory](https://code.claude.com/docs/en/memory).
- **S12:** [Claude Code skills](https://code.claude.com/docs/en/skills).
- **S13:** [Copilot instruction support by surface](https://docs.github.com/en/copilot/reference/custom-instructions-support).
- **S14:** [Copilot repository instructions](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/add-custom-instructions/add-repository-instructions).
- **S15:** [Copilot skills and locations](https://docs.github.com/en/copilot/concepts/agents/about-agent-skills).

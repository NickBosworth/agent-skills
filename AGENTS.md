# Maintainer instructions

This is **agentic-skills**, a public library of eight self-contained Agent Skills.
Treat every tracked file, commit message, release and CI log as publicly readable.
Host instructions and the user's authorized scope remain authoritative.

## Read when relevant

- Read [engineering](docs/engineering.md) for layout, commands and quality gates.
- Read [public repository policy](docs/public-repository-policy.md) before adding
  files, fixtures, screenshots, logs, examples, metadata or external sources.
- Read [contributing](CONTRIBUTING.md) before changing a skill or release.
- Read [migration](docs/migration.md) before renaming or copying a skill.
- Read [verification](docs/verification.md) to distinguish observed checks from
  untested host/model/browser behavior. Keep limitations truthful.

## Public repository rules — mandatory

1. Never stage, commit, push or publish credentials, authentication cookies,
   access tokens, private keys, connection strings with credentials, personal
   email addresses, phone numbers, home addresses, private account identifiers,
   customer/user records, analytics exports, private conversations or transcripts.
   This applies to filenames, Git identities/messages, encoded data, images,
   SVG metadata, fixtures, test output, archives and generated documentation.
2. Never commit machine-specific absolute paths, environment files, local agent
   configuration, editor state, Finder files, caches, databases, build output,
   temporary files, dependency directories or repository backups. `.gitignore`
   is convenience, not permission to force-add excluded material.
3. Use wholly synthetic fixtures. Example addresses must use RFC-reserved
   example domains; example identities must be clearly fictional. Prefer relative
   paths and `/path/to/...` placeholders. Public third-party documentation URLs
   and required legal attribution are allowed; they do not authorize copying
   private data or unrelated personal identifiers. Do not remove lawful notices.
4. Inspect all new binaries visually and inspect their metadata before adding
   them. Use synthetic screenshot content. The checker permits only reviewed PNG
   assets without ancillary metadata; adding another format requires an explicit,
   narrowly documented review and corresponding checks, not a global bypass.
5. Do not repeat discovered sensitive values in chat, reports, commit messages,
   exceptions or CI output. Report a category and location only. Stop the affected
   publication, remove the material, and rotate exposed credentials where needed.
   History removal cannot revoke credentials or retract other people's copies.
6. Use the anonymous Git identity `agentic-skills contributors` with
   `contributors@example.invalid` or a GitHub noreply address. Do not retain a
   personal author/committer name here. Do not change global Git configuration. Existing personal
   history requires an expressly authorized, coordinated rewrite.
   Publish commits through Git with that identity. GitHub web edits/merges can add
   a personal author or committer; do not use them unless metadata is verified safe.
7. Validate the actual staged content with `python tools/check_library.py --staged`
   before each commit, then run the full checks below. Never bypass a finding by
   broad exclusions, disabling a rule, changing expected results, or marking a
   review complete without evidence. A narrow exception requires rationale,
   exact scope, review and an enforcement test. No sensitive-value exceptions.
8. Before pushing, run history privacy checks and redacted Gitleaks scanning.
   Publishing and destructive history rewrites require applicable authorization;
   never force-push blindly. Use a lease tied to the inspected remote revision.
9. `AGENTS.md`, hooks and CI are safeguards, not an absolute prevention guarantee.
   Review diffs manually, inspect binary content, and report scan exclusions and
   unavailable checks. An ignored file, green CI or silent scanner is not proof
   that no personal information exists.

## Skill maintenance

- Canonical packages live in `skills/agentic-skills-*/`; folder and frontmatter
  names must agree. Keep references relative and packages independently usable.
- Preserve scope, validation, error handling, accessibility, original intent and
  third-party notices. Do not add empty resources just to satisfy a validator.
- User authorization persists. Ask only for consequential unresolved decisions;
  do not fabricate alternatives or repeat answered questions.
- Prefer existing helpers. New nontrivial helper logic needs focused regression
  coverage. Skill prose needs positive/negative behavioural scenarios; scenario
  definitions are not executed model evaluations.
- Changes to names, prompts, commands or templates must reach callers, tests,
  examples, adapters, catalogue, migration notes and checksums.
- Never claim native discovery, agent reliability, browser/engine compatibility
  or domain certification solely from structural checks and helper tests.

## Required local checks

```sh
python tools/check_library.py
python tools/run_checks.py
python tools/check_library.py --staged
python tools/check_library.py --history
gitleaks git . --redact --log-opts=--all
```

The Python checks require the pinned development dependencies. Commands above run
from the repository root; package-specific commands use their stated package root.
CI definitions own the automated gates. Do not silently install local hooks;
the optional reviewed hook is documented in CONTRIBUTING.md.

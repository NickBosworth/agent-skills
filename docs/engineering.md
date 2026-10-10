# agentic-skills engineering

## Purpose and boundaries

A public, branded library of eight reusable Agent Skills. Packages should be
independently installable, evidence-conscious and straightforward to maintain.
No telemetry, paid service, automatic deployment or mandatory runtime server.
Repository policy applies to maintainers; packaged skills adapt to their consumers'
actual instructions and permissions rather than importing this repository's policy.

## Structure and sources of truth

- `skills/agentic-skills-*/`: canonical skill instructions, resources and helpers.
- `catalog.json`: package identities, licences, versions and migration mapping.
- `AGENTS.md`: maintainer entry point and mandatory publication constraints.
- `docs/public-repository-policy.md`: public-data rules and incident handling.
- `tools/`: library validation, isolated test execution and release packaging.
- `.github/workflows/quality.yml`: automated checks, not a compatibility guarantee.
- `.agents/project.json`: role map and specific review evidence.
- `docs/tasks/`: repository-owned implementation/maintenance work.
- `docs/architecture/decisions/`: lasting decisions and their rationale.

The library uses the agentic-codebase minimal profile. Brief, architecture,
technology and workflow intentionally share this document. The skill directory is
`skills/`, not `.agents/skills`: these are distribution packages, not automatically
active maintainer skills. Do not install a second authoritative copy here.

## Technology and verification

Python 3.10+ and standard-library package helpers are retained. Library maintenance
requires Python 3.11+ because skills-ref requires it. Library tooling uses pinned
PyYAML for actual YAML parsing and skills-ref for format validation. Browser capture
dependencies remain optional in the SVG package. Gitleaks provides independent
credential detection; lightweight privacy checks cover additional publication rules.

Run `python tools/run_checks.py` from the root. Package suites run in separate
processes. Run `python tools/check_library.py --staged` before committing and
`python tools/check_library.py --history` plus redacted Gitleaks before publication.
Inspect every new binary and final diff. See CONTRIBUTING.md for optional hooks
and the release command. Existing SEO/SVG checksum inventories are updated only
after content is final; checksums detect changes, not authenticity.

## Scope and maintenance

Use task records for substantial changes, without duplicating an external tracker.
Refresh official source claims when affected APIs/policies change. Review sources
quarterly and after host or major model changes; no unattended schedule is implied.
Keep structural, helper, host-discovery, behavioural and visual checks distinct.
Record only actual executions. A scenario catalogue is not a model benchmark.

The library has no application deployment. Public push, release publication and
history rewrites remain explicit operations. Update affected adapters, examples,
tests, manifests, catalogue and migration notes together. See verification.md for
the current evidence and limitations.

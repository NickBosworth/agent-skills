---
kind: adr
id: ADR-0002
status: accepted
decision_key: seo-workbench-product
scope: products/seo-workbench
supersedes: []
superseded_by: null
---
# Isolated, local-first SEO Workbench

## Context and decision

On 2026-10-11 the user authorized research, implementation, testing and integration
of an executable open-source SEO product alongside the eight skills. Publication,
paid services, private accounts and production website changes are excluded.
The worktree was clean before implementation.

Use `products/seo-workbench/` for an independently versioned MIT product. Keep
`skills/` for installable guidance and `tools/` for library quality/release helpers.
No wholesale restructure, second skill copy, root JavaScript workspace or automatic
product installation is needed. The skill-only release remains unchanged.

Choose a TypeScript modular monolith on Node 24.15+ within the 24.x line, built-in
SQLite, Cheerio HTML extraction, safe XML parsing, Zod schemas, ipaddr.js network
classification, robots-parser, optional Playwright and official MCP v2 SDK.
Keep runtime-generated private state outside the source checkout. One domain
engine owns rules/evidence; CLI, HTTP UI, exports and stdio MCP adapt it.
Use a static semantic HTML/CSS/JavaScript UI: this data-oriented local tool needs
no framework runtime or cloud service. Future UI complexity can justify one.

## Alternatives and consequences

Putting the runtime inside the SEO skill breaks independent installation and
adds dependencies to guidance users. Root `tools/` obscures the product boundary.
Python-only HTTP tooling simplifies library integration but complicates browser/MCP
interoperability; a separate Node runtime preserves both sets of checks.

Crawlee provides established orchestration, but its defaults do not supply this
product's connection-boundary policy and immutable evidence ledger. Defer it rather
than adopting experimental adaptive rendering that silently changes coverage.
No Redis, containers for core HTTP, SaaS tenancy or hosted AI is required.

HTTP connections resolve and pin validated addresses per connection. Robots fetches
and redirect hops share the transport. Browser execution defaults to local sandboxed Chromium with a fresh session and
host-brokered page requests. The user explicitly accepted this simpler boundary on
2026-10-12, then requested complete removal of container execution. The product now
has no image settings, container launcher, build definition or container CI job.
Local request routing is not a firewall or a separate filesystem/resource boundary.
This is a development preview,
not a completed release or complete fulfilment of the end product brief.

## Revisit when

Browser egress isolation is demonstrably enforced, retained inventories exceed
measured memory/storage limits, additional runtimes/platforms pass distribution
checks, or UI complexity warrants a framework. Source changes require reviewed
versioned rules; the source register is a snapshot, not perpetual verification.

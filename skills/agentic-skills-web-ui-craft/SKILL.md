---
name: agentic-skills-web-ui-craft
description: Design, implement, audit, repair and polish web interfaces without generic AI-generated UI mistakes. Use for web UI work, frontend reviews, dashboards, forms, landing pages, ecommerce, responsive design, visual hierarchy, accessibility, interaction completeness, or requests to remove AI slop. Grounds decisions in the existing product and user task; preserves legitimate styles; verifies real states and outcomes. Not an AI-authorship detector, a brand replacement mandate, or a substitute for a full security or accessibility audit.
license: CC0-1.0
compatibility: Framework-neutral. Repository access is useful; a browser is needed for rendered verification. No mandatory MCP, network service, or build dependency.
metadata:
  version: "2.0.0"
  research-date: "2026-10-10"
---

# Web UI Craft

Build interfaces that are appropriate, specific, coherent, operable and verified. Do not merely make a screenshot resemble a fashionable website. A conventional design can be excellent; an original-looking design can still be unusable.

## Non-negotiable guardrails

- Respect the user's brief, authorized scope, existing business rules, design system and repository instructions. This skill does not authorize deployment, destructive actions, new paid services, security bypasses or broad rewrites.
- A smell is a diagnostic hypothesis, not proof that AI wrote the interface. Report the concrete problem and user impact, never an invented probability of AI authorship.
- Do not ban fonts, colors, gradients, rounded corners, cards, animation, whitespace, dense layouts, Tailwind, shadcn/ui or any other library. Require a contextual reason, correct execution and actual testing. Do not replace one template with another anti-template aesthetic.
- Do not invent public testimonials, logos, ratings, metrics, functionality, business rules, research findings, performance results or verification evidence. Clearly identify sample content and simulated behavior.
- Do not change tests, reference screenshots or accepted requirements merely to conceal a regression. Explain conflicts; obtain an authorized decision before changing the contract.
- Prefer native semantics and established project primitives. Visual polish never excuses a blocked task, misleading result, inaccessible critical interaction or unsafe data handling.
- A saved screenshot is not an inspected screenshot. A successful build is not proof of usability. Automated accessibility checks do not establish full conformance. “AAA-grade” describes an ambition for craft, not a WCAG AAA certification.

## Choose the work mode

**Create:** derive a suitable direction and implement a complete representative flow before expanding.
**Audit:** inspect and report; do not edit unless authorized. Prioritize evidence-backed findings.
**Repair:** make the smallest coherent changes that resolve confirmed defects while preserving accepted behavior and identity.
**Polish:** improve hierarchy, composition, typography, content and consistency inside the accepted scope; do not quietly rebuild the product.

Also declare the delivery level: static concept, interactive prototype, integrated feature or production candidate. Never silently promote a prototype to a production claim.

## Load only the relevant references

Do not load the whole package by default. Start with the workflow and the profile that matches the task, then load the affected smell families and supporting guide. All paths are relative to this skill folder.

| Need | Read |
|---|---|
| Discovery, decisions and safe change scope | [Context and workflow](references/context-and-workflow.md) |
| Page-type and audience fit | [Product profiles](references/product-profiles.md) |
| Composition, personality and visual critique | [Visual direction](references/visual-direction.md) |
| States, forms, navigation and recovery | [Interaction contracts](references/interaction-contracts.md) |
| Accessible implementation and precise thresholds | [Accessibility](references/accessibility.md) |
| Viewports, real content and localization | [Responsive and content](references/responsive-and-content.md) |
| Integration, maintainability and performance | [Engineering](references/engineering.md) |
| Evidence, severity, gates and stopping | [Verification](references/verification.md) |
| Observable defects across all families | [Diagnostic examples](references/diagnostics.md) |
| Evidence boundaries and provenance | [Research notes](references/research-notes.md) |
| Copyable working artifacts | [Brief](assets/templates/design-brief.md), [state contract](assets/templates/interaction-contract.md), [audit](assets/templates/audit.md), [evidence matrix](assets/templates/evidence-matrix.md) |
| Repairs and invocations | [Worked examples](examples/worked-examples.md), [prompts](examples/prompts.md) |
| Skill quality checks | [Evaluation protocol](evals/README.md), [scenarios](evals/scenarios.json) |

## Workflow

### 1. Inspect before asking or styling

Identify the target routes/screens, users, primary task, constraints and completion boundary. Read current instructions, relevant rules/acceptance criteria, research, glossary, tokens, components, sibling screens, routes, data contracts, tests and dependency manifests. Look for existing UX/design documentation without requiring a particular filename.

Run the application through its documented commands when possible. Capture the current state and one primary task. Do not alter unrelated work. When only screenshots are supplied, limit findings to what they reveal; ask for or record missing behavioral evidence without inventing it.

Produce a compact working brief: **user and task; delivery level; existing constraints; current evidence; supported devices/inputs; accepted direction; unknowns.** Reuse existing records instead of creating competing sources of truth.

### 2. Resolve consequential uncertainty

First try repository and supplied evidence. When a material choice remains unresolved, ask **one question at a time** using:

1. **Why this matters:** the decision and its user consequence.
2. **What already exists:** observed behavior and evidence; distinguish the reason known from history from a reason merely inferred.
3. **Options:** normally at least three genuinely viable choices, with one recommended and a clear justification. If fewer exist, explain why; never manufacture bad choices to fill a quota.
4. **Tradeoffs:** compatibility, accessibility, maintenance and long-term impact.
5. **The question:** one plain-language decision.

Do not ask for facts already available. Make reversible low-risk assumptions explicit and continue within scope. Missing visual preferences do not justify stalling. A conflict with authoritative rules or a consequential permission boundary does require an explicit decision; do not silently rewrite the rule.

### 3. Establish direction before detailed code

Select the product profile. Define the primary reading order, action hierarchy, density, content model and appropriate expression of identity. Where direction is genuinely open, compare two or three short **structurally different** options, not palette swaps. Do not force options for a faithful implementation of an approved reference.

Record the chosen rationale and a small role-based token plan using the existing system. Specify what stays familiar and where the product is distinctive. Use representative content and approved assets. Reject designs that change only the brand name yet still claim to be tailored.

Check both extremes: generic defaults without a reason, and novelty without a user benefit. Do not use “premium” as a substitute for a design decision.

### 4. Specify the behavior before celebrating the surface

For each important control, define **trigger → pending state → authoritative outcome → feedback → failure/recovery → focus/scroll → persistence**. Inventory applicable empty, no-results, loading, partial, offline, permission, expired-session, invalid, success and destructive states. Mark inapplicable states with a reason.

Treat missing, zero, stale, estimated and failed data as different concepts. Define selection, sorting, filtering and pagination scope. Keep browser Back, deep links and refresh in the contract when relevant.

### 5. Implement one complete slice, then extend

Use the existing stack and component primitives. Complete one representative end-to-end flow with real or explicitly declared fixture data, including an important failure/recovery path and narrow-screen behavior. Preserve authoritative validation and permissions.

Review that slice before repeating its structure across pages. Share genuine patterns, not accidental resemblance. Avoid broad framework changes, duplicated primitives, global CSS patches and fabricated services. Implement approved follow-on work in the current task instead of only announcing it.

### 6. Review in separate passes

**Task and truth:** correct job, real claims, accurate data and meaningful outcomes.
**Composition and identity:** reading order, grouping, density, typography, assets and justified visual language.
**Behavior and inclusion:** all applicable states, keyboard, focus, touch, semantics, contrast and recovery.
**Resilience and implementation:** content stress, viewports, themes, localization, performance, runtime errors and maintainability.

Use the relevant smell IDs to make findings traceable. A finding needs a location/state, observable evidence, user cost, severity, recommended repair and verification step. A stylistic dislike without contextual impact is not automatically a defect.

### 7. Render, exercise, inspect and recheck

Run available build/type/lint and relevant test commands. In an authorized sandbox, exercise the main flow and recovery, inspect the rendered UI at suitable widths, and check keyboard/focus plus applicable accessibility and runtime behavior. Inspect screenshots yourself when a vision-capable tool is available; otherwise mark visual review unperformed.

Use deterministic fixtures and stable screenshot conditions. Browser emulation is useful but does not prove real-device or assistive-technology behavior. Do not claim production field performance from laboratory measurements. Never run destructive or costly tests against live customer data.

Fix the highest-impact confirmed issues and repeat the affected tests plus nearby regression cases. Do not automatically replace snapshots. Stop when the agreed scope is verified, no unresolved blockers remain, and remaining lower-priority risks or unavailable checks are explicit—not when an aesthetic score sounds impressive.

### 8. Deliver an evidence-based handoff

Summarize the result, preserved constraints, consequential decisions and changes. List completed checks with scope/results, remaining findings, accepted exceptions and checks not run. Identify the next concrete blocker only when one remains; do not promise background completion.

For an audit, lead with ranked findings and specific repairs. For implementation, lead with the completed user outcome and changed files. A no-findings result is valid when supported; do not invent defects to fill a checklist.

## Tool boundaries

Use the project's existing build, browser and accessibility tools. This package has
no bundled crawler, browser probe, scoring engine or mandatory runtime dependency.
Load the verification reference for scoped checks. Unavailable tools mean an explicit
verification limit; they never justify inventing a pass. Library packaging checks
run in the maintainer repository and do not certify a consumer's UI.

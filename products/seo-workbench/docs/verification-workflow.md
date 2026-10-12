# Verify a fix with fresh page evidence

A saved comparison describes what changed between two analyses. A recheck plan also
records which pages need new evidence, why they are included, how old the evidence
may be and whether dependencies or new problems prevent verification. Neither path
establishes search indexing, rankings, traffic changes or a common source-code cause.

In Actions, choose **Plan a recheck** for a finding group. Review its explanation,
page list and unavailable dependencies before choosing **Start this recheck**. The
new crawl becomes a separate audit in the same project. After it finishes, select
that audit, open Compare, expand the saved plan and choose **Check the selected audit
against this plan**. The plan and each evaluation are retained as separate records.
No website change, issue, pull request, deployment or provider transfer is performed.

The same workflow is available through the CLI:

```sh
node dist/cli.js plan-verification BASELINE_AUDIT GROUP_ID --data /path/to/private-state
node dist/cli.js start-verification PLAN_ID --data /path/to/private-state
node dist/cli.js status NEW_AUDIT --data /path/to/private-state
node dist/cli.js evaluate-verification PLAN_ID NEW_AUDIT --data /path/to/private-state
```

Supply operator permissions, including exact development origins and browser
resource origins, to the process that starts the run. A saved plan cannot
add private-network permission or choose executable code. The programmatic API uses
`Workbench.planVerification`, `startVerification` and `evaluateVerification`.
MCP keeps the existing `verify_audit` tool: its default action remains a full crawl;
`action: "plan"` accepts `auditId` and `groupId`, `"start"` accepts `planId`, and
`"evaluate"` accepts `planId` and `afterId`. Read saved records through the
`audit_results` `verification` view. Tool outputs retain the existing size limits.

## What the planner includes

Page checks include affected URLs, recorded inbound relationships and other known
URLs in the same explicitly declared template. Relationship checks also include
recorded destinations, required canonical/alternate destinations, HTTP canonical
references and known canonical, alternate and redirect chains. Newly discovered
relationships can remain outside the plan; they require an expanded plan or a full
crawl. The planner never treats an unclassified page as proof of a shared template.

Inventory-wide checks, including duplicates, observed orphans and sitemap membership,
use a full fresh crawl. A dependency set larger than the targeted allowance also
uses a full crawl. Saved page, discovery, time, request, render and storage limits
are preserved. A tight budget can still produce a partial run and prevent verification.
The plan adds recorded dependencies to the full run's explicit inventory when they
fit its admitted inventory bound. If a larger set cannot all be explicitly queued,
missing fresh dependencies still prevent a successful verification decision.

A targeted run uses `recheckUrls` to limit collection. Other discovered URLs remain
visible as excluded by that selection. Robots permissions and redirect/network policy
still apply. Its sitemap, duplicate and orphan outcomes remain not tested because
that run lacks inventory-wide evidence. Completion means collection and analysis of
the planned scope finished; it does not mean the entire website was crawled.

## Freshness and the result

No older observation is copied into the newer audit. Older evidence stays in the
baseline, whose analysis ID, retained count and timestamp range are recorded in the
plan. Reanalysing old captures does not fetch new pages and cannot verify a fix.
Unchanged HTML does not allow an old browser observation to be relabelled as fresh;
rendering is performed under the saved none/auto/all policy, and missing requested
render evidence remains incomplete.

Evaluation requires the correct project and exact planned configuration, a completed
newer analysis under the same ruleset, newly identified observations, fresh request
and capture timestamps, and the planned dependencies. The default maximum age is
86,400 seconds; API/MCP callers can choose a smaller whole-number allowance from
1 to 86,400 seconds when planning. Future, missing or expired timestamps do not pass.
A changed baseline analysis makes its plan stale. For an older ruleset, choose
**Check saved evidence again** before planning; that creates a new baseline analysis
and retains earlier versions. Built-in adapters do not verify custom rulesets.

A selected finding is resolved only by an applicable fresh pass under the same rule
version. Missing, blocked, errored, not-tested and not-applicable outcomes remain
not verifiable. New failures or warnings on previously passing rechecked pages are
recorded as introduced regressions and prevent a successful plan result. Findings
without earlier results are labelled newly observed. The wider newer audit remains
available; this is not a certification that no unobserved regression exists.

CLI evaluation exits 0 for a verified plan, 1 for a persisting finding or introduced
regression, and 4 when required evidence cannot be verified. Input/tool errors use
the existing error exit policy. Private JSON/HTML/Markdown reports retain verification
records in technical details; deliberately shareable profiles omit their identifiers,
URLs, page evidence and project-specific expectations. CSV remains individual crawl
check results. Deleting either referenced audit removes its related verification
records; project deletion and explicit retention follow the same private-data policy.

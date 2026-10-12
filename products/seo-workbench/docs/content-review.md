# Content decisions and editorial drafts

Start by reading the collected page and any imported first-party query observations.
Matching words suggest topics; they do not prove intent, unmet demand, business
value or harmful overlap between pages. Review whether to improve an existing page,
consider consolidation, propose a distinct page or reject an idea. Nothing in this
workflow publishes content or changes an audit requirement or finding.

The Content view records the owner's audience, intent, original contribution,
success measures and rationale. Optional reviewed topic and content-group labels
correct the content inventory. The most recent decision for the same captured page
appears in the view and private reports. Collected words, page evidence and SEO
analysis versions remain unchanged. A decision belongs to its audit and observation;
it is not carried to a different crawl as a verified fact.

Choose **Include a complete editorial draft** to record existing pages reviewed,
facts with source addresses, proposed headings, terminology, internal links, review
requirements and constraints to preserve. Source rows can be added or removed; at
least one is required. The draft uses the audience, original contribution and success
measures already entered above. Each referenced existing page must have successful
saved HTML evidence in this audit's approved scope. Internal links must stay in that
scope. External source references are allowed, but no source is fetched automatically.
No new permission or account access follows from a reference.

A new-page proposal also requires a distinct reader need that the reviewed existing
pages do not answer. Selecting that decision enables and requires the full draft.
This records the owner's judgment; it does not prove the need, source claims or
content quality. A complete draft still needs the recorded reviews before publication.
Include qualified subject review where health, finances or safety are involved.
Prefer improving an existing page or rejecting an idea when a distinct need has not
been established. Do not turn word clusters into mass-produced page proposals.

The API exports `ContentReviewSchema` and `ContentBriefSchema`; the CLI accepts the
same input through `review-content FILE`. The HTTP Content form uses the same engine.
MCP reads drafts through `audit_results` content/content-reviews views; it cannot
approve publication or expand scope. A synthetic complete draft is:

```json
{
  "auditId": "00000000-0000-4000-8000-000000000001",
  "url": "https://www.example.com/product",
  "evidenceIds": ["00000000-0000-4000-8000-000000000002"],
  "decision": "create-distinct",
  "rationale": "The existing overview does not explain the first setup task.",
  "ownerRole": "content editor",
  "topic": "First setup",
  "cluster": "Getting started",
  "intent": "Complete a first setup",
  "audience": "New users",
  "originalContribution": "Original worked examples verified by the maintainer",
  "successMeasures": "Review reader comprehension and task completion",
  "brief": {
    "distinctUnmetNeed": "The overview explains warranty but not the first setup task.",
    "reviewedExistingPages": ["https://www.example.com/product"],
    "factsAndSources": [
      {
        "claim": "The fictional product has an owner-defined setup sequence.",
        "sourceURL": "https://www.example.com/editorial-source"
      }
    ],
    "proposedStructure": ["Before you start", "Complete the setup"],
    "terminology": ["setup"],
    "internalLinks": ["https://www.example.com/product"],
    "reviewRequirements": [
      "The maintainer verifies every instruction before publication."
    ],
    "protectedConstraints": "Preserve existing routes, warranty and accessible controls."
  }
}
```

Replace the synthetic identifiers with the selected private audit evidence. Maximum
arrays and field lengths are defined by the exported schemas. Empty or whitespace-only
new draft fields are refused; short meaningful text in other languages is supported.
Only HTTP(S) references without embedded credentials are accepted. Invalid or stale
evidence and failed saves cannot leave a partial decision. Saving inside another
caller's database transaction is refused without cancelling that transaction.

Older decisions without a draft remain readable and explicitly incomplete, including
historical new-page proposals. Reanalysis cannot invent a missing editorial draft.
New proposals to create a distinct page require the current draft/need contract;
existing quick improve/consolidate/reject decisions remain compatible but incomplete.
Private reports retain drafts and source references; shareable reports omit them.
Confirmed audit deletion/retention removes selected decisions, while backups and
copied private reports keep their own contents.

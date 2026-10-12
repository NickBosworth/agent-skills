/** Example owner-specific facts; no ranking or completeness claim is made. */
import type { TrustedExtractor } from "../src/index.ts";
export const supportLinkFacts = {
  definition: {
    id: "owner-support-links",
    version: "1.0.0",
    title: "Owner support-link facts",
    prerequisite: "html",
    basis:
      "The owner wants to inspect links to /help in the captured initial HTML. This records facts, not a general SEO requirement.",
    sourceIds: [],
  },
  extract(page) {
    const support = new URL("/help", page.finalUrl).href;
    return {
      status: "observed",
      facts: {
        supportPage: support,
        supportLinkPresent: page.facts!.edges.some(
          (edge) =>
            ["hyperlink", "navigation"].includes(edge.kind) &&
            edge.target === support,
        ),
      },
      reason:
        "The initial HTML link facts were inspected. Browser changes and pages outside this capture are not covered.",
    };
  },
} satisfies TrustedExtractor;

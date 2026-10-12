/** Example owner requirement, not a general SEO ranking rule. */
import type { RuleDefinition, TrustedRule } from "../src/index.ts";

export const supportNavigation = {
  definition: {
    id: "owner-support-navigation",
    version: "1.0.0",
    title: "Support link required by the owner",
    sourceIds: [],
    skillIds: [],
    basis:
      "The site owner requires a link to /help on these pages. This is a project requirement, not a search-engine rule.",
    severity: "medium",
    remediation:
      "Add the owner's support link to the shared navigation while preserving existing navigation and accessibility.",
    verification:
      "Fetch the page again and confirm the link leads to the owner's /help page.",
    prerequisite: "html",
  } satisfies RuleDefinition,
  evaluate: ((page, context) => {
    const expected = new URL("/help", page.url).href;
    if (context.config.render !== "none" && page.render?.status !== "observed")
      return {
        outcome: "not-tested",
        observed: page.render?.status ?? null,
        expected,
        reason:
          "The requested browser evidence is unavailable. Check the page again in the configured browser environment.",
      };
    const facts =
      page.render?.status === "observed"
        ? (page.render.facts ?? page.facts)
        : page.facts;
    const found = Boolean(
      facts?.edges.some(
        (edge) =>
          ["hyperlink", "navigation"].includes(edge.kind) &&
          edge.target === expected,
      ),
    );
    return {
      outcome: found ? "pass" : "fail",
      observed: { supportLinkPresent: found },
      expected,
      reason: found
        ? "The collected page includes the support link required by the owner."
        : "The collected page has no link to the support page required by the owner. Confirm the requirement before changing the shared navigation.",
    };
  }) satisfies TrustedRule,
};

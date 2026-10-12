/** Deterministic rules with explicit prerequisites. Source-backed does not mean certified. */
import { explainError } from "./messages.ts";
import { readFileSync } from "node:fs";
import { z } from "zod";
import {
  featureFields,
  structuredTextClaims,
  productVariantReview,
} from "./structured-features.ts";
import { structuredVocabulary } from "./schema-review.ts";
import { populatedDetails, schemaNodes } from "./schema.ts";
import {
  headerCanonicals,
  headerNoindex,
  languageAlternates,
} from "./response-directives.ts";
import {
  contractFor,
  hash,
  RULESET,
  type Config,
  type Observation,
  type Outcome,
  type RuleResult,
  type Facts,
} from "./domain.ts";

export interface RuleDefinition {
  id: string;
  version: string;
  title: string;
  sourceIds: string[];
  skillIds: string[];
  basis: string;
  severity: RuleResult["severity"];
  remediation: string;
  verification: string;
  prerequisite: string;
  verificationScope?: "page" | "relationships" | "inventory";
}
export const rules: RuleDefinition[] = JSON.parse(
  readFileSync(new URL("../data/rules.json", import.meta.url), "utf8"),
);
export interface RuleContext {
  config: Config;
  observations: Observation[];
  sitemapUrls: Set<string>;
  inventoryUrls: Set<string>;
  byUrl?: Map<string, Observation>;
  byText?: Map<string, string[]>;
  inlinks?: Map<string, string[]>;
}
type Evaluation = {
  outcome: Outcome;
  observed: unknown;
  expected: unknown;
  reason: string;
  denominator?: number;
};
export type TrustedRule = (
  observation: Observation,
  context: RuleContext,
) => Evaluation;
const extensionDefinition = z.strictObject({
  id: z.string().regex(/^[a-z][a-z0-9-]{0,100}$/),
  version: z.string().min(1).max(100),
  title: z.string().min(1).max(200),
  sourceIds: z.array(z.string().min(1).max(200)).max(50),
  skillIds: z.array(z.string().min(1).max(200)).max(50),
  basis: z.string().min(1).max(2000),
  severity: z.enum(["high", "medium", "low", "info"]),
  remediation: z.string().min(1).max(3000),
  verification: z.string().min(1).max(3000),
  prerequisite: z.enum(["html", "document", "response"]),
  verificationScope: z
    .enum(["page", "relationships", "inventory"])
    .default("inventory"),
});
const extensionEvaluation = z
  .strictObject({
    outcome: z.enum([
      "pass",
      "fail",
      "warning",
      "not-applicable",
      "not-tested",
      "blocked",
      "error",
    ]),
    observed: z.json(),
    expected: z.json(),
    reason: z.string().min(1).max(10000),
    denominator: z.number().finite().nonnegative().optional(),
  })
  .refine(
    (result) =>
      result.outcome !== "pass" ||
      (result.observed !== null && result.observed !== undefined),
  );
const noindex = (
  facts: Facts | null,
  headers: Record<string, string> = {},
  fields?: string[],
) =>
  headerNoindex(facts?.robots ?? []) ||
  headerNoindex(fields ?? [headers["x-robots-tag"] ?? ""]);
const declarations = (o: Observation, facts = activeFacts(o)) => {
  const header = headerCanonicals(o.response?.headers.link, o.finalUrl);
  return {
    targets: [...new Set([...(facts?.canonical ?? []), ...header.targets])],
    complete: header.complete,
  };
};
const activeFacts = (o: Observation) =>
  o.render?.status === "observed" ? (o.render.facts ?? o.facts) : o.facts;
const indexingUnknown = (o: Observation, facts = activeFacts(o)) =>
  o.response?.robotsTags === undefined &&
  !noindex(facts, o.response?.headers) &&
  (o.response?.headers["x-robots-tag"] ?? "").includes(":") &&
  /,\s*(?:noindex|none)\b/i.test(o.response?.headers["x-robots-tag"] ?? "");
const pass = (
  observed: unknown,
  expected: unknown,
  reason: string,
): Evaluation => ({ outcome: "pass", observed, expected, reason });
const evaluate: Record<string, TrustedRule> = {
  "navigation-contract": (o, c) => {
    const required = contractFor(c.config, o.url)?.requiredLinks ?? [];
    if (!required.length)
      return {
        outcome: "not-applicable",
        observed: null,
        expected: null,
        reason:
          "The project does not specify which links this page must contain.",
      };
    if (c.config.render !== "none" && o.render?.status !== "observed")
      return {
        outcome: "not-tested",
        observed: o.render?.status ?? null,
        expected: required,
        reason:
          "The requested browser check did not complete, so we cannot establish whether the required links are missing.",
      };
    const links = activeFacts(o)!
        .edges.filter((e) => ["hyperlink", "navigation"].includes(e.kind))
        .map((e) => e.target),
      missing = required.filter((url) => !links.includes(url));
    return {
      outcome: missing.length ? "fail" : "pass",
      observed: { missing, links },
      expected: required,
      reason:
        "This checks whether the required links appear in the collected page. Destination availability is checked separately.",
      denominator: required.length,
    };
  },
  "alternate-contract": (o, c) => {
    const required = contractFor(c.config, o.url)?.requiredAlternates ?? [];
    if (!required.length)
      return {
        outcome: "not-applicable",
        observed: null,
        expected: null,
        reason: "The project does not specify required language alternatives.",
      };
    if (c.config.render !== "none" && o.render?.status !== "observed")
      return {
        outcome: "not-tested",
        observed: o.render?.status ?? null,
        expected: required,
        reason: "The requested browser evidence is unavailable.",
      };
    const actual = activeFacts(o)!.edges.filter((e) => e.kind === "alternate"),
      missing = required.filter(
        (a) =>
          !actual.some(
            (e) =>
              e.target === a.target &&
              e.language?.toLowerCase() === a.language.toLowerCase(),
          ),
      );
    return {
      outcome: missing.length ? "fail" : "pass",
      observed: { missing, actual },
      expected: required,
      reason:
        "This checks the declared language alternatives against your requirements. It does not establish that the content suits each language or market, or which page a search engine will choose.",
      denominator: required.length,
    };
  },
  "structured-contract": (o, c) => {
    const required =
      contractFor(c.config, o.url)?.requiredStructuredTypes ?? [];
    if (!required.length)
      return {
        outcome: "not-applicable",
        observed: null,
        expected: null,
        reason: "The project does not specify required structured-data types.",
      };
    const f = activeFacts(o)!;
    if (
      f.jsonldErrors ||
      (c.config.render !== "none" && o.render?.status !== "observed")
    )
      return {
        outcome: "not-tested",
        observed: {
          parseErrors: f.jsonldErrors,
          render: o.render?.status ?? null,
        },
        expected: required,
        reason:
          "The page data could not be read, or the requested browser check did not complete.",
      };
    const data = schemaNodes(f.jsonld, f.documentBase ?? o.finalUrl),
      types = data.nodes.flatMap((n) => n.types),
      missing = required.filter((type) => !types.includes(type));
    return {
      outcome: missing.length
        ? data.unresolvedContext || data.truncated || f.microdata || f.rdfa
          ? "not-tested"
          : "fail"
        : "pass",
      observed: {
        types,
        missing,
        unresolvedContext: data.unresolvedContext,
        truncated: data.truncated,
      },
      expected: required,
      reason:
        "This checks for recognised Schema.org type names. It does not resolve custom name mappings or establish eligibility for a search feature.",
      denominator: required.length,
    };
  },
  "google-product-basics": (o, c) => {
    if (
      !contractFor(c.config, o.url)?.googleFeatures.includes("product-snippet")
    )
      return {
        outcome: "not-applicable",
        observed: null,
        expected: null,
        reason:
          "The project does not require Google Product snippet fields. An ecommerce page does not automatically need this markup.",
      };
    const f = activeFacts(o)!;
    if (
      f.jsonldErrors ||
      (c.config.render !== "none" && o.render?.status !== "observed")
    )
      return {
        outcome: "not-tested",
        observed: {
          parseErrors: f.jsonldErrors,
          render: o.render?.status ?? null,
        },
        expected: "complete selected structured data observation",
        reason:
          "The page data could not be read, or the requested browser check did not complete.",
      };
    const data = schemaNodes(f.jsonld, f.documentBase ?? o.finalUrl),
      products = data.nodes.filter((n) => n.types.includes("Product"));
    if (!products.length)
      return {
        outcome:
          data.unresolvedContext || data.truncated || f.microdata || f.rdfa
            ? "not-tested"
            : "warning",
        observed: [],
        expected:
          "Product with name and at least one offers/review/aggregateRating property",
        reason:
          "This checks only the selected basic fields. Where field-name mappings are unknown, we cannot conclude that a field is missing.",
      };
    if (data.truncated || products.some((p) => !p.knownContext))
      return {
        outcome: "not-tested",
        observed: { types: products.flatMap((p) => p.types) },
        expected: "understood Product property context",
        reason:
          "This check cannot resolve custom or remotely defined field names. It cannot determine whether the required properties are missing.",
      };
    const details = products.map((p) => {
      const states = ["offers", "review", "aggregateRating"].map((key) =>
        populatedDetails(
          p.value[key],
          data.nodes,
          f.documentBase ?? o.finalUrl,
        ),
      );
      return states.includes("present")
        ? "present"
        : states.includes("unknown")
          ? "unknown"
          : "empty";
    });
    const invalid = products.filter(
      (p, i) =>
        typeof p.value.name !== "string" ||
        !p.value.name.trim() ||
        details[i] === "empty",
    );
    return {
      outcome: invalid.length
        ? "warning"
        : details.includes("unknown")
          ? "not-tested"
          : "pass",
      observed: products.map((p, i) => ({
        id: p.id,
        name: p.value.name,
        offers: Object.hasOwn(p.value, "offers"),
        review: Object.hasOwn(p.value, "review"),
        aggregateRating: Object.hasOwn(p.value, "aggregateRating"),
        detailStatus: details[i],
      })),
      expected:
        "name and at least one populated offer, review or rating object",
      reason:
        "This checks the name and whether offer, review or rating data is populated. Empty objects and lists do not satisfy this check. Unresolved references need further evidence. Prices, review requirements, policy compliance and agreement with visible content need separate review. A pass does not guarantee a rich result.",
      denominator: products.length,
    };
  },
  "http-status": (o, c) => {
    if (o.error === "robots-excluded")
      return {
        outcome: "not-applicable",
        observed: "excluded by robots policy",
        expected: null,
        reason:
          "The crawl deliberately excluded this page. Its search-engine indexing status is unknown.",
      };
    if (!o.response)
      return {
        outcome: o.error?.includes("blocked") ? "blocked" : "error",
        observed: o.error,
        expected: "successful response",
        reason:
          "The crawler did not receive a complete response from this page.",
      };
    const contract = contractFor(c.config, o.url);
    const bad = o.response.status >= 400;
    return {
      outcome: bad
        ? contract?.indexability === "indexable"
          ? "fail"
          : "warning"
        : "pass",
      observed: o.response.status,
      expected:
        contract?.indexability === "indexable"
          ? "200-series response"
          : "review intended availability",
      reason: bad
        ? "The page was unavailable. Review whether it should be available, removed or private before deciding what to fix."
        : "The page responded successfully. This does not establish whether a search engine has indexed it.",
    };
  },
  "redirect-path": (o) => {
    const redirects = o.attempts.filter(
      (a) => a.status >= 300 && a.status < 400,
    );
    return {
      outcome:
        o.error === "redirect-loop"
          ? "fail"
          : redirects.length > 1
            ? "warning"
            : o.error
              ? "not-tested"
              : "pass",
      observed: redirects.map((a) => ({
        url: a.url,
        status: a.status,
        location: a.headers.location,
      })),
      expected: "no loop; justified destination",
      reason:
        (o.error ? explainError(o.error) : null) ??
        (redirects.length > 1
          ? "The URL redirects more than once. Check whether each step is needed."
          : "The collected request did not pass through multiple redirects."),
    };
  },
  "index-intent": (o, c) => {
    const intent = contractFor(c.config, o.url)?.indexability,
      facts = activeFacts(o)!;
    if (!intent)
      return {
        outcome: "not-tested",
        observed: noindex(facts, o.response?.headers, o.response?.robotsTags),
        expected: null,
        reason:
          "The project does not specify whether this page should be indexable. An exclusion may be intentional.",
      };
    if (indexingUnknown(o, facts))
      return {
        outcome: "not-tested",
        observed: null,
        expected: intent,
        reason:
          "This older capture combined scoped indexing headers. Fetch the page again to distinguish crawler-specific instructions from general instructions.",
      };
    const excluded = noindex(
      facts,
      o.response?.headers,
      o.response?.robotsTags,
    );
    return {
      outcome: excluded === (intent === "excluded") ? "pass" : "fail",
      observed: excluded ? "noindex" : "no noindex observed",
      expected: intent,
      reason:
        "This compares the page’s indexing instructions with your requirements. Its actual search-engine indexing status remains unknown.",
    };
  },
  "initial-noindex-js": (o) => {
    if (indexingUnknown(o, o.facts))
      return {
        outcome: "not-tested",
        observed: null,
        expected: "separate response indexing fields",
        reason:
          "The older capture combined scoped indexing headers. A fresh capture is needed before comparing initial and rendered indexing instructions.",
      };
    if (!o.render || o.render.status !== "observed")
      return {
        outcome: "not-tested",
        observed: o.render?.status ?? "not rendered",
        expected: "matched raw/render observations",
        reason:
          "The browser check was not requested, was blocked or did not complete.",
      };
    const initial = noindex(
        o.facts!,
        o.response?.headers,
        o.response?.robotsTags,
      ),
      rendered = noindex(
        o.render.facts!,
        o.response?.headers,
        o.response?.robotsTags,
      );
    return {
      outcome: initial && !rendered ? "warning" : "pass",
      observed: { initial, rendered },
      expected: "do not rely on JS removing initial noindex",
      reason:
        "The initial request and browser visit may receive different responses. This Chromium check does not establish how Google indexed the page.",
    };
  },
  "canonical-consistency": (o) => {
    const rawDeclarations = declarations(o, o.facts),
      raw = rawDeclarations.targets,
      rendered =
        o.render?.status === "observed"
          ? declarations(o, o.render.facts).targets
          : null;
    return {
      outcome: !rawDeclarations.complete
        ? "not-tested"
        : raw.length > 1
          ? "warning"
          : rendered && JSON.stringify(raw) !== JSON.stringify(rendered)
            ? "warning"
            : raw.length
              ? "pass"
              : "not-applicable",
      observed: { raw, rendered },
      expected: "coherent canonical signals",
      reason: !rawDeclarations.complete
        ? "A response Link header is ambiguous or uses unsupported parameters. Review the original header before deciding whether the declarations agree."
        : !raw.length
          ? "The absence of a preferred-URL declaration does not by itself establish a defect."
          : "These declarations identify the site’s preferred URL. A search engine may choose a different URL.",
    };
  },
  "canonical-target": (o, c) => {
    const declaration = declarations(o),
      declared = declaration.targets;
    if (!declaration.complete)
      return {
        outcome: "not-tested",
        observed: declared,
        expected: null,
        reason:
          "A response Link header could not be fully interpreted. Review it before checking the preferred destination.",
      };
    if (!declared.length)
      return {
        outcome: "not-applicable",
        observed: [],
        expected: null,
        reason: "The page does not declare a preferred URL.",
      };
    const targets = declared.map((url) => c.byUrl!.get(url));
    if (targets.some((t) => t && indexingUnknown(t)))
      return {
        outcome: "not-tested",
        observed: declared,
        expected: "unambiguous indexing instructions",
        reason:
          "A preferred destination has ambiguous scoped headers in an older capture. Fetch it again before verifying its indexing instructions.",
      };
    if (
      targets.some(
        (t) =>
          !t?.response ||
          (/html/i.test(t.response.headers["content-type"] ?? "") && !t.facts),
      )
    )
      return {
        outcome: "not-tested",
        observed: declared,
        expected: "observed successful indexable target",
        reason: "At least one declared preferred URL was not fully checked.",
      };
    const bad = targets.some(
      (t) =>
        t!.response!.status !== 200 ||
        noindex(
          activeFacts(t!)!,
          t!.response!.headers,
          t!.response!.robotsTags,
        ),
    );
    return {
      outcome: bad ? "warning" : "pass",
      observed: targets.map((t) => ({
        url: t!.url,
        status: t!.response!.status,
        noindex: noindex(
          activeFacts(t!)!,
          t!.response!.headers,
          t!.response!.robotsTags,
        ),
      })),
      expected: "successful preferred destination",
      reason:
        "Check the preferred URL’s response and indexing instructions. Keep the source page’s declarations as separate evidence.",
    };
  },
  "canonical-contract": (o, c) => {
    const expected = contractFor(c.config, o.url)?.canonical;
    const declared = declarations(o);
    if (expected && !declared.complete)
      return {
        outcome: "not-tested",
        observed: declared.targets,
        expected,
        reason:
          "A response Link header could not be fully interpreted, so the preferred-URL requirement cannot be verified.",
      };
    return expected
      ? {
          outcome: declared.targets.includes(expected) ? "pass" : "fail",
          observed: declared.targets,
          expected,
          reason:
            "This compares the declared preferred URL with your project requirements.",
        }
      : {
          outcome: "not-applicable",
          observed: null,
          expected: null,
          reason: "The project does not specify a required preferred URL.",
        };
  },
  "title-review": (o, c) => {
    const facts = activeFacts(o)!,
      contract = contractFor(c.config, o.url);
    if (contract?.indexability === "excluded")
      return {
        outcome: "not-applicable",
        observed: facts.title,
        expected: null,
        reason: "This utility page was deliberately excluded.",
      };
    return {
      outcome: contract?.title
        ? facts.title === contract.title
          ? "pass"
          : "fail"
        : facts.title
          ? "pass"
          : "warning",
      observed: facts.title,
      expected:
        contract?.title ?? "useful descriptive title; no rigid length rule",
      reason: contract?.title
        ? "This compares the page title with the title specified in your project requirements."
        : "This check can establish whether a title exists. An editor needs to assess its accuracy and usefulness.",
    };
  },
  "critical-content": (o, c) => {
    const phrases = contractFor(c.config, o.url)?.criticalText ?? [];
    if (!phrases.length)
      return {
        outcome: "not-applicable",
        observed: null,
        expected: null,
        reason: "The project does not specify required page text.",
      };
    if (c.config.render !== "none" && o.render?.status !== "observed")
      return {
        outcome: "not-tested",
        observed: o.render?.status ?? null,
        expected: phrases,
        reason: "The requested browser check did not complete.",
      };
    const facts = activeFacts(o)!,
      snapshot = facts.renderedMainText,
      text = c.config.render !== "none" ? snapshot?.text : facts.text;
    if (
      c.config.render !== "none" &&
      (!snapshot || snapshot.truncated || o.render?.failures?.length)
    )
      return {
        outcome: "not-tested",
        observed: {
          snapshot: Boolean(snapshot),
          truncated: snapshot?.truncated ?? null,
        },
        expected: phrases,
        reason:
          "Complete browser text is needed to check the required phrases. Raw HTML or an older capture without this snapshot cannot substitute for it.",
      };
    const missing = phrases.filter((phrase) => !text?.includes(phrase));
    const incomplete =
      c.config.render === "none" &&
      (facts.textTruncated ||
        (facts.textTruncated === undefined && facts.text.length >= 500000));
    return {
      outcome: missing.length ? (incomplete ? "not-tested" : "fail") : "pass",
      observed: {
        missing,
        textExcerpt: text?.slice(0, 500) ?? null,
        textBasis:
          c.config.render === "none"
            ? "extracted source text"
            : "bounded browser main-text snapshot",
        truncated: Boolean(incomplete),
      },
      expected: phrases,
      reason:
        "This checks the exact phrases approved in the project requirements. A missing phrase in truncated text remains unknown. It does not score content quality or certify all visibility techniques.",
    };
  },
  "language-contract": (o, c) => {
    const expected = contractFor(c.config, o.url)?.language;
    return expected
      ? {
          outcome: activeFacts(o)!.language === expected ? "pass" : "fail",
          observed: activeFacts(o)!.language,
          expected,
          reason:
            "This compares the page’s declared language with your requirements.",
        }
      : {
          outcome: "not-applicable",
          observed: activeFacts(o)!.language,
          expected: null,
          reason:
            "The project does not specify a required language for this page.",
        };
  },
  "sitemap-intent": (o, c) => {
    const expected = contractFor(c.config, o.url)?.sitemap;
    return expected === undefined
      ? {
          outcome: "not-applicable",
          observed: c.sitemapUrls.has(o.url),
          expected: null,
          reason:
            "The project does not specify whether this page must appear in a sitemap.",
        }
      : {
          outcome: expected === c.sitemapUrls.has(o.url) ? "pass" : "fail",
          observed: c.sitemapUrls.has(o.url),
          expected,
          reason:
            "This uses the sitemaps that were successfully retrieved. If a required sitemap is unavailable, the check cannot establish inclusion or exclusion.",
        };
  },
  "broken-links": (o, c) => {
    const links = activeFacts(o)!.edges.filter(
      (e) =>
        ["hyperlink", "navigation"].includes(e.kind) &&
        c.config.origins.includes(new URL(e.target).origin),
    );
    if (!links.length)
      return {
        outcome: "not-applicable",
        observed: [],
        expected: null,
        reason: "No internal page links were found in the collected evidence.",
        denominator: 0,
      };
    const targets = links.map((e) => ({
      edge: e,
      observation: c.byUrl!.get(e.target),
    }));
    const bad = targets.filter(
      (t) => t.observation?.response && t.observation.response.status >= 400,
    );
    const unknown = targets.filter((t) => !t.observation?.response);
    return {
      outcome: bad.length ? "warning" : unknown.length ? "not-tested" : "pass",
      observed: {
        broken: bad.map((t) => ({
          url: t.edge.target,
          status: t.observation!.response!.status,
        })),
        unknown: unknown.map((t) => t.edge.target),
      },
      expected: "intended working destinations",
      reason: bad.length
        ? "Some linked destinations were unavailable. Review whether their removal is intentional and how important they are to visitors."
        : unknown.length
          ? "Some linked destinations could not be fetched."
          : "Observed internal destinations responded",
      denominator: links.length,
    };
  },
  "exact-duplicate": (o, c) => {
    const facts = activeFacts(o)!;
    if (!facts.text)
      return {
        outcome: "not-applicable",
        observed: [],
        expected: null,
        reason:
          "No meaningful main text was collected. Empty pages do not prove duplicate content.",
      };
    const duplicates = (c.byText!.get(facts.textHash) ?? []).filter(
      (url) => url !== o.url,
    );
    return {
      outcome: duplicates.length ? "warning" : "pass",
      observed: duplicates,
      expected: "review content identity and canonical purpose",
      reason:
        "These pages have identical extracted main text. This alone does not establish spam or justify merging them.",
    };
  },
  "product-variant-review": (o, c) => {
    if (c.config.profile !== "ecommerce")
      return {
        outcome: "not-applicable",
        observed: null,
        expected: null,
        reason:
          "The project has not selected the ecommerce profile for this variant review.",
      };
    const facts = activeFacts(o)!;
    if (
      facts.jsonldErrors ||
      (c.config.render !== "none" && o.render?.status !== "observed")
    )
      return {
        outcome: "not-tested",
        observed: {
          parseErrors: facts.jsonldErrors,
          render: o.render?.status ?? null,
        },
        expected: "complete declared product-group evidence",
        reason:
          "The declared group data or requested browser evidence could not be collected completely.",
      };
    const review = productVariantReview(
      facts.jsonld,
      facts.documentBase ?? o.finalUrl,
    );
    return {
      outcome: !review.complete
        ? "not-tested"
        : !review.groups.length
          ? "not-applicable"
          : review.groups.some((group) => group.issues.length)
            ? "warning"
            : "pass",
      observed: review,
      expected:
        "consistent selected identifiers and variation dimensions in declared groups",
      reason:
        "This reviews declared group and variant identifiers in the collected page. Off-page variant stubs need separate observations. Do not add a product group merely because a store has an ecommerce profile.",
      denominator: review.groups.length,
    };
  },
  "google-feature-fields": (o, c) => {
    const features = contractFor(c.config, o.url)?.googleFeatures ?? [];
    if (!features.length)
      return {
        outcome: "not-applicable",
        observed: null,
        expected: null,
        reason:
          "The owner has not selected a Google structured-data feature for this page.",
      };
    const facts = activeFacts(o)!;
    if (
      facts.jsonldErrors ||
      (c.config.render !== "none" && o.render?.status !== "observed") ||
      (!facts.jsonld.length && (facts.microdata || facts.rdfa))
    )
      return {
        outcome: "not-tested",
        observed: {
          parseErrors: facts.jsonldErrors,
          render: o.render?.status ?? null,
        },
        expected: features,
        reason:
          "The selected structured-data format or requested browser evidence could not be fully interpreted.",
      };
    const reviews = featureFields(
      facts.jsonld,
      facts.documentBase ?? o.finalUrl,
      features,
    );
    return {
      outcome: reviews.some((review) => review.status === "not-tested")
        ? "not-tested"
        : reviews.some((review) => review.requiredDefect)
          ? "fail"
          : reviews.every((review) => review.status === "not-applicable")
            ? "not-applicable"
            : reviews.some((review) => review.status === "needs-review")
              ? "warning"
              : "pass",
      observed: reviews,
      expected: features,
      reason:
        "This checks selected published field requirements and recommendations. Article recommendations are advisory. A pass does not establish visible accuracy, all provider policies, eligibility or actual display.",
      denominator: reviews.length,
    };
  },
  "structured-visible-text": (o) => {
    const facts = activeFacts(o)!,
      review = structuredTextClaims(
        facts.jsonld,
        facts.documentBase ?? o.finalUrl,
      );
    if (
      !review.claims.length &&
      !review.deferredClaims.length &&
      review.complete &&
      !facts.jsonldErrors
    )
      return {
        outcome: "not-applicable",
        observed: null,
        expected: null,
        reason:
          "No understood Product, Article or Local Business name or headline was collected for this text review.",
      };
    const snapshot = facts.renderedPageText;
    if (
      facts.jsonldErrors ||
      !review.complete ||
      o.render?.status !== "observed" ||
      !snapshot ||
      snapshot.truncated ||
      o.render.failures?.length
    )
      return {
        outcome: "not-tested",
        observed: {
          claims: review.claims.length,
          render: o.render?.status ?? null,
          truncated: snapshot?.truncated ?? null,
        },
        expected: "complete rendered page-text snapshot",
        reason:
          "A complete browser text observation is needed to review these claims. Raw HTML text and older captures without this snapshot cannot establish that a reader could see them.",
      };
    const normalise = (text: string) =>
        text.normalize("NFKC").toLocaleLowerCase().replace(/\s+/g, " ").trim(),
      visible = normalise(snapshot.text),
      missing = review.claims.filter(
        (claim) => !visible.includes(normalise(claim.text)),
      );
    return {
      outcome: missing.length
        ? "warning"
        : review.deferredClaims.length
          ? "not-tested"
          : "pass",
      observed: {
        reviewed: review.claims.length,
        deferredVariantClaims: review.deferredClaims.length,
        notFoundInRenderedPageText: missing,
      },
      expected:
        "declared selected names and headlines represented in observed main text",
      reason:
        "A declared name or headline was compared with the browser text snapshot. Review differences in wording or presentation. Variant names requiring unvisited selection states remain unknown. This does not verify prices, reviews, images, all visibility techniques or factual truth.",
      denominator: review.claims.length,
    };
  },
  "structured-vocabulary": (o, c) => {
    const facts = activeFacts(o)!;
    if (
      facts.jsonldErrors ||
      (c.config.render !== "none" && o.render?.status !== "observed")
    )
      return {
        outcome: "not-tested",
        observed: {
          parseErrors: facts.jsonldErrors,
          render: o.render?.status ?? null,
        },
        expected: "readable collected JSON-LD",
        reason:
          "The JSON could not be read, or the requested browser collection did not complete.",
      };
    if (!facts.jsonld.length)
      return {
        outcome:
          facts.microdata || facts.rdfa ? "not-tested" : "not-applicable",
        observed: null,
        expected: null,
        reason:
          "This vocabulary review reads JSON-LD. Microdata and RDFa semantics are not interpreted by this check.",
      };
    const review = structuredVocabulary(
      facts.jsonld,
      facts.documentBase ?? o.finalUrl,
    );
    return {
      outcome:
        review.unknownTypes.length || review.unknownProperties.length
          ? "warning"
          : !review.complete || !review.typedNodes
            ? "not-tested"
            : "pass",
      observed: review,
      expected: "recognised terms in the pinned Schema.org vocabulary",
      reason:
        "Review names missing from this vocabulary snapshot for spelling mistakes or intentional extensions. A recognised name does not establish correct values, visible truth or search-feature eligibility.",
      denominator: review.typedNodes,
    };
  },
  "jsonld-syntax": (o) => {
    const f = activeFacts(o)!;
    return {
      outcome: f.jsonldErrors
        ? "warning"
        : f.jsonld.length
          ? "pass"
          : "not-applicable",
      observed: {
        blocks: f.jsonld.length,
        parseErrors: f.jsonldErrors,
        microdata: f.microdata,
        rdfa: f.rdfa,
      },
      expected: "valid JSON syntax for declared JSON-LD",
      reason:
        "This checks whether the JSON can be read. It does not validate remote name mappings, all vocabulary, agreement with visible content or eligibility for search features.",
    };
  },
  "image-alt": (o) => {
    const images = activeFacts(o)!.images;
    return {
      outcome: images.some((i) => i.alt === null)
        ? "warning"
        : images.length
          ? "pass"
          : "not-applicable",
      observed: images.filter((i) => i.alt === null).map((i) => i.src),
      expected: "purposeful alternatives or valid decorative empty alt",
      reason:
        "This highlights image alternatives for accessibility review. It does not establish a search-ranking effect or certify accessibility.",
      denominator: images.length,
    };
  },
  "soft404-review": (o) => {
    const f = activeFacts(o)!;
    const candidate =
      o.response?.status === 200 &&
      /^(?:page not found|not found|404)\b/i.test(f.title + " " + f.text);
    return {
      outcome: candidate ? "warning" : "pass",
      observed: {
        status: o.response?.status,
        title: f.title,
        textExcerpt: f.text.slice(0, 250),
      },
      expected: "meaningful intended response",
      reason:
        "The text resembles an error message. A person needs to review it; this does not establish that a search engine considers the page a soft 404.",
    };
  },
  "hreflang-return": (o, c) => {
    const declarations = languageAlternates(
        activeFacts(o),
        o.response?.headers.link,
        o.finalUrl,
      ),
      links = declarations.links.filter((link) => link.target !== null);
    if (!declarations.complete)
      return {
        outcome: "not-tested",
        observed: links,
        expected: "complete language declarations",
        reason:
          "The declarations are malformed, bounded or from an older capture without their original details. Collect the document again before checking return links.",
      };
    if (!links.length)
      return {
        outcome: "not-applicable",
        observed: [],
        expected: null,
        reason: "The page does not declare language alternatives.",
      };
    const known = links.map((e) => ({ e, target: c.byUrl!.get(e.target!) }));
    if (
      known.some(
        ({ target }) =>
          !target?.response ||
          target.response.status !== 200 ||
          (/html/i.test(target.response.headers["content-type"] ?? "") &&
            !activeFacts(target)) ||
          !languageAlternates(
            activeFacts(target),
            target.response.headers.link,
            target.finalUrl,
          ).complete ||
          (!!target.render && target.render.status !== "observed"),
      )
    )
      return {
        outcome: "not-tested",
        observed: links,
        expected: "observed reciprocal alternatives",
        reason:
          "At least one language alternative lacks complete page evidence.",
      };
    const missing = known.filter(
      (t) =>
        !languageAlternates(
          activeFacts(t.target!),
          t.target!.response?.headers.link,
          t.target!.finalUrl,
        ).links.some((e) => e.target === o.url),
    );
    return {
      outcome: missing.length ? "warning" : "pass",
      observed: missing.map((t) => t.e),
      expected: "return links in declared cluster",
      reason:
        "This checks whether the declared alternatives link back. It does not establish correct language routing or translated content.",
    };
  },
  "hreflang-cluster": (o, c) => {
    const declared = languageAlternates(
        activeFacts(o),
        o.response?.headers.link,
        o.finalUrl,
      ),
      issues: { target: string | null; reason: string }[] = [],
      labels = new Map<string, Set<string>>();
    let unknown =
      !declared.complete || (!!o.render && o.render.status !== "observed");
    if (!declared.links.length && !unknown)
      return {
        outcome: "not-applicable",
        observed: [],
        expected: null,
        reason:
          "No language alternatives are declared. Not every page needs them.",
      };
    if (
      declared.links.length &&
      !declared.links.some((link) => link.target === o.url)
    )
      issues.push({
        target: o.url,
        reason: "The declaration set does not include this page itself.",
      });
    for (const link of declared.links) {
      const language = link.language.toLowerCase();
      if (
        !/^(?:x-default|[a-z]{2}(?:-[a-z]{4})?(?:-[a-z]{2})?)$/.test(
          language,
        ) ||
        /-(?:uk|eu|un)$/.test(language)
      )
        issues.push({
          target: link.target,
          reason:
            "The language label has unsupported syntax or a reserved region code. Review the supported ISO codes; this is not a full language registry validation.",
        });
      if (!link.target || !link.absolute || !link.inHead)
        issues.push({
          target: link.target,
          reason:
            "Use a complete HTTP(S) address in the HTML head or response Link header.",
        });
      if (!link.target) continue;
      const assigned = labels.get(language) ?? new Set<string>();
      assigned.add(link.target);
      labels.set(language, assigned);
      const target = c.byUrl!.get(link.target),
        facts = target && activeFacts(target);
      if (
        !target?.response ||
        target.response.status !== 200 ||
        (/html/i.test(target.response.headers["content-type"] ?? "") &&
          !facts) ||
        (!!target.render && target.render.status !== "observed")
      ) {
        unknown = true;
        continue;
      }
      const returns = languageAlternates(
          facts,
          target.response.headers.link,
          target.finalUrl,
        ),
        canonical = declarations(target, facts ?? null);
      unknown ||=
        !returns.complete ||
        !canonical.complete ||
        indexingUnknown(target, facts);
      if (target.finalUrl !== link.target)
        issues.push({
          target: link.target,
          reason: "The declared alternative redirects to a different address.",
        });
      if (
        noindex(
          facts ?? null,
          target.response.headers,
          target.response.robotsTags,
        )
      )
        issues.push({
          target: link.target,
          reason: "The observed alternative asks Google not to index it.",
        });
      if (canonical.targets.some((preferred) => preferred !== link.target))
        issues.push({
          target: link.target,
          reason:
            "The alternative declares another preferred address. Review the language and canonical strategy together.",
        });
      if (!returns.links.some((back) => back.target === o.url))
        issues.push({
          target: link.target,
          reason:
            "The observed alternative does not declare a link back to this page.",
        });
    }
    for (const [language, targets] of labels)
      if (targets.size > 1)
        issues.push({
          target: null,
          reason: `The label ${language} names more than one destination.`,
        });
    return {
      outcome: issues.length ? "warning" : unknown ? "not-tested" : "pass",
      observed: {
        declarations: declared.links,
        issues,
        incompleteEvidence: unknown,
      },
      expected: "consistent, reachable language alternatives with return links",
      reason:
        "This checks observed declarations and destination settings. Language accuracy, official code assignments, sitemap alternatives, location routing and Google's interpretation need separate review. Unknown destinations are not treated as absent.",
    };
  },
  "inventory-orphan": (o, c) => {
    if (!c.inventoryUrls.has(o.url) || c.config.seeds.includes(o.url))
      return {
        outcome: "not-applicable",
        observed: null,
        expected: null,
        reason:
          "This check applies only to pages supplied in the inventory that are not starting URLs.",
      };
    const inlinks = c.inlinks!.get(o.url) ?? [];
    return {
      outcome: inlinks.length ? "pass" : "warning",
      observed: {
        inlinks: inlinks.length,
        inventory: "approved project URL inventory",
      },
      expected: "review link support for important inventory pages",
      reason:
        "No incoming links were found in this audit. Pages that were not crawled may still link here.",
    };
  },
};
/** Trusted code extensions are passed by callers, never loaded from project JSON. */
export function analyze(
  context: RuleContext,
  extensions: { definition: RuleDefinition; evaluate: TrustedRule }[] = [],
): RuleResult[] {
  if (!Array.isArray(extensions) || extensions.length > 100)
    throw new Error("rule-extension-invalid");
  const custom = new Map<
    string,
    { definition: RuleDefinition; evaluate: TrustedRule }
  >();
  for (const entry of extensions) {
    const definition = extensionDefinition.safeParse(entry?.definition);
    if (!definition.success || typeof entry?.evaluate !== "function")
      throw new Error("rule-extension-invalid");
    if (
      rules.some((r) => r.id === definition.data.id) ||
      custom.has(definition.data.id)
    )
      throw new Error("rule-extension-id-conflict");
    custom.set(definition.data.id, {
      definition: definition.data,
      evaluate: entry.evaluate,
    });
  }
  const definitions = [
    ...rules,
    ...[...custom.values()].map((entry) => entry.definition),
  ];
  context = {
    ...context,
    byUrl: new Map(context.observations.map((o) => [o.url, o])),
    byText: new Map(),
    inlinks: new Map(),
  };
  for (const o of context.observations) {
    const f = activeFacts(o);
    if (!f) continue;
    const cluster = context.byText!.get(f.textHash) ?? [];
    cluster.push(o.url);
    context.byText!.set(f.textHash, cluster);
    for (const edge of f.edges.filter((e) =>
      ["hyperlink", "navigation"].includes(e.kind),
    )) {
      const links = context.inlinks!.get(edge.target) ?? [];
      links.push(o.url);
      context.inlinks!.set(edge.target, links);
    }
  }
  const output: RuleResult[] = [];
  for (const o of context.observations)
    for (const rule of definitions) {
      if (process.memoryUsage().rss > context.config.maxMemoryBytes)
        throw new Error("analysis-memory-budget");
      const fn = evaluate[rule.id] ?? custom.get(rule.id)?.evaluate;
      let result: Evaluation;
      if (
        context.config.recheckUrls &&
        (rule.verificationScope ?? "inventory") === "inventory"
      )
        result = {
          outcome: "not-tested",
          observed: null,
          expected: "fresh inventory-wide evidence",
          reason:
            "This targeted recheck does not collect the inventory needed for this check. Run a full audit to evaluate it.",
        };
      else if (
        (custom.has(rule.id) &&
          rule.prerequisite === "response" &&
          !o.response) ||
        (["html", "document"].includes(rule.prerequisite) &&
          (!o.response ||
            o.response.status !== 200 ||
            ((rule.prerequisite === "html" ||
              /html/i.test(o.response.headers["content-type"] ?? "")) &&
              !o.facts)))
      )
        result = {
          outcome: o.error?.includes("blocked") ? "blocked" : "not-tested",
          observed: o.error ?? o.response?.status ?? null,
          expected: "complete successful document evidence",
          reason: "The document evidence needed for this check is missing.",
        };
      else if (
        ["html", "document"].includes(rule.prerequisite) &&
        o.finalUrl !== o.url
      )
        result = {
          outcome: "not-applicable",
          observed: o.finalUrl,
          expected: null,
          reason:
            "This URL redirected. Check the page content at the destination URL.",
        };
      else {
        try {
          if (!fn) throw new Error("rule-unavailable");
          result = custom.has(rule.id)
            ? extensionEvaluation.parse(fn(o, context))
            : fn(o, context);
          if (
            custom.has(rule.id) &&
            Buffer.byteLength(JSON.stringify(result)) > 5_000_000
          )
            throw new Error("rule-extension-result-budget");
        } catch {
          result = {
            outcome: "error",
            observed: null,
            expected: null,
            reason: "The check could not be completed.",
          };
        }
      }
      const exception = context.config.exceptions.find(
        (e) =>
          e.ruleId === rule.id &&
          e.url === o.url &&
          (!e.expires || e.expires >= new Date().toISOString().slice(0, 10)),
      );
      const id = hash(rule.id + "\0" + o.url).slice(0, 24);
      output.push({
        id,
        ruleId: rule.id,
        ruleVersion: rule.version,
        url: o.url,
        ...result,
        evidenceIds: [o.id],
        denominator: result.denominator ?? 1,
        applicability: rule.prerequisite,
        engine:
          rule.id === "google-feature-fields" ||
          rule.sourceIds.includes("google-js") ||
          rule.sourceIds.includes("google-canonical")
            ? "Google"
            : rule.id === "structured-vocabulary"
              ? "Schema.org"
              : "product observation",
        severity: rule.severity,
        observationConfidence:
          o.render?.status === "observed"
            ? "direct HTTP and browser observations"
            : o.response
              ? "direct HTTP observation"
              : "missing or incomplete",
        interpretationConfidence:
          result.outcome === "warning"
            ? "contextual review required"
            : ["not-tested", "blocked", "error"].includes(result.outcome)
              ? "unavailable; required evidence or a completed evaluation is missing"
              : "deterministic within stated prerequisites",
        causeConfidence: "unknown",
        remediation: rule.remediation,
        verification: rule.verification,
        sourceIds: rule.sourceIds,
        ...(exception ? { exception } : {}),
      });
    }
  return output;
}
export { activeFacts, noindex, RULESET };

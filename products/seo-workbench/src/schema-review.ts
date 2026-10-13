/** Vocabulary recognition is separate from visible truth and search-feature requirements. */
import { readFileSync } from "node:fs";
import { schemaNodes } from "./schema.ts";
import {
  featureForType,
  recipeImageClaims,
  structuredTextClaims,
  schemaSubtype,
  type featureFields,
} from "./structured-features.ts";
import type { Observation } from "./domain.ts";
const vocabulary: {
  vocabularyVersion: string;
  sourceSha256: string;
  types: Record<string, string[]>;
  properties: Record<string, { domains: string[]; ranges: string[] }>;
  enumerations: Record<string, string[]>;
} = JSON.parse(
  readFileSync(
    new URL("../data/schema-vocabulary.json", import.meta.url),
    "utf8",
  ),
);
const term = (value: string) => value.replace(/^https?:\/\/schema\.org\//, "");
export function structuredVocabulary(blocks: unknown[], base: string) {
  const graph = schemaNodes(blocks, base),
    unknownTypes = new Set<string>(),
    unknownProperties = new Set<string>(),
    externalProperties = new Set<string>();
  for (const node of graph.propertyObjects) {
    for (const type of node.types)
      if (!Object.hasOwn(vocabulary.types, type)) unknownTypes.add(type);
    if (!node.knownContext) continue;
    for (const key of Object.keys(node.value)) {
      if (key.startsWith("@")) continue;
      const name = term(key);
      if (/^[A-Za-z0-9]+$/.test(name)) {
        if (!Object.hasOwn(vocabulary.properties, name))
          unknownProperties.add(name);
      } else externalProperties.add(key);
    }
  }
  const definitionsById = new Map<string, number>();
  for (const node of graph.nodes)
    if (
      node.id &&
      node.knownContext &&
      Object.keys(node.value).some((key) => !key.startsWith("@"))
    )
      definitionsById.set(node.id, (definitionsById.get(node.id) ?? 0) + 1);
  const references = graph.references.map((id) => {
    const definitions = definitionsById.get(id) ?? 0;
    return {
      id,
      state:
        definitions === 1
          ? "resolved-in-document"
          : definitions
            ? "multiple-definitions"
            : "not-defined-in-document",
    };
  });
  return {
    vocabularyVersion: vocabulary.vocabularyVersion,
    vocabularyHash: vocabulary.sourceSha256,
    propertyObjectsReviewed: graph.propertyObjects.filter(
      (node) => node.knownContext,
    ).length,
    typedNodes: graph.nodes.filter((node) => node.types.length).length,
    unknownTypes: [...unknownTypes].sort(),
    unknownProperties: [...unknownProperties].sort(),
    externalProperties: [...externalProperties].sort(),
    references,
    unresolvedPropertyContexts: graph.nodes.filter((node) => !node.knownContext)
      .length,
    complete:
      !graph.nodes.some((node) => !node.knownContext) &&
      !graph.truncated &&
      !graph.unresolvedContext &&
      !externalProperties.size,
    truncated: graph.truncated,
    limitations: [
      "Term recognition does not establish correct values, agreement with visible content or eligibility for a search feature.",
      "Schema.org allows extensions and flexible property/type combinations. Unrecognised names need review; they are not automatically invalid.",
      "References may describe entities outside this document. They are not fetched. Multiple definitions can be legitimate JSON-LD; this bounded review does not merge them.",
    ],
  };
}

/** State the implemented checks separately from feature eligibility and human review. */
export function structuredCoverage(
  o: Observation,
  reviews: ReturnType<typeof featureFields>,
  browserRequested = false,
) {
  const facts =
    o.render?.status === "observed" ? (o.render.facts ?? o.facts) : o.facts;
  if (!facts)
    return {
      syntax: "not-tested",
      types: [],
      microdata: "not-tested",
      rdfa: "not-tested",
    };
  const base = facts.documentBase ?? o.finalUrl;
  const graph = schemaNodes(facts.jsonld, base),
    vocabulary = structuredVocabulary(facts.jsonld, base),
    claims = structuredTextClaims(facts.jsonld, base);
  const collectionComplete =
    !browserRequested || o.render?.status === "observed";
  const readable = !facts.jsonldErrors && collectionComplete;
  const snapshot = facts.renderedPageText;
  const visibleComplete =
    readable &&
    claims.complete &&
    o.render?.status === "observed" &&
    snapshot &&
    !snapshot.truncated &&
    !o.render.failures?.length;
  const normalise = (value: string) =>
    value.normalize("NFKC").toLocaleLowerCase().replace(/\s+/g, " ").trim();
  const types = [...new Set(graph.nodes.flatMap((node) => node.types))].sort();
  const profile = o.render?.profile as
    | {
        resourceEvidence?: {
          url: string;
          status?: number;
          error?: string;
          contentType?: string;
        }[];
      }
    | undefined;
  const imageClaims = recipeImageClaims(facts.jsonld, base);
  const images = imageClaims.map((url) => {
    const response = Array.isArray(profile?.resourceEvidence)
      ? profile.resourceEvidence.findLast((resource) => resource.url === url)
      : undefined;
    return {
      url,
      pageImageReference: facts.images.some((image) => image.src === url),
      response: !response
        ? "not-tested"
        : response.error
          ? "blocked"
          : response.status && response.status >= 200 && response.status < 300
            ? "observed"
            : "needs-review",
      imageContentType: response?.contentType?.startsWith("image/")
        ? "observed"
        : response?.contentType
          ? "needs-review"
          : "not-tested",
      imageMeaning: "human-review",
      searchIndexability: "not-tested",
    };
  });
  return {
    syntax: facts.jsonldErrors
      ? "needs-review"
      : readable
        ? "checked"
        : "not-tested",
    microdata: facts.microdata ? "not-tested" : "not-present",
    rdfa: facts.rdfa ? "not-tested" : "not-present",
    images,
    types: types.map((type) => {
      const feature = featureForType(type),
        review = reviews.find((item) => item.feature === feature);
      const typeClaims = claims.claims.filter((claim) =>
        schemaSubtype(type, claim.type),
      );
      const mappingsComplete =
        !graph.truncated &&
        !graph.unresolvedContext &&
        graph.nodes
          .filter((node) => node.types.includes(type))
          .every((node) => node.knownContext);
      return {
        type,
        nodes: graph.nodes.filter((node) => node.types.includes(type)).length,
        feature,
        vocabulary:
          !readable || !vocabulary.complete
            ? "not-tested"
            : vocabulary.unknownTypes.includes(type) ||
                vocabulary.unknownProperties.length
              ? "needs-review"
              : "recognised",
        featureFields:
          !readable || !mappingsComplete
            ? "not-tested"
            : !review
              ? "not-implemented"
              : review.status === "selected-fields-present"
                ? "checked"
                : review.status,
        checkedFields:
          feature === "recipe"
            ? [
                "name",
                "image URL",
                "ingredients",
                "instructions",
                "durations",
                "yield",
                "nutrition.calories",
                "aggregateRating",
              ]
            : feature === "product-snippet"
              ? ["name", "offer price", "aggregateRating", "review rating"]
              : feature === "article"
                ? ["headline", "dates", "author", "image"]
                : feature === "local-business"
                  ? ["name", "address"]
                  : [],
        visibleText: !typeClaims.length
          ? "not-implemented"
          : !visibleComplete
            ? "not-tested"
            : typeClaims.some(
                  (claim) =>
                    !normalise(snapshot!.text).includes(normalise(claim.text)),
                )
              ? "needs-review"
              : "checked",
        visibleTextFields: [...new Set(typeClaims.map((claim) => claim.field))],
        factualAccuracy: "human-review",
        imageMeaning: "human-review",
        fullSearchEligibility: "not-tested",
        actualSearchDisplay: "not-tested",
      };
    }),
  };
}

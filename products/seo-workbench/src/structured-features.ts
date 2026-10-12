/** Selected field checks are separate from policy compliance, visible truth and actual search display. */
import { readFileSync } from "node:fs";
import { schemaIdentifier, schemaNodes, type SchemaNode } from "./schema.ts";
const types: Record<string, string[]> = JSON.parse(
  readFileSync(
    new URL("../data/schema-vocabulary.json", import.meta.url),
    "utf8",
  ),
).types;
export function schemaSubtype(type: string, parent: string): boolean {
  const queue = [type],
    seen = new Set<string>();
  while (queue.length) {
    const current = queue.pop()!;
    if (current === parent) return true;
    if (seen.has(current)) continue;
    seen.add(current);
    queue.push(...(types[current] ?? []));
  }
  return false;
}
const field = (node: Record<string, unknown>, name: string) =>
  node[name] ??
  node["https://schema.org/" + name] ??
  node["http://schema.org/" + name];
const text = (value: unknown): value is string =>
  typeof value === "string" && !!value.trim();
const number = (value: unknown) =>
  (typeof value === "number" ||
    (typeof value === "string" && /^\d+(?:\.\d+)?$/.test(value))) &&
  Number.isFinite(Number(value)) &&
  Number(value) >= 0;
const definitions = new WeakMap<
  SchemaNode[],
  Map<string, Record<string, unknown>[]>
>();
function objects(value: unknown, nodes: SchemaNode[], base: string) {
  let unknown = false;
  const objects: Record<string, unknown>[] = [];
  for (const item of Array.isArray(value) ? value : [value]) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const record = item as Record<string, unknown>;
    if (
      ["@context", "@list", "@set", "@reverse", "@value"].some(
        (key) => Object.hasOwn(record, key) && key !== "@context",
      ) ||
      (Object.hasOwn(record, "@context") &&
        !/^https?:\/\/schema\.org\/?$/.test(String(record["@context"])))
    ) {
      unknown = true;
      continue;
    }
    if (
      typeof record["@id"] === "string" &&
      Object.keys(record).every((key) => key.startsWith("@"))
    ) {
      let index = definitions.get(nodes);
      if (!index) {
        index = new Map();
        for (const node of nodes)
          if (
            node.id &&
            node.knownContext &&
            Object.keys(node.value).some((key) => !key.startsWith("@"))
          )
            index.set(node.id, [...(index.get(node.id) ?? []), node.value]);
        definitions.set(nodes, index);
      }
      const matches =
        index.get(schemaIdentifier(record["@id"] as string, base)) ?? [];
      if (matches.length !== 1) unknown = true;
      else objects.push(matches[0]);
    } else objects.push(record);
  }
  return { objects, unknown };
}
export function featureFields(
  blocks: unknown[],
  base: string,
  features: ("product-snippet" | "article" | "local-business")[],
) {
  const graph = schemaNodes(blocks, base);
  return features.map((feature) => {
    const parent =
        feature === "product-snippet"
          ? "Product"
          : feature === "article"
            ? "Article"
            : "LocalBusiness",
      selected = graph.nodes.filter(
        (node) =>
          node.types.some((type) => schemaSubtype(type, parent)) &&
          (feature !== "product-snippet" ||
            !node.types.some((type) => schemaSubtype(type, "ProductGroup"))),
      ),
      missing: { id: string | null; fields: string[] }[] = [],
      recommendations: { id: string | null; fields: string[] }[] = [];
    let unknown =
      graph.truncated ||
      graph.unresolvedContext ||
      selected.some(
        (node) =>
          !node.knownContext ||
          (node.id !== null &&
            Object.keys(node.value).every((key) => key.startsWith("@"))),
      );
    for (const node of selected.filter((node) => node.knownContext)) {
      const value = node.value,
        absent: string[] = [],
        recommended: string[] = [];
      if (feature === "article") {
        if (!text(field(value, "headline"))) recommended.push("headline");
        for (const name of ["datePublished", "dateModified"]) {
          const date = field(value, name);
          if (
            !text(date) ||
            !/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(date) ||
            !Number.isFinite(Date.parse(date))
          )
            recommended.push(name);
        }
        const authors = objects(field(value, "author"), graph.nodes, base);
        unknown ||= authors.unknown;
        if (!authors.objects.some((author) => text(field(author, "name"))))
          recommended.push("author.name");
        const images = field(value, "image"),
          usableImage = (value: unknown) => {
            if (!text(value)) return false;
            try {
              const parsed = new URL(value, base);
              return (
                ["http:", "https:"].includes(parsed.protocol) &&
                !parsed.username &&
                !parsed.password
              );
            } catch {
              return false;
            }
          };
        const imageObjects = objects(images, graph.nodes, base);
        unknown ||= imageObjects.unknown;
        if (
          !(Array.isArray(images) ? images : [images]).some(usableImage) &&
          !imageObjects.objects.some(
            (image) =>
              usableImage(field(image, "url")) ||
              usableImage(field(image, "contentUrl")),
          )
        )
          recommended.push("image");
      } else {
        if (!text(field(value, "name"))) absent.push("name");
        if (feature === "local-business") {
          const addresses = objects(field(value, "address"), graph.nodes, base);
          unknown ||= addresses.unknown;
          if (
            !addresses.objects.some((address) =>
              [
                "streetAddress",
                "addressLocality",
                "addressRegion",
                "postalCode",
                "addressCountry",
              ].some((name) => text(field(address, name))),
            )
          )
            absent.push("populated PostalAddress details");
        } else {
          const offers = objects(field(value, "offers"), graph.nodes, base),
            reviews = objects(field(value, "review"), graph.nodes, base),
            ratings = objects(
              field(value, "aggregateRating"),
              graph.nodes,
              base,
            );
          unknown ||= offers.unknown || reviews.unknown || ratings.unknown;
          let validOffer = false;
          for (const offer of offers.objects) {
            const kind = Array.isArray(offer["@type"])
                ? offer["@type"]
                : [offer["@type"]],
              aggregate = kind.some(
                (type) =>
                  typeof type === "string" &&
                  schemaSubtype(
                    type.replace(/^https?:\/\/schema\.org\//, ""),
                    "AggregateOffer",
                  ),
              ),
              specifications = objects(
                field(offer, "priceSpecification"),
                graph.nodes,
                base,
              );
            unknown ||= specifications.unknown;
            if (
              aggregate
                ? number(field(offer, "lowPrice")) &&
                  text(field(offer, "priceCurrency"))
                : number(field(offer, "price")) ||
                  specifications.objects.some((spec) =>
                    number(field(spec, "price")),
                  )
            )
              validOffer = true;
            if (
              !field(offer, "priceCurrency") &&
              !specifications.objects.some((spec) =>
                field(spec, "priceCurrency"),
              )
            )
              recommended.push("offer currency");
          }
          const validRating = ratings.objects.some(
            (rating) =>
              number(field(rating, "ratingValue")) &&
              ["ratingCount", "reviewCount"].some(
                (name) =>
                  number(field(rating, name)) &&
                  Number(field(rating, name)) > 0 &&
                  Number.isInteger(Number(field(rating, name))),
              ),
          );
          let validReview = false;
          for (const review of reviews.objects) {
            const authors = objects(field(review, "author"), graph.nodes, base),
              scores = objects(
                field(review, "reviewRating"),
                graph.nodes,
                base,
              );
            unknown ||= authors.unknown || scores.unknown;
            if (
              authors.objects.some((author) => text(field(author, "name"))) &&
              scores.objects.some((rating) =>
                number(field(rating, "ratingValue")),
              )
            )
              validReview = true;
          }
          if (!validOffer && !validRating && !validReview)
            absent.push(
              "usable offer price, counted aggregate rating or attributed review rating",
            );
        }
      }
      if (absent.length) missing.push({ id: node.id, fields: absent });
      if (recommended.length)
        recommendations.push({
          id: node.id,
          fields: [...new Set(recommended)],
        });
    }
    return {
      feature,
      selectedNodes: selected.length,
      missing,
      recommendations,
      unknown,
      requiredDefect:
        feature !== "article" && (!selected.length || missing.length > 0),
      status: unknown
        ? "not-tested"
        : feature === "article" && !selected.length
          ? "not-applicable"
          : !selected.length || missing.length || recommendations.length
            ? "needs-review"
            : "selected-fields-present",
      limitations:
        feature === "article"
          ? "Google lists recommended Article fields, not mandatory fields for Top stories. Missing recommendations do not establish ineligibility."
          : "This checks selected fields only. Appropriate type/value semantics, visible accuracy, all provider policies and actual display need separate review.",
    };
  });
}
export function structuredTextClaims(blocks: unknown[], base: string) {
  const graph = schemaNodes(blocks, base),
    claims: { id: string | null; type: string; field: string; text: string }[] =
      [],
    deferredClaims: typeof claims = [],
    variants = new Set<Record<string, unknown>>();
  let uncertainVariants = false;
  for (const group of graph.nodes.filter((node) =>
    node.types.some((type) => schemaSubtype(type, "ProductGroup")),
  )) {
    const members = objects(
      field(group.value, "hasVariant"),
      graph.nodes,
      base,
    );
    uncertainVariants ||= members.unknown;
    for (const member of members.objects) variants.add(member);
  }
  for (const node of graph.nodes.filter((node) => node.knownContext)) {
    const parent = ["Product", "Article", "LocalBusiness"].find((parent) =>
      node.types.some((type) => schemaSubtype(type, parent)),
    );
    if (!parent) continue;
    const name = parent === "Article" ? "headline" : "name",
      value = field(node.value, name);
    if (!text(value)) continue;
    const claim = { id: node.id, type: parent, field: name, text: value };
    if (
      parent === "Product" &&
      !node.types.some((type) => schemaSubtype(type, "ProductGroup")) &&
      (variants.has(node.value) ||
        field(node.value, "isVariantOf") !== undefined)
    )
      deferredClaims.push(claim);
    else claims.push(claim);
  }
  return {
    claims,
    deferredClaims,
    complete:
      !graph.truncated &&
      !graph.unresolvedContext &&
      !uncertainVariants &&
      !graph.nodes.some((node) => !node.knownContext),
  };
}

/** Inspect only declared groups; off-page variant stubs do not prove missing local details. */
export function productVariantReview(blocks: unknown[], base: string) {
  const graph = schemaNodes(blocks, base),
    groups = graph.nodes.filter((node) =>
      node.types.some((type) => schemaSubtype(type, "ProductGroup")),
    ),
    reviews = [];
  const linkedVariants = new Map<
    Record<string, unknown>,
    Set<Record<string, unknown>>
  >();
  let unresolvedParents = false;
  for (const node of graph.nodes.filter(
    (node) =>
      node.types.some((type) => schemaSubtype(type, "Product")) &&
      !node.types.some((type) => schemaSubtype(type, "ProductGroup")),
  )) {
    const parents = objects(
      field(node.value, "isVariantOf"),
      graph.nodes,
      base,
    );
    unresolvedParents ||= parents.unknown;
    for (const parent of parents.objects) {
      const members =
        linkedVariants.get(parent) ?? new Set<Record<string, unknown>>();
      members.add(node.value);
      linkedVariants.set(parent, members);
    }
  }
  for (const group of groups) {
    const members = objects(
        field(group.value, "hasVariant"),
        graph.nodes,
        base,
      ),
      variants = new Set(members.objects);
    let unknown =
      graph.truncated ||
      graph.unresolvedContext ||
      !group.knownContext ||
      members.unknown;
    unknown ||= unresolvedParents;
    for (const member of linkedVariants.get(group.value) ?? [])
      variants.add(member);
    const issues: string[] = [],
      deferred: string[] = [],
      identifiers: string[] = [],
      childGroupIds = new Set<string>();
    if (!text(field(group.value, "name")))
      issues.push("The group has no populated name.");
    for (const variant of variants) {
      const keys = Object.keys(variant).filter((key) => !key.startsWith("@"));
      if (
        keys.length &&
        keys.every((key) =>
          ["url", "isVariantOf", "inProductGroupWithID"].includes(key),
        )
      ) {
        deferred.push("An off-page variant needs a separate page observation.");
        unknown = true;
        continue;
      }
      const id = ["sku", "gtin", "gtin8", "gtin12", "gtin13", "gtin14"]
        .map((key) => field(variant, key))
        .find(text);
      if (!id)
        issues.push("A populated variant has no SKU or GTIN identifier.");
      else identifiers.push(id);
      const childId = field(variant, "inProductGroupWithID");
      if (text(childId)) childGroupIds.add(childId);
    }
    const groupId = field(group.value, "productGroupID");
    if (!text(groupId) && childGroupIds.size !== 1)
      issues.push(
        "A consistent group identifier is not declared on the group or its variants.",
      );
    if (text(groupId) && [...childGroupIds].some((id) => id !== groupId))
      issues.push("A variant declares a different group identifier.");
    if (new Set(identifiers).size !== identifiers.length)
      issues.push(
        "Some observed variants repeat the same selected SKU or GTIN identifier.",
      );
    const dimensions = field(group.value, "variesBy");
    for (const dimension of Array.isArray(dimensions)
      ? dimensions
      : dimensions === undefined
        ? []
        : [dimensions]) {
      const name =
        typeof dimension === "string"
          ? dimension
          : dimension && typeof dimension === "object"
            ? (dimension as Record<string, unknown>)["@id"]
            : null;
      if (typeof name !== "string") {
        unknown = true;
        continue;
      }
      if (
        !/^https?:\/\/schema\.org\/(?:color|size|suggestedAge|suggestedGender|material|pattern)$/.test(
          name,
        )
      )
        issues.push(
          "A declared variation dimension is outside the selected Google-supported list.",
        );
    }
    reviews.push({
      id: group.id,
      variantsObserved: variants.size,
      groupIdentifier: text(groupId)
        ? groupId
        : ([...childGroupIds][0] ?? null),
      issues: [...new Set(issues)],
      deferred: [...new Set(deferred)],
      unknown,
    });
  }
  return {
    groups: reviews,
    complete:
      !graph.truncated &&
      !graph.unresolvedContext &&
      reviews.every((review) => !review.unknown),
    limitations:
      "This page-level review does not establish site-wide identifier uniqueness, correct variant preselection, prices/images/availability, canonical strategy or shopping-result eligibility.",
  };
}

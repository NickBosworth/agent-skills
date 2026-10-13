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
/** Fractions and percentages carry their own scale; plain scores default to one through five. */
function validRatingValue(rating: Record<string, unknown>): boolean {
  const numeric = (value: unknown): number | null => {
    if (
      typeof value !== "number" &&
      (typeof value !== "string" ||
        !/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/.test(value.trim()))
    )
      return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };
  const value = field(rating, "ratingValue");
  let score = numeric(value),
    minimum = 1,
    maximum = 5;
  if (score === null && typeof value === "string") {
    const fraction = /^\s*(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)\s*$/.exec(
      value,
    );
    const percentage = /^\s*(\d+(?:\.\d+)?)\s*%\s*$/.exec(value);
    if (fraction || percentage) {
      score = Number((fraction ?? percentage)![1]);
      minimum = 0;
      maximum = fraction ? Number(fraction[2]) : 100;
      if (
        !Number.isFinite(maximum) ||
        maximum <= 0 ||
        !Number.isFinite(score) ||
        score < 0 ||
        score > maximum
      )
        return false;
    }
  }
  const worst = field(rating, "worstRating"),
    best = field(rating, "bestRating");
  if (worst !== undefined) {
    const parsed = numeric(worst);
    if (parsed === null) return false;
    minimum = parsed;
  }
  if (best !== undefined) {
    const parsed = numeric(best);
    if (parsed === null) return false;
    maximum = parsed;
  }
  return (
    score !== null &&
    Number.isFinite(score) &&
    maximum > minimum &&
    score >= minimum &&
    score <= maximum
  );
}
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
export type GoogleFeature =
  "product-snippet" | "article" | "local-business" | "recipe";
export function featureForType(type: string): GoogleFeature | null {
  if (schemaSubtype(type, "ProductGroup")) return null;
  for (const [parent, feature] of [
    ["Product", "product-snippet"],
    ["Article", "article"],
    ["LocalBusiness", "local-business"],
    ["Recipe", "recipe"],
  ] as const)
    if (schemaSubtype(type, parent)) return feature;
  return null;
}
const list = (value: unknown) =>
  Array.isArray(value) ? value : value === undefined ? [] : [value];
function imageUrls(value: unknown, nodes: SchemaNode[], base: string) {
  const entries = list(value).slice(0, 5000);
  const details = objects(entries, nodes, base);
  details.unknown ||= list(value).length > entries.length;
  let invalid =
    entries.some(
      (item) =>
        !text(item) &&
        (!item || typeof item !== "object" || Array.isArray(item)),
    ) ||
    details.objects.some(
      (image) =>
        field(image, "url") === undefined &&
        field(image, "contentUrl") === undefined,
    );
  const candidates = [
    ...entries.filter(text),
    ...details.objects.flatMap((image) =>
      list(field(image, "url") ?? field(image, "contentUrl")),
    ),
  ];
  const urls: string[] = [];
  for (const candidate of candidates) {
    if (!text(candidate)) {
      invalid = true;
      continue;
    }
    try {
      const url = new URL(candidate, base);
      if (
        ["http:", "https:"].includes(url.protocol) &&
        !url.username &&
        !url.password
      )
        urls.push(url.href);
      else invalid = true;
    } catch {
      invalid = true;
    }
  }
  return { urls: [...new Set(urls)], unknown: details.unknown, invalid };
}
function recipeDetails(
  value: Record<string, unknown>,
  nodes: SchemaNode[],
  base: string,
) {
  const missing: string[] = [],
    recommendations: string[] = [],
    instructionTexts: string[] = [];
  let unknown = false;
  const images = imageUrls(field(value, "image"), nodes, base);
  unknown ||= images.unknown;
  if (images.invalid && images.urls.length)
    recommendations.push(
      "image contains an unsupported or malformed value alongside a usable address",
    );
  if (!text(field(value, "name"))) missing.push("name");
  if (!images.urls.length && !images.unknown)
    missing.push("image URL or ImageObject URL");
  const allIngredients = list(field(value, "recipeIngredient"));
  const ingredients = allIngredients.slice(0, 5000);
  unknown ||= allIngredients.length > ingredients.length;
  if (!ingredients.length || !ingredients.every(text))
    recommendations.push(
      "recipeIngredient must contain nonempty ingredient text",
    );
  const instructions = list(field(value, "recipeInstructions"));
  unknown ||= instructions.length > 5000;
  const pending = instructions.slice(0, 5000).map((value) => ({
    value,
    depth: 0,
    allowed: ["HowToStep", "HowToSection"],
    textAllowed: true,
  }));
  const seen = new Set<Record<string, unknown>>();
  let invalidInstructions = !pending.length,
    visited = 0;
  while (pending.length) {
    if (++visited > 5000) {
      unknown = true;
      break;
    }
    const item = pending.pop()!;
    if (item.depth > 20) {
      unknown = true;
      continue;
    }
    if (text(item.value)) {
      if (!item.textAllowed) invalidInstructions = true;
      instructionTexts.push(item.value);
      continue;
    }
    const resolved = objects(item.value, nodes, base);
    unknown ||= resolved.unknown;
    if (!resolved.objects.length && !resolved.unknown)
      invalidInstructions = true;
    for (const instruction of resolved.objects) {
      if (seen.has(instruction)) {
        unknown = true;
        continue;
      }
      seen.add(instruction);
      const types = list(field(instruction, "@type"))
        .filter(text)
        .map((type) => type.replace(/^https?:\/\/schema\.org\//, ""));
      if (
        !types.some((type) =>
          item.allowed.some((parent) => schemaSubtype(type, parent)),
        )
      )
        invalidInstructions = true;
      const children = list(field(instruction, "itemListElement"));
      if (children.length + visited + pending.length > 5000) unknown = true;
      if (types.some((type) => schemaSubtype(type, "HowToSection"))) {
        if (!text(field(instruction, "name")) || !children.length)
          invalidInstructions = true;
        for (const value of children.slice(
          0,
          Math.max(0, 5000 - visited - pending.length),
        ))
          pending.push({
            value,
            depth: item.depth + 1,
            allowed: ["HowToStep", "HowToSection"],
            textAllowed: false,
          });
      } else if (
        types.some((type) =>
          ["HowToStep", "HowToDirection", "HowToTip"].some((parent) =>
            schemaSubtype(type, parent),
          ),
        )
      ) {
        const content = field(instruction, "text");
        if (text(content)) instructionTexts.push(content);
        else if (
          children.length &&
          types.some((type) => schemaSubtype(type, "HowToStep"))
        )
          for (const value of children.slice(
            0,
            Math.max(0, 5000 - visited - pending.length),
          ))
            pending.push({
              value,
              depth: item.depth + 1,
              allowed: ["HowToDirection", "HowToTip"],
              textAllowed: false,
            });
        else invalidInstructions = true;
      } else invalidInstructions = true;
    }
  }
  if (invalidInstructions)
    recommendations.push(
      "recipeInstructions must contain text or populated HowToStep/HowToSection instructions",
    );
  for (const name of ["prepTime", "cookTime", "totalTime"]) {
    const duration = field(value, name);
    if (
      duration !== undefined &&
      (!text(duration) ||
        !/^P(?=\d|T\d)(?:\d+(?:\.\d+)?W|(?:\d+(?:\.\d+)?D)?(?:T(?=\d)(?:\d+(?:\.\d+)?H)?(?:\d+(?:\.\d+)?M)?(?:\d+(?:\.\d+)?S)?)?)$/.test(
          duration,
        ))
    )
      recommendations.push(name + " must use a supported ISO 8601 duration");
  }
  if (
    field(value, "totalTime") === undefined &&
    (field(value, "prepTime") === undefined ||
      field(value, "cookTime") === undefined)
  )
    recommendations.push("totalTime or both prepTime and cookTime");
  const yields = list(field(value, "recipeYield"));
  const servings = yields.some(
    (value) =>
      (typeof value === "number" && Number.isInteger(value) && value > 0) ||
      (text(value) && /^[1-9]\d*(?:\s+servings?)?$/i.test(value.trim())),
  );
  if (
    !yields.length ||
    !yields.every(
      (value) =>
        text(value) ||
        (typeof value === "number" && Number.isInteger(value) && value > 0),
    )
  )
    recommendations.push(
      "recipeYield must contain a positive integer or quantity text",
    );
  const nutrition = objects(field(value, "nutrition"), nodes, base);
  unknown ||= nutrition.unknown;
  const nutrients = [
    "calories",
    "fatContent",
    "saturatedFatContent",
    "unsaturatedFatContent",
    "transFatContent",
    "cholesterolContent",
    "sodiumContent",
    "carbohydrateContent",
    "fiberContent",
    "sugarContent",
    "proteinContent",
    "servingSize",
  ];
  if (
    nutrition.objects.some((item) =>
      nutrients.some((name) => field(item, name) !== undefined),
    )
  ) {
    if (!servings)
      missing.push(
        "recipeYield with the number of servings when nutrition per serving is provided",
      );
    for (const item of nutrition.objects) {
      const calories = field(item, "calories");
      if (
        calories !== undefined &&
        !(
          number(calories) ||
          (text(calories) &&
            /^\d+(?:\.\d+)?\s*(?:calories|kcal|cal)$/i.test(calories.trim()))
        )
      )
        recommendations.push(
          "nutrition.calories must contain a nonnegative calorie value",
        );
    }
  }
  const ratings = objects(field(value, "aggregateRating"), nodes, base);
  unknown ||= ratings.unknown;
  for (const rating of ratings.objects)
    if (
      !validRatingValue(rating) ||
      !["ratingCount", "reviewCount"].some(
        (name) =>
          number(field(rating, name)) &&
          Number(field(rating, name)) > 0 &&
          Number.isInteger(Number(field(rating, name))),
      )
    )
      recommendations.push("aggregateRating value, scale and positive count");
  return {
    missing,
    recommendations,
    instructionTexts,
    ingredientTexts: ingredients.filter(text),
    imageUrls: images.urls,
    unknown,
  };
}
export function featureFields(
  blocks: unknown[],
  base: string,
  features: GoogleFeature[],
) {
  const graph = schemaNodes(blocks, base);
  return features.map((feature) => {
    const parent =
        feature === "product-snippet"
          ? "Product"
          : feature === "article"
            ? "Article"
            : feature === "recipe"
              ? "Recipe"
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
      if (feature === "recipe") {
        const review = recipeDetails(value, graph.nodes, base);
        absent.push(...review.missing);
        recommended.push(...review.recommendations);
        unknown ||= review.unknown;
      } else if (feature === "article") {
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
              validRatingValue(rating) &&
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
              scores.objects.some((rating) => validRatingValue(rating))
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
    const parent = ["Product", "Article", "LocalBusiness", "Recipe"].find(
      (parent) => node.types.some((type) => schemaSubtype(type, parent)),
    );
    if (!parent) continue;
    if (parent === "Recipe") {
      const details = recipeDetails(node.value, graph.nodes, base);
      uncertainVariants ||= details.unknown;
      for (const [field, texts] of [
        ["recipeIngredient", details.ingredientTexts],
        ["recipeInstructions", details.instructionTexts],
      ] as const)
        for (const text of texts)
          claims.push({ id: node.id, type: parent, field, text });
    }
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

/** Inspect Recipe image addresses without fetching additional or unapproved resources. */
export function recipeImageClaims(blocks: unknown[], base: string) {
  const graph = schemaNodes(blocks, base);
  return graph.nodes
    .filter(
      (node) =>
        node.knownContext &&
        node.types.some((type) => schemaSubtype(type, "Recipe")),
    )
    .flatMap(
      (node) => imageUrls(field(node.value, "image"), graph.nodes, base).urls,
    );
}

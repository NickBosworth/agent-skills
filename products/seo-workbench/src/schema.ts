/** Inspect a bounded subset of JSON-LD without fetching or executing remote contexts. */
export function schemaIdentifier(value: string, base?: string): string {
  if (!base || value.startsWith("_:")) return value;
  try {
    return new URL(value, base).href;
  } catch {
    return value;
  }
}
export interface SchemaNode {
  types: string[];
  value: Record<string, unknown>;
  id: string | null;
  knownContext: boolean;
}

/** Check populated detail objects only; full feature validation remains separate. */
export function populatedDetails(
  value: unknown,
  nodes: SchemaNode[],
  base?: string,
): "present" | "empty" | "unknown" {
  const values = Array.isArray(value) ? value : [value];
  let unknown = false;
  for (const item of values) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    let object = item as Record<string, unknown>;
    if (
      ["@list", "@set", "@value", "@reverse"].some((key) =>
        Object.hasOwn(object, key),
      )
    ) {
      unknown = true;
      continue;
    }
    if (
      Object.hasOwn(object, "@context") &&
      (typeof object["@context"] !== "string" ||
        !/^https?:\/\/schema\.org\/?$/.test(object["@context"]))
    ) {
      unknown = true;
      continue;
    }
    if (
      Object.keys(object).every((key) => key.startsWith("@")) &&
      typeof object["@id"] === "string"
    ) {
      const targets = nodes.filter(
        (node) =>
          node.id === schemaIdentifier(object["@id"] as string, base) &&
          Object.keys(node.value).some((key) => !key.startsWith("@")),
      );
      if (targets.length !== 1 || !targets[0].knownContext) {
        unknown = true;
        continue;
      }
      object = targets[0].value;
    }
    if (
      Object.entries(object).some(
        ([key, field]) =>
          !key.startsWith("@") &&
          field !== null &&
          field !== undefined &&
          (typeof field === "string"
            ? !!field.trim()
            : typeof field === "number"
              ? Number.isFinite(field)
              : typeof field === "object"
                ? Object.keys(field).length > 0
                : false),
      )
    )
      return "present";
  }
  return unknown ? "unknown" : "empty";
}
export function schemaNodes(
  blocks: unknown[],
  base?: string,
): {
  nodes: SchemaNode[];
  unresolvedContext: boolean;
  truncated: boolean;
  references: string[];
} {
  const pending = blocks
      .slice(0, 5000)
      .map((value) => ({ value, knownContext: false })),
    nodes: SchemaNode[] = [],
    references: string[] = [];
  let unresolvedContext = false,
    visited = 0,
    truncated = blocks.length > 5000;
  const enqueue = (value: unknown, knownContext: boolean) => {
    if (visited + pending.length >= 5000) {
      truncated = true;
      return false;
    }
    pending.push({ value, knownContext });
    return true;
  };
  while (pending.length && visited < 5000) {
    visited++;
    const { value, knownContext } = pending.pop()!;
    if (Array.isArray(value)) {
      for (const child of value) if (!enqueue(child, knownContext)) break;
      continue;
    }
    if (!value || typeof value !== "object") continue;
    const object = value as Record<string, unknown>;
    let known = knownContext;
    if (Object.hasOwn(object, "@context")) {
      const context = object["@context"];
      known =
        typeof context === "string" &&
        /^https?:\/\/schema\.org\/?$/.test(context);
      if (!known) unresolvedContext = true;
    }
    if (
      ["@list", "@set", "@reverse", "@value", "@included", "@nest"].some(
        (key) => Object.hasOwn(object, key),
      )
    )
      unresolvedContext = true;
    if (
      typeof object["@id"] === "string" &&
      Object.keys(object).every((key) => key.startsWith("@"))
    )
      references.push(schemaIdentifier(object["@id"], base));
    if (
      Object.hasOwn(object, "@type") &&
      !(
        typeof object["@type"] === "string" ||
        (Array.isArray(object["@type"]) &&
          object["@type"].every((item) => typeof item === "string"))
      )
    )
      unresolvedContext = true;
    if (
      Object.hasOwn(object, "@id") &&
      (typeof object["@id"] !== "string" ||
        /[\u0000-\u0020<>"{}|^]/.test(object["@id"]))
    )
      unresolvedContext = true;
    const types = Array.isArray(object["@type"])
      ? object["@type"]
      : [object["@type"]];
    const understood = types
      .filter((type): type is string => typeof type === "string")
      .map((type) => {
        const full = /^https?:\/\/schema\.org\/([A-Za-z0-9]+)$/.exec(type);
        if (full) return full[1];
        if (known && /^[A-Za-z0-9]+$/.test(type)) return type;
        unresolvedContext = true;
        return null;
      })
      .filter((type): type is string => type !== null);
    if (
      understood.length ||
      (typeof object["@id"] === "string" &&
        Object.keys(object).some((key) => !key.startsWith("@")))
    )
      nodes.push({
        types: understood,
        value: object,
        id:
          typeof object["@id"] === "string"
            ? schemaIdentifier(object["@id"], base)
            : null,
        knownContext: known,
      });
    for (const [key, child] of Object.entries(object))
      if (key !== "@context" && child && typeof child === "object")
        if (!enqueue(child, known)) break;
  }
  return {
    nodes,
    unresolvedContext,
    truncated: truncated || pending.length > 0,
    references: [...new Set(references)],
  };
}

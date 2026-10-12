/** Vocabulary recognition is separate from visible truth and search-feature requirements. */
import { readFileSync } from "node:fs";
import { schemaNodes } from "./schema.ts";
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
  for (const node of graph.nodes) {
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

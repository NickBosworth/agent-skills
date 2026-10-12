/** Trusted synchronous extractors add versioned facts without changing captured evidence. */
import { z } from "zod";
import { hash, type Observation } from "./domain.ts";
const Definition = z.strictObject({
  id: z.string().regex(/^[a-z][a-z0-9-]{0,100}$/),
  version: z.string().min(1).max(100).regex(/\S/),
  title: z.string().min(1).max(200).regex(/\S/),
  prerequisite: z.enum(["response", "html", "rendered"]),
  basis: z.string().min(1).max(2000).regex(/\S/),
  sourceIds: z.array(z.string().min(1).max(200)).max(50),
});
export interface TrustedExtractor {
  definition: z.infer<typeof Definition>;
  extract(observation: Observation): unknown;
}
const Output = z
  .strictObject({
    status: z.enum(["observed", "not-tested"]),
    facts: z.record(z.string().min(1).max(100), z.json()).nullable(),
    reason: z.string().min(1).max(3000).regex(/\S/),
  })
  .refine((result) =>
    result.status === "observed"
      ? result.facts !== null &&
        Object.keys(result.facts).length > 0 &&
        Object.keys(result.facts).length <= 100
      : result.facts === null,
  );
export interface ExtractorFacts {
  id: string;
  observationId: string;
  extractorId: string;
  extractorVersion: string;
  title: string;
  prerequisite: "response" | "html" | "rendered";
  basis: string;
  sourceIds: string[];
  status: "observed" | "not-tested" | "error";
  facts: z.infer<typeof Output>["facts"];
  reason: string;
}
export function validateExtractors(
  extractors: TrustedExtractor[],
): TrustedExtractor[] {
  if (!Array.isArray(extractors) || extractors.length > 100)
    throw new Error("extractor-definition-invalid");
  const ids = new Set<string>();
  return extractors.map((entry) => {
    const definition = Definition.safeParse(entry?.definition);
    if (!definition.success || typeof entry?.extract !== "function")
      throw new Error("extractor-definition-invalid");
    if (ids.has(definition.data.id)) throw new Error("extractor-id-conflict");
    ids.add(definition.data.id);
    return { definition: definition.data, extract: entry.extract.bind(entry) };
  });
}
export function extractCustomFacts(
  observation: Observation,
  extractors: TrustedExtractor[],
): ExtractorFacts[] {
  const entries = validateExtractors(extractors);
  return entries.map(({ definition, extract }) => {
    const record = {
      id: hash(
        JSON.stringify([definition.id, definition.version, observation.id]),
      ).slice(0, 24),
      observationId: observation.id,
      extractorId: definition.id,
      extractorVersion: definition.version,
      title: definition.title,
      prerequisite: definition.prerequisite,
      basis: definition.basis,
      sourceIds: definition.sourceIds,
    };
    if (
      observation.evidenceProjection === "facts-only" ||
      !observation.response ||
      (definition.prerequisite !== "response" &&
        observation.response.status !== 200) ||
      (definition.prerequisite === "html" && !observation.facts) ||
      (definition.prerequisite === "rendered" &&
        (observation.render?.status !== "observed" ||
          typeof observation.render.dom !== "string"))
    )
      return {
        ...record,
        status: "not-tested",
        facts: null,
        reason:
          "The original response or requested document/browser evidence needed by this extractor is unavailable.",
      };
    if (
      definition.prerequisite !== "response" &&
      observation.url !== observation.finalUrl
    )
      return {
        ...record,
        status: "not-tested",
        facts: null,
        reason:
          "This URL redirected. Extract document facts from the destination capture instead.",
      };
    try {
      const copy = structuredClone({
        ...observation,
        extensionFacts: undefined,
      });
      const result = extract(copy);
      if (result instanceof Promise) {
        void result.catch(() => {});
        throw new Error("extractor-must-be-synchronous");
      }
      if (Buffer.byteLength(JSON.stringify(result)) > 100000)
        throw new Error("extractor-output-budget");
      return { ...record, ...Output.parse(result) };
    } catch {
      return {
        ...record,
        status: "error",
        facts: null,
        reason:
          "The trusted extractor failed or returned unsupported output. No facts were recorded; inspect its implementation privately.",
      };
    }
  });
}

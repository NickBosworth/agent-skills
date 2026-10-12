/** Optional trusted-provider enrichment; suggestions never mutate evidence or findings. */
import { z } from "zod";
import { hash, type Observation } from "./domain.ts";
import { activeFacts } from "./rules.ts";
export interface EvidencePacket {
  version: 1;
  items: { id: string; url: string; title: string; passage: string }[];
}
export interface EnrichmentProvider {
  id: string;
  /** Probe real capabilities; an adapter must not infer schema support from its name. */
  capabilities(
    signal: AbortSignal,
  ): Promise<{ model: string; json: boolean; maxInputBytes: number }>;
  interpret(
    packet: EvidencePacket,
    options: { signal: AbortSignal; maxOutputTokens: number },
  ): Promise<unknown>;
}
const SuggestionSchema = z.strictObject({
  decision: z.enum([
    "improve-existing",
    "create-distinct",
    "review-consolidation",
    "reject",
    "abstain",
  ]),
  rationale: z.string().min(1).max(3000),
  evidenceIds: z.array(z.string().uuid()).max(20),
  destination: z.string().url().nullable(),
  reviewRequired: z.literal(true),
});
export class Enrichment {
  readonly cache = new Map<string, unknown>();
  usedCalls = 0;
  cacheHits = 0;
  /** Opt-in consent must be supplied by the embedding user, never page/config/AI text. */
  async suggest(
    provider: EnrichmentProvider,
    observations: Observation[],
    options: {
      consent: boolean;
      maxCalls: number;
      maxInputBytes: number;
      maxOutputTokens: number;
      timeoutMs: number;
      signal?: AbortSignal;
    },
  ): Promise<unknown> {
    if (options.consent !== true)
      throw new Error("provider-transfer-consent-required");
    if (
      !provider ||
      typeof provider.id !== "string" ||
      !provider.id.trim() ||
      provider.id.length > 500 ||
      /[\u0000-\u001f\u007f-\u009f]/.test(provider.id) ||
      typeof provider.capabilities !== "function" ||
      typeof provider.interpret !== "function"
    )
      throw new Error("provider-definition-invalid");
    const providerId = provider.id;
    if (!Number.isSafeInteger(options.maxCalls) || options.maxCalls < 0)
      throw new Error("provider-call-budget");
    if (
      !Number.isSafeInteger(options.maxInputBytes) ||
      options.maxInputBytes < 1
    )
      throw new Error("provider-input-budget");
    if (
      !Number.isSafeInteger(options.timeoutMs) ||
      options.timeoutMs < 100 ||
      options.timeoutMs > 60000
    )
      throw new Error("provider-time-budget");
    if (this.usedCalls >= options.maxCalls)
      throw new Error("provider-call-budget");
    if (
      !Number.isSafeInteger(options.maxOutputTokens) ||
      options.maxOutputTokens < 1 ||
      options.maxOutputTokens > 4000
    )
      throw new Error("provider-output-budget");
    const abort = new AbortController(),
      cancel = () => abort.abort();
    options.signal?.addEventListener("abort", cancel, { once: true });
    if (options.signal?.aborted) abort.abort();
    const timer = setTimeout(cancel, options.timeoutMs);
    const bounded = <T>(promise: Promise<T>) =>
      new Promise<T>((resolve, reject) => {
        const stop = () => reject(new Error("provider-timeout-or-cancelled"));
        abort.signal.addEventListener("abort", stop, { once: true });
        if (abort.signal.aborted) stop();
        promise.then(
          (v) => {
            abort.signal.removeEventListener("abort", stop);
            resolve(v);
          },
          (e) => {
            abort.signal.removeEventListener("abort", stop);
            reject(e);
          },
        );
      });
    try {
      if (abort.signal.aborted)
        throw new Error("provider-timeout-or-cancelled");
      const capability = await bounded(provider.capabilities(abort.signal));
      if (
        !capability ||
        typeof capability.model !== "string" ||
        !capability.model.trim() ||
        /[\u0000-\u001f\u007f-\u009f]/.test(capability.model) ||
        capability.model.length > 200 ||
        !Number.isSafeInteger(capability.maxInputBytes) ||
        capability.maxInputBytes < 1
      )
        throw new Error("provider-capability-invalid");
      if (capability.json !== true)
        throw new Error("provider-schema-unavailable");
      const model = capability.model;
      const packet: EvidencePacket = {
        version: 1,
        items: observations
          .slice(0, 20)
          .filter((o) => activeFacts(o)?.text)
          .map((o) => ({
            id: o.id,
            url: o.url,
            title: activeFacts(o)!.title,
            passage: activeFacts(o)!.text.slice(0, 1500),
          })),
      };
      if (!packet.items.length)
        throw new Error("insufficient-provider-evidence");
      const serialized = JSON.stringify(packet);
      if (
        Buffer.byteLength(serialized) >
        Math.min(options.maxInputBytes, capability.maxInputBytes)
      )
        throw new Error("provider-input-budget");
      const promptVersion = "content-interpretation-0.1";
      const validateSuggestion = (raw: unknown) => {
        if (Buffer.byteLength(JSON.stringify(raw)) > 30000)
          throw new Error("provider-output-budget");
        const suggestion = SuggestionSchema.parse(raw),
          ids = new Set(packet.items.map((i) => i.id)),
          urls = new Set(packet.items.map((i) => i.url));
        if (suggestion.evidenceIds.some((id) => !ids.has(id)))
          throw new Error("provider-invented-evidence");
        if (suggestion.destination && !urls.has(suggestion.destination))
          throw new Error("provider-invented-destination");
        if (suggestion.decision !== "abstain" && !suggestion.evidenceIds.length)
          throw new Error("provider-unsupported-advice");
        return suggestion;
      };
      const key = hash(
        providerId +
          "\0" +
          model +
          "\0" +
          promptVersion +
          "\0" +
          serialized +
          "\0" +
          options.maxOutputTokens,
      );
      if (this.cache.has(key)) {
        const cached = this.cache.get(key) as any;
        if (
          !cached ||
          cached.provider !== providerId ||
          cached.model !== model ||
          cached.promptVersion !== promptVersion ||
          cached.evidenceHash !== key ||
          cached.status !== "requires-independent-human-review" ||
          JSON.stringify(cached.evidenceIds) !==
            JSON.stringify(packet.items.map((i) => i.id))
        )
          throw new Error("provider-cache-invalid");
        validateSuggestion(cached.suggestion);
        this.cacheHits++;
        return cached;
      }
      if (abort.signal.aborted)
        throw new Error("provider-timeout-or-cancelled");
      // Recheck after asynchronous setup so concurrent requests share the same allowance.
      if (this.usedCalls >= options.maxCalls)
        throw new Error("provider-call-budget");
      this.usedCalls++;
      const raw = await bounded(
        provider.interpret(packet, {
          signal: abort.signal,
          maxOutputTokens: options.maxOutputTokens,
        }),
      );
      const suggestion = validateSuggestion(raw);
      const record = {
        suggestion,
        provider: providerId,
        model,
        promptVersion,
        evidenceHash: key,
        evidenceIds: packet.items.map((i) => i.id),
        status: "requires-independent-human-review",
        cost: null,
        limitations: [
          "Token limits supplied to adapter; actual billing/cost unknown",
          "Contract tests do not establish live model fidelity",
          "No external provider is built in or silently selected",
        ],
      };
      if (this.cache.size >= 100)
        this.cache.delete(this.cache.keys().next().value!);
      this.cache.set(key, record);
      return record;
    } finally {
      clearTimeout(timer);
      options.signal?.removeEventListener("abort", cancel);
    }
  }
}

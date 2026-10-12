/** A deterministic contract example, not a model or a live supplier adapter. */
import type { EnrichmentProvider } from "../src/index.ts";
export const localContractProvider: EnrichmentProvider = {
  id: "synthetic-local-contract-provider",
  async capabilities(signal) {
    signal.throwIfAborted();
    return { model: "synthetic-contract-1", json: true, maxInputBytes: 32768 };
  },
  async interpret(packet, { signal }) {
    signal.throwIfAborted();
    return {
      decision: "abstain",
      rationale:
        "This deterministic example demonstrates the contract only. It provides no model advice or independent content assessment.",
      evidenceIds: packet.items.map((item) => item.id),
      destination: null,
      reviewRequired: true,
    };
  },
};

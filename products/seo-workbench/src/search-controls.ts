/** Observed publisher controls are informational; intentional restrictions are never scored as defects. */
import { readFileSync } from "node:fs";
import type { Observation } from "./domain.ts";
import { activeFacts } from "./rules.ts";
export interface PublisherControl {
  token: string;
  purpose: string;
  sourceId: string;
  interpretation: string;
  permission:
    | "allowed-by-observed-policy"
    | "disallowed-by-observed-policy"
    | "no-file-allow"
    | "unknown";
  robotsHash: string | null;
}
export const controlDefinitions: Omit<
  PublisherControl,
  "permission" | "robotsHash"
>[] = JSON.parse(
  readFileSync(
    new URL("../data/search-controls.json", import.meta.url),
    "utf8",
  ),
).providers;
export function searchControls(observations: Observation[]) {
  return observations.map((o) => ({
    url: o.url,
    evidenceIds: [o.id],
    timestamp: o.timestamp,
    publisherControls:
      o.publisherControls ??
      controlDefinitions.map((d) => ({
        ...d,
        permission: "unknown",
        robotsHash: null,
      })),
    metaDirectives: activeFacts(o)?.metaDirectives ?? null,
    responseDirectives: o.response?.headers["x-robots-tag"] ?? null,
    responseDirectiveFields: o.response?.robotsTags ?? null,
    snippetMarkup: activeFacts(o)?.snippetMarkup ?? null,
    outcome: "informational; intended publisher restrictions preserved",
    explanation:
      "These settings are provided for information. Deliberate restrictions are not treated as defects.",
    limitations: [
      "Crawler instructions are requests to services, not access controls. They do not establish that a provider followed them.",
      "This check does not establish firewall behaviour, indexing, citations, rankings, visits or use in model training.",
      "A service fetching a page at a user’s request may follow different rules from its automatic crawler.",
      "The provider explanations are recorded with their sources and version. This check does not require an llms.txt file or calculate an AI visibility score.",
    ],
  }));
}

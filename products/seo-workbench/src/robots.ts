/** Keep the pinned parser's matching while repairing observed RFC 9309 input gaps. */
import { createRequire } from "node:module";

interface Robot {
  isAllowed(url: string, ua?: string): boolean | undefined;
  getSitemaps(): string[];
  getCrawlDelay(ua?: string): number | undefined;
}
const parser = createRequire(import.meta.url)("robots-parser") as (
  url: string,
  text: string,
) => Robot;

function unreserved(value: string): string {
  return value.replace(/%[\da-f]{2}/gi, (encoded) => {
    const char = String.fromCharCode(parseInt(encoded.slice(1), 16));
    return /^[\w.~-]$/.test(char) ? char : encoded.toUpperCase();
  });
}

export function parseRobots(url: string, text: string): Robot {
  const lines: string[] = [],
    sitemaps: string[] = [];
  const delays = new Map<string, number>(),
    declared = new Set<string>();
  let agents: string[] = [],
    groupDelay: number | undefined,
    hasRules = false;
  const agentKey = (value: string) =>
    value.toLowerCase().split("/", 1)[0].trim();
  const finishGroup = () => {
    if (groupDelay !== undefined)
      for (const agent of agents)
        delays.set(agent, Math.max(delays.get(agent) ?? 0, groupDelay));
    if (agents.length && !hasRules) lines.push("disallow:");
  };
  for (const raw of text.split(/\r\n|\r|\n/)) {
    const line = raw.split("#", 1)[0].trim();
    const colon = line.indexOf(":");
    if (colon < 0) continue;
    const name = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();
    if (name === "sitemap") sitemaps.push(value);
    else if (name === "crawl-delay") {
      if (/^\d+(?:\.\d+)?$/.test(value) && Number.isFinite(Number(value)))
        groupDelay = Math.max(groupDelay ?? 0, Number(value));
    } else if (["user-agent", "allow", "disallow"].includes(name)) {
      if (name === "user-agent") {
        if (hasRules) {
          finishGroup();
          agents = [];
          groupDelay = undefined;
          hasRules = false;
        }
        if (value) {
          agents.push(agentKey(value));
          declared.add(agentKey(value));
        }
      } else hasRules = true;
      lines.push(
        name +
          ": " +
          (["allow", "disallow"].includes(name) ? unreserved(value) : value),
      );
    }
  }
  // Extensions cannot split groups; conflicting delays use the slower request rate.
  finishGroup();
  const parsed = parser(url, lines.join("\n"));
  return {
    isAllowed: (target, agent) => parsed.isAllowed(unreserved(target), agent),
    getCrawlDelay: (agent) =>
      delays.get(agentKey(agent ?? "*")) ??
      (declared.has(agentKey(agent ?? "*")) ? undefined : delays.get("*")),
    getSitemaps: () => sitemaps.filter(Boolean),
  };
}

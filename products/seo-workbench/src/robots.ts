/** Keep the pinned parser's matching while repairing observed RFC 9309 input gaps. */
import { createRequire } from "node:module";
import { fetchKey, scopeReason, type Config } from "./domain.ts";
import type { Transport } from "./network.ts";

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

/** Cache one policy request per approved origin, including concurrent browser resources. */
export function resourceRobotsPolicy(config: Config, transport: Transport) {
  const origins = new Set([
    ...config.origins,
    ...config.renderResources.map((url) => new URL(url).origin),
  ]);
  const robots = new Map<
    string,
    Promise<ReturnType<typeof parseRobots> | null>
  >();
  const allowed = async (url: string, requestSignal?: AbortSignal) => {
    const origin = new URL(url).origin;
    if (!origins.has(origin)) return false;
    if (!robots.has(origin))
      robots.set(
        origin,
        (async () => {
          let address = origin + "/robots.txt";
          const seen = new Set<string>();
          for (let hop = 0; hop <= 5; hop++) {
            if (seen.has(address)) throw new Error("lab-robots-unavailable");
            seen.add(address);
            const response = await transport.request(address, requestSignal);
            if (response.status >= 300 && response.status < 400) {
              if (!response.headers.location || hop === 5)
                throw new Error("lab-robots-unavailable");
              address = fetchKey(response.headers.location, address);
              if (
                !origins.has(new URL(address).origin) ||
                scopeReason(
                  {
                    ...config,
                    recheckUrls: undefined,
                    origins: [...origins],
                    include: ["/"],
                    exclude: [],
                  },
                  address,
                )
              )
                throw new Error("lab-robots-unavailable");
              continue;
            }
            if (response.status >= 200 && response.status < 300) {
              const parsed = parseRobots(origin + "/robots.txt", response.body),
                delay = parsed.getCrawlDelay("SEO-Workbench");
              if (delay !== undefined && Number.isFinite(delay) && delay > 0)
                transport.originDelays.set(origin, delay * 1000);
              return parsed;
            }
            if (
              response.status >= 400 &&
              response.status < 500 &&
              ![401, 403, 429].includes(response.status)
            )
              return null;
            throw new Error("lab-robots-unavailable");
          }
          throw new Error("lab-robots-unavailable");
        })(),
      );
    return (
      (await robots.get(origin))?.isAllowed(url, "SEO-Workbench") !== false
    );
  };
  return allowed;
}

/** Interpret retained response fields without treating another crawler's policy as ours. */
import { fetchKey, type Facts } from "./domain.ts";

function parts(value: string, separator: string): string[] | null {
  const result: string[] = [];
  let quoted = false,
    angle = false,
    escaped = false,
    start = 0;
  for (let i = 0; i < value.length; i++) {
    const char = value[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\" && quoted) {
      escaped = true;
      continue;
    }
    if (char === '"' && !angle) quoted = !quoted;
    else if (char === "<" && !quoted) angle = true;
    else if (char === ">" && !quoted) angle = false;
    if (char === separator && !quoted && !angle) {
      result.push(value.slice(start, i).trim());
      start = i + 1;
    }
  }
  if (quoted || angle || escaped) return null;
  result.push(value.slice(start).trim());
  return result;
}

function headerLinks(value: string | undefined, base: string) {
  const links: {
    target: string;
    raw: string;
    parameters: Map<string, string>;
  }[] = [];
  if (!value) return { links, complete: true };
  if (value.length > 65536) return { links, complete: false };
  const entries = parts(value, ",");
  if (!entries) return { links, complete: false };
  let complete = true;
  for (const entry of entries) {
    const link = /^<([^<>]*)>(.*)$/.exec(entry),
      values = link && parts(link[2], ";");
    if (!link || !values || values[0]) {
      complete = false;
      continue;
    }
    const parameters = new Map<string, string>();
    let supported = true;
    for (const parameter of values.slice(1)) {
      const parsed =
        /^([!#$%&'*+.^_`|~\w-]+)(?:\s*=\s*("(?:[^"\\]|\\.)*"|[^\s;",]+))?$/.exec(
          parameter,
        );
      if (!parsed) {
        supported = false;
        break;
      }
      const name = parsed[1].toLowerCase();
      if (
        ["anchor", "rel*", "hreflang*"].includes(name) ||
        (["rel", "hreflang"].includes(name) &&
          (!parsed[2] || parameters.has(name)))
      )
        supported = false;
      parameters.set(
        name,
        (parsed[2] ?? "").replace(/^"|"$/g, "").replace(/\\(.)/g, "$1"),
      );
    }
    if (!supported) {
      complete = false;
      continue;
    }
    try {
      links.push({ target: fetchKey(link[1], base), raw: link[1], parameters });
    } catch {
      complete = false;
    }
  }
  return { links, complete };
}
export function headerCanonicals(value: string | undefined, base: string) {
  const parsed = headerLinks(value, base);
  return {
    targets: parsed.links
      .filter((link) =>
        link.parameters
          .get("rel")
          ?.toLowerCase()
          .split(/\s+/)
          .includes("canonical"),
      )
      .map((link) => link.target),
    complete: parsed.complete,
  };
}
export function headerAlternates(value: string | undefined, base: string) {
  const parsed = headerLinks(value, base);
  return {
    links: parsed.links
      .filter(
        (link) =>
          link.parameters
            .get("rel")
            ?.toLowerCase()
            .split(/\s+/)
            .includes("alternate") && link.parameters.has("hreflang"),
      )
      .map((link) => ({
        target: link.target,
        language: link.parameters.get("hreflang")!,
        absolute: /^https?:\/\//i.test(link.raw),
        inHead: true,
      })),
    complete: parsed.complete,
  };
}

export function languageAlternates(
  facts: Facts | null | undefined,
  header: string | undefined,
  base: string,
) {
  const parsed = headerAlternates(header, base),
    legacy =
      facts?.languageAlternates === undefined &&
      facts?.edges.some((edge) => edge.kind === "alternate"),
    links = [...(facts?.languageAlternates ?? []), ...parsed.links];
  const seen = new Set<string>();
  return {
    links: links.filter((link) => {
      const key = JSON.stringify(link);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }),
    complete: parsed.complete && !legacy && !facts?.languageAlternatesTruncated,
  };
}

export function headerNoindex(fields: string[], agent = "googlebot"): boolean {
  return fields.some((field) => {
    let applies = true;
    return field.split(",").some((part) => {
      const scope = /^\s*([\w-]+)\s*:\s*(.*)$/.exec(part);
      if (
        scope &&
        [
          "unavailable_after",
          "max-snippet",
          "max-image-preview",
          "max-video-preview",
        ].includes(scope[1].toLowerCase())
      )
        return false;
      if (
        scope &&
        ![
          "unavailable_after",
          "max-snippet",
          "max-image-preview",
          "max-video-preview",
        ].includes(scope[1].toLowerCase())
      ) {
        applies = scope[1].toLowerCase() === agent;
        part = scope[2];
      }
      return applies && /(?:^|\s)(?:noindex|none)(?:$|\s)/i.test(part.trim());
    });
  });
}

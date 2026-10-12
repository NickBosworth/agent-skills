/** Bounded static extraction. No scripts, remote contexts or XML entities execute. */
import { load } from "cheerio";
import { XMLParser, XMLValidator } from "fast-xml-parser";
import { fetchKey, hash, type Facts, type Edge } from "./domain.ts";

export function extract(html: string, value: string): Facts {
  const $ = load(html);
  const edges: Edge[] = [];
  const baseHref = $("base[href]").first().attr("href");
  let base = value;
  try {
    if (baseHref) base = fetchKey(baseHref, value);
  } catch {
    /* Invalid bases fall back to the observed URL. */
  }
  const target = (raw: string | undefined) => {
    try {
      return raw ? fetchKey(raw, base) : null;
    } catch {
      return null;
    }
  };
  $("a[href]").each((_i, el) => {
    const to = target($(el).attr("href"));
    if (to)
      edges.push({
        target: to,
        kind: $(el).closest("nav,header,footer").length
          ? "navigation"
          : "hyperlink",
        anchor: $(el).text().trim().slice(0, 300),
      });
  });
  const canonical: string[] = [];
  const languageAlternates: NonNullable<Facts["languageAlternates"]> = [];
  let languageAlternatesTruncated = false;
  $("link").each((_i, el) => {
    const rel = ($(el).attr("rel") ?? "").toLowerCase().split(/\s+/);
    const to = target($(el).attr("href"));
    if (to && rel.includes("canonical")) {
      canonical.push(to);
      edges.push({ target: to, kind: "canonical" });
    }
    if (rel.includes("alternate") && $(el).attr("hreflang") !== undefined) {
      const raw = ($(el).attr("href") ?? "").trim(),
        language = $(el).attr("hreflang") ?? "";
      if (
        languageAlternates.length >= 1000 ||
        language.length > 500 ||
        raw.length > 4096
      )
        languageAlternatesTruncated = true;
      else
        languageAlternates.push({
          target: to,
          language,
          absolute: /^https?:\/\//i.test(raw),
          inHead: $(el).closest("head").length > 0,
        });
      if (to)
        edges.push({
          target: to,
          kind: "alternate",
          language: $(el).attr("hreflang"),
        });
    }
  });
  const jsonld: unknown[] = [];
  let jsonldErrors = 0;
  $('script[type="application/ld+json"]').each((_i, el) => {
    try {
      const data = JSON.parse($(el).text());
      jsonld.push(data);
    } catch {
      jsonldErrors++;
    }
  });
  const images: { src: string; alt: string | null; decorative: boolean }[] = [];
  $("img").each((_i, el) => {
    images.push({
      src: target($(el).attr("src")) ?? "",
      alt: $(el).attr("alt") ?? null,
      decorative:
        $(el).attr("alt") === "" || $(el).attr("role") === "presentation",
    });
  });
  const title = $("title").first().text().trim();
  const description =
    $('meta[name="description" i]').first().attr("content") ?? "";
  const headings = $("h1,h2,h3,h4,h5,h6")
    .map((_i, el) => $(el).text().trim())
    .get();
  const language = $("html").attr("lang") ?? "";
  const robots = $('meta[name="robots" i],meta[name="googlebot" i]')
    .map((_i, el) => $(el).attr("content") ?? "")
    .get();
  const metaDirectives: Record<string, string[]> = {};
  for (const name of ["robots", "googlebot", "bingbot"])
    metaDirectives[name] = $('meta[name="' + name + '" i]')
      .map((_i, el) => $(el).attr("content") ?? "")
      .get();
  const snippetMarkup = { dataNosnippetElements: $("[data-nosnippet]").length };
  const microdata = $("[itemscope]").length > 0,
    rdfa = $("[typeof]").length > 0;
  $(
    'script,style,noscript,template,nav,header,footer,aside,[hidden],[aria-hidden="true"]',
  ).remove();
  const collectedText = ($("main").length ? $("main").first() : $("body"))
    .text()
    .replace(/\s+/g, " ")
    .trim();
  const text = collectedText.slice(0, 500000);
  const words = Array.from(
    new Set(text.toLocaleLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? []),
  ).slice(0, 5000);
  return {
    documentBase: base,
    languageAlternates,
    languageAlternatesTruncated,
    title,
    description,
    headings,
    language,
    robots,
    metaDirectives,
    snippetMarkup,
    canonical,
    edges,
    text,
    textHash: hash(text),
    textTruncated: collectedText.length > 500000,
    words,
    images,
    jsonld,
    jsonldErrors,
    microdata,
    rdfa,
  };
}
/** Parse sitemap/index URLs; reject DTDs before decoding ordinary XML escapes. */
export function sitemapLocations(xml: string): {
  index: boolean;
  locations: string[];
} {
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error("xml-entities-blocked");
  if (XMLValidator.validate(xml) !== true) throw new Error("malformed-sitemap");
  const data = new XMLParser({
    processEntities: true,
    // This parser version enables numeric character references through this option.
    htmlEntities: true,
    ignoreAttributes: true,
    ignoreDeclaration: true,
    ignorePiTags: true,
    removeNSPrefix: true,
    parseTagValue: false,
    isArray: (name) => name === "url" || name === "sitemap",
  }).parse(xml);
  const roots = Object.keys(data);
  if (
    roots.length !== 1 ||
    !["urlset", "sitemapindex"].includes(roots[0]) ||
    Array.isArray(data[roots[0]])
  )
    throw new Error("invalid-sitemap-root");
  const index = roots[0] === "sitemapindex";
  const root = data[roots[0]],
    entries = index ? root?.sitemap : root?.url;
  if (!entries && root !== "") throw new Error("invalid-sitemap-root");
  const items = entries ?? [];
  return {
    index,
    locations: items.map((item: { loc?: unknown }) => {
      if (typeof item?.loc !== "string" || !item.loc || item.loc.length >= 2048)
        throw new Error("invalid-sitemap-location");
      try {
        fetchKey(item.loc);
      } catch {
        throw new Error("invalid-sitemap-location");
      }
      return item.loc;
    }),
  };
}

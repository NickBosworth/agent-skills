/** Versioned public contracts. Missing observations remain null, never healthy. */
import { z } from "zod";
import { isPublicErrorCode } from "./messages.ts";
import { createHash } from "node:crypto";

export const VERSION = "0.1.0";
export const DATABASE_SCHEMA_VERSION = 5;
export const RULESET = "0.1.8";
export const AGENT = "SEO-Workbench/0.1";
const url = z
  .string()
  .max(4096)
  .url()
  .refine((value) => {
    const parsed = new URL(value);
    return (
      ["http:", "https:"].includes(parsed.protocol) &&
      !parsed.username &&
      !parsed.password
    );
  }, "Use HTTP(S) without credentials");
const prefix = z.string().max(512).startsWith("/");
export const ContractSchema = z.strictObject({
  pathPrefix: prefix,
  indexability: z.enum(["indexable", "excluded"]).optional(),
  canonical: url.optional(),
  title: z.string().max(500).optional(),
  language: z.string().max(50).optional(),
  criticalText: z.array(z.string().min(1).max(500)).max(20).default([]),
  sitemap: z.boolean().optional(),
  template: z.string().max(100).default("unclassified"),
  requiredLinks: z.array(url).max(50).default([]),
  requiredAlternates: z
    .array(z.strictObject({ language: z.string().min(1).max(50), target: url }))
    .max(50)
    .default([]),
  requiredStructuredTypes: z
    .array(z.string().regex(/^[A-Za-z0-9]+$/))
    .max(20)
    .default([]),
  googleFeatures: z
    .array(z.enum(["product-snippet", "article", "local-business"]))
    .max(3)
    .default([]),
  importance: z.enum(["ordinary", "important"]).default("ordinary"),
});
export const ConfigSchema = z.strictObject({
  schemaVersion: z.literal(1).default(1),
  name: z.string().min(1).max(100).default("Website"),
  seeds: z.array(url).min(1).max(100),
  origins: z.array(url).min(1).max(20),
  recheckUrls: z.array(url).min(1).max(10000).optional(),
  include: z.array(prefix).min(1).max(50).default(["/"]),
  exclude: z.array(prefix).max(50).default([]),
  inventory: z.array(url).max(10000).default([]),
  sitemaps: z.array(url).max(100).default([]),
  maxPages: z.number().int().min(1).max(100000).default(100000),
  maxDiscoveries: z.number().int().min(1).max(200000).default(200000),
  maxRequests: z.number().int().min(1).max(300000).default(300000),
  maxDepth: z.number().int().min(0).max(100000).default(100000),
  maxSeconds: z.number().int().min(1).max(86400).default(86400),
  maxBytes: z.number().int().min(1024).max(10_000_000).default(10_000_000),
  maxMemoryBytes: z
    .number()
    .int()
    .min(33554432)
    .max(2147483648)
    .default(2147483648),
  maxStorageBytes: z
    .number()
    .int()
    .min(10000)
    .max(1_000_000_000)
    .default(1_000_000_000),
  maxDownloadBytes: z
    .number()
    .int()
    .min(10000)
    .max(1_000_000_000)
    .default(1_000_000_000),
  delayMs: z.number().int().min(0).max(60000).default(500),
  timeoutMs: z.number().int().min(100).max(60000).default(60000),
  retries: z.number().int().min(0).max(3).default(3),
  renderResources: z.array(url).max(50).default([]),
  render: z.enum(["none", "auto", "all"]).default("none"),
  renderTimeoutMs: z.number().int().min(100).max(30000).default(30000),
  renderReadySelector: z.string().max(100).optional(),
  locale: z
    .string()
    .max(50)
    .refine((value) => {
      try {
        return Intl.getCanonicalLocales(value).length === 1;
      } catch {
        return false;
      }
    }, "Use a valid locale tag")
    .default("en-GB"),
  viewport: z
    .strictObject({
      width: z.number().int().min(320).max(2560),
      height: z.number().int().min(240).max(2160),
    })
    .default({ width: 1280, height: 800 }),
  profile: z
    .enum([
      "general",
      "ecommerce",
      "content",
      "javascript",
      "international",
      "local",
      "documentation",
      "ugc",
    ])
    .default("general"),
  contracts: z.array(ContractSchema).max(1000).default([]),
  exceptions: z
    .array(
      z.strictObject({
        ruleId: z.string().max(50),
        url,
        reason: z.string().min(10).max(500),
        ownerRole: z.string().min(1).max(100),
        expires: z.string().date().optional(),
      }),
    )
    .max(1000)
    .default([]),
  performanceBudgets: z
    .strictObject({
      version: z.string().min(1).max(50),
      field: z
        .strictObject({
          lcpMs: z.number().finite().nonnegative().optional(),
          cls: z.number().finite().nonnegative().optional(),
          inpMs: z.number().finite().nonnegative().optional(),
        })
        .optional(),
      lab: z
        .strictObject({
          lcpMs: z.number().finite().nonnegative().optional(),
          cls: z.number().finite().nonnegative().optional(),
          tbtMs: z.number().finite().nonnegative().optional(),
        })
        .optional(),
    })
    .optional(),
  environment: z
    .enum(["production", "staging", "synthetic"])
    .default("production"),
});
export type Config = z.infer<typeof ConfigSchema>;
export type Contract = z.infer<typeof ContractSchema>;
export type Outcome =
  | "pass"
  | "fail"
  | "warning"
  | "not-applicable"
  | "not-tested"
  | "blocked"
  | "error";
export type QueueState =
  "queued" | "fetching" | "fetched" | "excluded" | "blocked" | "failed";
export interface Edge {
  target: string;
  kind:
    | "hyperlink"
    | "navigation"
    | "canonical"
    | "alternate"
    | "redirect"
    | "sitemap";
  anchor?: string;
  language?: string;
}
export interface Facts {
  languageAlternates?: {
    target: string | null;
    language: string;
    absolute: boolean;
    inHead: boolean;
  }[];
  languageAlternatesTruncated?: boolean;
  documentBase?: string;
  renderedMainText?: { text: string; truncated: boolean };
  renderedPageText?: { text: string; truncated: boolean };
  title: string;
  description: string;
  headings: string[];
  language: string;
  robots: string[];
  metaDirectives?: Record<string, string[]>;
  snippetMarkup?: { dataNosnippetElements: number };
  canonical: string[];
  edges: Edge[];
  text: string;
  textHash: string;
  textTruncated?: boolean;
  words: string[];
  images: { src: string; alt: string | null; decorative: boolean }[];
  jsonld: unknown[];
  jsonldErrors: number;
  microdata: boolean;
  rdfa: boolean;
}
export interface ResponseEvidence {
  url: string;
  status: number;
  headers: Record<string, string>;
  robotsTags?: string[];
  body: string;
  requestedAt: string;
  durationMs: number;
  bytes: number;
  address: string;
  bodyBase64?: string;
  /** Original compressed representation; bodyBase64 holds decoded bytes. */
  encodedBodyBase64?: string;
  decodedBytes?: number;
}
export interface Observation {
  extensionFacts?: import("./extractors.ts").ExtractorFacts[];
  evidenceProjection?: "facts-only";
  id: string;
  url: string;
  originalUrl: string;
  publisherControls?: import("./search-controls.ts").PublisherControl[];
  attempts: ResponseEvidence[];
  finalUrl: string;
  response: ResponseEvidence | null;
  facts: Facts | null;
  render: {
    status: "observed" | "blocked" | "error" | "timeout";
    dom?: string;
    facts?: Facts;
    reason?: string;
    runtime?: string;
    elapsedMs?: number;
    profile?: unknown;
    failures?: string[];
  } | null;
  error: string | null;
  timestamp: string;
}
export interface RuleResult {
  id: string;
  ruleId: string;
  ruleVersion: string;
  url: string;
  outcome: Outcome;
  observed: unknown;
  expected: unknown;
  evidenceIds: string[];
  denominator: number;
  applicability: string;
  engine: string;
  severity: "high" | "medium" | "low" | "info";
  observationConfidence: string;
  interpretationConfidence: string;
  causeConfidence: string;
  reason: string;
  remediation: string;
  verification: string;
  sourceIds: string[];
  exception?: unknown;
}
export function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
/** Fetch identity keeps query ordering, path case and trailing slashes. */
export function fetchKey(value: string, base?: string): string {
  const parsed = new URL(value, base);
  if (
    !["http:", "https:"].includes(parsed.protocol) ||
    parsed.username ||
    parsed.password
  )
    throw new Error("invalid-url");
  parsed.hash = "";
  return parsed.href;
}
export function parseConfig(value: unknown): Config {
  const config = ConfigSchema.parse(value);
  config.origins = config.origins.map((value) => new URL(value).origin);
  if (new Set(config.origins).size !== config.origins.length)
    throw new Error("duplicate-origin");
  for (const item of [
    ...config.seeds,
    ...config.inventory,
    ...config.sitemaps,
    ...(config.recheckUrls ?? []),
  ]) {
    if (!config.origins.includes(new URL(item).origin))
      throw new Error("out-of-scope-config-url");
  }
  if (config.recheckUrls) {
    config.recheckUrls = [
      ...new Set(config.recheckUrls.map((value) => fetchKey(value))),
    ];
    if (
      config.recheckUrls.some((value) =>
        scopeReason({ ...config, recheckUrls: undefined }, value),
      )
    )
      throw new Error("verification-scope-invalid");
  }
  for (const contract of config.contracts) {
    if (contract.canonical) contract.canonical = fetchKey(contract.canonical);
    contract.requiredLinks = contract.requiredLinks.map((value) =>
      fetchKey(value),
    );
    contract.requiredAlternates = contract.requiredAlternates.map((a) => ({
      ...a,
      target: fetchKey(a.target),
    }));
  }
  return config;
}
export function contractFor(
  config: Config,
  value: string,
): Contract | undefined {
  const path = new URL(value).pathname;
  return config.contracts
    .filter((c) => path.startsWith(c.pathPrefix))
    .sort((a, b) => b.pathPrefix.length - a.pathPrefix.length)[0];
}
export function scopeReason(config: Config, value: string): string | null {
  try {
    const parsed = new URL(fetchKey(value));
    if (!config.origins.includes(parsed.origin)) return "origin";
    if (!config.include.some((p) => parsed.pathname.startsWith(p)))
      return "include";
    if (config.exclude.some((p) => parsed.pathname.startsWith(p)))
      return "exclude";
    const decoded = decodeURIComponent(parsed.pathname).toLowerCase();
    if (
      /(?:^|\/)(?:logout|signout|delete|remove|checkout|cart|admin|wp-admin)(?:\/|$)/.test(
        decoded,
      )
    )
      return "state-changing-route";
    if (
      [...parsed.searchParams.keys()].some((k) =>
        /^(?:session|sid|phpsessid|token|password|access_token)$/i.test(k),
      )
    )
      return "sensitive-query";
    if (config.recheckUrls && !config.recheckUrls.includes(parsed.href))
      return "verification-scope";
    return null;
  } catch {
    return "invalid-url";
  }
}
/** Redact diagnostics rather than printing network errors that can contain inputs. */
export function errorCode(error: unknown): string {
  if (error instanceof Error) {
    const storage = error as Error & { code?: string; errcode?: number };
    if (
      storage.code === "ENOSPC" ||
      (storage.code === "ERR_SQLITE_ERROR" &&
        typeof storage.errcode === "number" &&
        (storage.errcode & 255) === 13)
    )
      return "storage-full";
  }
  const message = error instanceof Error ? error.message : "";
  return isPublicErrorCode(message) ? message : "operation-failed";
}

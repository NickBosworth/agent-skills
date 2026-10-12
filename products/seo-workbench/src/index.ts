/** Public programmatic entry point; adapters share these same implementations. */
export * from "./domain.ts";
export { Store, defaultDataDirectory, type ResultOptions } from "./store.ts";
export { NetworkPolicy, Transport } from "./network.ts";
export { Crawler } from "./crawler.ts";
export { Workbench } from "./app.ts";
export {
  analyze,
  rules,
  type TrustedRule,
  type RuleDefinition,
  type RuleContext,
} from "./rules.ts";
export { extract, sitemapLocations } from "./extract.ts";
export { graph, groups, opportunities, compare } from "./intelligence.ts";
export {
  exportReport,
  reportData,
  csvReport,
  jsonReport,
  reportChunks,
} from "./reports.ts";
export {
  importData,
  demandReview,
  SearchImport,
  PerformanceImport,
  parsePerformance,
  VisibilityImport,
  ExternalResearchImport,
} from "./imports.ts";
export {
  Enrichment,
  type EnrichmentProvider,
  type EvidencePacket,
} from "./enrichment.ts";
export {
  collectSearchConsole,
  inspectIndexedURL,
  collectCrUX,
  collectPageSpeed,
  type ProviderTransport,
} from "./providers.ts";
export { OllamaProvider } from "./ollama.ts";
export { ModelAllowance, ModelLimits, modelUsage } from "./model-allowance.ts";
export { monitoringPlan, runMonitoring } from "./monitoring.ts";

export {
  demandOpportunities,
  reviewContent,
  ContentReviewSchema,
  ContentBriefSchema,
} from "./content.ts";
export { schemaNodes, type SchemaNode } from "./schema.ts";

export {
  searchControls,
  controlDefinitions,
  type PublisherControl,
} from "./search-controls.ts";

export { performanceReview } from "./performance.ts";

export { reviewAction, ActionReviewSchema } from "./actions.ts";
export { mapSource, SourceMappingSchema } from "./source-mapping.ts";

export { nearDuplicateReview } from "./similarity.ts";

export { backupStore, retentionPlan, applyRetention } from "./maintenance.ts";

export {
  verificationPlan,
  savedVerificationPlan,
  verifyRun,
  VerificationRequest,
  type VerificationPlan,
} from "./verification.ts";

export {
  measureLocalPerformance,
  LocalLabRequest,
} from "./local-lighthouse.ts";

export { structuredVocabulary } from "./schema-review.ts";

export {
  featureFields,
  structuredTextClaims,
  productVariantReview,
} from "./structured-features.ts";

export { compareSearchPeriods } from "./search-comparison.ts";

export { SiteDataImport, siteDataReview } from "./site-data.ts";

export {
  extractCustomFacts,
  type TrustedExtractor,
  type ExtractorFacts,
} from "./extractors.ts";

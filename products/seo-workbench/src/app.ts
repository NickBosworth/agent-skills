/** Application facade shared by CLI, HTTP and MCP; no adapter owns SEO policy. */
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { z } from "zod";
import { ConfigSchema, parseConfig, errorCode } from "./domain.ts";
import { Crawler } from "./crawler.ts";
import { Store } from "./store.ts";
import { NetworkPolicy } from "./network.ts";
import {
  groups,
  graph,
  opportunities,
  compare,
  type ComparisonMap,
} from "./intelligence.ts";
import { nearDuplicateReview } from "./similarity.ts";
import { reviewAction } from "./actions.ts";
import { performanceReview } from "./performance.ts";
import { searchControls } from "./search-controls.ts";
import { siteDataReview } from "./site-data.ts";
import { modelUsage } from "./model-allowance.ts";
import { demandOpportunities, reviewContent } from "./content.ts";
import { exportReport, reportChunks } from "./reports.ts";
import { compareSearchPeriods } from "./search-comparison.ts";
import { importData, demandReview, SearchImport } from "./imports.ts";

import {
  verificationPlan,
  savedVerificationPlan,
  verifyRun,
} from "./verification.ts";

import { measureLocalPerformance } from "./local-lighthouse.ts";

const identifier = z.string().uuid();
export class Workbench {
  readonly crawler: Crawler;
  readonly store: Store;
  readonly policy: NetworkPolicy;
  constructor(store: Store, policy = new NetworkPolicy()) {
    this.store = store;
    this.policy = policy;
    this.crawler = new Crawler(store, policy);
  }
  measurePerformance(value: unknown, signal?: AbortSignal) {
    return measureLocalPerformance(this.store, this.policy, value, signal);
  }
  start(
    value: unknown,
    projectId?: string,
  ): { projectId: string; auditId: string } {
    const ids = this.queue(value, projectId);
    this.launch(ids.auditId);
    return ids;
  }
  async run(value: unknown, projectId?: string) {
    const ids = this.queue(value, projectId);
    await this.crawler.run(ids.auditId);
    return ids;
  }
  private queue(value: unknown, projectId?: string) {
    const config = parseConfig(value);
    let project: string, id: string;
    let release: () => void;
    try {
      release = this.store.reserveWorkerSlot();
    } catch (error) {
      if (errorCode(error) === "audit-worker-active")
        throw new Error("audit-worker-capacity");
      throw error;
    }
    try {
      this.store.db.exec("BEGIN IMMEDIATE");
      if (this.store.hasActiveJobs()) throw new Error("audit-worker-capacity");
      project = projectId
        ? identifier.parse(projectId)
        : this.store.createProject(config);
      this.store.project(project);
      id = this.store.createAudit(project, config);
      this.store.db.exec("COMMIT");
    } catch (error) {
      if (this.store.db.isTransaction) this.store.db.exec("ROLLBACK");
      throw error;
    } finally {
      release();
    }
    return { projectId: project, auditId: id };
  }
  /** Detached worker owns its SQLite job; client disconnect does not terminate it. */
  launch(id: string): void {
    identifier.parse(id);
    const audit = this.store.audit(id);
    if (["running", "analyzing"].includes(audit.state))
      throw new Error("audit-worker-active");
    const cli = new URL(
      "./cli." + (import.meta.url.endsWith(".ts") ? "ts" : "js"),
      import.meta.url,
    );
    const args = [
      "--max-old-space-size=" +
        Math.max(64, Math.floor(audit.config.maxMemoryBytes / 2 ** 20) - 100),
      fileURLToPath(cli),
      "worker",
      id,
      "--data",
      this.store.directory,
    ];
    for (const origin of this.policy.localOrigins)
      args.push("--allow-local-origin", origin);
    const child = spawn(process.execPath, args, {
      detached: true,
      stdio: "ignore",
    });
    child.once("error", (error) =>
      this.store.failUnclaimed(id, errorCode(error)),
    );
    child.unref();
  }
  control(id: string, action: "pause" | "cancel" | "resume"): void {
    identifier.parse(id);
    const audit = this.store.audit(id);
    if (audit.state === "complete") throw new Error("audit-already-complete");
    if (action === "resume") {
      if (this.store.hasEvent(id, "extractor-manifest"))
        throw new Error("extractor-manifest-mismatch");
      if (
        [
          "page-budget",
          "request-budget",
          "download-budget",
          "storage-budget",
          "time-budget",
          "retry-delay-budget",
          "persistent-storage-budget",
          "discovery-budget",
        ].includes(audit.reason ?? "") ||
        Date.now() - Date.parse(audit.createdAt) >=
          audit.config.maxSeconds * 1000
      )
        throw new Error("audit-limit-reached");
      this.store.resume(id);
      this.launch(id);
    } else
      this.store.state(
        id,
        action === "pause" ? "paused" : "cancelled",
        "user-" + action,
      );
  }
  view(
    id: string,
    view: string,
    options: {
      offset?: number;
      limit?: number;
      search?: string;
      sort?: string;
      outcome?: string;
      groupId?: string;
      ruleId?: string;
      url?: string;
      importId?: string;
      baselineImportId?: string;
      currentImportId?: string;
    } = {},
  ) {
    identifier.parse(id);
    const audit = this.store.audit(id);
    const offset = Math.max(0, options.offset ?? 0),
      limit = Math.min(200, Math.max(1, options.limit ?? 100));
    switch (view) {
      case "status":
        return {
          audit: { ...audit, config: undefined },
          coverage: this.store.coverage(id),
          events: this.store.events(id),
        };
      case "findings":
        return this.store.results(id, {
          offset,
          limit,
          outcome: options.outcome,
          ruleId: options.ruleId,
          search: options.search,
          sort: options.sort,
        });
      case "group-members":
      case "groups": {
        const analysisId = this.store.latestAnalysis(id);
        const collected = groups(
          analysisId ? this.store.allResults(id, analysisId) : [],
          audit.config,
          this.store
            .imports(audit.projectId, "action-review")
            .filter((r: any) => r.auditId === id),
          analysisId ?? undefined,
          this.store
            .imports(audit.projectId, "source-mapping")
            .filter((r: any) => r.auditId === id),
        );
        if (view === "group-members") {
          const group = collected.find((item) => item.id === options.groupId);
          if (!group) throw new Error("action-group-not-found");
          const affected: string[] = [];
          let bytes = 0;
          for (const url of group.affected.slice(offset, offset + limit)) {
            const size = Buffer.byteLength(JSON.stringify(url)) + 1;
            if (bytes + size > 70000) break;
            bytes += size;
            affected.push(url);
          }
          const end = offset + affected.length;
          return {
            groupId: group.id,
            total: group.affected.length,
            offset,
            affected,
            nextOffset: end < group.affected.length ? end : null,
          };
        }
        return collected.slice(offset, offset + limit);
      }
      case "pages":
        return this.store.pages(
          id,
          offset,
          limit,
          options.search,
          options.sort,
        );
      case "page": {
        const row = this.store.observation(id, options.url ?? "");
        if (!row) throw new Error("page-evidence-not-found");
        return row;
      }
      case "graph":
        return graph(
          this.store.analysisObservations(id),
          audit.config.seeds,
          audit.config,
        ).slice(offset, offset + limit);
      case "content":
        return opportunities(
          this.store.analysisObservations(id),
          audit.config,
          this.store.imports(audit.projectId, "search-console"),
          this.store
            .imports(audit.projectId, "content-review")
            .filter((r: any) => r.auditId === id),
        ).slice(offset, offset + limit);
      case "content-similarity": {
        const review = nearDuplicateReview(this.store.analysisObservations(id));
        return {
          ...review,
          totalPairs: review.pairs.length,
          pairs: review.pairs.slice(offset, offset + limit),
        };
      }
      case "site-data": {
        if (options.importId) {
          const importId = identifier.parse(options.importId),
            review = siteDataReview(
              this.store.savedImport(audit.projectId, "site-data", importId),
            );
          return {
            importId,
            metadata: { ...review, rows: undefined },
            offset,
            totalRows: review.rows.length,
            rows: review.rows.slice(offset, offset + limit),
          };
        }
        return this.store
          .importRecords(audit.projectId, "site-data")
          .slice(offset, offset + limit)
          .map((record) => ({
            importId: record.id,
            ...siteDataReview(record.data),
            rows: undefined,
          }));
      }
      case "external-research":
        return this.store
          .imports(audit.projectId, "external-research")
          .slice(offset, offset + limit);
      case "verification":
        return {
          plans: this.store
            .imports(audit.projectId, "verification-plan")
            .slice(offset, offset + limit),
          runs: this.store
            .imports(audit.projectId, "verification-run")
            .filter((r: any) => r.baselineAuditId === id || r.auditId === id)
            .slice(offset, offset + limit),
        };
      case "search-visibility":
        return this.store
          .imports(audit.projectId, "search-visibility")
          .slice(offset, offset + limit);
      case "search-controls":
        return searchControls(this.store.analysisObservations(id)).slice(
          offset,
          offset + limit,
        );
      case "content-opportunities":
        return demandOpportunities(
          this.store.analysisObservations(id),
          audit.config,
          this.store.imports(audit.projectId, "search-console"),
        ).slice(offset, offset + limit);
      case "content-reviews":
        return this.store
          .imports(audit.projectId, "content-review")
          .filter((r: any) => r.auditId === id)
          .slice(offset, offset + limit);
      case "search-periods":
        return this.store
          .importRecords(audit.projectId, "search-console")
          .slice(offset, offset + limit)
          .map((record) => {
            const data = SearchImport.parse(record.data);
            return {
              id: record.id,
              created: record.created,
              startDate: data.startDate,
              endDate: data.endDate,
              searchType: data.searchType,
              method: data.method,
              aggregation: data.aggregation,
              complete: data.complete,
              filtersKnown: data.filters !== undefined,
              rowCount: data.rows.length,
            };
          });
      case "search-comparison": {
        const baselineImportId = identifier.parse(options.baselineImportId),
          currentImportId = identifier.parse(options.currentImportId);
        if (baselineImportId === currentImportId)
          throw new Error("search-period-selection-invalid");
        const review = compareSearchPeriods(
          this.store.savedImport(
            audit.projectId,
            "search-console",
            baselineImportId,
          ),
          this.store.savedImport(
            audit.projectId,
            "search-console",
            currentImportId,
          ),
        );
        return {
          ...review,
          baselineImportId,
          currentImportId,
          totalPages: review.pages.length,
          offset,
          pages: review.pages.slice(offset, offset + limit),
        };
      }
      case "demand":
        return this.store
          .imports(audit.projectId, "search-console")
          .map(demandReview);
      case "suggestions":
        return this.store
          .imports(audit.projectId, "ai-suggestion")
          .slice(offset, offset + limit);
      case "index":
        return this.store
          .imports(audit.projectId, "index-inspection")
          .slice(offset, offset + limit);
      case "local-lab-series":
        return this.store
          .imports(audit.projectId, "local-lab-series")
          .slice(offset, offset + limit);
      case "model-usage":
        return modelUsage(this.store, id);
      case "performance":
        return performanceReview(
          this.store.imports(audit.projectId, "performance"),
          audit.config,
        ).slice(offset, offset + limit);
      case "config":
        return audit.config;
      default:
        throw new Error("view-not-found");
    }
  }
  report(
    id: string,
    format: "json" | "markdown" | "html" | "csv",
    profile: "private" | "shareable" = "private",
  ): string {
    identifier.parse(id);
    return exportReport(this.store, id, format, profile);
  }
  reportChunks(
    id: string,
    format: "json" | "markdown" | "html" | "csv",
    profile: "private" | "shareable" = "private",
  ): Generator<string> {
    identifier.parse(id);
    return reportChunks(this.store, id, format, profile);
  }
  compare(before: string, after: string, mapping: ComparisonMap = {}) {
    identifier.parse(before);
    identifier.parse(after);
    return compare(this.store, before, after, mapping);
  }
  planVerification(value: unknown) {
    return verificationPlan(this.store, value);
  }
  startVerification(planId: string) {
    const plan = savedVerificationPlan(this.store, planId);
    return {
      ...this.start(
        plan.config,
        this.store.audit(plan.baselineAuditId).projectId,
      ),
      planId: plan.planId,
    };
  }
  evaluateVerification(planId: string, afterId: string) {
    return verifyRun(this.store, planId, afterId);
  }
  reanalyze(id: string): string {
    identifier.parse(id);
    return this.crawler.reevaluate(id);
  }
  import(
    project: string,
    kind:
      | "search-console"
      | "performance"
      | "search-visibility"
      | "external-research"
      | "site-data",
    value: unknown,
  ): string {
    identifier.parse(project);
    return importData(this.store, project, kind, {
      ...(value as object),
      method: "manual import",
    });
  }
  reviewAction(value: unknown): string {
    return reviewAction(this.store, value);
  }
  reviewContent(value: unknown): string {
    return reviewContent(this.store, value);
  }
  verify(id: string): { projectId: string; auditId: string } {
    const audit = this.store.audit(identifier.parse(id));
    return this.start(audit.config, audit.projectId);
  }
}
export { ConfigSchema };

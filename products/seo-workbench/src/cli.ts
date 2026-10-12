#!/usr/bin/env node
/** CLI exit codes distinguish contract failures, tool errors and incomplete evidence. */
import { explainError } from "./messages.ts";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { execFileSync } from "node:child_process";
import {
  openSync,
  closeSync,
  readSync,
  fstatSync,
  constants,
  writeFileSync,
  existsSync,
  realpathSync,
  linkSync,
  unlinkSync,
  lstatSync,
  fsyncSync,
} from "node:fs";
import { resolve, dirname, basename, join } from "node:path";
import { Store, defaultDataDirectory, within } from "./store.ts";
import { randomUUID } from "node:crypto";
import { reportChunks } from "./reports.ts";
import { backupStore, retentionPlan, applyRetention } from "./maintenance.ts";
import { NetworkPolicy } from "./network.ts";
import { Workbench } from "./app.ts";
import {
  parseConfig,
  errorCode,
  VERSION,
  DATABASE_SCHEMA_VERSION,
} from "./domain.ts";
import { fixtureSite } from "./fixtures.ts";
import { serve } from "./server.ts";
import { serveMCP } from "./mcp.ts";
import { z } from "zod";
import { OllamaProvider } from "./ollama.ts";
import { Enrichment } from "./enrichment.ts";
import { ModelAllowance, modelUsage } from "./model-allowance.ts";
import { importData } from "./imports.ts";
import { compareSearchPeriods } from "./search-comparison.ts";
import { mapSource } from "./source-mapping.ts";
import { monitoringPlan, runMonitoring } from "./monitoring.ts";
import {
  collectSearchConsole,
  inspectIndexedURL,
  collectCrUX,
  collectPageSpeed,
} from "./providers.ts";

export function readJSON(path: string): unknown {
  const fd = openSync(path, constants.O_RDONLY | (constants.O_NONBLOCK ?? 0));
  try {
    const stat = fstatSync(fd);
    if (!stat.isFile()) throw new Error("input-file-required");
    if (stat.size > 5000000) throw new Error("input-size-budget");
    const bytes = Buffer.alloc(5000001);
    let count = 0,
      read = 0;
    while (
      count < bytes.length &&
      (read = readSync(fd, bytes, count, bytes.length - count, null)) > 0
    )
      count += read;
    if (count > 5000000) throw new Error("input-size-budget");
    return JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(
        bytes.subarray(0, count),
      ),
    );
  } finally {
    closeSync(fd);
  }
}
function output(path: string, content: string | Iterable<string>): void {
  const target = resolve(path),
    parent = realpathSync(dirname(target));
  // Source-adjacent private exports are forbidden even when ignored by Git.
  const product = resolve(import.meta.dirname, ".."),
    repository = resolve(product, "../..");
  if (
    within(parent, product) ||
    (existsSync(resolve(repository, "catalog.json")) &&
      within(parent, repository))
  )
    throw new Error("export-inside-repository");
  const final = join(parent, basename(target)),
    partial = final + ".partial-" + randomUUID();
  if (lstatSync(final, { throwIfNoEntry: false }))
    throw new Error("export-file-exists");
  const fd = openSync(partial, "wx", 0o600);
  try {
    try {
      for (const chunk of typeof content === "string" ? [content] : content)
        writeFileSync(fd, chunk);
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
    // A same-directory hard link publishes the completed file without replacing a destination.
    linkSync(partial, final);
  } finally {
    unlinkSync(partial);
  }
}
const help = `SEO Workbench ${VERSION} — understand your site and check your fixes

From the product directory:
  npm ci --ignore-scripts
  npm run build
  node dist/cli.js demo --serve

Commands:
  audit URL [--config FILE] [--render none|auto|all] [--max-pages N]
  start URL [--config FILE]                  start an audit that continues if the tab closes
  serve [--port 4173]                       local workbench
  demo [--render auto|all] [--serve]         crawl a fictional site before and after fixes
  status AUDIT                             see progress and pages checked
  findings AUDIT [--outcome fail]           paginated outcomes
  page AUDIT URL                           full private page evidence
  control AUDIT pause|resume|cancel
  plan-verification AUDIT GROUP             save a dependency-aware recheck plan
  start-verification PLAN                   start the planned fresh audit
  evaluate-verification PLAN AFTER          verify fresh evidence against the plan
  compare BEFORE AFTER [--mapping FILE]     check what changed between two audits
  verify AUDIT                             run a new audit with the same requirements
  reanalyze AUDIT                           check saved evidence without fetching pages
  report AUDIT --format html|markdown|json|csv --profile shareable|private --out FILE
  site-data AUDIT [IMPORT]                  read imported site evidence; --offset N for later records
  search-periods AUDIT                     list saved search periods and their identifiers
  compare-search AUDIT BASELINE CURRENT     compare selected imported query samples
  content AUDIT                            review page content and imported search queries
  review-action FILE                      save a review of priority, effort and risk
  map-source FILE --repository DIRECTORY   check and save an owner-supplied source reference
  review-content FILE                     save a proposed content decision
  import PROJECT search-console|performance|search-visibility|external-research|site-data FILE
  gate AUDIT                               test the project’s approved requirements
  monitor PROJECT                          preview a recurring audit's scope and limits
    [--selection TOKEN --execute]           run one reviewed audit; install no scheduler
  backup NEW_DIRECTORY                     create and verify a private database snapshot
  retention PROJECT --before TIMESTAMP      preview old stopped audit histories
    [--selection TOKEN --confirm-delete]     remove exactly the previewed selection
  delete-project PROJECT --confirm-delete     remove its histories and provider imports
  delete AUDIT --confirm-delete             remove selected audit and captures
  enrich AUDIT [PAGE_URL] --model MODEL --provider-origin http://127.0.0.1:11434 --authorize-transfer
    [--max-model-generations N --max-model-output-tokens N --max-model-cost-micros N]
  model-usage AUDIT                          inspect this audit's durable model allowance
  search-console PROJECT --start-date DATE --end-date DATE --credential-env NAME --authorize-transfer
  inspect-index PROJECT URL --credential-env NAME --authorize-transfer
  crux PROJECT URL --credential-env NAME --authorize-transfer [--origin-fallback]
  lighthouse PROJECT URL [--device mobile|desktop] [--repeats 5]
  pagespeed PROJECT URL --authorize-transfer [--repeats 3]
  mcp                                      local stdio server
  doctor                                   check which local features are available

Options:
  --data DIRECTORY                         store private audit data outside the source checkout
  --allow-local-origin http://127.0.0.1:PORT explicitly allow this local development address

Exit codes: 0 success, 1 failed approved contract, 2 tool/config error,
3 incomplete crawl/collection, 4 comparison not verifiable.
The core audit works without an account or AI key. It does not track app use or change your website.
`;
export async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      data: { type: "string" },
      "authorize-transfer": { type: "boolean" },
      model: { type: "string" },
      "provider-origin": { type: "string" },
      "max-model-generations": { type: "string" },
      "max-model-output-tokens": { type: "string" },
      "max-model-cost-micros": { type: "string" },
      "credential-env": { type: "string" },
      "start-date": { type: "string" },
      "end-date": { type: "string" },
      property: { type: "string" },
      device: { type: "string" },
      repeats: { type: "string" },
      "origin-fallback": { type: "boolean" },
      config: { type: "string" },
      render: { type: "string" },
      "max-pages": { type: "string" },
      port: { type: "string" },
      serve: { type: "boolean" },
      format: { type: "string" },
      profile: { type: "string" },
      out: { type: "string" },
      outcome: { type: "string" },
      offset: { type: "string" },
      mapping: { type: "string" },
      repository: { type: "string" },
      "allow-local-origin": { type: "string", multiple: true },
      "confirm-delete": { type: "boolean" },
      before: { type: "string" },
      selection: { type: "string" },
      execute: { type: "boolean" },
      help: { type: "boolean" },
    },
  });
  const [command = "help", arg, arg2, arg3] = positionals;
  if (command === "help" || values.help) {
    console.log(help);
    return;
  }
  if (command === "doctor") {
    let browser = false,
      git = false;
    try {
      execFileSync("git", ["--version"], { stdio: "ignore", timeout: 2000 });
      git = true;
    } catch {
      /* Source mapping is optional; core audits need no Git executable. */
    }
    try {
      const { chromium } = await import("playwright");
      browser = existsSync(chromium.executablePath());
    } catch {
      /* Optional dependency missing. */
    }
    console.log(
      JSON.stringify(
        {
          version: VERSION,
          node: process.versions.node,
          supportedRuntime:
            Number(process.versions.node.split(".")[0]) === 24 &&
            Number(process.versions.node.split(".")[1]) >= 15,
          sqlite: "node:sqlite schema " + DATABASE_SCHEMA_VERSION,
          browserInstalled: browser,
          publicHTTP: true,
          remoteRenderConfigured: browser,
          remoteRender:
            "local sandboxed Chromium; install the Playwright Chromium browser",
          syntheticRender: browser,
          sourceMappingAvailable: git,
          sourceMapping:
            "optional Git file checks; explicit local repository selection required",
          MCP: "official SDK v2, stdio; compatibility tested separately",
          data: "private external directory",
          AI: "not enabled",
          telemetry: false,
        },
        null,
        2,
      ),
    );
    return;
  }
  const store = new Store(values.data ?? defaultDataDirectory());
  const policy = new NetworkPolicy({
    localOrigins: values["allow-local-origin"],
  });
  const app = new Workbench(store, policy);
  let keep = false;
  try {
    switch (command) {
      case "worker":
        try {
          await app.crawler.run(z.string().uuid().parse(arg));
        } catch (error) {
          // A rejected late or duplicate worker must not replace an operator's state.
          store.failUnclaimed(arg, errorCode(error));
          throw error;
        }
        break;
      case "audit":
      case "start": {
        const url = arg ? new URL(arg) : null;
        const raw = values.config
          ? readJSON(values.config)
          : url
            ? { name: url.hostname, seeds: [url.href], origins: [url.origin] }
            : null;
        const config = parseConfig({
          ...(raw as object),
          ...(values.render ? { render: values.render } : {}),
          ...(values["max-pages"]
            ? { maxPages: Number(values["max-pages"]) }
            : {}),
        });
        let ids;
        if (command === "start") ids = app.start(config);
        else {
          ids = await app.run(config);
          process.exitCode = gate(store, ids.auditId);
        }
        console.log(
          JSON.stringify(
            { ...ids, coverage: store.coverage(ids.auditId) },
            null,
            2,
          ),
        );
        break;
      }
      case "monitor": {
        if (!values.execute) {
          console.log(JSON.stringify(monitoringPlan(store, arg), null, 2));
        } else {
          const summary = await runMonitoring(app, arg, values.selection);
          process.exitCode = gate(store, summary.auditId);
          console.log(
            JSON.stringify({ ...summary, exitCode: process.exitCode }, null, 2),
          );
        }
        break;
      }
      case "serve": {
        const server = await serve(
          app,
          values.port
            ? z.coerce.number().int().min(0).max(65535).parse(values.port)
            : 4173,
        );
        keep = true;
        console.log("Open " + server.origin);
        break;
      }
      case "demo": {
        const fixture = await fixtureSite();
        const demoPolicy = new NetworkPolicy({
          localOrigins: [fixture.origin],
        });
        const demo = new Workbench(store, demoPolicy),
          config = parseConfig({
            ...fixture.config,
            render: values.render ?? "none",
          });
        const project = store.createProject(config),
          before = store.createAudit(project);
        await demo.crawler.run(before);
        fixture.setFixed(true);
        const after = store.createAudit(project);
        await demo.crawler.run(after);
        console.log(
          JSON.stringify(
            {
              synthetic: true,
              projectId: project,
              before,
              after,
              comparison: demo.compare(before, after),
            },
            null,
            2,
          ),
        );
        if (values.serve) {
          keep = true;
          const server = await serve(
            demo,
            values.port ? Number(values.port) : 4173,
          );
          console.log("Open " + server.origin);
        } else await fixture.close();
        break;
      }
      case "model-usage": {
        console.log(JSON.stringify(modelUsage(store, arg)));
        break;
      }
      case "enrich": {
        if (!values["authorize-transfer"])
          throw new Error("provider-transfer-consent-required");
        const audit = store.audit(arg);
        const observations = arg2
          ? [store.observation(arg, arg2)].filter(
              (o): o is NonNullable<typeof o> => o !== null,
            )
          : store.analysisObservations(arg);
        const selectedLimits = [
          "max-model-generations",
          "max-model-output-tokens",
          "max-model-cost-micros",
        ].some((key) => values[key as keyof typeof values] !== undefined)
          ? {
              maxGenerations:
                values["max-model-generations"] === undefined
                  ? undefined
                  : Number(values["max-model-generations"]),
              maxOutputTokens:
                values["max-model-output-tokens"] === undefined
                  ? undefined
                  : Number(values["max-model-output-tokens"]),
              maxCostMicros:
                values["max-model-cost-micros"] === undefined
                  ? undefined
                  : Number(values["max-model-cost-micros"]),
            }
          : undefined;
        const allowance = new ModelAllowance(store, arg, selectedLimits),
          provider = new OllamaProvider(
            values["provider-origin"] ?? "http://127.0.0.1:11434",
            values.model ?? "",
            undefined,
            { allowance },
          );
        const enrichment = new Enrichment();
        for (const saved of store
          .imports(audit.projectId, "ai-suggestion")
          .filter((saved: any) => saved?.auditId === arg)
          .slice(-100)) {
          const record = saved as Record<string, unknown>;
          if (typeof record.evidenceHash === "string")
            enrichment.cache.set(record.evidenceHash, record);
        }
        const result = await enrichment.suggest(provider, observations, {
          consent: true,
          maxCalls: 1,
          maxInputBytes: 24000,
          maxOutputTokens: 800,
          timeoutMs: 60000,
        });
        const record = {
          ...(result as object),
          usage: enrichment.cacheHits ? null : provider.lastUsage,
          providerUsage: provider.usageSummary(),
          auditId: arg,
          auditUsage: allowance.summary(),
          cacheHit: enrichment.cacheHits > 0,
        };
        console.log(
          JSON.stringify({
            importId: store.addImport(audit.projectId, "ai-suggestion", record),
            suggestion: record,
          }),
        );
        break;
      }
      case "lighthouse": {
        console.log(
          JSON.stringify(
            await app.measurePerformance({
              projectId: arg,
              url: arg2,
              device: values.device,
              repeats:
                values.repeats === undefined
                  ? undefined
                  : Number(values.repeats),
            }),
          ),
        );
        break;
      }
      case "search-console":
      case "inspect-index":
      case "crux":
      case "pagespeed": {
        if (command === "pagespeed" && store.hasActiveJobs())
          throw new Error("lab-audit-concurrency-blocked");
        if (!values["authorize-transfer"])
          throw new Error("provider-transfer-consent-required");
        const project = store.project(arg),
          target = arg2 ?? project.seeds[0];
        if (!project.origins.includes(new URL(target).origin))
          throw new Error("provider-target-scope");
        const name = values["credential-env"];
        if (name && !/^[A-Z][A-Z0-9_]{0,100}$/.test(name))
          throw new Error("provider-credential-name-invalid");
        const credential = name ? process.env[name] : undefined;
        if (command === "search-console") {
          const data = await collectSearchConsole({
            property: values.property ?? project.origins[0] + "/",
            startDate: values["start-date"] ?? "",
            endDate: values["end-date"] ?? "",
            token: credential ?? "",
            authorizedTransfer: true,
          });
          console.log(
            JSON.stringify({
              importId: importData(store, arg, "search-console", data),
              rows: data.rows.length,
              complete: data.complete,
            }),
          );
        } else if (command === "inspect-index") {
          const data = await inspectIndexedURL({
            property: values.property ?? project.origins[0] + "/",
            url: target,
            token: credential ?? "",
            authorizedTransfer: true,
          });
          console.log(
            JSON.stringify({
              importId: store.addImport(arg, "index-inspection", data),
              observation: data.observation,
            }),
          );
        } else if (command === "crux") {
          const result = await collectCrUX({
            url: target,
            apiKey: credential ?? "",
            authorizedTransfer: true,
            originFallback: values["origin-fallback"],
            device: z
              .enum(["mobile", "desktop", "all"])
              .parse(values.device ?? "mobile"),
          });
          console.log(
            JSON.stringify(
              result.status === "observed"
                ? {
                    status: result.status,
                    importId: importData(
                      store,
                      arg,
                      "performance",
                      result.measurement,
                    ),
                    scope: result.measurement.scope,
                  }
                : result,
            ),
          );
        } else {
          // Remote lab is separate from crawl concurrency; do not launch it as a crawl stage.
          const result = await collectPageSpeed({
            url: target,
            apiKey: credential,
            authorizedTransfer: true,
            device: z
              .enum(["mobile", "desktop"])
              .parse(values.device ?? "mobile"),
            repeats: values.repeats ? Number(values.repeats) : 3,
          });
          const imports = result.measurements.map((m) =>
            importData(store, arg, "performance", m),
          );
          console.log(
            JSON.stringify({
              importIds: imports,
              variability: result.variability,
              diagnostics: result.diagnostics,
              limitations: result.limitations,
            }),
          );
        }
        break;
      }
      case "status":
        console.log(JSON.stringify(app.view(arg, "status"), null, 2));
        break;
      case "findings":
        console.log(
          JSON.stringify(
            app.view(arg, "findings", {
              outcome: values.outcome,
              offset: values.offset ? Number(values.offset) : 0,
            }),
            null,
            2,
          ),
        );
        break;
      case "page":
        console.log(
          JSON.stringify(app.view(arg, "page", { url: arg2 }), null, 2),
        );
        break;
      case "control":
        app.control(arg, z.enum(["pause", "resume", "cancel"]).parse(arg2));
        console.log(JSON.stringify({ ok: true }));
        break;
      case "verify":
        console.log(JSON.stringify(app.verify(arg)));
        break;
      case "reanalyze":
        console.log(JSON.stringify({ analysisId: app.reanalyze(arg) }));
        break;
      case "plan-verification":
        console.log(
          JSON.stringify(
            app.planVerification({ auditId: arg, groupId: arg2 }),
            null,
            2,
          ),
        );
        break;
      case "start-verification":
        console.log(JSON.stringify(app.startVerification(arg)));
        break;
      case "evaluate-verification": {
        const record = app.evaluateVerification(arg, arg2);
        console.log(JSON.stringify(record, null, 2));
        process.exitCode =
          record.state === "verified"
            ? 0
            : record.changes.some((c) => c.state === "not-verifiable")
              ? 4
              : 1;
        break;
      }
      case "compare": {
        const data = app.compare(
          arg,
          arg2,
          values.mapping ? (readJSON(values.mapping) as any) : {},
        );
        console.log(JSON.stringify(data, null, 2));
        process.exitCode = data.changes.some(
          (c) => c.state === "not-verifiable",
        )
          ? 4
          : data.changes.some((c) => c.state === "introduced")
            ? 1
            : 0;
        break;
      }
      case "report": {
        const format = z
            .enum(["json", "markdown", "html", "csv"])
            .parse(values.format ?? "html"),
          profile = z
            .enum(["private", "shareable"])
            .parse(values.profile ?? "shareable");
        if (values.out)
          output(values.out, reportChunks(store, arg, format, profile));
        else console.log(app.report(arg, format, profile));
        break;
      }
      case "site-data":
        console.log(
          JSON.stringify(
            app.view(arg, "site-data", {
              importId: arg2,
              offset: z.coerce
                .number()
                .int()
                .min(0)
                .parse(values.offset ?? 0),
            }),
            null,
            2,
          ),
        );
        break;
      case "search-periods":
        console.log(
          JSON.stringify(
            app.view(arg, "search-periods", {
              offset: z.coerce
                .number()
                .int()
                .min(0)
                .parse(values.offset ?? 0),
            }),
            null,
            2,
          ),
        );
        break;
      case "compare-search": {
        const review = app.view(arg, "search-comparison", {
          baselineImportId: arg2,
          currentImportId: arg3,
          offset: z.coerce
            .number()
            .int()
            .min(0)
            .parse(values.offset ?? 0),
        }) as ReturnType<typeof compareSearchPeriods>;
        console.log(JSON.stringify(review, null, 2));
        if (review.status !== "sample-comparison") process.exitCode = 4;
        break;
      }
      case "content":
        console.log(
          JSON.stringify(
            {
              inventory: app.view(arg, "content"),
              demand: app.view(arg, "content-opportunities"),
              reviews: app.view(arg, "content-reviews"),
            },
            null,
            2,
          ),
        );
        break;
      case "review-action":
        console.log(
          JSON.stringify({ reviewId: app.reviewAction(readJSON(arg)) }),
        );
        break;
      case "map-source":
        if (!values.repository)
          throw new Error("source-mapping-repository-required");
        console.log(
          JSON.stringify({
            mappingId: mapSource(store, values.repository, readJSON(arg)),
          }),
        );
        break;
      case "review-content":
        console.log(
          JSON.stringify({
            reviewId: app.reviewContent(readJSON(arg)),
          }),
        );
        break;
      case "import":
        console.log(
          JSON.stringify({
            importId: app.import(
              arg,
              z
                .enum([
                  "search-console",
                  "performance",
                  "search-visibility",
                  "external-research",
                  "site-data",
                ])
                .parse(arg2),
              readJSON(arg3),
            ),
          }),
        );
        break;
      case "gate":
        console.log(
          JSON.stringify(
            {
              auditId: arg,
              coverage: store.coverage(arg),
              contractFailures: store
                .results(arg, { outcome: "fail", limit: 1000000 })
                .filter((r) => !r.exception)
                .map((r) => ({ ruleId: r.ruleId, url: r.url })),
            },
            null,
            2,
          ),
        );
        process.exitCode = gate(store, arg);
        break;
      case "backup":
        console.log(
          JSON.stringify(
            await backupStore(store, z.string().min(1).parse(arg)),
            null,
            2,
          ),
        );
        break;
      case "retention":
        console.log(
          JSON.stringify(
            values["confirm-delete"]
              ? applyRetention(
                  store,
                  arg,
                  z.string().parse(values.before),
                  z.string().parse(values.selection),
                )
              : retentionPlan(store, arg, z.string().parse(values.before)),
            null,
            2,
          ),
        );
        break;
      case "delete-project":
        if (!values["confirm-delete"])
          throw new Error("delete-confirmation-required");
        store.deleteProject(arg);
        console.log(
          JSON.stringify({
            deletedProject: arg,
            limits:
              "Logical deletion, not physical erasure from storage/backups/copied reports",
          }),
        );
        break;
      case "delete":
        if (!values["confirm-delete"])
          throw new Error("delete-confirmation-required");
        store.deleteAudit(arg);
        console.log(
          JSON.stringify({
            deleted: arg,
            limits:
              "Logical deletion, not guaranteed secure erasure on SSDs, snapshots or backups",
          }),
        );
        break;
      case "mcp":
        await serveMCP(app);
        keep = true;
        break;
      default:
        throw new Error("unknown-command");
    }
  } finally {
    if (!keep) store.close();
  }
}
export function gate(store: Store, id: string): number {
  const audit = store.audit(id),
    state = audit.state,
    coverage = store.coverage(id);
  if (state === "error") return 2;
  const analysis = store.latestAnalysis(id);
  if (!analysis) return 3;
  if (state !== "complete" || !coverage.completeDiscoveredQueue) return 3;
  const contractRules = new Set([
    "index-intent",
    "canonical-contract",
    "title-review",
    "critical-content",
    "language-contract",
    "sitemap-intent",
    "navigation-contract",
    "alternate-contract",
    "structured-contract",
    "google-product-basics",
    "google-feature-fields",
  ]);
  let incomplete = false;
  for (const r of store.allResults(id, analysis)) {
    if (r.outcome === "fail" && !r.exception) return 1;
    if (
      r.outcome === "error" ||
      (["blocked", "not-tested"].includes(r.outcome) &&
        contractRules.has(r.ruleId) &&
        audit.config.contracts.some((c) =>
          new URL(r.url).pathname.startsWith(c.pathPrefix),
        ))
    )
      incomplete = true;
  }
  return incomplete ? 3 : 0;
}
if (
  process.argv[1] &&
  realpathSync(fileURLToPath(import.meta.url)) ===
    realpathSync(resolve(process.argv[1]))
)
  main().catch((error) => {
    console.error(
      JSON.stringify({
        error: errorCode(error),
        message: explainError(errorCode(error)),
        hint: "Check local input and documentation; raw diagnostic values are suppressed.",
      }),
    );
    process.exitCode = 2;
  });

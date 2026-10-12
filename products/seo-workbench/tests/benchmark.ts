/** Reproducible synthetic crawl benchmarks; each run owns its database and fixture. */
import { fixtureSite } from "../src/fixtures.ts";
import { Store } from "../src/store.ts";
import { Crawler } from "../src/crawler.ts";
import { NetworkPolicy } from "../src/network.ts";
import { parseConfig, errorCode } from "../src/domain.ts";
import { exportReport, reportChunks } from "../src/reports.ts";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  rmSync,
  readdirSync,
  statSync,
  openSync,
  closeSync,
  writeFileSync,
  fsyncSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir, cpus, totalmem, platform, arch } from "node:os";
const sizes = process.argv
  .slice(2)
  .filter((a) => /^\d+$/.test(a))
  .map(Number);
const mode =
  process.argv.find((a) => a.startsWith("--mode="))?.slice(7) ?? "none";
if (!["none", "auto", "all"].includes(mode)) throw new Error("benchmark-mode");
const reportMode =
  process.argv.find((arg) => arg.startsWith("--reports="))?.slice(10) ??
  "buffered";
if (!["buffered", "streamed"].includes(reportMode))
  throw new Error("benchmark-reports");
for (const size of sizes.length ? sizes : [1000, 10000]) {
  if (!Number.isInteger(size) || size < 1 || size > 10000)
    throw new Error("benchmark-size");
  const directory = mkdtempSync(join(tmpdir(), "seo-workbench-benchmark-")),
    fixture = await fixtureSite({ pages: size }),
    store = new Store(directory);
  const config = parseConfig({
    ...fixture.config,
    render: mode,
    inventory: Array.from(
      { length: size },
      (_, i) => fixture.origin + (i === 0 ? "/" : "/p/" + i),
    ),
    maxDepth: 50,
    ...(process.argv.some((arg) => arg.startsWith("--max-memory-bytes="))
      ? {
          maxMemoryBytes: Number(
            process.argv
              .find((arg) => arg.startsWith("--max-memory-bytes="))!
              .split("=")[1],
          ),
        }
      : {}),
    ...(process.argv.some((arg) => arg.startsWith("--max-storage-bytes="))
      ? {
          maxStorageBytes: Number(
            process.argv
              .find((arg) => arg.startsWith("--max-storage-bytes="))!
              .split("=")[1],
          ),
        }
      : {}),
  });
  const project = store.createProject(config),
    id = store.createAudit(project),
    start = performance.now();
  let peak = process.memoryUsage().rss;
  const interval = setInterval(() => {
    peak = Math.max(peak, process.memoryUsage().rss);
  }, 10);
  try {
    await new Crawler(
      store,
      new NetworkPolicy({
        localOrigins: [fixture.origin],
      }),
    ).run(id);
    peak = Math.max(peak, process.memoryUsage().rss);
    const elapsedMs = performance.now() - start;
    const storageBytes = readdirSync(directory).reduce(
      (sum, name) => sum + statSync(join(directory, name)).size,
      0,
    );
    const analysis = store.latestAnalysis(id),
      resultCount = analysis
        ? Number(
            store.db
              .prepare("SELECT COUNT(*) AS n FROM results WHERE analysis_id=?")
              .get(analysis)!.n,
          )
        : 0;
    const reports = [];
    for (const profile of ["private", "shareable"] as const) {
      const formats = ["json", "csv", "markdown", "html"] as const;
      for (const format of formats) {
        const reportStart = performance.now();
        try {
          let bytes = 0;
          if (reportMode === "streamed") {
            const fd = openSync(
              join(directory, "synthetic-" + profile + "." + format),
              "wx",
              0o600,
            );
            try {
              const chunks = reportChunks(store, id, format, profile);
              for (const chunk of chunks) {
                writeFileSync(fd, chunk);
                bytes += Buffer.byteLength(chunk);
                peak = Math.max(peak, process.memoryUsage().rss);
              }
              fsyncSync(fd);
            } finally {
              closeSync(fd);
            }
          } else {
            const output = exportReport(store, id, format, profile);
            if (format === "json")
              assert.equal(JSON.parse(output).results.length, resultCount);
            bytes = Buffer.byteLength(output);
          }
          assert.ok(bytes > 0);
          peak = Math.max(peak, process.memoryUsage().rss);
          reports.push({
            profile,
            format,
            outcome: "exported",
            bytes,
            durationMs: Math.round(performance.now() - reportStart),
          });
        } catch (error) {
          if (error instanceof assert.AssertionError) throw error;
          peak = Math.max(peak, process.memoryUsage().rss);
          reports.push({
            profile,
            format,
            outcome: "unavailable",
            reason: errorCode(error),
            durationMs: Math.round(performance.now() - reportStart),
          });
        }
      }
    }
    console.log(
      JSON.stringify({
        date: new Date().toISOString().slice(0, 10),
        mode:
          mode === "none"
            ? "HTTP only"
            : mode === "auto"
              ? "HTTP + sampled fixture render"
              : "HTTP + all fixture render",
        pages: size,
        node: process.versions.node,
        hardware: {
          platform: platform(),
          architecture: arch(),
          logicalCPUs: cpus().length,
          memoryGiB: Math.round(totalmem() / 2 ** 30),
        },
        limits: {
          ...config,
          seeds: undefined,
          origins: undefined,
          inventory: undefined,
        },
        durationMs: Math.round(elapsedMs),
        peakProcessRSSBytes: peak,
        storageBytes,
        coverage: store.coverage(id),
        ruleResults: resultCount,
        reportMode,
        reports,
        limitations: [
          "Loopback fixture, not real network throughput",
          "RSS samples cover crawl and reports in the Node process, not browser/OS or every transient allocation",
          "Sequential crawl; the selected mode is reported explicitly",
          "Report construction starts after the crawl and does not certify offline browser usability",
          "Streamed mode measures all formats written to private temporary files; semantic equivalence is tested separately",
          "Saved-file size is measured before report export and excludes report files",
          "No hardware identifier or hostname recorded",
        ],
      }),
    );
  } finally {
    clearInterval(interval);
    store.close();
    await fixture.close();
    rmSync(directory, { recursive: true, force: true });
  }
}

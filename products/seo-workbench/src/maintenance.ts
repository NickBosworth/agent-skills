/** Explicit private-state maintenance. Neither backups nor deletion run automatically. */
import { backup, DatabaseSync } from "node:sqlite";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  realpathSync,
  rmSync,
  writeFileSync,
  unlinkSync,
} from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { z } from "zod";
import { hash } from "./domain.ts";
import { within, type Store } from "./store.ts";

export async function backupStore(store: Store, directory: string) {
  const parent = realpathSync(dirname(resolve(directory))),
    target = join(parent, basename(resolve(directory))),
    product = resolve(import.meta.dirname, ".."),
    repository = resolve(product, "../..");
  if (
    within(target, product) ||
    (existsSync(join(repository, "catalog.json")) && within(target, repository))
  )
    throw new Error("backup-inside-repository");
  if (
    store.db
      .prepare(
        "SELECT 1 FROM audits WHERE owner IS NOT NULL OR state IN ('queued','running','analyzing') LIMIT 1",
      )
      .get()
  )
    throw new Error("backup-jobs-active");
  // Exclusive folder creation prevents SQLite's backup API from replacing an existing file.
  mkdirSync(target, { mode: 0o700 });
  try {
    const filename = join(target, "workbench.sqlite"),
      marker = join(target, ".backup-incomplete");
    writeFileSync(marker, "", { flag: "wx", mode: 0o600 });
    await backup(store.db, filename);
    chmodSync(filename, 0o600);
    const check = new DatabaseSync(filename, { readOnly: true });
    try {
      // A worker may have started after the source preflight; inspect the actual snapshot.
      if (
        check
          .prepare(
            "SELECT 1 FROM audits WHERE owner IS NOT NULL OR state IN ('queued','running','analyzing') LIMIT 1",
          )
          .get()
      )
        throw new Error("backup-jobs-active");
      const integrity = check.prepare("PRAGMA integrity_check").all();
      if (
        integrity.length !== 1 ||
        integrity[0].integrity_check !== "ok" ||
        check.prepare("PRAGMA foreign_key_check").all().length
      )
        throw new Error("backup-integrity-failed");
    } finally {
      check.close();
    }
    unlinkSync(marker);
    return {
      verified: true,
      schemaVersion: Number(
        store.db.prepare("PRAGMA user_version").get()!.user_version,
      ),
      recovery:
        "Open this backup folder as the data directory. It contains private evidence; keep it outside source control. Jobs never restart automatically.",
    };
  } catch (error) {
    rmSync(target, { recursive: true, force: true });
    throw error;
  }
}

export function retentionPlan(store: Store, project: string, before: string) {
  z.string().uuid().parse(project);
  z.string().datetime({ offset: true }).parse(before);
  const cutoff = new Date(before).toISOString();
  if (Date.parse(cutoff) > Date.now())
    throw new Error("retention-future-cutoff");
  store.project(project);
  const audits = store.db
    .prepare(
      "SELECT id,updated FROM audits WHERE project_id=? AND updated<? AND owner IS NULL AND state IN ('complete','partial','cancelled','error') ORDER BY id",
    )
    .all(project, cutoff)
    .map((row) => ({ id: String(row.id), updatedAt: String(row.updated) }));
  return {
    projectId: project,
    before: cutoff,
    audits,
    selection: hash(JSON.stringify([project, cutoff, audits])),
    retainedProjectImports: Number(
      store.db
        .prepare(
          "SELECT COUNT(*) AS n FROM imports WHERE project_id=? AND (kind NOT IN ('content-review','action-review','source-mapping','verification-plan','verification-run','model-allowance','model-reservation','model-settlement','ai-suggestion') OR (json_extract(data,'$.auditId') IS NULL AND json_extract(data,'$.baselineAuditId') IS NULL))",
        )
        .get(project)?.n ?? 0,
    ),
    limits:
      "Only stopped audit histories and their review decisions are selected. Active and paused jobs and project-level provider imports are preserved. Deletion cannot erase backups or copied reports.",
  };
}

export function applyRetention(
  store: Store,
  project: string,
  before: string,
  selection: string,
) {
  z.string()
    .regex(/^[a-f0-9]{64}$/)
    .parse(selection);
  store.db.exec("BEGIN IMMEDIATE");
  let plan: ReturnType<typeof retentionPlan>;
  try {
    plan = retentionPlan(store, project, before);
    if (plan.selection !== selection)
      throw new Error("retention-selection-changed");
    const reviews = store.db.prepare(
        "DELETE FROM imports WHERE project_id=? AND kind IN ('content-review','action-review','source-mapping','verification-plan','verification-run','model-allowance','model-reservation','model-settlement','ai-suggestion') AND (json_extract(data,'$.auditId')=? OR json_extract(data,'$.baselineAuditId')=?)",
      ),
      remove = store.db.prepare("DELETE FROM audits WHERE id=?");
    for (const audit of plan.audits) {
      reviews.run(project, audit.id, audit.id);
      remove.run(audit.id);
    }
    store.db.exec("COMMIT");
  } catch (error) {
    if (store.db.isTransaction) store.db.exec("ROLLBACK");
    throw error;
  }
  store.db.exec("PRAGMA wal_checkpoint(TRUNCATE)");
  return { ...plan, deletedAudits: plan.audits.length };
}

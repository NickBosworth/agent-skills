/** SQLite evidence ledger. Observations and analyses are immutable; jobs are not. */
import { DatabaseSync } from "node:sqlite";
import { explainError } from "./messages.ts";
import { deflateRawSync, inflateRawSync } from "node:zlib";
import {
  mkdirSync,
  chmodSync,
  realpathSync,
  existsSync,
  lstatSync,
  statSync,
} from "node:fs";
import { dirname, resolve, sep, relative, isAbsolute } from "node:path";
import { homedir } from "node:os";
import { randomUUID } from "node:crypto";
import {
  DATABASE_SCHEMA_VERSION,
  contractFor,
  hash,
  parseConfig,
  type Config,
  type Observation,
  type QueueState,
  type RuleResult,
} from "./domain.ts";

export interface ResultOptions {
  offset?: number;
  limit?: number;
  outcome?: string;
  ruleId?: string;
  analysis?: string;
  search?: string;
  sort?: string;
}

export interface Audit {
  id: string;
  projectId: string;
  config: Config;
  state: string;
  createdAt: string;
  updatedAt: string;
  reason: string | null;
  requests: number;
  bytes: number;
  owner: number | null;
}
export interface QueueRow {
  url: string;
  originalUrl: string;
  depth: number | null;
  state: QueueState;
  reason: string | null;
}
export function defaultDataDirectory(): string {
  return resolve(homedir(), ".local", "share", "seo-workbench");
}
export function within(path: string, parent: string): boolean {
  const remainder = relative(parent, path);
  if (
    remainder === "" ||
    (remainder !== ".." &&
      !remainder.startsWith(".." + sep) &&
      !isAbsolute(remainder))
  )
    return true;
  // Filesystem aliases can have different spelling while naming the same source directory.
  const root = statSync(parent, { bigint: true });
  let current = path;
  for (;;) {
    try {
      const entry = statSync(current, { bigint: true });
      if (entry.dev === root.dev && entry.ino === root.ino) return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    const next = dirname(current);
    if (next === current) return false;
    current = next;
  }
}
function storedResult(result: RuleResult, dictionary: Buffer): string {
  const raw = JSON.stringify(result);
  if (Buffer.byteLength(raw) > 5_000_000) return raw;
  const encoded = JSON.stringify({
    storedEncoding: "deflate-base64-v2",
    data: deflateRawSync(Buffer.from(raw), { level: 1, dictionary }).toString(
      "base64",
    ),
  });
  return encoded.length < raw.length ? encoded : raw;
}
function readResult(value: string, dictionary: Buffer): RuleResult {
  const parsed = JSON.parse(value);
  if (
    !parsed.id &&
    ["deflate-base64-v1", "deflate-base64-v2"].includes(parsed.storedEncoding)
  )
    return JSON.parse(
      inflateRawSync(Buffer.from(parsed.data, "base64"), {
        maxOutputLength: 5_000_000,
        ...(parsed.storedEncoding === "deflate-base64-v2"
          ? { dictionary }
          : {}),
      }).toString("utf8"),
    );
  return parsed;
}
function savedConfig(value: string): Config {
  const raw = JSON.parse(value);
  // Earlier saved audits used the storage allowance as their download ceiling.
  return parseConfig({
    maxPages: 250,
    maxDiscoveries: 5000,
    maxRequests: 1000,
    maxDepth: 8,
    maxSeconds: 300,
    maxBytes: 1_000_000,
    maxMemoryBytes: 536870912,
    maxStorageBytes: 250_000_000,
    timeoutMs: 15000,
    retries: 1,
    renderTimeoutMs: 5000,
    ...raw,
    maxDownloadBytes:
      raw.maxDownloadBytes ?? raw.maxStorageBytes ?? 250_000_000,
  });
}
function checkDatabaseFiles(filename: string): void {
  for (const path of [
    filename,
    filename + "-wal",
    filename + "-shm",
    filename + "-journal",
  ]) {
    // lstat also detects dangling links before SQLite can create their targets.
    const stat = lstatSync(path, { throwIfNoEntry: false });
    if (stat?.isSymbolicLink()) throw new Error("database-symlink-blocked");
    if (stat && (!stat.isFile() || stat.nlink !== 1))
      throw new Error("database-file-blocked");
  }
}

export class Store {
  private workerLock?: { db: DatabaseSync; auditId: string };
  readonly db: DatabaseSync;
  readonly directory: string;
  constructor(directory = defaultDataDirectory()) {
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    this.directory = realpathSync(directory);
    if (
      lstatSync(resolve(this.directory, ".backup-incomplete"), {
        throwIfNoEntry: false,
      })
    )
      throw new Error("backup-incomplete");
    // Private observations must never be placed in this source checkout.
    const source = resolve(import.meta.dirname, ".."),
      repository = resolve(source, "../..");
    if (
      within(this.directory, source) ||
      (existsSync(resolve(repository, "catalog.json")) &&
        within(this.directory, repository))
    )
      throw new Error("data-directory-inside-repository");
    chmodSync(this.directory, 0o700);
    const filename = resolve(this.directory, "workbench.sqlite");
    checkDatabaseFiles(filename);
    this.db = new DatabaseSync(filename);
    try {
      chmodSync(filename, 0o600);
      this.db.exec("PRAGMA busy_timeout=5000");
      let current = (
        this.db.prepare("PRAGMA user_version").get() as { user_version: number }
      ).user_version;
      if (current > DATABASE_SCHEMA_VERSION) {
        throw new Error("database-version-newer-than-product");
      }
      this.db.exec("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;");
      // Re-read under the write lock so simultaneous openers cannot migrate a stale version.
      this.db.exec("BEGIN IMMEDIATE");
      current = Number(
        this.db.prepare("PRAGMA user_version").get()!.user_version,
      );
      if (current > DATABASE_SCHEMA_VERSION)
        throw new Error("database-version-newer-than-product");
      if (current === 0)
        this.db.exec(`
      CREATE TABLE projects(id TEXT PRIMARY KEY,name TEXT NOT NULL,config TEXT NOT NULL,created TEXT NOT NULL);
      CREATE TABLE audits(id TEXT PRIMARY KEY,project_id TEXT NOT NULL REFERENCES projects(id),config TEXT NOT NULL,state TEXT NOT NULL,created TEXT NOT NULL,updated TEXT NOT NULL,reason TEXT,requests INTEGER DEFAULT 0,bytes INTEGER DEFAULT 0,owner INTEGER);
      CREATE TABLE urls(audit_id TEXT NOT NULL REFERENCES audits(id) ON DELETE CASCADE,url TEXT NOT NULL,original TEXT NOT NULL,depth INTEGER,state TEXT NOT NULL,reason TEXT,PRIMARY KEY(audit_id,url));
      CREATE INDEX queue ON urls(audit_id,state);
      CREATE TABLE discoveries(id INTEGER PRIMARY KEY,audit_id TEXT NOT NULL REFERENCES audits(id) ON DELETE CASCADE,url TEXT NOT NULL,original TEXT NOT NULL,source TEXT NOT NULL,parent TEXT,UNIQUE(audit_id,url,source,parent));
      CREATE TABLE observations(id TEXT PRIMARY KEY,audit_id TEXT NOT NULL REFERENCES audits(id) ON DELETE CASCADE,url TEXT NOT NULL,data TEXT NOT NULL);
      CREATE INDEX observed_urls ON observations(audit_id,url);
      CREATE TABLE analyses(id TEXT PRIMARY KEY,audit_id TEXT NOT NULL REFERENCES audits(id) ON DELETE CASCADE,ruleset TEXT NOT NULL,created TEXT NOT NULL);
      CREATE TABLE results(analysis_id TEXT NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,id TEXT NOT NULL,rule_id TEXT NOT NULL,url TEXT NOT NULL,outcome TEXT NOT NULL,data TEXT NOT NULL,PRIMARY KEY(analysis_id,id));
      CREATE INDEX finding_filter ON results(analysis_id,outcome,rule_id,url);
      CREATE TABLE events(id INTEGER PRIMARY KEY,audit_id TEXT NOT NULL REFERENCES audits(id) ON DELETE CASCADE,created TEXT NOT NULL,kind TEXT NOT NULL,detail TEXT NOT NULL);
      CREATE TABLE imports(id TEXT PRIMARY KEY,project_id TEXT NOT NULL REFERENCES projects(id),kind TEXT NOT NULL,created TEXT NOT NULL,data TEXT NOT NULL);
      CREATE TRIGGER immutable_observations BEFORE UPDATE ON observations BEGIN SELECT RAISE(ABORT,'immutable evidence'); END;
      CREATE TRIGGER immutable_results BEFORE UPDATE ON results BEGIN SELECT RAISE(ABORT,'immutable analysis'); END;
      CREATE TRIGGER immutable_analyses BEFORE UPDATE ON analyses BEGIN SELECT RAISE(ABORT,'immutable analysis'); END;
      PRAGMA user_version=1;
    `);
      if (current < 2) {
        this.db
          .exec(`CREATE TABLE audit_storage(audit_id TEXT PRIMARY KEY REFERENCES audits(id) ON DELETE CASCADE,bytes INTEGER NOT NULL);
          INSERT INTO audit_storage SELECT id,length(CAST(config AS BLOB))+512 FROM audits;
          CREATE TRIGGER storage_audit_insert AFTER INSERT ON audits BEGIN
            INSERT INTO audit_storage VALUES(NEW.id,length(CAST(NEW.config AS BLOB))+512); END;`);
        const sizes: [string, string, string][] = [
          [
            "urls",
            "NEW.audit_id",
            "length(CAST(NEW.url AS BLOB))+length(CAST(NEW.original AS BLOB))+COALESCE(length(CAST(NEW.reason AS BLOB)),0)+128",
          ],
          [
            "discoveries",
            "NEW.audit_id",
            "length(CAST(NEW.url AS BLOB))+length(CAST(NEW.original AS BLOB))+length(NEW.source)+COALESCE(length(CAST(NEW.parent AS BLOB)),0)+128",
          ],
          [
            "observations",
            "NEW.audit_id",
            "length(CAST(NEW.data AS BLOB))+length(CAST(NEW.url AS BLOB))+128",
          ],
          [
            "analyses",
            "NEW.audit_id",
            "length(NEW.id)+length(NEW.ruleset)+128",
          ],
          [
            "events",
            "NEW.audit_id",
            "length(CAST(NEW.detail AS BLOB))+length(NEW.kind)+128",
          ],
          [
            "results",
            "(SELECT audit_id FROM analyses WHERE id=NEW.analysis_id)",
            "length(CAST(NEW.data AS BLOB))+length(CAST(NEW.url AS BLOB))+length(NEW.id)+length(NEW.rule_id)+128",
          ],
        ];
        for (const [table, audit, size] of sizes) {
          this.db
            .exec(`UPDATE audit_storage SET bytes=bytes+COALESCE((SELECT SUM(${size.replaceAll("NEW.", "r.")}) FROM ${table} r WHERE ${audit.replaceAll("NEW.", "r.")}=audit_storage.audit_id),0);
            CREATE TRIGGER storage_${table}_insert AFTER INSERT ON ${table} BEGIN UPDATE audit_storage SET bytes=bytes+(${size}) WHERE audit_id=${audit}; END;
            CREATE TRIGGER storage_${table}_delete AFTER DELETE ON ${table} BEGIN UPDATE audit_storage SET bytes=bytes-(${size.replaceAll("NEW.", "OLD.")}) WHERE audit_id=${audit.replaceAll("NEW.", "OLD.")}; END;`);
        }
        this.db
          .exec(`CREATE TRIGGER storage_urls_update AFTER UPDATE ON urls BEGIN UPDATE audit_storage SET bytes=bytes+COALESCE(length(CAST(NEW.reason AS BLOB)),0)-COALESCE(length(CAST(OLD.reason AS BLOB)),0) WHERE audit_id=NEW.audit_id; END;
          PRAGMA user_version=2;`);
      }
      this.db
        .exec(`CREATE TRIGGER IF NOT EXISTS storage_audit_config_update AFTER UPDATE OF config ON audits BEGIN
      UPDATE audit_storage SET bytes=bytes+length(CAST(NEW.config AS BLOB))-length(CAST(OLD.config AS BLOB)) WHERE audit_id=NEW.id; END;`);
      this.db
        .exec(`CREATE TRIGGER IF NOT EXISTS storage_analysis_children_delete BEFORE DELETE ON analyses BEGIN
      UPDATE audit_storage SET bytes=bytes-COALESCE((SELECT SUM(length(CAST(data AS BLOB))+length(CAST(url AS BLOB))+length(id)+length(rule_id)+128) FROM results WHERE analysis_id=OLD.id),0) WHERE audit_id=OLD.audit_id; END;`);
      if (current < 3) this.db.exec("PRAGMA user_version=3");
      if (current < 4) {
        this.db.exec(`
      CREATE TABLE analysis_dictionaries(analysis_id TEXT PRIMARY KEY REFERENCES analyses(id) ON DELETE CASCADE,data TEXT NOT NULL);
      CREATE TRIGGER immutable_analysis_dictionaries BEFORE UPDATE ON analysis_dictionaries BEGIN SELECT RAISE(ABORT,'immutable analysis'); END;
      CREATE TRIGGER storage_dictionary_insert AFTER INSERT ON analysis_dictionaries BEGIN UPDATE audit_storage SET bytes=bytes+length(CAST(NEW.data AS BLOB))+128 WHERE audit_id=(SELECT audit_id FROM analyses WHERE id=NEW.analysis_id); END;
      CREATE TRIGGER storage_dictionary_delete AFTER DELETE ON analysis_dictionaries BEGIN UPDATE audit_storage SET bytes=bytes-length(CAST(OLD.data AS BLOB))-128 WHERE audit_id=(SELECT audit_id FROM analyses WHERE id=OLD.analysis_id); END;
      DROP TRIGGER storage_analysis_children_delete;
      CREATE TRIGGER storage_analysis_children_delete BEFORE DELETE ON analyses BEGIN UPDATE audit_storage SET bytes=bytes-COALESCE((SELECT SUM(length(CAST(data AS BLOB))+length(CAST(url AS BLOB))+length(id)+length(rule_id)+128) FROM results WHERE analysis_id=OLD.id),0)-COALESCE((SELECT length(CAST(data AS BLOB))+128 FROM analysis_dictionaries WHERE analysis_id=OLD.id),0) WHERE audit_id=OLD.audit_id; END;
      PRAGMA user_version=4;`);
      }
      if (current < 5) {
        for (const row of this.db
          .prepare("SELECT owner FROM audits WHERE owner IS NOT NULL")
          .all()) {
          try {
            process.kill(Number(row.owner), 0);
          } catch (error) {
            if ((error as NodeJS.ErrnoException).code === "ESRCH") continue;
            throw new Error("database-upgrade-worker-active");
          }
          throw new Error("database-upgrade-worker-active");
        }
        this.db.exec(
          `CREATE TABLE worker_claims(audit_id TEXT PRIMARY KEY REFERENCES audits(id) ON DELETE CASCADE,owner INTEGER NOT NULL); PRAGMA user_version=5;`,
        );
      }
      this.db.exec("COMMIT");
    } catch (error) {
      try {
        if (this.db.isTransaction) this.db.exec("ROLLBACK");
      } finally {
        this.db.close();
      }
      throw error;
    }
  }
  close(): void {
    try {
      this.unlockWorker();
    } finally {
      this.db.close();
    }
  }
  /** Per-audit logical allowance, or database-wide page estimate without an ID; neither is a filesystem quota. */
  storageEstimate(id?: string): number {
    if (id)
      return (
        Number(
          this.db
            .prepare("SELECT bytes FROM audit_storage WHERE audit_id=?")
            .get(id)?.bytes ?? 0,
        ) *
          2 +
        4096
      );
    return (
      Number(this.db.prepare("PRAGMA page_count").get()?.page_count) *
      Number(this.db.prepare("PRAGMA page_size").get()?.page_size) *
      2
    );
  }
  assertStorage(id: string): void {
    if (this.storageEstimate(id) > this.audit(id).config.maxStorageBytes)
      throw new Error("persistent-storage-budget");
  }
  createProject(config: Config): string {
    const id = randomUUID();
    this.db
      .prepare("INSERT INTO projects VALUES(?,?,?,?)")
      .run(id, config.name, JSON.stringify(config), new Date().toISOString());
    return id;
  }
  projects(): { id: string; name: string; created: string }[] {
    return this.db
      .prepare(
        "SELECT id,name,created FROM projects ORDER BY created DESC LIMIT 100",
      )
      .all() as unknown as { id: string; name: string; created: string }[];
  }
  project(id: string): Config {
    const row = this.db
      .prepare("SELECT config FROM projects WHERE id=?")
      .get(id) as { config: string } | undefined;
    if (!row) throw new Error("project-not-found");
    return savedConfig(row.config);
  }
  createAudit(projectId: string, config = this.project(projectId)): string {
    const id = randomUUID(),
      now = new Date().toISOString();
    this.db
      .prepare("INSERT INTO audits VALUES(?,?,?,?,?,?,NULL,0,0,NULL)")
      .run(id, projectId, JSON.stringify(config), "queued", now, now);
    return id;
  }
  audit(id: string): Audit {
    const row = this.db.prepare("SELECT * FROM audits WHERE id=?").get(id) as
      Record<string, unknown> | undefined;
    if (!row) throw new Error("audit-not-found");
    return {
      id: String(row.id),
      projectId: String(row.project_id),
      config: savedConfig(String(row.config)),
      state: String(row.state),
      createdAt: String(row.created),
      updatedAt: String(row.updated),
      reason: row.reason as string | null,
      requests: Number(row.requests),
      bytes: Number(row.bytes),
      owner: row.owner as number | null,
    };
  }
  audits(project?: string): Audit[] {
    const rows = project
      ? this.db
          .prepare(
            "SELECT id FROM audits WHERE project_id=? ORDER BY created DESC LIMIT 100",
          )
          .all(project)
      : this.db
          .prepare("SELECT id FROM audits ORDER BY created DESC LIMIT 100")
          .all();
    return rows.map((row) => this.audit(String(row.id)));
  }
  /** Capacity and crash recovery inspect all owned jobs, independently of history pagination. */
  ownedAudits(): Audit[] {
    return this.db
      .prepare("SELECT id FROM audits WHERE owner IS NOT NULL")
      .all()
      .map((row) => this.audit(String(row.id)));
  }
  hasActiveJobs(): boolean {
    return Boolean(
      this.db
        .prepare(
          "SELECT 1 FROM audits WHERE state IN ('queued','running','analyzing') LIMIT 1",
        )
        .get(),
    );
  }
  state(id: string, state: string, reason: string | null = null): void {
    this.db
      .prepare("UPDATE audits SET state=?,reason=?,updated=? WHERE id=?")
      .run(state, reason, new Date().toISOString(), id);
  }
  /** Startup failures cannot replace a concurrent control decision or worker claim. */
  failUnclaimed(id: string, reason: string): void {
    this.db
      .prepare(
        "UPDATE audits SET state='error',reason=?,updated=? WHERE id=? AND state='queued' AND owner IS NULL",
      )
      .run(reason, new Date().toISOString(), id);
  }
  /** The separate write lock survives long analysis and is released by process death. */
  private lockWorker(auditId: string): void {
    if (this.workerLock) throw new Error("audit-worker-active");
    const filename = resolve(this.directory, "worker-lock.sqlite");
    checkDatabaseFiles(filename);
    const db = new DatabaseSync(filename);
    try {
      chmodSync(filename, 0o600);
      db.exec("PRAGMA busy_timeout=0; BEGIN IMMEDIATE");
      this.workerLock = { db, auditId };
    } catch (error) {
      db.close();
      if ((error as { errcode?: number }).errcode === 5)
        throw new Error("audit-worker-active");
      throw error;
    }
  }
  private unlockWorker(): void {
    const lock = this.workerLock;
    if (!lock) return;
    this.workerLock = undefined;
    try {
      if (lock.db.isTransaction) lock.db.exec("ROLLBACK");
    } finally {
      lock.db.close();
    }
  }
  /** Legacy owners remain conservative; new owners are dead if their lock is available. */
  private recoverOwners(target: string): void {
    for (const row of this.ownedAudits()) {
      const modern = this.db
        .prepare("SELECT 1 FROM worker_claims WHERE audit_id=? AND owner=?")
        .get(row.id, row.owner!);
      if (!modern) {
        try {
          process.kill(row.owner!, 0);
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== "ESRCH")
            throw new Error("audit-worker-active");
          this.clearOwner(row, target);
          continue;
        }
        throw new Error("audit-worker-active");
      }
      this.clearOwner(row, target);
    }
  }
  private clearOwner(row: Audit, target: string): void {
    const interrupted =
      row.id !== target && ["running", "analyzing"].includes(row.state);
    this.db
      .prepare(
        "UPDATE audits SET owner=NULL,state=?,reason=? WHERE id=? AND owner=?",
      )
      .run(
        interrupted ? "partial" : row.state,
        interrupted
          ? "interrupted-worker"
          : (row.reason ?? "interrupted-worker"),
        row.id,
        row.owner!,
      );
    this.db.prepare("DELETE FROM worker_claims WHERE audit_id=?").run(row.id);
  }
  /** Ownership metadata and recovery change atomically while the lifetime lock is held. */
  claim(
    id: string,
    extractorDefinitions: import("./extractors.ts").TrustedExtractor["definition"][] = [],
  ): void {
    if (!["queued", "running", "analyzing"].includes(this.audit(id).state))
      throw new Error("audit-not-runnable");
    this.lockWorker(id);
    try {
      this.db.exec("BEGIN IMMEDIATE");
      if (!["queued", "running", "analyzing"].includes(this.audit(id).state))
        throw new Error("audit-not-runnable");
      this.recoverOwners(id);
      const expectedExtractors = this.db
        .prepare(
          "SELECT detail FROM events WHERE audit_id=? AND kind='extractor-manifest' ORDER BY id LIMIT 1",
        )
        .get(id);
      const definitionHash = hash(
        JSON.stringify(
          extractorDefinitions.map((definition) => [
            definition.id,
            definition.version,
            definition.title,
            definition.prerequisite,
            definition.basis,
            definition.sourceIds,
          ]),
        ),
      );
      if (
        expectedExtractors &&
        JSON.parse(String(expectedExtractors.detail)).definitionHash !==
          definitionHash
      )
        throw new Error("extractor-manifest-mismatch");
      if (!expectedExtractors && extractorDefinitions.length) {
        if (
          this.db
            .prepare("SELECT 1 FROM observations WHERE audit_id=? LIMIT 1")
            .get(id)
        )
          throw new Error("extractor-manifest-missing");
        this.event(id, "extractor-manifest", {
          definitionHash,
          extractors: extractorDefinitions.map((definition) => ({
            id: definition.id,
            version: definition.version,
          })),
        });
      }
      const change = this.db
        .prepare(
          "UPDATE audits SET owner=?,state='running',updated=? WHERE id=? AND state IN ('queued','running','analyzing') AND owner IS NULL",
        )
        .run(process.pid, new Date().toISOString(), id);
      if (!change.changes) throw new Error("audit-worker-active");
      this.db
        .prepare("INSERT INTO worker_claims VALUES(?,?)")
        .run(id, process.pid);
      this.db
        .prepare(
          "UPDATE urls SET state='queued',reason='recovered-interrupted-attempt' WHERE audit_id=? AND state='fetching'",
        )
        .run(id);
      this.db.exec("COMMIT");
    } catch (error) {
      if (this.db.isTransaction) this.db.exec("ROLLBACK");
      this.unlockWorker();
      throw error;
    }
  }
  /** Reserve the worker slot for a queued audit or an isolated measurement. */
  reserveWorkerSlot(): () => void {
    if (this.db.isTransaction) throw new Error("database-transaction-active");
    this.lockWorker("");
    try {
      this.db.exec("BEGIN IMMEDIATE");
      this.recoverOwners("");
      this.db.exec("COMMIT");
    } catch (error) {
      if (this.db.isTransaction) this.db.exec("ROLLBACK");
      this.unlockWorker();
      throw error;
    }
    const reservation = this.workerLock;
    return () => {
      if (this.workerLock === reservation) this.unlockWorker();
    };
  }
  resume(id: string): void {
    this.lockWorker(id);
    try {
      this.db.exec("BEGIN IMMEDIATE");
      this.recoverOwners(id);
      if (this.audit(id).state === "complete")
        throw new Error("audit-already-complete");
      if (
        this.audit(id).reason === "discovery-budget" &&
        !this.discoveryTruncated(id)
      )
        this.event(id, "discovery-truncated", {
          source: "retained prior stop reason",
          maxDiscoveries: this.audit(id).config.maxDiscoveries,
        });
      this.state(id, "queued");
      this.db.exec("COMMIT");
    } catch (error) {
      if (this.db.isTransaction) this.db.exec("ROLLBACK");
      throw error;
    } finally {
      this.unlockWorker();
    }
  }
  /** Completion becomes visible only with saved analysis and released ownership together. */
  finishAnalysis(id: string): void {
    this.db
      .prepare(
        "UPDATE audits SET state='complete',owner=NULL,reason=NULL,updated=? WHERE id=? AND state='analyzing' AND owner=?",
      )
      .run(new Date().toISOString(), id, process.pid);
  }
  release(id: string): void {
    if (this.workerLock?.auditId !== id) return;
    try {
      this.db
        .prepare("UPDATE audits SET owner=NULL WHERE id=? AND owner=?")
        .run(id, process.pid);
      this.db
        .prepare("DELETE FROM worker_claims WHERE audit_id=? AND owner=?")
        .run(id, process.pid);
    } finally {
      this.unlockWorker();
    }
  }
  account(id: string, requests: number, bytes: number): void {
    this.db
      .prepare("UPDATE audits SET requests=?,bytes=?,updated=? WHERE id=?")
      .run(requests, bytes, new Date().toISOString(), id);
  }
  event(id: string, kind: string, detail: unknown): void {
    this.db
      .prepare(
        "INSERT INTO events(audit_id,created,kind,detail) VALUES(?,?,?,?)",
      )
      .run(id, new Date().toISOString(), kind, JSON.stringify(detail));
  }
  events(id: string): unknown[] {
    return this.db
      .prepare(
        "SELECT created,kind,detail FROM events WHERE audit_id=? ORDER BY id DESC LIMIT 100",
      )
      .all(id)
      .map((row) => ({ ...row, detail: JSON.parse(String(row.detail)) }));
  }
  /** Evidence prerequisites must inspect the durable history, not a paginated UI window. */
  hasEvent(id: string, kind: string): boolean {
    return Boolean(
      this.db
        .prepare("SELECT 1 FROM events WHERE audit_id=? AND kind=? LIMIT 1")
        .get(id, kind),
    );
  }
  discover(
    id: string,
    url: string,
    original: string,
    source: string,
    parent: string | null,
    depth: number | null,
    state: QueueState = "queued",
    reason: string | null = null,
  ): boolean {
    this.db
      .prepare(
        "INSERT OR IGNORE INTO discoveries(audit_id,url,original,source,parent) VALUES(?,?,?,?,?)",
      )
      .run(id, url, original, source, parent);
    const changed = this.db
      .prepare("INSERT OR IGNORE INTO urls VALUES(?,?,?,?,?,?)")
      .run(id, url, original, depth, state, reason);
    if (depth !== null)
      this.db
        .prepare(
          "UPDATE urls SET depth=? WHERE audit_id=? AND url=? AND (depth IS NULL OR depth>?)",
        )
        .run(depth, id, url, depth);
    return Boolean(changed.changes);
  }
  hasUrl(id: string, url: string): boolean {
    return Boolean(
      this.db
        .prepare("SELECT 1 FROM urls WHERE audit_id=? AND url=?")
        .get(id, url),
    );
  }
  count(id: string): number {
    return Number(
      this.db.prepare("SELECT COUNT(*) AS n FROM urls WHERE audit_id=?").get(id)
        ?.n,
    );
  }
  next(id: string): QueueRow | undefined {
    const row = this.db
      .prepare(
        "SELECT url,original AS originalUrl,depth,state,reason FROM urls WHERE audit_id=? AND state='queued' ORDER BY CASE WHEN depth IS NULL THEN 1 ELSE 0 END,depth,rowid LIMIT 1",
      )
      .get(id);
    return row as unknown as QueueRow | undefined;
  }
  queueState(
    id: string,
    url: string,
    state: QueueState,
    reason: string | null = null,
  ): void {
    this.db
      .prepare("UPDATE urls SET state=?,reason=? WHERE audit_id=? AND url=?")
      .run(state, reason, id, url);
  }
  pages(
    id: string,
    offset = 0,
    limit = 100,
    search = "",
    sort = "url",
  ): QueueRow[] {
    const order = (
      {
        url: "url",
        state: "state,url",
        depth: "depth IS NULL,depth,url",
      } as Record<string, string>
    )[sort];
    if (!order) throw new Error("invalid-page-sort");
    return this.db
      .prepare(
        "SELECT url,original AS originalUrl,depth,state,reason FROM urls WHERE audit_id=? AND url LIKE ? ESCAPE '\\' ORDER BY " +
          order +
          " LIMIT ? OFFSET ?",
      )
      .all(
        id,
        "%" + search.replace(/[\\%_]/g, "\\$&") + "%",
        Math.min(200, Math.max(1, limit)),
        Math.max(0, offset),
      ) as unknown as QueueRow[];
  }
  putObservation(id: string, observation: Observation): void {
    this.db.prepare("INSERT INTO observations VALUES(?,?,?,?)").run(
      observation.id,
      id,
      observation.url,
      JSON.stringify({
        ...observation,
        attempts: observation.attempts.map((attempt) =>
          observation.response &&
          attempt.url === observation.response.url &&
          attempt.status === observation.response.status &&
          attempt.body === observation.response.body &&
          attempt.bodyBase64 === observation.response.bodyBase64 &&
          attempt.encodedBodyBase64 === observation.response.encodedBodyBase64
            ? {
                ...attempt,
                body: undefined,
                bodyBase64: undefined,
                encodedBodyBase64: undefined,
                bodyFromResponse: true,
              }
            : attempt,
        ),
      }),
    );
  }
  /** Query facts without duplicating captured bodies; original evidence stays available by URL/ID. */
  analysisObservations(id: string): Observation[] {
    const config = this.audit(id).config;
    const size = Number(
      this.db
        .prepare(
          "SELECT COALESCE(SUM(COALESCE(length(CAST(json_extract(data,'$.facts') AS BLOB)),0)+COALESCE(length(CAST(json_extract(data,'$.render.facts') AS BLOB)),0)+COALESCE(length(CAST(json_extract(data,'$.extensionFacts') AS BLOB)),0)),0) AS size FROM observations WHERE audit_id=?",
        )
        .get(id)?.size ?? 0,
    );
    if (size > config.maxMemoryBytes / 4)
      throw new Error("analysis-memory-budget");
    const observations: Observation[] = [];
    let bytes = 0;
    for (const row of this.db
      .prepare(
        `SELECT json_set(
      json_set(json_remove(data,'$.response.bodyBase64','$.response.encodedBodyBase64','$.render.dom'),'$.response.body',''),
      '$.attempts',json((SELECT json_group_array(json_set(json_remove(value,'$.bodyBase64','$.encodedBodyBase64','$.bodyFromResponse'),'$.body','')) FROM json_each(observations.data,'$.attempts'))),
      '$.evidenceProjection','facts-only') AS data FROM observations WHERE audit_id=? ORDER BY rowid`,
      )
      .iterate(id)) {
      const data = String(row.data);
      bytes += Buffer.byteLength(data);
      if (bytes > config.maxMemoryBytes / 4)
        throw new Error("analysis-memory-budget");
      observations.push(JSON.parse(data));
    }
    return observations;
  }
  observations(id: string): Observation[] {
    return this.db
      .prepare("SELECT data FROM observations WHERE audit_id=? ORDER BY rowid")
      .all(id)
      .map((row) => this.readObservation(String(row.data)));
  }
  private readObservation(data: string): Observation {
    const observation = JSON.parse(data);
    for (const attempt of observation.attempts) {
      if (attempt.bodyFromResponse && observation.response) {
        attempt.body = observation.response.body;
        if (observation.response.bodyBase64 !== undefined)
          attempt.bodyBase64 = observation.response.bodyBase64;
        if (observation.response.encodedBodyBase64 !== undefined)
          attempt.encodedBodyBase64 = observation.response.encodedBodyBase64;
        delete attempt.bodyFromResponse;
      }
    }
    return observation;
  }
  observation(id: string, url: string): Observation | null {
    const row = this.db
      .prepare(
        "SELECT data FROM observations WHERE audit_id=? AND url=? ORDER BY rowid DESC LIMIT 1",
      )
      .get(id, url);
    return row ? this.readObservation(String(row.data)) : null;
  }
  coverage(id: string): Record<string, unknown> {
    const audit = this.audit(id);
    const states: Record<string, number> = {};
    for (const row of this.db
      .prepare(
        "SELECT state,COUNT(*) AS n FROM urls WHERE audit_id=? GROUP BY state",
      )
      .all(id))
      states[String(row.state)] = Number(row.n);
    const sources = this.db
      .prepare(
        "SELECT source,COUNT(DISTINCT url) AS n FROM discoveries WHERE audit_id=? GROUP BY source",
      )
      .all(id);
    const render = this.db
      .prepare(
        "SELECT json_extract(data,'$.render.status') AS status,COUNT(*) AS n FROM observations WHERE audit_id=? GROUP BY status",
      )
      .all(id);
    const breakdowns: Record<
      string,
      Map<
        string,
        { known: number; fetched: number; rendered: number; unfinished: number }
      >
    > = {
      template: new Map(),
      section: new Map(),
      language: new Map(),
      profile: new Map(),
    };
    const rows = this.db
      .prepare(
        "SELECT u.url,u.state,json_extract(o.data,'$.facts.language') AS language,json_extract(o.data,'$.render.facts.language') AS renderedLanguage,json_extract(o.data,'$.render.status') AS rendered FROM urls u LEFT JOIN observations o ON u.audit_id=o.audit_id AND u.url=o.url WHERE u.audit_id=?",
      )
      .all(id);
    for (const row of rows) {
      const labels = {
        template:
          contractFor(audit.config, String(row.url))?.template ??
          "unclassified",
        section: "/" + (new URL(String(row.url)).pathname.split("/")[1] ?? ""),
        language: String(row.renderedLanguage || row.language || "unknown"),
        profile: audit.config.profile,
      };
      for (const [dimension, label] of Object.entries(labels)) {
        const counts = breakdowns[dimension].get(label) ?? {
          known: 0,
          fetched: 0,
          rendered: 0,
          unfinished: 0,
        };
        counts.known++;
        if (row.state === "fetched") counts.fetched++;
        if (row.rendered === "observed") counts.rendered++;
        if (
          ["queued", "fetching", "failed", "blocked"].includes(
            String(row.state),
          )
        )
          counts.unfinished++;
        breakdowns[dimension].set(label, counts);
      }
    }
    return {
      breakdowns: Object.fromEntries(
        Object.entries(breakdowns).map(([dimension, groups]) => [
          dimension,
          [...groups].map(([label, counts]) => ({ label, ...counts })),
        ]),
      ),
      knownInventory: this.count(id),
      discoveryTruncated: this.discoveryTruncated(id),
      omittedDiscoveryCount: null,
      totalSiteSize: null,
      states,
      sources,
      render,
      extractors: this.hasEvent(id, "extractor-manifest")
        ? this.db
            .prepare(
              "SELECT json_extract(e.value,'$.extractorId') AS extractorId,json_extract(e.value,'$.extractorVersion') AS extractorVersion,json_extract(e.value,'$.status') AS status,COUNT(*) AS count FROM observations o,json_each(o.data,'$.extensionFacts') e WHERE o.audit_id=? GROUP BY extractorId,extractorVersion,status ORDER BY extractorId,extractorVersion,status",
            )
            .all(id)
        : [],
      pageResponseStatuses: this.db
        .prepare(
          "SELECT json_extract(data,'$.response.status') AS status,COUNT(*) AS n FROM observations WHERE audit_id=? GROUP BY status",
        )
        .all(id),
      httpRequestIdentity:
        "Anonymous SEO-Workbench/0.1; locale=" + audit.config.locale,
      analysisAvailable: Boolean(this.latestAnalysis(id)),
      requests: audit.requests,
      bytes: audit.bytes,
      storageBytes: this.storageEstimate(id),
      state: audit.state,
      reason: audit.reason,
      stopExplanation: audit.reason ? explainError(audit.reason) : null,
      scope: audit.config.origins,
      verificationScope: audit.config.recheckUrls
        ? {
            mode: "targeted",
            urls: audit.config.recheckUrls,
            reusedObservations: 0,
          }
        : { mode: "full", urls: null, reusedObservations: 0 },
      completeDiscoveredQueue:
        !this.discoveryTruncated(id) &&
        ![
          "queued",
          "running",
          "analyzing",
          "paused",
          "cancelled",
          "partial",
          "error",
        ].includes(audit.state) &&
        !(states.queued || states.fetching || states.failed || states.blocked),
      limitations: [
        ...(audit.config.recheckUrls
          ? [
              "This recheck collected only its selected URLs and dependencies. Other page evidence remains in the earlier audit; inventory-wide checks are not tested here.",
            ]
          : []),
        "The total number of pages on the site is unknown.",
        "Search-engine indexing status is unknown unless you import an inspection result.",
        "Coverage describes the pages found or supplied in this audit.",
        "A recorded discovery-limit hit means URL candidates were omitted; their number is unknown. Older interrupted captures may not retain that flag.",
        "The crawler does not sign in or interact with consent prompts.",
      ],
    };
  }
  discoveryTruncated(id: string): boolean {
    return Boolean(
      this.db
        .prepare(
          "SELECT 1 FROM events WHERE audit_id=? AND kind='discovery-truncated' LIMIT 1",
        )
        .get(id),
    );
  }
  saveAnalysis(id: string, ruleset: string, results: RuleResult[]): string {
    const analysis = randomUUID();
    this.db.exec("BEGIN");
    try {
      this.db
        .prepare("INSERT INTO analyses VALUES(?,?,?,?)")
        .run(analysis, id, ruleset, new Date().toISOString());
      const samples = new Map<string, RuleResult>();
      for (const result of results)
        if (!samples.has(result.ruleId)) samples.set(result.ruleId, result);
      const dictionary = Buffer.from(
        JSON.stringify([...samples.values()]),
      ).subarray(-32768);
      this.db
        .prepare("INSERT INTO analysis_dictionaries VALUES(?,?)")
        .run(analysis, dictionary.toString("base64"));
      const insert = this.db.prepare("INSERT INTO results VALUES(?,?,?,?,?,?)");
      for (const [index, result] of results.entries()) {
        insert.run(
          analysis,
          result.id,
          result.ruleId,
          result.url,
          result.outcome,
          storedResult(result, dictionary),
        );
        if (index % 100 === 0) this.assertStorage(id);
      }
      this.assertStorage(id);
      this.db.exec("COMMIT");
      return analysis;
    } catch (error) {
      if (this.db.isTransaction) this.db.exec("ROLLBACK");
      throw error;
    }
  }
  latestAnalysis(id: string): string | null {
    return (
      String(
        this.db
          .prepare(
            "SELECT id FROM analyses WHERE audit_id=? ORDER BY rowid DESC LIMIT 1",
          )
          .get(id)?.id ?? "",
      ) || null
    );
  }
  results(id: string, options: ResultOptions = {}): RuleResult[] {
    const results: RuleResult[] = [];
    let bytes = 0,
      budget: number | undefined;
    for (const record of this.resultRecords(id, options)) {
      budget ??= this.audit(id).config.maxMemoryBytes / 4;
      bytes += record.bytes;
      if (bytes > budget) throw new Error("results-memory-budget");
      results.push(record.result);
    }
    return results;
  }
  /** Decode one bounded record at a time; consumers must avoid accumulating the stream. */
  *iterateResults(
    id: string,
    options: ResultOptions = {},
  ): Generator<RuleResult> {
    for (const record of this.resultRecords(id, options)) yield record.result;
  }
  /** Whole exports keep a cursor open and decode one bounded record at a time. */
  *allResults(id: string, analysis?: string): Generator<RuleResult> {
    for (const record of this.resultRecords(id, { analysis }, true))
      yield record.result;
  }
  private *resultRecords(
    id: string,
    options: ResultOptions,
    whole = false,
  ): Generator<{ result: RuleResult; bytes: number }> {
    const limit = options.limit ?? 100,
      offset = options.offset ?? 0;
    if (
      !Number.isSafeInteger(limit) ||
      limit < 1 ||
      limit > 1_000_000 ||
      !Number.isSafeInteger(offset) ||
      offset < 0
    )
      throw new Error("invalid-result-pagination");
    const analysis = options.analysis ?? this.latestAnalysis(id);
    if (!analysis) return;
    if (
      !this.db
        .prepare("SELECT id FROM analyses WHERE id=? AND audit_id=?")
        .get(analysis, id)
    )
      throw new Error("analysis-not-found");
    const order = (
      {
        url: "url,rule_id",
        state: "outcome,url,rule_id",
      } as Record<string, string>
    )[options.sort ?? "url"];
    if (!order) throw new Error("invalid-result-sort");
    const conditions = ["analysis_id=?"];
    const params: (string | number)[] = [analysis];
    if (options.search) {
      conditions.push("url LIKE ? ESCAPE '\\'");
      params.push("%" + options.search.replace(/[\\%_]/g, "\\$&") + "%");
    }
    if (options.outcome) {
      conditions.push("outcome=?");
      params.push(options.outcome);
    }
    if (options.ruleId) {
      conditions.push("rule_id=?");
      params.push(options.ruleId);
    }
    if (
      !whole &&
      limit === 1_000_000 &&
      Number(
        this.db
          .prepare(
            "SELECT COUNT(*) AS n FROM results WHERE " +
              conditions.join(" AND "),
          )
          .get(...params)?.n ?? 0,
      ) -
        offset >
        limit
    )
      throw new Error("results-count-budget");
    if (!whole) params.push(limit, offset);
    const dictionary = Buffer.from(
      String(
        this.db
          .prepare("SELECT data FROM analysis_dictionaries WHERE analysis_id=?")
          .get(analysis)?.data ?? "",
      ),
      "base64",
    );
    const budget = this.audit(id).config.maxMemoryBytes / 4;
    for (const row of this.db
      .prepare(
        "SELECT data FROM results WHERE " +
          conditions.join(" AND ") +
          " ORDER BY " +
          order +
          (whole ? "" : " LIMIT ? OFFSET ?"),
      )
      .iterate(...params)) {
      const encoded = String(row.data);
      if (Buffer.byteLength(encoded) > budget)
        throw new Error("results-memory-budget");
      const result = readResult(encoded, dictionary);
      const bytes = Buffer.byteLength(JSON.stringify(result));
      if (bytes > budget) throw new Error("results-memory-budget");
      yield { result, bytes };
    }
  }
  /** Whole-report callers must not silently omit findings beyond the retrieval ceiling. */
  assertCompleteResults(id: string): void {
    const analysis = this.latestAnalysis(id);
    if (
      analysis &&
      Number(
        this.db
          .prepare("SELECT COUNT(*) AS n FROM results WHERE analysis_id=?")
          .get(analysis)?.n ?? 0,
      ) > 1_000_000
    )
      throw new Error("results-count-budget");
  }

  addImport(project: string, kind: string, data: unknown): string {
    this.project(project);
    const id = randomUUID();
    this.db
      .prepare("INSERT INTO imports VALUES(?,?,?,?,?)")
      .run(id, project, kind, new Date().toISOString(), JSON.stringify(data));
    return id;
  }
  imports(project: string, kind: string): unknown[] {
    return this.importRecords(project, kind).map((record) => record.data);
  }
  importRecords(project: string, kind: string) {
    const budget = this.project(project).maxMemoryBytes / 4;
    const size = this.db
      .prepare(
        "SELECT COALESCE(SUM(length(CAST(data AS BLOB))),0) AS bytes FROM imports WHERE project_id=? AND kind=?",
      )
      .get(project, kind);
    if (Number(size?.bytes) > budget) throw new Error("imports-memory-budget");
    const imports: { id: string; created: string; data: unknown }[] = [];
    let bytes = 0;
    for (const row of this.db
      .prepare(
        "SELECT id,created,data FROM imports WHERE project_id=? AND kind=? ORDER BY rowid",
      )
      .iterate(project, kind)) {
      const encoded = String(row.data);
      bytes += Buffer.byteLength(encoded);
      if (bytes > budget) throw new Error("imports-memory-budget");
      imports.push({
        id: String(row.id),
        created: String(row.created),
        data: JSON.parse(encoded),
      });
    }
    return imports;
  }
  savedImport(project: string, kind: string, id: string): unknown {
    this.project(project);
    const row = this.db
      .prepare(
        "SELECT length(CAST(data AS BLOB)) AS bytes FROM imports WHERE project_id=? AND kind=? AND id=?",
      )
      .get(project, kind, id);
    if (!row) throw new Error("import-not-found");
    if (
      Number(row.bytes) >
      Math.min(5000000, this.project(project).maxMemoryBytes / 8)
    )
      throw new Error("imports-memory-budget");
    const saved = this.db
      .prepare(
        "SELECT data FROM imports WHERE project_id=? AND kind=? AND id=?",
      )
      .get(project, kind, id);
    return JSON.parse(String(saved?.data));
  }
  /** Delete an explicitly selected project's histories and imports as one transaction. */
  deleteProject(id: string): void {
    this.project(id);
    this.db.exec("BEGIN IMMEDIATE");
    try {
      if (
        this.db
          .prepare(
            "SELECT 1 FROM audits WHERE project_id=? AND owner IS NOT NULL LIMIT 1",
          )
          .get(id)
      )
        throw new Error("audit-worker-active");
      this.db.prepare("DELETE FROM imports WHERE project_id=?").run(id);
      this.db.prepare("DELETE FROM audits WHERE project_id=?").run(id);
      this.db.prepare("DELETE FROM projects WHERE id=?").run(id);
      this.db.exec("COMMIT");
    } catch (error) {
      if (this.db.isTransaction) this.db.exec("ROLLBACK");
      throw error;
    }
    this.db.exec("PRAGMA wal_checkpoint(TRUNCATE)");
  }
  /** Delete only an explicitly selected audit; other histories and projects survive. */
  deleteAudit(id: string): void {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const audit = this.audit(id);
      if (audit.owner) throw new Error("audit-worker-active");
      this.db
        .prepare(
          "DELETE FROM imports WHERE project_id=? AND kind IN ('content-review','action-review','source-mapping','verification-plan','verification-run','model-allowance','model-reservation','model-settlement','ai-suggestion') AND (json_extract(data,'$.auditId')=? OR json_extract(data,'$.baselineAuditId')=?)",
        )
        .run(audit.projectId, id, id);
      this.db.prepare("DELETE FROM audits WHERE id=?").run(id);
      this.db.exec("COMMIT");
    } catch (error) {
      if (this.db.isTransaction) this.db.exec("ROLLBACK");
      throw error;
    }
    this.db.exec("PRAGMA wal_checkpoint(TRUNCATE)");
  }
}

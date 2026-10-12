/** Operator-only source references retain fingerprints, never source text or repository paths. */
import { z } from "zod";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  openSync,
  closeSync,
  readSync,
  fstatSync,
  lstatSync,
  realpathSync,
  constants,
} from "node:fs";
import { resolve, join } from "node:path";
import type { Store } from "./store.ts";
import { groups } from "./intelligence.ts";

export const SourceMappingSchema = z
  .strictObject({
    auditId: z.string().uuid(),
    analysisId: z.string().uuid(),
    groupId: z.string().regex(/^[a-f0-9]{24}$/),
    file: z
      .string()
      .min(1)
      .max(500)
      .refine((path) =>
        path
          .split("/")
          .every(
            (part) =>
              /^[A-Za-z0-9_-][A-Za-z0-9_.-]*$/.test(part) && part !== "..",
          ),
      ),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    startLine: z.number().int().min(1).max(1000000),
    endLine: z.number().int().min(1).max(1000000),
    rationale: z.string().min(10).max(2000),
  })
  .refine((v) => v.endLine >= v.startLine && v.endLine - v.startLine < 500);

export function mapSource(
  store: Store,
  repository: string,
  value: unknown,
): string {
  const parsed = SourceMappingSchema.safeParse(value);
  if (!parsed.success) throw new Error("source-mapping-invalid");
  const mapping = parsed.data;
  let root = resolve(repository);
  let verifiedHash: string;
  try {
    if (!lstatSync(root).isDirectory())
      throw new Error("source-mapping-file-invalid");
    root = realpathSync(root);
    const git = (args: string[]) =>
      execFileSync("git", ["-c", "core.fsmonitor=false", "-C", root, ...args], {
        encoding: "utf8",
        maxBuffer: 32768,
        timeout: 5000,
        stdio: ["ignore", "pipe", "pipe"],
      });
    if (
      realpathSync(git(["rev-parse", "--show-toplevel"]).trim()) !== root ||
      git(["ls-files", "-z", "--", mapping.file]) !== mapping.file + "\0"
    )
      throw new Error("source-mapping-file-invalid");
    let path = root;
    for (const part of mapping.file.split("/")) {
      path = join(path, part);
      if (lstatSync(path).isSymbolicLink())
        throw new Error("source-mapping-file-invalid");
    }
    const fd = openSync(
      path,
      constants.O_RDONLY |
        (constants.O_NOFOLLOW ?? 0) |
        (constants.O_NONBLOCK ?? 0),
    );
    try {
      const before = fstatSync(fd);
      if (!before.isFile() || before.nlink !== 1 || before.size > 2000000)
        throw new Error("source-mapping-file-invalid");
      const bytes = Buffer.alloc(2000001);
      let length = 0,
        read = 0;
      while (
        length < bytes.length &&
        (read = readSync(fd, bytes, length, bytes.length - length, null)) > 0
      )
        length += read;
      if (length > 2000000) throw new Error("source-mapping-file-invalid");
      const content = bytes.subarray(0, length),
        text = new TextDecoder("utf-8", { fatal: true }).decode(content),
        after = fstatSync(fd);
      if (
        text.includes("\0") ||
        before.size !== after.size ||
        before.mtimeMs !== after.mtimeMs ||
        before.ctimeMs !== after.ctimeMs
      )
        throw new Error("source-mapping-file-invalid");
      verifiedHash = createHash("sha256").update(content).digest("hex");
      if (verifiedHash !== mapping.sha256)
        throw new Error("source-mapping-fingerprint-changed");
      if (mapping.endLine > text.split("\n").length)
        throw new Error("source-mapping-lines-invalid");
    } finally {
      closeSync(fd);
    }
  } catch (error) {
    if (
      error instanceof Error &&
      [
        "source-mapping-fingerprint-changed",
        "source-mapping-lines-invalid",
      ].includes(error.message)
    )
      throw error;
    throw new Error("source-mapping-file-invalid");
  }
  store.db.exec("BEGIN IMMEDIATE");
  try {
    const audit = store.audit(mapping.auditId);
    if (store.latestAnalysis(mapping.auditId) !== mapping.analysisId)
      throw new Error("action-review-analysis-changed");
    if (
      !groups(
        store.allResults(mapping.auditId, mapping.analysisId),
        audit.config,
      ).some((g) => g.id === mapping.groupId)
    )
      throw new Error("action-review-group-not-found");
    const id = store.addImport(audit.projectId, "source-mapping", {
      ...mapping,
      sha256: verifiedHash,
      verifiedAt: new Date().toISOString(),
      basis:
        "The operator supplied this connection. The tracked file, fingerprint and line range were checked at the recorded time. This does not establish the cause of the website finding or that the file remains unchanged.",
    });
    store.db.exec("COMMIT");
    return id;
  } catch (error) {
    if (store.db.isTransaction) store.db.exec("ROLLBACK");
    throw error;
  }
}

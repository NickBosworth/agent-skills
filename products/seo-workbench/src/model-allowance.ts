/** Audit-wide reservations survive failed calls and restarts; unknown usage is never refunded. */
import { z } from "zod";
import { randomUUID } from "node:crypto";
import type { Store } from "./store.ts";
export const ModelLimits = z.strictObject({
  maxGenerations: z.number().int().min(0).max(100).default(100),
  maxOutputTokens: z.number().int().min(0).max(400000).default(400000),
  maxCostMicros: z.number().int().nonnegative().nullable().default(null),
});
const identifier = z.string().uuid();
const reservationSchema = z.strictObject({
  auditId: identifier,
  reservationId: identifier,
  provider: z.string().min(1).max(200),
  model: z.string().min(1).max(300),
  purpose: z.enum(["schema-probe", "interpretation"]),
  outputTokenLimit: z.number().int().min(1).max(4000),
});
const settlementSchema = z.strictObject({
  auditId: identifier,
  reservationId: identifier,
  status: z.enum(["complete", "failed"]),
  inputTokens: z.number().int().nonnegative().nullable(),
  outputTokens: z.number().int().nonnegative().nullable(),
});
export class ModelAllowance {
  readonly store: Store;
  readonly auditId: string;
  constructor(store: Store, auditId: string, value: unknown = undefined) {
    this.store = store;
    this.auditId = auditId;
    identifier.parse(auditId);
    this.write(() => {
      const existing = modelRecords(
        this.store,
        this.auditId,
        "model-allowance",
      );
      const limits = ModelLimits.parse(
        value === undefined && existing.length === 1
          ? existing[0].limits
          : (value ?? {}),
      );
      if (existing.length > 1)
        throw new Error("model-allowance-record-invalid");
      if (existing.length) {
        const saved = ModelLimits.parse(existing[0].limits);
        if (JSON.stringify(saved) !== JSON.stringify(limits))
          throw new Error("model-allowance-change-refused");
      } else
        this.store.addImport(
          this.store.audit(auditId).projectId,
          "model-allowance",
          { auditId, limits },
        );
    });
  }
  private write<T>(work: () => T): T {
    if (this.store.db.isTransaction)
      throw new Error("database-transaction-active");
    this.store.db.exec("BEGIN IMMEDIATE");
    try {
      const result = work();
      this.store.db.exec("COMMIT");
      return result;
    } catch (error) {
      if (this.store.db.isTransaction) this.store.db.exec("ROLLBACK");
      throw error;
    }
  }
  summary() {
    const value = modelUsage(this.store, this.auditId);
    if (!value) throw new Error("model-allowance-record-invalid");
    return value;
  }
  reserve(
    value: Omit<z.infer<typeof reservationSchema>, "auditId" | "reservationId">,
  ): string {
    const reservation = reservationSchema.parse({
      ...value,
      auditId: this.auditId,
      reservationId: randomUUID(),
    });
    return this.write(() => {
      const current = this.summary();
      if (current.limits.maxCostMicros !== null)
        throw new Error("model-price-unavailable");
      if (
        current.records.some(
          (record) =>
            record.outputTokens !== null &&
            record.outputTokens > record.outputTokenLimit,
        )
      )
        throw new Error("model-provider-limit-violated");
      if (
        current.reservedGenerations >= current.limits.maxGenerations ||
        current.reservedOutputTokens + reservation.outputTokenLimit >
          current.limits.maxOutputTokens
      )
        throw new Error("model-audit-allowance-exhausted");
      this.store.addImport(
        this.store.audit(this.auditId).projectId,
        "model-reservation",
        reservation,
      );
      return reservation.reservationId;
    });
  }
  finish(
    reservationId: string,
    status: "complete" | "failed",
    inputTokens: number | null,
    outputTokens: number | null,
  ) {
    const settlement = settlementSchema.parse({
      auditId: this.auditId,
      reservationId,
      status,
      inputTokens,
      outputTokens,
    });
    this.write(() => {
      const current = this.summary(),
        reserved = current.records.find(
          (value) => value.reservationId === reservationId,
        );
      if (!reserved || reserved.status !== "unsettled")
        throw new Error("model-reservation-settlement-invalid");
      if (outputTokens !== null && outputTokens > reserved.outputTokenLimit)
        settlement.status = "failed";
      this.store.addImport(
        this.store.audit(this.auditId).projectId,
        "model-settlement",
        settlement,
      );
    });
  }
}

function modelRecords(
  store: Store,
  auditId: string,
  kind: string,
): Record<string, unknown>[] {
  const project = store.audit(auditId).projectId,
    size = store.db
      .prepare(
        "SELECT COUNT(*) AS n, COALESCE(SUM(length(CAST(data AS BLOB))),0) AS bytes FROM imports WHERE project_id=? AND kind=? AND json_extract(data,'$.auditId')=?",
      )
      .get(project, kind, auditId)!;
  if (Number(size.n) > 100 || Number(size.bytes) > 250000)
    throw new Error("model-allowance-record-invalid");
  return store.db
    .prepare(
      "SELECT data FROM imports WHERE project_id=? AND kind=? AND json_extract(data,'$.auditId')=? ORDER BY rowid",
    )
    .all(project, kind, auditId)
    .map((row) => JSON.parse(String(row.data)));
}

export function modelUsage(store: Store, auditId: string) {
  const saved = modelRecords(store, auditId, "model-allowance");
  if (!saved.length) return null;
  if (saved.length !== 1) throw new Error("model-allowance-record-invalid");
  const limits = ModelLimits.parse(saved[0].limits),
    reservations = modelRecords(store, auditId, "model-reservation").map(
      (value) => reservationSchema.parse(value),
    ),
    settlements = modelRecords(store, auditId, "model-settlement").map(
      (value) => settlementSchema.parse(value),
    ),
    byId = new Map(settlements.map((value) => [value.reservationId, value]));
  if (
    new Set(reservations.map((value) => value.reservationId)).size !==
      reservations.length ||
    byId.size !== settlements.length ||
    settlements.some(
      (value) =>
        !reservations.some(
          (reserved) => reserved.reservationId === value.reservationId,
        ),
    )
  )
    throw new Error("model-allowance-record-invalid");
  const total = (key: "inputTokens" | "outputTokens") => {
    let result = 0;
    for (const reserved of reservations) {
      const count = byId.get(reserved.reservationId)?.[key];
      if (
        count === undefined ||
        count === null ||
        !Number.isSafeInteger(result + count)
      )
        return null;
      result += count;
    }
    return result;
  };
  return {
    auditId: auditId,
    limits,
    reservedGenerations: reservations.length,
    reservedOutputTokens: reservations.reduce(
      (sum, value) => sum + value.outputTokenLimit,
      0,
    ),
    inputTokens: total("inputTokens"),
    outputTokens: total("outputTokens"),
    costMicros: null,
    records: reservations.map((reserved) => ({
      ...reserved,
      ...(byId.get(reserved.reservationId) ?? {
        status: "unsettled",
        inputTokens: null,
        outputTokens: null,
      }),
    })),
    basis:
      "Each generation, including schema probes, permanently reserves its output limit. Failed, cancelled and unsettled attempts are not refunded. Token counts are service-reported; absent counts and monetary cost remain unknown. A monetary ceiling cannot authorize an unpriced provider.",
  };
}

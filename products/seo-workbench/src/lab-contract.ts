/** Only bounded lab metrics cross the worker boundary; no traces or captured page text. */
import { z } from "zod";
const metric = z.number().finite().nonnegative().nullable();
const url = z
  .string()
  .url()
  .max(4096)
  .refine((value) => {
    const parsed = new URL(value);
    return (
      ["http:", "https:"].includes(parsed.protocol) &&
      !parsed.username &&
      !parsed.password
    );
  });
export const LabResultSchema = z.strictObject({
  toolVersion: z.literal("13.5.0"),
  browserVersion: z.string().min(1).max(200),
  requestedUrl: url,
  finalUrl: url,
  device: z.enum(["desktop", "mobile"]),
  emulation: z.strictObject({
    width: z.number().int().min(1).max(10000),
    height: z.number().int().min(1).max(10000),
    deviceScaleFactor: z.number().positive().max(10),
    mobile: z.boolean(),
    userAgent: z.string().min(1).max(1000),
  }),
  timestamp: z.string().datetime(),
  metrics: z.strictObject({ lcpMs: metric, cls: metric, tbtMs: metric }),
  failedRequests: z.number().int().min(0).max(10000),
  requestCount: z.number().int().min(0).max(10000),
});
export type LabResult = z.infer<typeof LabResultSchema>;

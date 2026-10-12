/** Anonymous HTTP transport: every connection uses a validated, pinned address. */
import http from "node:http";
import https from "node:https";
import { lookup } from "node:dns/promises";
import ipaddr from "ipaddr.js";
import { decodeBuffer } from "encoding-sniffer";
import { decompress } from "./compression.ts";
import {
  AGENT,
  fetchKey,
  scopeReason,
  type Config,
  type ResponseEvidence,
} from "./domain.ts";

export type Resolver = (
  hostname: string,
) => Promise<{ address: string; family: number }[]>;
export class NetworkPolicy {
  readonly localOrigins: ReadonlySet<string>;
  readonly resolve: Resolver;
  constructor(
    options: {
      localOrigins?: string[];
      resolver?: Resolver;
    } = {},
  ) {
    if (
      Object.keys(options).some(
        (key) => !["localOrigins", "resolver"].includes(key),
      )
    )
      throw new Error("network-policy-option-unsupported");
    // Local permission is operator-supplied, never read from imported project config.
    const local = options.localOrigins ?? [];
    for (const value of local) {
      const u = new URL(value);
      if (
        u.protocol !== "http:" ||
        !["127.0.0.1", "[::1]"].includes(u.hostname) ||
        !u.port ||
        u.origin !== value
      )
        throw new Error("invalid-local-origin");
    }
    this.localOrigins = new Set(local);
    this.resolve =
      options.resolver ??
      ((hostname) => lookup(hostname, { all: true, verbatim: true }));
  }
  async address(
    value: string,
    signal?: AbortSignal,
    timeoutMs = 15000,
  ): Promise<{ address: string; family: number }> {
    if (signal?.aborted) throw new Error("cancelled");
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0)
      throw new Error("invalid-network-timeout");
    const parsed = new URL(fetchKey(value));
    const hostname = parsed.hostname.replace(/^\[|\]$/g, "");
    if (this.localOrigins.has(parsed.origin))
      return { address: hostname, family: hostname.includes(":") ? 6 : 4 };
    if (parsed.port && !["80", "443"].includes(parsed.port))
      throw new Error("port-blocked");
    const addresses = ipaddr.isValid(hostname)
      ? [{ address: hostname, family: hostname.includes(":") ? 6 : 4 }]
      : await new Promise<{ address: string; family: number }[]>(
          (resolve, reject) => {
            let settled = false;
            const finish = (action: () => void) => {
              if (settled) return;
              settled = true;
              clearTimeout(timer);
              signal?.removeEventListener("abort", cancel);
              action();
            };
            const cancel = () => finish(() => reject(new Error("cancelled")));
            const timer = setTimeout(
              () => finish(() => reject(new Error("dns-timeout"))),
              timeoutMs,
            );
            signal?.addEventListener("abort", cancel, { once: true });
            if (signal?.aborted) {
              cancel();
              return;
            }
            // OS lookup may continue; late results cannot resume a cancelled connection.
            try {
              this.resolve(hostname).then(
                (answers) => finish(() => resolve(answers)),
                () => finish(() => reject(new Error("dns-failed"))),
              );
            } catch {
              finish(() => reject(new Error("dns-failed")));
            }
          },
        );
    if (!addresses.length) throw new Error("dns-empty");
    // Reject the entire answer if even one address is private or special-use.
    for (const item of addresses) {
      const address = ipaddr.process(item.address);
      if (address.range() !== "unicast")
        throw new Error("network-address-blocked");
    }
    return addresses[0];
  }
}
export class Transport {
  private tail: Promise<void> = Promise.resolve();
  private timeExpired = false;
  requests = 0;
  bytes = 0;
  readonly started: number;
  lastRequest = 0;
  readonly originDelays = new Map<string, number>();
  private readonly originRequests = new Map<string, number>();
  readonly config: Config;
  readonly policy: NetworkPolicy;
  readonly signal?: AbortSignal;
  readonly accounting?: (requests: number, bytes: number) => void;
  constructor(
    config: Config,
    policy: NetworkPolicy,
    signal?: AbortSignal,
    accounting?: (requests: number, bytes: number) => void,
    started = Date.now(),
  ) {
    this.started = started;
    this.config = config;
    this.policy = policy;
    this.signal = signal;
    this.accounting = accounting;
  }
  /** Fetch one hop only. Caller evaluates robots and scope again before redirects. */
  request(value: string, signal?: AbortSignal): Promise<ResponseEvidence> {
    const active =
      signal && this.signal
        ? AbortSignal.any([signal, this.signal])
        : (signal ?? this.signal);
    const job = this.tail.then(() => this.requestOnce(value, active));
    this.tail = job.then(
      () => {},
      () => {},
    );
    return job;
  }
  private async requestOnce(
    value: string,
    activeSignal?: AbortSignal,
  ): Promise<ResponseEvidence> {
    if (activeSignal?.aborted) throw new Error("cancelled");
    if (this.requests >= this.config.maxRequests)
      throw new Error("request-budget");
    if (
      this.timeExpired ||
      Date.now() - this.started >= this.config.maxSeconds * 1000
    )
      throw new Error("time-budget");
    if (this.bytes >= this.config.maxDownloadBytes)
      throw new Error("download-budget");
    const url = new URL(fetchKey(value));
    const wait =
      Math.max(
        this.lastRequest + this.config.delayMs,
        (this.originRequests.get(url.origin) ?? 0) +
          (this.originDelays.get(url.origin) ?? 0),
      ) - Date.now();
    if (
      Date.now() + Math.max(0, wait) - this.started >=
      this.config.maxSeconds * 1000
    )
      throw new Error("time-budget");
    if (wait > 0)
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
          activeSignal?.removeEventListener("abort", cancel);
          resolve();
        }, wait);
        const cancel = () => {
          clearTimeout(timer);
          reject(new Error("cancelled"));
        };
        activeSignal?.addEventListener("abort", cancel, { once: true });
      });
    const requestDeadline = Date.now() + this.config.timeoutMs;
    const auditDeadline = this.started + this.config.maxSeconds * 1000;
    const expires = Math.min(requestDeadline, auditDeadline);
    let selected;
    try {
      selected = await this.policy.address(
        url.href,
        activeSignal,
        expires - Date.now(),
      );
    } catch (error) {
      if (Date.now() >= auditDeadline && !activeSignal?.aborted)
        throw new Error("time-budget");
      throw error;
    }
    if (activeSignal?.aborted) throw new Error("cancelled");
    if (Date.now() >= expires)
      throw new Error(
        expires === auditDeadline ? "time-budget" : "request-timeout",
      );
    this.requests++;
    this.accounting?.(this.requests, this.bytes);
    this.lastRequest = Date.now();
    this.originRequests.set(url.origin, this.lastRequest);
    const start = Date.now();
    return await new Promise<ResponseEvidence>((resolve, reject) => {
      const requester = url.protocol === "https:" ? https : http;
      const req = requester.request(
        url,
        {
          method: "GET",
          agent: false,
          signal: activeSignal,
          family: selected.family,
          headers: {
            "User-Agent": AGENT,
            Accept:
              "text/html,application/xhtml+xml,application/xml,text/plain;q=0.8",
            "Accept-Encoding": "gzip, deflate, br",
            "Accept-Language": this.config.locale,
          },
          // The socket cannot perform a second DNS lookup after validation.
          lookup: (_hostname, _options, callback) =>
            callback(null, selected.address, selected.family),
        },
        (res) => {
          const pieces: Buffer[] = [];
          let size = 0;
          const encoding = String(
            res.headers["content-encoding"] ?? "identity",
          );
          res.on("data", (chunk: Buffer) => {
            size += chunk.length;
            this.bytes += chunk.length;
            this.accounting?.(this.requests, this.bytes);
            if (
              size > this.config.maxBytes ||
              this.bytes > this.config.maxDownloadBytes
            ) {
              reject(
                new Error(
                  size > this.config.maxBytes
                    ? "response-budget"
                    : "download-budget",
                ),
              );
              res.destroy();
              req.destroy();
              return;
            }
            pieces.push(chunk);
          });
          res.on("error", () => reject(new Error("response-failed")));
          res.on("aborted", () => reject(new Error("response-aborted")));
          res.on("end", async () => {
            try {
              if (activeSignal?.aborted) throw new Error("cancelled");
              if (Date.now() >= expires)
                throw new Error(
                  expires === auditDeadline ? "time-budget" : "request-timeout",
                );
              const wire = Buffer.concat(pieces, size);
              const timeout = AbortSignal.timeout(
                Math.max(1, expires - Date.now()),
              );
              const decodingSignal = activeSignal
                ? AbortSignal.any([activeSignal, timeout])
                : timeout;
              let decoded: Buffer;
              try {
                decoded = [204, 304].includes(res.statusCode ?? 0)
                  ? wire
                  : await decompress(
                      wire,
                      encoding,
                      this.config.maxBytes,
                      decodingSignal,
                    );
              } catch (error) {
                if (activeSignal?.aborted) throw new Error("cancelled");
                if (timeout.aborted || Date.now() >= expires)
                  throw new Error(
                    expires === auditDeadline
                      ? "time-budget"
                      : "request-timeout",
                  );
                throw error;
              }
              const headers: Record<string, string> = {};
              // Cookies and authentication challenges are deliberately not retained.
              for (const key of [
                "content-type",
                "content-encoding",
                "location",
                "x-robots-tag",
                "link",
                "content-language",
                "retry-after",
                "content-security-policy",
              ]) {
                if (res.headers[key] !== undefined)
                  headers[key] = String(res.headers[key]);
              }
              resolve({
                url: url.href,
                status: res.statusCode ?? 0,
                headers,
                robotsTags: res.rawHeaders.filter(
                  (_value, i) =>
                    i % 2 === 1 &&
                    res.rawHeaders[i - 1].toLowerCase() === "x-robots-tag",
                ),
                body: decodeBuffer(decoded, {
                  transportLayerEncodingLabel:
                    /charset\s*=\s*["']?([^\s;"']+)/i.exec(
                      headers["content-type"] ?? "",
                    )?.[1],
                  defaultEncoding: /html/i.test(headers["content-type"] ?? "")
                    ? "windows-1252"
                    : "utf-8",
                }),
                requestedAt: new Date(start).toISOString(),
                durationMs: Date.now() - start,
                bytes: size,
                address: selected.address,
                bodyBase64: decoded.toString("base64"),
                ...(encoding.toLowerCase().trim() !== "identity"
                  ? {
                      encodedBodyBase64: wire.toString("base64"),
                      decodedBytes: decoded.length,
                    }
                  : {}),
              });
            } catch (error) {
              reject(error);
            }
          });
        },
      );
      const deadline = setTimeout(
        () => {
          // Timer rounding or a clock adjustment must not reopen an expired audit.
          if (expires === auditDeadline) this.timeExpired = true;
          reject(
            new Error(
              expires === auditDeadline ? "time-budget" : "request-timeout",
            ),
          );
          req.destroy();
        },
        Math.max(1, expires - Date.now()),
      );
      req.on("close", () => clearTimeout(deadline));
      req.on("error", (error) => reject(error));
      req.end();
    });
  }
  async scoped(value: string): Promise<ResponseEvidence> {
    if (scopeReason(this.config, value)) throw new Error("scope-blocked");
    return this.request(value);
  }
}

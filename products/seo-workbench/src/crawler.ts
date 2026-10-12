/** Durable, conservative crawl worker. Discovery, fetching and canonical identity stay separate. */
import { parseRobots } from "./robots.ts";
import { headerCanonicals, headerAlternates } from "./response-directives.ts";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { decompress } from "./compression.ts";
import {
  RULESET,
  contractFor,
  errorCode,
  fetchKey,
  hash,
  scopeReason,
  type Config,
  type Observation,
  type ResponseEvidence,
} from "./domain.ts";
import { extract, sitemapLocations } from "./extract.ts";
import { analyze, rules } from "./rules.ts";
import { Transport, NetworkPolicy } from "./network.ts";
import { renderBrowser } from "./browser-runner.ts";
import { controlDefinitions } from "./search-controls.ts";
import {
  extractCustomFacts,
  validateExtractors,
  type TrustedExtractor,
} from "./extractors.ts";
import { Store } from "./store.ts";

export class Crawler {
  readonly controllers = new Map<string, AbortController>();
  readonly store: Store;
  readonly policy: NetworkPolicy;
  readonly extractors: TrustedExtractor[];
  constructor(
    store: Store,
    policy = new NetworkPolicy(),
    extractors: TrustedExtractor[] = [],
  ) {
    this.store = store;
    this.policy = policy;
    this.extractors = validateExtractors(extractors);
  }
  cancel(id: string): void {
    if (this.store.audit(id).state === "complete")
      throw new Error("audit-already-complete");
    this.store.state(id, "cancelled", "user-cancelled");
    this.controllers.get(id)?.abort();
  }
  pause(id: string): void {
    if (this.store.audit(id).state === "complete")
      throw new Error("audit-already-complete");
    this.store.state(id, "paused", "user-paused");
    this.controllers.get(id)?.abort();
  }
  async run(id: string): Promise<void> {
    if (this.controllers.has(id)) throw new Error("audit-worker-active");
    const initial = this.store.audit(id);
    if (initial.state === "complete") throw new Error("audit-already-complete");
    this.store.claim(
      id,
      this.extractors.map((extractor) => extractor.definition),
    );
    const config = initial.config,
      controller = new AbortController();
    this.controllers.set(id, controller);
    const controls = setInterval(() => {
      if (["paused", "cancelled"].includes(this.store.audit(id).state))
        controller.abort();
    }, 100);
    const transport = new Transport(
      config,
      this.policy,
      controller.signal,
      (requests, bytes) => this.store.account(id, requests, bytes),
      Date.parse(initial.createdAt),
    );
    transport.requests = initial.requests;
    transport.bytes = initial.bytes;
    const robots = new Map<
      string,
      {
        allowed: boolean;
        parser?: ReturnType<typeof parseRobots>;
        hash?: string;
      }
    >();
    const sitemapUrls = new Set<string>(),
      visitedMaps = new Set<string>(),
      sampledTemplates = new Set<string>();
    let sitemapComplete = true,
      discoveryLimited = this.store.discoveryTruncated(id);
    const add = (
      original: string,
      source: string,
      parent: string | null,
      depth: number | null,
    ) => {
      let value;
      try {
        value = fetchKey(original, parent ?? undefined);
      } catch {
        return;
      }
      if (
        this.store.count(id) >= config.maxDiscoveries &&
        !this.store.hasUrl(id, value)
      ) {
        if (!discoveryLimited)
          this.store.event(id, "discovery-truncated", {
            source: "discovery limit",
            maxDiscoveries: config.maxDiscoveries,
          });
        discoveryLimited = true;
        return;
      }
      const reason =
        scopeReason(config, value) ??
        (depth !== null && depth > config.maxDepth ? "depth" : null);
      this.store.discover(
        id,
        value,
        original,
        source,
        parent,
        depth,
        reason ? "excluded" : "queued",
        reason,
      );
    };
    const allowed = async (value: string): Promise<boolean> => {
      const origin = new URL(value).origin;
      if (!robots.has(origin)) {
        try {
          let response = await transport.request(origin + "/robots.txt");
          const attempts = [response],
            seen = new Set([response.url]);
          for (
            let hop = 0;
            response.status >= 300 && response.status < 400;
            hop++
          ) {
            if (hop >= 5 || !response.headers.location)
              throw new Error("robots-redirect-limit");
            const target = fetchKey(response.headers.location, response.url);
            if (
              !config.origins.includes(new URL(target).origin) ||
              scopeReason(
                {
                  ...config,
                  recheckUrls: undefined,
                  include: ["/"],
                  exclude: [],
                },
                target,
              )
            )
              throw new Error("robots-redirect-scope-blocked");
            if (seen.has(target)) throw new Error("robots-redirect-loop");
            seen.add(target);
            response = await transport.request(target);
            attempts.push(response);
          }
          const allowed =
            response.status >= 400 &&
            response.status < 500 &&
            ![401, 403, 429].includes(response.status);
          const parsed =
            response.status >= 200 && response.status < 300
              ? parseRobots(origin + "/robots.txt", response.body)
              : undefined;
          robots.set(origin, {
            allowed,
            parser: parsed,
            hash: hash(response.body),
          });
          const crawlDelay = parsed?.getCrawlDelay("SEO-Workbench");
          if (
            crawlDelay !== undefined &&
            Number.isFinite(crawlDelay) &&
            crawlDelay > 0
          )
            transport.originDelays.set(origin, crawlDelay * 1000);
          this.store.event(id, "robots-observation", {
            origin,
            url: response.url,
            status: response.status,
            redirects: attempts.slice(0, -1).map((a) => ({
              url: a.url,
              status: a.status,
              location: a.headers.location,
            })),
            crawlDelaySeconds: crawlDelay ?? null,
            hash: hash(response.body),
            policy: parsed
              ? "parsed"
              : allowed
                ? "unavailable-allow"
                : "unreachable-block",
            timestamp: response.requestedAt,
          });
        } catch (error) {
          robots.set(origin, { allowed: false });
          this.store.event(id, "robots-unavailable", {
            origin,
            reason: errorCode(error),
          });
        }
      }
      const policy = robots.get(origin)!;
      return policy.parser
        ? policy.parser.isAllowed(value, "SEO-Workbench") !== false
        : policy.allowed;
    };
    const waitForFollowUp = async (
      response: ResponseEvidence | undefined,
      minimumMs: number,
      pageUrl: string,
    ): Promise<string | null> => {
      if (controller.signal.aborted) return "cancelled";
      const exhausted =
        transport.requests >= config.maxRequests
          ? "request-budget"
          : transport.bytes >= config.maxDownloadBytes
            ? "download-budget"
            : null;
      if (exhausted) {
        this.store.state(id, "partial", exhausted);
        controller.abort();
        return exhausted;
      }
      const value = response?.headers["retry-after"]?.trim() ?? "";
      let dateValue = value;
      const legacy = /^([A-Za-z]+, \d{2}-[A-Za-z]{3}-)(\d{2}) /.exec(value);
      if (legacy) {
        const horizon = new Date();
        horizon.setUTCFullYear(horizon.getUTCFullYear() + 50);
        const year =
          Math.floor(horizon.getUTCFullYear() / 100) * 100 + Number(legacy[2]);
        dateValue = value.replace(legacy[0], legacy[1] + year + " ");
        // HTTP's rolling century differs from JavaScript's fixed two-digit cutoff.
        if (Date.parse(dateValue) > horizon.getTime())
          dateValue = value.replace(legacy[0], legacy[1] + (year - 100) + " ");
      }
      const date =
        /^(?:[A-Za-z]{3}, \d{2} [A-Za-z]{3} \d{4} \d{2}:\d{2}:\d{2} GMT|[A-Za-z]+, \d{2}-[A-Za-z]{3}-\d{2} \d{2}:\d{2}:\d{2} GMT|[A-Za-z]{3} [A-Za-z]{3} [ \d]\d \d{2}:\d{2}:\d{2} \d{4})$/.test(
          value,
        )
          ? Date.parse(dateValue) - Date.now()
          : 0;
      const suggested = /^\d+$/.test(value) ? Number(value) * 1000 : date;
      const milliseconds = Math.max(
        minimumMs,
        Number.isNaN(suggested) ? 0 : suggested,
      );
      if (
        milliseconds >=
        transport.started + config.maxSeconds * 1000 - Date.now()
      ) {
        this.store.state(id, "partial", "retry-delay-budget");
        controller.abort();
        return "retry-delay-budget";
      }
      if (milliseconds > 0) {
        this.store.event(id, "request-follow-up-wait", {
          url: response?.url ?? null,
          pageUrl,
          milliseconds,
          notBefore: Date.now() + milliseconds,
        });
        try {
          await delay(milliseconds, undefined, { signal: controller.signal });
        } catch {
          return "cancelled";
        }
      }
      return controller.signal.aborted ? "cancelled" : null;
    };
    const fetch = async (
      value: string,
      recoverWait = false,
    ): Promise<{
      attempts: ResponseEvidence[];
      response: ResponseEvidence | null;
      finalUrl: string;
      error: string | null;
    }> => {
      const attempts: ResponseEvidence[] = [];
      const seen = new Set<string>();
      let target = value;
      const savedWait = recoverWait
        ? Number(
            this.store.db
              .prepare(
                "SELECT json_extract(detail,'$.notBefore') AS deadline FROM events WHERE audit_id=? AND kind='request-follow-up-wait' AND json_extract(detail,'$.pageUrl')=? ORDER BY id DESC LIMIT 1",
              )
              .get(id, value)?.deadline ?? 0,
          )
        : 0;
      if (Number.isFinite(savedWait) && savedWait > Date.now()) {
        const interrupted = await waitForFollowUp(
          undefined,
          savedWait - Date.now(),
          value,
        );
        if (interrupted)
          return {
            attempts,
            response: null,
            finalUrl: target,
            error: interrupted,
          };
      }
      for (let hop = 0; hop < 6; hop++) {
        if (seen.has(target))
          return {
            attempts,
            response: null,
            finalUrl: target,
            error: "redirect-loop",
          };
        seen.add(target);
        if (scopeReason(config, target))
          return {
            attempts,
            response: null,
            finalUrl: target,
            error: "redirect-scope-blocked",
          };
        if (!(await allowed(target)))
          return {
            attempts,
            response: null,
            finalUrl: target,
            error: robots.get(new URL(target).origin)?.parser
              ? "robots-excluded"
              : "robots-unreachable-blocked",
          };
        let response: ResponseEvidence | undefined,
          last = "request-failed";
        for (let retry = 0; retry <= config.retries; retry++) {
          // An earlier response is evidence, not the result of a later failed request.
          response = undefined;
          const attemptedAt = Date.now(),
            previousRequests = transport.requests;
          try {
            response = await transport.scoped(target);
            attempts.push(response);
            if (response.status === 429 || response.status === 403) {
              this.store.state(
                id,
                "partial",
                response.status === 429 ? "rate-limited" : "access-denied",
              );
              controller.abort();
              break;
            }
            if (response.status < 500 || retry === config.retries) break;
          } catch (error) {
            last = errorCode(error);
            this.store.event(id, "request-attempt-failed", {
              url: target,
              reason: last,
              requestedAt: new Date(attemptedAt).toISOString(),
              durationMs: Date.now() - attemptedAt,
              chargedRequest: transport.requests > previousRequests,
              requestNumber:
                transport.requests > previousRequests
                  ? transport.requests
                  : null,
            });
            if (
              controller.signal.aborted ||
              retry === config.retries ||
              last.endsWith("budget") ||
              last.includes("blocked")
            )
              break;
          }
          const interrupted = await waitForFollowUp(
            response,
            Math.min(1000 * 2 ** retry, 4000),
            value,
          );
          if (interrupted)
            return {
              attempts,
              response: interrupted === "cancelled" ? null : (response ?? null),
              finalUrl: target,
              error: interrupted,
            };
        }
        if (!response)
          return { attempts, response: null, finalUrl: target, error: last };
        if (
          response.status >= 300 &&
          response.status < 400 &&
          response.headers.location
        ) {
          let redirected: string;
          try {
            redirected = fetchKey(response.headers.location, target);
          } catch {
            return {
              attempts,
              response: null,
              finalUrl: target,
              error: "invalid-redirect",
            };
          }
          if (seen.has(redirected) || scopeReason(config, redirected))
            return {
              attempts,
              response: null,
              finalUrl: redirected,
              error: seen.has(redirected)
                ? "redirect-loop"
                : "redirect-scope-blocked",
            };
          const interrupted = await waitForFollowUp(response, 0, value);
          if (interrupted)
            return {
              attempts,
              response: interrupted === "cancelled" ? null : response,
              finalUrl: target,
              error: interrupted,
            };
          target = redirected;
          continue;
        }
        return { attempts, response, finalUrl: target, error: null };
      }
      return {
        attempts,
        response: null,
        finalUrl: target,
        error: "redirect-hop-budget",
      };
    };
    const sitemap = async (value: string): Promise<void> => {
      if (visitedMaps.has(value)) return;
      if (visitedMaps.size >= 100) {
        sitemapComplete = false;
        return;
      }
      visitedMaps.add(value);
      try {
        const result = await fetch(value, initial.requests > 0);
        if (!result.response || result.response.status !== 200)
          throw new Error("sitemap-unavailable");
        let xml = result.response.body;
        const bytes = result.response.bodyBase64
          ? Buffer.from(result.response.bodyBase64, "base64")
          : null;
        // Gzip sitemap files may have no HTTP Content-Encoding, or a second HTTP encoding layer.
        if (bytes && bytes[0] === 0x1f && bytes[1] === 0x8b) {
          const remaining =
            transport.started + config.maxSeconds * 1000 - Date.now();
          if (remaining <= 0) throw new Error("time-budget");
          const timeout = AbortSignal.timeout(Math.max(1, remaining));
          try {
            xml = (
              await decompress(
                bytes,
                "gzip",
                config.maxBytes,
                AbortSignal.any([controller.signal, timeout]),
              )
            ).toString("utf8");
          } catch (error) {
            if (controller.signal.aborted) throw new Error("cancelled");
            if (timeout.aborted) throw new Error("time-budget");
            throw error;
          }
        }
        const data = sitemapLocations(xml);
        this.store.event(id, "sitemap-observation", {
          url: value,
          hash: hash(xml),
          timestamp: result.response.requestedAt,
          index: data.index,
          locations: data.locations.length,
        });
        for (const raw of data.locations) {
          if (controller.signal.aborted) break;
          const url = fetchKey(raw, value);
          if (data.index) {
            if (!scopeReason(config, url)) await sitemap(url);
            else sitemapComplete = false;
          } else {
            sitemapUrls.add(url);
            add(url, "sitemap", value, null);
          }
        }
      } catch (error) {
        sitemapComplete = false;
        this.store.event(id, "sitemap-unavailable", {
          url: value,
          reason: errorCode(error),
        });
      }
    };
    try {
      if (config.recheckUrls) {
        config.recheckUrls.forEach((url) =>
          add(url, "verification", null, null),
        );
      } else {
        config.seeds.forEach((url) => add(url, "seed", null, 0));
        config.inventory.forEach((url) => add(url, "inventory", null, null));
        // Sitemap discovery is explicit and from each origin's robots file, never an external crawl.
        for (const origin of config.origins) {
          await allowed(origin + "/");
          const policy = robots.get(origin)?.parser;
          for (const value of policy?.getSitemaps() ?? [])
            if (!scopeReason(config, value)) await sitemap(value);
        }
        for (const value of config.sitemaps) await sitemap(value);
      }
      while (
        !controller.signal.aborted &&
        this.store.audit(id).state === "running"
      ) {
        if (
          Date.now() - Date.parse(initial.createdAt) >
          config.maxSeconds * 1000
        ) {
          this.store.state(id, "partial", "time-budget");
          break;
        }
        if (process.memoryUsage().rss > config.maxMemoryBytes) {
          this.store.state(id, "partial", "memory-budget");
          break;
        }
        if (this.store.storageEstimate(id) > config.maxStorageBytes * 0.8) {
          this.store.state(id, "partial", "persistent-storage-budget");
          break;
        }
        const row = this.store.next(id);
        if (!row) break;
        const observedCount = Number(
          this.store.db
            .prepare("SELECT COUNT(*) AS n FROM observations WHERE audit_id=?")
            .get(id)?.n,
        );
        if (observedCount >= config.maxPages) {
          this.store.state(id, "partial", "page-budget");
          break;
        }
        this.store.queueState(id, row.url, "fetching");
        const fetched = await fetch(
          row.url,
          row.reason === "recovered-interrupted-attempt",
        );
        if (["paused", "cancelled"].includes(this.store.audit(id).state)) {
          this.store.event(id, "page-attempt-interrupted", {
            url: row.url,
            responses: fetched.attempts.map((response) => ({
              url: response.url,
              status: response.status,
              requestedAt: response.requestedAt,
              bytes: response.bytes,
              bodyHash: hash(response.body),
            })),
          });
          // Leave unfinished work recoverable; resume claims reset fetching rows to queued.
          break;
        }
        const isHTML = Boolean(
          fetched.response &&
          /^(?:text\/html|application\/xhtml\+xml)/i.test(
            fetched.response.headers["content-type"] ?? "",
          ),
        );
        const facts = isHTML
          ? extract(fetched.response!.body, fetched.finalUrl)
          : null;
        const observation: Observation = {
          id: randomUUID(),
          url: row.url,
          originalUrl: row.originalUrl,
          ...fetched,
          facts,
          publisherControls: controlDefinitions.map((definition) => {
            const policy = robots.get(new URL(row.url).origin);
            const permission = policy?.parser
              ? policy.parser.isAllowed(row.url, definition.token) === false
                ? "disallowed-by-observed-policy"
                : "allowed-by-observed-policy"
              : policy?.allowed
                ? "no-file-allow"
                : "unknown";
            return {
              ...definition,
              permission,
              robotsHash: policy?.hash ?? null,
            };
          }),
          render: null,
          timestamp: new Date().toISOString(),
        };
        const template =
          contractFor(config, row.url)?.template ??
          new URL(row.url).pathname.split("/").filter(Boolean)[0] ??
          "root";
        const render =
          config.render === "all" ||
          (config.render === "auto" &&
            (!sampledTemplates.has(template) ||
              !facts?.text ||
              !facts.title ||
              facts.robots.some((r) => r.includes("noindex"))));
        if (isHTML && render && !controller.signal.aborted) {
          observation.render = await renderBrowser(
            fetched.response!,
            config,
            transport,
          );
          sampledTemplates.add(template);
        }
        if (this.extractors.length)
          observation.extensionFacts = extractCustomFacts(
            observation,
            this.extractors,
          );
        this.store.putObservation(id, observation);
        this.store.queueState(
          id,
          row.url,
          fetched.error
            ? fetched.error === "robots-excluded"
              ? "excluded"
              : fetched.error.includes("blocked")
                ? "blocked"
                : "failed"
            : "fetched",
          fetched.error,
        );
        this.store.account(id, transport.requests, transport.bytes);
        if (fetched.error?.endsWith("budget")) {
          this.store.state(id, "partial", fetched.error);
          break;
        }
        for (const response of fetched.attempts.filter(
          (r) => r.status >= 300 && r.status < 400,
        )) {
          if (response.headers.location)
            add(response.headers.location, "redirect", response.url, row.depth);
        }
        for (const edge of [
          ...(facts?.edges ?? []),
          ...(observation.render?.facts?.edges ?? []),
        ]) {
          if (["hyperlink", "navigation"].includes(edge.kind))
            add(
              edge.target,
              observation.render?.facts?.edges.includes(edge)
                ? "rendered-link"
                : "link",
              row.url,
              row.depth === null ? null : row.depth + 1,
            );
          else add(edge.target, edge.kind, row.url, null);
        }
        for (const target of headerCanonicals(
          fetched.response?.headers.link,
          fetched.finalUrl,
        ).targets)
          add(target, "http-link-canonical", row.url, null);
        for (const link of headerAlternates(
          fetched.response?.headers.link,
          fetched.finalUrl,
        ).links)
          add(link.target, "http-link-alternate", row.url, null);
      }
      if (this.store.audit(id).state === "running") {
        const missing = Number(
          this.store.db
            .prepare(
              "SELECT COUNT(*) AS n FROM urls WHERE audit_id=? AND state IN ('failed','blocked')",
            )
            .get(id)?.n,
        );
        const incompleteRenders = Number(
          this.store.db
            .prepare(
              `SELECT COUNT(*) AS n FROM observations WHERE audit_id=?
            AND json_type(data,'$.facts')='object' AND json_extract(data,'$.response.status')=200
            AND COALESCE(json_extract(data,'$.render.status'),'not-requested')!='observed'
            AND (?='all' OR json_type(data,'$.render')='object')`,
            )
            .get(id, config.render)?.n,
        );
        const incomplete =
          this.store.next(id) ||
          discoveryLimited ||
          missing > 0 ||
          !sitemapComplete ||
          incompleteRenders > 0;
        this.store.state(
          id,
          incomplete ? "partial" : "analyzing",
          discoveryLimited
            ? "discovery-budget"
            : missing > 0
              ? "collection-incomplete"
              : !sitemapComplete
                ? "sitemap-incomplete"
                : incompleteRenders > 0
                  ? "rendering-incomplete"
                  : null,
        );
      }
    } catch (error) {
      if (
        !["paused", "cancelled", "partial"].includes(this.store.audit(id).state)
      )
        this.store.state(id, "error", errorCode(error));
    } finally {
      this.store.account(id, transport.requests, transport.bytes);
      try {
        let results;
        try {
          results = analyze({
            config,
            observations: this.store.analysisObservations(id),
            sitemapUrls,
            inventoryUrls: new Set(config.inventory),
          });
        } catch (error) {
          this.store.state(id, "partial", errorCode(error));
          this.store.event(id, "analysis-unavailable", {
            reason: errorCode(error),
          });
          return;
        }
        if (!sitemapComplete)
          for (const r of results.filter(
            (r) =>
              r.ruleId === "sitemap-intent" && r.outcome !== "not-applicable",
          )) {
            r.outcome = "not-tested";
            r.reason =
              "A configured or discovered sitemap could not be fully checked.";
          }
        for (const row of this.store
          .pages(id, 0, 200)
          .filter((p) => p.state === "blocked" || p.state === "excluded")) {
          // Exclusions are visible coverage, not phantom successful page checks.
          this.store.event(id, "exclusion", {
            url: row.url,
            reason: row.reason,
          });
        }
        try {
          this.store.saveAnalysis(id, RULESET, results);
          this.store.finishAnalysis(id);
        } catch (error) {
          this.store.state(id, "partial", errorCode(error));
          this.store.event(id, "analysis-unavailable", {
            reason: errorCode(error),
          });
        }
      } finally {
        this.controllers.delete(id);
        clearInterval(controls);
        this.store.release(id);
      }
    }
  }
  /** Re-evaluate immutable collected evidence into a new analysis, without fetching. */
  reevaluate(id: string): string {
    const audit = this.store.audit(id);
    const sitemapUrls = new Set(
      this.store.db
        .prepare(
          "SELECT url FROM discoveries WHERE audit_id=? AND source='sitemap'",
        )
        .all(id)
        .map((row) => String(row.url)),
    );
    const results = analyze({
      config: audit.config,
      observations: this.store.analysisObservations(id),
      sitemapUrls,
      inventoryUrls: new Set(audit.config.inventory),
    });
    const missing = this.store.hasEvent(id, "sitemap-unavailable");
    if (missing)
      for (const result of results.filter(
        (r) => r.ruleId === "sitemap-intent" && r.outcome !== "not-applicable",
      )) {
        result.outcome = "not-tested";
        result.reason = "A sitemap could not be fully checked.";
      }
    return this.store.saveAnalysis(id, RULESET, results);
  }
}

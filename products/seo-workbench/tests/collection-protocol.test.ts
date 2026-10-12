import test from "node:test";
import assert from "node:assert/strict";
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Crawler } from "../src/crawler.ts";
import { Store } from "../src/store.ts";
import { parseConfig, fetchKey, scopeReason } from "../src/domain.ts";
import { NetworkPolicy } from "../src/network.ts";
import { Workbench } from "../src/app.ts";

async function collection(
  handler: (req: IncomingMessage, res: ServerResponse) => void,
  settings: Record<string, unknown> = {},
) {
  const times: number[] = [];
  const server = createServer((req, res) => {
    if (req.url === "/robots.txt") {
      res.writeHead(404);
      res.end();
      return;
    }
    times.push(Date.now());
    handler(req, res);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  const directory = mkdtempSync(join(tmpdir(), "seo-workbench-protocol-")),
    store = new Store(directory);
  const config = parseConfig({
    origins: [origin],
    seeds: [origin + "/start"],
    render: "none",
    retries: 1,
    delayMs: 0,
    ...settings,
  });
  const id = store.createAudit(store.createProject(config));
  const crawler = new Crawler(
    store,
    new NetworkPolicy({ localOrigins: [origin] }),
  );
  return {
    directory,
    origin,
    times,
    store,
    crawler,
    id,
    async close() {
      store.close();
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
      rmSync(directory, { recursive: true, force: true });
    },
  };
}

const page = (res: ServerResponse) => {
  res.writeHead(200, { "content-type": "text/html" });
  res.end(
    "<title>Synthetic guide</title><main>Original synthetic guide.</main>",
  );
};

test("a failed retry never reuses an earlier response as the final result", async () => {
  let requests = 0;
  const fixture = await collection((_req, res) => {
    if (++requests === 1) {
      res.writeHead(503);
      res.end("Synthetic unavailable response");
    } else res.destroy();
  });
  try {
    await fixture.crawler.run(fixture.id);
    const observation = fixture.store.observation(
      fixture.id,
      fixture.origin + "/start",
    )!;
    assert.equal(requests, 2);
    assert.equal(observation.attempts.length, 1);
    assert.equal(observation.attempts[0].status, 503);
    assert.equal(observation.response, null);
    assert.equal(observation.error, "operation-failed");
    assert.equal(fixture.store.audit(fixture.id).state, "partial");
    assert.equal(fixture.store.pages(fixture.id)[0].state, "failed");
    assert.equal(fixture.store.audit(fixture.id).requests, 3);
    const failed = (
      fixture.store.events(fixture.id) as {
        kind: string;
        detail: Record<string, unknown>;
      }[]
    ).filter((event) => event.kind === "request-attempt-failed");
    assert.equal(failed.length, 1);
    assert.equal(failed[0].detail.chargedRequest, true);
    assert.equal(failed[0].detail.requestNumber, 3);
  } finally {
    await fixture.close();
  }
});

test("server retry seconds and HTTP dates delay the next request", async () => {
  for (const format of ["seconds", "date", "obsolete-date", "asctime"]) {
    let requests = 0,
      deadline = 0;
    const fixture = await collection((_req, res) => {
      if (++requests > 1) {
        page(res);
        return;
      }
      const future = new Date(Date.now() + 3000),
        standard = future.toUTCString();
      let value = "2";
      if (format === "date") value = standard;
      if (format === "obsolete-date") {
        const weekdays = [
          "Sunday",
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ];
        value = standard
          .replace(/^[A-Za-z]{3},/, weekdays[future.getUTCDay()] + ",")
          .replace(/(\d{2}) ([A-Za-z]{3}) \d{2}(\d{2})/, "$1-$2-$3");
      }
      if (format === "asctime")
        value = `${standard.slice(0, 3)} ${standard.slice(8, 11)} ${String(future.getUTCDate()).padStart(2, " ")} ${standard.slice(17, 25)} ${future.getUTCFullYear()}`;
      deadline = format === "seconds" ? Date.now() + 2000 : Date.parse(value);
      res.writeHead(503, { "retry-after": value });
      res.end("Synthetic unavailable response");
    });
    try {
      await fixture.crawler.run(fixture.id);
      assert.equal(requests, 2);
      assert.ok(
        fixture.times[1] >= deadline - 25,
        format + " retried before its deadline",
      );
      assert.equal(
        fixture.store.observation(fixture.id, fixture.origin + "/start")
          ?.response?.status,
        200,
      );
      assert.equal(fixture.store.audit(fixture.id).state, "complete");
      assert.ok(fixture.store.hasEvent(fixture.id, "request-follow-up-wait"));
    } finally {
      await fixture.close();
    }
  }
});

test("invalid retry headers use the existing backoff; unfinishable waits stop without another request", async () => {
  for (const header of [
    "invalid",
    "1.5",
    "9999999999999999999999999999999999999999",
  ]) {
    let requests = 0;
    const fixture = await collection(
      (_req, res) => {
        if (++requests > 1) {
          page(res);
          return;
        }
        res.writeHead(503, { "retry-after": header });
        res.end("Synthetic unavailable response");
      },
      { maxSeconds: 10 },
    );
    try {
      await fixture.crawler.run(fixture.id);
      if (header.startsWith("999")) {
        assert.equal(requests, 1);
        assert.equal(
          fixture.store.audit(fixture.id).reason,
          "retry-delay-budget",
        );
        assert.equal(fixture.store.audit(fixture.id).state, "partial");
        assert.equal(
          fixture.store.observation(fixture.id, fixture.origin + "/start")
            ?.error,
          "retry-delay-budget",
        );
        const app = new Workbench(fixture.store);
        (app as any).launch = () => {
          throw new Error("synthetic-unexpected-worker");
        };
        assert.throws(
          () => app.control(fixture.id, "resume"),
          /audit-limit-reached/,
        );
        assert.equal(fixture.store.audit(fixture.id).state, "partial");
      } else {
        assert.equal(requests, 2);
        assert.ok(fixture.times[1] - fixture.times[0] >= 900);
        assert.equal(fixture.store.audit(fixture.id).state, "complete");
      }
    } finally {
      await fixture.close();
    }
  }
});

test("pause interrupts a long retry wait and leaves the unfinished page recoverable", async () => {
  let requests = 0;
  const fixture = await collection((_req, res) => {
    if (++requests > 1) {
      page(res);
      return;
    }
    res.writeHead(503, { "retry-after": "3" });
    res.end("Synthetic unavailable response");
  });
  try {
    const running = fixture.crawler.run(fixture.id);
    const deadline = Date.now() + 5000;
    while (
      !fixture.store.hasEvent(fixture.id, "request-follow-up-wait") &&
      Date.now() < deadline
    )
      await new Promise((resolve) => setTimeout(resolve, 10));
    assert.ok(fixture.store.hasEvent(fixture.id, "request-follow-up-wait"));
    const pausedAt = Date.now();
    fixture.crawler.pause(fixture.id);
    await running;
    assert.ok(Date.now() - pausedAt < 2000);
    assert.equal(requests, 1);
    assert.equal(fixture.store.audit(fixture.id).state, "paused");
    assert.equal(fixture.store.observations(fixture.id).length, 0);
    assert.equal(fixture.store.pages(fixture.id)[0].state, "fetching");
    assert.ok(fixture.store.hasEvent(fixture.id, "page-attempt-interrupted"));
    fixture.store.state(fixture.id, "queued");
    const reopened = new Store(fixture.directory);
    try {
      await new Crawler(
        reopened,
        new NetworkPolicy({ localOrigins: [fixture.origin] }),
      ).run(fixture.id);
    } finally {
      reopened.close();
    }
    assert.equal(requests, 2);
    assert.ok(fixture.times[1] - fixture.times[0] >= 2900);
    assert.equal(fixture.store.observations(fixture.id).length, 1);
    assert.equal(fixture.store.audit(fixture.id).state, "complete");
    assert.equal(fixture.store.coverage(fixture.id).knownInventory, 1);
  } finally {
    await fixture.close();
  }
});

test("redirects honour server waits and reject loops or scope escapes before waiting", async () => {
  for (const kind of ["valid", "loop", "scope"]) {
    let requests = 0;
    const fixture = await collection((req, res) => {
      requests++;
      if (req.url === "/target") {
        page(res);
        return;
      }
      res.writeHead(302, {
        location:
          kind === "valid"
            ? "/target"
            : kind === "loop"
              ? "/start"
              : "https://outside.example/",
        "retry-after": kind === "valid" ? "1" : "999999",
      });
      res.end();
    });
    try {
      await fixture.crawler.run(fixture.id);
      const observation = fixture.store.observation(
        fixture.id,
        fixture.origin + "/start",
      )!;
      if (kind === "valid") {
        assert.equal(observation.finalUrl, fixture.origin + "/target");
        assert.equal(observation.response?.status, 200);
        assert.ok(fixture.times[1] - fixture.times[0] >= 900);
      } else {
        assert.equal(requests, 1);
        assert.equal(
          observation.error,
          kind === "loop" ? "redirect-loop" : "redirect-scope-blocked",
        );
        assert.equal(
          fixture.store.hasEvent(fixture.id, "request-follow-up-wait"),
          false,
        );
      }
    } finally {
      await fixture.close();
    }
  }
});

test("access denial and rate limiting stop without retries or bypassing server instructions", async () => {
  for (const status of [403, 429]) {
    let requests = 0;
    const fixture = await collection(
      (_req, res) => {
        requests++;
        res.writeHead(status, { "retry-after": "1" });
        res.end("Synthetic access refusal");
      },
      { retries: 3 },
    );
    try {
      await fixture.crawler.run(fixture.id);
      assert.equal(requests, 1);
      assert.equal(fixture.store.audit(fixture.id).state, "partial");
      assert.equal(
        fixture.store.audit(fixture.id).reason,
        status === 403 ? "access-denied" : "rate-limited",
      );
      assert.equal(
        fixture.store.observation(fixture.id, fixture.origin + "/start")
          ?.response?.status,
        status,
      );
    } finally {
      await fixture.close();
    }
  }
});

test("URL identity preserves IDNs, escapes, path case and repeated query order without opening sensitive routes", () => {
  assert.equal(
    fetchKey("https://bücher.example/Caf%C3%A9?tag=a&tag=b#content"),
    "https://xn--bcher-kva.example/Caf%C3%A9?tag=a&tag=b",
  );
  assert.notEqual(
    fetchKey("https://www.example.com/Guide"),
    fetchKey("https://www.example.com/guide"),
  );
  assert.notEqual(
    fetchKey("https://www.example.com/a"),
    fetchKey("https://www.example.com/a/"),
  );
  assert.notEqual(
    fetchKey("https://www.example.com/?a=1&b=2"),
    fetchKey("https://www.example.com/?b=2&a=1"),
  );
  const config = parseConfig({
    origins: ["https://www.example.com"],
    seeds: ["https://www.example.com/"],
  });
  for (const path of [
    "/%63heckout",
    "/a/%2Fadmin",
    "/?%74oken=fictional",
    "/broken%ZZ",
  ])
    assert.ok(scopeReason(config, fetchKey(path, config.origins[0])));
  assert.equal(
    scopeReason(
      config,
      "https://www.example.com/calendar/2027/01?colour=blue&colour=green",
    ),
    null,
  );
});

test("an exhausted request allowance stops before a server retry wait", async () => {
  let requests = 0;
  const fixture = await collection(
    (_req, res) => {
      requests++;
      res.writeHead(503, { "retry-after": "30" });
      res.end("Synthetic unavailable response");
    },
    { maxRequests: 2 },
  );
  try {
    await fixture.crawler.run(fixture.id);
    assert.equal(requests, 1);
    assert.equal(fixture.store.audit(fixture.id).reason, "request-budget");
    assert.equal(
      fixture.store.hasEvent(fixture.id, "request-follow-up-wait"),
      false,
    );
  } finally {
    await fixture.close();
  }
});

test("two-digit HTTP years use the protocol's rolling future window", async () => {
  let requests = 0;
  const date = new Date();
  date.setUTCFullYear(date.getUTCFullYear() + 43);
  const weekday = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ][date.getUTCDay()];
  const value = date
    .toUTCString()
    .replace(/^[A-Za-z]{3},/, weekday + ",")
    .replace(/(\d{2}) ([A-Za-z]{3}) \d{2}(\d{2})/, "$1-$2-$3");
  const fixture = await collection(
    (_req, res) => {
      if (++requests > 1) {
        page(res);
        return;
      }
      res.writeHead(503, { "retry-after": value });
      res.end("Synthetic unavailable response");
    },
    { maxSeconds: 10 },
  );
  try {
    await fixture.crawler.run(fixture.id);
    assert.equal(requests, 1);
    assert.equal(fixture.store.audit(fixture.id).reason, "retry-delay-budget");
  } finally {
    await fixture.close();
  }
});

test("actual discovery respects document bases, escaped text and repeated query order", async () => {
  const requested: string[] = [];
  const fixture = await collection((req, res) => {
    requested.push(req.url!);
    if (req.url === "/start") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(
        '<html><head><base href="/docs/"><title>Synthetic directory</title></head><main><a href="Caf%C3%A9?tag=a&amp;tag=b#one">First guide</a><a href="Caf%C3%A9?tag=b&amp;tag=a">Second guide</a><a href="Guide/">Upper guide</a><a href="guide/">Lower guide</a><a href="/%63heckout">Excluded route</a><a href="/?%74oken=fictional">Excluded query</a></main></html>',
      );
    } else page(res);
  });
  try {
    await fixture.crawler.run(fixture.id);
    for (const path of [
      "/docs/Caf%C3%A9?tag=a&tag=b",
      "/docs/Caf%C3%A9?tag=b&tag=a",
      "/docs/Guide/",
      "/docs/guide/",
    ])
      assert.ok(requested.includes(path), path);
    assert.equal(requested.length, 5);
    assert.ok(
      fixture.store.pages(fixture.id).filter((row) => row.state === "excluded")
        .length >= 2,
    );
    assert.equal(fixture.store.audit(fixture.id).state, "complete");
  } finally {
    await fixture.close();
  }
});

test("open-ended calendar and facet links stop at a visible page allowance", async () => {
  const fixture = await collection(
    (req, res) => {
      const parsed = new URL(req.url!, "http://fixture.test");
      const n = Number(parsed.searchParams.get("month") ?? 0);
      res.writeHead(200, { "content-type": "text/html" });
      res.end(
        `<title>Synthetic calendar</title><main><a href="/calendar?month=${n + 1}">Next month</a><a href="/calendar?month=${n + 1}&amp;colour=blue&amp;colour=green">Filter month</a></main>`,
      );
    },
    { maxPages: 5 },
  );
  try {
    await fixture.crawler.run(fixture.id);
    assert.equal(fixture.store.observations(fixture.id).length, 5);
    assert.equal(fixture.store.audit(fixture.id).state, "partial");
    assert.equal(fixture.store.audit(fixture.id).reason, "page-budget");
    assert.ok(fixture.store.next(fixture.id));
    assert.equal(
      fixture.store.coverage(fixture.id).completeDiscoveredQueue,
      false,
    );
  } finally {
    await fixture.close();
  }
});

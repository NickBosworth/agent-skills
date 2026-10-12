import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { gzipSync, deflateSync, brotliCompressSync } from "node:zlib";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { decompress } from "../src/compression.ts";
import { NetworkPolicy, Transport } from "../src/network.ts";
import { parseConfig } from "../src/domain.ts";
import { Crawler } from "../src/crawler.ts";
import { Store } from "../src/store.ts";
import { renderBrowser } from "../src/browser-runner.ts";

test("compression decodes supported formats, stacked encodings and exact output bounds", async () => {
  const raw = Buffer.from("A synthetic café guide. ".repeat(100));
  const signal = new AbortController().signal;
  for (const [encoding, wire] of [
    ["identity", raw],
    ["gzip", gzipSync(raw)],
    [" X-GZIP ", gzipSync(raw)],
    ["deflate", deflateSync(raw)],
    ["br", brotliCompressSync(raw)],
    ["gzip, br", brotliCompressSync(gzipSync(raw))],
  ] as const) {
    assert.deepEqual(await decompress(wire, encoding, raw.length, signal), raw);
    await assert.rejects(
      decompress(wire, encoding, raw.length - 1, signal),
      /response-budget/,
    );
  }
  for (const encoding of ["", "zstd", "gzip, unknown", "gzip,gzip,gzip,gzip"])
    await assert.rejects(
      decompress(raw, encoding, raw.length, signal),
      /unsupported-content-encoding/,
    );
});

test("compression rejects damaged data and stops on cancellation or deadline", async () => {
  const signal = new AbortController().signal;
  const wire = gzipSync(Buffer.from("Synthetic content"));
  for (const data of [
    Buffer.from("invalid"),
    wire.subarray(0, wire.length - 4),
  ])
    await assert.rejects(
      decompress(data, "gzip", 1000, signal),
      /response-decompression-failed/,
    );
  const controller = new AbortController();
  controller.abort(new Error("synthetic-cancelled"));
  await assert.rejects(
    decompress(wire, "gzip", 1000, controller.signal),
    /synthetic-cancelled/,
  );
  const large = gzipSync(Buffer.alloc(10_000_000, 65));
  const pending = decompress(large, "gzip", 10_000_000, AbortSignal.timeout(1));
  await assert.rejects(pending, { name: "TimeoutError" });
});

async function site() {
  let origin = "";
  const html = Buffer.from(
    '<html><title>Compressed guide</title><main>Original synthetic guide.</main><script src="/script.js"></script></html>',
  );
  const server = createServer((req, res) => {
    const path = req.url!;
    if (path === "/robots.txt") {
      res.writeHead(404);
      res.end();
      return;
    }
    if (path === "/empty") {
      res.writeHead(204, { "content-encoding": "gzip" });
      res.end();
      return;
    }
    if (path === "/unknown") {
      res.writeHead(200, { "content-encoding": "unknown" });
      res.end("synthetic");
      return;
    }
    if (path === "/damaged") {
      res.writeHead(200, { "content-encoding": "gzip" });
      res.end("synthetic");
      return;
    }
    if (path === "/wire-oversize") {
      res.end(Buffer.alloc(12000, 65));
      return;
    }
    let body: Buffer;
    if (path === "/map.xml.gz") {
      res.setHeader("content-type", "application/gzip");
      body = gzipSync(
        Buffer.from(
          `<sitemapindex><sitemap><loc>${origin}/child.xml.gz</loc></sitemap></sitemapindex>`,
        ),
      );
    } else if (path === "/child.xml.gz") {
      res.setHeader("content-type", "application/gzip");
      res.setHeader("content-encoding", "gzip");
      body = gzipSync(
        gzipSync(
          Buffer.from(`<urlset><url><loc>${origin}/gzip</loc></url></urlset>`),
        ),
      );
    } else if (path === "/bad.xml.gz") {
      res.setHeader("content-type", "application/gzip");
      body = Buffer.from([0x1f, 0x8b, 0, 0]);
    } else if (path === "/large.xml.gz") {
      res.setHeader("content-type", "application/gzip");
      body = gzipSync(Buffer.from("x".repeat(2000)));
    } else if (path === "/script.js") {
      res.setHeader("content-type", "application/javascript; charset=utf-8");
      res.setHeader("content-encoding", "br");
      body = brotliCompressSync(
        Buffer.from(
          "document.title='Rendered compressed guide';document.documentElement.dataset.ready='yes';",
        ),
      );
    } else {
      const raw =
        path === "/oversize"
          ? Buffer.alloc(2000, 65)
          : path === "/charset"
            ? Buffer.from([0x63, 0x61, 0x66, 0xe9])
            : html;
      res.setHeader(
        "content-type",
        path === "/charset"
          ? "text/plain; charset=windows-1252"
          : "text/html; charset=utf-8",
      );
      const encoding =
        path === "/br"
          ? "br"
          : path === "/deflate"
            ? "deflate"
            : path === "/identity"
              ? "identity"
              : "gzip";
      res.setHeader("content-encoding", encoding);
      body =
        encoding === "br"
          ? brotliCompressSync(raw)
          : encoding === "deflate"
            ? deflateSync(raw)
            : encoding === "identity"
              ? raw
              : gzipSync(raw);
    }
    res.end(body);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  const config = parseConfig({
    origins: [origin],
    seeds: [origin + "/identity"],
    delayMs: 0,
    render: "none",
    retries: 0,
  });
  const policy = new NetworkPolicy({ localOrigins: [origin] });
  return {
    origin,
    html,
    config,
    policy,
    close: () =>
      new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
  };
}

test("HTTP preserves compressed wire evidence and decoded bytes, with wire accounting and charset decoding", async () => {
  const fixture = await site();
  try {
    const transport = new Transport(fixture.config, fixture.policy);
    let total = 0;
    for (const path of ["/gzip", "/br", "/deflate", "/identity"]) {
      const response = await transport.request(fixture.origin + path);
      assert.equal(response.body, fixture.html.toString());
      assert.deepEqual(
        Buffer.from(response.bodyBase64!, "base64"),
        fixture.html,
      );
      if (path !== "/identity") {
        assert.equal(response.decodedBytes, fixture.html.length);
        assert.equal(
          Buffer.from(response.encodedBodyBase64!, "base64").length,
          response.bytes,
        );
        assert.notEqual(response.encodedBodyBase64, response.bodyBase64);
      } else assert.equal(response.encodedBodyBase64, undefined);
      total += response.bytes;
    }
    assert.equal(transport.bytes, total);
    assert.equal(
      (await transport.request(fixture.origin + "/charset")).body,
      "café",
    );
    const bounded = new Transport(
      parseConfig({ ...fixture.config, maxBytes: 1024 }),
      fixture.policy,
    );
    await assert.rejects(
      bounded.request(fixture.origin + "/oversize"),
      /response-budget/,
    );
    assert.ok(bounded.bytes < 1024);
    await assert.rejects(
      bounded.request(fixture.origin + "/wire-oversize"),
      /response-budget/,
    );
    const downloaded = new Transport(
      parseConfig({
        ...fixture.config,
        maxBytes: 20000,
        maxDownloadBytes: 10000,
      }),
      fixture.policy,
    );
    await assert.rejects(
      downloaded.request(fixture.origin + "/wire-oversize"),
      /download-budget/,
    );
    assert.equal(downloaded.bytes, 12000);
    assert.equal(
      (await transport.request(fixture.origin + "/empty")).status,
      204,
    );
    await assert.rejects(
      transport.request(fixture.origin + "/unknown"),
      /unsupported-content-encoding/,
    );
    await assert.rejects(
      transport.request(fixture.origin + "/damaged"),
      /response-decompression-failed/,
    );
  } finally {
    await fixture.close();
  }
});

test("gzip sitemap indexes discover pages through file and HTTP layers, and saved evidence survives reopen", async () => {
  const fixture = await site(),
    directory = mkdtempSync(join(tmpdir(), "seo-workbench-compression-"));
  let store = new Store(directory);
  try {
    const config = parseConfig({
      ...fixture.config,
      sitemaps: [fixture.origin + "/map.xml.gz"],
    });
    const id = store.createAudit(store.createProject(config));
    await new Crawler(store, fixture.policy).run(id);
    assert.equal(store.audit(id).state, "complete");
    let observation = store.observation(id, fixture.origin + "/gzip")!;
    assert.equal(observation.facts?.title, "Compressed guide");
    assert.equal(
      observation.attempts.at(-1)?.encodedBodyBase64,
      observation.response?.encodedBodyBase64,
    );
    assert.ok(observation.response?.encodedBodyBase64);
    const projected = store
      .analysisObservations(id)
      .find((row) => row.url === observation.url)!;
    assert.equal(projected.response?.encodedBodyBase64, undefined);
    assert.equal(projected.attempts.at(-1)?.encodedBodyBase64, undefined);
    store.close();
    store = new Store(directory);
    observation = store.observation(id, fixture.origin + "/gzip")!;
    assert.equal(
      observation.attempts.at(-1)?.encodedBodyBase64,
      observation.response?.encodedBodyBase64,
    );
    assert.deepEqual(
      Buffer.from(observation.response!.bodyBase64!, "base64"),
      fixture.html,
    );
    const client = new Client({
      name: "synthetic-compression-client",
      version: "0.1.0",
    });
    try {
      await client.connect(
        new StdioClientTransport({
          command: process.execPath,
          args: [
            fileURLToPath(new URL("../src/cli.ts", import.meta.url)),
            "mcp",
            "--data",
            directory,
          ],
          stderr: "pipe",
        }),
        { mode: "auto" },
      );
      const tool: any = await client.callTool({
        name: "page_evidence",
        arguments: { auditId: id, url: observation.url },
      });
      assert.notEqual(tool.isError, true);
      const bounded = JSON.parse(tool.content[0].text);
      assert.equal(bounded.response.encodedBodyBase64, undefined);
      assert.equal(bounded.response.bodyBase64, undefined);
      assert.ok(
        bounded.attempts.every(
          (attempt: any) => attempt.encodedBodyBase64 === undefined,
        ),
      );
      const resource = await client.readResource({
        uri: `evidence://audit/${id}/page/${encodeURIComponent(observation.url)}`,
      });
      assert.equal(
        JSON.parse((resource.contents[0] as any).text).response
          .encodedBodyBase64,
        observation.response!.encodedBodyBase64,
      );
    } finally {
      await client.close();
    }
  } finally {
    store.close();
    rmSync(directory, { recursive: true, force: true });
    await fixture.close();
  }
});

test("damaged and oversized gzip sitemap files leave explicit partial coverage", async () => {
  const fixture = await site();
  try {
    for (const path of ["/bad.xml.gz", "/large.xml.gz"]) {
      const directory = mkdtempSync(
          join(tmpdir(), "seo-workbench-compression-"),
        ),
        store = new Store(directory);
      try {
        const config = parseConfig({
          ...fixture.config,
          maxBytes: 1024,
          sitemaps: [fixture.origin + path],
        });
        const id = store.createAudit(store.createProject(config));
        await new Crawler(store, fixture.policy).run(id);
        assert.equal(store.audit(id).state, "partial");
        assert.equal(store.audit(id).reason, "sitemap-incomplete");
        assert.ok(store.hasEvent(id, "sitemap-unavailable"));
      } finally {
        store.close();
        rmSync(directory, { recursive: true, force: true });
      }
    }
  } finally {
    await fixture.close();
  }
});

test(
  "native Chromium renders compressed HTML and a compressed script without double decoding",
  { skip: process.env.WORKBENCH_BROWSER_TESTS !== "1" },
  async () => {
    const fixture = await site();
    try {
      const config = parseConfig({
        ...fixture.config,
        render: "all",
        renderReadySelector: "html[data-ready]",
        renderTimeoutMs: 5000,
      });
      const transport = new Transport(config, fixture.policy);
      const response = await transport.request(fixture.origin + "/gzip");
      const result = await renderBrowser(response, config, transport);
      assert.equal(result?.status, "observed");
      assert.equal(result?.facts?.title, "Rendered compressed guide");
      assert.ok(transport.requests >= 2);
    } finally {
      await fixture.close();
    }
  },
);

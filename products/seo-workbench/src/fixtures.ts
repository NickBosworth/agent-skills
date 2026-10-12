/** Original synthetic site. No third-party captures or private exports are required. */
import { createServer } from "node:http";
import { parseConfig } from "./domain.ts";
export async function fixtureSite(
  options: {
    fixed?: boolean;
    pages?: number;
    slowMs?: number;
    routes?: Record<
      string,
      {
        status: number;
        headers?: Record<string, string | string[]>;
        body: string;
      }
    >;
  } = {},
) {
  let fixed = options.fixed ?? false;
  const size = options.pages ?? 0;
  let origin = "";
  const server = createServer(async (req, res) => {
    if (options.slowMs)
      await new Promise((resolve) => setTimeout(resolve, options.slowMs));
    const path = new URL(req.url ?? "/", "http://fixture.test").pathname;
    if (res.destroyed) return;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    const override = options.routes?.[path];
    if (override) {
      res.writeHead(override.status, override.headers ?? {});
      res.end(override.body);
      return;
    }
    if (path === "/robots.txt") {
      res.setHeader("Content-Type", "text/plain");
      res.end(
        "User-agent: *\nDisallow: /private\nSitemap: " +
          origin +
          "/sitemap.xml\n",
      );
      return;
    }
    if (path === "/sitemap.xml") {
      res.setHeader("Content-Type", "application/xml");
      res.end(
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
          (size
            ? Array.from(
                { length: size },
                (_, i) =>
                  "<url><loc>" +
                  origin +
                  (i === 0 ? "/" : "/p/" + i) +
                  "</loc></url>",
              ).join("")
            : "<url><loc>" +
              origin +
              "/product</loc></url><url><loc>" +
              origin +
              "/inventory-only</loc></url>") +
          "</urlset>",
      );
      return;
    }
    if (path === "/redirect") {
      res.writeHead(301, { Location: "/product" });
      res.end();
      return;
    }
    if (path === "/loop") {
      res.writeHead(302, { Location: "/loop" });
      res.end();
      return;
    }
    if (path === "/scope-escape") {
      res.writeHead(302, { Location: "http://169.254.169.254/" });
      res.end();
      return;
    }
    if (path === "/oversize") {
      res.end("x".repeat(200000));
      return;
    }
    if (path === "/rate-limit") {
      res.writeHead(429, { "Retry-After": "60" });
      res.end();
      return;
    }
    if (path === "/script.js") {
      res.setHeader("Content-Type", "application/javascript");
      res.end(
        `document.querySelector('main').textContent='Useful client guide';document.title='Client guide';document.querySelector('meta[name=robots]').remove();document.documentElement.dataset.ready='yes';`,
      );
      return;
    }
    let title = "Synthetic workshop",
      main = "",
      robots = "",
      extra = "";
    if (size) {
      const n = path === "/" ? 0 : Number(path.slice(3));
      if (!Number.isInteger(n) || n < 0 || n >= size) {
        res.writeHead(404);
        res.end("not found");
        return;
      }
      title = "Synthetic page " + n;
      main = `<h1>Fixture page ${n}</h1><p>Original test topic ${n} evidence inventory.</p>${n + 1 < size ? `<a href="/p/${n + 1}">Next fixture</a>` : ""}`;
    } else if (path === "/") {
      main =
        '<h1>Synthetic Workshop</h1><p>Demonstration content for evidence and verification.</p><nav><a href="/product">Product</a><a href="/guide">Guide</a><a href="/client">Client guide</a><a href="/account">Account</a><a href="/private">Private</a><a href="/redirect">Old product</a></nav>';
    } else if (path === "/product") {
      title = fixed ? "Workshop lamp" : "";
      robots = fixed ? "" : '<meta name="robots" content="noindex">';
      main =
        '<h1>Workshop lamp</h1><p>A synthetic lamp for testing an original product description.</p><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgAAIAAAUAAXpeqz8AAAAASUVORK5CYII=" alt=""><a href="' +
        (fixed ? "/guide" : "/missing") +
        '">Assembly guide</a>';
      extra =
        '<link rel="canonical" href="' +
        origin +
        '/product"><script type="application/ld+json">' +
        (fixed
          ? ' {"@context":"https://schema.org","@type":"Product","name":"Workshop lamp"}'
          : "{broken") +
        "</script>";
    } else if (path === "/guide") {
      title = "Assembly guide";
      main =
        '<h1>Assembly guide</h1><p>Disconnect the synthetic lamp before assembling the base.</p><a href="/product">Lamp details</a>';
    } else if (path === "/inventory-only") {
      title = "Inventory guide";
      main =
        "<h1>Inventory guide</h1><p>This synthetic inventory page has no observed hyperlink support.</p>";
    } else if (path === "/client") {
      title = "Loading guide";
      robots = '<meta name="robots" content="noindex">';
      main = "<h1>Client guide</h1><p>Loading</p>";
      extra = '<script src="/script.js" defer></script>';
    } else if (path === "/account") {
      title = "Account";
      robots = '<meta name="robots" content="noindex">';
      main = "<h1>Account utility</h1>";
    } else {
      res.statusCode = 404;
      title = "Not found";
      main = "<h1>Not found</h1><p>This fixture route does not exist.</p>";
    }
    res.end(
      `<!doctype html><html lang="en"><head><title>${title}</title>${robots}${extra}</head><body><main>${main}</main></body></html>`,
    );
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  return {
    origin,
    server,
    setFixed: (value: boolean) => {
      fixed = value;
    },
    close: () =>
      new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
    config: parseConfig({
      name: "Synthetic workshop",
      environment: "synthetic",
      profile: "ecommerce",
      seeds: [origin + "/"],
      origins: [origin],
      inventory: size ? [] : [origin + "/inventory-only"],
      delayMs: 0,
      maxPages: size || 100,
      maxDepth: size ? 50 : 8,
      maxDiscoveries: size ? size * 2 : 5000,
      maxRequests: size ? size * 3 : 1000,
      maxSeconds: 3600,
      maxStorageBytes: 500000000,
      contracts: size
        ? []
        : [
            {
              pathPrefix: "/product",
              indexability: "indexable",
              canonical: origin + "/product",
              title: "Workshop lamp",
              criticalText: ["synthetic lamp"],
              sitemap: true,
              template: "product",
              importance: "important",
            },
            {
              pathPrefix: "/account",
              indexability: "excluded",
              template: "utility",
            },
            {
              pathPrefix: "/guide",
              indexability: "indexable",
              template: "guide",
            },
          ],
    }),
  };
}

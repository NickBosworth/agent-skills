import test from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { fixtureSite } from "../src/fixtures.ts";
import { Store } from "../src/store.ts";
import { Workbench } from "../src/app.ts";
import { NetworkPolicy } from "../src/network.ts";
import { serve } from "../src/server.ts";
import { exportReport } from "../src/reports.ts";

test(
  "a thousand-page audit keeps paging, filtering, drilldown, mobile and offline print usable",
  {
    skip: process.env.WORKBENCH_BROWSER_TESTS !== "1",
  },
  async () => {
    const fixture = await fixtureSite({ pages: 1001 });
    const directory = mkdtempSync(join(tmpdir(), "seo-workbench-large-ui-"));
    const store = new Store(directory);
    const app = new Workbench(
      store,
      new NetworkPolicy({ localOrigins: [fixture.origin] }),
    );
    let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
    let server: Awaited<ReturnType<typeof serve>> | undefined;
    try {
      const { auditId } = await app.run(fixture.config);
      assert.equal(store.audit(auditId).state, "complete");
      assert.equal(store.count(auditId), 1001);
      server = await serve(app, 0);
      browser = await chromium.launch({
        headless: true,
        chromiumSandbox: true,
      });
      const context = await browser.newContext({
        viewport: { width: 1440, height: 1000 },
      });
      const page = await context.newPage();
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(server.origin);
      await page.getByRole("heading", { name: "Audit summary" }).waitFor();
      await page.getByRole("link", { name: "Pages", exact: true }).click();
      await page.getByRole("heading", { name: "Pages found" }).waitFor();
      assert.equal(await page.locator("#page-range").innerText(), "Rows 1–100");
      for (let offset = 100; offset <= 1000; offset += 100) {
        await page.locator("#next").click();
        await page.waitForFunction(
          (first) =>
            document
              .querySelector("#page-range")
              ?.textContent?.startsWith(`Rows ${first}–`),
          offset + 1,
        );
      }
      assert.equal(
        await page.locator("#page-range").innerText(),
        "Rows 1001–1001",
      );
      assert.equal(await page.locator("#next").isDisabled(), true);
      await page.getByLabel("Search page URLs", { exact: true }).fill("/p/999");
      await page.waitForFunction(
        () => document.querySelector("#page-range")?.textContent === "Rows 1–1",
      );
      await page
        .getByRole("button", { name: fixture.origin + "/p/999", exact: true })
        .click();
      await page.getByRole("heading", { name: "Page evidence" }).waitFor();
      await page.setViewportSize({ width: 390, height: 844 });
      await page.getByRole("link", { name: "Overview", exact: true }).click();
      await page.getByRole("heading", { name: "Audit summary" }).waitFor();
      const accessibility = await new AxeBuilder({ page }).analyze();
      assert.equal(accessibility.violations.length, 0);
      assert.deepEqual(errors, []);
      const file = join(directory, "synthetic-report.html");
      writeFileSync(file, exportReport(store, auditId, "html"));
      const offline = await browser.newPage();
      let requests = 0;
      offline.on("request", (request) => {
        if (/^https?:/.test(request.url())) requests++;
      });
      await offline.goto(pathToFileURL(file).href);
      await offline.getByRole("heading", { name: "Pages checked" }).waitFor();
      assert.equal(requests, 0);
      await offline.emulateMedia({ media: "print" });
      assert.equal(await offline.locator(".print-only").isVisible(), true);
      assert.equal(
        await offline.locator(".technical-evidence").isVisible(),
        false,
      );
      assert((await offline.pdf({ format: "A4" })).length > 1000);
    } finally {
      await browser?.close();
      await server?.close();
      store.close();
      await fixture.close();
      rmSync(directory, { recursive: true, force: true });
    }
  },
);

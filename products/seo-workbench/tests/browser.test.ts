import test from "node:test";
import AxeBuilder from "@axe-core/playwright";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fixtureSite } from "../src/fixtures.ts";
import { NetworkPolicy, Transport } from "../src/network.ts";
import { renderBrowser } from "../src/browser-runner.ts";
import { Store } from "../src/store.ts";
import { Workbench } from "../src/app.ts";
import { serve } from "../src/server.ts";
import { parseConfig } from "../src/domain.ts";
import { exportReport } from "../src/reports.ts";

const enabled = process.env.WORKBENCH_BROWSER_TESTS === "1";
test(
  "browser workbench actual project, views, keyboard, mobile and offline report",
  { skip: !enabled },
  async () => {
    const directory = mkdtempSync(join(tmpdir(), "seo-workbench-ui-")),
      store = new Store(directory),
      fixture = await fixtureSite();
    const app = new Workbench(
      store,
      new NetworkPolicy({
        localOrigins: [fixture.origin],
      }),
    );
    const config = parseConfig({ ...fixture.config, render: "auto" }),
      project = store.createProject(config),
      audit = store.createAudit(project);
    await app.crawler.run(audit);
    const server = await serve(app, 0),
      browser = await chromium.launch({
        headless: true,
        chromiumSandbox: true,
      });
    try {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 1000 },
      });
      const page = await context.newPage();
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(server.origin);
      await page.getByRole("heading", { name: "Audit summary" }).waitFor();
      assert.equal(await page.title(), "SEO Workbench");
      assert.ok(
        !/evidence before advice|coverage comes first|take the evidence with you/i.test(
          await page.locator("body").innerText(),
        ),
      );
      await page.getByRole("link", { name: "Actions", exact: true }).click();
      await page
        .getByRole("heading", { name: "Prioritised actions" })
        .waitFor();
      assert.ok(
        await page
          .getByText("Indexing settings match your requirements · product", {
            exact: true,
          })
          .count(),
      );
      const triage = page.locator("article.finding").filter({
        has: page.getByRole("heading", {
          name: "Indexing settings match your requirements · product",
          exact: true,
        }),
      });
      await triage
        .getByText("Review priority, ownership and effort", { exact: true })
        .click();
      await triage
        .getByLabel("Owner priority", { exact: true })
        .selectOption("review");
      await triage
        .getByLabel("Action owner role", { exact: true })
        .fill("frontend maintainer");
      await triage
        .getByLabel("What needs to happen first", { exact: true })
        .fill("Review the synthetic template rollout first");
      await triage
        .getByLabel("Why this priority is appropriate", { exact: true })
        .fill(
          "Owner triage adjusts order during a planned synthetic migration",
        );
      await triage.getByRole("button", { name: "Save action review" }).click();
      await page
        .getByText(
          "Action review saved. The original priority and evidence are still available.",
          { exact: true },
        )
        .waitFor();
      assert.equal(store.imports(project, "action-review").length, 1);
      await page.route("**/api/view?**", async (route) => {
        const url = new URL(route.request().url());
        if (url.searchParams.get("view") === "pages")
          await new Promise((resolve) => setTimeout(resolve, 200));
        await route.continue();
      });
      await page.getByRole("link", { name: "Pages", exact: true }).click();
      await page.getByRole("link", { name: "Links", exact: true }).click();
      await page.getByRole("heading", { name: "Link relationships" }).waitFor();
      await page.waitForTimeout(250);
      assert.equal(
        await page.getByRole("heading", { name: "Pages found" }).count(),
        0,
      );
      await page.unroute("**/api/view?**");
      await page.getByRole("link", { name: "Pages", exact: true }).click();
      await page.getByRole("heading", { name: "Pages found" }).waitFor();
      await page
        .getByRole("button", { name: fixture.origin + "/product", exact: true })
        .click();
      await page.getByRole("heading", { name: "Page evidence" }).waitFor();
      assert.ok(
        await page.getByRole("heading", { name: "Initial response" }).count(),
      );
      await page.getByRole("link", { name: "Content", exact: true }).click();
      await page.getByRole("heading", { name: "Content review" }).waitFor();
      const review = page.locator("article.finding").first();
      await review
        .getByText("Record a content decision", { exact: true })
        .click();
      for (const [label, value] of Object.entries({
        "Owner role": "content editor",
        "What the reader wants to do": "Understand the synthetic guide",
        Audience: "New users",
        "What useful, original information will you add?":
          "Original worked examples",
        "How will you judge success?": "Owner reviews user comprehension",
        "Why is this the right decision?":
          "Improve the original explanation before creating extra pages.",
      }))
        await review.getByLabel(label, { exact: true }).fill(value);
      await review
        .getByRole("button", { name: "Save review decision" })
        .click();
      await page
        .getByText("Content decision saved with its evidence.", { exact: true })
        .waitFor();
      assert.equal(store.imports(project, "content-review").length, 1);
      await page.getByRole("link", { name: "Pages", exact: true }).click();
      await page.getByRole("heading", { name: "Pages found" }).waitFor();
      await page
        .getByLabel("Search page URLs", { exact: true })
        .fill("/product");
      await page
        .getByLabel("Sort pages and outcomes", { exact: true })
        .selectOption("state");
      await page.getByText("Saved views", { exact: true }).click();
      await page
        .getByLabel("View name", { exact: true })
        .fill("Synthetic product pages");
      await page.getByRole("button", { name: "Save current view" }).click();
      await page
        .getByLabel("Search page URLs", { exact: true })
        .fill("/absent");
      await page
        .getByLabel("Saved view", { exact: true })
        .selectOption({ label: "Synthetic product pages" });
      assert.equal(
        await page.getByLabel("Search page URLs", { exact: true }).inputValue(),
        "/product",
      );
      await page
        .getByRole("link", { name: "Export & imports", exact: true })
        .click();
      await page
        .getByRole("heading", { name: "Export reports and import data" })
        .waitFor();
      assert.equal(
        await page
          .getByLabel("Number of repeat runs", { exact: true })
          .inputValue(),
        "5",
      );
      await page
        .getByText(
          "No model allowance is saved for this audit. Opening this view does not contact a model.",
          { exact: true },
        )
        .waitFor();
      assert.deepEqual(store.imports(project, "model-allowance"), []);
      await page
        .getByLabel("Page address", { exact: true })
        .fill(fixture.origin + "/private");
      await page.getByLabel("Number of repeat runs", { exact: true }).fill("1");
      await page
        .getByRole("button", { name: "Run local speed test", exact: true })
        .click();
      await page
        .getByText(
          "The website’s crawl policy does not allow this request. Choose an allowed page; do not bypass the policy.",
          { exact: true },
        )
        .waitFor();
      assert.equal(store.imports(project, "local-lab-series").length, 0);
      assert.equal(
        await page
          .getByRole("button", { name: "Run local speed test", exact: true })
          .isEnabled(),
        true,
      );
      const importPayload = {
        schemaVersion: 1,
        provider: "Lighthouse",
        method: "manual import",
        scope: "url",
        url: fixture.origin + "/product",
        device: "mobile",
        toolVersion: "Synthetic test",
        timestamp: "2026-10-11T00:00:00Z",
        collectionStart: null,
        collectionEnd: null,
        metrics: { lcpMs: 2400, cls: 0.1, inpMs: null, tbtMs: 200 },
        percentile: null,
        sampling: "Synthetic Café sample",
      };
      await page
        .getByLabel("Import type", { exact: true })
        .selectOption("performance");
      const bytes = Buffer.from(JSON.stringify(importPayload));
      const marker = bytes.indexOf(Buffer.from("Café"));
      const invalid = Buffer.concat([
        bytes.subarray(0, marker),
        Buffer.from([0xff]),
        bytes.subarray(marker + Buffer.byteLength("Café")),
      ]);
      await page.locator("#import-file").setInputFiles({
        name: "synthetic-invalid.json",
        mimeType: "application/json",
        buffer: invalid,
      });
      await page
        .getByRole("button", { name: "Import into this project", exact: true })
        .click();
      await page
        .getByRole("status")
        .filter({ hasText: "This file could not be read as UTF-8 JSON." })
        .waitFor();
      assert.equal(store.imports(project, "performance").length, 0);
      await page.locator("#import-file").setInputFiles({
        name: "synthetic-valid.json",
        mimeType: "application/json",
        buffer: bytes,
      });
      await page
        .getByRole("button", { name: "Import into this project", exact: true })
        .click();
      await page
        .getByRole("status")
        .filter({ hasText: "Data imported." })
        .waitFor();
      assert.equal(
        (store.imports(project, "performance")[0] as any).sampling,
        importPayload.sampling,
      );
      const researchPayload = {
        schemaVersion: 1,
        provider: "Synthetic browser supplier",
        method: "manual import",
        url: fixture.origin + "/",
        collectedAt: "2026-10-11T00:00:00Z",
        market: "Synthetic market",
        language: "en",
        device: "all",
        methodology: "One fictional keyword estimate for browser acceptance.",
        limitations:
          "Unknown demand; this synthetic record is not a complete search index.",
        dataset: "keywords",
        periodStart: "2026-09-01",
        periodEnd: "2026-09-30",
        volumeUnit: "estimated searches per month",
        rows: [
          {
            sampleId: "browser-keyword",
            keyword: "synthetic guide",
            targetPage: null,
            estimatedVolume: null,
            evidenceNotes: "No estimate was supplied.",
          },
        ],
      };
      await page
        .getByLabel("Import type", { exact: true })
        .selectOption("external-research");
      await page.locator("#import-file").setInputFiles({
        name: "synthetic-research.json",
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify(researchPayload)),
      });
      const [researchResponse] = await Promise.all([
        page.waitForResponse(
          (response) =>
            response.url().endsWith("/api/import") &&
            response.request().method() === "POST",
        ),
        page
          .getByRole("button", {
            name: "Import into this project",
            exact: true,
          })
          .click(),
      ]);
      assert.equal(researchResponse.status(), 201);
      assert.deepEqual(store.imports(project, "external-research"), [
        researchPayload,
      ]);
      await page.getByRole("link", { name: "Overview", exact: true }).click();
      await page
        .getByRole("link", { name: "Export & imports", exact: true })
        .click();
      await page
        .getByText("Imported keywords, search results and backlinks", {
          exact: true,
        })
        .click();
      await page.getByText(/Synthetic browser supplier/).waitFor();
      await context.clearCookies();
      await page.getByRole("link", { name: "Overview", exact: true }).click();
      await page
        .getByText(
          "The workbench restarted or this session expired. Reload this page before continuing.",
          { exact: true },
        )
        .waitFor();
      await page.waitForTimeout(1800);
      assert.equal(
        await page.locator("#notice").innerText(),
        "The workbench restarted or this session expired. Reload this page before continuing.",
      );
      await page.reload();
      await page.getByRole("heading", { name: "Audit summary" }).waitFor();
      await page
        .getByRole("link", { name: "Export & imports", exact: true })
        .click();
      await page
        .getByRole("heading", { name: "Export reports and import data" })
        .waitFor();
      const accessibility = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze();
      assert.deepEqual(
        accessibility.violations.map((v) => ({ id: v.id, impact: v.impact })),
        [],
      );
      await page.screenshot({
        path: join(directory, "desktop.png"),
        fullPage: true,
      });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForFunction(
        () => !document.getElementById("project-panel").open,
      );
      assert.equal(
        await page.locator("#project-panel").evaluate((el) => el.open),
        false,
      );
      await page
        .getByText("Projects and audit settings", { exact: true })
        .click();
      assert.equal(
        await page.getByLabel("Website URL", { exact: true }).isVisible(),
        true,
      );
      await page
        .getByText("Projects and audit settings", { exact: true })
        .click();
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
        true,
      );
      await page.getByRole("link", { name: "Overview", exact: true }).click();
      await page.getByRole("heading", { name: "Audit summary" }).waitFor();
      await page.screenshot({
        path: join(directory, "mobile.png"),
        fullPage: true,
      });
      await page.keyboard.press("Tab");
      assert.ok(
        await page.evaluate(() => document.activeElement !== document.body),
      );
      const file = join(directory, "report.html");
      writeFileSync(file, exportReport(store, audit, "html"));
      const offline = await browser.newPage();
      let external = 0;
      offline.on("request", (req) => {
        if (req.url().startsWith("http")) external++;
      });
      await offline.goto("file://" + file);
      assert.ok(
        await offline.getByRole("heading", { name: "Pages checked" }).count(),
      );
      assert.equal(external, 0);
      assert.equal(
        await offline.locator(".individual-results").isVisible(),
        true,
      );
      await offline.locator(".technical-evidence > summary").click();
      assert.equal(
        await offline.locator(".technical-evidence > pre").isVisible(),
        true,
      );
      await offline.emulateMedia({ media: "print" });
      assert.equal(
        await offline.locator(".technical-evidence").isVisible(),
        false,
      );
      assert.equal(
        await offline.locator(".individual-results").isVisible(),
        false,
      );
      assert.equal(
        await offline.locator(".content-evidence").isVisible(),
        false,
      );
      assert.equal(await offline.locator(".print-only").isVisible(), true);
      assert.equal(
        await offline
          .getByRole("heading", { name: "Check results", exact: true })
          .isVisible(),
        true,
      );
      await offline.emulateMedia({ media: "screen" });
      assert.equal(
        await offline.locator(".technical-evidence > pre").isVisible(),
        true,
      );
      await offline.setViewportSize({ width: 375, height: 812 });
      await offline
        .locator(".individual-results tbody tr td:last-child p")
        .first()
        .evaluate((paragraph) => {
          paragraph.textContent =
            "https://www.example.com/" + "synthetic-long-path-".repeat(30);
        });
      assert.equal(
        await offline.evaluate(
          () =>
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth,
        ),
        true,
      );
      assert.deepEqual(errors, []);
      if (process.env.WORKBENCH_REVIEW_DIR) {
        await page.setViewportSize({ width: 1440, height: 1000 });
        await page.getByRole("link", { name: "Actions", exact: true }).click();
        await page
          .getByRole("heading", { name: "Prioritised actions" })
          .waitFor();
        await page.screenshot({
          path: join(process.env.WORKBENCH_REVIEW_DIR, "workbench-desktop.png"),
          fullPage: true,
        });
        await page.setViewportSize({ width: 390, height: 844 });
        await page.screenshot({
          path: join(process.env.WORKBENCH_REVIEW_DIR, "workbench-mobile.png"),
          fullPage: true,
        });
      }
    } finally {
      await browser.close();
      await server.close();
      store.close();
      await fixture.close();
      rmSync(directory, { recursive: true, force: true });
    }
  },
);

test(
  "browser explains exhausted crawl limits and exposes new-audit settings",
  { skip: !enabled },
  async () => {
    const directory = mkdtempSync(join(tmpdir(), "seo-workbench-budget-ui-")),
      store = new Store(directory),
      fixture = await fixtureSite({ pages: 3 });
    const app = new Workbench(
      store,
      new NetworkPolicy({ localOrigins: [fixture.origin] }),
    );
    const id = store.createAudit(
      store.createProject(parseConfig({ ...fixture.config, maxPages: 1 })),
    );
    await app.crawler.run(id);
    const server = await serve(app, 0),
      browser = await chromium.launch({
        headless: true,
        chromiumSandbox: true,
      });
    try {
      const page = await browser.newPage();
      await page.goto(server.origin);
      await page
        .locator("#coverage")
        .getByText("The page limit was reached.", { exact: false })
        .waitFor();
      assert.equal(
        await page
          .getByRole("button", { name: "Resume", exact: true })
          .isDisabled(),
        true,
      );
      assert.ok(
        await page
          .getByText(
            "Start a new audit with a higher page limit or a narrower scope to collect more pages.",
            { exact: false },
          )
          .count(),
      );
      await page.getByText("Crawl settings", { exact: true }).click();
      assert.equal(
        await page
          .getByLabel("Saved-data limit in MB", { exact: true })
          .inputValue(),
        "1000",
      );
      assert.equal(
        await page
          .getByLabel("Download limit in MB", { exact: true })
          .inputValue(),
        "1000",
      );
      assert.equal(
        await page
          .getByLabel("Time limit in seconds", { exact: true })
          .inputValue(),
        "86400",
      );
      assert.equal(
        await page.getByLabel("Page limit", { exact: true }).inputValue(),
        "100000",
      );
      assert.throws(() => app.control(id, "resume"), /audit-limit-reached/);
      assert.ok(store.latestAnalysis(id));
    } finally {
      await browser.close();
      await server.close();
      store.close();
      await fixture.close();
      rmSync(directory, { recursive: true, force: true });
    }
  },
);

test(
  "browser completes a saved targeted recheck and shows fresh verification",
  { skip: !enabled, timeout: 20000 },
  async () => {
    const directory = mkdtempSync(join(tmpdir(), "seo-workbench-recheck-ui-")),
      store = new Store(directory),
      fixture = await fixtureSite();
    const config = parseConfig({ ...fixture.config, render: "none" }),
      project = store.createProject(config),
      before = store.createAudit(project);
    const app = new Workbench(
      store,
      new NetworkPolicy({ localOrigins: [fixture.origin] }),
    );
    await app.crawler.run(before);
    const server = await serve(app, 0),
      browser = await chromium.launch({
        headless: true,
        chromiumSandbox: true,
      });
    try {
      const context = await browser.newContext(),
        page = await context.newPage(),
        errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(server.origin);
      await page.getByRole("heading", { name: "Audit summary" }).waitFor();
      await page.getByRole("link", { name: "Actions", exact: true }).click();
      const action = page.locator("article.finding").filter({
        has: page.getByRole("heading", {
          name: "Page title · product",
          exact: true,
        }),
      });
      await action
        .getByRole("button", { name: "Plan a recheck", exact: true })
        .click();
      await page
        .getByText(
          "Recheck plan saved. Review its pages and limitations before starting it.",
          { exact: true },
        )
        .waitFor();
      assert.equal(store.imports(project, "verification-plan").length, 1);
      fixture.setFixed(true);
      const [response] = await Promise.all([
        page.waitForResponse(
          (r) =>
            r.url().endsWith("/api/verification") &&
            r.request().postDataJSON().action === "start",
        ),
        action
          .getByRole("button", { name: "Start this recheck", exact: true })
          .click(),
      ]);
      assert.equal(response.status(), 201);
      const job = await response.json();
      const deadline = Date.now() + 10000;
      while (
        ["queued", "running", "analyzing"].includes(
          store.audit(job.auditId).state,
        ) &&
        Date.now() < deadline
      )
        await new Promise((resolve) => setTimeout(resolve, 25));
      assert.equal(store.audit(job.auditId).state, "complete");
      await page.getByRole("heading", { name: "Audit summary" }).waitFor();
      await page.getByRole("link", { name: "Compare", exact: true }).click();
      const plan = page.locator("details").filter({
        has: page
          .locator("summary")
          .filter({ hasText: /^Targeted recheck planned on/ }),
      });
      await plan.locator("summary").first().click();
      const [evaluated] = await Promise.all([
        page.waitForResponse(
          (r) =>
            r.url().endsWith("/api/verification") &&
            r.request().postDataJSON().action === "evaluate",
        ),
        plan
          .getByRole("button", {
            name: "Check the selected audit against this plan",
            exact: true,
          })
          .click(),
      ]);
      assert.equal(evaluated.status(), 201);
      assert.equal((await evaluated.json()).state, "verified");
      await page
        .getByRole("heading", {
          name: "The selected findings passed this recheck",
        })
        .waitFor();
      assert.equal(store.imports(project, "verification-run").length, 1);
      assert.deepEqual(errors, []);
      const accessibility = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze();
      assert.deepEqual(
        accessibility.violations.map((v) => v.id),
        [],
      );
    } finally {
      await browser.close();
      await server.close();
      store.close();
      await fixture.close();
      rmSync(directory, { recursive: true, force: true });
    }
  },
);

test(
  "leaving the speed-test view aborts its HTTP request and releases ownership",
  { skip: !enabled },
  async () => {
    const directory = mkdtempSync(join(tmpdir(), "seo-workbench-ui-cancel-")),
      store = new Store(directory),
      fixture = await fixtureSite(),
      app = new Workbench(
        store,
        new NetworkPolicy({ localOrigins: [fixture.origin] }),
      ),
      project = store.createProject(
        parseConfig({ ...fixture.config, render: "none" }),
      ),
      audit = store.createAudit(project);
    await app.crawler.run(audit);
    let started = 0,
      aborted = 0;
    // The real HTTP handler and browser own cancellation; isolate the slow measurement work.
    app.measurePerformance = async (_value, signal) => {
      const release = store.reserveWorkerSlot();
      started++;
      try {
        await new Promise<never>((_resolve, reject) => {
          const stop = () => {
            aborted++;
            reject(new Error("request-cancelled"));
          };
          if (signal?.aborted) stop();
          else signal?.addEventListener("abort", stop, { once: true });
        });
        throw new Error("unreachable");
      } finally {
        release();
      }
    };
    const server = await serve(app, 0),
      browser = await chromium.launch({
        headless: true,
        chromiumSandbox: true,
      });
    try {
      const page = await browser.newPage(),
        errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(server.origin);
      await page.getByRole("heading", { name: "Audit summary" }).waitFor();
      for (const cancelByButton of [false, true]) {
        await page
          .getByRole("link", { name: "Export & imports", exact: true })
          .click();
        await page
          .getByLabel("Page address", { exact: true })
          .fill(fixture.origin + "/product");
        const previous = started;
        await page
          .getByRole("button", { name: "Run local speed test", exact: true })
          .click();
        for (let attempt = 0; started === previous && attempt < 100; attempt++)
          await new Promise((resolve) => setTimeout(resolve, 10));
        assert.equal(started, previous + 1);
        if (cancelByButton) {
          await page
            .getByRole("button", { name: "Cancel speed test", exact: true })
            .click();
          await page
            .getByText("Speed test cancelled. No partial series was saved.", {
              exact: true,
            })
            .waitFor();
        } else {
          await page
            .getByRole("link", { name: "Overview", exact: true })
            .click();
          await page.getByRole("heading", { name: "Audit summary" }).waitFor();
        }
        for (let attempt = 0; aborted < started && attempt < 100; attempt++)
          await new Promise((resolve) => setTimeout(resolve, 10));
        assert.equal(aborted, started);
        store.reserveWorkerSlot()();
      }
      assert.equal(store.imports(project, "local-lab-series").length, 0);
      assert.deepEqual(errors, []);
    } finally {
      await browser.close();
      await server.close();
      store.close();
      await fixture.close();
      rmSync(directory, { recursive: true, force: true });
    }
  },
);

test(
  "browser completes a distinct-page draft, preserves owner corrections and never fetches its supplied sources",
  { skip: !enabled },
  async () => {
    const directory = mkdtempSync(
        join(tmpdir(), "seo-workbench-ui-editorial-"),
      ),
      store = new Store(directory),
      fixture = await fixtureSite({ fixed: true }),
      app = new Workbench(
        store,
        new NetworkPolicy({ localOrigins: [fixture.origin] }),
      ),
      project = store.createProject(
        parseConfig({ ...fixture.config, render: "none" }),
      ),
      audit = store.createAudit(project);
    await app.crawler.run(audit);
    const analysis = store.latestAnalysis(audit),
      server = await serve(app, 0),
      browser = await chromium.launch({
        headless: true,
        chromiumSandbox: true,
      });
    try {
      const context = await browser.newContext(),
        page = await context.newPage(),
        outside: string[] = [],
        errors: string[] = [];
      page.on("request", (request) => {
        if (!request.url().startsWith(server.origin))
          outside.push("external-request");
      });
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(server.origin);
      await page.getByRole("heading", { name: "Audit summary" }).waitFor();
      await page.getByRole("link", { name: "Content", exact: true }).click();
      await page.getByRole("heading", { name: "Content review" }).waitFor();
      let review = page.locator("article.finding").first();
      await review
        .getByText("Record a content decision", { exact: true })
        .click();
      await review
        .getByLabel("Decision", { exact: true })
        .selectOption("create-distinct");
      assert.equal(
        await review
          .getByLabel("Include a complete editorial draft", { exact: true })
          .isChecked(),
        true,
      );
      assert.equal(
        await review
          .getByLabel("Include a complete editorial draft", { exact: true })
          .isDisabled(),
        true,
      );
      for (const [label, value] of Object.entries({
        "Owner role": "content editor",
        "Reviewed topic (optional)": "Synthetic setup",
        "Reviewed content group (optional)": "Getting started",
        "What the reader wants to do": "Complete the first setup",
        Audience: "New users",
        "What useful, original information will you add?":
          "Original tested examples",
        "How will you judge success?": "Owner reviews task completion",
        "Why is this the right decision?":
          "A separately reviewed reader task remains unanswered by the existing overview.",
        "Proposed headings (one per line)": "Before you start\nComplete setup",
        "Terms to explain (one per line, optional)": "setup",
        "Reviews required before publication (one per line)":
          "The product maintainer verifies all instructions before publication.",
        "What must be preserved?":
          "Preserve the current routes, warranty and accessible controls.",
        "Fact to check":
          "This synthetic product has a reviewed setup sequence.",
        "Source address": "https://www.example.com/editorial-source",
      }))
        await review.getByLabel(label, { exact: true }).fill(value);
      await review
        .getByRole("button", { name: "Save review decision", exact: true })
        .click();
      assert.deepEqual(store.imports(project, "content-review"), []);
      assert.equal(
        await review
          .locator("form")
          .evaluate((form: HTMLFormElement) => form.checkValidity()),
        false,
      );
      await review
        .getByLabel("Distinct reader need (required for a new page)", {
          exact: true,
        })
        .fill(
          "The existing overview describes warranty but not the first setup task.",
        );
      assert.equal(
        await review
          .getByRole("button", {
            name: "Remove this fact and source",
            exact: true,
          })
          .isDisabled(),
        true,
      );
      await review
        .getByRole("button", {
          name: "Add another fact and source",
          exact: true,
        })
        .click();
      assert.equal(
        await review.getByLabel("Fact to check", { exact: true }).count(),
        2,
      );
      await review
        .getByRole("button", {
          name: "Remove this fact and source",
          exact: true,
        })
        .last()
        .click();
      assert.equal(
        await review.getByLabel("Fact to check", { exact: true }).count(),
        1,
      );
      const [response] = await Promise.all([
        page.waitForResponse((response) =>
          response.url().endsWith("/api/content-review"),
        ),
        review
          .getByRole("button", { name: "Save review decision", exact: true })
          .click(),
      ]);
      assert.equal(response.status(), 201);
      await page
        .getByText("Content decision saved with its evidence.", { exact: true })
        .waitFor();
      await page.getByRole("heading", { name: "Content review" }).waitFor();
      review = page.locator("article.finding").first();
      await review
        .getByText("Record a content decision", { exact: true })
        .click();
      assert.equal(
        await review
          .getByLabel("Reviewed content group (optional)", { exact: true })
          .inputValue(),
        "Getting started",
      );
      assert.equal(
        await review.getByLabel("Source address", { exact: true }).inputValue(),
        "https://www.example.com/editorial-source",
      );
      const record = store.imports(project, "content-review")[0] as any;
      assert.equal(record.briefCompleteness, "complete-owner-draft");
      assert.equal(record.reviewedExistingEvidence.length, 1);
      assert.equal(record.brief.factsAndSources.length, 1);
      assert.equal(store.latestAnalysis(audit), analysis);
      assert.deepEqual(outside, []);
      assert.deepEqual(errors, []);
      const accessibility = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze();
      assert.deepEqual(
        accessibility.violations.map((value) => value.id),
        [],
      );
      await page.setViewportSize({ width: 375, height: 812 });
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
    } finally {
      await browser.close();
      await server.close();
      store.close();
      await fixture.close();
      rmSync(directory, { recursive: true, force: true });
    }
  },
);

test(
  "local sandboxed browser uses captured HTML, brokers resources and cancels with fresh captures",
  { skip: !enabled },
  async () => {
    const fixture = await fixtureSite();
    try {
      const config = parseConfig({
        ...fixture.config,
        render: "all",
        renderReadySelector: "html[data-ready]",
      });
      const policy = new NetworkPolicy({ localOrigins: [fixture.origin] });
      const transport = new Transport(config, policy);
      const response = await transport.request(fixture.origin + "/client");
      assert.match(response.body, /noindex/);
      const result = await renderBrowser(response, config, transport);
      assert.equal(result?.status, "observed");
      assert.equal(result?.facts?.title, "Client guide");
      assert.deepEqual(result?.facts?.robots, []);
      assert.equal((result?.profile as any).browserMode, "local");
      assert.equal((result?.profile as any).sameNavigationRawHTML, true);
      assert.match(
        (result?.profile as any).isolation,
        /Local sandboxed Chromium/,
      );
      const controller = new AbortController();
      const cancelledTransport = new Transport(
        config,
        policy,
        controller.signal,
      );
      const start = Date.now();
      const rendering = renderBrowser(
        response,
        { ...config, renderReadySelector: "#never-present" },
        cancelledTransport,
      );
      const timer = setTimeout(() => controller.abort(), 1000);
      try {
        const cancelled = await rendering;
        assert.equal(cancelled?.reason, "render-cancelled");
        assert.ok(Date.now() - start < 8000);
      } finally {
        clearTimeout(timer);
      }
    } finally {
      await fixture.close();
    }
  },
);

test(
  "local browser workers close when their host pipe disappears during resource collection",
  { skip: !enabled, timeout: 15000 },
  async () => {
    const { spawn } = await import("node:child_process");
    const { once } = await import("node:events");
    const { fileURLToPath } = await import("node:url");
    for (const worker of ["render-worker", "lighthouse-worker"]) {
      const child = spawn(
        process.execPath,
        [fileURLToPath(new URL(`../src/${worker}.ts`, import.meta.url))],
        { stdio: ["pipe", "pipe", "pipe"] },
      );
      try {
        child.stdin.write(
          JSON.stringify({
            kind: "init",
            url: "https://www.example.com/",
            htmlBase64: Buffer.from(
              "<main>Original synthetic page</main><script>fetch('/asset')</script>",
            ).toString("base64"),
            status: 200,
            headers: { "content-type": "text/html" },
            timeoutMs: 30000,
            maxBytes: 100000,
            maxRequests: 10,
            viewport: { width: 1280, height: 800 },
            locale: "en-GB",
            ...(worker === "lighthouse-worker"
              ? { measurement: { device: "desktop" } }
              : { readySelector: "#never-present" }),
          }) + "\n",
        );
        const ready = await Promise.race([
          once(child.stdout, "data").then(([data]) => String(data)),
          once(child, "exit").then(() => "exited"),
        ]);
        assert.match(ready, /"kind":"request"/);
        const exited = once(child, "exit");
        const start = Date.now();
        child.stdin.end();
        await exited;
        assert.ok(Date.now() - start < 5000);
      } finally {
        if (child.exitCode === null && child.signalCode === null) {
          const exited = once(child, "exit");
          child.kill("SIGKILL");
          await exited;
        }
      }
    }
  },
);

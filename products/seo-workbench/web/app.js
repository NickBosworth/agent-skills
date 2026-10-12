/* All website evidence enters the DOM as text, never HTML. */
const $ = (id) => document.getElementById(id);
const labels = {
  "rendering-incomplete": "Some requested browser checks did not complete",
  "sitemap-incomplete": "A sitemap could not be fully checked",
  fail: "Needs a fix",
  warning: "Needs review",
  pass: "Passed",
  "not-tested": "Not tested",
  "not-applicable": "Does not apply",
  blocked: "Could not access",
  error: "Check failed",
  complete: "Complete",
  partial: "Partly complete",
  queued: "Waiting to start",
  running: "Crawling",
  analyzing: "Checking the evidence",
  fetched: "Fetched",
  excluded: "Excluded",
  fetching: "Fetching",
  failed: "Fetch failed",
  paused: "Paused",
  cancelled: "Cancelled",
  P1: "P1 · High priority",
  P2: "P2 · Normal priority",
  review: "Needs review",
  excepted: "Covered by an approved exception",
  resolved: "Resolved",
  verified: "Verified for this recheck",
  "not-verified": "Not verified",
  "not-verifiable": "Not enough evidence to verify",
  introduced: "Introduced",
  "newly-observed": "Newly observed",
  "search-console": "Google Search Console",
  performance: "Page speed measurements",
  "search-visibility": "AI citations and visits",
  "external-research": "Keywords, search results and backlinks",
  "site-data": "Bing, analytics, logs or another crawl",
};
const displayLabel = (value) =>
  labels[value] ?? String(value).replaceAll("-", " ");
const compactLayout = matchMedia("(max-width:850px)");
const adaptProjectPanel = () => {
  $("project-panel").open = !compactLayout.matches;
};
adaptProjectPanel();
compactLayout.addEventListener("change", adaptProjectPanel);
let viewSequence = 0;
let activeLabController;
let auditId = null,
  view = "overview",
  offset = 0,
  audits = [],
  lastState = "",
  projectId = null;
const node = (tag, text, className) => {
  const el = document.createElement(tag);
  if (text !== undefined) el.textContent = String(text);
  if (className) el.className = className;
  return el;
};
const pre = (value) =>
  node(
    "pre",
    typeof value === "string" ? value : JSON.stringify(value, null, 2),
  );
const expiredSessionMessage =
  "The workbench restarted or this session expired. Reload this page before continuing.";
function notice(text, error = false) {
  if (text === "obsolete-view-request") return;
  $("notice").textContent = text;
  $("notice").className = error ? "error" : "";
}
async function api(path, body, signal) {
  const response = await fetch("/api/" + path, {
    signal,
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  if (data?.error === "session-required")
    throw new Error(expiredSessionMessage);
  if (!response.ok)
    throw new Error(
      data.message ??
        data.hint ??
        "The request could not be completed. Try again.",
    );
  return data;
}
function query(name, extra = {}) {
  return (
    "view?" +
    new URLSearchParams({
      audit: auditId,
      view: name,
      offset: String(offset),
      ...extra,
    })
  );
}
function detail(title, data) {
  const el = node("details");
  el.append(node("summary", title), pre(data));
  return el;
}
function table(headers, rows, caption) {
  const wrap = node("div", undefined, "table-scroll"),
    table = node("table"),
    head = node("thead"),
    tr = node("tr"),
    body = node("tbody");
  table.append(node("caption", caption));
  headers.forEach((h) => tr.append(node("th", h)));
  head.append(tr);
  rows.forEach((row) => {
    const tr = node("tr");
    row.forEach((cell) => {
      const td = node("td");
      td.append(
        cell instanceof Node
          ? cell
          : document.createTextNode(String(cell ?? "unknown")),
      );
      tr.append(td);
    });
    body.append(tr);
  });
  table.append(head, body);
  wrap.append(table);
  return wrap;
}
function pageLink(url) {
  const button = node("button", url, "detail-link");
  button.onclick = () => showPage(url);
  return button;
}
async function refreshProjects() {
  const data = await api("projects");
  audits = data.audits;
  $("projects").replaceChildren();
  for (const p of data.projects) {
    $("projects").append(node("strong", p.name));
    for (const a of audits.filter((a) => a.projectId === p.id)) {
      const button = node(
        "button",
        new Date(a.createdAt).toISOString().slice(0, 16).replace("T", " ") +
          " UTC",
        "audit-choice",
      );
      button.append(
        node("small", displayLabel(a.state) + " · " + a.id.slice(0, 8)),
      );
      button.setAttribute("aria-current", String(a.id === auditId));
      button.onclick = () => selectAudit(a.id);
      $("projects").append(button);
    }
  }
  if (!data.projects.length)
    $("projects").append(
      node(
        "p",
        "No projects yet. Start an audit, or run the demo to explore a fictional test site.",
      ),
    );
}
async function selectAudit(id) {
  viewSequence++;
  auditId = id;
  offset = 0;
  lastState = "";
  localStorage.setItem("seo-workbench-audit", id);
  $("audit-section").hidden = false;
  const audit = audits.find((a) => a.id === id);
  projectId = audit?.projectId;
  await refreshProjects();
  await refreshStatus();
  await showView();
}
async function refreshStatus() {
  if (!auditId) return;
  const selectedAudit = auditId;
  const data = await api(query("status", { audit: selectedAudit }));
  if (auditId !== selectedAudit) return;
  const cov = data.coverage;
  projectId = data.audit.projectId;
  $("audit-title").textContent = audits.find((a) => a.id === auditId)?.projectId
    ? ($("projects").querySelector("strong")?.textContent ?? "Audit workspace")
    : "Audit workspace";
  const config = await api(query("config", { audit: selectedAudit }));
  if (auditId !== selectedAudit) return;
  $("audit-title").textContent = config.name;
  $("intro").textContent =
    config.environment === "synthetic"
      ? "Demo audit of a fictional site on this computer."
      : "These results show what the crawler could access without signing in. They do not establish whether search engines have indexed the pages or whether traffic has changed.";
  const c = $("coverage");
  c.className = "coverage " + (cov.state === "complete" ? "" : "partial");
  c.replaceChildren(
    node("strong", displayLabel(cov.state)),
    ...(cov.stopExplanation ? [node("p", cov.stopExplanation)] : []),
    node(
      "span",
      `${cov.knownInventory} page URLs found. ${cov.states.fetched ?? 0} fetched, ${cov.states.queued ?? 0} waiting, ${cov.states.excluded ?? 0} excluded and ${cov.states.blocked ?? 0} blocked.`,
    ),
    node(
      "p",
      `${(cov.bytes / 1_000_000).toFixed(1)} of ${config.maxDownloadBytes / 1_000_000} MB downloaded. ${(cov.storageBytes / 1_000_000).toFixed(1)} of ${config.maxStorageBytes / 1_000_000} MB saved-data allowance used.`,
    ),
    ...(!["queued", "running", "analyzing"].includes(cov.state) &&
    !cov.analysisAvailable
      ? [
          node(
            "p",
            "No analysis was saved. The Pages view still shows collected evidence. Review the stop reason and settings before starting a new audit.",
          ),
        ]
      : []),
    node("p", cov.limitations.join(" ")),
  );
  document.querySelectorAll("[data-control]").forEach((b) => {
    const action = b.dataset.control;
    b.disabled =
      action === "resume"
        ? !["paused", "cancelled", "partial", "error"].includes(cov.state) ||
          [
            "page-budget",
            "request-budget",
            "download-budget",
            "storage-budget",
            "time-budget",
            "persistent-storage-budget",
            "discovery-budget",
          ].includes(cov.reason) ||
          Date.now() - Date.parse(data.audit.createdAt) >=
            config.maxSeconds * 1000
        : !["queued", "running", "analyzing"].includes(cov.state);
  });
  if (lastState && lastState !== cov.state) {
    await refreshProjects();
    await showView();
  }
  lastState = cov.state;
}
async function showPage(url) {
  viewSequence++;
  try {
    const data = await api(query("page", { url }));
    const v = $("view");
    v.replaceChildren(node("h2", "Page evidence"), node("p", url));
    v.append(
      detail("Request history and where the evidence came from", {
        id: data.id,
        timestamp: data.timestamp,
        finalUrl: data.finalUrl,
        error: data.error,
        attempts: data.attempts.map((a) => ({
          ...a,
          body: undefined,
          bodyBase64: undefined,
          encodedBodyBase64: undefined,
        })),
      }),
      detail("Extracted facts", data.facts),
    );
    const columns = node("div", undefined, "columns");
    const raw = node("section"),
      rendered = node("section");
    raw.append(
      node("h3", "Initial response"),
      pre(
        data.response?.body ??
          "The crawler did not receive a complete response.",
      ),
    );
    rendered.append(
      node("h3", "Page after JavaScript ran"),
      pre(
        data.render?.dom ??
          data.render?.reason ??
          "This page was not opened in a browser.",
      ),
    );
    columns.append(raw, rendered);
    v.append(
      columns,
      detail(
        "Browser settings and what could not be checked",
        data.render
          ? { ...data.render, dom: undefined, facts: undefined }
          : "This audit did not request a browser check.",
      ),
    );
    $("pagination").hidden = true;
    $("view-tools").hidden = true;
    v.querySelector("h2").tabIndex = -1;
    v.querySelector("h2").focus();
  } catch (e) {
    notice(e.message, true);
  }
}
function recheckPlan(plan, request) {
  const section = node("details");
  section.append(
    node(
      "summary",
      (plan.mode === "targeted" ? "Targeted recheck" : "Full recheck") +
        " planned on " +
        new Date(plan.createdAt).toLocaleString("en-GB"),
    ),
  );
  section.append(
    node("p", plan.explanation),
    node(
      "p",
      `${plan.dependencies.length} recorded pages are included. ${plan.olderEvidence.count} older page captures remain in the baseline audit and are not reused as fresh evidence.`,
    ),
  );
  section.append(
    detail("Pages to recheck and why they are included", plan.dependencies),
  );
  if (plan.unavailableDependencies.length)
    section.append(
      node(
        "p",
        "Some dependencies are outside the saved permissions. They remain unverified; this plan does not expand access.",
      ),
      detail(
        "Dependencies that cannot be checked",
        plan.unavailableDependencies,
      ),
    );
  const start = node("button", "Start this recheck");
  start.onclick = async () => {
    start.disabled = true;
    try {
      const job = await request("verification", {
        action: "start",
        planId: plan.planId,
      });
      notice(
        "The recheck has started. Its results will be saved as a new audit.",
      );
      await refreshProjects();
      location.hash = "overview";
      await selectAudit(job.auditId);
    } catch (error) {
      notice(error.message, true);
    } finally {
      start.disabled = false;
    }
  };
  const evaluate = node("button", "Check the selected audit against this plan");
  evaluate.disabled = auditId === plan.baselineAuditId;
  const output = node("div");
  evaluate.onclick = async () => {
    evaluate.disabled = true;
    try {
      const record = await request("verification", {
        action: "evaluate",
        planId: plan.planId,
        afterId: auditId,
      });
      output.replaceChildren(
        node(
          "h4",
          record.state === "verified"
            ? "The selected findings passed this recheck"
            : "The fix has not been verified",
        ),
        table(
          ["Page", "Check", "Result", "Explanation"],
          record.changes.map((c) => [
            pageLink(c.url),
            c.ruleId,
            displayLabel(c.state),
            c.reason,
          ]),
          "Recheck results",
        ),
        detail(
          "Dependencies, freshness, older evidence and new findings",
          record,
        ),
      );
    } catch (error) {
      notice(error.message, true);
    } finally {
      evaluate.disabled = false;
    }
  };
  section.append(
    start,
    evaluate,
    node(
      "p",
      "After the new run finishes, select it and open Compare to evaluate this plan. Results apply to the collected evidence; they do not establish indexing or traffic changes.",
    ),
    output,
  );
  return section;
}

function editorialDraft(page, decision) {
  const element = node("div"),
    include = node("input"),
    label = node("label", "Include a complete editorial draft"),
    panel = node("section"),
    fields = {},
    rows = [];
  let sequence = 0;
  include.type = "checkbox";
  include.id = "draft-" + page.id;
  include.checked = Boolean(page.ownerReview?.brief);
  label.htmlFor = include.id;
  panel.append(
    node("h4", "Editorial draft"),
    node(
      "p",
      "Record the existing pages, facts, sources, structure and review work needed before publication. A complete draft remains an owner proposal; sources are not fetched or verified automatically.",
    ),
  );
  for (const [name, text, maxLength, required] of [
    [
      "distinctUnmetNeed",
      "Distinct reader need (required for a new page)",
      2000,
      false,
    ],
    [
      "reviewedExistingPages",
      "Existing pages reviewed (one complete address per line)",
      81940,
      true,
    ],
    ["proposedStructure", "Proposed headings (one per line)", 6030, true],
    ["terminology", "Terms to explain (one per line, optional)", 5050, false],
    [
      "internalLinks",
      "Internal links to include (one complete address per line, optional)",
      204850,
      false,
    ],
    [
      "reviewRequirements",
      "Reviews required before publication (one per line)",
      20020,
      true,
    ],
    ["protectedConstraints", "What must be preserved?", 2000, true],
  ]) {
    const label = node("label", text),
      input = node("textarea"),
      saved = page.ownerReview?.brief?.[name];
    input.id = "draft-" + page.id + "-" + name;
    label.htmlFor = input.id;
    input.maxLength = maxLength;
    input.required = required;
    input.value = Array.isArray(saved)
      ? saved.join("\n")
      : (saved ?? (name === "reviewedExistingPages" ? page.url : ""));
    fields[name] = input;
    panel.append(label, input);
  }
  const facts = node("div"),
    add = node("button", "Add another fact and source");
  add.type = "button";
  const updateButtons = () => {
    add.disabled = !include.checked || rows.length >= 50;
    for (const row of rows)
      row.remove.disabled = !include.checked || rows.length === 1;
  };
  const append = (saved = {}) => {
    if (rows.length >= 50) return;
    const row = node("fieldset"),
      claim = node("textarea"),
      source = node("input"),
      remove = node("button", "Remove this fact and source"),
      id = "fact-" + page.id + "-" + ++sequence;
    row.append(node("legend", "Fact and source"));
    claim.id = id;
    source.id = id + "-source";
    claim.maxLength = 2000;
    source.maxLength = 4096;
    source.type = "url";
    source.pattern = "[Hh][Tt][Tt][Pp][Ss]?://.+";
    claim.required = source.required = true;
    claim.value = saved.claim ?? "";
    source.value = saved.sourceURL ?? "";
    const claimLabel = node("label", "Fact to check"),
      sourceLabel = node("label", "Source address");
    claimLabel.htmlFor = claim.id;
    sourceLabel.htmlFor = source.id;
    remove.type = "button";
    const entry = { row, claim, source, remove };
    rows.push(entry);
    remove.onclick = () => {
      if (rows.length === 1) return;
      rows.splice(rows.indexOf(entry), 1);
      row.remove();
      updateButtons();
    };
    row.append(claimLabel, claim, sourceLabel, source, remove);
    facts.append(row);
    updateButtons();
  };
  add.onclick = () => append();
  for (const saved of page.ownerReview?.brief?.factsAndSources ?? [{}])
    append(saved);
  panel.append(facts, add);
  const update = () => {
    if (decision.value === "create-distinct") include.checked = true;
    include.disabled = decision.value === "create-distinct";
    panel.hidden = !include.checked;
    panel
      .querySelectorAll("input,textarea,button")
      .forEach((input) => (input.disabled = !include.checked));
    fields.distinctUnmetNeed.required = decision.value === "create-distinct";
    updateButtons();
  };
  include.onchange = decision.onchange = update;
  element.append(label, include, panel);
  update();
  return {
    element,
    value: () =>
      include.checked
        ? {
            ...Object.fromEntries(
              Object.entries(fields).map(([name, input]) => [
                name,
                ["distinctUnmetNeed", "protectedConstraints"].includes(name)
                  ? input.value.trim() || undefined
                  : input.value
                      .split("\n")
                      .map((line) => line.trim())
                      .filter(Boolean),
              ]),
            ),
            factsAndSources: rows.map((row) => ({
              claim: row.claim.value.trim(),
              sourceURL: row.source.value.trim(),
            })),
          }
        : null,
  };
}

async function showView() {
  activeLabController?.abort();
  activeLabController = undefined;
  const sequence = ++viewSequence;
  const viewApi = async (path, body, signal) => {
    const result = await api(path, body, signal);
    if (sequence !== viewSequence) throw new Error("obsolete-view-request");
    return result;
  };
  if (!auditId) return;
  view = location.hash.slice(1) || "overview";
  document
    .querySelectorAll("[data-view]")
    .forEach((a) =>
      a.setAttribute(
        "aria-current",
        a.dataset.view === view ? "page" : "false",
      ),
    );
  const v = $("view");
  v.replaceChildren(node("p", "Loading " + view + "…"));
  $("view-tools").hidden = !["pages", "findings"].includes(view);
  $("search").hidden = view !== "pages";
  $("outcome").hidden = view !== "findings";
  $("pagination").hidden = ["overview", "compare", "exports"].includes(view);
  try {
    if (view === "overview") {
      const d = await viewApi(query("status"));
      v.replaceChildren(
        node("h2", "Audit summary"),
        node(
          "p",
          "Start with Actions to see what needs attention and how to check a fix. Open a page to inspect the collected evidence. All outcomes also shows checks that could not run or did not apply.",
        ),
        detail("Pages checked and gaps in coverage", d.coverage),
        detail("Recent crawl events", d.events),
      );
    } else if (view === "exports") {
      v.replaceChildren(
        node("h2", "Export reports and import data"),
        node(
          "p",
          "Shareable summaries leave out page URLs, captured content and your project requirements. Other details, such as counts, may still reveal information about your site. Review the file before sharing it.",
        ),
      );
      for (const profile of ["shareable", "private"]) {
        v.append(
          node(
            "h3",
            profile === "private"
              ? "Full report for private use"
              : "Shareable summary",
          ),
        );
        const links = node("div", undefined, "export-links");
        for (const format of ["html", "markdown", "json", "csv"]) {
          const a = node("a", format.toUpperCase());
          a.href =
            "/api/report?" +
            new URLSearchParams({ audit: auditId, format, profile });
          a.download = "";
          links.append(a);
        }
        v.append(links);
      }
      const lab = node("form"),
        targetLabel = node("label", "Page address"),
        target = node("input"),
        deviceLabel = node("label", "Test device"),
        device = node("select"),
        repeatLabel = node("label", "Number of repeat runs"),
        repeats = node("input"),
        run = node("button", "Run local speed test"),
        cancel = node("button", "Cancel speed test"),
        output = node("div");
      target.type = "url";
      target.id = "lab-url";
      target.required = true;
      targetLabel.htmlFor = target.id;
      device.id = "lab-device";
      deviceLabel.htmlFor = device.id;
      for (const value of ["mobile", "desktop"]) {
        const option = node(
          "option",
          value === "mobile" ? "Mobile" : "Desktop",
        );
        option.value = value;
        device.append(option);
      }
      repeats.type = "number";
      repeats.id = "lab-repeats";
      repeats.min = "1";
      repeats.max = "5";
      repeats.value = "5";
      repeats.required = true;
      repeatLabel.htmlFor = repeats.id;
      cancel.type = "button";
      cancel.disabled = true;
      output.setAttribute("aria-live", "polite");
      let controller;
      cancel.onclick = () => controller?.abort();
      lab.append(
        node("h3", "Measure page speed locally"),
        node(
          "p",
          "This test uses the installed Chromium browser and runs separately from crawling. Repeat runs show variation on this computer and connection; they do not measure real visitors.",
        ),
        targetLabel,
        target,
        deviceLabel,
        device,
        repeatLabel,
        repeats,
        run,
        cancel,
        output,
      );
      lab.onsubmit = async (event) => {
        event.preventDefault();
        controller = new AbortController();
        activeLabController = controller;
        run.disabled = true;
        cancel.disabled = false;
        output.replaceChildren(
          node(
            "p",
            "Running the selected repeat tests. Cancelling or leaving this view stops the request. No partial series is saved.",
          ),
        );
        try {
          const data = await viewApi(
            "performance",
            {
              projectId,
              url: target.value,
              device: device.value,
              repeats: Number(repeats.value),
            },
            controller.signal,
          );
          output.replaceChildren(
            node(
              "p",
              `${data.samples.length} repeat runs saved. The measurements are available in this project’s speed records.`,
            ),
            detail("Median and range from these lab runs", data.summary),
          );
        } catch (error) {
          if (sequence === viewSequence)
            output.replaceChildren(
              node(
                "p",
                error.name === "AbortError"
                  ? "Speed test cancelled. No partial series was saved."
                  : error.message,
              ),
            );
        } finally {
          run.disabled = false;
          cancel.disabled = true;
          if (activeLabController === controller)
            activeLabController = undefined;
          controller = undefined;
        }
      };
      v.append(lab);
      const form = node("form");
      form.append(node("h3", "Import data from your site or search tools"));
      const label = node("label", "Choose a data file (JSON)");
      label.htmlFor = "import-file";
      const input = node("input");
      input.type = "file";
      input.accept = ".json";
      input.id = "import-file";
      input.required = true;
      const select = node("select");
      select.setAttribute("aria-label", "Import type");
      [
        "search-console",
        "performance",
        "search-visibility",
        "external-research",
        "site-data",
      ].forEach((value) => {
        const option = node("option", displayLabel(value));
        option.value = value;
        select.append(option);
      });
      const button = node("button", "Import into this project");
      form.append(label, input, select, button);
      form.onsubmit = async (e) => {
        e.preventDefault();
        const kind = select.value;
        button.disabled = true;
        input.disabled = true;
        select.disabled = true;
        try {
          const file = input.files[0];
          if (file.size > 5000000)
            throw new Error(
              "This file is too large. Choose a JSON file smaller than 5 MB.",
            );
          let data;
          try {
            data = JSON.parse(
              new TextDecoder("utf-8", { fatal: true }).decode(
                await file.arrayBuffer(),
              ),
            );
          } catch {
            throw new Error(
              "This file could not be read as UTF-8 JSON. Save a valid JSON file using UTF-8 encoding, then try again.",
            );
          }
          const saved = await viewApi("import", {
            projectId,
            kind,
            data,
          });
          if (kind === "search-console") {
            appendPeriod({
              ...data,
              id: saved.importId,
              rowCount: data.rows.length,
              filtersKnown: data.filters !== undefined,
            });
            compareButton.disabled = choices[0].options.length < 3;
          }
          if (kind === "site-data") {
            const review = await viewApi(
              query("site-data", { importId: saved.importId, offset: "0" }),
            );
            appendSiteRecord({ importId: saved.importId, ...review.metadata });
          }
          notice(
            "Data imported. The original date range, filters and measurement method have been kept.",
          );
        } catch (error) {
          notice(error.message, true);
        } finally {
          button.disabled = false;
          input.disabled = false;
          select.disabled = false;
        }
      };
      v.append(
        detail(
          "Imported keywords, search results and backlinks",
          await viewApi(query("external-research")),
        ),
        detail(
          "Imported search queries and pages",
          await viewApi(query("demand")),
        ),
        detail(
          "Speed measurements from tests and real visitors",
          await viewApi(query("performance")),
        ),
      );
      v.append(
        detail(
          "Local speed-test series and conditions",
          await viewApi(query("local-lab-series")),
        ),
      );
      const siteSection = node("section");
      const shownSiteImports = new Set();
      const appendSiteRecord = (record) => {
        if (shownSiteImports.has(record.importId)) return;
        shownSiteImports.add(record.importId);
        const article = node("article"),
          details = detail("Source conditions", record),
          output = node("div"),
          status = node("p"),
          read = node("button", "Read supplied records");
        status.setAttribute("role", "status");
        read.type = "button";
        article.append(
          node("h3", `${record.provider}: imported site data`),
          node(
            "p",
            `${record.rowCount} records cover ${record.startDate} to ${record.endDate}. ${record.interpretation}`,
          ),
          node(
            "p",
            `Sampling: ${record.sampling} Limitations: ${record.limitations}`,
          ),
          details,
          read,
          status,
          output,
        );
        const readRows = async (rowOffset) => {
          read.disabled = true;
          status.textContent = "Loading the supplied records…";
          try {
            const result = await viewApi(
              query("site-data", {
                importId: record.importId,
                offset: String(rowOffset),
              }),
            );
            status.textContent = `Showing records ${result.rows.length ? rowOffset + 1 : 0} to ${rowOffset + result.rows.length} of ${result.totalRows}. These are supplied records, not new page checks.`;
            output.replaceChildren(pre(result.rows));
            if (result.totalRows > 100) {
              const previous = node("button", "Previous supplied records"),
                next = node("button", "Next supplied records");
              for (const button of [previous, next]) button.type = "button";
              previous.disabled = rowOffset === 0;
              next.disabled =
                rowOffset + result.rows.length >= result.totalRows;
              previous.onclick = () => {
                previous.disabled = true;
                next.disabled = true;
                void readRows(Math.max(0, rowOffset - 100));
              };
              next.onclick = () => {
                previous.disabled = true;
                next.disabled = true;
                void readRows(rowOffset + 100);
              };
              output.append(previous, next);
            }
          } catch (error) {
            status.textContent = error.message;
            output.replaceChildren();
          } finally {
            read.disabled = false;
          }
        };
        read.onclick = () => {
          void readRows(0);
        };
        siteSection.append(article);
      };
      const siteRecords = await viewApi(query("site-data", { offset: "0" }));
      siteRecords.forEach(appendSiteRecord);
      let siteOffset = siteRecords.length;
      const loadSiteFiles = node("button", "Load more imported site data");
      loadSiteFiles.type = "button";
      loadSiteFiles.hidden = siteRecords.length < 100;
      loadSiteFiles.onclick = async () => {
        loadSiteFiles.disabled = true;
        try {
          const records = await viewApi(
            query("site-data", { offset: String(siteOffset) }),
          );
          records.forEach(appendSiteRecord);
          siteOffset += records.length;
          loadSiteFiles.hidden = records.length < 100;
        } catch (error) {
          notice(error.message, true);
        } finally {
          loadSiteFiles.disabled = false;
        }
      };
      v.append(siteSection, loadSiteFiles);
      const periods = await viewApi(query("search-periods", { offset: "0" }));
      const comparison = node("form"),
        comparisonResult = node("div"),
        comparisonStatus = node("p");
      comparisonStatus.setAttribute("role", "status");
      comparison.append(
        node("h3", "Compare saved search periods"),
        node(
          "p",
          "Choose two equally long periods with matching methods and filters. Results compare only query records present in both samples; missing records remain unknown.",
        ),
      );
      const choices = [];
      for (const [id, title] of [
        ["search-baseline", "Earlier period"],
        ["search-current", "Later period"],
      ]) {
        const label = node("label", title),
          select = node("select");
        select.id = id;
        select.required = true;
        label.htmlFor = id;
        select.append(node("option", "Choose a saved period"));
        select.firstChild.value = "";
        choices.push(select);
        comparison.append(label, select);
      }
      const appendPeriod = (period) => {
        for (const select of choices) {
          if ([...select.options].some((option) => option.value === period.id))
            continue;
          const option = node(
            "option",
            `${period.startDate} to ${period.endDate} · ${period.searchType} · ${period.rowCount} records${period.filtersKnown ? "" : " · filters unknown"} · ${period.id.slice(0, 8)}`,
          );
          option.value = period.id;
          select.append(option);
        }
      };
      periods.forEach(appendPeriod);
      let periodOffset = periods.length;
      const loadPeriods = node("button", "Load more saved periods");
      loadPeriods.type = "button";
      loadPeriods.hidden = periods.length < 100;
      loadPeriods.onclick = async () => {
        loadPeriods.disabled = true;
        try {
          const records = await viewApi(
            query("search-periods", { offset: String(periodOffset) }),
          );
          records.forEach(appendPeriod);
          periodOffset += records.length;
          loadPeriods.hidden = records.length < 100;
          compareButton.disabled = choices[0].options.length < 3;
        } catch (error) {
          notice(error.message, true);
        } finally {
          loadPeriods.disabled = false;
        }
      };
      comparison.append(loadPeriods);
      const compareButton = node("button", "Compare periods");
      compareButton.type = "submit";
      compareButton.disabled = periods.length < 2;
      comparison.append(compareButton, comparisonStatus, comparisonResult);
      const comparePeriods = async (comparisonOffset) => {
        comparisonStatus.textContent = "Comparing the saved query samples…";
        compareButton.disabled = true;
        for (const select of choices) select.disabled = true;
        try {
          const result = await viewApi(
            query("search-comparison", {
              baselineImportId: choices[0].value,
              currentImportId: choices[1].value,
              offset: String(comparisonOffset),
            }),
          );
          comparisonStatus.textContent =
            result.status === "sample-comparison"
              ? "The selected query samples have been compared. Review their changes and limitations below."
              : "No comparison is available. Read the explanation below.";
          comparisonResult.replaceChildren(
            ...[...result.issues, ...result.limitations].map((text) =>
              node("p", text),
            ),
          );
          if (!result.pages.length)
            comparisonResult.append(
              node(
                "p",
                "No comparable page records are available for these selections.",
              ),
            );
          else
            comparisonResult.append(
              table(
                [
                  "Page",
                  "Country",
                  "Device",
                  "Matched queries",
                  "Earlier clicks",
                  "Later clicks",
                  "Click change",
                  "Review",
                ],
                result.pages.map((page) => [
                  page.page,
                  page.country,
                  page.device,
                  String(page.matchedQueries),
                  page.baseline ? String(page.baseline.clicks) : "Unknown",
                  page.current ? String(page.current.clicks) : "Unknown",
                  page.change ? String(page.change.clicks) : "Unknown",
                  page.review,
                ]),
                `Showing ${result.pages.length} of ${result.totalPages} page groups. Countries and devices are kept separate.`,
              ),
            );
          if (result.totalPages > 100) {
            const previous = node("button", "Previous page groups"),
              next = node("button", "Next page groups");
            for (const button of [previous, next]) button.type = "button";
            previous.disabled = comparisonOffset === 0;
            next.disabled =
              comparisonOffset + result.pages.length >= result.totalPages;
            previous.onclick = () => {
              previous.disabled = true;
              next.disabled = true;
              void comparePeriods(Math.max(0, comparisonOffset - 100));
            };
            next.onclick = () => {
              previous.disabled = true;
              next.disabled = true;
              void comparePeriods(comparisonOffset + 100);
            };
            comparisonResult.append(previous, next);
          }
        } catch (error) {
          comparisonStatus.textContent = error.message;
          comparisonResult.replaceChildren();
        } finally {
          compareButton.disabled = false;
          for (const select of choices) select.disabled = false;
        }
      };
      comparison.onsubmit = (event) => {
        event.preventDefault();
        void comparePeriods(0);
      };
      for (const select of choices)
        select.onchange = () => {
          comparisonResult.replaceChildren();
          comparisonStatus.textContent = "";
        };
      v.append(form, comparison);
      const usage = await viewApi(query("model-usage"));
      v.append(
        node("h3", "Model usage"),
        node(
          "p",
          usage
            ? `${usage.reservedGenerations} generation attempts have reserved part of this audit’s allowance. Failed and interrupted attempts still count. Reported token counts and cost may be unknown; opening this view does not contact a model.`
            : "No model allowance is saved for this audit. Opening this view does not contact a model.",
        ),
        ...(usage
          ? [detail("Saved limits and generation records", usage)]
          : []),
      );
      v.append(
        detail(
          "Saved search-engine inspection results (not a new live check)",
          await viewApi(query("index")),
        ),
      );
    } else if (view === "compare") {
      v.replaceChildren(
        node("h2", "Check whether the changes worked"),
        node(
          "p",
          "Compare saved results under the same project requirements and crawl settings. A resolved result means the later saved check passed. Use a recheck plan below to verify fresh evidence, dependencies and new problems.",
        ),
      );
      const form = node("form"),
        label = node("label", "Previous audit"),
        select = node("select"),
        button = node("button", "Compare with current audit");
      select.id = "previous-audit";
      label.htmlFor = select.id;
      audits
        .filter((a) => a.id !== auditId)
        .forEach((a) => {
          const option = node(
            "option",
            a.id.slice(0, 8) +
              " · " +
              new Date(a.createdAt)
                .toISOString()
                .slice(0, 16)
                .replace("T", " ") +
              " UTC",
          );
          option.value = a.id;
          select.append(option);
        });
      form.append(label, select, button);
      const result = node("div");
      form.onsubmit = async (e) => {
        e.preventDefault();
        try {
          const d = await viewApi("compare", {
            before: select.value,
            after: auditId,
          });
          result.replaceChildren(
            node(
              "h3",
              d.configComparable
                ? "Compatible configurations"
                : "Settings changed: review whether the results can be compared",
            ),
            table(
              ["Rule", "URL", "Change", "Reason"],
              d.changes.map((r) => [
                r.ruleId,
                pageLink(r.url),
                displayLabel(r.state),
                r.reason,
              ]),
              "What changed between these audits",
            ),
            detail("Coverage before / after", {
              before: d.coverageBefore,
              after: d.coverageAfter,
            }),
          );
        } catch (error) {
          notice(error.message, true);
        }
      };
      v.append(form, result);
      const verification = await viewApi(query("verification"));
      v.append(node("h3", "Saved recheck plans"));
      if (!verification.plans.length)
        v.append(
          node(
            "p",
            "No recheck plan has been saved. Open an action and choose Plan a recheck.",
          ),
        );
      for (const plan of verification.plans)
        v.append(recheckPlan(plan, viewApi));
      if (verification.runs.length)
        v.append(
          detail("Previously saved verification records", verification.runs),
        );
    } else {
      if (view !== "pages" && $("sort").value === "depth")
        $("sort").value = "url";
      const data = await viewApi(
        query(view, {
          search: $("search").value,
          outcome: $("outcome").value,
          sort: $("sort").value,
        }),
      );
      v.replaceChildren(
        node(
          "h2",
          {
            groups: "Prioritised actions",
            pages: "Pages found",
            graph: "Link relationships",
            content: "Content review",
            findings: "Check results",
          }[view] ?? view,
        ),
      );
      if (view === "groups")
        v.append(
          node(
            "p",
            "Actions group results by check and page template. Pages in a group may have different causes; confirm the cause before applying a shared fix.",
          ),
        );
      if (view === "content")
        v.append(
          node(
            "p",
            "Open a page’s notes to read its captured text and any imported search-query data. Use the decision form to record a proposed change. Topic words alone do not establish what readers need.",
          ),
        );
      if (!data.length)
        v.append(
          node(
            "p",
            "There are no results on this page. Check the filters and audit coverage before concluding that everything has been checked.",
          ),
        );
      else if (view === "groups")
        data.forEach((g) => {
          const section = node("article", undefined, "finding");
          section.append(
            node("span", displayLabel(g.priority), "badge"),
            node("h3", g.title + " · " + g.template),
            node(
              "p",
              `${g.affected.length} affected ${g.affected.length === 1 ? "page" : "pages"}.`,
            ),
            node("p", g.action.solution),
            detail("How to check the fix, and what to watch for", g.action),
            detail("Affected pages and why this action has this priority", g),
          );
          if (g.sourceMapping) {
            section.append(
              node(
                "p",
                "The owner linked a checked source-file version to this action. Review it alongside the page evidence before changing the website.",
              ),
              detail(
                "Source reference and when it was checked",
                g.sourceMapping,
              ),
            );
          }
          const planButton = node("button", "Plan a recheck"),
            planned = node("div");
          planButton.onclick = async () => {
            planButton.disabled = true;
            try {
              const plan = await viewApi("verification", {
                action: "plan",
                auditId,
                groupId: g.id,
              });
              planned.replaceChildren(recheckPlan(plan, viewApi));
              planned.firstElementChild.open = true;
              notice(
                "Recheck plan saved. Review its pages and limitations before starting it.",
              );
            } catch (error) {
              notice(error.message, true);
            } finally {
              planButton.disabled = false;
            }
          };
          section.append(planButton, planned);
          const triage = node("details"),
            form = node("form"),
            fields = {};
          triage.append(
            node("summary", "Review priority, ownership and effort"),
          );
          for (const [name, labelText] of Object.entries({
            priority: "Owner priority",
            ownerRole: "Action owner role",
            effort: "Estimated effort",
            changeRisk: "Estimated change risk",
            dependencies: "What needs to happen first",
            rationale: "Why this priority is appropriate",
          })) {
            const choices = {
              priority: ["P1", "P2", "review"],
              effort: ["unknown", "small", "medium", "large"],
              changeRisk: ["unknown", "low", "medium", "high"],
            }[name];
            const field = choices ? node("select") : node("textarea"),
              label = node("label", labelText);
            field.id = "triage-" + g.id + "-" + name;
            label.htmlFor = field.id;
            field.required = true;
            if (choices) {
              for (const value of choices) {
                const option = node("option", value);
                option.value = value;
                field.append(option);
              }
              field.value =
                g.ownerReview?.[name] ??
                (name === "priority" && g.priority !== "excepted"
                  ? g.priority
                  : "unknown");
            } else {
              field.maxLength =
                name === "rationale" ? 2000 : name === "ownerRole" ? 100 : 1000;
              field.value = g.ownerReview?.[name] ?? "";
            }
            fields[name] = field;
            form.append(label, field);
          }
          const save = node("button", "Save action review");
          form.append(
            save,
            node(
              "p",
              "Your review updates the action’s priority and planning details. It does not change the original check results or the automated release checks.",
            ),
          );
          form.onsubmit = async (event) => {
            event.preventDefault();
            save.disabled = true;
            try {
              await api("action-review", {
                auditId,
                groupId: g.id,
                analysisId: g.analysisId,
                ...Object.fromEntries(
                  Object.entries(fields).map(([key, field]) => [
                    key,
                    field.value,
                  ]),
                ),
              });
              notice(
                "Action review saved. The original priority and evidence are still available.",
              );
              await showView();
            } catch (error) {
              notice(error.message, true);
            } finally {
              save.disabled = false;
            }
          };
          triage.append(form);
          section.append(triage);
          v.append(section);
        });
      else if (view === "pages")
        v.append(
          table(
            ["URL", "Fetch state", "Discovery depth", "Reason"],
            data.map((p) => [
              pageLink(p.url),
              displayLabel(p.state),
              p.depth,
              p.reason
                ? displayLabel(p.reason)
                : "No additional reason recorded",
            ]),
            "The selected sort order is shown. Link distance is unknown for pages that were supplied in a list but not reached through links.",
          ),
        );
      else if (view === "graph")
        v.append(
          table(
            [
              "Page",
              "Template / language",
              "Observed link depth",
              "Links to this page",
              "Links from this page",
              "Relationships",
            ],
            data.map((p) => [
              pageLink(p.url),
              p.template + " · " + p.language,
              p.depth,
              p.inlinks,
              p.outlinks,
              detail("Links and their purpose", p.edges),
            ]),
            "Link distance counts the links followed from a starting page. Preferred-page declarations and language alternatives are listed separately.",
          ),
        );
      else if (view === "findings")
        v.append(
          table(
            ["Rule", "Outcome", "Page", "Evidence and guidance"],
            data.map((r) => [
              r.ruleId,
              node("span", displayLabel(r.outcome), "badge " + r.outcome),
              pageLink(r.url),
              detail(r.reason, r),
            ]),
            "A check is marked as not tested when the evidence it needs is missing.",
          ),
        );
      else if (view === "content")
        data.forEach((o) => {
          const section = node("article", undefined, "finding");
          section.append(
            node("h3", o.title || "Untitled"),
            pageLink(o.url),

            detail("Read the collected passage and content notes", o),
          );
          const reviewDetails = node("details"),
            reviewSummary = node("summary", "Record a content decision"),
            form = node("form");
          const fields = {};
          for (const [name, labelText] of Object.entries({
            decision: "Decision",
            ownerRole: "Owner role",
            topic: "Reviewed topic (optional)",
            cluster: "Reviewed content group (optional)",
            intent: "What the reader wants to do",
            audience: "Audience",
            originalContribution:
              "What useful, original information will you add?",
            successMeasures: "How will you judge success?",
            rationale: "Why is this the right decision?",
          })) {
            const label = node("label", labelText),
              field = name === "decision" ? node("select") : node("textarea");
            field.id = "review-" + o.id + "-" + name;
            label.htmlFor = field.id;
            field.required = !["topic", "cluster"].includes(name);
            if (name === "decision")
              for (const [value, text] of [
                ["improve-existing", "Improve existing page"],
                ["create-distinct", "Propose a distinct page"],
                ["review-consolidation", "Review consolidation"],
                ["reject", "Reject the idea"],
              ]) {
                const option = node("option", text);
                option.value = value;
                field.append(option);
              }
            else
              field.maxLength =
                name === "rationale"
                  ? 3000
                  : name === "ownerRole"
                    ? 100
                    : ["topic", "cluster"].includes(name)
                      ? 200
                      : name === "originalContribution"
                        ? 2000
                        : 1000;
            if (o.ownerReview?.[name]) field.value = o.ownerReview[name];
            fields[name] = field;
            form.append(label, field);
          }
          const save = node("button", "Save review decision");
          const editorial = editorialDraft(o, fields.decision);
          form.append(editorial.element);
          form.append(
            save,
            node(
              "p",
              "This saves your proposed decision for review. It does not publish content or change the audit’s requirements or findings.",
            ),
          );
          form.onsubmit = async (event) => {
            event.preventDefault();
            save.disabled = true;
            try {
              await viewApi("content-review", {
                auditId,
                url: o.url,
                evidenceIds: o.evidenceIds,
                ...(editorial.value() ? { brief: editorial.value() } : {}),
                ...Object.fromEntries(
                  Object.entries(fields)
                    .filter(
                      ([key, field]) =>
                        !["topic", "cluster"].includes(key) ||
                        field.value.trim(),
                    )
                    .map(([key, field]) => [key, field.value]),
                ),
              });
              notice("Content decision saved with its evidence.");
              await showView();
            } catch (error) {
              notice(error.message, true);
            } finally {
              save.disabled = false;
            }
          };
          reviewDetails.append(reviewSummary, form);
          section.append(reviewDetails);
          v.append(section);
        });
      if (view === "content")
        v.append(
          detail(
            "Pages with similar passages to review",
            await viewApi(query("content-similarity")),
          ),
          detail(
            "Ideas from imported search queries to review",
            await viewApi(query("content-opportunities")),
          ),
          detail(
            "Site settings for search crawlers and AI services",
            await viewApi(query("search-controls")),
          ),
          detail(
            "Recorded AI citations and visits (a sample, not total visibility)",
            await viewApi(query("search-visibility")),
          ),
          detail(
            "Saved content decisions",
            await viewApi(query("content-reviews")),
          ),
        );
      if (view === "content")
        v.append(
          detail(
            "Optional AI suggestions for you to review",
            await viewApi(query("suggestions")),
          ),
        );
      $("sort").querySelector('[value="depth"]').disabled = view !== "pages";
      $("sort").disabled = !["pages", "findings"].includes(view);
      $("previous").disabled = offset === 0;
      $("next").disabled = data.length < 100;
      $("page-range").textContent = data.length
        ? "Rows " + (offset + 1) + "–" + (offset + data.length)
        : "No rows";
    }
  } catch (error) {
    if (sequence !== viewSequence) return;
    v.replaceChildren(
      node("p", "This view could not load. Retry by selecting its tab."),
    );
    notice(error.message, true);
  }
}
$("start-form").onsubmit = async (e) => {
  e.preventDefault();
  const button = e.submitter;
  button.disabled = true;
  notice("Checking your settings and starting the audit…");
  try {
    const raw = $("config-json").value.trim();
    const url = raw ? null : new URL($("website").value);
    const config = raw
      ? JSON.parse(raw)
      : {
          name: url.hostname,
          seeds: [url.href],
          origins: [url.origin],
          include: [$("path-prefix").value],
          maxPages: Number($("page-limit").value),
          maxSeconds: Number($("time-limit").value),
          maxStorageBytes: Number($("storage-limit").value) * 1_000_000,
          maxDownloadBytes: Number($("download-limit").value) * 1_000_000,
        };
    const started = await api("start", { config });
    await refreshProjects();
    await selectAudit(started.auditId);
    notice("Audit started. Results remain available if this tab closes.");
  } catch (error) {
    notice(error.message, true);
  } finally {
    button.disabled = false;
  }
};
document.querySelectorAll("[data-control]").forEach(
  (b) =>
    (b.onclick = async () => {
      try {
        await api("control", { auditId, action: b.dataset.control });
        await refreshStatus();
        notice(
          "Your request to " +
            b.dataset.control +
            " the audit has been sent. A request already in progress may finish before the change takes effect.",
        );
      } catch (error) {
        notice(error.message, true);
      }
    }),
);
$("verify").onclick = async () => {
  try {
    const started = await api("verify", { auditId });
    await refreshProjects();
    await selectAudit(started.auditId);
    notice(
      "A new audit has started with the same project requirements. Compare the results when it finishes.",
    );
  } catch (error) {
    notice(error.message, true);
  }
};
$("reanalyze").onclick = async () => {
  try {
    await api("reanalyze", { auditId });
    await showView();
    notice(
      "The saved evidence has been checked again. No new pages were fetched; the evidence still comes from the original crawl.",
    );
  } catch (error) {
    notice(error.message, true);
  }
};
$("previous").onclick = () => {
  offset = Math.max(0, offset - 100);
  showView();
};
$("next").onclick = () => {
  offset += 100;
  showView();
};
$("search").oninput = () => {
  offset = 0;
  showView();
};
$("outcome").onchange = () => {
  offset = 0;
  showView();
};
$("sort").onchange = () => {
  offset = 0;
  showView();
};
let savedViews = [];
try {
  const data = JSON.parse(localStorage.getItem("seo-workbench-views") ?? "[]");
  if (Array.isArray(data))
    savedViews = data
      .filter((v) => typeof v.name === "string" && typeof v.view === "string")
      .slice(0, 20);
} catch {}
function refreshSavedViews() {
  const select = $("saved-views");
  select.replaceChildren(node("option", "Choose a saved view"));
  select.firstChild.value = "";
  savedViews.forEach((v, i) => {
    const option = node("option", v.name);
    option.value = String(i);
    select.append(option);
  });
}
refreshSavedViews();
$("save-view").onclick = () => {
  const name = $("saved-name").value.trim();
  if (!name) {
    notice("Enter a name for this saved view.", true);
    return;
  }
  const record = {
    name,
    view,
    search: $("search").value,
    outcome: $("outcome").value,
    sort: $("sort").value,
  };
  savedViews = savedViews.filter((v) => v.name !== name);
  savedViews.push(record);
  savedViews = savedViews.slice(-20);
  localStorage.setItem("seo-workbench-views", JSON.stringify(savedViews));
  refreshSavedViews();
  notice(
    "View saved in this browser. It retains filters, not website captures.",
  );
};
$("saved-views").onchange = () => {
  const saved = savedViews[Number($("saved-views").value)];
  if ($("saved-views").value === "" || !saved) return;
  $("search").value = saved.search ?? "";
  $("outcome").value = saved.outcome ?? "";
  $("sort").value = saved.sort ?? "url";
  offset = 0;
  if (location.hash === "#" + saved.view) showView();
  else location.hash = saved.view;
};
window.onhashchange = () => {
  offset = 0;
  showView();
};
(async () => {
  try {
    await refreshProjects();
    const saved = localStorage.getItem("seo-workbench-audit");
    if (saved && audits.some((a) => a.id === saved)) await selectAudit(saved);
    else if (audits.length) await selectAudit(audits[0].id);
  } catch (error) {
    notice(error.message, true);
  }
})();
setInterval(() => {
  refreshStatus().catch((error) =>
    notice(
      error.message === expiredSessionMessage
        ? expiredSessionMessage
        : "Connection unavailable. Reload when the local workbench is running.",
      true,
    ),
  );
}, 1500);

$("config-json").oninput = () => {
  $("website").required = !$("config-json").value.trim();
};

import test from "node:test";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import assert from "node:assert/strict";
import { execFileSync, type ExecFileSyncOptions } from "node:child_process";
import {
  mkdtempSync,
  rmSync,
  mkdirSync,
  readFileSync,
  existsSync,
  writeFileSync,
  symlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { fixtureSite } from "../src/fixtures.ts";
function runNpm(args: string[], options: ExecFileSyncOptions): void {
  const entry = process.env.npm_execpath;
  if (!entry) throw new Error("package-tests-require-npm-test");
  execFileSync(process.execPath, [entry, ...args], options);
}
const enabled = process.env.WORKBENCH_PACKAGE_TESTS === "1",
  python = process.env.WORKBENCH_PYTHON ?? "python3";
test(
  "review ZIP is deterministic, preserves the lock, installs independently and launches workers in paths with spaces/hash",
  { skip: !enabled },
  async () => {
    const directory = mkdtempSync(join(tmpdir(), "seo workbench package #"));
    let fixture;
    try {
      runNpm(["run", "build"], { stdio: "pipe", timeout: 30000 });
      const first = join(directory, "candidate.zip"),
        second = join(directory, "repeat.zip");
      for (const out of [first, second])
        execFileSync(python, ["tools/prepare_release.py", "--out", out], {
          stdio: "pipe",
          timeout: 30000,
        });
      assert.deepEqual(readFileSync(first), readFileSync(second));
      execFileSync(python, ["-m", "zipfile", "-e", first, directory], {
        timeout: 10000,
      });
      const packageRoot = join(directory, "seo-workbench"),
        manifest = JSON.parse(
          readFileSync(join(packageRoot, "RELEASE.json"), "utf8"),
        );
      assert.ok(
        manifest.files.every(
          (f: any) =>
            !/node_modules|\.sqlite|\.env|capture|screenshot/.test(f.path),
        ),
      );
      for (const file of [
        "package-lock.json",
        "src/index.ts",
        "examples/ecommerce.json",
        "CONTRIBUTING.md",
      ])
        assert.ok(existsSync(join(packageRoot, file)));
      runNpm(["ci", "--omit=dev", "--ignore-scripts"], {
        cwd: packageRoot,
        stdio: "pipe",
        timeout: 120000,
      });
      const lock = JSON.parse(
        readFileSync(join(packageRoot, "package-lock.json"), "utf8"),
      );
      for (const [location, record] of Object.entries(lock.packages) as [
        string,
        any,
      ][]) {
        if (!location || record.dev) continue;
        const file = join(packageRoot, location, "package.json");
        if (record.optional && !existsSync(file)) continue;
        assert.equal(
          JSON.parse(readFileSync(file, "utf8")).version,
          record.version,
        );
      }
      const state = join(directory, "private-state"),
        demo = JSON.parse(
          execFileSync(
            process.execPath,
            ["dist/cli.js", "demo", "--data", state],
            { cwd: packageRoot, encoding: "utf8", timeout: 30000 },
          ),
        );
      assert.equal(demo.comparison.coverageBefore.state, "complete");
      assert.equal(demo.comparison.coverageAfter.state, "complete");
      assert.ok(
        demo.comparison.changes.some(
          (c: any) => c.ruleId === "index-intent" && c.state === "resolved",
        ),
      );
      assert.equal(
        JSON.parse(
          execFileSync(process.execPath, ["dist/cli.js", "doctor"], {
            cwd: packageRoot,
            encoding: "utf8",
          }),
        ).supportedRuntime,
        true,
      );
      fixture = await fixtureSite();
      const api = await import(
          pathToFileURL(join(packageRoot, "dist/index.js")).href
        ),
        store = new api.Store(join(directory, "worker-state"));
      try {
        const app = new api.Workbench(
            store,
            new api.NetworkPolicy({ localOrigins: [fixture.origin] }),
          ),
          job = app.start(fixture.config);
        const deadline = Date.now() + 15000;
        while (
          Date.now() < deadline &&
          ["queued", "running", "analyzing"].includes(
            store.audit(job.auditId).state,
          )
        )
          await new Promise((resolve) => setTimeout(resolve, 50));
        assert.equal(store.audit(job.auditId).state, "complete");
        assert.ok(store.latestAnalysis(job.auditId));
        assert.equal(store.audit(job.auditId).owner, null);
      } finally {
        store.close();
      }
      const client = new Client({
        name: "installed-package-client",
        version: "0.1.0",
      });
      const entryAlias = join(directory, "mcp launcher #.js");
      symlinkSync(join(packageRoot, "dist/cli.js"), entryAlias);
      const transport = new StdioClientTransport({
        command: process.execPath,
        args: [entryAlias, "mcp", "--data", join(directory, "worker-state")],
        cwd: packageRoot,
        stderr: "pipe",
      });
      let startupCode = "no-redacted-diagnostic";
      transport.stderr?.on("data", (chunk: Buffer) => {
        const text = chunk.toString();
        startupCode =
          text.match(/ERR_[A-Z_]+/)?.[0] ??
          text.match(/"error":"([a-z-]+)"/)?.[1] ??
          startupCode;
      });
      try {
        try {
          await client.connect(transport, { mode: "auto" });
        } catch {
          throw new Error("installed-mcp-startup-" + startupCode);
        }
        assert.match(client.getInstructions() ?? "", /Inspect coverage/);
        assert.equal((await client.listTools()).tools.length, 10);
        const projects: any = await client.callTool({
          name: "projects",
          arguments: {},
        });
        const audits = JSON.parse(projects.content[0].text).audits;
        assert.equal(audits.length, 1);
        const auditId = audits[0].id;
        const status: any = await client.callTool({
          name: "audit_status",
          arguments: { auditId },
        });
        assert.equal(
          JSON.parse(status.content[0].text).coverage.state,
          "complete",
        );
        const pages: any = await client.callTool({
          name: "audit_results",
          arguments: { auditId, view: "pages", limit: 1 },
        });
        const url = JSON.parse(pages.content[0].text)[0].url;
        const resource = await client.readResource({
          uri:
            "evidence://audit/" + auditId + "/page/" + encodeURIComponent(url),
        });
        assert.equal(JSON.parse((resource.contents[0] as any).text).url, url);
        const report: any = await client.callTool({
          name: "export_report",
          arguments: { auditId, format: "html", profile: "shareable" },
        });
        assert.equal(report.isError, undefined);
        const html = JSON.parse(report.content[0].text).report;
        assert.ok(html.includes("Pages checked"));
        assert.ok(!html.includes(fixture.origin));
        const invalid: any = await client.callTool({
          name: "control_audit",
          arguments: { auditId, action: "unsupported" },
        });
        assert.equal(invalid.isError, true);
      } finally {
        await client.close();
      }
    } finally {
      await fixture?.close();
      rmSync(directory, { recursive: true, force: true });
    }
  },
);
test(
  "archive preparation refuses overwrite and symlink inputs without modifying original data",
  { skip: !enabled },
  () => {
    const directory = mkdtempSync(
        join(tmpdir(), "seo-workbench-release-boundary-"),
      ),
      root = join(directory, "source"),
      out = join(directory, "existing.zip"),
      helper = resolve("tools/prepare_release.py");
    try {
      for (const name of ["dist", "src", "web", "data", "docs", "examples"])
        mkdirSync(join(root, name), { recursive: true });
      for (const name of [
        "package-lock.json",
        "tsconfig.json",
        "README.md",
        "CONTRIBUTING.md",
        "LICENSE",
        "NOTICE.md",
        "CHANGELOG.md",
      ])
        writeFileSync(join(root, name), "synthetic");
      writeFileSync(
        join(root, "package.json"),
        JSON.stringify({ name: "synthetic", version: "0.1.0" }),
      );
      writeFileSync(out, "preserve-original");
      const script =
        'import importlib.util,sys;from pathlib import Path;s=importlib.util.spec_from_file_location("release",sys.argv[1]);m=importlib.util.module_from_spec(s);s.loader.exec_module(m);m.build(Path(sys.argv[2]),Path(sys.argv[3]))';
      assert.throws(() =>
        execFileSync(python, ["-c", script, helper, root, out], {
          stdio: "pipe",
        }),
      );
      assert.equal(readFileSync(out, "utf8"), "preserve-original");
      for (const sourcePath of [root, join(directory, "SOURCE")]) {
        if (!existsSync(sourcePath)) continue;
        const forbidden = join(sourcePath, "planned", "candidate.zip");
        assert.throws(() =>
          execFileSync(python, ["-c", script, helper, root, forbidden], {
            stdio: "pipe",
            timeout: 5000,
          }),
        );
        assert.equal(existsSync(forbidden), false);
      }
      const sibling = join(directory, "source-other");
      mkdirSync(sibling);
      const validSibling = join(sibling, "candidate.zip");
      execFileSync(python, ["-c", script, helper, root, validSibling], {
        stdio: "pipe",
        timeout: 5000,
      });
      assert.equal(existsSync(validSibling), true);

      const target = join(directory, "target.ts");
      writeFileSync(target, "synthetic");
      symlinkSync(target, join(root, "src", "linked.ts"));
      assert.throws(() =>
        execFileSync(
          python,
          ["-c", script, helper, root, join(directory, "fresh.zip")],
          { stdio: "pipe" },
        ),
      );
      assert.equal(existsSync(join(directory, "fresh.zip")), false);
      rmSync(join(root, "src", "linked.ts"));
      const bounded = join(root, "src", "bounded.ts"),
        fresh = join(directory, "fresh.zip");
      writeFileSync(bounded, Buffer.alloc(2_000_001));
      assert.throws(() =>
        execFileSync(python, ["-c", script, helper, root, fresh], {
          stdio: "pipe",
          timeout: 5000,
        }),
      );
      assert.equal(existsSync(fresh), false);
      rmSync(bounded);
      const destination = join(directory, "linked-output.zip"),
        absent = join(directory, "absent.zip");
      symlinkSync(absent, destination);
      assert.throws(() =>
        execFileSync(python, ["-c", script, helper, root, destination], {
          stdio: "pipe",
          timeout: 5000,
        }),
      );
      assert.equal(existsSync(absent), false);
      const failureScript = script.replace(
        ";m.build(",
        ';m.zipfile.ZipFile.writestr=lambda *a,**k: (_ for _ in ()).throw(OSError("synthetic-write-failure"));m.build(',
      );
      assert.throws(() =>
        execFileSync(python, ["-c", failureScript, helper, root, fresh], {
          stdio: "pipe",
          timeout: 5000,
        }),
      );
      assert.equal(existsSync(fresh), false);
      if (process.platform !== "win32") {
        execFileSync(python, [
          "-c",
          "import os,sys;os.mkfifo(sys.argv[1])",
          bounded,
        ]);
        assert.throws(() =>
          execFileSync(python, ["-c", script, helper, root, fresh], {
            stdio: "pipe",
            timeout: 5000,
          }),
        );
        assert.equal(existsSync(fresh), false);
      }
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  },
);

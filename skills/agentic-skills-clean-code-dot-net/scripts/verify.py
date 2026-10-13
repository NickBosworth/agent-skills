#!/usr/bin/env python3
"""Verify explicit trusted .NET targets without changing source or applying fixes."""
import argparse
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import xml.etree.ElementTree as ET

IGNORED = {".git", "bin", "obj", "node_modules", ".venv"}
TARGET_SUFFIXES = {".sln", ".slnx", ".slnf", ".csproj"}


def discover(root):
    """Inventory targets, without guessing which solution covers standalone projects."""
    return sorted(str(path.relative_to(root)) for path in root.rglob("*")
                  if path.is_file() and path.suffix in TARGET_SUFFIXES
                  and not IGNORED.intersection(path.relative_to(root).parts))


def target_path(root, value, project_only=False):
    root = root.resolve()
    path = (root / value).resolve()
    if not path.is_relative_to(root) or not path.is_file():
        raise ValueError("Target must be an existing file within the root.")
    for parent in path.parents:
        if parent == root:
            break
        if (parent / "global.json").is_file():
            raise ValueError("Select the nested SDK root explicitly before verification.")
    allowed = {".csproj"} if project_only else TARGET_SUFFIXES
    if path.suffix not in allowed:
        raise ValueError("Unsupported target type.")
    return "./" + path.relative_to(root).as_posix()


def trx_counts(directory):
    """Count actually executed/passed tests; missing or skipped-only output is failure."""
    files = list(directory.glob("*.trx"))
    if not files:
        raise ValueError("No TRX evidence; this helper requires a compatible VSTest runner.")
    executed = passed = 0
    for path in files:
        tree = ET.parse(path)
        counters = tree.find(".//{*}Counters")
        if counters is None:
            raise ValueError("TRX evidence has no counters.")
        run_count = int(counters.attrib["executed"])
        pass_count = int(counters.attrib["passed"])
        if run_count <= 0 or pass_count != run_count:
            raise ValueError("A required test run was empty, skipped-only or unsuccessful.")
        executed += run_count
        passed += pass_count
    return {"executed": executed, "passed": passed, "result_files": len(files)}


def run_check(name, command, root, timeout, log_directory):
    row = {"name": name, "command": command, "status": "BLOCKED"}
    try:
        process = subprocess.run(command, cwd=root, capture_output=True, text=True,
                                 timeout=timeout, env=dict(os.environ, DOTNET_NOLOGO="1"))
        row["exit_code"] = process.returncode
        row["status"] = "PASS" if process.returncode == 0 else "FAIL"
        if log_directory:
            path = log_directory / (name + ".log")
            with path.open("x", encoding="utf-8") as stream:
                stream.write(process.stdout + process.stderr)
            row["evidence"] = path.name
        if name == "sdk" and process.returncode == 0:
            row["version"] = process.stdout.strip()
    except (OSError, subprocess.TimeoutExpired):
        row.update(status="BLOCKED", reason="Required command or evidence output unavailable, already exists or timed out.")
    return row


def verify(root, targets, test_projects, no_tests_reason, timeout=180, log_directory=None, configuration="Release"):
    report = {"status": "BLOCKED", "targets": targets, "tests": test_projects, "checks": []}
    if not targets or (not test_projects and not (no_tests_reason or "").strip()):
        report["reason"] = "Explicit build targets and test projects or a scoped no-tests reason are required."
        return report
    if log_directory:
        log_directory.mkdir(parents=True, exist_ok=True)

    def check(name, command):
        row = run_check(name, command, root, timeout, log_directory)
        report["checks"].append(row)
        if row["status"] != "PASS":
            report["status"] = row["status"]
            return False
        return True

    if not check("sdk", ["dotnet", "--version"]):
        return report
    report["sdk"] = report["checks"][-1]["version"]
    for index, target in enumerate(targets):
        if not check(f"restore-{index}", ["dotnet", "restore", target]):
            return report
        if not check(f"format-{index}", ["dotnet", "format", target, "--verify-no-changes", "--no-restore"]):
            return report
        if not check(f"build-{index}", ["dotnet", "build", target, "--configuration",
                                      configuration, "--no-restore", "-t:Rebuild", "-warnaserror"]):
            return report
    # Explicit test projects get their own matching fresh build, even if not in a supplied solution.
    for index, project in enumerate(test_projects):
        if project not in targets:
            for phase, command in [
                ("restore", ["dotnet", "restore", project]),
                ("format", ["dotnet", "format", project, "--verify-no-changes", "--no-restore"]),
                ("build", ["dotnet", "build", project, "--configuration",
                           configuration, "--no-restore", "-t:Rebuild", "-warnaserror"]),
            ]:
                if not check(f"test-{phase}-{index}", command):
                    return report
        with tempfile.TemporaryDirectory(prefix="dnc-trx-") as temporary:
            directory = Path(temporary)
            command = ["dotnet", "test", project, "--configuration", configuration,
                       "--no-build", "--no-restore", "--logger", "trx",
                       "--results-directory", str(directory)]
            passed_check = check(f"test-{index}", command)
            report["checks"][-1]["command"][-1] = "<temporary-trx-directory>"
            if not passed_check:
                return report
            try:
                report["checks"][-1]["tests"] = trx_counts(directory)
            except (OSError, ValueError, KeyError, ET.ParseError):
                report["checks"][-1].update(status="FAIL", reason="Missing, invalid or unsuccessful test evidence.")
                report["status"] = "FAIL"
                return report
    if not test_projects:
        report["checks"].append({"name": "tests", "status": "NOT APPLICABLE", "reason": no_tests_reason})
    report["status"] = "PASS"
    return report


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path.cwd())
    parser.add_argument("--discover", action="store_true")
    parser.add_argument("--target", action="append", default=[])
    parser.add_argument("--test-project", action="append", default=[])
    parser.add_argument("--no-tests-reason")
    parser.add_argument("--configuration", default="Release")
    parser.add_argument("--timeout", type=int, default=180)
    parser.add_argument("--report", type=Path)
    parser.add_argument("--log-directory", type=Path)
    args = parser.parse_args(argv)
    root = args.root.resolve()
    try:
        if not root.is_dir() or args.timeout <= 0:
            raise ValueError("Existing root and positive timeout required.")
        if args.test_project and args.no_tests_reason:
            raise ValueError("Do not exempt tests while selecting test projects.")
        if args.discover:
            report = {"status": "NOT RUN", "inventory": discover(root),
                      "reason": "Select explicit targets and verify runner/coverage before execution."}
        else:
            targets = [target_path(root, item) for item in args.target]
            tests = [target_path(root, item, project_only=True) for item in args.test_project]
            report = verify(root, targets, tests, args.no_tests_reason, args.timeout, args.log_directory, args.configuration)
    except (OSError, ValueError):
        report = {"status": "BLOCKED", "reason": "Invalid root, target or verification options."}
    data = json.dumps(report, indent=2) + "\n"
    if args.report:
        try:
            with args.report.open("x", encoding="utf-8") as stream:
                stream.write(data)
        except OSError:
            report.update(status="BLOCKED", reason="Report output unavailable or already exists; nothing was overwritten.")
            data = json.dumps(report, indent=2) + "\n"
    print(data, end="")
    return 0 if report["status"] == "PASS" else 1 if report["status"] == "FAIL" else 2


if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env python3
"""Verify explicit trusted .NET targets without changing source or applying fixes."""
import argparse
import json
import os
import re
from pathlib import Path
import subprocess
import sys
import tempfile
import xml.etree.ElementTree as ET

IGNORED = {".git", "bin", "obj", "node_modules", ".venv"}
TARGET_SUFFIXES = {".sln", ".slnx", ".slnf", ".csproj"}


class VerificationOptionsError(ValueError):
    """A fixed public-safe explanation of invalid user options."""


def discover(root):
    """Inventory targets, without guessing which solution covers standalone projects."""
    def unreadable(error):
        raise error

    targets = []
    for directory, children, files in os.walk(root, topdown=True, onerror=unreadable, followlinks=False):
        children[:] = [name for name in children if name not in IGNORED]
        for name in files:
            path = Path(directory) / name
            if path.suffix in TARGET_SUFFIXES and path.is_file():
                targets.append(str(path.relative_to(root)))
    return sorted(targets)


def target_path(root, value, project_only=False):
    root = root.resolve()
    path = (root / value).resolve()
    if not path.is_relative_to(root) or not path.is_file():
        raise VerificationOptionsError("Target must be an existing file within the root.")
    for parent in path.parents:
        if parent == root:
            break
        if (parent / "global.json").is_file():
            raise VerificationOptionsError("Select the nested SDK root explicitly before verification.")
    allowed = {".csproj"} if project_only else TARGET_SUFFIXES
    if path.suffix not in allowed:
        raise VerificationOptionsError("Unsupported target type; select a supported solution or project file.")
    return "./" + path.relative_to(root).as_posix()


def trx_counts(directory):
    """Count actually executed/passed tests; missing or skipped-only output is failure."""
    files = list(directory.glob("*.trx"))
    if not files:
        raise ValueError("No TRX evidence; this helper requires a compatible VSTest runner.")
    executed = passed = 0
    for path in files:
        tree = ET.parse(path)
        summary = tree.getroot().find("{*}ResultSummary")
        if summary is None or summary.get("outcome") not in {"Completed", "Passed"}:
            raise ValueError("TRX evidence has no successful completed summary.")
        counters = summary.find("{*}Counters")
        if counters is None:
            raise ValueError("TRX evidence has no counters.")
        counts = {name: int(value) for name, value in counters.attrib.items()}
        total_count = counts["total"]
        run_count = counts["executed"]
        pass_count = counts["passed"]
        failed_count = counts["failed"]
        skipped_count = counts.get("notExecuted", 0)
        # VSTest can count skipped tests in total while leaving notExecuted at zero.
        if (any(value < 0 for value in counts.values())
                or run_count <= 0 or pass_count != run_count or failed_count != 0
                or total_count < run_count or skipped_count > total_count - run_count
                or any(value != 0 for name, value in counts.items()
                       if name not in {"total", "executed", "passed", "notExecuted"})):
            raise ValueError("A required test run was empty, unsuccessful or inconsistent.")
        executed += run_count
        passed += pass_count
    return {"executed": executed, "passed": passed, "result_files": len(files)}


def framework_scope(output):
    """Read evaluated properties, including imports and configuration conditions."""
    properties = json.loads(output)["Properties"]
    frameworks = (properties["TargetFrameworks"] or properties["TargetFramework"]).split(";")
    frameworks = [value.strip() for value in frameworks]
    if not frameworks or any(not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9.+-]*", value) for value in frameworks):
        raise ValueError("Invalid framework scope.")
    return {"frameworks": list(dict.fromkeys(frameworks))}


def run_check(name, command, root, timeout, log_directory, configuration=None, parse_output=None):
    row = {"name": name, "command": command, "status": "BLOCKED"}
    environment = dict(os.environ, DOTNET_NOLOGO="1")
    if configuration is not None:
        environment["Configuration"] = configuration
    try:
        process = subprocess.run(command, cwd=root, capture_output=True, text=True, encoding="utf-8",
                                 timeout=timeout, env=environment)
    except subprocess.TimeoutExpired:
        row.update(reason_code="command-timeout", reason="Required command timed out; investigate the gate before retrying or increasing the timeout.")
        return row
    except UnicodeError:
        row.update(reason_code="output-encoding", reason="Command output could not be decoded as UTF-8; inspect private diagnostics.")
        return row
    except ValueError:
        row.update(reason_code="command-options", reason="Required command has invalid arguments or environment values; check the selected options.")
        return row
    except FileNotFoundError:
        row.update(reason_code="command-not-found", reason="Required command or working directory is missing; check SDK installation and the selected root.")
        return row
    except PermissionError:
        row.update(reason_code="command-permission", reason="Required command or working directory is inaccessible; check execution and directory permissions.")
        return row
    except OSError:
        row.update(reason_code="command-unavailable", reason="Required command could not start; check its installation and operating-system prerequisites.")
        return row
    row["exit_code"] = process.returncode
    row["status"] = "PASS" if process.returncode == 0 else "FAIL"
    if log_directory:
        try:
            path = log_directory / (name + ".log")
            with path.open("x", encoding="utf-8") as stream:
                stream.write(process.stdout + process.stderr)
            row["evidence"] = path.name
        except FileExistsError:
            row.update(status="BLOCKED", reason_code="log-exists", reason="Evidence log already exists; select a fresh log directory. The existing file was preserved.")
            return row
        except UnicodeError:
            row.update(status="BLOCKED", reason_code="log-encoding", reason="Evidence log could not be saved as UTF-8; inspect private diagnostics.")
            return row
        except OSError:
            row.update(status="BLOCKED", reason_code="log-unavailable", reason="Evidence log could not be written; check destination permissions and available storage.")
            return row
    if name == "sdk" and process.returncode == 0:
        row["version"] = process.stdout.strip()
    if parse_output and process.returncode == 0:
        try:
            row.update(parse_output(process.stdout))
        except (ValueError, KeyError, TypeError, AttributeError):
            row.update(status="BLOCKED", reason_code="framework-scope-invalid", reason="Evaluated project framework properties are missing or invalid; check imports and MSBuild property-query support.")
    return row


def verify(root, targets, test_projects, no_tests_reason, timeout=180, log_directory=None, configuration="Release"):
    report = {"status": "BLOCKED", "targets": targets, "tests": test_projects, "configuration": configuration, "checks": []}
    if not targets or (not test_projects and not (no_tests_reason or "").strip()):
        report["reason_code"] = "scope-required"
        report["reason"] = "Explicit build targets and test projects or a scoped no-tests reason are required."
        return report
    if log_directory:
        try:
            log_directory.mkdir(parents=True, exist_ok=True)
        except OSError:
            report.update(reason_code="log-directory-unavailable", reason="Log directory could not be created; check the destination and permissions.")
            return report

    def check(name, command, parse_output=None):
        row = run_check(name, command, root, timeout, log_directory, configuration, parse_output)
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
        if not check(f"test-scope-{index}", ["dotnet", "msbuild", project,
                     "-getProperty:TargetFramework,TargetFrameworks"], framework_scope):
            return report
        for framework in report["checks"][-1]["frameworks"]:
            with tempfile.TemporaryDirectory(prefix="dnc-trx-") as temporary:
                directory = Path(temporary)
                command = ["dotnet", "test", project, "--configuration", configuration,
                           "--framework", framework, "--no-build", "--no-restore", "--logger", "trx",
                           "--results-directory", str(directory)]
                passed_check = check(f"test-{index}-{framework}", command)
                row = report["checks"][-1]
                row.update(project=project, framework=framework)
                row["command"][-1] = "<temporary-trx-directory>"
                if not passed_check:
                    return report
                try:
                    row["tests"] = trx_counts(directory)
                except (OSError, ValueError, KeyError, ET.ParseError):
                    row.update(status="FAIL", reason="Missing, invalid or unsuccessful test evidence.")
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
    try:
        root = args.root.resolve()
        if not root.is_dir():
            raise VerificationOptionsError("Select an existing directory as the root.")
        if args.timeout <= 0:
            raise VerificationOptionsError("Select a positive command timeout.")
        if args.test_project and args.no_tests_reason:
            raise VerificationOptionsError("Do not exempt tests while selecting test projects.")
        if args.discover:
            report = {"status": "NOT RUN", "inventory": discover(root),
                      "reason": "Select explicit targets and verify runner/coverage before execution."}
        else:
            targets = [target_path(root, item) for item in args.target]
            tests = [target_path(root, item, project_only=True) for item in args.test_project]
            report = verify(root, targets, tests, args.no_tests_reason, args.timeout, args.log_directory, args.configuration)
    except VerificationOptionsError as error:
        report = {"status": "BLOCKED", "reason_code": "invalid-options", "reason": str(error)}
    except ValueError:
        report = {"status": "BLOCKED", "reason_code": "invalid-options", "reason": "Verification options could not be evaluated; check the selected paths and arguments."}
    except OSError:
        report = {"status": "BLOCKED", "reason_code": "scope-unavailable",
                  "reason": "Required filesystem scope could not be accessed; check permissions and available storage. Inventory or verification did not complete."}
    data = json.dumps(report, indent=2) + "\n"
    if args.report:
        try:
            with args.report.open("x", encoding="utf-8") as stream:
                stream.write(data)
        except FileExistsError:
            report.update(status="BLOCKED", reason_code="report-exists", reason="Report already exists; select a fresh output filename. The existing file was preserved.")
            data = json.dumps(report, indent=2) + "\n"
        except OSError:
            report.update(status="BLOCKED", reason_code="report-unavailable", reason="Report could not be written; check destination permissions and available storage.")
            data = json.dumps(report, indent=2) + "\n"
    print(data, end="")
    return 0 if report["status"] == "PASS" else 1 if report["status"] == "FAIL" else 2


if __name__ == "__main__":
    sys.exit(main())

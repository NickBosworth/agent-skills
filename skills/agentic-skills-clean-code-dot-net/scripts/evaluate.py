#!/usr/bin/env python3
"""Run bounded, paired skill evaluations; keep raw evidence outside the checkout."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import time

PACKAGE = Path(__file__).resolve().parents[1]
EXCLUDED = {"bin", "obj", ".git", ".venv", "__pycache__"}


def snapshot(root):
    """Bind evidence to source bytes rather than mutable build output."""
    files = {}
    for directory, children, names in os.walk(root, followlinks=False):
        if any((Path(directory) / name).is_symlink() for name in [*children, *names]):
            raise ValueError("Evaluation evidence must not follow symlinks.")
        children[:] = [name for name in children if name not in EXCLUDED]
        for name in names:
            path = Path(directory) / name
            files[path.relative_to(root).as_posix()] = hashlib.sha256(path.read_bytes()).hexdigest()
    return files


def identity(files):
    return hashlib.sha256(json.dumps(files, sort_keys=True).encode()).hexdigest()


def copy_model_skill(package, destination):
    """Provide operational resources while withholding maintenance graders and results."""
    def excluded(directory, names):
        directory = Path(directory)
        return [name for name in names if name in EXCLUDED
                or (directory == package and name in {"evals", "tests"})
                or (directory == package / "scripts" and name == "evaluate.py")]

    shutil.copytree(package, destination, ignore=excluded)


def event_metrics(output):
    """Extract observed usage and visible reads; absence of usage remains unknown."""
    usage = None
    reads = False
    completed = False
    for line in output.splitlines():
        event = json.loads(line)
        if not isinstance(event, dict):
            raise ValueError("Invalid event object.")
        if event.get("type") == "turn.completed":
            completed = True
            values = event.get("usage", {})
            if not isinstance(values, dict):
                raise ValueError("Invalid usage object.")
            keys = ["input_tokens", "cached_input_tokens", "output_tokens", "reasoning_output_tokens"]
            usage = {key: values.get(key) for key in keys}
            if any(value is not None and (type(value) is not int or value < 0) for value in usage.values()):
                raise ValueError("Invalid usage counters.")
        item = event.get("item", {})
        if not isinstance(item, dict):
            raise ValueError("Invalid event item.")
        # This is visible command evidence, not a guarantee of native skill discovery.
        command = item.get("command", "")
        if (item.get("type") == "command_execution" and isinstance(command, str)
                and "skill/" in command and "SKILL.md" in command
                and item.get("status") == "completed" and item.get("exit_code") == 0):
            body = item.get("aggregated_output", "")
            if not isinstance(body, str):
                raise ValueError("Invalid command output.")
            reads |= "# Clean Code for C#/.NET" in body
    return {"completed": completed, "usage": usage, "visible_skill_read": reads}


def prepare(case, work, package=PACKAGE):
    work.mkdir()
    if case["fixture"] == "refactoring":
        shutil.copytree(package / "examples/refactoring", work, dirs_exist_ok=True)
    elif case["fixture"] == "boundary":
        (work / "Probe.csproj").write_text('<Project Sdk="Microsoft.NET.Sdk"><PropertyGroup>'
            '<TargetFramework>net10.0</TargetFramework><Nullable>enable</Nullable>'
            '</PropertyGroup></Project>\n')
        (work / "Boundary.cs").write_text('namespace Synthetic;\n\npublic static class Boundary\n'
            '{\n    public static bool CanPublish(int count) => count > 0;\n}\n')
    elif case["fixture"] == "no-op":
        (work / "Receipt.cs").write_text('internal static class Receipt\n{\n'
            '    internal static bool HasItems(int count) => count > 0;\n}\n')
    elif case["fixture"] == "negative":
        (work / "Guide.md").write_text('Keep the reciept for your records.\n')
    else:
        raise ValueError("Unknown synthetic fixture.")
    if case["fixture"] in {"boundary", "refactoring"}:
        shutil.copyfile(package / "examples/good/global.json", work / "global.json")


def grade(case, work, before, checker, package=PACKAGE):
    """Independent expected outcomes; the model never receives this grading code."""
    after = snapshot(work)
    after = {key: value for key, value in after.items() if not key.startswith("skill/")}
    if case["fixture"] == "negative":
        expected = {"Guide.md": hashlib.sha256(b'Keep the receipt for your records.\n').hexdigest()}
        return {"outcome_pass": after == expected}
    if case["fixture"] == "no-op":
        return {"outcome_pass": before == after}
    project_root = checker / "project"
    shutil.copytree(work, project_root, ignore=shutil.ignore_patterns(*EXCLUDED, "skill"))
    if case["fixture"] == "boundary":
        consumer = checker / "consumer"
        consumer.mkdir()
        shutil.copyfile(work / "global.json", consumer / "global.json")
        (consumer / "Checker.csproj").write_text('<Project Sdk="Microsoft.NET.Sdk"><PropertyGroup>'
            '<OutputType>Exe</OutputType><TargetFramework>net10.0</TargetFramework>'
            '<Nullable>enable</Nullable></PropertyGroup><ItemGroup>'
            '<ProjectReference Include="../project/Probe.csproj" /></ItemGroup></Project>\n')
        (consumer / "Program.cs").write_text('foreach (var count in new[] { int.MinValue, -1, 0, 1, int.MaxValue })\n'
            '{\n    if (Synthetic.Boundary.CanPublish(count) != (count >= 0))\n'
            '    {\n        throw new System.InvalidOperationException("Inclusive count contract.");\n    }\n}\n')
        project = "Checker.csproj"
        check_root = consumer
        configurations = ["Release"]
    else:
        project = "Refactoring.csproj"
        check_root = project_root
        configurations = ["Debug", "Release"]
        # Retain the independent original assertions; legitimate added tests are not a failure.
        (project_root / "Program.cs").write_text((package / "examples/refactoring/Program.cs").read_text())
        with (project_root / "Program.cs").open("a") as stream:
            stream.write('\nvar implementation = typeof(ReceiptPublisher).GetMethod("DeliverReceipt",\n'
                '    System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Public);\n'
                'if (implementation is null || (int?)implementation.Invoke(publisher, [2]) != 4)\n'
                '{\n    throw new InvalidOperationException("Renamed implementation contract.");\n}\n')
        template = (work / "GeneratedInputs/ReceiptPublisher.cs.in").read_text()
        if "DeliverReceipt(3)" not in template:
            return {"outcome_pass": False, "generator_input_unchanged": True}
    runs = []
    for configuration in configurations:
        result = subprocess.run(["dotnet", "run", "--project", project, "-c", configuration],
                                cwd=check_root, capture_output=True, text=True, timeout=90)
        (checker.parent / ("check-" + configuration + ".log")).write_text(result.stdout + result.stderr)
        runs.append({"configuration": configuration, "exit_code": result.returncode})
    return {"outcome_pass": all(row["exit_code"] == 0 for row in runs), "contract_runs": runs}


def run_case(executor, model, case, arm, repeat, destination, timeout, package=PACKAGE, reasoning_effort="low"):
    run = destination / (case["id"] + "-" + str(repeat) + "-" + arm)
    run.mkdir()
    work = run / "work"
    prepare(case, work, package)
    before = snapshot(work)
    prompt = case["prompt"]
    model_view = None
    if arm == "skill":
        # Keep bundled C# examples outside the evaluated project's default Compile glob.
        copy_model_skill(package, run / "skill")
        model_view = snapshot(run / "skill")
        if case["mode"] == "effectiveness":
            prompt = "Use the provided skill at ../skill/SKILL.md for this task.\n\n" + prompt
        else:
            description = (package / "SKILL.md").read_text().split("description: ", 1)[1].splitlines()[0]
            prompt = ("Available optional skill: agentic-skills-clean-code-dot-net — " + description
                      + "\nLocation: ../skill/SKILL.md. Load it when applicable.\n\n" + prompt)
    prompt += "\nWork only on this synthetic task in the current workspace. Do not access external services or unrelated files."
    command = [executor, "exec", "--ignore-user-config", "--ephemeral", "--skip-git-repo-check",
               "--json", "--model", model, "-C", str(work), "-s", "workspace-write",
               "-c", 'approval_policy="never"', "-c", 'model_reasoning_effort="' + reasoning_effort + '"',
               "-c", "project_doc_max_bytes=0", "-c", "features.skip_host_skill_discovery=true",
               "-c", "features.skill_search=false", "-c", "features.apps=false",
               "-c", 'web_search="disabled"', "-c", 'shell_environment_policy.inherit="core"', "-"]
    start = time.monotonic()
    try:
        process = subprocess.run(command, input=prompt, capture_output=True, text=True, timeout=timeout)
    except subprocess.TimeoutExpired as error:
        output = error.stdout or b""
        diagnostics = error.stderr or b""
        process = subprocess.CompletedProcess(command, 124,
            output.decode("utf-8", errors="replace") if isinstance(output, bytes) else output,
            diagnostics.decode("utf-8", errors="replace") if isinstance(diagnostics, bytes) else diagnostics)
    elapsed = round(time.monotonic() - start, 3)
    (run / "events.jsonl").write_text(process.stdout)
    (run / "diagnostics.txt").write_text(process.stderr)
    metrics = event_metrics(process.stdout)
    row = {"case": case["id"], "mode": case["mode"], "arm": arm, "repeat": repeat,
           "model": model, "reasoning_effort": reasoning_effort, "seconds": elapsed,
           "executor_exit": process.returncode, "input_identity": identity(before),
           "prompt_identity": hashlib.sha256(prompt.encode()).hexdigest(), **metrics}
    if process.returncode == 0 and metrics["completed"]:
        row.update(grade(case, work, before, run / "checker", package))
        if case["mode"] == "selection" and arm == "skill":
            row["selection_pass"] = metrics["visible_skill_read"] == case["should_load"]
    else:
        row["outcome_pass"] = None
    after = {key: value for key, value in snapshot(work).items() if not key.startswith("skill/")}
    row["changed_source_files"] = sum(before.get(key) != after.get(key) for key in before.keys() | after.keys())
    row["output_identity"] = identity(snapshot(work))
    if arm == "skill":
        row["model_view_identity"] = identity(model_view)
        row["skill_preserved"] = snapshot(run / "skill") == model_view
        if not row["skill_preserved"]:
            row["outcome_pass"] = False
    (run / "summary.json").write_text(json.dumps(row, indent=2) + "\n")
    return row


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--executor", required=True)
    parser.add_argument("--model", required=True)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--repeats", type=int, default=2)
    parser.add_argument("--timeout", type=int, default=300)
    parser.add_argument("--reasoning-effort", choices=["low", "medium", "high", "xhigh", "max"], default="low")
    args = parser.parse_args()
    if args.out.resolve().is_relative_to(PACKAGE.parent.parent) or args.repeats < 2 or args.timeout <= 0:
        parser.error("Use an external fresh evidence directory, at least two repeats and a positive timeout.")
    args.out.mkdir(parents=True, exist_ok=False)
    frozen = args.out / "package"
    shutil.copytree(PACKAGE, frozen, ignore=shutil.ignore_patterns(*EXCLUDED))
    cases = json.loads((frozen / "evals/comparison-cases.json").read_text())["cases"]
    version = subprocess.run([args.executor, "--version"], capture_output=True, text=True, check=True).stdout.strip()
    report = {"executor": version, "skill_identity": identity(snapshot(frozen)), "runs": []}
    for repeat in range(args.repeats):
        for case in cases:
            # Reverse order on alternating repeats rather than always priming the skilled arm first.
            for arm in (["baseline", "skill"] if repeat % 2 == 0 else ["skill", "baseline"]):
                row = run_case(args.executor, args.model, case, arm, repeat + 1, args.out, args.timeout,
                               frozen, args.reasoning_effort)
                report["runs"].append(row)
                (args.out / "summary.json").write_text(json.dumps(report, indent=2) + "\n")
                print(json.dumps({key: row.get(key) for key in ["case", "arm", "repeat", "outcome_pass", "selection_pass", "seconds"]}), flush=True)
                if not row["completed"] or row["executor_exit"] != 0:
                    raise SystemExit("BLOCKED: executor did not complete; inspect private evidence before starting a fresh comparison.")


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, subprocess.SubprocessError):
        raise SystemExit("BLOCKED: executor, event output or evidence access failed; inspect private diagnostics. No comparison success is established.") from None

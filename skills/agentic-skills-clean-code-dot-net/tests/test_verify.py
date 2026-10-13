"""Failure propagation and evidence tests independent of an installed SDK."""
import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

SPEC = importlib.util.spec_from_file_location("dnc_verify", Path(__file__).parents[1] / "scripts/verify.py")
verify = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(verify)


def successful_command(command, **kwargs):
    output = json.dumps({"Properties": {"TargetFramework": "net10.0", "TargetFrameworks": ""}}) if command[1] == "msbuild" else "10.0.400"
    return subprocess.CompletedProcess(command, 0, output, "")


class VerifyTests(unittest.TestCase):
    def test_runner_command_mode_rejects_mismatch_and_unsupported_overrides(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            selection = root / "global.json"
            selection.write_text('{"test":{"runner":"Microsoft.Testing.Platform"}}')
            with patch.dict(verify.os.environ, {"DOTNET_TEST_RUNNER": ""}):
                self.assertEqual(verify.test_command_mode(root, "10.0.400"), "mtp-native")
                with self.assertRaises(ValueError):
                    verify.test_command_mode(root, "9.0.100")
                with patch.object(verify.subprocess, "run", side_effect=successful_command) as run:
                    result = verify.verify(root, ["Runner.csproj"], ["Runner.csproj"], None)
                self.assertEqual(result["reason_code"], "test-platform-unsupported")
                self.assertEqual(run.call_count, 1)
            with patch.dict(verify.os.environ, {"DOTNET_TEST_RUNNER": "synthetic-private-marker"}):
                with self.assertRaises(ValueError) as failure:
                    verify.test_command_mode(root, "10.0.400")
                self.assertNotIn("synthetic-private-marker", str(failure.exception))
            for text in ['{"test":{"runner":"Unknown"}}', '{"test":null}', '{']:
                selection.write_text(text)
                with patch.object(verify.subprocess, "run", side_effect=successful_command):
                    result = verify.verify(root, ["Runner.csproj"], ["Runner.csproj"], None)
                self.assertEqual(result["status"], "BLOCKED")

    def test_native_mtp_command_and_evaluated_application_evidence(self):
        def run(command, **kwargs):
            if command[1] == "msbuild" and command[-1].endswith("OutputType"):
                return subprocess.CompletedProcess(command, 0, json.dumps({"Properties": {
                    "IsTestingPlatformApplication": "true", "OutputType": "Exe"}}), "")
            if command[1] == "test":
                (Path(command[-1]) / "result.trx").write_text("<TestRun><ResultSummary outcome='Completed'><Counters total='1' executed='1' passed='1' failed='0'/></ResultSummary></TestRun>")
            return successful_command(command)

        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            (root / "global.json").write_text('{"test":{"runner":"Microsoft.Testing.Platform"}}')
            with patch.dict(verify.os.environ, {"DOTNET_TEST_RUNNER": ""}):
                with patch.object(verify.subprocess, "run", side_effect=run):
                    report = verify.verify(root, ["Runner.csproj"], ["Runner.csproj"], None,
                                           test_platform="mtp-native")
        self.assertEqual(report["status"], "PASS")
        command = report["checks"][-1]["command"]
        self.assertIn("--project", command)
        self.assertIn("--report-trx", command)
        self.assertNotIn("--logger", command)
        for properties in [{"IsTestingPlatformApplication": "false", "OutputType": "Exe"},
                           {"IsTestingPlatformApplication": "true", "OutputType": "Library"}]:
            with self.assertRaises(ValueError):
                verify.mtp_application(json.dumps({"Properties": properties}))
        with patch.object(verify.subprocess, "run", return_value=subprocess.CompletedProcess([], 0, "{}", "")):
            blocked = verify.run_check("mtp", ["dotnet", "msbuild"], Path.cwd(), 1, None,
                                       parse_output=verify.mtp_application)
        self.assertEqual(blocked["reason_code"], "mtp-application-invalid")

    def test_inventory_includes_all_target_kinds_but_not_build_artifacts(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            for name in ["a.sln", "b.slnx", "c.slnf", "d.csproj", "obj/e.csproj"]:
                path = root / name
                path.parent.mkdir(exist_ok=True)
                path.write_text("")
            self.assertEqual(verify.discover(root), ["a.sln", "b.slnx", "c.slnf", "d.csproj"])

    def test_discovery_prunes_ignored_subtrees_before_reading_them(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            for name in [*verify.IGNORED, "source"]:
                (root / name).mkdir()
                (root / name / "Example.csproj").write_text("")
            scandir = verify.os.scandir

            def guarded(directory):
                if Path(directory).name in verify.IGNORED:
                    raise AssertionError("Discovery entered an ignored subtree.")
                return scandir(directory)

            with patch.object(verify.os, "scandir", side_effect=guarded):
                self.assertEqual(verify.discover(root), [str(Path("source/Example.csproj"))])

    def test_unreadable_inventory_blocks_instead_of_returning_partial_scope(self):
        import io
        with tempfile.TemporaryDirectory() as temporary:
            with patch.object(verify.os, "scandir", side_effect=PermissionError("synthetic-private-marker")):
                with patch("sys.stdout", new=io.StringIO()) as output:
                    result = verify.main(["--root", temporary, "--discover"])
            report = json.loads(output.getvalue())
        self.assertEqual(result, 2)
        self.assertEqual(report["reason_code"], "scope-unavailable")
        self.assertNotIn("synthetic-private-marker", output.getvalue())

    def test_target_cannot_escape_root_or_use_wrong_suffix(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            (root / "source.cs").write_text("")
            for value in ["../outside.csproj", "source.cs", "missing.csproj"]:
                with self.assertRaises(ValueError):
                    verify.target_path(root, value)

    def test_nested_sdk_root_requires_explicit_selection(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            nested = root / "nested"
            nested.mkdir()
            (nested / "global.json").write_text("{}")
            (nested / "Good.csproj").write_text("")
            with self.assertRaises(ValueError):
                verify.target_path(root, "nested/Good.csproj")
            self.assertEqual(verify.target_path(nested, "Good.csproj"), "./Good.csproj")

    def test_successful_test_evidence_is_counted_and_temporary_path_is_removed(self):
        def run(command, **kwargs):
            if command[1] == "test":
                directory = Path(command[-1])
                (directory / "result.trx").write_text("<TestRun><ResultSummary outcome='Completed'><Counters total='2' executed='2' passed='2' failed='0'/></ResultSummary></TestRun>")
            return successful_command(command)
        with patch.object(verify.subprocess, "run", side_effect=run):
            report = verify.verify(Path.cwd(), ["Good.csproj"], ["Tests.csproj"], None)
        self.assertEqual(report["status"], "PASS")
        self.assertEqual(report["checks"][-1]["tests"]["executed"], 2)
        self.assertEqual(report["checks"][-1]["command"][-1], "<temporary-trx-directory>")
        self.assertIn("test-format-0", [row["name"] for row in report["checks"]])

    def test_existing_log_is_preserved_and_blocks_evidence(self):
        with tempfile.TemporaryDirectory() as temporary:
            directory = Path(temporary)
            path = directory / "sdk.log"
            path.write_text("Synthetic previous evidence.")
            with patch.object(verify.subprocess, "run", return_value=subprocess.CompletedProcess([], 0, "10.0.400", "")):
                row = verify.run_check("sdk", ["dotnet", "--version"], Path.cwd(), 1, directory)
            self.assertEqual(row["status"], "BLOCKED")
            self.assertEqual(row["reason_code"], "log-exists")
            self.assertEqual(path.read_text(), "Synthetic previous evidence.")

    def test_existing_report_is_preserved(self):
        import io
        with tempfile.TemporaryDirectory() as temporary:
            directory = Path(temporary)
            path = directory / "report.json"
            path.write_text("Synthetic previous evidence.")
            with patch("sys.stdout", new=io.StringIO()) as output:
                result = verify.main(["--root", temporary, "--discover", "--report", str(path)])
            self.assertEqual(result, 2)
            self.assertEqual(json.loads(output.getvalue())["reason_code"], "report-exists")
            self.assertEqual(path.read_text(), "Synthetic previous evidence.")

    def test_missing_sdk_is_blocked(self):
        with patch.object(verify.subprocess, "run", side_effect=FileNotFoundError):
            result = verify.verify(Path.cwd(), ["Good.csproj"], [], "Test-free fixture")
        self.assertEqual(result["status"], "BLOCKED")
        self.assertEqual(len(result["checks"]), 1)

    def test_failed_restore_stops_before_build(self):
        outputs = [subprocess.CompletedProcess([], 0, "10.0.400\n", ""),
                   subprocess.CompletedProcess([], 1, "synthetic failure", "")]
        with patch.object(verify.subprocess, "run", side_effect=outputs) as run:
            result = verify.verify(Path.cwd(), ["Good.csproj"], [], "Test-free fixture")
        self.assertEqual(result["status"], "FAIL")
        self.assertEqual(run.call_count, 2)

    def test_failed_format_stops_before_build(self):
        outputs = [subprocess.CompletedProcess([], 0, "10.0.400\n", ""),
                   subprocess.CompletedProcess([], 0, "", ""),
                   subprocess.CompletedProcess([], 1, "", "")]
        with patch.object(verify.subprocess, "run", side_effect=outputs):
            result = verify.verify(Path.cwd(), ["Good.csproj"], [], "Test-free fixture")
        self.assertEqual(result["checks"][-1]["name"], "format-0")
        self.assertEqual(result["status"], "FAIL")

    def test_tests_need_explicit_scope_or_exemption(self):
        self.assertEqual(verify.verify(Path.cwd(), ["Good.csproj"], [], None)["status"], "BLOCKED")

    def test_timeout_is_not_pass(self):
        with patch.object(verify.subprocess, "run", side_effect=subprocess.TimeoutExpired(["dotnet"], 1)):
            result = verify.verify(Path.cwd(), ["Good.csproj"], [], "Test-free fixture")
        self.assertEqual(result["status"], "BLOCKED")

    def test_no_shell_and_matching_configuration(self):
        with patch.object(verify.subprocess, "run", return_value=subprocess.CompletedProcess([], 0, "10.0.400", "")) as run:
            report = verify.verify(Path.cwd(), ["space path/Good.csproj"], [], "Test-free fixture",
                                   configuration="Debug")
        self.assertEqual(report["status"], "PASS")
        command = run.call_args_list[-1].args[0]
        self.assertIn("space path/Good.csproj", command)
        self.assertIn("Debug", command)
        self.assertEqual(report["configuration"], "Debug")
        for call in run.call_args_list:
            self.assertEqual(call.kwargs["env"]["Configuration"], "Debug")
        self.assertIn("-t:Rebuild", command)
        self.assertNotIn("shell", run.call_args.kwargs)

    def test_trx_requires_valid_summary_and_consistent_counters(self):
        valid = {"total": "2", "executed": "2", "passed": "2", "failed": "0"}
        cases = [
            ("Failed", valid), ("Aborted", valid), ("Error", valid),
            ("Pending", valid), (None, valid),
            ("Completed", {"executed": "2", "passed": "2"}),
            ("Completed", {**valid, "executed": "0", "passed": "0"}),
            ("Completed", {**valid, "passed": "1"}),
            ("Completed", {**valid, "total": "1"}),
            ("Completed", {**valid, "failed": "1"}),
            ("Completed", {**valid, "total": "-1"}),
            ("Completed", {**valid, "executed": "invalid"}),
            ("Completed", {**valid, "notExecuted": "1"}),
        ]
        for counter in ["error", "timeout", "aborted", "inconclusive", "passedButRunAborted",
                        "notRunnable", "disconnected", "warning", "completed", "inProgress", "pending"]:
            cases.append(("Completed", {**valid, counter: "1"}))
        with tempfile.TemporaryDirectory() as temporary:
            directory = Path(temporary)
            with self.assertRaises(ValueError):
                verify.trx_counts(directory)
            for outcome, counts in cases:
                with self.subTest(outcome=outcome, counters=counts):
                    outcome_attribute = "" if outcome is None else f"outcome='{outcome}'"
                    attributes = " ".join(f"{name}='{value}'" for name, value in counts.items())
                    (directory / "a.trx").write_text(f"<TestRun><ResultSummary {outcome_attribute}><Counters {attributes}/></ResultSummary></TestRun>")
                    with self.assertRaises((ValueError, KeyError)):
                        verify.trx_counts(directory)

    def test_trx_accepts_completed_runs_and_aggregate_files_with_skips(self):
        with tempfile.TemporaryDirectory() as temporary:
            directory = Path(temporary)
            for outcome in ["Completed", "Passed"]:
                (directory / "a.trx").write_text(f"<TestRun xmlns='urn:trx'><ResultSummary outcome='{outcome}'><Counters total='3' executed='2' passed='2' failed='0' notExecuted='0'/></ResultSummary></TestRun>")
                self.assertEqual(verify.trx_counts(directory)["executed"], 2)
            (directory / "b.trx").write_text("<TestRun><ResultSummary outcome='Completed'><Counters total='2' executed='1' passed='1' failed='0' notExecuted='1'/></ResultSummary></TestRun>")
            self.assertEqual(verify.trx_counts(directory), {"executed": 3, "passed": 3, "result_files": 2})

    def test_test_exit_zero_with_failed_summary_fails(self):
        def run(command, **kwargs):
            if command[1] == "test":
                (Path(command[-1]) / "failed.trx").write_text("<TestRun><ResultSummary outcome='Failed'><Counters total='2' executed='1' passed='1' failed='0' aborted='1'/></ResultSummary></TestRun>")
            return successful_command(command)
        with patch.object(verify.subprocess, "run", side_effect=run):
            report = verify.verify(Path.cwd(), ["Good.csproj"], ["Good.csproj"], None)
        self.assertEqual(report["status"], "FAIL")
        self.assertEqual(report["checks"][-1]["status"], "FAIL")

    def test_test_exit_zero_without_results_fails(self):
        with patch.object(verify.subprocess, "run", side_effect=successful_command):
            report = verify.verify(Path.cwd(), ["Good.csproj"], ["Good.csproj"], None)
        self.assertEqual(report["status"], "FAIL")
        self.assertIn("evidence", report["checks"][-1]["reason"])

    def test_every_project_framework_needs_its_own_nonempty_run(self):
        def run(command, **kwargs):
            if command[1] == "msbuild":
                return subprocess.CompletedProcess(command, 0, json.dumps({"Properties": {
                    "TargetFramework": "", "TargetFrameworks": "net8.0;net10.0"}}), "")
            if command[1] == "test" and command[2] == "First.csproj":
                (Path(command[-1]) / "result.trx").write_text("<TestRun><ResultSummary outcome='Completed'><Counters total='1' executed='1' passed='1' failed='0'/></ResultSummary></TestRun>")
            return successful_command(command)
        with patch.object(verify.subprocess, "run", side_effect=run):
            report = verify.verify(Path.cwd(), ["First.csproj", "Second.csproj"],
                                   ["First.csproj", "Second.csproj"], None)
        self.assertEqual(report["status"], "FAIL")
        tests = [row for row in report["checks"] if "framework" in row]
        self.assertEqual([(row["project"], row["framework"], row["status"]) for row in tests],
                         [("First.csproj", "net8.0", "PASS"), ("First.csproj", "net10.0", "PASS"),
                          ("Second.csproj", "net8.0", "FAIL")])

    def test_passing_framework_cannot_cover_empty_sibling(self):
        def run(command, **kwargs):
            if command[1] == "msbuild":
                return subprocess.CompletedProcess(command, 0, json.dumps({"Properties": {
                    "TargetFramework": "", "TargetFrameworks": "net8.0;net10.0"}}), "")
            if command[1] == "test" and "net8.0" in command:
                (Path(command[-1]) / "result.trx").write_text("<TestRun><ResultSummary outcome='Completed'><Counters total='1' executed='1' passed='1' failed='0'/></ResultSummary></TestRun>")
            return successful_command(command)
        with patch.object(verify.subprocess, "run", side_effect=run):
            report = verify.verify(Path.cwd(), ["Tests.csproj"], ["Tests.csproj"], None)
        self.assertEqual(report["status"], "FAIL")
        self.assertEqual(report["checks"][-1]["framework"], "net10.0")

    def test_invalid_project_properties_block_without_echoing_output(self):
        for output in ["synthetic-private-marker", "{}", '{"Properties": {"TargetFramework": "", "TargetFrameworks": ""}}']:
            with self.subTest(output=output):
                with patch.object(verify.subprocess, "run", return_value=subprocess.CompletedProcess([], 0, output, "")):
                    row = verify.run_check("scope", ["dotnet", "msbuild"], Path.cwd(), 1, None,
                                           parse_output=verify.framework_scope)
                self.assertEqual(row["status"], "BLOCKED")
                self.assertNotIn("synthetic-private-marker", json.dumps(row))

    def test_decode_failure_is_structured_and_private(self):
        error = UnicodeDecodeError("utf-8", b"synthetic-private-marker\xff", 24, 25, "invalid byte")
        with patch.object(verify.subprocess, "run", side_effect=error):
            report = verify.verify(Path.cwd(), ["Good.csproj"], [], "Test-free fixture")
        self.assertEqual(report["status"], "BLOCKED")
        self.assertIn("UTF-8", report["checks"][0]["reason"])
        self.assertNotIn("synthetic-private-marker", json.dumps(report))

    def test_blocked_command_causes_are_distinct_and_private(self):
        cases = [(FileNotFoundError("synthetic-private-marker"), "command-not-found"),
                 (PermissionError("synthetic-private-marker"), "command-permission"),
                 (OSError("synthetic-private-marker"), "command-unavailable"),
                 (ValueError("synthetic-private-marker"), "command-options"),
                 (subprocess.TimeoutExpired(["synthetic-private-marker"], 1), "command-timeout")]
        for error, code in cases:
            with self.subTest(code=code):
                with patch.object(verify.subprocess, "run", side_effect=error):
                    row = verify.run_check("sdk", ["dotnet", "--version"], Path.cwd(), 1, None)
                self.assertEqual(row["status"], "BLOCKED")
                self.assertEqual(row["reason_code"], code)
                self.assertNotIn("synthetic-private-marker", json.dumps(row))

    def test_unwritable_log_is_distinct_from_command_failure(self):
        with patch.object(verify.subprocess, "run", side_effect=successful_command):
            with patch.object(verify.Path, "open", side_effect=PermissionError("synthetic-private-marker")):
                row = verify.run_check("sdk", ["dotnet", "--version"], Path.cwd(), 1, Path("logs"))
        self.assertEqual(row["reason_code"], "log-unavailable")
        self.assertEqual(row["status"], "BLOCKED")
        self.assertEqual(row["exit_code"], 0)
        self.assertNotIn("synthetic-private-marker", json.dumps(row))

    def test_unavailable_log_directory_is_reported_before_commands(self):
        with patch.object(verify.Path, "mkdir", side_effect=PermissionError("synthetic-private-marker")):
            with patch.object(verify.subprocess, "run") as run:
                report = verify.verify(Path.cwd(), ["Good.csproj"], [], "Test-free fixture", log_directory=Path("logs"))
        self.assertEqual(report["reason_code"], "log-directory-unavailable")
        run.assert_not_called()
        self.assertNotIn("synthetic-private-marker", json.dumps(report))

    def test_invalid_target_reason_is_actionable_without_echoing_input(self):
        import io
        with tempfile.TemporaryDirectory() as temporary:
            with patch("sys.stdout", new=io.StringIO()) as output:
                result = verify.main(["--root", temporary, "--target", "synthetic-private-marker.csproj"])
        self.assertEqual(result, 2)
        report = json.loads(output.getvalue())
        self.assertEqual(report["reason_code"], "invalid-options")
        self.assertIn("existing file within the root", report["reason"])
        self.assertNotIn("synthetic-private-marker", output.getvalue())


if __name__ == "__main__":
    unittest.main()

"""Failure propagation and evidence tests independent of an installed SDK."""
import importlib.util
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

SPEC = importlib.util.spec_from_file_location("dnc_verify", Path(__file__).parents[1] / "scripts/verify.py")
verify = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(verify)


class VerifyTests(unittest.TestCase):
    def test_inventory_includes_all_target_kinds_but_not_build_artifacts(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            for name in ["a.sln", "b.slnx", "c.slnf", "d.csproj", "obj/e.csproj"]:
                path = root / name
                path.parent.mkdir(exist_ok=True)
                path.write_text("")
            self.assertEqual(verify.discover(root), ["a.sln", "b.slnx", "c.slnf", "d.csproj"])

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
                (directory / "result.trx").write_text("<TestRun><ResultSummary><Counters executed='2' passed='2'/></ResultSummary></TestRun>")
            return subprocess.CompletedProcess(command, 0, "10.0.400", "")
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
            self.assertEqual(path.read_text(), "Synthetic previous evidence.")

    def test_existing_report_is_preserved(self):
        import io
        with tempfile.TemporaryDirectory() as temporary:
            directory = Path(temporary)
            path = directory / "report.json"
            path.write_text("Synthetic previous evidence.")
            with patch("sys.stdout", new=io.StringIO()):
                result = verify.main(["--root", temporary, "--discover", "--report", str(path)])
            self.assertEqual(result, 2)
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
        self.assertIn("-t:Rebuild", command)
        self.assertNotIn("shell", run.call_args.kwargs)

    def test_trx_requires_executed_tests_in_each_result(self):
        with tempfile.TemporaryDirectory() as temporary:
            directory = Path(temporary)
            with self.assertRaises(ValueError):
                verify.trx_counts(directory)
            for counters in ["executed='0' passed='0'", "executed='2' passed='1'"]:
                (directory / "a.trx").write_text("<TestRun><ResultSummary><Counters " + counters + "/></ResultSummary></TestRun>")
                with self.assertRaises(ValueError):
                    verify.trx_counts(directory)
            (directory / "a.trx").write_text("<TestRun xmlns='urn:trx'><ResultSummary><Counters executed='2' passed='2'/></ResultSummary></TestRun>")
            self.assertEqual(verify.trx_counts(directory)["executed"], 2)

    def test_test_exit_zero_without_results_fails(self):
        with patch.object(verify.subprocess, "run", return_value=subprocess.CompletedProcess([], 0, "10.0.400", "")):
            report = verify.verify(Path.cwd(), ["Good.csproj"], ["Good.csproj"], None)
        self.assertEqual(report["status"], "FAIL")
        self.assertIn("evidence", report["checks"][-1]["reason"])


if __name__ == "__main__":
    unittest.main()

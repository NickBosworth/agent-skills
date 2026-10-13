"""Actual VSTest evidence, including a passing framework with an empty sibling."""
import importlib.util
import os
from pathlib import Path
import shutil
import tempfile
import unittest

PACKAGE = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("vstest_verify", PACKAGE / "scripts/verify.py")
verify = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(verify)


@unittest.skipUnless(os.environ.get("DNC_DOTNET_TESTS") == "1", "Optional VSTest fixture checks not selected.")
class VSTestTests(unittest.TestCase):
    def test_real_runner_pass_failure_skipped_empty_and_partial_framework(self):
        with tempfile.TemporaryDirectory(prefix="dnc-runner-") as temporary:
            root = Path(temporary)
            shutil.copytree(PACKAGE / "examples/vstest", root, dirs_exist_ok=True)
            shutil.copyfile(PACKAGE / "examples/good/global.json", root / "global.json")
            source = root / "RunnerTests.cs"
            original = source.read_text()
            cases = {
                "passing": (original, "PASS"),
                "failing": (original.replace("Assert.Equal(4,", "Assert.Equal(5,"), "FAIL"),
                "skipped": (original.replace("[Fact]", '[Fact(Skip = "Synthetic skipped case.")]'), "FAIL"),
                "empty": (original.replace("    [Fact]\n", ""), "FAIL"),
                "empty-net10": (original.replace("    [Fact]", "#if NET8_0\n    [Fact]\n#endif"), "FAIL"),
                "repaired": (original, "PASS"),
            }
            for name, (text, expected) in cases.items():
                with self.subTest(case=name):
                    source.write_text(text)
                    report = verify.verify(root, ["./Runner.csproj"], ["./Runner.csproj"], None)
                    self.assertEqual(report["status"], expected)
                    runs = [row for row in report["checks"] if "framework" in row]
                    self.assertTrue(runs, "The case must reach the actual test runner.")
                    if name in {"skipped", "empty", "empty-net10"}:
                        self.assertEqual(runs[-1]["exit_code"], 0)
                        self.assertIn("evidence", runs[-1]["reason"])
                    if name == "failing":
                        self.assertNotEqual(runs[-1]["exit_code"], 0)
                    if expected == "PASS":
                        self.assertEqual([row["framework"] for row in runs], ["net8.0", "net10.0"])
                        self.assertTrue(all(row["tests"]["executed"] == row["tests"]["passed"] == 1 for row in runs))
                    if name == "empty-net10":
                        self.assertEqual([row["status"] for row in runs], ["PASS", "FAIL"])
                        self.assertEqual(runs[-1]["framework"], "net10.0")

    def test_real_subprocess_invalid_utf8_is_blocked(self):
        import sys
        row = verify.run_check("decode", [sys.executable, "-c", "import sys; sys.stdout.buffer.write(bytes([255]))"],
                               Path.cwd(), 10, None)
        self.assertEqual(row["status"], "BLOCKED")
        self.assertIn("UTF-8", row["reason"])

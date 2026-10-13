"""Native MTP execution; no bridge or other framework support is inferred."""
import importlib.util
import os
from pathlib import Path
import shutil
import tempfile
import unittest

PACKAGE = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("mtp_verify", PACKAGE / "scripts/verify.py")
verify = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(verify)


@unittest.skipUnless(os.environ.get("DNC_DOTNET_TESTS") == "1", "Optional real MTP checks not selected.")
class MTPTests(unittest.TestCase):
    def test_native_pass_fail_skip_empty_repair_and_wrong_selection(self):
        with tempfile.TemporaryDirectory(prefix="dnc-mtp-") as temporary:
            root = Path(temporary)
            shutil.copytree(PACKAGE / "examples/mtp", root, dirs_exist_ok=True)
            source = root / "RunnerTests.cs"
            original = source.read_text()
            wrong = verify.verify(root, ["./Runner.csproj"], ["./Runner.csproj"], None)
            self.assertEqual(wrong["status"], "BLOCKED")
            self.assertEqual(wrong["reason_code"], "test-platform-unsupported")
            cases = [(original, "PASS"), (original.replace("AreEqual(4", "AreEqual(5"), "FAIL"),
                     (original.replace("[TestMethod]", "[TestMethod]\n    [Ignore]"), "FAIL"),
                     (original.replace("    [TestMethod]\n", ""), "FAIL"), (original, "PASS")]
            for number, (text, expected) in enumerate(cases):
                with self.subTest(case=number):
                    source.write_text(text)
                    report = verify.verify(root, ["./Runner.csproj"], ["./Runner.csproj"], None,
                                           test_platform="mtp-native")
                    self.assertEqual(report["status"], expected,
                                     "Native MTP gate differed from expected; raw output withheld.")
                    runs = [row for row in report["checks"] if "framework" in row]
                    self.assertTrue(runs, "The case must reach the actual runner.")
                    self.assertIn("--project", runs[-1]["command"])
                    self.assertIn("--report-trx", runs[-1]["command"])
                    if expected == "PASS":
                        self.assertEqual(runs[-1]["tests"]["executed"], 1)
                    if number == 2:
                        # Native MTP reports no executed tests with exit 8, unlike VSTest.
                        self.assertEqual(runs[-1]["exit_code"], 8)


if __name__ == "__main__":
    unittest.main()

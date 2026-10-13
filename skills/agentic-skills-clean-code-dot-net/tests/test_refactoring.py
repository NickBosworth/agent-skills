"""Preserved bindings and revision-bound old-defect detection in isolated outputs."""
import hashlib
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

PACKAGE = Path(__file__).resolve().parents[1]


@unittest.skipUnless(os.environ.get("DNC_DOTNET_TESTS") == "1", "Optional refactoring fixture checks not selected.")
class RefactoringTests(unittest.TestCase):
    def test_preserved_refactoring_and_detected_wrong_variants(self):
        with tempfile.TemporaryDirectory(prefix="dnc-refactor-") as temporary:
            root = Path(temporary)
            shutil.copytree(PACKAGE / "examples/refactoring", root, dirs_exist_ok=True)
            shutil.copyfile(PACKAGE / "examples/good/global.json", root / "global.json")

            def run(configuration):
                build = subprocess.run(["dotnet", "build", "Refactoring.csproj", "-c", configuration,
                                        "-t:Rebuild"], cwd=root, capture_output=True, text=True, timeout=90)
                self.assertEqual(build.returncode, 0, "Fixture did not build; raw output withheld.")
                return subprocess.run(["dotnet", "run", "--project", "Refactoring.csproj", "-c",
                                       configuration, "--no-build"], cwd=root, capture_output=True,
                                      text=True, timeout=90)

            for configuration in ["Debug", "Release"]:
                self.assertEqual(run(configuration).returncode, 0)
            source = root / "ReceiptPublisher.cs"
            original = source.read_text()
            source.write_text(original.replace("public int PublishReceipt(int value) => value * 2;",
                "public int PublishReceipt(int value) => DeliverReceipt(value);\n"
                "    internal int DeliverReceipt(int value) => value * 2;"))
            # These exact inspected callers belong to this symbol, unlike the unrelated type/string.
            for name in ["ReceiptPublisher.Calls.cs", "GeneratedInputs/ReceiptPublisher.cs.in"]:
                path = root / name
                path.write_text(path.read_text().replace("PublishReceipt(", "DeliverReceipt("))
            for configuration in ["Debug", "Release"]:
                self.assertEqual(run(configuration).returncode, 0)
            generated = root / "obj/Release/net10.0/ReceiptPublisher.g.cs"
            self.assertIn("DeliverReceipt(3)", generated.read_text())
            self.assertIn("UnrelatedPublisher.PublishReceipt", (root / "Program.cs").read_text())

            corrected = source.read_text()
            variants = [
                (corrected.replace("value >= 0", "value > 0"), "Inclusive zero boundary contract."),
                (corrected.replace("value + 10", "value + 11"), "Conditional or unrelated binding changed."),
                (corrected.replace("public int PublishReceipt", "internal int PublishReceipt"), "External name contract changed."),
            ]
            test_bytes = (root / "Program.cs").read_bytes()
            test_identity = hashlib.sha256(test_bytes).hexdigest()
            for text, expected_failure in variants:
                with self.subTest(contract=expected_failure):
                    try:
                        source.write_text(text)
                        failed = run("Release")
                        self.assertNotEqual(failed.returncode, 0)
                        self.assertTrue(expected_failure in failed.stdout + failed.stderr,
                                      "Intended contract failure missing; raw output withheld.")
                    finally:
                        source.write_text(corrected)
                    self.assertEqual(run("Release").returncode, 0)
                    self.assertEqual(hashlib.sha256((root / "Program.cs").read_bytes()).hexdigest(), test_identity)


if __name__ == "__main__":
    unittest.main()

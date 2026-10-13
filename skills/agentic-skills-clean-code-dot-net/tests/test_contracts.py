"""Executed Options lifetimes and caller-visible nullable contracts."""
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest
from test_dotnet import diagnostic_codes

PACKAGE = Path(__file__).resolve().parents[1]


@unittest.skipUnless(os.environ.get("DNC_DOTNET_TESTS") == "1", "Optional contract fixture checks not selected.")
class ContractTests(unittest.TestCase):
    def test_runtime_contracts_and_annotation_counterfactuals(self):
        with tempfile.TemporaryDirectory(prefix="dnc-contracts-") as temporary:
            root = Path(temporary)
            shutil.copytree(PACKAGE / "examples/contracts", root, dirs_exist_ok=True)
            shutil.copyfile(PACKAGE / "examples/good/global.json", root / "global.json")

            def command(*arguments):
                return subprocess.run(["dotnet", *arguments], cwd=root, capture_output=True,
                                      text=True, timeout=90)

            result = command("run", "--project", "Contracts.csproj", "-c", "Release")
            self.assertEqual(result.returncode, 0, "Contract fixture failed; raw output withheld.")
            self.assertTrue("PASS: 14 contract checks." in result.stdout, "Contract summary missing; raw output withheld.")
            source = root / "NullableContracts.cs"
            original = source.read_text()
            cases = [("[NotNullWhen(true)] ", "CS8602"),
                     ("    [return: NotNullIfNotNull(nameof(input))]\n", "CS8602"),
                     ("    [MemberNotNull(nameof(_label))]\n", "CS8618")]
            for annotation, diagnostic in cases:
                with self.subTest(annotation=annotation):
                    self.assertIn(annotation, original)
                    try:
                        source.write_text(original.replace(annotation, ""))
                        failed = command("build", "Contracts.csproj", "-c", "Release", "-t:Rebuild")
                        self.assertNotEqual(failed.returncode, 0)
                        self.assertIn(diagnostic, diagnostic_codes(failed.stdout + failed.stderr),
                                      "Expected nullable diagnostic missing; raw output withheld.")
                    finally:
                        source.write_text(original)
                    repaired = command("build", "Contracts.csproj", "-c", "Release", "-t:Rebuild")
                    self.assertEqual(repaired.returncode, 0, "Repaired contract failed; raw output withheld.")


if __name__ == "__main__":
    unittest.main()

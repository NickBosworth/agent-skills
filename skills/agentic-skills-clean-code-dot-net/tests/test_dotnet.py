"""Real SDK checks in a disposable workspace; explicitly opt in with DNC_DOTNET_TESTS=1."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

PACKAGE = Path(__file__).resolve().parents[1]


@unittest.skipUnless(os.environ.get("DNC_DOTNET_TESTS") == "1", "Optional real SDK fixture checks not selected.")
class DotnetTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temporary = tempfile.TemporaryDirectory(prefix="dnc-fixture-")
        cls.root = Path(cls.temporary.name)
        shutil.copytree(PACKAGE / "examples/good", cls.root, dirs_exist_ok=True)
        cls.command("restore", "Good.csproj")
        cls.command("format", "Good.csproj", "--verify-no-changes", "--no-restore")
        cls.command("restore", "SelfCheck/SelfCheck.csproj")
        cls.command("format", "SelfCheck/SelfCheck.csproj", "--verify-no-changes", "--no-restore")
        cls.command("build", "Good.csproj", "-c", "Release", "--no-restore", "-t:Rebuild")

    @classmethod
    def tearDownClass(cls):
        cls.temporary.cleanup()

    @classmethod
    def command(cls, *arguments, succeeds=True):
        result = subprocess.run(["dotnet", *arguments], cwd=cls.root, capture_output=True,
                                text=True, timeout=90, env=dict(os.environ, DOTNET_NOLOGO="1"))
        if succeeds and result.returncode:
            # Only diagnostic IDs, not potentially sensitive raw SDK output.
            import re
            raise AssertionError("SDK command failed: " + ", ".join(sorted(set(re.findall(r"\b(?:CS|CA|IDE)\d+\b", result.stdout + result.stderr)))))
        return result

    def test_good_profile_passes_unchanged_and_format_is_idempotent(self):
        before = {str(path.relative_to(self.root)): path.read_bytes() for path in self.root.glob("*.cs")}
        self.command("format", "Good.csproj", "--verify-no-changes", "--no-restore")
        self.command("format", "Good.csproj", "--no-restore")
        self.assertEqual(before, {str(path.relative_to(self.root)): path.read_bytes() for path in self.root.glob("*.cs")})
        self.assertEqual((PACKAGE / "assets/default.editorconfig").read_bytes(), (self.root / ".editorconfig").read_bytes())
        self.assertEqual((PACKAGE / "assets/Quality.props").read_bytes(), (self.root / "Quality.props").read_bytes())

    def test_compile_and_behavioral_contracts(self):
        self.command("run", "--project", "SelfCheck/SelfCheck.csproj", "-c", "Release")

    def test_real_verifier_passes_without_source_changes(self):
        import sys
        before = {str(path.relative_to(self.root)): path.read_bytes() for path in self.root.rglob("*.cs") if not {"obj", "bin"}.intersection(path.relative_to(self.root).parts)}
        result = subprocess.run([sys.executable, str(PACKAGE / "scripts/verify.py"), "--root", str(self.root), "--target", "Good.csproj", "--no-tests-reason", "SelfCheck runs separately."], capture_output=True, text=True, timeout=90)
        self.assertEqual(result.returncode, 0)
        self.assertEqual(json.loads(result.stdout)["status"], "PASS")
        self.assertEqual(before, {str(path.relative_to(self.root)): path.read_bytes() for path in self.root.rglob("*.cs") if not {"obj", "bin"}.intersection(path.relative_to(self.root).parts)})

    def test_emitted_xml_keeps_inheritance_and_public_contracts(self):
        import xml.etree.ElementTree as ET
        tree = ET.parse(self.root / "bin/Release/net10.0/Good.xml")
        self.assertIsNotNone(tree.find(".//inheritdoc"))
        self.assertTrue(any("PublishAsync" in row.attrib["name"] for row in tree.findall(".//member")))

    def test_injected_diagnostics_fail_then_repaired_fixture_passes(self):
        cases = json.loads((PACKAGE / "examples/violations/cases.json").read_text())
        path = self.root / "Violation.cs"
        config = self.root / ".editorconfig"
        project = self.root / "Good.csproj"
        original_config = config.read_bytes()
        original_project = project.read_bytes()
        for name, case in cases.items():
            with self.subTest(case=name):
                try:
                    path.write_text(case["source"] + "\n")
                    if "editorconfig" in case:
                        config.write_text(config.read_text() + case["editorconfig"])
                    if case.get("framework"):
                        project.write_text(project.read_text().replace("</Project>", '<ItemGroup><FrameworkReference Include="Microsoft.AspNetCore.App" /></ItemGroup></Project>'))
                        self.command("restore", "Good.csproj")
                    # Normalize layout first so the intended diagnostic is the reason tested.
                    self.command("format", "whitespace", "Good.csproj", "--no-restore")
                    result = self.command("build", "Good.csproj", "-c", "Release", "--no-restore", "-t:Rebuild", succeeds=False)
                    self.assertNotEqual(result.returncode, 0)
                    self.assertIn(case["diagnostic"], result.stdout + result.stderr)
                finally:
                    path.unlink(missing_ok=True)
                    config.write_bytes(original_config)
                    project.write_bytes(original_project)
                    if case.get("framework"):
                        self.command("restore", "Good.csproj")
                self.command("build", "Good.csproj", "-c", "Release", "--no-restore", "-t:Rebuild")

    def test_formatting_violation_fails_and_repair_passes(self):
        path = self.root / "ReceiptService.cs"
        original = path.read_bytes()
        try:
            path.write_text(path.read_text().replace("    private readonly", " private readonly"))
            result = self.command("format", "whitespace", "Good.csproj", "--verify-no-changes", "--no-restore", succeeds=False)
            self.assertNotEqual(result.returncode, 0)
            self.command("format", "whitespace", "Good.csproj", "--no-restore")
            self.command("format", "Good.csproj", "--verify-no-changes", "--no-restore")
        finally:
            path.write_bytes(original)


if __name__ == "__main__":
    unittest.main()

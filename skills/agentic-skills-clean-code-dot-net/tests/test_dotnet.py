"""Real SDK checks in a disposable workspace; explicitly opt in with DNC_DOTNET_TESTS=1."""
import json
import os
import re
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

PACKAGE = Path(__file__).resolve().parents[1]


def diagnostic_codes(output):
    return sorted(set(re.findall(r"\b(?:CS|CA|IDE|CP|IL)\d+\b", output)))


class DiagnosticPrivacyTests(unittest.TestCase):
    def test_missing_diagnostic_assertion_withholds_raw_output(self):
        with self.assertRaises(AssertionError) as failure:
            self.assertIn("CS1591", diagnostic_codes("synthetic-private-marker CS8602"))
        self.assertNotIn("synthetic-private-marker", str(failure.exception))
        self.assertIn("CS8602", str(failure.exception))


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
            raise AssertionError("SDK command failed: " + ", ".join(diagnostic_codes(result.stdout + result.stderr)))
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

    def test_verifier_formats_selected_configuration_and_repair_passes(self):
        import sys
        with tempfile.TemporaryDirectory(prefix="conditional-", dir=self.root) as temporary:
            root = Path(temporary)
            (root / "Conditional.csproj").write_text(
                '<Project Sdk="Microsoft.NET.Sdk"><PropertyGroup>'
                '<TargetFramework>net10.0</TargetFramework>'
                '<EnableDefaultCompileItems>false</EnableDefaultCompileItems>'
                '</PropertyGroup><ItemGroup><Compile Include="Common.cs"/>'
                "<Compile Include=\"ReleaseOnly.cs\" Condition=\"'$(Configuration)' == 'Release'\"/>"
                '</ItemGroup></Project>')
            (root / "Common.cs").write_text(
                "namespace Probe;\n\ninternal static class Common\n{\n"
                "    internal static int Value() => 1;\n}\n")
            release_file = root / "ReleaseOnly.cs"
            release_file.write_text(
                "namespace Probe;internal static class ReleaseOnly{internal static int Value()=>1;}\n")
            command = [sys.executable, str(PACKAGE / "scripts/verify.py"), "--root", str(root),
                       "--target", "Conditional.csproj", "--no-tests-reason",
                       "Isolated formatting fixture has no behavioral test project.", "--configuration"]
            for configuration, expected in [("Debug", "PASS"), ("Release", "FAIL")]:
                result = subprocess.run(command + [configuration], capture_output=True, text=True, timeout=90)
                report = json.loads(result.stdout)
                self.assertEqual(report["status"], expected)
                self.assertEqual(result.returncode, 0 if expected == "PASS" else 1)
                if expected == "FAIL":
                    self.assertEqual(report["checks"][-1]["name"], "format-0")
            release_file.write_text(
                "namespace Probe;\n\ninternal static class ReleaseOnly\n{\n"
                "    internal static int Value() => 1;\n}\n")
            result = subprocess.run(command + ["Release"], capture_output=True, text=True, timeout=90)
            self.assertEqual(result.returncode, 0)
            self.assertEqual(json.loads(result.stdout)["status"], "PASS")

    def test_emitted_xml_keeps_inheritance_and_public_contracts(self):
        import xml.etree.ElementTree as ET
        tree = ET.parse(self.root / "bin/Release/net10.0/Good.xml")
        self.assertIsNotNone(tree.find(".//inheritdoc"))
        self.assertTrue(any("PublishAsync" in row.attrib["name"] for row in tree.findall(".//member")))

    def test_package_consumer_and_removed_api_baseline_failure_then_repair(self):
        import zipfile
        import xml.etree.ElementTree as ET
        with tempfile.TemporaryDirectory(prefix="dnc-package-") as temporary:
            directory = Path(temporary)
            feed = directory / "feed"
            pack = ["pack", "Good.csproj", "-c", "Release", "--no-restore", "-warnaserror",
                    "-p:PackageId=CleanCode.Fixture", "-p:EnablePackageValidation=true"]
            self.command(*pack, "-p:PackageVersion=1.0.0", "-o", str(feed))
            baseline = feed / "CleanCode.Fixture.1.0.0.nupkg"
            with zipfile.ZipFile(baseline) as archive:
                self.assertIn("lib/net10.0/Good.dll", archive.namelist())
                self.assertIn("lib/net10.0/Good.xml", archive.namelist())
                tree = ET.fromstring(archive.read("lib/net10.0/Good.xml"))
                self.assertTrue(any("PublishAsync" in row.attrib["name"] for row in tree.findall(".//member")))
            consumer = directory / "consumer"
            consumer.mkdir()
            shutil.copyfile(self.root / "global.json", consumer / "global.json")
            configuration = ET.Element("configuration")
            sources = ET.SubElement(configuration, "packageSources")
            ET.SubElement(sources, "clear")
            ET.SubElement(sources, "add", key="synthetic-local", value=str(feed))
            ET.ElementTree(configuration).write(consumer / "NuGet.Config")
            (consumer / "Consumer.csproj").write_text(
                '<Project Sdk="Microsoft.NET.Sdk"><PropertyGroup><OutputType>Exe</OutputType>'
                '<TargetFramework>net10.0</TargetFramework><RestorePackagesPath>packages</RestorePackagesPath>'
                '</PropertyGroup><ItemGroup><PackageReference Include="CleanCode.Fixture" Version="1.0.0"/>'
                '</ItemGroup></Project>')
            (consumer / "Program.cs").write_text(
                'using CleanCode.Examples;\n'
                'if (new ReceiptView(null).ToString() != string.Empty)\n'
                '{\n    throw new System.InvalidOperationException("Package contract changed.");\n}\n')
            result = subprocess.run(["dotnet", "run", "--project", "Consumer.csproj", "-c", "Release"],
                                    cwd=consumer, capture_output=True, text=True, timeout=90)
            self.assertEqual(result.returncode, 0, "Synthetic local package consumer failed; raw output withheld.")
            source = self.root / "DocumentationExamples.cs"
            original = source.read_bytes()
            compare = pack + ["-p:PackageVersion=1.0.1", "-p:PackageValidationBaselinePath=" + str(baseline),
                              "-o", str(directory / "candidate")]
            try:
                source.write_text(source.read_text().replace("public static TItem? Find", "internal static TItem? Find"))
                failed = self.command(*compare, succeeds=False)
                self.assertNotEqual(failed.returncode, 0)
                self.assertIn("CP0002", diagnostic_codes(failed.stdout + failed.stderr))
            finally:
                source.write_bytes(original)
            self.command(*compare)

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
                    self.assertIn(case["diagnostic"], diagnostic_codes(result.stdout + result.stderr))
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

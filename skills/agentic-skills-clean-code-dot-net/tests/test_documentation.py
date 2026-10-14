"""Separate executable XML structure/behavior evidence from semantic prose review."""
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import unittest
import xml.etree.ElementTree as ET
from test_dotnet import diagnostic_codes

PACKAGE = Path(__file__).resolve().parents[1]
FIXTURE = PACKAGE / "examples/documentation"


def executable_source(source):
    return re.sub(r"(?m)^[ \t]*///[^\n]*\n", "", source)


class DocumentationFixtureTests(unittest.TestCase):
    def test_variants_preserve_all_executable_source(self):
        complete = (FIXTURE / "Contracts.cs").read_text()
        weak = (FIXTURE / "WeakContracts.cs.in").read_text()
        self.assertEqual(executable_source(complete), executable_source(weak))
        self.assertNotEqual(complete, weak)


@unittest.skipUnless(os.environ.get("DNC_DOTNET_TESTS") == "1", "Optional documentation SDK checks not selected.")
class DocumentationSdkTests(unittest.TestCase):
    def test_both_xml_variants_compile_and_preserve_contracts(self):
        with tempfile.TemporaryDirectory(prefix="dnc-documentation-") as temporary:
            root = Path(temporary)
            shutil.copytree(FIXTURE, root, dirs_exist_ok=True)
            shutil.copyfile(PACKAGE / "examples/good/global.json", root / "global.json")
            shutil.copyfile(PACKAGE / "assets/default.editorconfig", root / ".editorconfig")

            def command(*arguments):
                return subprocess.run(["dotnet", *arguments], cwd=root, capture_output=True,
                                      text=True, timeout=90)

            source = root / "Contracts.cs"
            complete = source.read_text()
            reader = root / "Reader.cs"
            original_reader = reader.read_text()
            members = []
            for variant in (complete, (root / "WeakContracts.cs.in").read_text()):
                source.write_text(variant)
                result = command("build", "Documentation.csproj", "-c", "Release", "-t:Rebuild", "-warnaserror")
                self.assertEqual(result.returncode, 0, "XML fixture build failed; raw diagnostics withheld.")
                formatting = command("format", "Documentation.csproj", "--verify-no-changes", "--no-restore")
                self.assertEqual(formatting.returncode, 0, "Fixture formatting failed; raw diagnostics withheld.")
                tree = ET.parse(root / "bin/Release/net10.0/Documentation.xml")
                members.append({node.get("name") for node in tree.findall("./members/member")})
                inherited = tree.find("./members/member[@name='M:CleanCode.Documentation.Reader.ReadAsync(System.Collections.Generic.IReadOnlyList{System.String},System.Threading.CancellationToken)']/inheritdoc")
                self.assertIsNotNone(inherited, "Emitted XML must retain authoritative inheritance.")
                result = command("run", "--project", "Documentation.csproj", "-c", "Release", "--no-build")
                self.assertEqual(result.returncode, 0, "Contract assertions failed; raw diagnostics withheld.")
                self.assertTrue("PASS: 16 documentation contract checks." in result.stdout,
                                "Contract summary missing; raw diagnostics withheld.")
            self.assertEqual(members[0], members[1])
            self.assertTrue({
                "T:CleanCode.Documentation.IBulkReader",
                "T:CleanCode.Documentation.ReadResult",
                "T:CleanCode.Documentation.CatalogRow",
                "P:CleanCode.Documentation.ReadResult.Rows",
                "P:CleanCode.Documentation.ReadResult.Error",
                "P:CleanCode.Documentation.CatalogRow.Id",
                "P:CleanCode.Documentation.CatalogRow.Label",
                "M:CleanCode.Documentation.ReadResult.#ctor(System.Collections.Generic.IReadOnlyList{CleanCode.Documentation.CatalogRow},System.String)",
                "M:CleanCode.Documentation.CatalogRow.#ctor(System.String,System.String)",
                "M:CleanCode.Documentation.IBulkReader.ReadAsync(System.Collections.Generic.IReadOnlyList{System.String},System.Threading.CancellationToken)",
            }.issubset(members[0]), "Public contract XML inventory is incomplete.")
            source.write_text(complete.replace(
                "/// <summary>Reads available synthetic catalog rows for caller-supplied identifiers.</summary>\n", ""))
            missing = command("build", "Documentation.csproj", "-c", "Release", "-t:Rebuild", "-warnaserror")
            self.assertNotEqual(missing.returncode, 0, "Missing interface XML must fail compiler coverage.")
            self.assertIn("CS1591", diagnostic_codes(missing.stdout + missing.stderr),
                          "Expected XML diagnostic missing; raw diagnostics withheld.")
            source.write_text(complete)
            # Both variants passed; retained assertions must still detect real contract defects.
            variants = [
                (original_reader.replace("foreach (string identifier in identifiers)",
                                         "foreach (string identifier in identifiers.Reverse())"),
                 "Documentation contract assertion failed."),
                (original_reader.replace('return new ReadResult([], "Identifiers must not be blank.");',
                                         'throw new ArgumentException("Identifiers must not be blank.");'),
                 "ArgumentException: Identifiers must not be blank."),
            ]
            for defective, expected_failure in variants:
                self.assertNotEqual(defective, original_reader)
                try:
                    reader.write_text(defective)
                    result = command("build", "Documentation.csproj", "-c", "Release", "-t:Rebuild", "-warnaserror")
                    self.assertEqual(result.returncode, 0, "Counterfactual must compile; raw diagnostics withheld.")
                    result = command("run", "--project", "Documentation.csproj", "-c", "Release", "--no-build")
                    self.assertNotEqual(result.returncode, 0, "Expected contract assertion failure.")
                    self.assertTrue(expected_failure in result.stdout + result.stderr,
                                    "Expected failure marker missing; raw diagnostics withheld.")
                finally:
                    reader.write_text(original_reader)
                result = command("run", "--project", "Documentation.csproj", "-c", "Release")
                self.assertEqual(result.returncode, 0, "Repaired fixture failed; raw diagnostics withheld.")


if __name__ == "__main__":
    unittest.main()

#!/usr/bin/env python3
"""Exercise inventory scope, privacy boundaries and honest heuristic reporting.

Tests create disposable directories and Git repositories. They never inspect the
calling project's source, execute its code, or change its Git configuration.
"""

from __future__ import annotations

import json
from pathlib import Path
import shlex
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

import comment_inventory as inventory


class InventoryFixture(unittest.TestCase):
    """Provide disposable files without attaching any tests to the shared fixture."""

    def setUp(self) -> None:
        """Use one disposable review root so fixtures cannot reach project files."""
        self.temp = tempfile.TemporaryDirectory(prefix="comment inventory ")
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name) / "review root"
        self.root.mkdir()

    def write(self, relative: str, content: str | bytes = "value = 1\n") -> Path:
        """Create a fixture with its exact filename, including spaces and newlines."""
        path = self.root / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(content.encode("utf-8") if isinstance(content, str) else content)
        return path

    def scan(self, **kwargs: object) -> dict:
        """Run the public inventory entry point on the disposable root."""
        return inventory.build_inventory(self.root, **kwargs)

    def excluded(self, result: dict) -> dict[str, str]:
        """Index exclusion metadata without relying on the order of traversal."""
        return {item["path"]: item["reason"] for item in result["exclusions"]}


class InventoryTests(InventoryFixture):
    """Check real filesystem boundaries rather than counting implementation calls."""

    def test_filesystem_scope_and_path_escaping(self) -> None:
        """Keep exact filenames while preventing them from escaping the output format."""
        name = "src/a name [1]\nnext.py"
        self.write(name, "SECRET_SENTINEL = 71\n")
        self.write("node_modules/pkg/source.js", "ignored source\n")
        self.write(".gitignore", "ignored.py\n")
        self.write("ignored.py")
        result = self.scan()
        self.assertEqual(result["scope"]["method"], "filesystem")
        self.assertIn(name, [item["path"] for item in result["files"]])
        self.assertIn("ignored.py", [item["path"] for item in result["files"]])
        self.assertEqual(self.excluded(result)["node_modules"], "vendor-generated-or-build-directory")
        serialised = json.dumps(result)
        self.assertNotIn("SECRET_SENTINEL", serialised)
        self.assertIn("\\nnext.py", serialised)
        self.assertIn('"src/a name [1]\\nnext.py"', inventory._text_report(result))
        for bad in ("../outside.py", "/outside.py", "a/../../outside.py", "C:/outside.py", "a\\b.py", "a/./b.py"):
            with self.subTest(bad=bad), self.assertRaises(inventory.SkipFile):
                inventory._parts(bad)

    @unittest.skipUnless(hasattr(Path, "symlink_to"), "Symlinks unavailable")
    def test_symlinks_are_not_followed(self) -> None:
        """Neither a linked file nor a linked directory can add an outside file."""
        outside = Path(self.temp.name) / "outside"
        outside.mkdir()
        (outside / "private.py").write_text("OUTSIDE_SECRET = 123\n")
        try:
            (self.root / "linked.py").symlink_to(outside / "private.py")
            (self.root / "linked-dir").symlink_to(outside, target_is_directory=True)
        except OSError:
            self.skipTest("This account cannot create symbolic links")
        self.write("safe.py")
        result = self.scan(signals=True)
        self.assertEqual([item["path"] for item in result["files"]], ["safe.py"])
        self.assertEqual(self.excluded(result)["linked.py"], "symlink-not-followed")
        self.assertEqual(self.excluded(result)["linked-dir"], "symlink-not-followed")
        self.assertNotIn("private.py", json.dumps(result))
        with inventory.SafeRoot(self.root) as handle:
            with self.assertRaises((inventory.SkipFile, OSError)):
                handle.metadata(("linked-dir", "private.py"))

    def test_secret_names_are_not_opened_for_prefix_reads(self) -> None:
        """Filename exclusions happen before a secret can reach the reader."""
        for name in (".env", ".env.production", "id_rsa", "server.key", "server.pem", "credentials.json", ".docker/config.json"):
            self.write(name, "DO_NOT_READ_OR_PRINT_ME\n")
        self.write(".env.example", "PORT=8080\n")
        self.write(".ssh/hidden.py", "DO_NOT_READ_OR_PRINT_ME\n")
        original = inventory.SafeRoot.prefix
        seen = []

        def observed(handle: inventory.SafeRoot, parts: tuple[str, ...]):
            seen.append("/".join(parts))
            self.assertFalse(inventory._secret_path(parts))
            return original(handle, parts)

        with patch.object(inventory.SafeRoot, "prefix", observed):
            result = self.scan()
        self.assertIn(".env.example", [item["path"] for item in result["files"]])
        self.assertNotIn("DO_NOT_READ_OR_PRINT_ME", json.dumps(result))
        self.assertEqual(self.excluded(result)["server.key"], "possible-secret-or-private-key-name-not-read")
        self.assertIn(".ssh", self.excluded(result))
        if result["inspection"]["safe_prefix_reads_available"]:
            self.assertEqual(seen, [".env.example"])

    def test_no_comment_formats_and_ambiguities(self) -> None:
        """A documentation task must not silently add invalid comments to data."""
        for name in ("data.json", "rows.csv", "rows.tsv", "types.h", "model.m", "script.pl", "fragment.inc", "component.svelte", "notebook.ipynb"):
            self.write(name, "{}\n")
        result = self.scan()
        files = {item["path"]: item for item in result["files"]}
        for name in ("data.json", "rows.csv", "rows.tsv"):
            self.assertEqual(files[name]["comment_support"], "none")
        for name in ("types.h", "model.m", "script.pl", "fragment.inc"):
            self.assertEqual(files[name]["comment_support"], "ambiguous")
        self.assertEqual(files["component.svelte"]["family"], "mixed-template")
        self.assertEqual(files["notebook.ipynb"]["family"], "mixed-template")

    def test_generated_large_binary_and_unknown_exclusions(self) -> None:
        """Report practical ownership/format exclusions without claiming parser certainty."""
        self.write("output.g.cs", "unused\n")
        self.write("service.cs", "// <auto-generated />\nclass Generated {}\n")
        self.write("large.py", b"x" * (inventory.MAX_FILE_BYTES + 1))
        self.write("image.png", b"\x89PNG\x00\x00")
        self.write("binary.py", b"bad\x00bytes")
        self.write("file.unknown", "DO_NOT_READ_UNKNOWN\n")
        self.write("package-lock.json", "{}\n")
        self.write("app.min.js", "a=1;")
        result = self.scan()
        exclusions = self.excluded(result)
        self.assertEqual(exclusions["output.g.cs"], "generated-filename")
        self.assertEqual(exclusions["large.py"], "larger-than-1-MiB")
        self.assertEqual(exclusions["image.png"], "binary-or-container-file-extension")
        self.assertEqual(exclusions["file.unknown"], "unrecognised-file-type-not-read")
        self.assertEqual(exclusions["package-lock.json"], "lock-file")
        self.assertEqual(exclusions["app.min.js"], "minified-file-or-source-map")
        if result["inspection"]["safe_prefix_reads_available"]:
            self.assertEqual(exclusions["service.cs"], "possible-generated-marker-heuristic")
            self.assertEqual(exclusions["binary.py"], "binary-like-or-unrecognised-encoding-prefix")

    def test_prefix_limits_and_signals_are_honest(self) -> None:
        """Signals in strings are possible matches, and content past the cap is unexamined."""
        self.write("example.json", '{"example":"eslint-disable"}\n')
        self.write("formfeed.py", "value = 1\f# noqa\n")
        self.write("capped.py", "# ordinary\n" + "x" * inventory.PREFIX_BYTES + "\n# noqa\n")
        result = self.scan(signals=True)
        self.assertTrue(result["inspection"]["directive_signals_are_heuristic"])
        if result["inspection"]["safe_prefix_reads_available"]:
            matches = [entry for entry in result["signals"] if entry["path"] == "example.json"]
            self.assertEqual(matches, [{"path": "example.json", "line": 1, "marker_class": "linter-or-type-control"}])
            self.assertFalse(any(entry["path"] == "capped.py" for entry in result["signals"]))
            self.assertEqual([entry["line"] for entry in result["signals"]
                              if entry["path"] == "formfeed.py"], [1])
            capped = next(item for item in result["files"] if item["path"] == "capped.py")
            self.assertTrue(capped["prefix_truncated"])
            self.assertEqual(capped["prefix_bytes_read"], inventory.PREFIX_BYTES)
        self.assertFalse({"score", "coverage", "comment_count"} & result.keys())

    def test_include_exclude_and_utf16_source(self) -> None:
        """Globs narrow scope, and BOM-marked source is not mistaken for binary."""
        self.write("root.cs", "// handwritten\nclass C {}\n".encode("utf-16"))
        self.write("src/keep.cs", "class Keep {}\n")
        self.write("src/omit.cs", "class Omit {}\n")
        self.write("script.py")
        self.write("bin/generated.cs")
        result = self.scan(includes=["**/*.cs"], excludes=["*/omit.cs"])
        self.assertEqual({item["path"] for item in result["files"]}, {"root.cs", "src/keep.cs"})
        self.assertEqual(self.excluded(result)["script.py"], "outside-include-globs")
        self.assertEqual(self.excluded(result)["src/omit.cs"], "user-exclude-glob")

    def test_changed_from_never_silently_widens_scope(self) -> None:
        """A missing repository or invalid revision must fail rather than scan everything."""
        self.write("source.py")
        with self.assertRaises(inventory.InventoryError):
            self.scan(changed_from="HEAD")
        for revision in ("--help", "", "-bad", "HEAD\x00"):
            with self.subTest(revision=revision), self.assertRaises(inventory.InventoryError):
                self.scan(changed_from=revision)


@unittest.skipUnless(shutil.which("git"), "Git unavailable")
class GitScopeTests(InventoryFixture):
    """Test Git-specific scope in isolated repositories, including worktree deletions."""

    def git(self, *arguments: str) -> bytes:
        """Run fixture-only Git operations without a shell or persistent identity changes."""
        return subprocess.run(
            ["git", "-C", str(self.root), "-c", "user.name=Inventory Test",
             "-c", "user.email=inventory@example.invalid", *arguments],
            stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True,
        ).stdout

    def initialise(self) -> None:
        """Create a known commit so tests can distinguish committed and local changes."""
        self.git("init", "--quiet")
        self.write(".gitignore", "ignored.py\n")
        for name in ("same.py", "staged.py", "unstaged.py", "deleted.py", "index-only.py", "sub/inside.py", "outside.py"):
            self.write(name, "value = 1\n")
        self.git("add", "--all")
        self.git("commit", "--quiet", "-m", "Fixture baseline")

    def test_git_default_scope_preserves_names_and_ignores(self) -> None:
        """Use tracked plus nonignored untracked paths rather than a whole-tree walk."""
        self.initialise()
        self.write("space name.py")
        self.write("ignored.py")
        result = self.scan()
        self.assertEqual(result["scope"]["method"], "git")
        paths = {item["path"] for item in result["files"]}
        self.assertIn("space name.py", paths)
        self.assertIn("same.py", paths)
        self.assertNotIn("ignored.py", paths)
        self.assertNotIn(".git", self.excluded(result))

    def test_changed_scope_includes_index_worktree_untracked_and_deletion(self) -> None:
        """Include index-only differences even when working content matches the base."""
        self.initialise()
        self.write("staged.py", "value = 2\n")
        self.git("add", "staged.py")
        self.write("unstaged.py", "value = 3\n")
        self.write("index-only.py", "value = 4\n")
        self.git("add", "index-only.py")
        self.write("index-only.py", "value = 1\n")
        self.git("rm", "--quiet", "deleted.py")
        self.write("new file.py")
        self.write("ignored.py")
        result = self.scan(changed_from="HEAD")
        paths = {item["path"] for item in result["files"]}
        self.assertEqual(paths, {"staged.py", "unstaged.py", "index-only.py", "new file.py"})
        self.assertEqual(self.excluded(result)["deleted.py"], "working-tree-path-missing-or-deleted")
        self.assertRegex(result["scope"]["commit"], r"^[0-9a-f]{40,64}$")
        with self.assertRaises(inventory.InventoryError):
            self.scan(changed_from="no-such-revision")

    def test_subdirectory_root_excludes_repo_siblings(self) -> None:
        """Git can discover its parent repository without widening the review boundary."""
        self.initialise()
        self.write("sub/new name.py")
        default = inventory.build_inventory(self.root / "sub")
        self.assertEqual({item["path"] for item in default["files"]}, {"inside.py", "new name.py"})
        self.write("sub/inside.py", "value = 2\n")
        self.write("outside.py", "value = 2\n")
        changed = inventory.build_inventory(self.root / "sub", changed_from="HEAD")
        self.assertEqual({item["path"] for item in changed["files"]}, {"inside.py", "new name.py"})

    def test_inventory_does_not_run_a_configured_clean_filter(self) -> None:
        """A repository's clean-filter program must not execute during an inventory."""
        self.initialise()
        probe = Path(self.temp.name) / "filter probe.py"
        marker = Path(self.temp.name) / "filter-was-run.txt"
        probe.write_text("from pathlib import Path\nimport sys\n"
                         f"Path({str(marker)!r}).write_text('invoked')\n"
                         "sys.stdout.buffer.write(sys.stdin.buffer.read())\n")
        self.git("config", "filter.probe.clean", shlex.join([sys.executable, str(probe)]))
        self.write(".gitattributes", "filtered.py filter=probe\n")
        self.write("filtered.py", "value = 1\n")
        self.git("add", ".gitattributes", "filtered.py")
        self.git("commit", "--quiet", "-m", "Add controlled filter fixture")
        self.assertTrue(marker.exists())
        marker.unlink()
        self.write("filtered.py", "value = 42\n")
        result = self.scan(changed_from="HEAD")
        self.assertIn("filtered.py", [item["path"] for item in result["files"]])
        self.assertFalse(marker.exists(), "Inventory ran the configured clean filter")


if __name__ == "__main__":
    unittest.main()

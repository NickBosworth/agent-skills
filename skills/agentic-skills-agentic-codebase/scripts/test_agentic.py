#!/usr/bin/env python3
"""Black-box regression tests for the local agentic-skills-agentic-codebase helper.

Run with Python 3.10+: ``python -B scripts/test_agentic.py``.
The suite creates disposable repositories, never runs their commands, and uses
only the standard library. Set AGENTIC_TEST_TMPDIR to choose the scratch parent.
"""

from __future__ import annotations

import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import shlex
import shutil
import subprocess
import sys
import tempfile
import unittest


SCRIPT = Path(__file__).with_name("agentic.py")
ASSETS = SCRIPT.parent.parent / "assets"
MANIFEST = ".agents/project.json"


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


class AgenticCliTests(unittest.TestCase):
    """Test user-visible behavior through the shipped command-line entry point."""

    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory(
            prefix="agentic-test-", dir=os.environ.get("AGENTIC_TEST_TMPDIR")
        )
        self.addCleanup(self.temp.cleanup)
        # Some hosts expose their temporary directory through a system symlink
        # (for example /var on macOS). Use its physical path for these fixtures;
        # explicit symlink-boundary tests still create their own linked roots.
        self.base = Path(self.temp.name).resolve()
        self.root = self.base / "repo"
        self.root.mkdir()
        self.outside = self.base / "outside"
        self.outside.mkdir()

    def write(self, path: str, content: str | bytes) -> Path:
        target = self.root / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(content.encode("utf-8") if isinstance(content, str) else content)
        return target

    def snapshot(self, root: Path | None = None) -> dict[str, tuple]:
        """Include directory creation, bytes, and mtimes without following links."""
        root = self.root if root is None else root
        result: dict[str, tuple] = {}
        for directory, dirs, files in os.walk(root, followlinks=False):
            for name in sorted(dirs + files):
                path = Path(directory) / name
                relative = path.relative_to(root).as_posix()
                if path.is_symlink():
                    result[relative] = ("symlink", os.readlink(path))
                elif path.is_dir():
                    result[relative] = ("directory",)
                else:
                    info = path.stat()
                    result[relative] = ("file", path.read_bytes(), info.st_mtime_ns)
        return result

    def invoke(self, command: str, *options: str, root: Path | None = None):
        arguments = [
            sys.executable, "-B", str(SCRIPT), command,
            "--root", str(self.root if root is None else root), *options,
        ]
        environment = os.environ.copy()
        environment["PYTHONDONTWRITEBYTECODE"] = "1"
        return subprocess.run(
            arguments, cwd=self.base, env=environment,
            capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=30,
        )

    def report(self, command: str = "check", *options: str, expected: int = 0,
               root: Path | None = None) -> dict:
        process = self.invoke(command, *options, "--json", root=root)
        self.assertEqual(
            process.returncode, expected,
            f"{process.args!r}\nstdout:\n{process.stdout}\nstderr:\n{process.stderr}",
        )
        try:
            result = json.loads(process.stdout)
        except ValueError as error:
            self.fail(f"CLI did not return a JSON report: {error}\n{process.stdout}\n{process.stderr}")
        self.assertIsInstance(result.get("findings"), list, result)
        self.assertEqual(result["verification"]["semantic"], "not performed")
        return result

    @staticmethod
    def codes(report: dict) -> set[str]:
        return {finding["code"] for finding in report["findings"]}

    def save_manifest(self, manifest: dict) -> None:
        self.write(MANIFEST, json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")

    def project(self) -> dict:
        """A small real fixture with project-owned paths, independent of templates."""
        files = {
            "brief": "handbook/purpose.md",
            "architecture": "handbook/design.md",
            "technology": "handbook/stack.md",
            "workflow": "handbook/work.md",
        }
        for role, path in files.items():
            self.write(path, f"# {role.title()}\n\nThis is an isolated test repository.\n")
        directories = {
            "decisions": "handbook/decisions",
            "tasks": "work-items",
            "skills": ".agents/skills",
        }
        for path in directories.values():
            (self.root / path).mkdir(parents=True, exist_ok=True)
        self.write("AGENTS.md", "# Working agreement\n\nConsult [workflow](handbook/work.md).\n")
        self.write("README.md", "# Example\n\nAn isolated local fixture.\n")
        manifest = {
            "schema_version": 1,
            "standard_version": "1.0.0",
            "profile": "standard",
            "paths": {**files, **directories},
            "instruction_files": ["AGENTS.md"],
            "task_authority": {"kind": "repository", "location": directories["tasks"]},
            "commands": [],
            "reviews": {},
            "exceptions": [],
        }
        self.save_manifest(manifest)
        return manifest

    def task(self, ident: str, *, status: str = "planned", depends=(), validation=()) -> Path:
        return self.write(
            f"work-items/{ident.lower()}.md",
            "---\nkind: task\n"
            f"id: {ident}\nstatus: {status}\n"
            f"depends_on: {json.dumps(list(depends))}\n"
            f"validation: {json.dumps(list(validation))}\n"
            "---\n# Work item\n\nBounded work in this fixture.\n",
        )

    def adr(self, ident: str, *, status: str = "accepted", supersedes=(),
            superseded_by: str | None = None, decision_key: str = "") -> Path:
        return self.write(
            f"handbook/decisions/{ident.lower()}.md",
            "---\nkind: adr\n"
            f"id: {ident}\nstatus: {status}\n"
            f"decision_key: {json.dumps(decision_key)}\nscope: repository\n"
            f"supersedes: {json.dumps(list(supersedes))}\n"
            f"superseded_by: {json.dumps(superseded_by)}\n"
            "---\n# Decision\n\nRationale and consequences belong here.\n",
        )

    def recorded_review(self, document: str, evidence=("README.md",)) -> dict:
        return {
            "reviewed_on": dt.datetime.now(dt.timezone.utc).date().isoformat(),
            "document_sha256": sha256((self.root / document).read_bytes()),
            "evidence": {path: sha256((self.root / path).read_bytes()) for path in evidence},
            "note": "Compared the document against the stated scope in the repository README.",
        }

    def link(self, target: Path, path: Path, *, directory: bool = False) -> None:
        try:
            path.symlink_to(target, target_is_directory=directory)
        except (OSError, NotImplementedError) as error:
            self.skipTest(f"This environment cannot create symlinks: {error}")

    def test_inspect_check_and_scaffold_are_read_only_by_default(self) -> None:
        self.project()
        self.write(".gitignore", "local-state/\n")
        self.write("local-state/keep.txt", "Existing personal state.\n")
        before = self.snapshot()
        self.report("inspect")
        self.report("check")
        self.assertEqual(self.snapshot(), before)

        empty = self.base / "empty"
        empty.mkdir()
        self.report("scaffold", root=empty)
        self.assertEqual(self.snapshot(empty), {})

    def test_vendored_inspector_creates_no_bytecode_without_runtime_flags(self) -> None:
        tool_dir = self.root / "tools" / "agentic"
        tool_dir.mkdir(parents=True)
        for name in ("agentic.py", "agentic_core.py"):
            shutil.copyfile(SCRIPT.parent / name, tool_dir / name)
        before = self.snapshot()
        environment = os.environ.copy()
        environment.pop("PYTHONDONTWRITEBYTECODE", None)
        result = subprocess.run(
            [sys.executable, str(tool_dir / "agentic.py"), "inspect", "--root", str(self.root), "--json"],
            cwd=self.root, env=environment, capture_output=True, text=True, timeout=30,
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        json.loads(result.stdout)
        self.assertEqual(before, self.snapshot())

    def test_legacy_repository_needs_no_manifest_for_generic_checks(self) -> None:
        self.write("AGENTS.md", "# Instructions\n\nRead [README](README.md).\n")
        self.write("README.md", "# Project\n")
        normal = self.report()
        self.assertIn("MANIFEST_MISSING", self.codes(normal))
        strict = self.report("check", "--strict", expected=1)
        self.assertIn("MANIFEST_MISSING", self.codes(strict))
        self.assertFalse((self.root / MANIFEST).exists())

    def test_scaffold_profiles_apply_and_repeat_without_rewriting(self) -> None:
        for profile in ("minimal", "standard"):
            with self.subTest(profile=profile):
                root = self.base / profile
                root.mkdir()
                self.report("scaffold", "--profile", profile, "--apply", root=root)
                self.assertTrue((root / "AGENTS.md").is_file())
                self.assertEqual(json.loads((root / MANIFEST).read_text())["profile"], profile)
                before = self.snapshot(root)
                self.report("scaffold", "--profile", profile, "--apply", root=root)
                self.assertEqual(self.snapshot(root), before, "An identical re-run must be a no-op.")

    def test_scaffold_late_conflict_aborts_before_any_writes(self) -> None:
        catalog = json.loads((ASSETS / "scaffold.json").read_text(encoding="utf-8"))
        destination = catalog["profiles"]["standard"]["files"][-1]["path"]
        self.write(destination, "Existing repository-owned content; preserve this.\n")
        before = self.snapshot()
        self.report("scaffold", "--apply", expected=1)
        self.assertEqual(self.snapshot(), before, "Conflict preflight must precede all writes.")

    def test_scaffold_rejects_symlink_ancestor_before_any_writes(self) -> None:
        self.link(self.outside, self.root / "docs", directory=True)
        self.write("keep.txt", "Preserve me.\n")
        before, outside_before = self.snapshot(), self.snapshot(self.outside)
        self.report("scaffold", "--apply", expected=2)
        self.assertEqual(self.snapshot(), before)
        self.assertEqual(self.snapshot(self.outside), outside_before)

    def test_manifest_corruption_and_unsupported_versions_are_errors(self) -> None:
        baseline = self.project()
        cases = (
            (b"{not json", "MANIFEST_INVALID"),
            (b"[]", "MANIFEST_INVALID"),
            (json.dumps({**baseline, "schema_version": 2}), "MANIFEST_VERSION_UNSUPPORTED"),
            (json.dumps({**baseline, "schema_version": True}), "MANIFEST_VERSION_UNSUPPORTED"),
            (json.dumps({**baseline, "paths": []}), "MANIFEST_INVALID"),
        )
        for content, code in cases:
            with self.subTest(code=code, content=str(content)[:70]):
                self.write(MANIFEST, content)
                before = self.snapshot()
                result = self.report(expected=1)
                self.assertIn(code, self.codes(result))
                self.assertEqual(self.snapshot(), before)

    def test_manifest_path_escape_is_rejected_without_reading_target(self) -> None:
        manifest = self.project()
        secret = "outside-document-body-must-not-be-disclosed"
        (self.outside / "secret.md").write_text(secret, encoding="utf-8")
        manifest["paths"]["brief"] = "../outside/secret.md"
        self.save_manifest(manifest)
        result = self.report(expected=2)
        self.assertNotIn(secret, json.dumps(result))
        self.assertTrue(any(code.startswith("UNSAFE") for code in self.codes(result)))

    def test_symlinked_root_is_rejected(self) -> None:
        alias = self.base / "alias"
        self.link(self.root, alias, directory=True)
        self.report("inspect", root=alias, expected=2)
        self.assertEqual(self.snapshot(), {})

    def test_inspect_skips_symlinks_and_generated_trees(self) -> None:
        self.write("AGENTS.md", "# Real project\n")
        self.write("node_modules/dependency/AGENTS.md", "private-generated-body")
        (self.outside / "SKILL.md").write_text("outside-skill-body", encoding="utf-8")
        self.link(self.outside, self.root / "linked", directory=True)
        result = self.report("inspect")
        serialized = json.dumps(result)
        self.assertNotIn("private-generated-body", serialized)
        self.assertNotIn("outside-skill-body", serialized)
        self.assertNotIn("linked/SKILL.md", serialized)
        self.assertIn("excluded_boundaries", result["data"]["scan"])

    def test_markdown_code_examples_urls_and_fragments_do_not_become_missing_files(self) -> None:
        self.project()
        self.write("handbook/guide (v1).md", "# Guide\n")
        self.write("AGENTS.md", """# Working agreement

[Guide](<handbook/guide (v1).md> "A title")
[Fragment](handbook/work.md#an-anchor-not-validated-here)
[Remote](https://example.invalid/never-fetch-this)
[Mail](mailto:nobody@example.invalid)
`[inline example](missing-inline.md)`

```markdown
[fenced example](missing-fenced.md)
```

~~~markdown
[tilde example](missing-tilde.md)
~~~
""")
        result = self.report()
        self.assertNotIn("LINK_TARGET_MISSING", self.codes(result))
        self.assertNotIn("UNSAFE_LINK", self.codes(result))
        self.write("AGENTS.md", "# Instructions\n\n[Real broken link](missing-real.md)\n")
        self.assertIn("LINK_TARGET_MISSING", self.codes(self.report(expected=1)))

    def test_relative_link_cannot_escape_the_selected_root(self) -> None:
        (self.outside / "secret.md").write_text("unreadable-private-body", encoding="utf-8")
        self.write("AGENTS.md", "# Instructions\n\n[Escape](../outside/secret.md)\n")
        result = self.report(expected=2)
        self.assertIn("UNSAFE_LINK", self.codes(result))
        self.assertNotIn("unreadable-private-body", json.dumps(result))

    def test_unicode_paths_and_percent_encoded_file_links(self) -> None:
        manifest = self.project()
        unicode_path = "handbook/設計 résumé.md"
        self.write(unicode_path, "# 設計\n\nThe project design.\n")
        manifest["paths"]["architecture"] = unicode_path
        self.save_manifest(manifest)
        self.write("AGENTS.md", "# Instructions\n\n[Design](handbook/設計%20résumé.md)\n")
        result = self.report()
        self.assertNotIn("LINK_TARGET_MISSING", self.codes(result))
        self.assertIn(unicode_path, {f["path"] for f in result["findings"]})

    def test_unresolved_markers_do_not_flag_ordinary_unknown_prose(self) -> None:
        self.project()
        document = "handbook/design.md"
        self.write(document, "# Architecture\n\nReject unknown fields. Global settings are unknown.\n")
        self.assertNotIn("UNRESOLVED_CONTENT", self.codes(self.report()))
        for content in (
            "# Architecture\n\nUNKNOWN: Define the component boundaries.\n",
            "# Architecture\n\n| Decision | Choice |\n| --- | --- |\n| Storage | UNKNOWN |\n",
        ):
            with self.subTest(content=content):
                self.write(document, content)
                findings = self.report()["findings"]
                self.assertTrue(any(f["code"] == "UNRESOLVED_CONTENT" and f["path"] == document for f in findings))

    def test_task_graph_detects_cycles_missing_and_self_dependencies(self) -> None:
        self.project()
        self.task("TASK-0001", depends=("TASK-0002",))
        self.task("TASK-0002", depends=("TASK-0001",))
        self.task("TASK-0003", depends=("TASK-4040", "TASK-0003"))
        self.write("work-items/README.md", "# Work queue\n\nThis index is not a task record.\n")
        before = self.snapshot()
        result = self.report(expected=1)
        self.assertTrue({"TASK_DEPENDENCY_CYCLE", "TASK_DEPENDENCY_MISSING", "TASK_SELF_DEPENDENCY"} <= self.codes(result))
        self.assertNotIn("TASK_ID_MISSING", self.codes(result))
        self.assertEqual(self.snapshot(), before)

    def test_done_task_requires_meaningful_validation(self) -> None:
        self.project()
        for evidence in ((), ("TODO",), ("UNKNOWN",), ("",), ("not run",), ("not tested",), ("unverified",)):
            with self.subTest(evidence=evidence):
                self.task("TASK-0001", status="done", validation=evidence)
                self.assertIn("TASK_DONE_WITHOUT_EVIDENCE", self.codes(self.report(expected=1)))
        self.task("TASK-0001", status="done", validation=("python -m unittest: 12 tests passed in the recorded review.",))
        self.assertNotIn("TASK_DONE_WITHOUT_EVIDENCE", self.codes(self.report()))

    def test_ready_tasks_cannot_treat_cancelled_dependencies_as_complete(self) -> None:
        self.project()
        self.task("TASK-0001", status="cancelled")
        self.task("TASK-0002", status="ready", depends=("TASK-0001",))
        self.assertIn("TASK_DEPENDENCY_UNFINISHED", self.codes(self.report(expected=1)))
        self.task("TASK-0001", status="done", validation=("The required prerequisite output was independently checked.",))
        self.assertNotIn("TASK_DEPENDENCY_UNFINISHED", self.codes(self.report()))

    def test_adr_supersession_requires_reciprocal_references(self) -> None:
        self.project()
        self.adr("ADR-0001", status="superseded", superseded_by="ADR-0002", decision_key="storage")
        self.adr("ADR-0002", supersedes=("ADR-0001",), decision_key="storage")
        self.assertNotIn("ADR_SUPERSESSION_NOT_RECIPROCAL", self.codes(self.report()))
        self.adr("ADR-0002", decision_key="storage")
        before = self.snapshot()
        self.assertIn("ADR_SUPERSESSION_NOT_RECIPROCAL", self.codes(self.report(expected=1)))
        self.assertEqual(self.snapshot(), before, "Checks must not rewrite decision history.")

    def test_adr_supersession_cycles_are_structural_errors(self) -> None:
        self.project()
        self.adr("ADR-0001", status="superseded", supersedes=("ADR-0002",), superseded_by="ADR-0002")
        self.adr("ADR-0002", status="superseded", supersedes=("ADR-0001",), superseded_by="ADR-0001")
        self.assertIn("ADR_SUPERSESSION_CYCLE", self.codes(self.report(expected=1)))

    def test_multiple_accepted_adr_keys_require_review_without_choosing_a_winner(self) -> None:
        self.project()
        self.adr("ADR-0001", decision_key="storage")
        self.adr("ADR-0002", decision_key="storage")
        before = self.snapshot()
        result = self.report()
        collisions = [f for f in result["findings"] if f["code"] == "ADR_ACCEPTED_KEY_COLLISION"]
        self.assertEqual(len(collisions), 2)
        self.assertTrue(all(f["severity"] == "warning" for f in collisions))
        self.assertEqual(self.snapshot(), before)

    def test_record_review_plans_then_updates_only_the_selected_entry(self) -> None:
        manifest = self.project()
        retained = "handbook/stack.md"
        selected = "handbook/design.md"
        manifest["reviews"][retained] = self.recorded_review(retained)
        manifest["retained_extension"] = {"project_owned": "Preserve unknown extension fields."}
        self.save_manifest(manifest)
        options = (
            "--document", selected, "--evidence", "README.md",
            "--note", "Compared the architecture boundaries against the current README.",
        )
        before = self.snapshot()
        plan = self.invoke("record-review", *options)
        self.assertEqual(plan.returncode, 0, plan.stdout + plan.stderr)
        self.assertEqual(self.snapshot(), before)
        applied = self.invoke("record-review", *options, "--apply")
        self.assertEqual(applied.returncode, 0, applied.stdout + applied.stderr)
        after = json.loads((self.root / MANIFEST).read_text(encoding="utf-8"))
        new_entry = after["reviews"].pop(selected)
        self.assertEqual(after, manifest)
        self.assertEqual(new_entry["document_sha256"], sha256((self.root / selected).read_bytes()))
        self.assertEqual(new_entry["evidence"], {"README.md": sha256((self.root / "README.md").read_bytes())})
        self.assertEqual(dt.date.fromisoformat(new_entry["reviewed_on"]), dt.datetime.now(dt.timezone.utc).date())
        unchanged = self.snapshot()
        unchanged.pop(MANIFEST)
        before.pop(MANIFEST)
        self.assertEqual(unchanged, before)

    def test_record_review_apply_preserves_an_existing_lock_and_registry(self) -> None:
        manifest = self.project()
        manifest["reviews"]["handbook/stack.md"] = self.recorded_review("handbook/stack.md")
        self.save_manifest(manifest)
        self.write(".agents/.project-review.lock", "Another writer owns this lock; preserve it.\n")
        for content in ((self.root / MANIFEST).read_bytes(), b"{write-in-progress"):
            with self.subTest(manifest_complete=content.startswith(b'{\n')):
                self.write(MANIFEST, content)
                before = self.snapshot()
                result = self.report(
                    "record-review", "--document", "handbook/design.md", "--evidence", "README.md",
                    "--note", "Compared the architecture boundaries against the current README.",
                    "--apply", expected=1,
                )
                self.assertIn("REVIEW_LOCKED", self.codes(result))
                self.assertNotIn("MANIFEST_INVALID", self.codes(result), "The lock must be checked before reading another writer's registry.")
                self.assertEqual(self.snapshot(), before, "A failed lock acquisition must not remove the owner's lock or alter files.")

    def test_record_review_preview_under_existing_lock_stays_read_only(self) -> None:
        self.project()
        self.write(".agents/.project-review.lock", "Existing writer's lock.\n")
        before = self.snapshot()
        result = self.report(
            "record-review", "--document", "handbook/design.md", "--evidence", "README.md",
            "--note", "Compared the architecture boundaries against the current README.",
        )
        self.assertNotIn("REVIEW_LOCKED", self.codes(result))
        self.assertEqual(self.snapshot(), before, "Preview must not acquire, replace, or remove the existing lock.")

    def test_record_review_success_releases_its_lock_and_retains_earlier_reviews(self) -> None:
        manifest = self.project()
        retained = "handbook/stack.md"
        manifest["reviews"][retained] = self.recorded_review(retained)
        self.save_manifest(manifest)
        expected_reviews = dict(manifest["reviews"])
        lock = self.root / ".agents/.project-review.lock"
        for document in ("handbook/design.md", "handbook/purpose.md"):
            with self.subTest(document=document):
                self.report(
                    "record-review", "--document", document, "--evidence", "README.md",
                    "--note", "Compared the document against the current scope in the README.", "--apply",
                )
                self.assertFalse(lock.exists(), "The successful writer must release its own lock.")
                after = json.loads((self.root / MANIFEST).read_text(encoding="utf-8"))
                for earlier, record in expected_reviews.items():
                    self.assertEqual(after["reviews"][earlier], record)
                self.assertEqual(set(after["reviews"]), set(expected_reviews) | {document})
                expected_reviews = after["reviews"]

    def test_changed_review_document_evidence_and_deleted_source_are_reported(self) -> None:
        manifest = self.project()
        document = "handbook/design.md"
        manifest["reviews"][document] = self.recorded_review(document)
        self.save_manifest(manifest)
        clean = self.report()
        self.assertNotIn("REVIEW_CONTENT_CHANGED", self.codes(clean))
        self.assertNotIn("REVIEW_EVIDENCE_CHANGED", self.codes(clean))
        self.write(document, "# Revised architecture\n")
        self.write("README.md", "# Revised requirements\n")
        before = (self.root / MANIFEST).read_bytes()
        changed = self.report()
        self.assertTrue({"REVIEW_CONTENT_CHANGED", "REVIEW_EVIDENCE_CHANGED"} <= self.codes(changed))
        self.assertEqual((self.root / MANIFEST).read_bytes(), before)
        (self.root / "README.md").unlink()
        self.assertIn("REVIEW_EVIDENCE_MISSING", self.codes(self.report()))

    def test_record_review_rejects_escape_symlink_and_self_referential_evidence(self) -> None:
        self.project()
        (self.outside / "evidence.md").write_text("External evidence.\n", encoding="utf-8")
        self.link(self.outside / "evidence.md", self.root / "linked.md")
        before = self.snapshot()
        for evidence in ("../outside/evidence.md", "linked.md", MANIFEST):
            with self.subTest(evidence=evidence):
                process = self.invoke(
                    "record-review", "--document", "handbook/design.md",
                    "--evidence", evidence, "--note", "Compared claims against local evidence.", "--apply",
                )
                self.assertIn(process.returncode, (1, 2), process.stdout + process.stderr)
                self.assertEqual(self.snapshot(), before)

    def test_package_scripts_are_inventory_data_and_never_executed(self) -> None:
        manifest = self.project()
        self.write("package.json", json.dumps({
            "name": "fixture",
            "scripts": {"test": "echo DO-NOT-PRINT-THIS-SCRIPT > EXECUTED.txt"},
        }))
        manifest["commands"] = [{
            "id": "test", "run": "npm test", "cwd": ".",
            "source": "package.json", "status": "unverified", "evidence": "",
        }]
        self.save_manifest(manifest)
        before = self.snapshot()
        inventory = self.report("inspect")
        check = self.report()
        self.assertNotIn("DO-NOT-PRINT-THIS-SCRIPT", json.dumps(inventory))
        self.assertNotIn("DO-NOT-PRINT-THIS-SCRIPT", json.dumps(check))
        self.assertFalse((self.root / "EXECUTED.txt").exists())
        self.assertEqual(self.snapshot(), before)
        self.assertIn("COMMAND_EXECUTION_NOT_PERFORMED", self.codes(check))
        manifest["commands"][0]["status"] = "verified"
        self.save_manifest(manifest)
        self.assertIn("COMMAND_EVIDENCE_MISSING", self.codes(self.report(expected=1)))

    @unittest.skipUnless(shutil.which("git") and os.name == "posix", "Git shell fixture requires Git on a POSIX host.")
    def test_git_inventory_does_not_execute_repo_fsmonitor_or_clean_filter(self) -> None:
        self.project()
        environment = os.environ.copy()
        environment.update({"GIT_CONFIG_NOSYSTEM": "1", "GIT_CONFIG_GLOBAL": os.devnull})

        def git(*arguments: str) -> None:
            process = subprocess.run(
                ["git", "-c", f"core.hooksPath={os.devnull}", "-C", str(self.root), *arguments],
                env=environment, capture_output=True, text=True, timeout=15,
            )
            self.assertEqual(process.returncode, 0, process.stdout + process.stderr)

        git("init", "--quiet")
        payload = self.write("tracked.payload", "payload-A\n")
        git("add", "--", "tracked.payload")
        trap = self.write("local-trap.py", """import pathlib
import sys

root = pathlib.Path(__file__).parent
(root / ("EXECUTED-" + sys.argv[1])).write_text("A repository executable ran.")
if sys.argv[1] == "filter":
    sys.stdout.buffer.write(sys.stdin.buffer.read())
""")
        executable = f"{shlex.quote(sys.executable)} {shlex.quote(str(trap))}"
        git("config", "core.fsmonitor", executable + " fsmonitor")
        git("config", "filter.fixture.clean", executable + " filter")
        git("config", "filter.fixture.required", "true")
        self.write(".gitattributes", "*.payload filter=fixture\n")
        self.write("tracked.payload", "payload-B\n")
        info = payload.stat()
        os.utime(payload, ns=(info.st_atime_ns, info.st_mtime_ns + 5_000_000_000))
        before = self.snapshot()
        result = self.report("inspect")
        self.report("check")
        self.assertTrue(result["data"]["git"]["available"], "The test must exercise Git inventory, not only a fallback.")
        self.assertFalse((self.root / "EXECUTED-fsmonitor").exists())
        self.assertFalse((self.root / "EXECUTED-filter").exists())
        self.assertEqual(self.snapshot(), before)

    def test_scan_limit_is_visible_and_cannot_be_waived_as_a_complete_scan(self) -> None:
        manifest = self.project()
        manifest["exceptions"] = [{
            "code": "SCAN_INCOMPLETE", "path": ".",
            "reason": "Trying to hide an incomplete bounded scan must not succeed.",
            "expires": "2099-01-01",
        }]
        self.save_manifest(manifest)
        result = self.report("inspect", "--max-files", "2")
        self.assertIn("SCAN_INCOMPLETE", self.codes(result))
        self.assertFalse(result["data"]["scan"]["complete"])
        checked = self.report("check", "--max-files", "2", expected=1)
        self.assertIn("EXCEPTION_INVALID", self.codes(checked))
        self.assertTrue(any(f["code"] == "SCAN_INCOMPLETE" and f["severity"] != "info" for f in checked["findings"]))

    def test_external_tracker_is_declared_authority_without_local_task_records(self) -> None:
        manifest = self.project()
        manifest["task_authority"] = {"kind": "external", "location": "https://tracker.example.invalid/team/project"}
        self.save_manifest(manifest)
        self.write("work-items/README.md", "# Execution plans\n\nThe external tracker owns task status.\n")
        before = self.snapshot()
        result = self.report()
        self.assertIn("EXTERNAL_TASK_AUTHORITY", self.codes(result))
        self.assertEqual(result["data"]["task_records"], 0)
        self.assertFalse(any(code.startswith("TASK_") for code in self.codes(result)))
        self.assertEqual(self.snapshot(), before)

    def test_adapter_copy_receipts_detect_drift_without_overwriting(self) -> None:
        manifest = self.project()
        source, target = ".agents/skills/example/SKILL.md", ".claude/skills/example/SKILL.md"
        body = "---\nname: example\ndescription: Inspect this isolated fixture.\n---\n# Example\n"
        self.write(source, body)
        self.write(target, body)
        digest = sha256(body.encode("utf-8"))
        manifest["adapters"] = [{
            "tool": "Claude Code", "verification": "documentation-only",
            "generated": [{"source": source, "target": target, "mode": "copy",
                           "source_sha256": digest, "target_sha256": digest}],
        }]
        self.save_manifest(manifest)
        mirrored = self.report()
        self.assertNotIn("SKILL_ID_DUPLICATE", self.codes(mirrored))
        self.assertNotIn("ADAPTER_COPY_DRIFT", self.codes(mirrored))
        self.assertIn("ADAPTER_RUNTIME_NOT_TESTED", self.codes(mirrored))
        self.write(target, body + "\nLocal manual edit.\n")
        before = self.snapshot()
        drifted = self.report()
        self.assertTrue({"ADAPTER_COPY_DRIFT", "ADAPTER_CONTENT_CHANGED"} <= self.codes(drifted))
        self.assertIn("SKILL_ID_DUPLICATE", self.codes(drifted))
        self.assertEqual(self.snapshot(), before)

    def test_skill_frontmatter_accepts_folded_description_but_flags_unknown_yaml(self) -> None:
        self.project()
        path = ".agents/skills/local-check/SKILL.md"
        self.write(path, "---\nname: local-check\ndescription: >-\n  Inspect local state\n  using bounded read-only checks.\n---\n# Local check\n")
        valid = self.report()
        self.assertFalse(any(code.startswith("SKILL_") for code in self.codes(valid)))
        self.write(path, "---\nname: local-check\ndescription: &description Inspect local state.\n---\n# Local check\n")
        uncertain = self.report()
        self.assertIn("SKILL_FRONTMATTER_UNSUPPORTED", self.codes(uncertain))

    def test_review_exceptions_match_exact_paths_and_expired_records_do_not_suppress(self) -> None:
        manifest = self.project()
        document = manifest["paths"]["brief"]
        tomorrow = dt.datetime.now(dt.timezone.utc).date() + dt.timedelta(days=1)
        manifest["exceptions"] = [{
            "code": "REVIEW_MISSING", "path": document,
            "reason": "A human review is scheduled for the next working day.",
            "expires": tomorrow.isoformat(),
        }]
        self.save_manifest(manifest)
        result = self.report()
        missing = {finding["path"]: finding for finding in result["findings"] if finding["code"] == "REVIEW_MISSING"}
        self.assertEqual(missing[document]["severity"], "info")
        self.assertEqual(missing[manifest["paths"]["architecture"]]["severity"], "warning")
        manifest["exceptions"][0]["expires"] = "2000-01-01"
        self.save_manifest(manifest)
        expired = self.report()
        self.assertIn("EXCEPTION_EXPIRED", self.codes(expired))
        remaining = [f for f in expired["findings"] if f["code"] == "REVIEW_MISSING" and f["path"] == document]
        self.assertEqual(remaining[0]["severity"], "warning")


if __name__ == "__main__":
    unittest.main(verbosity=2)

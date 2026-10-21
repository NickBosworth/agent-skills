"""Regression coverage for exposure, source identity and evidence boundaries."""
import json
from pathlib import Path
import tempfile
import unittest

from prepare_trial import OPERATIONAL, copy_operational, identity, prepare, snapshot


class PreparationTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.package = self.root / "package"
        self.package.mkdir()
        for name in OPERATIONAL:
            path = self.package / name
            if "." in name:
                path.write_text(name + "\n")
            else:
                path.mkdir()
                (path / "operational.md").write_text("Operational guidance.\n")
        fixture = self.package / "evals" / "fixtures" / "sample"
        fixture.mkdir(parents=True)
        (fixture / "Source.cs").write_text("class Source {}\n")
        for name in ["evals/answers.json", "VALIDATION.md", "CHANGELOG.md", "README.md"]:
            (self.package / name).write_text("Maintenance answers.\n")

    def test_operational_view_withholds_maintenance(self):
        target = self.root / "view"
        copy_operational(self.package, target)
        self.assertEqual(set(OPERATIONAL), {path.name for path in target.iterdir()})
        self.assertNotIn("answers.json", " ".join(snapshot(target)))
        self.assertEqual(snapshot(self.package / "references"), snapshot(target / "references"))

    def test_arms_share_raw_inputs_without_baseline_skill(self):
        skilled = prepare(self.package, "sample", self.root / "skilled", "skill")
        baseline = prepare(self.package, "sample", self.root / "baseline", "baseline")
        self.assertEqual(skilled["input_identity"], baseline["input_identity"])
        self.assertFalse((self.root / "baseline" / "skill").exists())
        self.assertEqual(skilled, json.loads((self.root / "skilled/manifest.json").read_text()))

    def test_existing_evidence_is_not_overwritten(self):
        target = self.root / "trial"
        prepare(self.package, "sample", target, "skill")
        before = snapshot(target)
        with self.assertRaises(FileExistsError):
            prepare(self.package, "sample", target, "skill")
        self.assertEqual(before, snapshot(target))

    def test_rejects_evidence_in_package_or_checkout(self):
        with self.assertRaises(ValueError):
            prepare(self.package, "sample", self.package / "output", "skill")
        checkout = self.root / "checkout"
        checkout.mkdir()
        (checkout / ".git").write_text("gitdir: elsewhere\n")
        with self.assertRaises(ValueError):
            prepare(self.package, "sample", checkout / "output", "skill")

    def test_rejects_traversal_and_unknown_arm(self):
        for name, arm in [("../sample", "skill"), ("missing", "skill"), ("sample", "other")]:
            with self.assertRaises(ValueError):
                prepare(self.package, name, self.root / "output", arm)

    def test_rejects_source_symlinks_including_build_directories(self):
        (self.package / "bin").symlink_to(self.root, target_is_directory=True)
        with self.assertRaises(ValueError):
            copy_operational(self.package, self.root / "view")

    def test_identity_changes_only_with_source_bytes(self):
        source = self.package / "evals/fixtures/sample"
        before = identity(snapshot(source))
        (source / "obj").mkdir()
        (source / "obj/cache").write_text("Build artifact.\n")
        self.assertEqual(before, identity(snapshot(source)))
        (source / "Source.cs").write_text("class Changed {}\n")
        self.assertNotEqual(before, identity(snapshot(source)))

    def test_missing_snapshot_is_not_empty_success(self):
        with self.assertRaises(ValueError):
            snapshot(self.root / "missing")

    def test_omits_build_output_from_raw_and_operational_copies(self):
        for parent in [self.package / "examples", self.package / "evals/fixtures/sample"]:
            output = parent / "bin"
            output.mkdir()
            (output / "private-cache").symlink_to(self.root, target_is_directory=True)
        prepare(self.package, "sample", self.root / "trial", "skill")
        self.assertFalse((self.root / "trial/work/bin").exists())
        self.assertFalse((self.root / "trial/skill/examples/bin").exists())


if __name__ == "__main__":
    unittest.main()

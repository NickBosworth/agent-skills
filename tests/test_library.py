"""Regression tests for actual publication boundaries, not generated checklist counts."""
import hashlib
import json
from pathlib import Path
import struct
import subprocess
import sys
import tempfile
import unittest
import zlib

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools"))
from check_library import frontmatter, history_errors, identity_errors, location, package_errors, privacy_errors, root_reference_errors, staged_files
from release import build


def png(chunks=()):
    """Create a minimal real PNG and optionally insert metadata for rejection tests."""
    def chunk(kind, data):
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data))
    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", 1, 1, 8, 2, 0, 0, 0))
            + b"".join(chunk(k, d) for k, d in chunks)
            + chunk(b"IDAT", zlib.compress(b"\x00\xff\xff\xff")) + chunk(b"IEND", b""))


class PublicBytesTests(unittest.TestCase):
    def test_reserved_examples_are_allowed(self):
        self.assertEqual(privacy_errors("example.txt", b"person@example.invalid https://shop.example/"), [])

    def test_private_email_is_rejected_without_value(self):
        value = "private" + "@" + "mail-provider.com"
        errors = privacy_errors("fixture.txt", value.encode())
        self.assertTrue(errors)
        self.assertNotIn(value, str(errors))

    def test_provider_key_is_rejected(self):
        self.assertTrue(privacy_errors("fixture.txt", ("sk-" + "a" * 30).encode()))

    def test_embedded_basic_auth_is_rejected(self):
        value = b"https://user:" + b"password" + b"@service.example/"
        self.assertTrue(privacy_errors("fixture.txt", value))

    def test_known_synthetic_parser_fixture_is_narrow(self):
        self.assertEqual(privacy_errors("fixture.py", b"https://name:secret@shop.example/"), [])
        value = b"https://name:secret@shop.example/ " + b"https://user:" + b"password" + b"@other.example/"
        self.assertTrue(privacy_errors("fixture.py", value))

    def test_home_paths_are_rejected(self):
        for path in ["/" + "Users/" + "fictional-person/work", "/" + "home/" + "fictional-person/work", "C:" + "\\Users\\" + "fictional-person\\work"]:
            self.assertTrue(privacy_errors("example.txt", path.encode()))

    def test_filename_is_a_privacy_boundary(self):
        value = "private" + "@" + "mail-provider.com" + ".txt"
        self.assertTrue(privacy_errors(value, b"safe body"))
        self.assertNotIn(value, location(value))

    def test_local_artifacts_are_rejected(self):
        for name in [".DS_Store", ".env.production", "a/__pycache__/x.pyc", "dist/report.txt", "session.log", "backup.zip", ".codex/session.json"]:
            self.assertTrue(privacy_errors(name, b"safe"), name)

    def test_symlinks_and_unknown_binary_fail_closed(self):
        self.assertTrue(privacy_errors("linked.txt", b"target", "120000"))
        self.assertTrue(privacy_errors("image.jpg", b"\xff\xd8\x00"))

    def test_clean_png_allowed_metadata_rejected(self):
        self.assertEqual(privacy_errors("image.png", png()), [])
        self.assertTrue(privacy_errors("image.png", png([(b"tEXt", b"Author\x00private")])) )

    def test_malformed_png_rejected(self):
        for data in [b"not an image", png()[:-1], png() + b"private-trailer"]:
            self.assertTrue(privacy_errors("image.png", data))

    def test_overlarge_content_rejected(self):
        self.assertTrue(privacy_errors("large.txt", b"a" * 2_000_001))

    def test_duplicate_yaml_and_unsafe_tags_rejected(self):
        with self.assertRaises(ValueError):
            frontmatter("---\nname: first\nname: second\n---\n")
        with self.assertRaises(Exception):
            frontmatter("---\nname: !!python/object:danger {}\n---\n")


class RepositoryTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="agentic-skills-check-")
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name).resolve() / "repo"
        self.root.mkdir()
        self.git("init", "-q")
        self.git("config", "user.name", "agentic-skills contributors")
        self.git("config", "user.email", "contributors@example.invalid")

    def git(self, *arguments):
        return subprocess.check_output(["git", "-C", str(self.root), *arguments], stderr=subprocess.DEVNULL)

    def write(self, name, text):
        p = self.root / name
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(text)
        return p

    def test_staged_secret_is_not_hidden_by_clean_worktree(self):
        address = "private" + "@" + "mail-provider.com"
        p = self.write("example.txt", address)
        self.git("add", "example.txt")
        p.write_text("clean")
        staged = staged_files(self.root)
        self.assertTrue(privacy_errors(*staged[0]))
        self.assertEqual(privacy_errors("example.txt", p.read_bytes()), [])

    def test_staged_deletion_does_not_read_deleted_file(self):
        self.write("example.txt", "safe")
        self.git("add", ".")
        self.git("commit", "-qm", "Add synthetic fixture")
        self.git("rm", "example.txt")
        self.assertEqual(staged_files(self.root), [])

    def test_deleted_historical_contact_is_detected(self):
        self.write("contact.txt", "private" + "@" + "mail-provider.com")
        self.git("add", ".")
        self.git("commit", "-qm", "Add synthetic fixture")
        self.git("rm", "contact.txt")
        self.git("commit", "-qm", "Remove fixture")
        self.assertTrue(history_errors(self.root))

    def test_git_identity_is_inspected(self):
        self.write("example.txt", "safe")
        self.git("add", ".")
        self.git("-c", "user.email=" + "private" + "@" + "mail-provider.com", "commit", "-qm", "Add synthetic fixture")
        self.assertTrue(history_errors(self.root))

    def test_public_safe_history_passes(self):
        self.write("example.txt", "safe")
        self.git("add", ".")
        self.git("commit", "-qm", "Add synthetic fixture")
        self.assertEqual(history_errors(self.root), [])

    def test_effective_identity_is_checked_before_commit(self):
        self.assertEqual(identity_errors(self.root), [])
        self.git("config", "user.email", "private" + "@" + "mail-provider.com")
        self.assertTrue(identity_errors(self.root))

    def test_annotated_tag_identity_is_inspected(self):
        self.write("example.txt", "safe")
        self.git("add", ".")
        self.git("commit", "-qm", "Add synthetic fixture")
        self.git("-c", "user.email=" + "private" + "@" + "mail-provider.com", "tag", "-a", "fixture", "-m", "Synthetic tag")
        self.assertTrue(history_errors(self.root))

    def test_repository_document_links_are_checked(self):
        self.write("docs/guide.md", "# Guide")
        data = b"[valid](docs/guide.md) [missing](missing.md) [escape](../outside.md)"
        self.assertEqual(len(root_reference_errors(self.root, [("README.md", data, "100644")])), 2)

    def package(self):
        name = "agentic-skills-fixture"
        base = "skills/" + name + "/"
        self.write(base + "SKILL.md", "---\nname: " + name + "\ndescription: Exercise synthetic fixtures.\nlicense: CC0-1.0\nmetadata:\n  version: '2.0.0'\n---\n# Fixture\n")
        self.write(base + "README.md", "# Synthetic fixture\n")
        self.write(base + "LICENSE", "Synthetic fixture licence text\n")
        self.write(base + "agents/openai.yaml", "interface:\n  display_name: 'agentic-skills · Fixture'\n  short_description: 'Exercise synthetic package fixtures'\n  default_prompt: 'Use $" + name + " to inspect this fixture.'\n")
        self.write(base + "evals/scenarios.json", json.dumps({"scenarios": [{"id": "case", "prompt": "fixture", "expected": ["safe"], "must_not": ["unsafe"]}]}))
        self.write("catalog.json", json.dumps({"skills": [{"name": name, "path": "skills/" + name, "version": "2.0.0", "license": "CC0-1.0"}]}))
        return self.root / base

    def test_missing_and_escaping_references_rejected(self):
        package = self.package()
        (package / "README.md").write_text("[missing](absent.md)\n[escape](../../catalog.json)\n")
        self.assertEqual(sum("local reference" in e for e in package_errors(package)), 2)

    def test_name_drift_rejected(self):
        package = self.package()
        p = package / "SKILL.md"
        p.write_text(p.read_text().replace("name: agentic-skills-fixture", "name: wrong-name"))
        self.assertTrue(any("mismatched" in e for e in package_errors(package)))

    def test_checksum_tampering_and_unlisted_files_rejected(self):
        package = self.package()
        manifest = package / "SHA256SUMS.txt"
        manifest.write_text("".join(hashlib.sha256(p.read_bytes()).hexdigest() + "  " + p.relative_to(package).as_posix() + "\n" for p in sorted(package.rglob("*")) if p.is_file() and p != manifest))
        self.assertEqual(package_errors(package), [])
        (package / "README.md").write_text("changed")
        self.assertTrue(any("checksum" in e for e in package_errors(package)))

    def test_release_is_extractable_and_refuses_overwrite(self):
        self.package()
        output = self.root.parent / "release.zip"
        build(self.root, output)
        original = output.read_bytes()
        with self.assertRaises(FileExistsError):
            build(self.root, output)
        self.assertEqual(output.read_bytes(), original)

    def test_release_refuses_output_inside_checkout(self):
        self.package()
        with self.assertRaises(ValueError):
            build(self.root, self.root / "release.zip")

    def test_release_refuses_invalid_package(self):
        package = self.package()
        (package / "README.md").unlink()
        output = self.root.parent / "release.zip"
        with self.assertRaises(ValueError):
            build(self.root, output)
        self.assertFalse(output.exists())


if __name__ == "__main__":
    unittest.main()

#!/usr/bin/env python3
"""Validate packages and public-safe bytes; report locations without sensitive values.

Requires PyYAML. Default examines tracked and nonignored candidate worktree files.
--staged examines index blobs, including content that differs from the worktree.
--history examines all reachable commit metadata and unique historical blobs.
These are bounded publication checks, not a complete PII or credential detector.
"""
from __future__ import annotations

import argparse
import ast
import hashlib
import json
import re
import struct
import subprocess
import sys
from pathlib import Path
from urllib.parse import unquote, urlsplit

import yaml

ROOT = Path(__file__).resolve().parents[1]
MAX_BYTES = 2_000_000
FORBIDDEN_PARTS = {".DS_Store", "__pycache__", ".venv", "venv", "node_modules",
                   ".idea", ".vscode", ".claude", ".codex", ".cursor",
                   ".pytest_cache", "artifacts", "dist", "build"}
FORBIDDEN_SUFFIXES = {".pyc", ".pyo", ".log", ".zip", ".gz", ".bundle", ".pem",
                      ".key", ".p12", ".pfx", ".db", ".sqlite", ".sqlite3", ".swp"}
EMAIL = re.compile(r"[\w.+%-]+@(?:[\w-]+\.)+[A-Za-z]{2,}")
HOME_PATH = re.compile(r"/(?:Users|home)/[A-Za-z0-9_.-]+|[A-Za-z]:[\\/]Users[\\/][A-Za-z0-9_.-]+")
CREDENTIAL = re.compile(r"\b(?:sk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{24,}|gh[pousr]_[A-Za-z0-9]{24,}|AKIA[A-Z0-9]{16})\b|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----")
LINK = re.compile(r"!?\[[^\]\n]*\]\(([^)\n]+)\)")


def git(*args: str, root: Path = ROOT) -> bytes:
    """Run read-only Git plumbing with a timeout; callers never print raw failures."""
    return subprocess.check_output(["git", "-C", str(root), *args], timeout=60,
                                   stderr=subprocess.DEVNULL)


def public_email(address: str) -> bool:
    """Allow fictional domains and GitHub noreply identities, not personal contacts."""
    domain = address.rsplit("@", 1)[-1].lower()
    return (domain in {"example.com", "example.org", "example.net", "users.noreply.github.com"}
            or domain.endswith((".example", ".invalid", ".test")))


def location(relative: str) -> str:
    """Do not disclose a sensitive filename while reporting that it was rejected."""
    if HOME_PATH.search(relative) or CREDENTIAL.search(relative) or any(
            not public_email(m.group()) for m in EMAIL.finditer(relative)):
        return "[redacted filename]"
    return relative


def png_errors(data: bytes) -> list[str]:
    """Reject malformed PNGs and ancillary metadata; visual review is still needed."""
    if not data.startswith(b"\x89PNG\r\n\x1a\n"):
        return ["invalid PNG"]
    pos = 8
    kinds = []
    while pos + 12 <= len(data):
        size = struct.unpack(">I", data[pos:pos + 4])[0]
        kind = data[pos + 4:pos + 8]
        if pos + 12 + size > len(data):
            return ["truncated PNG"]
        if kind not in {b"IHDR", b"PLTE", b"IDAT", b"IEND"}:
            return ["PNG ancillary metadata requires removal and review"]
        kinds.append(kind)
        pos += 12 + size
        if kind == b"IEND":
            break
    if (pos != len(data) or not kinds or kinds[0] != b"IHDR"
            or kinds[-1] != b"IEND" or b"IDAT" not in kinds):
        return ["malformed PNG structure"]
    return []


def privacy_errors(relative: str, data: bytes, mode: str = "100644") -> list[str]:
    """Check one public file without echoing its contents or matched secret values."""
    path = Path(relative)
    errors = []
    if path.is_absolute() or ".." in path.parts:
        errors.append("unsafe path")
    if any(part in FORBIDDEN_PARTS for part in path.parts) or path.suffix in FORBIDDEN_SUFFIXES:
        errors.append("prohibited local/generated file")
    if path.name.startswith(".env") and path.name != ".env.example":
        errors.append("environment file")
    if mode == "120000":
        errors.append("symlink is not allowed in public packages")
    if len(data) > MAX_BYTES:
        return errors + ["file exceeds publication review bound"]
    if path.suffix.lower() == ".png":
        return errors + png_errors(data)
    try:
        text = data.decode("utf-8")
    except UnicodeDecodeError:
        return errors + ["unsupported binary; explicit format review required"]
    if "\x00" in text:
        errors.append("binary content disguised as text")
    # Pathnames and contents share the same privacy boundary.
    for label, content in [("filename", relative), ("content", text)]:
        if HOME_PATH.search(content):
            errors.append(f"personal machine path in {label}")
        if any(not public_email(match.group()) for match in EMAIL.finditer(content)):
            errors.append(f"nonpublic email in {label}")
        if CREDENTIAL.search(content):
            errors.append(f"credential pattern in {label}")
        if re.search(r"https?://[^\s/]+:[^\s/@]+@", content):
            # Only the existing, explicitly synthetic URL parser fixture is allowed.
            if "https://name:secret@shop.example/" not in content or re.search(
                    r"https?://[^\s/]+:[^\s/@]+@", content.replace("https://name:secret@shop.example/", "")):
                errors.append(f"credentials in URL in {label}")
    return errors


def frontmatter(text: str) -> dict:
    """Parse real YAML while rejecting duplicate fields that could hide declarations."""
    match = re.match(r"\A---\r?\n(.*?)\r?\n---(?:\r?\n|$)", text, re.S)
    if not match:
        raise ValueError("missing frontmatter")

    class UniqueLoader(yaml.SafeLoader):
        pass

    def mapping(loader, node):
        result = {}
        for key_node, value_node in node.value:
            key = loader.construct_object(key_node)
            if key in result:
                raise ValueError("duplicate YAML key")
            result[key] = loader.construct_object(value_node)
        return result

    UniqueLoader.add_constructor(yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG, mapping)
    result = yaml.load(match.group(1), Loader=UniqueLoader)
    if not isinstance(result, dict):
        raise ValueError("frontmatter must be a mapping")
    return result


def package_errors(package: Path) -> list[str]:
    """Check an independently installed package, including links and checksum inventory."""
    errors = []
    required = ["SKILL.md", "README.md", "LICENSE", "agents/openai.yaml", "evals/scenarios.json"]
    for name in required:
        if not (package / name).is_file():
            errors.append(f"missing {name}")
    try:
        metadata = frontmatter((package / "SKILL.md").read_text(encoding="utf-8"))
        name = metadata.get("name")
        if name != package.name or not re.fullmatch(r"agentic-skills-[a-z0-9]+(?:-[a-z0-9]+)*", name or "") or len(name) > 64:
            errors.append("invalid or mismatched branded name")
        if not isinstance(metadata.get("description"), str) or not 1 <= len(metadata["description"]) <= 1024:
            errors.append("invalid description")
        if metadata.get("license") not in {"CC0-1.0", "MIT"}:
            errors.append("missing or unsupported licence declaration")
        extra = metadata.get("metadata", {})
        if not isinstance(extra, dict) or any(not isinstance(k, str) or not isinstance(v, str) for k, v in extra.items()):
            errors.append("metadata keys and values must be strings")
        elif not re.fullmatch(r"\d+\.\d+\.\d+", extra.get("version", "")):
            errors.append("missing semantic version")
        if "compatibility" in metadata and (not isinstance(metadata["compatibility"], str) or not 1 <= len(metadata["compatibility"]) <= 500):
            errors.append("invalid compatibility declaration")
        adapter = yaml.safe_load((package / "agents/openai.yaml").read_text())
        interface = adapter["interface"]
        if "$" + package.name not in interface.get("default_prompt", ""):
            errors.append("adapter prompt does not invoke canonical name")
        if not interface.get("display_name", "").startswith("agentic-skills · "):
            errors.append("adapter display name lacks brand")
        if not 25 <= len(interface.get("short_description", "")) <= 64:
            errors.append("adapter short description must be 25–64 characters")
        for field in ["icon_small", "icon_large"]:
            if field in interface and not (package / interface[field]).is_file():
                errors.append("missing adapter icon")
        scenarios = json.loads((package / "evals/scenarios.json").read_text())
        rows = scenarios["scenarios"]
        if not rows or len({r["id"] for r in rows}) != len(rows):
            errors.append("empty or duplicate scenarios")
        if any(not all(row.get(k) for k in ["id", "prompt", "expected", "must_not"]) for row in rows):
            errors.append("incomplete behavioural scenario")
    except (OSError, ValueError, TypeError, KeyError, yaml.YAMLError):
        errors.append("unreadable or invalid package metadata/scenarios")
    for path in sorted(package.rglob("*")):
        if path.is_symlink():
            errors.append(f"{location(path.relative_to(package).as_posix())}: symlink not allowed")
            continue
        if not path.is_file() or "__pycache__" in path.parts:
            continue
        relative = path.relative_to(package).as_posix()
        errors.extend(f"{location(relative)}: {e}" for e in privacy_errors(relative, path.read_bytes()))
        try:
            if path.suffix == ".py":
                ast.parse(path.read_text())
            elif path.suffix == ".json":
                json.loads(path.read_text(), parse_constant=lambda _: (_ for _ in ()).throw(ValueError()))
            elif path.suffix == ".md":
                # Scaffold templates refer to destination files; their fixture tests own those links.
                if "assets/templates" in relative and package.name.endswith("-agentic-codebase"):
                    continue
                for raw in LINK.findall(path.read_text()):
                    target = raw.strip().split(" ", 1)[0].strip("<>")
                    if urlsplit(target).scheme or target.startswith("#"):
                        continue
                    resolved = (path.parent / unquote(target.split("#")[0])).resolve()
                    if not resolved.is_relative_to(package.resolve()) or not resolved.exists():
                        errors.append(f"{relative}: missing or escaping local reference")
        except (OSError, ValueError, SyntaxError, UnicodeError):
            errors.append(f"{relative}: invalid syntax or unreadable resource")
    for filename in ["MANIFEST.sha256", "SHA256SUMS.txt"]:
        manifest = package / filename
        if not manifest.exists():
            continue
        listed = {}
        for line in manifest.read_text().splitlines():
            match = re.fullmatch(r"([0-9a-f]{64})  (.+)", line)
            if not match or match.group(2) in listed:
                errors.append("malformed or duplicate checksum entry")
                continue
            listed[match.group(2)] = match.group(1)
        actual = {p.relative_to(package).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest()
                  for p in package.rglob("*") if p.is_file() and p != manifest
                  and "__pycache__" not in p.parts and p.name != ".DS_Store"}
        if actual != listed:
            errors.append("checksum inventory mismatch")
    return errors


def worktree_files(root: Path) -> list[tuple[str, bytes, str]]:
    """Include new nonignored files so an unstaged addition cannot evade review."""
    names = git("ls-files", "--cached", "--others", "--exclude-standard", "-z", root=root)
    result = []
    for name in sorted(set(names.decode().split("\0")) - {""}):
        path = root / name
        if path.is_symlink():
            result.append((name, path.readlink().as_posix().encode(), "120000"))
        elif path.is_file():
            result.append((name, path.read_bytes(), "100644"))
    return result


def staged_files(root: Path) -> list[tuple[str, bytes, str]]:
    """Read exact index objects rather than their possibly sanitized worktree copies."""
    result = []
    for row in git("ls-files", "--stage", "-z", root=root).decode().split("\0"):
        if not row:
            continue
        info, name = row.split("\t", 1)
        mode, oid, stage = info.split()
        if stage != "0":
            raise ValueError("unmerged index")
        result.append((name, git("cat-file", "blob", oid, root=root), mode))
    return result


def identity_errors(root: Path) -> list[str]:
    """Inspect effective commit identities, including environment overrides, before a commit."""
    errors = []
    for variable in ["GIT_AUTHOR_IDENT", "GIT_COMMITTER_IDENT"]:
        identity = git("var", variable, root=root).decode()
        match = re.fullmatch(r"(.*?) <([^>]+)> \d+ [+-]\d+\n?", identity)
        if not match or match.group(1) != "agentic-skills contributors" or not public_email(match.group(2)):
            errors.append("effective Git identity violates anonymous publication policy")
    return errors


def history_errors(root: Path) -> list[str]:
    """Inspect reachable history and identity metadata without exposing their values."""
    errors = []
    seen = set()
    for commit in git("rev-list", "--all", root=root).decode().split():
        metadata = git("show", "-s", "--format=%an%n%ae%n%cn%n%ce%n%B", commit, root=root).decode()
        lines = metadata.splitlines()
        if len(lines) < 4 or any(not public_email(lines[i]) for i in [1, 3]):
            errors.append(f"history {commit[:12]}: nonpublic Git identity")
        if any(line != "agentic-skills contributors" for line in [lines[0], lines[2]]):
            errors.append(f"history {commit[:12]}: identity name requires anonymization review")
        errors.extend(f"history {commit[:12]} metadata: {e}" for e in privacy_errors("commit.txt", metadata.encode()))
        for row in git("ls-tree", "-r", "-z", commit, root=root).decode().split("\0"):
            if not row:
                continue
            info, name = row.split("\t", 1)
            mode, kind, oid = info.split()
            key = (name, oid, mode)
            if key in seen:
                continue
            seen.add(key)
            if kind != "blob":
                errors.append("history: unsupported submodule")
                continue
            errors.extend(f"history {commit[:12]} {location(name)}: {e}" for e in privacy_errors(name, git("cat-file", "blob", oid, root=root), mode))
    return errors


def library_errors(root: Path) -> list[str]:
    """Validate the catalogue and every distributed package without mutating them."""
    errors = []
    rows = json.loads((root / "catalog.json").read_text())["skills"]
    actual = {p.name for p in (root / "skills").iterdir() if p.is_dir()}
    if len(rows) != len(actual) or {row["name"] for row in rows} != actual:
        errors.append("catalogue/package inventory mismatch")
    for row in rows:
        package = root / row["path"]
        if row["path"] != "skills/" + row["name"]:
            errors.append("invalid catalogue path")
            continue
        errors.extend(f"{row['name']}: {e}" for e in package_errors(package))
        meta = frontmatter((package / "SKILL.md").read_text())
        if row["version"] != meta["metadata"]["version"] or row["license"] != meta["license"]:
            errors.append(f"{row['name']}: catalogue metadata drift")
    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    modes = parser.add_mutually_exclusive_group()
    modes.add_argument("--staged", action="store_true")
    modes.add_argument("--history", action="store_true")
    args = parser.parse_args()
    try:
        if args.history:
            errors = history_errors(ROOT)
        else:
            files = staged_files(ROOT) if args.staged else worktree_files(ROOT)
            errors = [f"{location(name)}: {e}" for name, data, mode in files for e in privacy_errors(name, data, mode)]
            if args.staged:
                errors += identity_errors(ROOT)
            if not args.staged:
                errors += library_errors(ROOT)
    except (OSError, ValueError, KeyError, TypeError, yaml.YAMLError, subprocess.SubprocessError):
        print("FAIL: check could not complete; inspect configuration locally without publishing sensitive output.")
        return 2
    for error in sorted(set(errors)):
        print("FAIL:", error)
    if errors:
        return 1
    print("PASS: " + ("reachable history privacy" if args.history else "staged privacy" if args.staged else "library structure and candidate-file privacy"))
    print("Limits: heuristic privacy checks; manual content/binary review and independent secret scanning remain required.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

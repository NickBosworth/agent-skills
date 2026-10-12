#!/usr/bin/env python3
"""Build a deterministic review ZIP with the actual npm lock; never publish it."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import sys
import stat
import zipfile

DIRECTORIES = ("dist", "src", "web", "data", "docs", "examples")
FILES = ("package.json", "package-lock.json", "tsconfig.json", "README.md", "CONTRIBUTING.md", "LICENSE", "NOTICE.md", "CHANGELOG.md")



def within_source(root: Path, output: Path) -> bool:
    if output == root or root in output.parents:
        return True
    # Filesystem identity also catches alternate case spellings on macOS/Windows.
    for ancestor in (output, *output.parents):
        try:
            if ancestor.samefile(root):
                return True
        except FileNotFoundError:
            continue
    return False


def build(root: Path, output: Path) -> None:
    root = root.resolve()
    if output.is_symlink():
        raise ValueError("release-output-symlink")
    output = output.resolve()
    if within_source(root, output) or (root.parent.parent / "catalog.json").exists() and within_source(root.parent.parent, output):
        raise ValueError("release-output-inside-source")
    if output.exists():
        raise ValueError("release-output-exists")
    paths = [root / name for name in FILES]
    for name in DIRECTORIES:
        directory = root / name
        if not directory.is_dir() or directory.is_symlink():
            raise ValueError("release-source-missing-or-symlink")
        paths.extend(directory.rglob("*"))
    entries = {}
    for path in sorted(paths):
        if path.is_symlink():
            raise ValueError("release-symlink-blocked")
        metadata = path.lstat()
        if stat.S_ISDIR(metadata.st_mode):
            continue
        if not stat.S_ISREG(metadata.st_mode) or metadata.st_size > 2_000_000:
            raise ValueError("release-source-not-bounded-file")
        relative = path.relative_to(root).as_posix()
        if not re.fullmatch(r"[A-Za-z0-9._/-]+", relative) or path.suffix.lower() not in {".ts", ".js", ".json", ".html", ".css", ".md", ""}:
            raise ValueError("unreviewed-release-file")
        entries[relative] = path.read_bytes()
    package = json.loads(entries["package.json"])
    if not re.fullmatch(r"\d+\.\d+\.\d+(?:-[A-Za-z0-9.-]+)?", package["version"]):
        raise ValueError("invalid-product-version")
    manifest = {"kind": "review-candidate", "formatVersion": 1, "name": package["name"], "version": package["version"], "files": [{"path": name, "sha256": hashlib.sha256(data).hexdigest(), "bytes": len(data)} for name, data in sorted(entries.items())]}
    entries["RELEASE.json"] = (json.dumps(manifest, indent=2) + "\n").encode()
    archive = zipfile.ZipFile(output, "x", compression=zipfile.ZIP_STORED)
    try:
        with archive:
            for name, data in sorted(entries.items()):
                info = zipfile.ZipInfo("seo-workbench/" + name, (2000, 1, 1, 0, 0, 0))
                info.create_system = 3
                info.external_attr = 0o100644 << 16
                archive.writestr(info, data)
    except Exception:
        output.unlink(missing_ok=True)
        raise


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    try:
        build(Path(__file__).resolve().parent.parent, args.out)
    except Exception:
        print("FAIL: review archive preparation; check paths, build and reviewed inputs", file=sys.stderr)
        return 1
    print("PASS: review ZIP prepared; publication is a separate authorized operation")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

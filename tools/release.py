#!/usr/bin/env python3
"""Create a package-only archive outside the checkout and verify fresh extraction.

Existing output is never overwritten. Does not publish or create tags. Requires
development dependencies and a successfully validated candidate worktree.
"""
import argparse
import hashlib
from pathlib import Path
import tempfile
import zipfile

from check_library import ROOT, library_errors, package_errors, privacy_errors, worktree_files


def build(root: Path, output: Path) -> None:
    """Validate, build and extract a release; remove a partial archive on failure."""
    output = output.resolve()
    if output.is_relative_to(root.resolve()):
        raise ValueError("release output must be outside the repository")
    errors = library_errors(root)
    errors += [e for name, data, mode in worktree_files(root) for e in privacy_errors(name, data, mode)]
    if errors:
        raise ValueError("repository checks must pass before packaging")
    output.parent.mkdir(parents=True, exist_ok=True)
    # Exclusive creation prevents an accidental overwrite of a prior release.
    with output.open("xb") as stream:
        try:
            files = sorted(p for p in (root / "skills").rglob("*") if p.is_file() and "__pycache__" not in p.parts)
            manifest = {}
            with zipfile.ZipFile(stream, "w", compression=zipfile.ZIP_DEFLATED) as archive:
                for path in files:
                    name = path.relative_to(root / "skills").as_posix()
                    data = path.read_bytes()
                    manifest[name] = hashlib.sha256(data).hexdigest()
                    archive.writestr(name, data)
                archive.writestr("SHA256SUMS", "".join(f"{digest}  {name}\n" for name, digest in manifest.items()))
            stream.flush()
            with tempfile.TemporaryDirectory(prefix="agentic-skills-release-") as temporary:
                extracted = Path(temporary)
                with zipfile.ZipFile(output) as archive:
                    if archive.testzip():
                        raise ValueError("archive CRC check failed")
                    # Members came from confined canonical paths, but validate again before extraction.
                    for member in archive.namelist():
                        if Path(member).is_absolute() or ".." in Path(member).parts:
                            raise ValueError("unsafe archive member")
                    archive.extractall(extracted)
                for name, digest in manifest.items():
                    if hashlib.sha256((extracted / name).read_bytes()).hexdigest() != digest:
                        raise ValueError("archive checksum mismatch")
                for package in extracted.iterdir():
                    if package.is_dir() and package_errors(package):
                        raise ValueError("extracted package validation failed")
        except BaseException:
            # This path was created by this invocation; never remove someone else's output.
            stream.close()
            output.unlink()
            raise


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", required=True, type=Path)
    args = parser.parse_args()
    try:
        build(ROOT, args.out)
    except (OSError, ValueError, zipfile.BadZipFile):
        print("FAIL: release not created; check output location, existing files and library validation.")
        return 1
    print("PASS: package archive, CRC, SHA-256 inventory and fresh-extraction validation.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env python3
"""Freeze raw trial inputs and an operational skill view outside a checkout."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil

PACKAGE = Path(__file__).resolve().parents[1]
OPERATIONAL = ("SKILL.md", "LICENSE", "SOURCES.md", "references", "assets", "examples", "agents")
BUILD_OUTPUT = {"bin", "obj", "__pycache__"}


def snapshot(root):
    """Hash source bytes; reject links and do not confuse build output with source."""
    if not root.is_dir() or root.is_symlink():
        raise ValueError("Snapshot requires an existing ordinary directory.")
    files = {}
    def fail(error):
        raise error
    for directory, children, names in os.walk(root, followlinks=False, onerror=fail):
        for name in [*children, *names]:
            if (Path(directory) / name).is_symlink():
                raise ValueError("Trial inputs must not contain symlinks.")
        children[:] = [name for name in children if name not in BUILD_OUTPUT]
        for name in names:
            path = Path(directory) / name
            files[path.relative_to(root).as_posix()] = hashlib.sha256(path.read_bytes()).hexdigest()
    return files


def identity(files):
    return hashlib.sha256(json.dumps(files, sort_keys=True).encode()).hexdigest()


def copy_operational(package, destination):
    """Allowlist operational resources; never expose maintenance answers/results."""
    snapshot(package)
    destination.mkdir()
    for name in OPERATIONAL:
        source = package / name
        if source.is_dir():
            shutil.copytree(source, destination / name, ignore=shutil.ignore_patterns(*BUILD_OUTPUT))
        else:
            shutil.copy2(source, destination / name)


def prepare(package, fixture, destination, arm):
    if arm not in {"skill", "baseline"}:
        raise ValueError("Unknown comparison arm.")
    if not fixture or Path(fixture).name != fixture:
        raise ValueError("Select one fixture name.")
    raw = package / "evals" / "fixtures" / fixture
    if not raw.is_dir():
        raise ValueError("Unknown fixture.")
    destination = destination.resolve()
    if destination == package.resolve() or package.resolve() in destination.parents:
        raise ValueError("Evidence must stay outside the package.")
    if any((parent / ".git").exists() for parent in [destination, *destination.parents]):
        raise ValueError("Evidence must stay outside a Git checkout.")
    inputs = snapshot(raw)
    destination.mkdir(parents=True, exist_ok=False)
    shutil.copytree(raw, destination / "work", ignore=shutil.ignore_patterns(*BUILD_OUTPUT))
    operational = None
    if arm == "skill":
        copy_operational(package, destination / "skill")
        operational = snapshot(destination / "skill")
    manifest = {"fixture": fixture, "arm": arm, "inputs": inputs,
                "input_identity": identity(inputs), "operational": operational,
                "operational_identity": identity(operational) if operational is not None else None}
    (destination / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    return manifest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--fixture", required=True)
    parser.add_argument("--arm", choices=["skill", "baseline"], required=True)
    parser.add_argument("--out", required=True, type=Path)
    args = parser.parse_args()
    manifest = prepare(PACKAGE, args.fixture, args.out, args.arm)
    print(json.dumps({key: manifest[key] for key in ["fixture", "arm", "input_identity", "operational_identity"]}))


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError):
        raise SystemExit("BLOCKED: invalid inputs or evidence destination; no trial success established.") from None

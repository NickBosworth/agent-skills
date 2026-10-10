#!/usr/bin/env python3
"""Run library checks and independent package suites; fail on any failed command."""
from pathlib import Path
import os
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]


def main() -> int:
    environment = dict(os.environ, PYTHONDONTWRITEBYTECODE="1")
    commands = [(ROOT, [sys.executable, "tools/check_library.py"]),
                (ROOT, [sys.executable, "-m", "unittest", "discover", "-s", "tests", "-v"])]
    for package in sorted((ROOT / "skills").iterdir()):
        if not package.is_dir():
            continue
        commands.append((ROOT, [sys.executable, "-m", "skills_ref.cli", "validate", str(package)]))
        for directory in ["scripts", "tests"]:
            if list((package / directory).glob("test_*.py")):
                commands.append((package, [sys.executable, "-m", "unittest", "discover", "-s", directory, "-p", "test_*.py"]))
        validator = package / "scripts/validate_package.py"
        if validator.exists():
            commands.append((package, [sys.executable, str(validator)]))
        if (package / "scripts/validate_pack.py").exists():
            commands.append((package, [sys.executable, "scripts/validate_pack.py", "--verify-checksums"]))
    for cwd, command in commands:
        print("CHECK:", cwd.relative_to(ROOT).as_posix(), " ".join(command[1:]), flush=True)
        result = subprocess.run(command, cwd=cwd, env=environment, timeout=180)
        if result.returncode:
            return result.returncode
    print("PASS: all structural validators and helper regression suites. Agent/browser/engine runs are separate.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

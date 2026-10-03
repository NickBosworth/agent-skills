"""Python 3.10+ standard-library implementation; never runs project commands.

This is a structural checker, not a Markdown/YAML parser or a semantic reviewer.
Every mutating operation is explicitly requested and preserves existing content.
"""

from __future__ import annotations

import argparse
import collections
import datetime as dt
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import stat
import subprocess
import sys
import tempfile
import time
from typing import Any
from urllib.parse import unquote, urlsplit
import uuid


MAX_FILES = 20000
MAX_DEPTH = 40
MAX_TEXT_BYTES = 2 * 1024 * 1024
MAX_HASH_BYTES = 64 * 1024 * 1024
MAX_GIT_OUTPUT = 16 * 1024 * 1024
MANIFEST = ".agents/project.json"
REVIEW_LOCK = ".agents/.project-review.lock"
IGNORED_NAMES = frozenset({
    ".git", ".hg", ".svn", "node_modules", "vendor", "third_party",
    ".venv", "venv", "__pycache__", ".tox", ".nox", ".pytest_cache",
    ".mypy_cache", ".ruff_cache", ".cache", "dist", "build", "bin", "obj",
    "coverage", ".next", ".nuxt", ".svelte-kit", "target", ".gradle",
    ".terraform", "site-packages",
})
ROLE_FILES = ("brief", "architecture", "technology", "workflow")
ROLE_DIRS = ("decisions", "tasks", "skills")
TASK_STATUSES = {"planned", "ready", "in_progress", "blocked", "done", "cancelled"}
ADR_STATUSES = {"proposed", "accepted", "superseded", "deprecated", "rejected"}
HEX64 = re.compile(r"^[0-9a-fA-F]{64}$")
# Uppercase markers are review candidates. Ordinary prose such as "unknown
# fields" is useful context, not a placeholder to remove merely for a clean run.
UNRESOLVED = re.compile(r"\b(?:UNKNOWN|TODO|TBD)\b")
LIMITATIONS = [
    "Structural checks do not establish semantic consistency, architectural correctness, or instruction precedence.",
    "Builds, tests, package scripts, hooks, network requests, and native agent discovery are not executed.",
    "Markdown checks cover ordinary local inline/reference file links; fragments, HTML links, and full Markdown syntax are not validated.",
    "Frontmatter checks support a documented subset of YAML, not the complete YAML specification.",
    "Ignored, generated/vendor/cache, nested-repository, submodule, and symlink boundaries are not traversed.",
]


class UnsafeInput(Exception):
    def __init__(self, message: str, path: str = "", code: str = "UNSAFE_PATH"):
        super().__init__(message)
        self.message, self.path, self.code = message, path, code


class ReadProblem(Exception):
    def __init__(self, message: str, path: str, code: str = "FILE_READ_ERROR"):
        super().__init__(message)
        self.message, self.path, self.code = message, path, code


class Report:
    def __init__(self, command: str, root: str):
        self.command = command
        self.root = root
        self.findings: list[dict[str, Any]] = []
        self.data: dict[str, Any] = {}
        self.unsafe = False
        self._seen: set[tuple[str, str, str]] = set()

    def add(self, code: str, severity: str, message: str, path: str = "", *, unsafe: bool = False) -> None:
        key = (code, path, message)
        if key not in self._seen:
            self._seen.add(key)
            self.findings.append({"code": code, "severity": severity, "path": path, "message": message})
        self.unsafe = self.unsafe or unsafe

    def problem(self, exc: UnsafeInput | ReadProblem) -> None:
        self.add(exc.code, "error", exc.message, exc.path, unsafe=isinstance(exc, UnsafeInput))

    def exit_code(self, strict: bool = False) -> int:
        if self.unsafe:
            return 2
        if any(f["severity"] == "error" or (strict and f["severity"] == "warning") for f in self.findings):
            return 1
        return 0

    def output(self) -> dict[str, Any]:
        counts = collections.Counter(f["severity"] for f in self.findings)
        return {
            "command": self.command, "root": self.root,
            "verification": {"structural": "bounded local checks only", "semantic": "not performed", "limitations": LIMITATIONS},
            "summary": {s: counts[s] for s in ("error", "warning", "info")},
            "findings": self.findings, "data": self.data,
        }


def today() -> dt.date:
    return dt.datetime.now(dt.timezone.utc).date()


def iso_date(value: Any) -> dt.date | None:
    if not isinstance(value, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
        return None
    try:
        return dt.date.fromisoformat(value)
    except ValueError:
        return None


def meaningful(value: Any) -> bool:
    if not isinstance(value, str) or not value.strip():
        return False
    normalized = value.strip().strip("[]{}().! ").casefold()
    absent = {"todo", "tbd", "unknown", "n/a", "na", "none", "pending", "placeholder", "tbc", "", "-",
              "not run", "not tested", "not verified", "unverified", "no evidence", "no validation", "not yet run", "not yet tested"}
    return normalized not in absent and not re.match(r"^(?:todo|tbd|unknown)\s*:", normalized)


class Repository:
    """Validate containment and every existing path component before accessing it."""

    def __init__(self, root: str | Path):
        expanded = os.path.expanduser(os.fspath(root))
        self.root = Path(os.path.abspath(expanded))
        self._check_components(self.root, "--root")
        if not self.root.is_dir():
            raise UnsafeInput("The repository root must already exist and be a directory.", "--root", "ROOT_INVALID")

    @staticmethod
    def _check_components(path: Path, label: str) -> None:
        parts = [path, *path.parents]
        for candidate in reversed(parts):
            try:
                mode = candidate.lstat().st_mode
            except FileNotFoundError:
                continue
            except OSError:
                raise UnsafeInput("A path component cannot be safely inspected.", label)
            if stat.S_ISLNK(mode):
                raise UnsafeInput("Symlinks are not traversed, including symlink ancestors.", label)
            if candidate != path and not stat.S_ISDIR(mode):
                raise UnsafeInput("A parent path component is not a directory.", label)

    def relative(self, value: Any, *, base: str = ".") -> str:
        if not isinstance(value, str) or not value or "\x00" in value:
            raise UnsafeInput("A nonempty repository-relative path is required.")
        if "\\" in value or any(ord(ch) < 32 for ch in value):
            raise UnsafeInput("Paths must use forward slashes and contain no control characters.")
        if value.startswith("/") or re.match(r"^[A-Za-z]:", value):
            raise UnsafeInput("Absolute paths are not allowed in repository-relative fields.")
        candidate = Path(os.path.abspath(self.root / base / value))
        try:
            rel = candidate.relative_to(self.root).as_posix()
        except ValueError:
            raise UnsafeInput("The path escapes the selected repository root.")
        return rel

    def path(self, value: Any, *, base: str = ".", regular: bool = False, directory: bool = False) -> Path:
        rel = self.relative(value, base=base)
        path = self.root / rel
        self._check_components(path, rel)
        if regular or directory:
            try:
                mode = path.lstat().st_mode
            except FileNotFoundError:
                raise ReadProblem("The declared path does not exist.", rel, "PATH_MISSING")
            except OSError:
                raise ReadProblem("The declared path cannot be inspected.", rel)
            if regular and not stat.S_ISREG(mode):
                raise UnsafeInput("A regular file is required; special files and directories are not read.", rel)
            if directory and not stat.S_ISDIR(mode):
                raise ReadProblem("The declared path must be a directory.", rel, "PATH_TYPE_INVALID")
        return path

    def read(self, rel: str, limit: int = MAX_TEXT_BYTES) -> bytes:
        path = self.path(rel, regular=True)
        descriptor = None
        try:
            descriptor = os.open(path, os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0) | getattr(os, "O_NONBLOCK", 0) | getattr(os, "O_BINARY", 0))
            info = os.fstat(descriptor)
            if not stat.S_ISREG(info.st_mode):
                raise UnsafeInput("Only regular files are read.", rel)
            if info.st_size > limit:
                raise ReadProblem("The file exceeds the bounded read limit; its contents were not checked.", rel, "SCAN_INCOMPLETE")
            with os.fdopen(descriptor, "rb") as stream:
                descriptor = None
                data = stream.read(limit + 1)
            if len(data) > limit:
                raise ReadProblem("The file exceeds the bounded read limit; its contents were not checked.", rel, "SCAN_INCOMPLETE")
            return data
        except (UnsafeInput, ReadProblem):
            raise
        except OSError:
            raise ReadProblem("The file could not be read safely.", rel)
        finally:
            if descriptor is not None:
                os.close(descriptor)

    def text(self, rel: str) -> str:
        try:
            return self.read(rel).decode("utf-8-sig")
        except UnicodeDecodeError:
            raise ReadProblem("The file is not valid UTF-8 and was not text-checked.", rel, "TEXT_ENCODING_UNSUPPORTED")

    def digest(self, rel: str) -> str:
        return hashlib.sha256(self.read(rel, MAX_HASH_BYTES)).hexdigest()


def readable_text(repo: Repository, rel: str, report: Report) -> str | None:
    try:
        return repo.text(rel)
    except (UnsafeInput, ReadProblem) as exc:
        if isinstance(exc, ReadProblem) and exc.code in {"SCAN_INCOMPLETE", "TEXT_ENCODING_UNSUPPORTED"}:
            report.add(exc.code, "warning", exc.message, rel)
        else:
            report.problem(exc)
        return None


def git_read(repo: Repository, arguments: list[str]) -> tuple[bytes | None, str]:
    """Git receives argument lists, no shell, no hooks/fsmonitor, no user config."""
    for directory in (repo.root, *repo.root.parents):
        marker = directory / ".git"
        if os.path.lexists(marker):
            if marker.is_symlink():
                return None, "symlink-metadata-boundary"
            break
    env = {k: v for k, v in os.environ.items() if not k.startswith("GIT_")}
    env.update({
        "GIT_CONFIG_NOSYSTEM": "1", "GIT_CONFIG_GLOBAL": os.devnull,
        "GIT_TERMINAL_PROMPT": "0", "GIT_OPTIONAL_LOCKS": "0",
        "GIT_PAGER": "cat", "LC_ALL": "C",
    })
    command = ["git", "--no-pager", "-c", f"core.hooksPath={os.devnull}", "-c", "core.fsmonitor=false",
               "-c", "core.untrackedCache=false", "-c", "submodule.recurse=false", "-C", str(repo.root), *arguments]
    try:
        # File-backed capture prevents an unusually large index from exhausting RAM.
        with tempfile.TemporaryFile() as output:
            with subprocess.Popen(command, stdout=output, stderr=subprocess.DEVNULL, env=env) as process:
                deadline = time.monotonic() + 15
                while process.poll() is None:
                    if output.tell() > MAX_GIT_OUTPUT:
                        process.kill()
                        process.wait()
                        return None, "output-limit"
                    if time.monotonic() >= deadline:
                        process.kill()
                        process.wait()
                        return None, "unavailable"
                    time.sleep(0.02)
                if process.returncode:
                    return None, "unavailable"
                if output.tell() > MAX_GIT_OUTPUT:
                    return None, "output-limit"
            output.seek(0)
            return output.read(MAX_GIT_OUTPUT + 1), "ok"
    except (OSError, subprocess.TimeoutExpired):
        return None, "unavailable"


def instruction_file(rel: str) -> bool:
    p = PurePosixPath(rel)
    if any(x in {"templates", "fixtures", "assets"} for x in p.parts[:-1]):
        return False
    if p.name in {"AGENTS.md", "AGENTS.override.md", "CLAUDE.md", "GEMINI.md", ".cursorrules", ".windsurfrules", ".clinerules"}:
        return True
    return bool(re.search(r"(?:^|/)\.github/(?:copilot-instructions\.md|instructions/.+\.instructions\.md)$", rel)
                or re.search(r"(?:^|/)\.cursor/rules/.+\.mdc$", rel)
                or re.search(r"(?:^|/)\.claude/rules/.+\.md$", rel)
                or re.search(r"(?:^|/)\.clinerules/.+\.md$", rel))


def skill_file(rel: str) -> bool:
    p = PurePosixPath(rel)
    return p.name == "SKILL.md" and not any(x in {"references", "assets", "templates", "fixtures"} for x in p.parts[:-1])


def build_file(rel: str) -> bool:
    name = PurePosixPath(rel).name
    return name in {
        "package.json", "package-lock.json", "pnpm-lock.yaml", "pnpm-workspace.yaml", "yarn.lock", "bun.lock", "bun.lockb",
        "pyproject.toml", "requirements.txt", "Pipfile", "Pipfile.lock", "poetry.lock", "uv.lock", "setup.py", "setup.cfg",
        "go.mod", "go.sum", "Cargo.toml", "Cargo.lock", "composer.json", "composer.lock", "Gemfile", "Gemfile.lock",
        "mix.exs", "dune-project", "Directory.Build.props", "Directory.Packages.props", "global.json", "NuGet.Config",
        "build.gradle", "build.gradle.kts", "settings.gradle", "settings.gradle.kts", "pom.xml", "Makefile", "CMakeLists.txt",
        "Dockerfile", "compose.yml", "compose.yaml", "docker-compose.yml", "docker-compose.yaml", "tsconfig.json",
    } or name.endswith((".csproj", ".fsproj", ".sln", ".slnx"))


def ci_file(rel: str) -> bool:
    p = PurePosixPath(rel)
    return (".github/workflows/" in rel and p.suffix in {".yml", ".yaml"}) or p.name in {
        ".gitlab-ci.yml", "azure-pipelines.yml", "azure-pipelines.yaml", "Jenkinsfile", "bitbucket-pipelines.yml"
    } or rel in {".circleci/config.yml", ".buildkite/pipeline.yml", ".buildkite/pipeline.yaml"}


def likely_doc(rel: str) -> bool:
    p = PurePosixPath(rel)
    if p.suffix.lower() != ".md" or any(x in {"templates", "fixtures", "assets"} for x in p.parts[:-1]):
        return False
    return p.name.upper() in {"README.MD", "CONTRIBUTING.MD", "ARCHITECTURE.MD", "TASKS.MD", "PLAN.MD", "DESIGN.MD", "DECISIONS.MD", "RULES.MD"} or bool(re.search(r"(?:^|/)(?:architecture|adr|adrs|decisions|tasks|plans|development|project|engineering)(?:/|\.)", rel, re.IGNORECASE))


def inventory(repo: Repository, report: Report, max_files: int) -> list[str]:
    files: list[str] = []
    boundaries: set[tuple[str, str]] = set()
    git_root_raw, git_status = git_read(repo, ["rev-parse", "--show-toplevel"])
    info: dict[str, Any] = {"available": git_root_raw is not None, "dirty_paths": []}
    listed: bytes | None = None
    complete = True
    submodules: set[str] = set()
    if git_root_raw is not None:
        git_root = os.fsdecode(git_root_raw).strip()
        info.update({"root": git_root, "matches_root": os.path.abspath(git_root) == str(repo.root)})
        if not info["matches_root"]:
            report.add("GIT_ROOT_MISMATCH", "warning", "The selected root is inside a larger Git repository; only the selected root is examined.")
        listed, listing_status = git_read(repo, ["ls-files", "-co", "--exclude-standard", "-z", "--", "."])
        if listing_status == "output-limit":
            report.add("SCAN_INCOMPLETE", "warning", "Git inventory exceeded the output cap; a bounded filesystem fallback is used.")
            complete = False
        stages, stages_status = git_read(repo, ["ls-files", "--stage", "-z", "--", "."])
        if stages is not None:
            for item in stages.split(b"\0"):
                if item.startswith(b"160000 ") and b"\t" in item:
                    submodules.add(os.fsdecode(item.split(b"\t", 1)[1]))
        elif stages_status == "output-limit":
            report.add("SCAN_INCOMPLETE", "warning", "Submodule inventory exceeded the output cap.")
            complete = False
        # git status can invoke clean/process filters while examining worktree
        # content. List-only index operations preserve the no-project-execution
        # guarantee; dirty-state inspection belongs to an authorized agent.
        info["dirty_paths_available"] = False
        report.add("GIT_DIRTY_STATE_UNCHECKED", "info", "Dirty paths were not inspected because Git status can invoke repository filters; no clean-worktree claim is made.")
        ignored, ignored_status = git_read(repo, ["ls-files", "--others", "--ignored", "--exclude-standard", "--directory", "-z", "--", "."])
        if ignored is not None:
            ignored_paths = [os.fsdecode(p).rstrip("/") for p in ignored.split(b"\0") if p]
            for path in ignored_paths[:max_files]:
                boundaries.add((path, "git-ignored"))
            if len(ignored_paths) > max_files:
                report.add("SCAN_INCOMPLETE", "warning", "Ignored-boundary reporting reached the selected file cap.")
                complete = False
        elif ignored_status == "output-limit":
            report.add("SCAN_INCOMPLETE", "warning", "Ignored-boundary inventory exceeded the output cap.")
            complete = False
    else:
        info["reason"] = git_status
        report.add("GIT_UNAVAILABLE", "info", "Git inventory is unavailable; the bounded walk does not interpret .gitignore rules.")

    nested_cache: dict[str, bool] = {}

    def permitted(rel: str) -> bool:
        nonlocal complete
        try:
            normalized = repo.relative(rel)
            parts = PurePosixPath(normalized).parts
            if len(parts) > MAX_DEPTH:
                boundaries.add((normalized, "depth-limit"))
                complete = False
                return False
            for i, part in enumerate(parts):
                prefix = PurePosixPath(*parts[:i + 1]).as_posix()
                if part in IGNORED_NAMES:
                    boundaries.add((prefix, "generated-vendor-cache-or-vcs"))
                    return False
                if prefix in submodules:
                    boundaries.add((prefix, "submodule"))
                    return False
                path = repo.root / prefix
                if path.is_symlink():
                    boundaries.add((prefix, "symlink"))
                    return False
                if i < len(parts) - 1:
                    if prefix not in nested_cache:
                        nested_cache[prefix] = os.path.lexists(path / ".git")
                    if nested_cache[prefix]:
                        boundaries.add((prefix, "nested-repository"))
                        return False
            return True
        except (UnsafeInput, OSError):
            boundaries.add((rel, "unsafe-or-unreadable"))
            complete = False
            return False

    if listed is not None:
        method = "git-ls-files"
        candidates = sorted({os.fsdecode(item).rstrip("/") for item in listed.split(b"\0") if item})
        for rel in candidates:
            if len(files) >= max_files:
                complete = False
                break
            if permitted(rel):
                try:
                    path = repo.path(rel)
                    if path.is_file():
                        files.append(repo.relative(rel))
                    elif path.is_dir() and os.path.lexists(path / ".git"):
                        boundaries.add((rel, "nested-repository"))
                except (UnsafeInput, OSError):
                    boundaries.add((rel, "unsafe-or-unreadable"))
                    complete = False
    else:
        method = "bounded-walk"
        stack = ["."]
        entries_seen = 0
        while stack and len(files) < max_files and entries_seen < max_files * 4:
            current = stack.pop()
            try:
                directory = repo.path(current, directory=True)
                with os.scandir(directory) as iterator:
                    children = []
                    for entry in iterator:
                        entries_seen += 1
                        if entries_seen > max_files * 4:
                            complete = False
                            break
                        children.append(entry)
                for entry in sorted(children, key=lambda e: e.name):
                    rel = (PurePosixPath(current) / entry.name).as_posix()
                    if not permitted(rel):
                        continue
                    if entry.is_symlink():
                        boundaries.add((rel, "symlink"))
                    elif entry.is_dir(follow_symlinks=False):
                        if os.path.lexists(Path(entry.path) / ".git"):
                            boundaries.add((rel, "nested-repository"))
                        else:
                            stack.append(rel)
                    elif entry.is_file(follow_symlinks=False):
                        files.append(rel)
                        if len(files) >= max_files:
                            complete = False
                            break
                    else:
                        boundaries.add((rel, "special-file"))
            except (UnsafeInput, ReadProblem, OSError):
                boundaries.add((current, "unsafe-or-unreadable"))
                complete = False
        if stack:
            complete = False
    if not complete:
        report.add("SCAN_INCOMPLETE", "warning", "Inventory is incomplete because a resource limit or unreadable boundary was reached; unexamined content is not certified.")
    files = sorted(set(files))
    instructions = [p for p in files if instruction_file(p)]
    skills = [p for p in files if skill_file(p)]
    builds = [p for p in files if build_file(p)]
    technologies: set[str] = set()
    for rel in builds:
        name = PurePosixPath(rel).name
        if name == "package.json":
            technologies.add("JavaScript/Node.js")
            try:
                package = json.loads(repo.text(rel))
                if isinstance(package, dict):
                    dependencies = set()
                    for kind in ("dependencies", "devDependencies", "peerDependencies"):
                        if isinstance(package.get(kind), dict):
                            dependencies.update(package[kind])
                    for dependency, technology in {"svelte": "Svelte", "@sveltejs/kit": "SvelteKit", "react": "React", "vue": "Vue", "astro": "Astro", "next": "Next.js", "typescript": "TypeScript", "@angular/core": "Angular"}.items():
                        if dependency in dependencies:
                            technologies.add(technology)
            except (UnsafeInput, ReadProblem, ValueError, RecursionError):
                report.add("TECHNOLOGY_INFERENCE_PARTIAL", "info", "Technology inference used filenames only for this manifest.", rel)
        elif name == "tsconfig.json":
            technologies.add("TypeScript")
        elif name in {"pyproject.toml", "requirements.txt", "Pipfile", "setup.py", "setup.cfg"}:
            technologies.add("Python")
        elif name.endswith((".csproj", ".fsproj", ".sln", ".slnx")):
            technologies.add(".NET")
        elif name == "go.mod":
            technologies.add("Go")
        elif name == "Cargo.toml":
            technologies.add("Rust")
        elif name in {"pom.xml", "build.gradle", "build.gradle.kts"}:
            technologies.add("JVM")
        elif name == "composer.json":
            technologies.add("PHP")
        elif name == "Gemfile":
            technologies.add("Ruby")
        elif name in {"Dockerfile", "compose.yml", "compose.yaml", "docker-compose.yml", "docker-compose.yaml"}:
            technologies.add("Containers")
    report.data.update({
        "instruction_files": instructions,
        "instruction_roots": sorted({str(PurePosixPath(p).parent) for p in instructions}),
        "skills": skills, "build_manifests": builds, "ci_files": [p for p in files if ci_file(p)],
        "likely_docs": [p for p in files if likely_doc(p)], "technologies": sorted(technologies), "git": info,
        "scan": {"method": method, "file_count": len(files), "max_files": max_files, "max_depth": MAX_DEPTH, "complete": complete,
                 "excluded_boundaries": [{"path": p, "reason": reason} for p, reason in sorted(boundaries)]},
    })
    if boundaries:
        report.add("SCAN_BOUNDARIES", "info", "Excluded boundaries are listed in data.scan.excluded_boundaries; they were not traversed.")
    return files


def load_manifest(repo: Repository, report: Report, *, required: bool = False) -> dict[str, Any] | None:
    try:
        path = repo.path(MANIFEST)
        if not path.exists():
            report.add("MANIFEST_MISSING", "error" if required else "warning", "No source-of-truth manifest is present; generic instruction and skill checks remain available.", MANIFEST)
            return None
        raw = repo.read(MANIFEST)
        manifest = json.loads(raw.decode("utf-8-sig"))
    except (UnsafeInput, ReadProblem) as exc:
        report.problem(exc)
        return None
    except (ValueError, UnicodeDecodeError, RecursionError):
        report.add("MANIFEST_INVALID", "error", "The manifest must be valid UTF-8 JSON with one object at the top level.", MANIFEST)
        return None
    if not isinstance(manifest, dict):
        report.add("MANIFEST_INVALID", "error", "The manifest top level must be an object.", MANIFEST)
        return None
    if type(manifest.get("schema_version")) is not int or manifest["schema_version"] != 1:
        report.add("MANIFEST_VERSION_UNSUPPORTED", "error", "Only integer schema_version 1 is supported; no standard-specific checks were inferred.", MANIFEST)
        return None
    valid = True

    def invalid(message: str) -> None:
        nonlocal valid
        valid = False
        report.add("MANIFEST_INVALID", "error", message, MANIFEST)

    version = manifest.get("standard_version")
    if not isinstance(version, str) or not re.fullmatch(r"\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?", version):
        invalid("standard_version must be a semantic-version string.")
    elif not version.startswith("1."):
        report.add("STANDARD_VERSION_UNRECOGNIZED", "warning", "This helper implements standard version 1; newer convention behavior requires review.", MANIFEST)
    if not isinstance(manifest.get("profile"), str) or manifest["profile"] not in {"minimal", "standard"}:
        invalid("profile must be minimal or standard.")
    paths = manifest.get("paths")
    if not isinstance(paths, dict):
        invalid("paths must map the supported documentation roles to repository-relative paths.")
    else:
        for role in (*ROLE_FILES, *ROLE_DIRS):
            if not isinstance(paths.get(role), str) or not paths[role].strip():
                invalid("Every core documentation role requires a nonempty path.")
                continue
            try:
                external_tasks = role == "tasks" and isinstance(manifest.get("task_authority"), dict) and manifest["task_authority"].get("kind") == "external"
                if external_tasks:
                    optional_dir = repo.path(paths[role])
                    if optional_dir.exists():
                        repo.path(paths[role], directory=True)
                else:
                    repo.path(paths[role], regular=role in ROLE_FILES, directory=role in ROLE_DIRS)
            except (UnsafeInput, ReadProblem) as exc:
                report.problem(exc)
                valid = False
        for role, value in paths.items():
            if role not in {*ROLE_FILES, *ROLE_DIRS}:
                # Extension roles remain legal but cannot conceal path escapes.
                if isinstance(value, str):
                    try:
                        repo.path(value)
                    except (UnsafeInput, ReadProblem) as exc:
                        report.problem(exc)
                        valid = False
    instructions = manifest.get("instruction_files")
    if not isinstance(instructions, list) or not instructions or not all(isinstance(p, str) and p for p in instructions):
        invalid("instruction_files must be a nonempty list of repository-relative file paths.")
    else:
        if len(instructions) != len(set(instructions)):
            invalid("instruction_files contains duplicate paths.")
        for rel in instructions:
            try:
                repo.path(rel, regular=True)
            except (UnsafeInput, ReadProblem) as exc:
                report.problem(exc)
                valid = False
    authority = manifest.get("task_authority")
    if not isinstance(authority, dict) or not isinstance(authority.get("kind"), str) or authority["kind"] not in {"repository", "external"}:
        invalid("task_authority requires kind repository or external.")
    else:
        location = authority.get("location")
        if not isinstance(location, str) or not location.strip():
            invalid("task_authority.location must be nonempty.")
        elif authority["kind"] == "repository":
            try:
                repo.path(location, directory=True)
                if isinstance(paths, dict) and isinstance(paths.get("tasks"), str) and repo.relative(location) != repo.relative(paths["tasks"]):
                    invalid("Repository task authority must refer to the configured tasks directory.")
            except (UnsafeInput, ReadProblem) as exc:
                report.problem(exc)
                valid = False
        elif not re.match(r"^https?://[^/\s]+", location):
            invalid("External task authority must use a nonempty HTTP(S) tracker URL.")
    for field, expected in (("commands", list), ("reviews", dict), ("exceptions", list), ("adapters", list)):
        if field in manifest and not isinstance(manifest[field], expected):
            invalid(f"{field} has the wrong JSON type.")
    if not valid:
        return None
    return manifest


def checked_digest(repo: Repository, rel: str, report: Report) -> str | None:
    try:
        return repo.digest(rel)
    except (UnsafeInput, ReadProblem) as exc:
        report.problem(exc)
        return None


def validate_commands(repo: Repository, manifest: dict[str, Any], report: Report) -> None:
    seen: set[str] = set()
    commands = manifest.get("commands", [])
    if not commands:
        report.add("COMMANDS_UNDECLARED", "info", "No command records are declared; no execution or verification is implied.", MANIFEST)
    for item in commands:
        if not isinstance(item, dict):
            report.add("MANIFEST_INVALID", "error", "Every command record must be an object.", MANIFEST)
            continue
        ident = item.get("id")
        if not isinstance(ident, str) or not ident.strip():
            report.add("MANIFEST_INVALID", "error", "Every command needs a nonempty ID.", MANIFEST)
        elif ident in seen:
            report.add("COMMAND_ID_DUPLICATE", "error", "Command IDs must be unique.", MANIFEST)
        else:
            seen.add(ident)
        if not isinstance(item.get("run"), str) or not item["run"].strip():
            report.add("MANIFEST_INVALID", "error", "Every command needs a nonempty run string; it is stored, never executed.", MANIFEST)
        if not isinstance(item.get("status"), str) or item["status"] not in {"unverified", "verified", "blocked"}:
            report.add("MANIFEST_INVALID", "error", "Command status must be unverified, verified, or blocked.", MANIFEST)
        elif item["status"] == "verified" and not meaningful(item.get("evidence")):
            report.add("COMMAND_EVIDENCE_MISSING", "error", "A command labelled verified requires meaningful recorded evidence; this checker does not reproduce it.", MANIFEST)
        try:
            repo.path(item.get("cwd"), directory=True)
            source = item.get("source")
            if not isinstance(source, str) or not source:
                report.add("MANIFEST_INVALID", "error", "Every command needs a source file path.", MANIFEST)
                continue
            source_file = source.split("#", 1)[0]
            repo.path(source_file, regular=True)
            # Only recognize a simple explicit package script reference. Do not
            # interpret shell strings, expansions, aliases, or arbitrary scripts.
            anchor = source.partition("#")[2]
            if PurePosixPath(source_file).name == "package.json" and anchor.startswith("scripts."):
                try:
                    package = json.loads(repo.text(source_file))
                    scripts = package.get("scripts", {}) if isinstance(package, dict) else {}
                    if isinstance(scripts, dict) and anchor[len("scripts."):] not in scripts:
                        report.add("COMMAND_SOURCE_TARGET_MISSING", "error", "The explicitly referenced package.json script no longer exists.", source_file)
                except (ValueError, RecursionError):
                    report.add("COMMAND_SOURCE_UNREADABLE", "warning", "The package manifest could not be parsed; the script target was not checked.", source_file)
        except (UnsafeInput, ReadProblem) as exc:
            report.problem(exc)
    report.data["command_records"] = len(commands)
    report.add("COMMAND_EXECUTION_NOT_PERFORMED", "info", "Declared commands and evidence were checked structurally only; no commands were executed.")


def validate_reviews(repo: Repository, manifest: dict[str, Any], report: Report, max_age: int | None) -> None:
    reviews = manifest.get("reviews", {})
    normalized_keys: set[str] = set()
    for document, record in reviews.items():
        if not isinstance(record, dict):
            report.add("MANIFEST_INVALID", "error", "Every review entry must be an object.", MANIFEST)
            continue
        try:
            rel = repo.relative(document)
            if rel == MANIFEST:
                report.add("MANIFEST_INVALID", "error", "Review entries cannot hash the manifest that contains them.", MANIFEST)
                continue
            if rel in normalized_keys:
                report.add("MANIFEST_INVALID", "error", "Review keys must resolve to distinct document paths.", MANIFEST)
            normalized_keys.add(rel)
            doc_path = repo.path(document)
        except (UnsafeInput, ReadProblem) as exc:
            report.problem(exc)
            continue
        date = iso_date(record.get("reviewed_on"))
        if date is None:
            report.add("REVIEW_DATE_INVALID", "warning", "The review date is absent or not a valid YYYY-MM-DD date.", rel)
        elif date > today():
            report.add("REVIEW_DATE_FUTURE", "warning", "The review date is in the future and requires reconciliation.", rel)
        elif max_age is not None and (today() - date).days > max_age:
            report.add("REVIEW_AGE_CANDIDATE", "warning", "The review exceeds the requested age threshold; age alone does not prove staleness.", rel)
        document_hash = record.get("document_sha256")
        if not isinstance(document_hash, str) or not HEX64.fullmatch(document_hash):
            report.add("MANIFEST_INVALID", "error", "Review document_sha256 must be a 64-character hexadecimal SHA256 digest.", MANIFEST)
        elif not doc_path.exists():
            report.add("REVIEW_DOCUMENT_MISSING", "warning", "A previously reviewed document no longer exists.", rel)
        else:
            current = checked_digest(repo, rel, report)
            if current is not None and current.lower() != document_hash.lower():
                report.add("REVIEW_CONTENT_CHANGED", "warning", "The document changed since its recorded review; this is a review candidate, not proof that its claims are stale.", rel)
        if not meaningful(record.get("note")):
            report.add("MANIFEST_INVALID", "error", "Review entries need a meaningful note describing the review basis.", MANIFEST)
        evidence = record.get("evidence")
        if not isinstance(evidence, dict):
            report.add("MANIFEST_INVALID", "error", "Review evidence must map repository-relative file paths to SHA256 digests.", MANIFEST)
            continue
        for source, expected in evidence.items():
            try:
                source_rel = repo.relative(source)
                if source_rel == MANIFEST:
                    report.add("MANIFEST_INVALID", "error", "Review evidence cannot be the containing manifest.", MANIFEST)
                    continue
                source_path = repo.path(source)
                if not isinstance(expected, str) or not HEX64.fullmatch(expected):
                    report.add("MANIFEST_INVALID", "error", "Every review evidence digest must be a hexadecimal SHA256 digest.", MANIFEST)
                    continue
                if not source_path.exists():
                    report.add("REVIEW_EVIDENCE_MISSING", "warning", "A source recorded as review evidence no longer exists.", source_rel)
                    continue
                current = checked_digest(repo, source_rel, report)
                if current is not None and current.lower() != expected.lower():
                    report.add("REVIEW_EVIDENCE_CHANGED", "warning", "A source changed since the document review; the dependent claims need reassessment.", rel)
            except (UnsafeInput, ReadProblem) as exc:
                report.problem(exc)
        if not evidence:
            report.add("REVIEW_NO_LOCAL_EVIDENCE", "info", "This review relies on the caller's documented greenfield or user-confirmed basis rather than local evidence hashes.", rel)
    expected_docs = {repo.relative(manifest["paths"][r]) for r in ROLE_FILES}
    expected_docs.update(repo.relative(p) for p in manifest["instruction_files"])
    for rel in sorted(expected_docs - normalized_keys):
        report.add("REVIEW_MISSING", "warning", "No explicit review evidence is recorded for this core document; semantics remain unverified.", rel)


def validate_adapters(repo: Repository, manifest: dict[str, Any], report: Report) -> set[frozenset[str]]:
    mirrors: set[frozenset[str]] = set()
    for adapter in manifest.get("adapters", []):
        if not isinstance(adapter, dict):
            report.add("MANIFEST_INVALID", "error", "Adapter records must be objects.", MANIFEST)
            continue
        verification = adapter.get("verification", "unknown")
        if not isinstance(verification, str) or verification not in {"documentation-only", "runtime-tested", "unknown"}:
            report.add("MANIFEST_INVALID", "error", "Adapter verification has an unsupported value.", MANIFEST)
        if "checked_on" in adapter:
            checked = iso_date(adapter["checked_on"])
            if checked is None or checked > today():
                report.add("ADAPTER_DATE_REVIEW", "warning", "The adapter verification date is malformed or in the future.", MANIFEST)
        generated = adapter.get("generated", [])
        if not isinstance(generated, list):
            report.add("MANIFEST_INVALID", "error", "Adapter generated receipts must be a list.", MANIFEST)
            continue
        for item in generated:
            if not isinstance(item, dict):
                report.add("MANIFEST_INVALID", "error", "Every generated adapter receipt must be an object.", MANIFEST)
                continue
            if not isinstance(item.get("mode"), str) or item["mode"] not in {"import", "projection", "copy"}:
                report.add("MANIFEST_INVALID", "error", "Generated adapter mode must be import, projection, or copy.", MANIFEST)
                continue
            try:
                source = repo.relative(item.get("source"))
                target = repo.relative(item.get("target"))
                repo.path(source, regular=True)
                repo.path(target, regular=True)
            except (UnsafeInput, ReadProblem) as exc:
                report.problem(exc)
                continue
            source_hash = checked_digest(repo, source, report)
            target_hash = checked_digest(repo, target, report)
            valid_receipt = True
            for field, current, rel in (("source_sha256", source_hash, source), ("target_sha256", target_hash, target)):
                expected = item.get(field)
                if not isinstance(expected, str) or not HEX64.fullmatch(expected):
                    report.add("ADAPTER_RECEIPT_INCOMPLETE", "warning", "The generated adapter receipt lacks a valid SHA256 digest.", rel)
                    valid_receipt = False
                elif current is None or current.lower() != expected.lower():
                    report.add("ADAPTER_CONTENT_CHANGED", "warning", "Adapter source or generated content changed since the recorded receipt; it was not overwritten.", rel)
                    valid_receipt = False
            if item["mode"] == "copy" and source_hash is not None and target_hash is not None:
                if source_hash != target_hash:
                    report.add("ADAPTER_COPY_DRIFT", "warning", "A declared exact copy differs from its source; a reviewed reconciliation is required.", target)
                elif valid_receipt:
                    mirrors.add(frozenset((source, target)))
    if manifest.get("adapters"):
        report.add("ADAPTER_RUNTIME_NOT_TESTED", "info", "Adapter receipts were checked locally; native instruction discovery, imports, precedence, and runtime behavior were not tested.")
    return mirrors


def apply_exceptions(repo: Repository, manifest: dict[str, Any], report: Report) -> None:
    no_waive = {"SCAN_INCOMPLETE", "EXCEPTION_INVALID", "EXCEPTION_EXPIRED", "EXCEPTION_DUPLICATE"}
    valid: dict[tuple[str, str], str] = {}
    for item in manifest.get("exceptions", []):
        if not isinstance(item, dict):
            report.add("EXCEPTION_INVALID", "error", "Each exception must be an exact code/path record with a reason and expiry date.", MANIFEST)
            continue
        code, path, reason, expiry = (item.get(k) for k in ("code", "path", "reason", "expires"))
        date = iso_date(expiry)
        if not isinstance(code, str) or not re.fullmatch(r"[A-Z][A-Z0-9_]+", code) or not meaningful(reason) or date is None or not isinstance(path, str):
            report.add("EXCEPTION_INVALID", "error", "Exception code, path, reason, or expiry is invalid; wildcards are not supported.", MANIFEST)
            continue
        try:
            normalized = repo.relative(path) if path else ""
            if normalized:
                repo.path(normalized)
        except (UnsafeInput, ReadProblem) as exc:
            report.problem(exc)
            continue
        if date < today():
            report.add("EXCEPTION_EXPIRED", "warning", "An exception has expired and does not suppress any finding.", normalized)
            continue
        key = (code, normalized)
        if key in valid:
            report.add("EXCEPTION_DUPLICATE", "error", "Only one current exception may exist for an exact code/path pair.", normalized)
            continue
        if code in no_waive or code.startswith(("UNSAFE", "MANIFEST_", "ROOT_")):
            report.add("EXCEPTION_INVALID", "error", "Unsafe paths, invalid manifests, incomplete scans, and exception-validation findings cannot be waived.", normalized)
            continue
        valid[key] = expiry
    used: set[tuple[str, str]] = set()
    for finding in report.findings:
        key = (finding["code"], finding["path"])
        if key in valid and finding["code"] not in no_waive and not finding["code"].startswith(("UNSAFE", "MANIFEST_", "ROOT_")):
            used.add(key)
            finding["original_severity"] = finding["severity"]
            finding["severity"] = "info"
            finding["excepted"] = True
            finding["exception_expires"] = valid[key]
            finding["message"] += " Covered by a current exact exception; its reason remains in the manifest."
    for key in sorted(set(valid) - used):
        report.add("EXCEPTION_UNUSED", "info", "A current exact exception did not match a finding in this run.", key[1])


def frontmatter(text: str) -> tuple[dict[str, Any], list[str], bool]:
    """Parse simple top-level scalars and JSON lists without pretending full YAML."""
    lines = text.lstrip("\ufeff").splitlines()
    if not lines or lines[0].strip() != "---":
        return {}, [], False
    end = next((i for i, line in enumerate(lines[1:], 1) if line.strip() in {"---", "..."}), None)
    if end is None:
        return {}, ["frontmatter has no closing delimiter"], True
    data: dict[str, Any] = {}
    unsupported: list[str] = []
    i = 1
    while i < end:
        line = lines[i]
        if not line.strip() or line.lstrip().startswith("#"):
            i += 1
            continue
        match = re.match(r"^([A-Za-z_][A-Za-z0-9_-]*)\s*:\s*(.*)$", line)
        if not match:
            unsupported.append("nested or non-scalar YAML syntax")
            i += 1
            continue
        key, raw = match.groups()
        if key in data:
            unsupported.append("duplicate frontmatter keys")
        if re.fullmatch(r"[>|](?:[1-9][+-]?|[+-][1-9]?|)?(?:\s+#.*)?", raw):
            literal = raw.startswith("|")
            block: list[str] = []
            i += 1
            while i < end and (not lines[i].strip() or lines[i][0].isspace()):
                block.append(lines[i])
                i += 1
            nonblank = [len(s) - len(s.lstrip(" ")) for s in block if s.strip()]
            indent = min(nonblank) if nonblank else 0
            values = [s[indent:] for s in block]
            if literal:
                data[key] = "\n".join(values).strip()
            else:
                paragraphs: list[str] = []
                current: list[str] = []
                for value in values:
                    if value.strip():
                        current.append(value.strip())
                    else:
                        if current:
                            paragraphs.append(" ".join(current))
                            current = []
                        paragraphs.append("")
                if current:
                    paragraphs.append(" ".join(current))
                data[key] = "\n".join(paragraphs).strip()
            continue
        raw = re.sub(r"\s+#.*$", "", raw).strip() if not raw.startswith(("'", '"')) else raw.strip()
        if not raw:
            data[key] = None
            # Empty scalars can introduce mappings/lists that this parser does
            # not understand. Subsequent indented lines produce a diagnostic.
        elif raw.startswith('"'):
            try:
                decoder = json.JSONDecoder()
                value, consumed = decoder.raw_decode(raw)
                tail = raw[consumed:].strip()
                if not isinstance(value, str) or (tail and not tail.startswith("#")):
                    raise ValueError
                data[key] = value
            except (ValueError, RecursionError):
                unsupported.append("unsupported quoted scalar syntax")
        elif raw.startswith("'"):
            match_single = re.fullmatch(r"'((?:[^']|'')*)'\s*(?:#.*)?", raw)
            if match_single:
                data[key] = match_single.group(1).replace("''", "'")
            else:
                unsupported.append("unsupported quoted scalar syntax")
        elif raw.startswith(("[", "{")):
            try:
                data[key] = json.loads(raw)
            except (ValueError, RecursionError):
                unsupported.append("flow lists must use JSON syntax")
        elif raw in {"null", "~"}:
            data[key] = None
        elif raw.startswith(("&", "*", "!")) or raw in {"|", ">"}:
            unsupported.append("YAML anchors, aliases, or tags are unsupported")
        else:
            data[key] = raw
        i += 1
    return data, sorted(set(unsupported)), True


def without_code(text: str) -> str:
    clean: list[str] = []
    fence_char = ""
    fence_len = 0
    for line in text.splitlines():
        fence = re.match(r"^\s{0,3}(`{3,}|~{3,})(.*)$", line)
        if fence_char:
            if fence and fence.group(1)[0] == fence_char and len(fence.group(1)) >= fence_len and not fence.group(2).strip():
                fence_char = ""
            clean.append("")
            continue
        if fence:
            fence_char, fence_len = fence.group(1)[0], len(fence.group(1))
            clean.append("")
            continue
        clean.append(line)
    joined = "\n".join(clean)
    # Exact matching delimiter lengths are adequate for common inline examples.
    return re.sub(r"(?<!`)(`+)(?!`)(.*?)(?<!`)\1(?!`)", "", joined, flags=re.DOTALL)


def markdown_targets(text: str) -> list[str]:
    clean = without_code(text)
    targets: list[str] = []
    for match in re.finditer(r"\]\(\s*", clean):
        start = match.end()
        if start >= len(clean):
            continue
        if clean[start] == "<":
            end = clean.find(">", start + 1)
            if end != -1 and "\n" not in clean[start:end]:
                targets.append(clean[start + 1:end])
            continue
        cursor = start
        depth = 0
        value: list[str] = []
        while cursor < len(clean):
            char = clean[cursor]
            if char == "\\" and cursor + 1 < len(clean):
                value.append(clean[cursor + 1])
                cursor += 2
                continue
            if char == "(" :
                depth += 1
            elif char == ")":
                if depth == 0:
                    break
                depth -= 1
            elif char.isspace() and depth == 0:
                break
            value.append(char)
            cursor += 1
        if value:
            targets.append("".join(value))
    for match in re.finditer(r"^\s{0,3}\[(?!\^)[^\]\n]+\]:\s*(?:<([^>\n]+)>|(\S+))", clean, flags=re.MULTILINE):
        targets.append(match.group(1) or match.group(2))
    return targets


def check_links(repo: Repository, rel: str, text: str, report: Report) -> None:
    for target in sorted(set(markdown_targets(text))):
        if not target or target.startswith(("#", "//")) or re.match(r"^[A-Za-z][A-Za-z0-9+.-]*:", target):
            continue
        if target.startswith("/"):
            report.add("LINK_ROOT_RELATIVE_UNCHECKED", "info", "A site-root-relative link was not interpreted as a repository file link.", rel)
            continue
        if any(token in target for token in ("{{", "${", "<", ">")):
            report.add("LINK_DYNAMIC_UNCHECKED", "warning", "A variable or template link requires manual review and was not resolved.", rel)
            continue
        try:
            parsed = urlsplit(target)
            local = unquote(parsed.path)
            if not local:
                continue
            destination = repo.path(local, base=str(PurePosixPath(rel).parent))
            if not destination.exists():
                report.add("LINK_TARGET_MISSING", "error", "A relative file link points to a missing local target; fragments are not checked.", rel)
        except UnsafeInput:
            report.add("UNSAFE_LINK", "error", "A relative link escapes the selected root or traverses an unsafe path; it was not followed.", rel, unsafe=True)
        except (ReadProblem, OSError, ValueError):
            report.add("LINK_UNCHECKED", "warning", "A relative link could not be safely interpreted or inspected.", rel)


def check_skills(repo: Repository, paths: list[str], texts: dict[str, str], report: Report, mirrors: set[frozenset[str]]) -> None:
    names: dict[str, list[str]] = collections.defaultdict(list)
    for rel in paths:
        text = texts.get(rel)
        if text is None:
            continue
        fields, unsupported, exists = frontmatter(text)
        if not exists:
            report.add("SKILL_FRONTMATTER_MISSING", "error", "SKILL.md requires frontmatter containing name and description.", rel)
            continue
        if "frontmatter has no closing delimiter" in unsupported:
            report.add("SKILL_FRONTMATTER_MALFORMED", "error", "The opening frontmatter delimiter has no closing delimiter.", rel)
        if unsupported:
            report.add("SKILL_FRONTMATTER_UNSUPPORTED", "warning", "Unsupported or ambiguous YAML syntax requires manual review; this file is not certified as valid YAML.", rel)
        for key in ("name", "description"):
            value = fields.get(key)
            if not isinstance(value, str) or not value.strip():
                severity = "warning" if unsupported else "error"
                report.add("SKILL_METADATA_UNVERIFIED" if unsupported else "SKILL_METADATA_INVALID", severity, "Required skill name or description is missing, empty, or not a supported scalar.", rel)
        name, description = fields.get("name"), fields.get("description")
        if isinstance(name, str):
            if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", name) or not 1 <= len(name) <= 64:
                report.add("SKILL_NAME_INVALID", "error", "Skill name must be 1–64 lowercase letters/digits in kebab-case.", rel)
            if PurePosixPath(rel).parent.name != name:
                report.add("SKILL_FOLDER_MISMATCH", "error", "The skill folder name must match its declared skill name.", rel)
            names[name].append(rel)
        if isinstance(description, str) and len(description) > 1024:
            report.add("SKILL_DESCRIPTION_TOO_LONG", "error", "Skill description exceeds the 1024-character basic metadata limit.", rel)
    for paths_for_name in names.values():
        if len(paths_for_name) < 2:
            continue
        # A connected set of exact generated-copy receipts is one canonical
        # skill with tool mirrors. Unreceipted duplicates remain review items.
        reached = {paths_for_name[0]}
        while True:
            expanded = set(reached)
            for pair in mirrors:
                if pair & reached:
                    expanded.update(pair & set(paths_for_name))
            if expanded == reached:
                break
            reached = expanded
        if reached == set(paths_for_name):
            report.add("SKILL_MIRROR_VERIFIED", "info", "Duplicate skill IDs are accounted for by current exact-copy receipts; host discovery is still untested.", paths_for_name[0])
        else:
            for rel in paths_for_name:
                report.add("SKILL_ID_DUPLICATE", "warning", "The same skill ID appears in multiple locations without complete verified exact-copy receipts.", rel)


def string_list(value: Any) -> bool:
    return isinstance(value, list) and all(isinstance(item, str) and item.strip() for item in value)


def graph_cycles(records: dict[str, dict[str, Any]], edge_key: str) -> list[list[str]]:
    """Iterative DFS avoids recursion limits on large but bounded record sets."""
    state: dict[str, int] = {}
    cycles: list[list[str]] = []
    seen_cycles: set[frozenset[str]] = set()
    for start in records:
        if state.get(start, 0):
            continue
        stack = [(start, iter(records[start].get(edge_key, [])))]
        active = [start]
        positions = {start: 0}
        state[start] = 1
        while stack:
            node, iterator = stack[-1]
            try:
                neighbor = next(iterator)
            except StopIteration:
                stack.pop()
                active.pop()
                positions.pop(node, None)
                state[node] = 2
                continue
            if neighbor not in records:
                continue
            if state.get(neighbor, 0) == 1:
                cycle = active[positions[neighbor]:]
                key = frozenset(cycle)
                if key not in seen_cycles:
                    seen_cycles.add(key)
                    cycles.append(cycle)
            elif state.get(neighbor, 0) == 0:
                state[neighbor] = 1
                positions[neighbor] = len(active)
                active.append(neighbor)
                stack.append((neighbor, iter(records[neighbor].get(edge_key, []))))
    return cycles


def under(path: str, directory: str) -> bool:
    prefix = PurePosixPath(directory)
    return PurePosixPath(path) != prefix and prefix in PurePosixPath(path).parents


def check_tasks(repo: Repository, files: list[str], directory: str, texts: dict[str, str], report: Report, external: bool) -> None:
    records: dict[str, dict[str, Any]] = {}
    for rel in files:
        if not under(rel, directory) or not rel.lower().endswith(".md"):
            continue
        if any(part in {"templates", "fixtures", "assets"} for part in PurePosixPath(rel).parts[:-1]):
            continue
        text = texts.get(rel)
        if text is None:
            text = readable_text(repo, rel, report)
            if text is not None:
                texts[rel] = text
        if text is None:
            continue
        fields, unsupported, _ = frontmatter(text)
        if "frontmatter has no closing delimiter" in unsupported and re.search(r"^kind:\s*['\"]?task['\"]?\s*$", text, re.MULTILINE):
            report.add("TASK_FRONTMATTER_MALFORMED", "error", "The apparent task frontmatter has no closing delimiter.", rel)
            continue
        if fields.get("kind") != "task":
            continue
        if unsupported:
            report.add("TASK_FRONTMATTER_UNSUPPORTED", "warning", "Task frontmatter uses syntax outside the basic parser; uncertain fields require review.", rel)
        ident, status = fields.get("id"), fields.get("status")
        if not isinstance(ident, str) or not ident.strip():
            report.add("TASK_ID_MISSING", "error", "Every task record requires a nonempty ID.", rel)
            continue
        if ident in records:
            report.add("TASK_ID_DUPLICATE", "error", "Task IDs must be unique within the configured task directory.", rel)
            report.add("TASK_ID_DUPLICATE", "error", "Task IDs must be unique within the configured task directory.", records[ident]["path"])
            continue
        if not isinstance(status, str) or status not in TASK_STATUSES:
            report.add("TASK_STATUS_INVALID", "error", "Task status is absent or unsupported.", rel)
            status = None
        dependencies = fields.get("depends_on", [])
        validation = fields.get("validation", [])
        if not string_list(dependencies):
            report.add("TASK_DEPENDENCIES_INVALID", "error", "depends_on must be a JSON-style list of nonempty task-ID strings.", rel)
            dependencies = []
        elif len(dependencies) != len(set(dependencies)):
            report.add("TASK_DEPENDENCY_DUPLICATE", "warning", "The same dependency appears more than once.", rel)
        if not string_list(validation):
            report.add("TASK_VALIDATION_INVALID", "error", "validation must be a JSON-style list of nonempty evidence strings.", rel)
            validation = []
        if status == "done" and (not validation or not all(meaningful(value) for value in validation)):
            report.add("TASK_DONE_WITHOUT_EVIDENCE", "error", "A done task requires meaningful validation evidence rather than empty or placeholder claims.", rel)
        records[ident] = {"path": rel, "status": status, "depends_on": dependencies}
    for ident, record in records.items():
        for dependency in record["depends_on"]:
            if dependency == ident:
                report.add("TASK_SELF_DEPENDENCY", "error", "A task cannot depend on itself.", record["path"])
            elif dependency not in records:
                report.add("TASK_DEPENDENCY_MISSING", "error", "A dependency does not resolve to a local task record.", record["path"])
            elif record["status"] in {"ready", "in_progress", "done"} and records[dependency]["status"] != "done":
                report.add("TASK_DEPENDENCY_UNFINISHED", "error", "A ready, in-progress, or done task depends on unfinished work; cancelled dependencies also require reconciliation.", record["path"])
    for cycle in graph_cycles(records, "depends_on"):
        for ident in cycle:
            report.add("TASK_DEPENDENCY_CYCLE", "error", "The task dependency graph contains a cycle.", records[ident]["path"])
    report.data["task_records"] = len(records)
    if external:
        report.add("EXTERNAL_TASK_AUTHORITY", "info", "Local records were checked as execution plans only; the external tracker was not queried or reconciled.", directory)


def check_adrs(repo: Repository, files: list[str], directory: str, texts: dict[str, str], report: Report) -> set[str]:
    records: dict[str, dict[str, Any]] = {}
    accepted_paths: set[str] = set()
    keys: dict[tuple[str, str], list[str]] = collections.defaultdict(list)
    for rel in files:
        if not under(rel, directory) or not rel.lower().endswith(".md"):
            continue
        if any(part in {"templates", "fixtures", "assets"} for part in PurePosixPath(rel).parts[:-1]):
            continue
        text = texts.get(rel)
        if text is None:
            text = readable_text(repo, rel, report)
            if text is not None:
                texts[rel] = text
        if text is None:
            continue
        fields, unsupported, _ = frontmatter(text)
        if "frontmatter has no closing delimiter" in unsupported and re.search(r"^kind:\s*['\"]?adr['\"]?\s*$", text, re.MULTILINE):
            report.add("ADR_FRONTMATTER_MALFORMED", "error", "The apparent ADR frontmatter has no closing delimiter.", rel)
            continue
        if fields.get("kind") != "adr":
            continue
        if unsupported:
            report.add("ADR_FRONTMATTER_UNSUPPORTED", "warning", "ADR frontmatter uses syntax outside the basic parser; uncertain fields require review.", rel)
        ident, status = fields.get("id"), fields.get("status")
        if not isinstance(ident, str) or not ident.strip():
            report.add("ADR_ID_MISSING", "error", "Every ADR record requires a nonempty ID.", rel)
            continue
        if ident in records:
            report.add("ADR_ID_DUPLICATE", "error", "ADR IDs must be unique within the configured decisions directory.", rel)
            report.add("ADR_ID_DUPLICATE", "error", "ADR IDs must be unique within the configured decisions directory.", records[ident]["path"])
            continue
        if not isinstance(status, str) or status not in ADR_STATUSES:
            report.add("ADR_STATUS_INVALID", "error", "ADR status is absent or unsupported.", rel)
            status = None
        supersedes = fields.get("supersedes", [])
        if not string_list(supersedes):
            report.add("ADR_SUPERSEDES_INVALID", "error", "supersedes must be a JSON-style list of ADR-ID strings.", rel)
            supersedes = []
        superseded_by = fields.get("superseded_by")
        if superseded_by is not None and (not isinstance(superseded_by, str) or not superseded_by.strip()):
            report.add("ADR_REPLACEMENT_INVALID", "error", "superseded_by must be null or a nonempty ADR-ID string.", rel)
            superseded_by = None
        if status == "superseded" and not superseded_by:
            report.add("ADR_REPLACEMENT_MISSING", "error", "A superseded ADR requires a replacement reference.", rel)
        decision_key = fields.get("decision_key")
        scope = fields.get("scope", "repository")
        if decision_key is not None and not isinstance(decision_key, str):
            report.add("ADR_DECISION_KEY_INVALID", "error", "decision_key must be a scalar string when present.", rel)
            decision_key = None
        if not isinstance(scope, str) or not scope.strip():
            report.add("ADR_SCOPE_INVALID", "error", "ADR scope must be a nonempty string.", rel)
            scope = "repository"
        if status == "accepted":
            accepted_paths.add(rel)
            if decision_key and decision_key.strip():
                keys[(decision_key, scope)].append(rel)
        records[ident] = {"path": rel, "status": status, "supersedes": supersedes, "superseded_by": superseded_by}
    for ident, record in records.items():
        replacement = record["superseded_by"]
        if replacement:
            if replacement not in records:
                report.add("ADR_REFERENCE_MISSING", "error", "The replacement ADR reference does not resolve.", record["path"])
            elif replacement == ident:
                report.add("ADR_SELF_REFERENCE", "error", "An ADR cannot replace itself.", record["path"])
            elif ident not in records[replacement]["supersedes"]:
                report.add("ADR_SUPERSESSION_NOT_RECIPROCAL", "error", "The replacement ADR does not reciprocate the supersession reference.", record["path"])
            if record["status"] != "superseded":
                report.add("ADR_SUPERSESSION_STATUS", "error", "An ADR with a replacement reference must have superseded status.", record["path"])
        for predecessor in record["supersedes"]:
            if predecessor not in records:
                report.add("ADR_REFERENCE_MISSING", "error", "A supersedes reference does not resolve.", record["path"])
            elif predecessor == ident:
                report.add("ADR_SELF_REFERENCE", "error", "An ADR cannot supersede itself.", record["path"])
            elif records[predecessor]["superseded_by"] != ident:
                report.add("ADR_SUPERSESSION_NOT_RECIPROCAL", "error", "The predecessor does not reciprocate the supersession reference.", record["path"])
    for cycle in graph_cycles(records, "supersedes"):
        for ident in cycle:
            report.add("ADR_SUPERSESSION_CYCLE", "error", "The ADR supersession graph contains a cycle.", records[ident]["path"])
    for paths in keys.values():
        if len(paths) > 1:
            for rel in paths:
                report.add("ADR_ACCEPTED_KEY_COLLISION", "warning", "Multiple accepted ADRs share a decision key and scope; a semantic review must determine the intended authority.", rel)
    report.data["adr_records"] = len(records)
    return accepted_paths


def check_repository(repo: Repository, report: Report, max_files: int, max_age: int | None) -> None:
    files = inventory(repo, report, max_files)
    manifest = load_manifest(repo, report)
    try:
        if not repo.path("AGENTS.md").is_file():
            report.add("AGENTS_MISSING", "warning", "No root AGENTS.md is present; existing native instruction files are still inspected.", "AGENTS.md")
    except (UnsafeInput, ReadProblem) as exc:
        report.problem(exc)
    instructions = set(report.data["instruction_files"])
    skills = list(report.data["skills"])
    docs = set(report.data["likely_docs"])
    active_docs: set[str] = set(instructions)
    mirrors: set[frozenset[str]] = set()
    if manifest is not None:
        report.data["manifest"] = {"path": MANIFEST, "schema_version": 1, "profile": manifest["profile"]}
        instructions.update(repo.relative(p) for p in manifest["instruction_files"])
        active_docs.update(instructions)
        mapped_docs = {repo.relative(manifest["paths"][r]) for r in ROLE_FILES}
        docs.update(mapped_docs)
        active_docs.update(mapped_docs)
        validate_commands(repo, manifest, report)
        validate_reviews(repo, manifest, report, max_age)
        mirrors = validate_adapters(repo, manifest, report)
        # Registered skill locations are valid even when the folder is named
        # differently from common native host conventions.
        skill_dir = repo.relative(manifest["paths"]["skills"])
        skills = sorted(set(skills) | {p for p in files if under(p, skill_dir) and skill_file(p)})
    relevant = sorted(instructions | set(skills) | docs)
    texts: dict[str, str] = {}
    for rel in relevant:
        text = readable_text(repo, rel, report)
        if text is not None:
            texts[rel] = text
    if manifest is not None:
        check_tasks(repo, files, repo.relative(manifest["paths"]["tasks"]), texts, report, manifest["task_authority"]["kind"] == "external")
        active_docs.update(check_adrs(repo, files, repo.relative(manifest["paths"]["decisions"]), texts, report))
    for rel, text in texts.items():
        check_links(repo, rel, text, report)
        if rel in active_docs:
            fields, _, _ = frontmatter(text)
            is_draft = rel not in instructions and isinstance(fields.get("status"), str) and fields["status"] in {"draft", "proposed"}
            if UNRESOLVED.search(without_code(text)):
                report.add("DRAFT_NOT_READY" if is_draft else "UNRESOLVED_CONTENT", "info" if is_draft else "warning", "Candidate UNKNOWN/TODO/TBD markers remain; draft content is not ready to be treated as settled guidance." if is_draft else "Candidate UNKNOWN/TODO/TBD markers require review before treating this as settled guidance.", rel)
    for rel in instructions:
        if rel in texts and PurePosixPath(rel).parent == PurePosixPath(".") and len(texts[rel].splitlines()) > 150:
            report.add("ROOT_INSTRUCTIONS_LONG", "warning", "Root instructions exceed the 150-line soft review budget; length alone does not establish harm.", rel)
    paragraphs: dict[str, set[str]] = collections.defaultdict(set)
    for rel in sorted(instructions):
        if rel in texts:
            for paragraph in re.split(r"\n\s*\n", without_code(texts[rel])):
                normalized = " ".join(paragraph.split())
                if len(normalized) >= 180 and len(normalized.split()) >= 25:
                    paragraphs[normalized].add(rel)
    for locations in paragraphs.values():
        if len(locations) > 1:
            for rel in sorted(locations):
                report.add("INSTRUCTION_PARAGRAPH_DUPLICATE", "warning", "A substantial instruction paragraph is duplicated across files; duplication may be intentional and does not prove contradiction.", rel)
    check_skills(repo, skills, texts, report, mirrors)
    if manifest is not None:
        apply_exceptions(repo, manifest, report)
    report.data["checked_text_files"] = len(texts)
    report.add("SEMANTIC_REVIEW_REQUIRED", "info", "Meaning, contradictory instructions, evidence quality, and actual agent behavior require a separate human/agent review; this helper did not certify them.")


def make_parents(repo: Repository, rel: str, created: list[str]) -> None:
    parent = PurePosixPath(rel).parent
    for directory in reversed([parent, *parent.parents]):
        if str(directory) == ".":
            continue
        path = repo.path(directory.as_posix())
        try:
            os.mkdir(path)
            created.append(directory.as_posix())
        except FileExistsError:
            repo.path(directory.as_posix(), directory=True)


def scaffold(repo: Repository, report: Report, profile: str, apply: bool) -> None:
    assets = Repository(Path(__file__).parent.parent / "assets")
    try:
        config = json.loads(assets.text("scaffold.json"))
    except (UnsafeInput, ReadProblem) as exc:
        report.problem(exc)
        return
    except (ValueError, RecursionError):
        report.add("SCAFFOLD_CONFIG_INVALID", "error", "The bundled scaffold configuration is not valid JSON.")
        return
    if not isinstance(config, dict) or type(config.get("schema_version")) is not int or config["schema_version"] != 1 or not isinstance(config.get("profiles"), dict):
        report.add("SCAFFOLD_CONFIG_INVALID", "error", "The bundled scaffold configuration requires schema_version 1 and a profiles object.")
        return
    selected = config["profiles"].get(profile)
    if not isinstance(selected, dict) or not isinstance(selected.get("files"), list) or not selected["files"] or len(selected["files"]) > 1000:
        report.add("SCAFFOLD_CONFIG_INVALID", "error", "The selected profile must contain between 1 and 1000 file entries.")
        return
    planned: list[tuple[str, bytes, str]] = []
    destinations: set[str] = set()
    for item in selected["files"]:
        if not isinstance(item, dict) or not isinstance(item.get("path"), str) or not isinstance(item.get("template"), str):
            report.add("SCAFFOLD_CONFIG_INVALID", "error", "Every scaffold file entry requires a template path and destination path.")
            continue
        try:
            destination = repo.relative(item["path"])
            if destination == "." or any(part in {".git", ".hg", ".svn"} for part in PurePosixPath(destination).parts):
                raise UnsafeInput("Scaffold destinations cannot be the repository root or version-control metadata.", destination)
            if destination in destinations:
                report.add("SCAFFOLD_CONFIG_INVALID", "error", "The profile contains duplicate destination paths.", destination)
                continue
            destinations.add(destination)
            path = repo.path(destination)
            content = assets.read(item["template"])
            if path.exists():
                existing = repo.read(destination)
                action = "unchanged" if existing == content else "conflict"
                if action == "conflict":
                    report.add("SCAFFOLD_CONFLICT", "error", "Existing content differs from the template and will not be overwritten or merged; the entire apply is aborted.", destination)
            else:
                action = "create"
            planned.append((destination, content, action))
        except (UnsafeInput, ReadProblem) as exc:
            report.problem(exc)
    for destination in destinations:
        if any(str(parent) in destinations for parent in PurePosixPath(destination).parents if str(parent) != "."):
            report.add("SCAFFOLD_CONFIG_INVALID", "error", "A planned file also serves as another planned file's parent directory.", destination)
    report.data.update({"profile": profile, "apply_requested": apply, "applied": False,
                        "plan": [{"path": path, "action": action} for path, _, action in planned]})
    if report.exit_code() or not apply:
        if not apply:
            report.add("PLAN_ONLY", "info", "No files were written. Re-run with --apply to create the reviewed plan.")
        return
    created_files: list[tuple[str, str]] = []
    created_dirs: list[str] = []
    try:
        # Repeat all conflict checks immediately before creating any directory.
        for rel, content, action in planned:
            path = repo.path(rel)
            if action == "unchanged":
                if repo.read(rel) != content:
                    raise ReadProblem("Existing content changed during preflight; no replacement is permitted.", rel, "SCAFFOLD_CONCURRENT_CHANGE")
            elif path.exists():
                raise ReadProblem("A destination appeared during preflight; no replacement is permitted.", rel, "SCAFFOLD_CONCURRENT_CHANGE")
        for rel, content, action in planned:
            if action == "unchanged":
                continue
            make_parents(repo, rel, created_dirs)
            path = repo.path(rel)
            descriptor = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL | getattr(os, "O_NOFOLLOW", 0) | getattr(os, "O_BINARY", 0), 0o644)
            expected_hash = hashlib.sha256(content).hexdigest()
            # Register before writing so a partial write can be removed safely.
            created_files.append((rel, expected_hash))
            with os.fdopen(descriptor, "wb") as stream:
                stream.write(content)
                stream.flush()
                os.fsync(stream.fileno())
        report.data["applied"] = True
        report.data["created_files"] = [rel for rel, _ in created_files]
        report.add("SCAFFOLD_APPLIED", "info", "The scaffold was created without replacing existing content. UNKNOWN markers still require grounded completion.")
    except (UnsafeInput, ReadProblem, OSError) as exc:
        if isinstance(exc, (UnsafeInput, ReadProblem)):
            report.problem(exc)
        else:
            report.add("SCAFFOLD_WRITE_FAILED", "error", "A filesystem write failed; only files created by this run are eligible for rollback.")
        preserved: list[str] = []
        for rel, expected_hash in reversed(created_files):
            try:
                # Never remove a file that another process changed after creation.
                if repo.digest(rel) == expected_hash:
                    repo.path(rel, regular=True).unlink()
                else:
                    preserved.append(rel)
            except (UnsafeInput, ReadProblem, OSError):
                preserved.append(rel)
        for rel in reversed(created_dirs):
            try:
                repo.path(rel, directory=True).rmdir()
            except (UnsafeInput, ReadProblem, OSError):
                pass
        if preserved:
            report.add("SCAFFOLD_ROLLBACK_PARTIAL", "error", "Some newly created files could not be safely rolled back; review the reported paths before retrying.")
            report.data["rollback_review_paths"] = preserved
        else:
            report.add("SCAFFOLD_ROLLED_BACK", "info", "Files created by this run were rolled back; pre-existing files were preserved.")


def record_review(repo: Repository, report: Report, document: str, evidence: list[str], note: str, apply: bool) -> None:
    """Serialize cooperating writers before reading their input manifest.

    Exclusive lock creation closes the read/check/replace race between helper
    processes. Hash checks still detect many external edits, but an editor that
    ignores this lock must be coordinated separately; this is not a filesystem
    transaction or an exclusive lock enforced on arbitrary external programs.
    """
    if not apply:
        _record_review(repo, report, document, evidence, note, apply=False)
        return
    # A failed process leaves its lock for deliberate operator investigation.
    # Do not infer staleness from a PID, age, platform, or machine identity.
    lock_path = repo.path(REVIEW_LOCK)
    repo.path(str(PurePosixPath(REVIEW_LOCK).parent), directory=True)
    try:
        descriptor = os.open(lock_path, os.O_RDWR | os.O_CREAT | os.O_EXCL | getattr(os, "O_NOFOLLOW", 0) | getattr(os, "O_CLOEXEC", 0) | getattr(os, "O_BINARY", 0), 0o600)
    except FileExistsError:
        report.data["review_lock"] = {"path": REVIEW_LOCK, "acquired": False}
        report.add("REVIEW_LOCKED", "error", "A review-writer lock already exists. Retry after its active owner completes; investigate an abandoned lock deliberately. This helper never removes a pre-existing lock.", REVIEW_LOCK)
        return
    identity = os.fstat(descriptor)
    lock_bytes = (json.dumps({"schema_version": 1, "token": uuid.uuid4().hex, "pid": os.getpid(), "created_at": dt.datetime.now(dt.timezone.utc).isoformat()}, sort_keys=True) + "\n").encode("utf-8")
    written = b""
    try:
        # Retain the original descriptor for identity checks during cleanup.
        while len(written) < len(lock_bytes):
            count = os.write(descriptor, lock_bytes[len(written):])
            if count <= 0:
                raise OSError("Lock metadata write did not advance")
            written += lock_bytes[len(written):len(written) + count]
        os.fsync(descriptor)
        report.data["review_lock"] = {"path": REVIEW_LOCK, "acquired": True}
        _record_review(repo, report, document, evidence, note, apply=True)
    finally:
        try:
            current_path = repo.path(REVIEW_LOCK, regular=True)
            current = current_path.stat(follow_symlinks=False)
            if (current.st_dev, current.st_ino) == (identity.st_dev, identity.st_ino) and repo.read(REVIEW_LOCK, 4096) == written:
                current_path.unlink()
            else:
                report.add("REVIEW_LOCK_CHANGED", "warning", "The lock's identity or content changed; it was preserved because this process can no longer establish ownership.", REVIEW_LOCK)
        except (UnsafeInput, ReadProblem, OSError):
            report.add("REVIEW_LOCK_NOT_REMOVED", "warning", "This process could not safely remove its lock. Inspect the lock path and active writers before another apply; no foreign lock was deliberately removed.", REVIEW_LOCK)
        finally:
            os.close(descriptor)


def _record_review(repo: Repository, report: Report, document: str, evidence: list[str], note: str, apply: bool) -> None:
    if not meaningful(note) or len(note.strip()) < 12:
        raise UnsafeInput("--note must explain the actual review basis and must not be a placeholder.", "--note", "REVIEW_NOTE_INVALID")
    original = repo.read(MANIFEST)
    original_hash = hashlib.sha256(original).hexdigest()
    manifest = load_manifest(repo, report, required=True)
    if manifest is None:
        return
    validate_commands(repo, manifest, report)
    validate_reviews(repo, manifest, report, None)
    validate_adapters(repo, manifest, report)
    apply_exceptions(repo, manifest, report)
    if report.exit_code():
        report.add("REVIEW_NOT_RECORDED", "error", "The manifest has structural errors and was not changed.", MANIFEST)
        return
    rel = repo.relative(document)
    if rel in {MANIFEST, REVIEW_LOCK}:
        raise UnsafeInput("The manifest and review coordination lock cannot review or use themselves as evidence.", rel)
    repo.path(rel, regular=True)
    document_hash = repo.digest(rel)
    sources: dict[str, str] = {}
    for value in evidence:
        source = repo.relative(value)
        if source in {MANIFEST, REVIEW_LOCK}:
            raise UnsafeInput("The manifest and review coordination lock cannot be used as review evidence.", source)
        repo.path(source, regular=True)
        sources[source] = repo.digest(source)
    if not sources:
        if len(note.strip()) < 24:
            raise UnsafeInput("Without local evidence, --note must meaningfully document the greenfield or user-confirmed review basis.", "--note", "REVIEW_NOTE_INVALID")
        report.add("REVIEW_NO_LOCAL_EVIDENCE", "info", "No local evidence hashes were provided. The note must document the caller's greenfield or user-confirmed basis.", rel)
    review = {"reviewed_on": today().isoformat(), "document_sha256": document_hash, "evidence": sources, "note": note.strip()}
    reviews = manifest.setdefault("reviews", {})
    chosen_key = next((key for key in reviews if repo.relative(key) == rel), rel)
    reviews[chosen_key] = review
    report.data.update({"document": rel, "evidence_paths": sorted(sources), "reviewed_on": review["reviewed_on"], "apply_requested": apply, "applied": False})
    report.add("CALLER_REVIEW_EVIDENCE", "info", "This operation stores the caller's assertion and file hashes after their semantic review; it does not itself perform or certify that review.", rel)
    if not apply:
        report.add("PLAN_ONLY", "info", "No files were written. Re-run with --apply only after actually reviewing the document against the stated basis.")
        return
    if repo.digest(MANIFEST) != original_hash:
        report.add("MANIFEST_CONCURRENT_CHANGE", "error", "The manifest changed while preparing the review; it was not overwritten.", MANIFEST)
        return
    if repo.digest(rel) != document_hash or any(repo.digest(source) != expected for source, expected in sources.items()):
        report.add("REVIEW_INPUT_CHANGED", "error", "A reviewed document or evidence source changed during preparation; no review was stored.", rel)
        return
    payload = (json.dumps(manifest, indent=2, sort_keys=True, ensure_ascii=False) + "\n").encode("utf-8")
    manifest_path = repo.path(MANIFEST, regular=True)
    manifest_mode = stat.S_IMODE(manifest_path.stat().st_mode)
    temporary: str | None = None
    try:
        directory = repo.path(str(PurePosixPath(MANIFEST).parent), directory=True)
        descriptor, temporary = tempfile.mkstemp(prefix=".project-review-", suffix=".tmp", dir=directory)
        with os.fdopen(descriptor, "wb") as stream:
            stream.write(payload)
            stream.flush()
            os.fsync(stream.fileno())
        os.chmod(temporary, manifest_mode)
        if repo.digest(MANIFEST) != original_hash:
            report.add("MANIFEST_CONCURRENT_CHANGE", "error", "The manifest changed immediately before replacement; it was not overwritten.", MANIFEST)
            return
        repo.path(MANIFEST, regular=True)
        os.replace(temporary, manifest_path)
        temporary = None
        report.data["applied"] = True
        report.add("REVIEW_RECORDED", "info", "Only the selected document's review entry was updated, using atomic file replacement.", rel)
    finally:
        if temporary is not None:
            try:
                Path(temporary).unlink()
            except OSError:
                pass


def positive_int(value: str) -> int:
    try:
        number = int(value)
    except ValueError:
        raise argparse.ArgumentTypeError("must be an integer")
    if number < 1 or number > 100000:
        raise argparse.ArgumentTypeError("must be between 1 and 100000")
    return number


def nonnegative_int(value: str) -> int:
    try:
        number = int(value)
    except ValueError:
        raise argparse.ArgumentTypeError("must be an integer")
    if number < 0:
        raise argparse.ArgumentTypeError("must not be negative")
    return number


def argument_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Bounded, local-only structural helpers for agentic repositories. Never executes project commands or semantically certifies documents.")
    parser.add_argument("--version", action="version", version="agentic-codebase helper 1.0.0")
    subcommands = parser.add_subparsers(dest="command", required=True)
    for name, description in (
        ("inspect", "Inventory existing instructions, skills, build files, CI, and documentation without requiring a standard layout."),
        ("scaffold", "Plan an additive scaffold; --apply creates files only after all conflicts have been checked."),
        ("check", "Check local structure and review candidates; no manifest is required for generic checks."),
        ("record-review", "Store the caller's completed semantic-review evidence for one document; prefer local --evidence files."),
    ):
        command = subcommands.add_parser(name, description=description, help=description)
        command.add_argument("--root", default=".", help="Existing repository directory; defaults to the current directory. Symlink roots/ancestors are rejected.")
        command.add_argument("--json", action="store_true", help="Write a machine-readable report to stdout (no file contents).")
        if name in {"inspect", "check"}:
            command.add_argument("--max-files", type=positive_int, default=MAX_FILES, help="Bound inventory to this many files (default: 20000, maximum: 100000). Limits are reported.")
        if name == "scaffold":
            command.add_argument("--profile", choices=("minimal", "standard"), default="standard")
            command.add_argument("--apply", action="store_true", help="Apply the complete additive plan; existing differing files abort the entire apply.")
        elif name == "check":
            command.add_argument("--strict", action="store_true", help="Return exit code 1 for warnings as well as errors.")
            command.add_argument("--max-review-age", type=nonnegative_int, metavar="DAYS", help="Flag review-age candidates; age is not proof of staleness.")
        elif name == "record-review":
            command.add_argument("--document", required=True, help="Repository-relative document actually reviewed by the caller.")
            command.add_argument("--evidence", action="append", default=[], help="Repository-relative evidence file; repeat for multiple files. Prefer local evidence.")
            command.add_argument("--note", required=True, help="Explain the performed review. Without evidence, document the greenfield or user-confirmed basis.")
            command.add_argument("--apply", action="store_true", help="Store this one review entry under a cooperative exclusive lock; an existing lock fails with REVIEW_LOCKED. Otherwise show a read-only plan.")
    return parser


def emit_report(report: Report, as_json: bool, exit_code: int) -> None:
    payload = report.output()
    if as_json:
        payload["exit_code"] = exit_code
        print(json.dumps(payload, indent=2, ensure_ascii=True))
        return
    print(f"agentic-codebase {report.command}: {report.root}")
    counts = payload["summary"]
    print(f"{counts['error']} error(s), {counts['warning']} warning(s), {counts['info']} information item(s). Exit {exit_code}.")
    print("Structural checks only. Semantic consistency and runtime behavior are not certified.")
    if "scan" in report.data:
        scan = report.data["scan"]
        print(f"Inventory: {scan['file_count']} files using {scan['method']}; scan complete: {scan['complete']}.")
        for label in ("instruction_files", "skills", "build_manifests", "ci_files", "likely_docs"):
            values = report.data.get(label, [])
            print(f"{label}: {len(values)}")
            for path in values[:20]:
                print(f"  {path}")
            if len(values) > 20:
                print("  Further paths are available with --json.")
        if report.data.get("technologies"):
            print("Detected technology hints: " + ", ".join(report.data["technologies"]))
        boundaries = scan["excluded_boundaries"]
        if boundaries:
            print(f"Excluded boundaries: {len(boundaries)}")
            for entry in boundaries[:20]:
                print(f"  {entry['path']} ({entry['reason']})")
            if len(boundaries) > 20:
                print("  Further boundaries are available with --json.")
    if "plan" in report.data:
        for item in report.data["plan"]:
            print(f"  {item['action']}: {item['path']}")
    for finding in report.findings[:200]:
        location = f" [{finding['path']}]" if finding["path"] else ""
        print(f"{finding['severity'].upper()} {finding['code']}{location}: {finding['message']}")
    if len(report.findings) > 200:
        print("Further findings are available with --json.")
    print("Not checked: full YAML/Markdown syntax, anchors, remote links, ignored boundaries, command execution, semantic correctness, native host behavior.")


def main(argv: list[str] | None = None) -> int:
    args = argument_parser().parse_args(argv)
    report = Report(args.command, os.path.abspath(os.path.expanduser(args.root)))
    try:
        repo = Repository(args.root)
        if args.command == "inspect":
            inventory(repo, report, args.max_files)
        elif args.command == "check":
            check_repository(repo, report, args.max_files, args.max_review_age)
        elif args.command == "scaffold":
            scaffold(repo, report, args.profile, args.apply)
        else:
            record_review(repo, report, args.document, args.evidence, args.note, args.apply)
    except (UnsafeInput, ReadProblem) as exc:
        report.problem(exc)
    except OSError:
        report.add("FILESYSTEM_ERROR", "error", "A filesystem operation failed; no semantic verification claim is made.")
    exit_code = report.exit_code(getattr(args, "strict", False))
    emit_report(report, args.json, exit_code)
    return exit_code

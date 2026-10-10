#!/usr/bin/env python3
"""Plan a code-comment review without grading, rewriting, or printing source.

The inventory classifies filenames and reads at most 16 KiB of a recognised text
file to look for possible generated-file markers. With ``--signals``, that same
prefix is searched for text that may control compilers or other tools. These are
plain pattern matches, not parsed comments: strings and examples can also match.

Run ``python comment_inventory.py --help`` for scope and filtering details.
Only the Python standard library and, when available, read-only Git commands are
used. The script does not import project modules or run project configuration.
"""

from __future__ import annotations

import argparse
import codecs
from collections import Counter
from contextlib import contextmanager
from dataclasses import asdict, dataclass
import fnmatch
import json
import os
from pathlib import Path
import re
import stat
import subprocess
import sys
from typing import Iterator


PREFIX_BYTES = 16 * 1024
MAX_FILE_BYTES = 1024 * 1024
GIT_TIMEOUT_SECONDS = 30

# Skip output and third-party trees because their maintained sources usually
# live elsewhere. A pruned directory is reported once; its contents are unknown.
SKIP_DIRS = {
    ".git", ".hg", ".svn", "node_modules", "vendor", "generated",
    "__generated__", "dist", "build", "bin", "obj", "target", "coverage",
    ".venv", "venv", "__pycache__", ".next", ".nuxt", ".svelte-kit",
    ".astro", ".cache", ".turbo", ".parcel-cache", ".terraform", ".gradle",
    "pods", "deriveddata",
}
SECRET_DIRS = {".ssh", ".aws", ".gnupg", ".kube", ".secrets", "secrets"}
SECRET_NAMES = {
    ".env", ".netrc", "_netrc", ".npmrc", ".pypirc", ".git-credentials",
    "credentials", "credentials.json", "service-account.json", "secrets.json",
    "secrets.yaml", "secrets.yml", "secrets.toml", "kubeconfig", "id_rsa",
    "id_dsa", "id_ecdsa", "id_ed25519", "config.json.auth",
}
SECRET_SUFFIXES = {".pem", ".key", ".p12", ".pfx", ".jks", ".keystore", ".gpg"}
LOCK_NAMES = {
    "package-lock.json", "npm-shrinkwrap.json", "pnpm-lock.yaml", "yarn.lock",
    "cargo.lock", "go.sum", "composer.lock", "gemfile.lock", "pipfile.lock",
    "poetry.lock", "uv.lock", "bun.lock", "bun.lockb", "packages.lock.json",
    ".terraform.lock.hcl", "gradle.lockfile", "flake.lock", "mix.lock",
}
BINARY_SUFFIXES = {
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".bmp", ".avif",
    ".tif", ".tiff", ".heic", ".mp3", ".mp4", ".wav", ".ogg", ".flac",
    ".mov", ".avi", ".mkv", ".webm", ".woff", ".woff2", ".ttf", ".otf",
    ".zip", ".gz", ".bz2", ".xz", ".7z", ".rar", ".tar", ".pdf",
    ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".sqlite",
    ".sqlite3", ".db", ".exe", ".dll", ".so", ".dylib", ".o", ".a",
    ".lib", ".class", ".jar", ".pyc", ".pyo", ".pdb", ".wasm",
    ".glb", ".blend", ".psd", ".nupkg", ".deb", ".rpm",
}


@dataclass(frozen=True)
class Profile:
    """Describe a likely file format; these hints never authorise an edit."""

    language: str
    family: str
    comment_support: str
    syntax_hint: str
    documentation_hint: str = "Follow the repository's documentation tools."
    uncertainty: str | None = None


# The route is chosen from the filename, not from a parser or compiler. Ambiguous
# suffixes remain ambiguous so an agent cannot silently pick the wrong grammar.
PROFILES: dict[str, Profile] = {}


def _register(extensions: str, profile: Profile) -> None:
    """Give related suffixes one description to keep their guidance consistent."""
    for extension in extensions.split():
        PROFILES[extension] = profile


_register(".c", Profile("C", "source", "context-dependent", "/* */; // requires C99 or a supporting compiler extension", "Doxygen if configured.", "Confirm the language standard before adding // to older C code."))
_register(".cc .cpp .cxx .c++ .hpp .hh .hxx .cu .cuh", Profile("C++ / CUDA", "source", "yes", "// and /* */", "Doxygen if configured."))
_register(".h", Profile("C / C++ / Objective-C header", "source", "ambiguous", "Usually // and /* */", uncertainty="Confirm the owning language and documentation tool."))
_register(".m", Profile("Objective-C / MATLAB / Octave", "source", "ambiguous", "Objective-C: // and /* */; MATLAB/Octave: %", uncertainty="These languages use different comment grammars; identify the language first."))
_register(".mm", Profile("Objective-C++", "source", "yes", "// and /* */", "Use the configured Apple or Doxygen documentation format."))
_register(".cs", Profile("C#", "source", "yes", "// and /* */", "/// XML documentation comments."))
_register(".fs .fsi .fsx", Profile("F#", "source", "yes", "// and (* *)", "/// XML documentation comments."))
_register(".vb", Profile("Visual Basic .NET", "source", "yes", "'", "''' XML documentation comments."))
_register(".java", Profile("Java", "source", "yes", "// and /* */", "/** */ Javadoc; verify the project JDK before using newer forms."))
_register(".kt .kts", Profile("Kotlin", "source", "yes", "// and /* */", "/** */ KDoc."))
_register(".scala .sc", Profile("Scala", "source", "yes", "// and /* */", "/** */ Scaladoc."))
_register(".go", Profile("Go", "source", "yes", "// and /* */", "Go doc comments attached to declarations."))
_register(".rs", Profile("Rust", "source", "yes", "// and /* */", "/// and //! rustdoc; documentation examples may be tests."))
_register(".py .pyi .pyw", Profile("Python", "source", "yes", "#", "Docstrings are string expressions, not lexical comments."))
_register(".js .mjs .cjs", Profile("JavaScript", "source", "yes", "// and /* */", "/** */ JSDoc."))
_register(".ts .mts .cts", Profile("TypeScript", "source", "yes", "// and /* */", "/** */ TSDoc/JSDoc as supported by the configured tool."))
_register(".jsx .tsx", Profile("JavaScript/TypeScript with JSX", "mixed-template", "context-dependent", "JS/TS comments in code; {/* */} in JSX child content", uncertainty="Choose syntax for the current embedded region."))
_register(".php", Profile("PHP", "source", "yes", "//, # and /* */ inside PHP regions", "/** */ PHPDoc.", "Files can also contain HTML and embedded languages."))
_register(".rb .ru", Profile("Ruby", "source", "yes", "#; =begin/=end have placement rules", "RDoc or YARD as configured."))
_register(".swift", Profile("Swift", "source", "yes", "// and /* */", "/// or /** */ documentation markup / DocC."))
_register(".dart", Profile("Dart", "source", "yes", "// and /* */", "/// dartdoc."))
_register(".lua", Profile("Lua", "source", "yes", "-- and long-bracket comments", "LDoc or LuaLS annotations as configured."))
_register(".r", Profile("R", "source", "yes", "#", "#' roxygen2 when configured."))
_register(".jl", Profile("Julia", "source", "yes", "# and #= =#", "Docstrings attached to documented objects."))
_register(".ex .exs", Profile("Elixir", "source", "yes", "#", "@doc and @moduledoc attributes; these are not ordinary comments."))
_register(".erl .hrl", Profile("Erlang", "source", "yes", "%", "EDoc or supported -doc/-moduledoc attributes; verify OTP version."))
_register(".hs .lhs", Profile("Haskell", "source", "yes", "-- and {- -}", "Haddock; .lhs also requires checking the literate source format."))
_register(".ml .mli", Profile("OCaml", "source", "yes", "(* *)", "(** *) documentation / odoc."))
_register(".clj .cljs .cljc", Profile("Clojure", "source", "yes", ";", "Docstrings; reader-discard forms are not interchangeable with comments."))
_register(".lisp .lsp .el", Profile("Lisp family", "source", "context-dependent", "; is common; block forms depend on dialect", "Dialect-specific docstrings.", "Identify the Lisp dialect."))
_register(".cl", Profile("OpenCL / Common Lisp", "source", "ambiguous", "OpenCL: // and /* */; Lisp: ;", uncertainty="Identify the language before choosing comment syntax."))
_register(".d", Profile("D", "source", "yes", "//, /* */ and /+ +/", "Ddoc forms such as ///, /** */ and /++ +/."))
_register(".nim", Profile("Nim", "source", "yes", "# and #[ ]#", "## documentation comments."))
_register(".zig", Profile("Zig", "source", "yes", "//", "/// declaration docs and //! container docs."))
_register(".pl", Profile("Perl / Prolog", "source", "ambiguous", "Perl: #; Prolog: % and often /* */", uncertainty="Identify the language; .pl is not a reliable language decision."))
_register(".pm .pod", Profile("Perl / POD", "source", "yes", "# in Perl code", "POD directives; placement affects parsing."))
_register(".pro .prolog", Profile("Prolog or project configuration", "source", "ambiguous", "Prolog commonly uses % and /* */", uncertainty=".pro can also mean a qmake project; confirm the consumer."))
_register(".v", Profile("Verilog / Coq / V", "source", "ambiguous", "Verilog/V: // and /* */; Coq: (* *)", uncertainty="Identify the language before editing."))
_register(".sv .svh", Profile("SystemVerilog", "source", "yes", "// and /* */"))
_register(".vhd .vhdl", Profile("VHDL", "source", "context-dependent", "-- is widely supported; other forms depend on language version"))
_register(".f .for .f77", Profile("Fortran, source form unconfirmed", "source", "context-dependent", "Fixed-form comment columns differ from free-form !", uncertainty="Inspect compiler source-form settings; column position can change meaning."))
_register(".f90 .f95 .f03 .f08", Profile("Fortran, usually free form", "source", "yes", "!; confirm source-form settings"))
_register(".pas .pp .dpr", Profile("Pascal / Delphi", "source", "context-dependent", "{ } and (* *); // support depends on dialect"))
_register(".cob .cbl", Profile("COBOL", "source", "context-dependent", "Fixed-format indicator column or free-format *>", uncertainty="Confirm source format and compiler dialect."))
_register(".gd", Profile("GDScript", "source", "yes", "#", "## documentation comments."))
_register(".glsl .vert .frag .geom .comp .hlsl .wgsl", Profile("Shader source", "source", "yes", "// and /* */", uncertainty="Confirm the shader language, version and preprocessor."))
_register(".shader", Profile("Unity ShaderLab and embedded shaders", "mixed-template", "context-dependent", "Usually // and /* */; check the embedded region"))
_register(".s .asm", Profile("Assembly", "source", "ambiguous", "Assembler dialect determines ;, #, // or other forms", uncertainty="Identify the assembler and target architecture."))
_register(".inc .cls", Profile("Ambiguous include or class file", "source", "ambiguous", "No universal comment grammar", uncertainty="Identify the owning language and include context."))
_register(".sh .bash .zsh .fish", Profile("Shell script", "script-build", "context-dependent", "# outside quoted/word contexts; shell dialect matters", "Preserve the shebang, directives and line continuations."))
_register(".ps1 .psm1 .psd1", Profile("PowerShell", "script-build", "yes", "# and <# #>", "Comment-based help such as .SYNOPSIS and .PARAMETER."))
_register(".bat .cmd", Profile("Windows batch", "script-build", "context-dependent", "REM has command semantics; :: is a label, not a universal comment", uncertainty="Check blocks, redirection and command expansion before changing comments."))
_register(".sql", Profile("SQL", "query-schema", "context-dependent", "-- and /* */ are common; exact rules depend on database", "COMMENT ON or schema metadata is executable DDL, not a source comment.", "Confirm the database; some comment-like forms contain executable SQL or hints."))
_register(".graphql .gql", Profile("GraphQL", "query-schema", "yes", "#", "Schema descriptions use string literals, not comments."))
_register(".proto", Profile("Protocol Buffers", "query-schema", "yes", "// and /* */", "Adjacent comments may feed generated documentation."))
_register(".thrift", Profile("Thrift", "query-schema", "yes", "//, # and /* */"))
_register(".avdl", Profile("Avro IDL", "query-schema", "yes", "// and /* */", "Documentation comments may become schema metadata."))
_register(".json .jsonl .ndjson .avsc", Profile("Strict JSON / JSON Lines / JSON schema data", "data-no-comments", "none", "No comment syntax", "Use supported schema description/doc fields or adjacent documentation."))
_register(".csv .tsv", Profile("Delimited tabular data", "data-no-comments", "none", "No universal comment syntax; # and similar text can be data", "Use schema documentation or a companion document."))
_register(".jsonc .json5", Profile("JSONC / JSON5", "configuration", "yes", "// and /* */; verify the named format and consumer"))
_register(".yaml .yml", Profile("YAML", "configuration", "yes", "# outside scalars; indentation and scalar context matter"))
_register(".toml", Profile("TOML", "configuration", "yes", "# outside strings"))
_register(".ini .cfg .conf .config", Profile("Configuration, dialect unconfirmed", "configuration", "context-dependent", "No universal rule; #, ;, XML or other syntax may apply", uncertainty="Identify the consumer before inserting comments."))
_register(".properties", Profile("Java properties", "configuration", "yes", "# or ! at the beginning of a logical comment line"))
_register(".tf .tfvars .hcl", Profile("HCL / Terraform", "configuration", "yes", "#, // and /* */; # is the usual style", "Descriptions are supported attributes in some constructs."))
_register(".nix", Profile("Nix", "configuration", "yes", "# and /* */"))
_register(".cue", Profile("CUE", "configuration", "yes", "// only"))
_register(".dhall", Profile("Dhall", "configuration", "yes", "-- and {- -}"))
_register(".edn", Profile("EDN", "configuration", "context-dependent", "; comments; reader forms have separate semantics", uncertainty="Confirm the reader and supported extensions."))
_register(".cmake", Profile("CMake", "script-build", "yes", "# and bracket comments"))
_register(".bzl .bazel", Profile("Starlark", "script-build", "yes", "#", "Docstrings when supported by the documentation tool."))
_register(".groovy .gradle", Profile("Groovy", "script-build", "yes", "// and /* */", "Groovydoc if configured."))
_register(".mk", Profile("Make", "script-build", "context-dependent", "# in make syntax; recipe lines are parsed by a shell"))
_register(".xml .xsl .xslt .xsd .svg .xhtml .xaml .axml .resx .plist .csproj .vbproj .fsproj .vcxproj .props .targets .storyboard .xib .ui", Profile("XML and XML-based formats", "markup", "yes", "<!-- -->; comment text cannot contain --", "Preserve parser and tool directives; use schema-supported metadata when required."))
_register(".html .htm", Profile("HTML", "mixed-template", "context-dependent", "<!-- --> in HTML; embedded code uses its own grammar", uncertainty="Inspect script, style and template regions before editing."))
_register(".css .scss .sass .less", Profile("CSS / CSS preprocessor", "mixed-template", "context-dependent", "CSS: /* */; // is available only in certain preprocessors", uncertainty="Confirm the actual preprocessor; comments may be retained in output."))
_register(".vue .svelte .astro .razor .cshtml .vbhtml .jsp .jspx .erb .ejs .hbs .handlebars .twig .liquid .jinja .jinja2 .j2", Profile("Mixed-language template or component", "mixed-template", "context-dependent", "Template delimiters and embedded-language comment grammars differ", uncertainty="Identify each language region; emitted HTML comments may be public."))
_register(".ipynb", Profile("Jupyter notebook", "mixed-template", "context-dependent", "No comments in the JSON container; individual cells have their own languages", "Use Markdown cells or valid comments inside source cells.", "Inspect cell languages and preserve notebook structure and metadata."))
_register(".md .markdown .mdx .rmd .qmd .rst .adoc .asciidoc .tex", Profile("Documentation or literate source", "documentation", "context-dependent", "Markup, fenced code and executable regions use different grammars", uncertainty="Inspect the markup format and any embedded executable regions."))
_register(".txt", Profile("Plain text", "documentation", "not-applicable", "No code-comment grammar"))

NAMED_PROFILES = {
    "dockerfile": Profile("Dockerfile", "script-build", "yes", "#; parser directives have position-sensitive semantics"),
    "containerfile": Profile("Containerfile", "script-build", "yes", "#; confirm the image builder"),
    "makefile": PROFILES[".mk"], "gnumakefile": PROFILES[".mk"],
    "cmakelists.txt": PROFILES[".cmake"], "build": PROFILES[".bzl"],
    "workspace": PROFILES[".bzl"], "gemfile": PROFILES[".rb"],
    "rakefile": PROFILES[".rb"], "podfile": PROFILES[".rb"],
    "vagrantfile": PROFILES[".rb"], "brewfile": PROFILES[".rb"],
    "jenkinsfile": PROFILES[".groovy"],
    ".gitignore": Profile("Git ignore rules", "configuration", "yes", "# starts a comment unless escaped"),
    ".gitattributes": Profile("Git attributes", "configuration", "yes", "# at the beginning of a line"),
    ".dockerignore": Profile("Docker ignore rules", "configuration", "yes", "# in the first column"),
    ".editorconfig": Profile("EditorConfig", "configuration", "yes", "# and ; on separate comment lines"),
    ".env.example": Profile("Environment example", "configuration", "context-dependent", "# is common; dotenv parser rules differ", uncertainty="Confirm the consuming parser; an example file can still contain real credentials."),
}

GENERATED_PATTERN = re.compile(
    r"^[ \t]*(?:(?://|\#|/\*+|\*|--|<!--|;|!)[ \t]*)?"
    r"(?:<auto-generated\b|code generated\b[^\r\n]{0,200}\bdo not edit\b|"
    r"@generated\b|(?:this file (?:is|was) )?(?:automatically |auto-)generated\b|"
    r"generated (?:file|by)\b)", re.IGNORECASE | re.MULTILINE,
)
SIGNAL_PATTERNS = {
    "linter-or-type-control": re.compile(r"\b(?:eslint-(?:disable|enable)|pylint:|noqa\b|NOLINT\b|NOSONAR\b|no(?:sec)\b|phpcs:|phpstan-ignore|psalm-suppress|shellcheck\b)|@ts-(?:ignore|expect-error|nocheck|check)\b|\btype:\s*ignore\b"),
    "formatter-control": re.compile(r"\b(?:prettier-ignore|clang-format\s+(?:on|off)|fmt:\s*(?:on|off|skip))\b|@formatter:(?:on|off)\b"),
    "coverage-control": re.compile(r"\b(?:(?:istanbul|c8|coverage)\s+ignore|pragma:\s*no\s*(?:cover|branch))\b"),
    "build-or-compiler-control": re.compile(r"\bgo:(?:build|generate|embed|linkname|noescape|nosplit)\b|^\s*//\s*\+build\b|^\s*#\s*(?:pragma|nullable|requires)\b|^\s*#\s*(?:syntax|escape|check)="),
    "source-map-control": re.compile(r"\bsource(?:Mapping)?URL\s*="),
    "license-marker": re.compile(r"\bSPDX-License-Identifier\s*:"),
    "interpreter-or-encoding-marker": re.compile(r"^#!|^\s*#.*\bcoding[:=]\s*[-\w.]+"),
}


class InventoryError(Exception):
    """Report an unmet inventory requirement without exposing project output."""


class SkipFile(Exception):
    """Carry a fixed exclusion reason from a safe metadata or prefix operation."""


def _parts(relative: str) -> tuple[str, ...]:
    """Reject paths that could escape the selected root or change meaning on Windows."""
    parts = tuple(relative.split("/"))
    if (not relative or "\x00" in relative or "\\" in relative
            or any(part in {"", ".", ".."} for part in parts)
            or re.match(r"^[A-Za-z]:", relative)):
        raise SkipFile("unsafe-or-nonportable-path")
    return parts


class SafeRoot:
    """Keep content reads beneath one opened root and refuse symbolic links.

    POSIX descriptor-relative opens prevent a path component from redirecting a
    read through a symlink. Where these APIs are unavailable, only metadata is
    collected: prefix inspection is deliberately disabled rather than weakened.
    """

    def __init__(self, root: Path):
        self.root = root
        self.fd: int | None = None
        self.secure = (os.open in os.supports_dir_fd
                       and os.stat in os.supports_dir_fd
                       and os.scandir in os.supports_fd
                       and hasattr(os, "O_NOFOLLOW")
                       and hasattr(os, "O_DIRECTORY"))
        self.dir_flags = (os.O_RDONLY | getattr(os, "O_DIRECTORY", 0)
                          | getattr(os, "O_NOFOLLOW", 0)
                          | getattr(os, "O_CLOEXEC", 0))

    def __enter__(self) -> SafeRoot:
        """Open the root once so later renames cannot redirect content reads."""
        if self.secure:
            self.fd = os.open(self.root, self.dir_flags)
        return self

    def __exit__(self, *_: object) -> None:
        """Release the root descriptor even when a scan fails."""
        if self.fd is not None:
            os.close(self.fd)

    @contextmanager
    def _directory(self, parts: tuple[str, ...]) -> Iterator[int]:
        """Open each directory without following links and close every descriptor."""
        if self.fd is None:
            raise SkipFile("safe-prefix-read-unavailable")
        current = os.dup(self.fd)
        try:
            for part in parts:
                metadata = os.stat(part, dir_fd=current, follow_symlinks=False)
                if stat.S_ISLNK(metadata.st_mode):
                    raise SkipFile("symlink-in-path")
                if not stat.S_ISDIR(metadata.st_mode):
                    raise SkipFile("parent-is-not-directory")
                following = os.open(part, self.dir_flags, dir_fd=current)
                os.close(current)
                current = following
            yield current
        finally:
            os.close(current)

    def metadata(self, parts: tuple[str, ...]) -> os.stat_result:
        """Read file metadata while rejecting symlinked parent directories."""
        if self.secure:
            with self._directory(parts[:-1]) as parent:
                return os.stat(parts[-1], dir_fd=parent, follow_symlinks=False)
        path = self.root
        for part in parts:
            path = path / part
            result = path.lstat()
            if stat.S_ISLNK(result.st_mode):
                raise SkipFile("symlink-in-path")
        return result

    def entries(self, parts: tuple[str, ...]) -> list[tuple[str, int]]:
        """List names and file kinds only, without expanding symbolic links."""
        def collect(location: int | Path) -> list[tuple[str, int]]:
            with os.scandir(location) as entries:
                return sorted((entry.name, entry.stat(follow_symlinks=False).st_mode)
                              for entry in entries)
        if self.secure:
            with self._directory(parts) as directory:
                return collect(directory)
        if parts:
            mode = self.metadata(parts).st_mode
            if not stat.S_ISDIR(mode):
                raise SkipFile("parent-is-not-directory")
        return collect(self.root.joinpath(*parts))

    def prefix(self, parts: tuple[str, ...]) -> tuple[bytes, int, bool]:
        """Read a bounded prefix from a regular, non-symlink file.

        Returns bytes, the size observed on the opened file, and whether its
        metadata changed during the read. A nonblocking open prevents a raced
        replacement with a FIFO from hanging the inventory. Oversized files are
        checked again after opening because directory metadata may be stale.
        """
        with self._directory(parts[:-1]) as parent:
            flags = (os.O_RDONLY | os.O_NOFOLLOW | getattr(os, "O_NONBLOCK", 0)
                     | getattr(os, "O_CLOEXEC", 0))
            descriptor = os.open(parts[-1], flags, dir_fd=parent)
            try:
                before = os.fstat(descriptor)
                if not stat.S_ISREG(before.st_mode):
                    raise SkipFile("non-regular-file")
                if before.st_size > MAX_FILE_BYTES:
                    raise SkipFile("larger-than-1-MiB")
                data = os.read(descriptor, PREFIX_BYTES)
                after = os.fstat(descriptor)
                changed = ((before.st_size, before.st_mtime_ns)
                           != (after.st_size, after.st_mtime_ns))
                return data, before.st_size, changed
            finally:
                os.close(descriptor)


def _git(root: Path, arguments: list[str]) -> bytes:
    """Run a bounded, read-only Git command without a shell or repository hooks."""
    # Keep discovery local and noninteractive so a review cannot trigger a
    # credential prompt, lazy network fetch, or optional index update.
    environment = os.environ.copy()
    environment.update(GIT_OPTIONAL_LOCKS="0", GIT_TERMINAL_PROMPT="0",
                       GIT_NO_LAZY_FETCH="1", GIT_ALLOW_PROTOCOL="")
    command = ["git", "--no-pager", "--no-optional-locks", "-C", str(root),
               "-c", "core.fsmonitor=false", *arguments]
    try:
        result = subprocess.run(command, stdout=subprocess.PIPE,
                                stderr=subprocess.DEVNULL, env=environment,
                                timeout=GIT_TIMEOUT_SECONDS, check=False)
    except (OSError, subprocess.TimeoutExpired) as error:
        raise InventoryError("Git was unavailable or timed out.") from error
    if result.returncode:
        raise InventoryError("A read-only Git command failed.")
    return result.stdout


def _git_candidates(root: Path, revision: str | None) -> tuple[list[str], dict]:
    """Select tracked and nonignored untracked paths using NUL-delimited output.

    A revision selects index differences from that commit plus paths Git reports
    modified/deleted relative to the index. Untracked files are still included.
    Only current working-tree files are inspected; deletions are reported later.
    """
    top = Path(os.fsdecode(_git(root, ["rev-parse", "--show-toplevel"]).removesuffix(b"\n"))).resolve()
    try:
        prefix = root.relative_to(top).as_posix()
    except ValueError as error:
        raise InventoryError("Git reported a work tree outside the selected root.") from error
    pathspec = "." if prefix == "." else f":(literal){prefix}"
    common = ["--full-name", "-z", "--exclude-standard"]
    scope: dict = {"method": "git", "selection": "Tracked files and nonignored untracked files under root."}
    if revision is None:
        raw = _git(top, ["ls-files", *common, "--cached", "--others", "--", pathspec])
    else:
        if not revision.strip() or revision.startswith("-") or "\x00" in revision:
            raise InventoryError("--changed-from must be a nonempty revision that does not start with '-'.")
        try:
            commit = _git(top, ["rev-parse", "--verify", "--end-of-options", f"{revision}^{{commit}}"]).decode("ascii").strip()
        except (InventoryError, UnicodeError) as error:
            raise InventoryError("--changed-from did not resolve to an available commit.") from error
        if not re.fullmatch(r"[0-9a-fA-F]{40}|[0-9a-fA-F]{64}", commit):
            raise InventoryError("Git returned an unexpected commit identifier.")
        diff = ["diff", "--name-only", "-z", "--no-renames", "--no-ext-diff", "--no-textconv"]
        # A worktree content diff can invoke clean filters from repository
        # configuration. Filename/stat listing avoids that execution route and
        # may conservatively include a file whose content ultimately matches.
        raw = (_git(top, [*diff, "--cached", commit, "--", pathspec])
               + _git(top, ["ls-files", *common, "--modified", "--deleted", "--", pathspec])
               + _git(top, ["ls-files", *common, "--others", "--", pathspec]))
        scope.update(commit=commit, selection=(
            "Index differences from the resolved commit, tracked paths Git reports "
            "modified/deleted relative to the index, and nonignored untracked files. "
            "This conservative selection may include unchanged content. Inspect current "
            "working-tree content only; report missing/deleted paths as exclusions."))
    selected = set()
    prefix = "" if prefix == "." else prefix + "/"
    for name in raw.split(b"\x00"):
        if name:
            path = os.fsdecode(name)
            if path.startswith(prefix):
                selected.add(path[len(prefix):])
    return sorted(selected), scope


def _secret_path(parts: tuple[str, ...]) -> bool:
    """Screen conventional secret locations before opening or reading any file."""
    lower = [part.lower() for part in parts]
    name = lower[-1]
    return (any(part in SECRET_DIRS for part in lower[:-1])
            or name in SECRET_NAMES
            or (name.startswith(".env.") and name != ".env.example")
            or Path(name).suffix in SECRET_SUFFIXES
            or (len(lower) >= 2 and lower[-2:] == [".docker", "config.json"]))


def _name_exclusion(parts: tuple[str, ...]) -> str | None:
    """Apply ownership and privacy exclusions before examining source bytes."""
    if _secret_path(parts):
        return "possible-secret-or-private-key-name-not-read"
    if any(part.lower() in SKIP_DIRS for part in parts[:-1]):
        return "vendor-generated-or-build-directory"
    name = parts[-1].lower()
    if name in LOCK_NAMES or name.endswith((".lock", ".lockfile")):
        return "lock-file"
    if (re.search(r"\.min\.(?:js|mjs|cjs|css)$", name)
            or name.endswith(".map")):
        return "minified-file-or-source-map"
    if (re.search(r"\.(?:generated|designer|g|g\.i)\.(?:cs|vb)$", name)
            or ".generated." in name or ".pb." in name
            or name.endswith(("_pb2.py", "_pb2_grpc.py"))):
        return "generated-filename"
    if Path(name).suffix in BINARY_SUFFIXES:
        return "binary-or-container-file-extension"
    return None


def _matches(relative: str, patterns: list[str]) -> bool:
    """Match whole POSIX paths; * crosses / and leading **/ also includes root files."""
    return any(fnmatch.fnmatchcase(relative, pattern)
               or (pattern.startswith("**/")
                   and fnmatch.fnmatchcase(relative, pattern[3:]))
               for pattern in patterns)


def _profile(relative: str) -> Profile | None:
    """Resolve compound templates before their less specific final extensions."""
    name = relative.rsplit("/", 1)[-1].lower()
    if any(name.endswith(suffix) for suffix in (
            ".blade.php", ".html.j2", ".html.erb", ".html.eex", ".heex", ".eex")):
        return PROFILES[".jinja"]
    if name in NAMED_PROFILES:
        return NAMED_PROFILES[name]
    if name.startswith(("dockerfile.", "containerfile.")):
        return NAMED_PROFILES["dockerfile"]
    if name in {"license", "copying", "notice", "authors", "readme"}:
        return PROFILES[".txt"]
    return PROFILES.get(Path(name).suffix)


def _decode_prefix(data: bytes, truncated: bool) -> str:
    """Accept UTF BOMs and UTF-8, but do not mistake NUL-heavy binary data for text."""
    encoding = "utf-8"
    for bom, name in ((codecs.BOM_UTF32_LE, "utf-32"), (codecs.BOM_UTF32_BE, "utf-32"),
                      (codecs.BOM_UTF16_LE, "utf-16"), (codecs.BOM_UTF16_BE, "utf-16"),
                      (codecs.BOM_UTF8, "utf-8-sig")):
        if data.startswith(bom):
            encoding = name
            break
    if b"\x00" in data and encoding in {"utf-8", "utf-8-sig"}:
        raise SkipFile("binary-like-or-unrecognised-encoding-prefix")
    # Incremental decoding tolerates a multibyte character cut by the byte cap,
    # while still rejecting invalid bytes elsewhere in the inspected prefix.
    return codecs.getincrementaldecoder(encoding)(errors="strict").decode(data, final=not truncated)


def _filesystem_candidates(handle: SafeRoot, exclusions: list[dict]) -> list[str]:
    """Walk first-party directories without following symlinks or expanding exclusions."""
    candidates = []
    pending: list[tuple[str, ...]] = [()]
    while pending:
        parts = pending.pop()
        try:
            entries = handle.entries(parts)
        except (OSError, SkipFile):
            exclusions.append({"path": "/".join(parts) or ".", "kind": "directory", "reason": "directory-unavailable-or-unsafe"})
            continue
        for name, mode in entries:
            child = (*parts, name)
            relative = "/".join(child)
            if stat.S_ISLNK(mode):
                exclusions.append({"path": relative, "kind": "entry", "reason": "symlink-not-followed"})
            elif stat.S_ISDIR(mode):
                if name.lower() in SKIP_DIRS | SECRET_DIRS:
                    reason = ("possible-secret-directory-not-read" if name.lower() in SECRET_DIRS
                              else "vendor-generated-or-build-directory")
                    exclusions.append({"path": relative, "kind": "directory", "reason": reason})
                else:
                    try:
                        _parts(relative)
                    except SkipFile as error:
                        exclusions.append({"path": relative, "kind": "directory", "reason": str(error)})
                    else:
                        pending.append(child)
            else:
                candidates.append(relative)
    return sorted(candidates)


def build_inventory(root: Path, *, changed_from: str | None = None,
                    includes: list[str] | None = None, excludes: list[str] | None = None,
                    signals: bool = False) -> dict:
    """Return metadata for a focused human or agent comment review.

    Args:
        root: Existing directory that defines the review boundary.
        changed_from: Optional Git revision; failure is an error, not a wider scan.
        includes: Filename globs that narrow scope without overriding exclusions.
        excludes: Additional filename globs to remove from scope.
        signals: Search the inspected prefix for possible tool-directive markers.

    Returns:
        A JSON-compatible inventory with planned files, exclusions, uncertainties
        and explicit inspection limits. No source text or quality score is included.

    Raises:
        InventoryError: The root or a requested Git comparison cannot be used.
    """
    # Establish the review boundary before discovery so every later path is
    # interpreted relative to the same existing directory.
    root = root.expanduser()
    if root.is_symlink():
        raise InventoryError("--root must be a directory, not a symbolic link.")
    try:
        root = root.resolve(strict=True)
    except OSError as error:
        raise InventoryError("--root is unavailable.") from error
    if not root.is_dir():
        raise InventoryError("--root must be an existing directory.")
    if changed_from is not None and (not changed_from.strip()
                                    or changed_from.startswith("-") or "\x00" in changed_from):
        raise InventoryError("--changed-from must be a nonempty revision that does not start with '-'.")
    includes, excludes = includes or [], excludes or []
    result: dict = {
        "schema_version": 1, "root": str(root), "purpose": "Review planning only; not a comment audit or coverage measurement.",
        "scope": {}, "inspection": {}, "files": [], "categories": {},
        "exclusions": [], "uncertainties": [], "signals": [], "totals": {},
        "limitations": [
            "Language and ownership labels are filename/prefix hints, not parser results.",
            "Generated-marker and directive matches can occur in strings, examples or prose; verify them before editing.",
            "Only the first 16384 bytes of recognised text files are inspected; no absence claim applies beyond that prefix.",
            "Unrecognised file types are not read and need manual classification; embedded languages are not parsed.",
            "Conventional secret names are excluded before reads; arbitrarily named secrets or credentials embedded in source cannot be identified by this inventory.",
            "Pruned directories are not expanded or included in file totals. Git-ignored paths are not enumerated or counted in Git mode.",
            "Files may change during an inventory; this is not an atomic repository snapshot.",
        ],
    }
    with SafeRoot(root) as handle:
        # Prefer Git ownership and ignore rules. A requested comparison must
        # fail explicitly; only a general inventory may fall back to a walk.
        try:
            candidates, scope = _git_candidates(root, changed_from)
        except InventoryError as error:
            if changed_from is not None:
                raise InventoryError("Cannot honour --changed-from. A working Git repository and a valid available commit are required.") from error
            candidates = _filesystem_candidates(handle, result["exclusions"])
            scope = {"method": "filesystem", "selection": "Filesystem entries under root, excluding pruned trees and symlinks; Git ignore rules are not applied.",
                     "note": "Git enumeration was unavailable or failed; filesystem fallback was used."}
        result["scope"] = {**scope, "includes": includes, "excludes": excludes,
                           "enumerated_file_entries": len(candidates)}
        result["inspection"] = {
            "maximum_file_bytes": MAX_FILE_BYTES, "maximum_prefix_bytes": PREFIX_BYTES,
            "safe_prefix_reads_available": handle.secure, "directive_signals_requested": signals,
            "directive_signals_are_heuristic": True,
            "signal_scope": "Complete LF/CRLF lines in the inspected prefix only; no file text is emitted.",
        }
        if not handle.secure:
            result["limitations"].append("Safe no-follow descriptor APIs are unavailable on this platform; prefix and directive inspection were skipped.")
        # Reject excluded names before opening source so conventional secret
        # paths and derived artifacts never enter the prefix reader.
        for relative in candidates:
            try:
                parts = _parts(relative)
                if includes and not _matches(relative, includes):
                    raise SkipFile("outside-include-globs")
                if _matches(relative, excludes):
                    raise SkipFile("user-exclude-glob")
                reason = _name_exclusion(parts)
                if reason:
                    raise SkipFile(reason)
                metadata = handle.metadata(parts)
                if stat.S_ISLNK(metadata.st_mode):
                    raise SkipFile("symlink-not-followed")
                if not stat.S_ISREG(metadata.st_mode):
                    raise SkipFile("directory-or-non-regular-entry-not-traversed")
                if metadata.st_size > MAX_FILE_BYTES:
                    raise SkipFile("larger-than-1-MiB")
                # Keep uncertain grammars visible instead of selecting a
                # familiar delimiter for a file whose consumer is unknown.
                profile = _profile(relative)
                if profile is None:
                    result["uncertainties"].append({"path": relative, "reason": "Unrecognised file type; identify its format before reading it or adding comments."})
                    raise SkipFile("unrecognised-file-type-not-read")
                item = {"path": relative, **asdict(profile), "size_bytes": metadata.st_size,
                        "prefix_bytes_read": 0, "prefix_truncated": None}
                if profile.uncertainty:
                    result["uncertainties"].append({"path": relative, "reason": profile.uncertainty})
                if (profile.comment_support == "none" and Path(relative).suffix.lower() == ".json"
                        and (parts[-1].lower().startswith(("tsconfig", "jsconfig")) or ".vscode" in parts[:-1])):
                    result["uncertainties"].append({"path": relative, "reason": "This consumer may accept JSONC. Keep the strict JSON assumption until its rules are confirmed."})
                # Inspect a bounded prefix only when no-follow reads are
                # available; filename classification still works without them.
                if handle.secure:
                    data, size, changed = handle.prefix(parts)
                    item.update(size_bytes=size, prefix_bytes_read=len(data), prefix_truncated=size > len(data))
                    if changed:
                        result["uncertainties"].append({"path": relative, "reason": "File metadata changed during the prefix read; repeat the inspection before editing."})
                    try:
                        content = _decode_prefix(data, item["prefix_truncated"])
                    except UnicodeError:
                        content = None
                        result["uncertainties"].append({"path": relative, "reason": "Prefix encoding is not recognised UTF-8 or BOM-marked Unicode; generated and directive checks were skipped."})
                    if content is not None:
                        if GENERATED_PATTERN.search(content):
                            result["uncertainties"].append({"path": relative, "reason": "Possible generated-file marker in the prefix; confirm source ownership before editing."})
                            raise SkipFile("possible-generated-marker-heuristic")
                        if signals:
                            # Count physical LF/CRLF source lines; Unicode line
                            # separators inside strings must not move a signal.
                            lines = content.split("\n")
                            if item["prefix_truncated"]:
                                lines.pop()
                            for number, line in enumerate(lines, 1):
                                for marker_class, pattern in SIGNAL_PATTERNS.items():
                                    if pattern.search(line):
                                        result["signals"].append({"path": relative, "line": number, "marker_class": marker_class})
                result["files"].append(item)
            except SkipFile as error:
                result["exclusions"].append({"path": relative, "kind": "file", "reason": str(error)})
            except FileNotFoundError:
                result["exclusions"].append({"path": relative, "kind": "entry", "reason": "working-tree-path-missing-or-deleted"})
            except OSError:
                result["exclusions"].append({"path": relative, "kind": "entry", "reason": "path-unavailable-or-unsafe"})
    # Count observed entries separately from pruned directories so the report
    # does not imply that unseen files were reviewed or even enumerated.
    result["exclusions"].sort(key=lambda entry: (entry["path"], entry["reason"]))
    result["categories"] = dict(sorted(Counter(item["family"] for item in result["files"]).items()))
    excluded_kinds = Counter(item["kind"] for item in result["exclusions"])
    result["totals"] = {
        "planned_files": len(result["files"]), "excluded_file_entries": excluded_kinds["file"],
        "excluded_directories": excluded_kinds["directory"], "excluded_other_entries": excluded_kinds["entry"],
        "uncertainties": len(result["uncertainties"]), "heuristic_signal_matches": len(result["signals"]),
    }
    return result


def _text_report(result: dict) -> str:
    """Render metadata with quoted paths so control characters cannot alter output."""
    quote = lambda value: json.dumps(value, ensure_ascii=True)
    lines = [result["purpose"], f"Root: {quote(result['root'])}",
             f"Scope: {result['scope']['selection']}", f"Totals: {json.dumps(result['totals'], sort_keys=True)}",
             f"Categories: {json.dumps(result['categories'], sort_keys=True)}",
             f"Filters: include={quote(result['scope']['includes'])}; exclude={quote(result['scope']['excludes'])}",
             f"Prefix limit: {PREFIX_BYTES} bytes; directive matches are heuristic.", "", "Planned files:"]
    for item in result["files"]:
        lines.append(f"  {quote(item['path'])}: {item['language']}; comments={item['comment_support']}; prefix_truncated={item['prefix_truncated']}")
    lines.append("\nExclusions:")
    lines.extend(f"  {quote(item['path'])}: {item['reason']} ({item['kind']})" for item in result["exclusions"])
    lines.append("\nUncertainties:")
    lines.extend(f"  {quote(item['path'])}: {item['reason']}" for item in result["uncertainties"])
    lines.append("\nPossible directive markers (pattern matches, not parsed comments):")
    lines.extend(f"  {quote(item['path'])}:{item['line']}: {item['marker_class']}" for item in result["signals"])
    lines.append("\nLimits:")
    lines.extend(f"  {item}" for item in result["limitations"])
    return "\n".join(lines)


def main(argv: list[str] | None = None) -> int:
    """Write the requested inventory to stdout; return 2 for an unusable scope."""
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--root", type=Path, default=Path.cwd(), help="Review boundary; defaults to the current directory.")
    parser.add_argument("--format", choices=("json", "text"), default="json", help="Output format (default: json).")
    parser.add_argument("--changed-from", metavar="REV", help="Select index differences from REV, Git-reported modified/deleted files, and nonignored untracked files. May conservatively include unchanged content. Requires an available commit.")
    parser.add_argument("--include", action="append", default=[], metavar="GLOB", help="Repeat to narrow scope; match full relative POSIX paths. * also matches /. Leading **/ includes root files. Does not override default exclusions.")
    parser.add_argument("--exclude", action="append", default=[], metavar="GLOB", help="Repeat to add filename exclusions; same matching rules as --include.")
    parser.add_argument("--signals", action="store_true", help="Report possible tool-directive markers in complete prefix lines, as path/line/class only. Strings and examples can also match.")
    args = parser.parse_args(argv)
    try:
        result = build_inventory(args.root, changed_from=args.changed_from,
                                 includes=args.include, excludes=args.exclude, signals=args.signals)
    except (InventoryError, OSError) as error:
        message = str(error) if isinstance(error, InventoryError) else "The root could not be opened safely."
        parser.error(message)
    output = json.dumps(result, ensure_ascii=True, indent=2) if args.format == "json" else _text_report(result)
    try:
        print(output)
    except BrokenPipeError:
        return 0
    return 0


if __name__ == "__main__":
    sys.exit(main())

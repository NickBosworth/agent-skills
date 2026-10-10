"""Bounded, dependency-free local input/output helpers. No network operations."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit


class InputError(ValueError):
    """An input is unsafe, ambiguous, malformed or outside the tool's contract."""


def read_bounded(path: Path, limit: int) -> bytes:
    """Bound the actual read as well as the file, rather than trusting a stat check."""
    if not path.is_file():
        raise InputError(f"Not a regular readable file: {path}")
    with path.open("rb") as stream:
        data = stream.read(limit + 1)
    if len(data) > limit:
        raise InputError(f"File exceeds the {limit}-byte input limit: {path}")
    return data


def local_reference(root: Path, name: Any) -> Path:
    """Keep manifest-referenced files inside its directory, including symlinks."""
    if not isinstance(name, str) or not name or "\x00" in name:
        raise InputError("A snapshot path must be a nonempty relative string.")
    supplied = Path(name)
    if supplied.is_absolute():
        raise InputError("Absolute snapshot paths are not permitted.")
    path = (root / supplied).resolve()
    try:
        path.relative_to(root.resolve())
    except ValueError as exc:
        raise InputError("Snapshot path escapes the manifest directory.") from exc
    return path


def http_url(value: Any) -> str:
    """Validate URL shape only; never resolve or fetch it, and preserve its spelling."""
    if not isinstance(value, str) or not value or any(c.isspace() or ord(c) < 32 for c in value):
        raise InputError("URL must be nonempty and contain no whitespace/control characters.")
    try:
        parts = urlsplit(value)
        _ = parts.port  # Force invalid-port validation without making a request.
    except ValueError as exc:
        raise InputError("Malformed HTTP(S) URL.") from exc
    if parts.scheme.lower() not in ("http", "https") or not parts.hostname:
        raise InputError("An absolute HTTP(S) URL is required.")
    if parts.username is not None or parts.password is not None:
        raise InputError("Credential-bearing URLs are not permitted.")
    if parts.fragment:
        raise InputError("Inventory URLs must not contain fragments.")
    return value


def reject_json_constant(value: str) -> None:
    """JSON does not permit NaN or Infinity, even though Python accepts them by default."""
    raise InputError(f"Nonstandard JSON constant: {value}")


def load_json(path: Path, limit: int = 5 * 1024 * 1024) -> Any:
    try:
        return json.loads(read_bounded(path, limit).decode("utf-8"), parse_constant=reject_json_constant)
    except (UnicodeError, json.JSONDecodeError, RecursionError) as exc:
        raise InputError(f"Invalid UTF-8 JSON: {path}") from exc


def emit_json(value: Any, output: Path | None = None) -> None:
    """Write a new explicitly requested file, or stdout; never overwrite an input."""
    text = json.dumps(value, indent=2, ensure_ascii=True, allow_nan=False) + "\n"
    if output is None:
        print(text, end="")
        return
    try:
        with output.open("x", encoding="utf-8", newline="\n") as stream:
            stream.write(text)
    except FileExistsError as exc:
        raise InputError(f"Refusing to overwrite existing output: {output}") from exc

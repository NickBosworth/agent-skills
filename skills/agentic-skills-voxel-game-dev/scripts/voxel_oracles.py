#!/usr/bin/env python3
"""Small, exact integer-grid oracles. Python 3.10+, standard library only."""

from __future__ import annotations

import argparse
from collections import Counter
import itertools
import json
from pathlib import Path
import sys
from typing import NamedTuple

Vec3 = tuple[int, int, int]
NORMALS: tuple[Vec3, ...] = (
    (-1, 0, 0), (0, -1, 0), (0, 0, -1),
    (0, 0, 1), (0, 1, 0), (1, 0, 0),
)
MAX_CELLS = 4096
MAX_DIRTY_CHUNKS = 4096
MAX_DEPENDENCY_RECORDS = 50000
MAX_FACE_RECORDS = 50000
MAX_JSON_BYTES = 32 * 1024 * 1024


class Face(NamedTuple):
    cell: Vec3
    normal: Vec3
    chunk: Vec3


def nonnegative(value: str) -> int:
    result = int(value)
    if result < 0:
        raise argparse.ArgumentTypeError("must be a nonnegative integer")
    return result


def positive(value: str) -> int:
    result = nonnegative(value)
    if result == 0:
        raise argparse.ArgumentTypeError("must be a positive integer")
    return result


def dimensions(values: list[int]) -> Vec3:
    if len(values) not in (1, 3) or any(type(v) is not int or v <= 0 for v in values):
        raise ValueError("chunk size must contain one or three positive integers")
    return tuple(values * 3 if len(values) == 1 else values)  # type: ignore[return-value]


def vector(value: object, label: str) -> Vec3:
    if not isinstance(value, (list, tuple)) or len(value) != 3:
        raise ValueError(f"{label} must contain exactly three integers")
    if any(type(v) is not int for v in value):
        raise ValueError(f"{label} must contain integers, not booleans or fractions")
    return tuple(value)  # type: ignore[return-value]


def cells(values: list[list[int]] | None, label: str) -> set[Vec3]:
    values = values or []
    if len(values) > MAX_CELLS:
        raise ValueError(f"{label} exceeds the {MAX_CELLS}-cell fixture limit")
    result = {vector(v, label) for v in values}
    if len(result) != len(values):
        raise ValueError(f"{label} contains duplicate cells")
    return result


def chunk_local(cell: Vec3, size: Vec3) -> tuple[Vec3, Vec3]:
    """Floor division is essential: local coordinates remain in [0, size)."""
    chunk = tuple(p // n for p, n in zip(cell, size))
    local = tuple(p % n for p, n in zip(cell, size))
    return chunk, local  # type: ignore[return-value]


def local_index(local: Vec3, size: Vec3) -> int:
    if any(p < 0 or p >= n for p, n in zip(local, size)):
        raise ValueError("local coordinate is outside the chunk")
    x, y, z = local
    nx, ny, _ = size
    return x + nx * (y + ny * z)


def dirty_chunks(cell: Vec3, size: Vec3, halo: int) -> set[Vec3]:
    """All cores whose symmetric padded sample domain contains this cell."""
    if halo < 0:
        raise ValueError("halo must be nonnegative")
    ranges = [range((p - halo) // n, (p + halo) // n + 1)
              for p, n in zip(cell, size)]
    count = 1
    for values in ranges:
        # Do not call len(range): its result can exceed Py_ssize_t.
        count *= values.stop - values.start
    if count > MAX_DIRTY_CHUNKS:
        raise ValueError(f"halo produces more than {MAX_DIRTY_CHUNKS} dirty chunks")
    return set(itertools.product(*ranges))


def exposed_faces(owned: set[Vec3], context: set[Vec3], size: Vec3) -> set[Face]:
    """Emit unit faces for owned opaque cells; context only occludes faces."""
    occupied = owned | context
    result: set[Face] = set()
    for cell in owned:
        owner, _ = chunk_local(cell, size)
        for normal in NORMALS:
            neighbor = tuple(p + d for p, d in zip(cell, normal))
            if neighbor not in occupied:
                result.add(Face(cell, normal, owner))
    return result


def face_json(face: Face) -> dict:
    return {"cell": list(face.cell), "normal": list(face.normal), "chunk": list(face.chunk)}


def mapping(cell: Vec3, size: Vec3) -> dict:
    chunk, local = chunk_local(cell, size)
    return {
        "cell": list(cell), "chunk": list(chunk), "local": list(local),
        "linear_index": local_index(local, size),
        "reconstructed": [c * n + p for c, n, p in zip(chunk, size, local)],
    }


def edits_json(edits: set[Vec3], size: Vec3, halo: int) -> tuple[list[dict], list[list[int]]]:
    records, union, total_records = [], set(), 0
    for cell in sorted(edits):
        affected = dirty_chunks(cell, size, halo)
        total_records += len(affected)
        if total_records > MAX_DEPENDENCY_RECORDS:
            raise ValueError(f"edits produce more than {MAX_DEPENDENCY_RECORDS} dependency records")
        union.update(affected)
        if len(union) > MAX_DIRTY_CHUNKS:
            raise ValueError(f"edits affect more than {MAX_DIRTY_CHUNKS} total chunks")
        records.append({"cell": list(cell), "dirty_chunks": [list(c) for c in sorted(affected)]})
    return records, [list(c) for c in sorted(union)]


def scene(name: str, size: Vec3) -> set[Vec3]:
    fixed = {
        "empty": set(), "isolated": {(0, 0, 0)},
        "adjacent": {(0, 0, 0), (1, 0, 0)},
        "boundary": {(size[0] - 1, 0, 0), (size[0], 0, 0)},
        "negative-boundary": {(-1, -1, -1), (0, -1, -1), (-1, 0, -1), (-1, -1, 0)},
    }
    if name in fixed:
        return fixed[name]
    volume = size[0] * size[1] * size[2]
    if volume > MAX_CELLS:
        raise ValueError(f"solid/checkerboard scene domain exceeds {MAX_CELLS} cells")
    domain = itertools.product(*(range(n) for n in size))
    return {p for p in domain if name == "solid" or sum(p) % 2 == 0}


def fixture(args: argparse.Namespace) -> dict:
    size = dimensions(args.chunk_size)
    owned = scene(args.case, size) if args.case else cells(args.cell, "owned cells")
    context = cells(args.neighbor, "neighbor cells")
    if owned & context:
        raise ValueError("owned and neighbor cells must be disjoint")
    edits = cells(args.edit, "edited cells")
    faces = exposed_faces(owned, context, size)
    edit_records, dirty = edits_json(edits, size, args.halo)
    counts = Counter(face.chunk for face in faces)
    return {
        "schema": "voxel-oracle-v1", "chunk_size": list(size), "halo": args.halo,
        "conventions": {
            "coordinates": "integer cell coordinates; +x, +y, +z; no engine up-axis implied",
            "linear_index": "x + size_x * (y + size_y * z); x is fastest",
            "unknown_occupancy": "empty",
            "faces": "opaque axis-aligned unit faces; outward integer normal; cell owns face",
            "halo": "inclusive symmetric padding on every axis, including edges and corners",
        },
        "owned_cells": [list(c) for c in sorted(owned)],
        "neighbor_cells": [list(c) for c in sorted(context)],
        "mappings": [mapping(c, size) for c in sorted(owned)],
        "edits": edit_records, "dirty_chunks": dirty,
        "face_count": len(faces),
        "chunk_face_counts": [{"chunk": list(c), "count": counts[c]} for c in sorted(counts)],
        "faces": [face_json(f) for f in sorted(faces)],
    }


def read_json(path: str) -> dict:
    with Path(path).open("rb") as handle:
        raw = handle.read(MAX_JSON_BYTES + 1)
    if len(raw) > MAX_JSON_BYTES:
        raise ValueError(f"JSON exceeds the {MAX_JSON_BYTES}-byte input limit")

    def unique_object(pairs: list[tuple[str, object]]) -> dict:
        result = {}
        for key, value in pairs:
            if key in result:
                raise ValueError(f"duplicate JSON key: {key}")
            result[key] = value
        return result

    def reject_constant(value: str) -> None:
        raise ValueError(f"nonfinite JSON number: {value}")

    obj = json.loads(raw, object_pairs_hook=unique_object, parse_constant=reject_constant)
    if not isinstance(obj, dict):
        raise ValueError("JSON root must be an object")
    return obj


def parse_faces(obj: dict, expected_schema: str, size: Vec3 | None = None) -> tuple[Vec3, list[Face]]:
    if obj.get("schema") != expected_schema:
        raise ValueError(f"expected schema {expected_schema}")
    found_size = dimensions(list(vector(obj.get("chunk_size"), "chunk_size")))
    if size is not None and found_size != size:
        raise ValueError("actual chunk_size differs from expected chunk_size")
    raw_faces = obj.get("faces")
    if not isinstance(raw_faces, list) or len(raw_faces) > MAX_FACE_RECORDS:
        raise ValueError(f"faces must be an array of at most {MAX_FACE_RECORDS} records")
    result = []
    for i, raw in enumerate(raw_faces):
        if not isinstance(raw, dict) or set(raw) != {"cell", "normal", "chunk"}:
            raise ValueError(f"face {i} must have exactly cell, normal and chunk fields")
        face = Face(*(vector(raw[key], f"face {i} {key}") for key in ("cell", "normal", "chunk")))
        if face.normal not in NORMALS:
            raise ValueError(f"face {i} normal is not an axis-aligned unit normal")
        if face.chunk != chunk_local(face.cell, found_size)[0]:
            raise ValueError(f"face {i} has incorrect chunk ownership")
        result.append(face)
    return found_size, result


def compare(args: argparse.Namespace) -> tuple[dict, int]:
    size, expected = parse_faces(read_json(args.expected), "voxel-oracle-v1")
    if len(set(expected)) != len(expected):
        raise ValueError("expected fixture contains duplicate faces")
    _, actual = parse_faces(read_json(args.actual), "voxel-unit-faces-v1", size)
    counts = Counter(actual)
    duplicates = sorted(face for face, count in counts.items() if count > 1)
    missing, unexpected = sorted(set(expected) - set(actual)), sorted(set(actual) - set(expected))
    match = not (duplicates or missing or unexpected)
    limit = args.max_diffs
    return {
        "schema": "voxel-face-comparison-v1", "match": match,
        "expected_face_count": len(expected), "actual_face_records": len(actual),
        "duplicate_face_count": len(duplicates),
        "duplicate_extra_records": sum(counts[f] - 1 for f in duplicates),
        "missing_face_count": len(missing), "unexpected_face_count": len(unexpected),
        "max_diffs_per_category": limit,
        "duplicates": [{**face_json(f), "occurrences": counts[f]} for f in duplicates[:limit]],
        "missing": [face_json(f) for f in missing[:limit]],
        "unexpected": [face_json(f) for f in unexpected[:limit]],
    }, 0 if match else 1


def write_json(obj: dict, output: str | None) -> None:
    rendered = json.dumps(obj, indent=2, sort_keys=True, allow_nan=False) + "\n"
    if output:
        # Exclusive creation deliberately refuses to replace an existing artifact.
        with Path(output).open("x", encoding="utf-8") as handle:
            handle.write(rendered)
    else:
        sys.stdout.write(rendered)


def parser() -> argparse.ArgumentParser:
    root = argparse.ArgumentParser(description=__doc__)
    sub = root.add_subparsers(dest="command", required=True)
    coords = sub.add_parser("coordinates", help="floor mapping, x-fastest indices and halo dependencies")
    generate = sub.add_parser("fixture", help="export a small opaque-cell fixture and exact expected faces")
    for cmd in (coords, generate):
        cmd.add_argument("--chunk-size", nargs="+", type=positive, required=True, metavar="N",
                         help="one cubic size, or size_x size_y size_z")
        cmd.add_argument("--halo", type=nonnegative, default=1,
                         help="symmetric dependency padding in cells (default: 1)")
        cmd.add_argument("--output", help="write a new JSON file; never overwrite")
    coords.add_argument("--cell", nargs=3, type=int, action="append", required=True, metavar=("X", "Y", "Z"))
    owned = generate.add_mutually_exclusive_group()
    owned.add_argument("--cell", nargs=3, type=int, action="append", metavar=("X", "Y", "Z"),
                       help="repeat for owned occupied cells; omitted means empty")
    owned.add_argument("--case", choices=("empty", "isolated", "adjacent", "boundary", "negative-boundary", "solid", "checkerboard"))
    generate.add_argument("--neighbor", nargs=3, type=int, action="append", metavar=("X", "Y", "Z"),
                          help="repeat for context occupancy; these cells emit no faces")
    generate.add_argument("--edit", nargs=3, type=int, action="append", metavar=("X", "Y", "Z"),
                          help="repeat to export dirty chunks; independent of current occupancy")
    check = sub.add_parser("check-faces", help="compare exported unit faces, including duplicates and ownership")
    check.add_argument("--expected", required=True, help="voxel-oracle-v1 fixture")
    check.add_argument("--actual", required=True, help="voxel-unit-faces-v1 engine export")
    check.add_argument("--max-diffs", type=nonnegative, default=20, help="displayed records per category (default: 20)")
    check.add_argument("--output", help="write a new JSON result file; never overwrite")
    return root


def main(argv: list[str] | None = None) -> int:
    cli = parser()
    args = cli.parse_args(argv)
    try:
        status = 0
        if args.command == "fixture":
            result = fixture(args)
        elif args.command == "coordinates":
            size = dimensions(args.chunk_size)
            selected = cells(args.cell, "cells")
            edits, dirty = edits_json(selected, size, args.halo)
            result = {"schema": "voxel-coordinates-v1", "chunk_size": list(size), "halo": args.halo,
                      "mappings": [mapping(c, size) for c in sorted(selected)],
                      "edits": edits, "dirty_chunks": dirty}
        else:
            result, status = compare(args)
        write_json(result, args.output)
        return status
    except (ValueError, OSError, OverflowError, RecursionError) as exc:
        cli.error(str(exc))
    return 2


if __name__ == "__main__":
    raise SystemExit(main())

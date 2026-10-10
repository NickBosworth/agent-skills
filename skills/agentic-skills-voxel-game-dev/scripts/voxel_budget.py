#!/usr/bin/env python3
"""Transparent voxel memory estimates, not measured performance. Python 3.10+."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys

MIB = 1024 * 1024


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


def triple(values: list[int], label: str, minimum: int) -> tuple[int, int, int]:
    if len(values) not in (1, 3) or any(type(v) is not int or v < minimum for v in values):
        raise ValueError(f"{label} must contain one or three integers >= {minimum}")
    return tuple(values * 3 if len(values) == 1 else values)  # type: ignore[return-value]


def product(values: tuple[int, ...]) -> int:
    result = 1
    for value in values:
        result *= value
    return result


def amount(value: int) -> dict:
    # Integer arithmetic keeps even enormous hypothetical worlds exact.
    whole, remainder = divmod(value * 1000000, MIB)
    rounded = whole + (2 * remainder >= MIB)
    return {"bytes": value, "mib": f"{rounded // 1000000}.{rounded % 1000000:06d}"}


def estimate(args: argparse.Namespace) -> dict:
    size = triple(args.chunk_size, "chunk size", 1)
    radius = triple(args.resident_radius, "resident radius", 0) if args.resident_radius is not None else None
    resident = product(tuple(2 * r + 1 for r in radius)) if radius is not None else args.resident_chunks
    meshed = resident if args.meshed_chunks is None else args.meshed_chunks
    if meshed > resident:
        raise ValueError("meshed chunks must not exceed resident chunks in this model")
    core_cells = product(size)
    padded_cells = product(tuple(n + 2 * args.halo for n in size))
    core_bytes = core_cells * args.bytes_per_cell
    padding_bytes = (padded_cells - core_cells) * args.bytes_per_cell
    snapshot_bytes = padded_cells * args.bytes_per_cell * args.snapshot_copies_per_job
    vertices = args.faces_per_chunk * args.vertices_per_face
    indices = args.faces_per_chunk * args.indices_per_face
    vertex_bytes, index_bytes = vertices * args.vertex_bytes, indices * args.index_bytes
    mesh_bytes = vertex_bytes + index_bytes
    resident_core = resident * core_bytes
    retained_padding = resident * padding_bytes if args.retain_halos else 0
    retained_mesh = meshed * mesh_bytes * args.cpu_mesh_copies
    gpu_mesh = meshed * mesh_bytes * args.gpu_mesh_copies
    job_mesh = mesh_bytes * args.scratch_mesh_copies_per_job
    job_bytes = snapshot_bytes + job_mesh + args.extra_scratch_bytes_per_job
    scratch_bytes = args.inflight_jobs * job_bytes
    cpu_total = resident_core + retained_padding + retained_mesh
    loose_face_bound = 6 * core_cells
    loose_vertices = loose_face_bound * args.vertices_per_face
    loose_mesh_bytes = loose_face_bound * (args.vertices_per_face * args.vertex_bytes + args.indices_per_face * args.index_bytes)
    index_capacity = 1 << (8 * args.index_bytes)
    warnings = []
    if args.faces_per_chunk > loose_face_bound:
        warnings.append("Assumed faces exceed 6 * core_cells; verify whether the opaque unit-face model applies.")
    indexed = args.indices_per_face > 0
    if indexed and vertices > index_capacity:
        warnings.append("Assumed vertex count exceeds one unsigned index range; share vertices, partition draws or widen indices.")
    if indexed and loose_vertices > index_capacity:
        warnings.append("The loose unmerged-face bound exceeds one unsigned index range; capacity must also be checked against real geometry.")
    return {
        "schema": "voxel-budget-v1", "kind": "analytic estimate from caller assumptions; not a benchmark",
        "assumptions": {
            "chunk_size": list(size), "resident_radius": list(radius) if radius else None,
            "radius_shape": "inclusive axis-aligned box; (2*rx+1)*(2*ry+1)*(2*rz+1) chunks" if radius else None,
            "resident_chunks": resident, "meshed_chunks": meshed,
            "meshed_chunks_defaulted_to_resident": args.meshed_chunks is None,
            "bytes_per_cell": args.bytes_per_cell, "halo": args.halo, "retain_halos": args.retain_halos,
            "faces_per_chunk": args.faces_per_chunk, "vertices_per_face": args.vertices_per_face,
            "vertex_bytes": args.vertex_bytes, "indices_per_face": args.indices_per_face, "index_bytes": args.index_bytes,
            "cpu_mesh_copies": args.cpu_mesh_copies, "gpu_mesh_copies": args.gpu_mesh_copies,
            "inflight_jobs": args.inflight_jobs, "snapshot_copies_per_job": args.snapshot_copies_per_job,
            "scratch_mesh_copies_per_job": args.scratch_mesh_copies_per_job,
            "extra_scratch_bytes_per_job": args.extra_scratch_bytes_per_job,
        },
        "per_chunk": {
            "core_cells": core_cells, "padded_cells": padded_cells,
            "core_storage": amount(core_bytes), "additional_halo_storage": amount(padding_bytes),
            "assumed_vertices": vertices, "assumed_indices": indices,
            "assumed_vertex_buffer": amount(vertex_bytes), "assumed_index_buffer": amount(index_bytes),
            "assumed_one_mesh_copy": amount(mesh_bytes),
        },
        "cpu_retained": {
            "core_storage": amount(resident_core), "additional_halo_storage": amount(retained_padding),
            "mesh_buffers": amount(retained_mesh), "total": amount(cpu_total),
        },
        "gpu_retained": {"mesh_buffers": amount(gpu_mesh), "total": amount(gpu_mesh)},
        "scratch": {
            "per_job_snapshots": amount(snapshot_bytes), "per_job_mesh_buffers": amount(job_mesh),
            "per_job_extra": amount(args.extra_scratch_bytes_per_job),
            "per_job_total": amount(job_bytes), "all_inflight_jobs": amount(scratch_bytes),
        },
        "cpu_plus_scratch_peak": amount(cpu_total + scratch_bytes),
        "loose_unmerged_opaque_bound": {
            "faces_per_chunk": loose_face_bound, "vertices_per_chunk": loose_vertices,
            "one_mesh_copy_per_chunk": amount(loose_mesh_bytes),
            "qualification": "6 faces per cell is a loose bound for full opaque axis-aligned cubes; no culling or merging is credited. It does not model smooth isosurfaces or custom geometry.",
        },
        "index_capacity": {
            "applicable": indexed,
            "unsigned_values": index_capacity, "maximum_index": index_capacity - 1,
            "assumed_vertices_exceed_range": indexed and vertices > index_capacity,
            "loose_bound_vertices_exceed_range": indexed and loose_vertices > index_capacity,
            "qualification": "Applies to one independently indexed vertex span with zero-based indices. Draw partitioning/base-vertex offsets can change the span; primitive restart may reserve an index value. Check the engine/API.",
        },
        "warnings": warnings,
        "excluded": [
            "Engine objects, allocators, compression metadata, material tables, physics, lighting, navigation, entities and textures.",
            "Additional staging/upload buffers, old/new mesh overlap, and driver allocations unless copies/extras explicitly cover them.",
            "Frame rate, job duration, I/O latency, cache effects, garbage collection and scheduling overhead.",
            "A unified-memory physical total: CPU and GPU categories may alias or duplicate depending on the platform.",
        ],
    }


def parser() -> argparse.ArgumentParser:
    root = argparse.ArgumentParser(description=__doc__)
    root.add_argument("--chunk-size", nargs="+", type=positive, required=True, metavar="N", help="one cubic size, or size_x size_y size_z")
    residency = root.add_mutually_exclusive_group(required=True)
    residency.add_argument("--resident-chunks", type=nonnegative, help="explicit resident chunk count")
    residency.add_argument("--resident-radius", nargs="+", type=nonnegative, metavar="R", help="one cubic radius, or rx ry rz; inclusive box")
    root.add_argument("--meshed-chunks", type=nonnegative, help="resident chunks with meshes (default: all resident chunks)")
    root.add_argument("--bytes-per-cell", type=positive, required=True, help="whole bytes for all modeled cell channels")
    root.add_argument("--halo", type=nonnegative, required=True, help="symmetric sample padding per axis, in cells")
    root.add_argument("--retain-halos", action="store_true", help="retain padded halo data with every resident chunk (default: false)")
    root.add_argument("--faces-per-chunk", type=nonnegative, required=True, help="assumed faces/quads per meshed chunk, before vertex sharing")
    root.add_argument("--vertices-per-face", type=positive, required=True, help="assumed stored vertices per face")
    root.add_argument("--vertex-bytes", type=positive, required=True, help="full vertex stride in bytes")
    root.add_argument("--indices-per-face", type=nonnegative, required=True, help="indices per face; 0 for nonindexed geometry")
    root.add_argument("--index-bytes", type=int, choices=(2, 4), required=True, help="2 or 4 bytes per unsigned index")
    root.add_argument("--inflight-jobs", type=nonnegative, required=True, help="simultaneously retained scratch-job slots")
    root.add_argument("--cpu-mesh-copies", type=nonnegative, default=0, help="retained CPU mesh copies (default assumption: 0)")
    root.add_argument("--gpu-mesh-copies", type=nonnegative, default=1, help="retained GPU mesh copies (default assumption: 1)")
    root.add_argument("--snapshot-copies-per-job", type=nonnegative, default=1, help="padded input copies per job (default assumption: 1)")
    root.add_argument("--scratch-mesh-copies-per-job", type=nonnegative, default=1, help="mesh build-buffer copies per job (default assumption: 1)")
    root.add_argument("--extra-scratch-bytes-per-job", type=nonnegative, default=0, help="additional modeled scratch per job (default: 0)")
    root.add_argument("--output", help="write a new JSON file; never overwrite (default: stdout)")
    return root


def main(argv: list[str] | None = None) -> int:
    cli = parser()
    args = cli.parse_args(argv)
    try:
        rendered = json.dumps(estimate(args), indent=2, sort_keys=True, allow_nan=False) + "\n"
        if args.output:
            with Path(args.output).open("x", encoding="utf-8") as handle:
                handle.write(rendered)
        else:
            sys.stdout.write(rendered)
        return 0
    except (ValueError, OSError, OverflowError) as exc:
        cli.error(str(exc))
    return 2


if __name__ == "__main__":
    raise SystemExit(main())

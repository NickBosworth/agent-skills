#!/usr/bin/env python3
"""Run: python3 -m unittest discover -s scripts -p 'test_*.py' -v"""

from __future__ import annotations

import contextlib
import copy
import io
import itertools
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

import voxel_budget as budget
import voxel_oracles as oracle

HERE = Path(__file__).resolve().parent


def base_budget(*extra: str):
    return budget.parser().parse_args([
        "--chunk-size", "2", "--resident-chunks", "3",
        "--bytes-per-cell", "2", "--halo", "1",
        "--faces-per-chunk", "6", "--vertices-per-face", "4",
        "--vertex-bytes", "12", "--indices-per-face", "6", "--index-bytes", "2",
        "--inflight-jobs", "2", *extra,
    ])


class CoordinatesTests(unittest.TestCase):
    def test_negative_floor_mapping_and_index(self):
        size = (16, 16, 16)
        chunk, local = oracle.chunk_local((-1, -16, -17), size)
        self.assertEqual(chunk, (-1, -1, -2))
        self.assertEqual(local, (15, 0, 15))
        self.assertEqual(oracle.local_index(local, size), 3855)

    def test_reconstruction_and_local_domain(self):
        size = (2, 3, 5)
        for cell in itertools.product(range(-11, 12), repeat=3):
            chunk, local = oracle.chunk_local(cell, size)
            self.assertEqual(tuple(c * n + p for c, n, p in zip(chunk, size, local)), cell)
            self.assertTrue(all(0 <= p < n for p, n in zip(local, size)))

    def test_rectangular_linear_index_is_bijective(self):
        size = (2, 3, 4)
        indices = [oracle.local_index(p, size) for p in itertools.product(*(range(n) for n in size))]
        self.assertEqual(sorted(indices), list(range(24)))
        self.assertEqual(oracle.local_index((1, 2, 3), size), 23)
        with self.assertRaises(ValueError):
            oracle.local_index((2, 0, 0), size)

    def test_dirty_corner_includes_diagonals(self):
        expected = set(itertools.product((-1, 0), repeat=3))
        self.assertEqual(oracle.dirty_chunks((0, 0, 0), (16, 16, 16), 1), expected)
        self.assertEqual(oracle.dirty_chunks((8, 8, 8), (16, 16, 16), 1), {(0, 0, 0)})
        self.assertEqual(oracle.dirty_chunks((-1, 0, 0), (16, 16, 16), 0), {(-1, 0, 0)})

    def test_dirty_dependencies_against_sample_domain_definition(self):
        size = (2, 3, 4)
        candidates = list(itertools.product(range(-6, 7), repeat=3))
        for halo in (0, 1, 2, 5):
            for cell in itertools.product((-4, -1, 0, 1, 4), repeat=3):
                expected = {
                    chunk for chunk in candidates
                    if all(c * n - halo <= p <= (c + 1) * n - 1 + halo
                           for c, n, p in zip(chunk, size, cell))
                }
                self.assertEqual(oracle.dirty_chunks(cell, size, halo), expected)

    def test_huge_halo_rejected_before_enumeration(self):
        with self.assertRaises(ValueError):
            oracle.dirty_chunks((0, 0, 0), (1, 1, 1), 10**30)


class FaceTests(unittest.TestCase):
    size = (4, 4, 4)

    def test_empty_and_isolated(self):
        self.assertEqual(oracle.exposed_faces(set(), set(), self.size), set())
        faces = oracle.exposed_faces({(0, 0, 0)}, set(), self.size)
        self.assertEqual(len(faces), 6)
        self.assertEqual({f.normal for f in faces}, set(oracle.NORMALS))

    def test_adjacent_cells_remove_both_internal_faces(self):
        faces = oracle.exposed_faces({(0, 0, 0), (1, 0, 0)}, set(), self.size)
        self.assertEqual(len(faces), 10)
        self.assertNotIn(oracle.Face((0, 0, 0), (1, 0, 0), (0, 0, 0)), faces)
        self.assertNotIn(oracle.Face((1, 0, 0), (-1, 0, 0), (0, 0, 0)), faces)

    def test_context_occludes_without_emitting(self):
        faces = oracle.exposed_faces({(3, 0, 0)}, {(4, 0, 0)}, self.size)
        self.assertEqual(len(faces), 5)
        self.assertTrue(all(f.cell == (3, 0, 0) for f in faces))

    def test_negative_boundary_ownership(self):
        faces = oracle.exposed_faces({(-1, 0, 0), (0, 0, 0)}, set(), self.size)
        self.assertEqual(len(faces), 10)
        self.assertEqual(sum(f.chunk == (-1, 0, 0) for f in faces), 5)
        self.assertEqual(sum(f.chunk == (0, 0, 0) for f in faces), 5)

    def test_solid_box_surface_area(self):
        size = (2, 3, 4)
        cells = set(itertools.product(*(range(n) for n in size)))
        self.assertEqual(len(oracle.exposed_faces(cells, set(), size)), 2 * (2 * 3 + 2 * 4 + 3 * 4))

    def test_checkerboard_every_cell_is_exposed(self):
        cells = oracle.scene("checkerboard", (3, 3, 3))
        self.assertEqual(len(oracle.exposed_faces(cells, set(), (3, 3, 3))), 6 * 14)


class ExportTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        args = oracle.parser().parse_args(["fixture", "--chunk-size", "4", "--case", "isolated"])
        self.expected = oracle.fixture(args)
        self.actual = {"schema": "voxel-unit-faces-v1", "chunk_size": [4, 4, 4], "faces": copy.deepcopy(self.expected["faces"])}

    def compare(self, actual):
        expected_path, actual_path = self.root / "expected.json", self.root / "actual.json"
        expected_path.write_text(json.dumps(self.expected), encoding="utf-8")
        actual_path.write_text(json.dumps(actual), encoding="utf-8")
        args = oracle.parser().parse_args(["check-faces", "--expected", str(expected_path), "--actual", str(actual_path)])
        return oracle.compare(args)

    def test_order_does_not_matter(self):
        self.actual["faces"].reverse()
        report, status = self.compare(self.actual)
        self.assertEqual(status, 0)
        self.assertTrue(report["match"])

    def test_equal_counts_wrong_geometry_fail(self):
        self.actual["faces"][0]["cell"] = [1, 0, 0]
        report, status = self.compare(self.actual)
        self.assertEqual(status, 1)
        self.assertEqual(report["missing_face_count"], 1)
        self.assertEqual(report["unexpected_face_count"], 1)
        self.assertEqual(report["expected_face_count"], report["actual_face_records"])

    def test_duplicate_faces_fail(self):
        self.actual["faces"].append(copy.deepcopy(self.actual["faces"][0]))
        report, status = self.compare(self.actual)
        self.assertEqual(status, 1)
        self.assertEqual(report["duplicate_face_count"], 1)
        self.assertEqual(report["duplicate_extra_records"], 1)

    def test_boolean_and_wrong_chunk_rejected(self):
        for key, value in (("cell", [False, 0, 0]), ("chunk", [1, 0, 0]), ("normal", [1, 1, 0])):
            actual = copy.deepcopy(self.actual)
            actual["faces"][0][key] = value
            with self.subTest(key=key), self.assertRaises(ValueError):
                self.compare(actual)

    def test_duplicate_json_keys_and_nonfinite_rejected(self):
        path = self.root / "bad.json"
        for content in ('{"a":1,"a":2}', '{"a":NaN}'):
            path.write_text(content, encoding="utf-8")
            with self.assertRaises(ValueError):
                oracle.read_json(str(path))

    def test_no_overwrite(self):
        path = self.root / "existing.json"
        path.write_text("preserve me", encoding="utf-8")
        with self.assertRaises(FileExistsError):
            oracle.write_json({"new": True}, str(path))
        self.assertEqual(path.read_text(encoding="utf-8"), "preserve me")

    def test_fixture_is_deterministic_and_edit_independent(self):
        arguments = ["fixture", "--chunk-size", "4", "--cell", "0", "0", "0", "--edit", "-1", "0", "0"]
        fixture = oracle.fixture(oracle.parser().parse_args(arguments))
        self.assertEqual(fixture, oracle.fixture(oracle.parser().parse_args(arguments)))
        self.assertEqual(fixture["face_count"], 6)
        self.assertEqual(fixture["edits"][0]["cell"], [-1, 0, 0])

    def test_invalid_cli_is_nonzero(self):
        result = subprocess.run([sys.executable, str(HERE / "voxel_oracles.py"), "fixture", "--chunk-size", "4", "5"], capture_output=True, text=True)
        self.assertEqual(result.returncode, 2)
        self.assertIn("one or three", result.stderr)
        self.assertNotIn("Traceback", result.stderr)

    def test_oversize_scene_and_duplicates_rejected(self):
        with self.assertRaises(ValueError):
            oracle.scene("solid", (1000, 1000, 1000))
        with self.assertRaises(ValueError):
            oracle.cells([[0, 0, 0], [0, 0, 0]], "owned")


class BudgetTests(unittest.TestCase):
    def test_manual_arithmetic_and_category_separation(self):
        result = budget.estimate(base_budget())
        # 8 cells * 2 bytes; padded 4^3 * 2. Each mesh: 24*12 + 36*2 = 360.
        self.assertEqual(result["cpu_retained"]["core_storage"]["bytes"], 48)
        self.assertEqual(result["cpu_retained"]["additional_halo_storage"]["bytes"], 0)
        self.assertEqual(result["gpu_retained"]["total"]["bytes"], 1080)
        self.assertEqual(result["scratch"]["all_inflight_jobs"]["bytes"], 976)
        self.assertEqual(result["cpu_plus_scratch_peak"]["bytes"], 1024)
        self.assertEqual(result["loose_unmerged_opaque_bound"]["faces_per_chunk"], 48)

    def test_retained_halos_and_mesh_copies(self):
        result = budget.estimate(base_budget("--retain-halos", "--cpu-mesh-copies", "2", "--gpu-mesh-copies", "2"))
        self.assertEqual(result["cpu_retained"]["additional_halo_storage"]["bytes"], 3 * (128 - 16))
        self.assertEqual(result["cpu_retained"]["mesh_buffers"]["bytes"], 2160)
        self.assertEqual(result["gpu_retained"]["mesh_buffers"]["bytes"], 2160)

    def test_rectangular_radius_is_box_count(self):
        args = base_budget()
        args.resident_chunks, args.resident_radius, args.chunk_size = None, [1, 2, 3], [2, 3, 4]
        result = budget.estimate(args)
        self.assertEqual(result["assumptions"]["resident_chunks"], 105)
        self.assertEqual(result["per_chunk"]["core_cells"], 24)
        self.assertEqual(result["per_chunk"]["padded_cells"], 120)

    def test_index_limit_qualification(self):
        result = budget.estimate(base_budget("--faces-per-chunk", "16385"))
        self.assertTrue(result["index_capacity"]["assumed_vertices_exceed_range"])
        result = budget.estimate(base_budget("--faces-per-chunk", "16384"))
        self.assertFalse(result["index_capacity"]["assumed_vertices_exceed_range"])
        result = budget.estimate(base_budget("--faces-per-chunk", "16385", "--indices-per-face", "0"))
        self.assertFalse(result["index_capacity"]["applicable"])
        self.assertFalse(result["index_capacity"]["assumed_vertices_exceed_range"])

    def test_large_count_uses_only_arithmetic(self):
        result = budget.estimate(base_budget("--resident-chunks", "1000000000000"))
        self.assertEqual(result["cpu_retained"]["core_storage"]["bytes"], 16_000_000_000_000)

    def test_mib_is_binary_and_rounds_without_float(self):
        self.assertEqual(budget.amount(1024 * 1024), {"bytes": 1048576, "mib": "1.000000"})
        self.assertEqual(budget.amount(1)["mib"], "0.000001")

    def test_meshed_must_be_resident(self):
        with self.assertRaises(ValueError):
            budget.estimate(base_budget("--meshed-chunks", "4"))

    def test_budget_refuses_overwrite(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "existing.json"
            path.write_text("preserve me", encoding="utf-8")
            args = base_budget()
            argv = ["--chunk-size", "2", "--resident-chunks", "3", "--bytes-per-cell", "2", "--halo", "1",
                    "--faces-per-chunk", "6", "--vertices-per-face", "4", "--vertex-bytes", "12",
                    "--indices-per-face", "6", "--index-bytes", "2", "--inflight-jobs", "2", "--output", str(path)]
            with contextlib.redirect_stderr(io.StringIO()), self.assertRaises(SystemExit) as caught:
                budget.main(argv)
            self.assertEqual(caught.exception.code, 2)
            self.assertEqual(path.read_text(encoding="utf-8"), "preserve me")

    def test_negative_input_rejected(self):
        with contextlib.redirect_stderr(io.StringIO()), self.assertRaises(SystemExit):
            base_budget("--halo", "-1")


class HelpTests(unittest.TestCase):
    def test_all_help_paths(self):
        for script, subcommand in (("voxel_oracles.py", []), ("voxel_oracles.py", ["coordinates"]),
                                   ("voxel_oracles.py", ["fixture"]), ("voxel_oracles.py", ["check-faces"]),
                                   ("voxel_budget.py", [])):
            with self.subTest(script=script, command=subcommand):
                result = subprocess.run([sys.executable, str(HERE / script), *subcommand, "--help"], capture_output=True, text=True)
                self.assertEqual(result.returncode, 0, result.stderr)
                self.assertIn("usage:", result.stdout)


if __name__ == "__main__":
    unittest.main()

# Portable voxel tools

## Contents

- Coordinates, indices and edit dependencies
- Opaque-face fixtures
- Actual mesher output comparison
- Memory estimates and limits
- Tool regression tests
- Package integrity and example preservation

These tools supply small correctness oracles and transparent memory arithmetic. They do not implement a production mesher, benchmark an engine, or choose a chunk size for a project. Python 3.10 or later is sufficient; there are no third-party dependencies, network requests or package-install steps.

Run the commands below from this installed skill's directory, or replace `scripts/` with the actual installed path. On Windows, use the available Python command, such as `py -3`, in place of `python3`.

Both tools emit deterministic JSON to standard output. `--output PATH` creates a new file and refuses to overwrite an existing file. Ordinary shell redirection does not inherit that protection: prefer `--output` for artifacts that need it. Parent directories must already exist.

## 1. Coordinates, indices and edit dependencies

```bash
python3 scripts/voxel_oracles.py --help
python3 scripts/voxel_oracles.py coordinates --help
python3 scripts/voxel_oracles.py coordinates --chunk-size 16 --cell -1 -16 -17 --halo 1
python3 scripts/voxel_oracles.py coordinates --chunk-size 8 16 32 --cell -9 16 -1 --cell 0 0 0 --halo 0
```

`--chunk-size` accepts either one cubic dimension or three dimensions in x, y, z order. Repeat `--cell X Y Z` to inspect more coordinates. All coordinates are integer **cell** coordinates, not engine-space floats. Transform world positions into the agreed cell space before comparing results.

The convention is:

- A cell at `(x, y, z)` occupies `[x,x+1) × [y,y+1) × [z,z+1)` for ownership purposes.
- Per axis, `chunk = floor(cell / chunk_size)` and `local = cell - chunk * chunk_size`.
- Local coordinates satisfy `0 <= local < chunk_size`, including at negative positions.
- The local linear index is `x + size_x * (y + size_y * z)`, with x changing fastest. This is an explicit fixture convention, not a requirement to replace a project's existing indexing convention.
- Coordinates use named x, y and z axes without choosing an engine up-axis or handedness.

For `(-1, -16, -17)` in a cubic size-16 grid, the expected chunk is `(-1, -1, -2)`, the local coordinate is `(15, 0, 15)`, the index is `3855`, and reconstruction returns the original cell exactly. Division that truncates toward zero will fail this case.

### What `--halo` means

The halo is symmetric integer sample padding on every axis; it defaults to **1** in the oracle tool. A chunk at coordinate `c` with size `n` depends on samples in the inclusive interval `[c*n-halo, (c+1)*n-1+halo]` on each axis. The tool returns every chunk whose padded sample box contains an edited cell. This includes diagonal neighbors at edges and corners and can include more distant chunks when the halo exceeds a chunk dimension.

An edit to `(0, 0, 0)` with size 16 and halo 1 affects the eight combinations of chunk coordinates `-1` and `0`. With halo 0, only the containing chunk is returned. These are potential dependent chunks, whether currently loaded or unloaded.

This is exact for the declared full box of dependencies. A mesher that samples only six axial neighbors may require fewer invalidations; ambient occlusion or another wider stencil may require more. Match the real sampling stencil and each derived system's dependencies. Do not treat this helper as proof that one global halo covers lighting, fluids, navigation or physics.

`coordinates` returns schema `voxel-coordinates-v1` with:

| Field | Meaning |
| --- | --- |
| `chunk_size`, `halo` | The coordinate and dependency assumptions |
| `mappings` | One record per unique input cell, containing `cell`, `chunk`, `local`, `linear_index`, `reconstructed` |
| `edits` | Per-cell `dirty_chunks`, using each input cell as an edit |
| `dirty_chunks` | Sorted union of all dependent chunks |

## 2. Export an exact opaque-face fixture

```bash
python3 scripts/voxel_oracles.py fixture --help
python3 scripts/voxel_oracles.py fixture --chunk-size 4 --case boundary --edit 3 0 0 --halo 1 --output boundary.expected.json
python3 scripts/voxel_oracles.py fixture --chunk-size 4 --cell 3 0 0 --neighbor 4 0 0 --output neighbor.expected.json
python3 scripts/voxel_oracles.py fixture --chunk-size 4 --case negative-boundary --edit -1 -1 -1 --halo 1
python3 scripts/voxel_oracles.py fixture --chunk-size 2 3 4 --case solid
```

Use either `--case NAME` or repeated `--cell X Y Z` flags for occupied cells whose faces should be emitted. Omitting both creates an empty scene. Repeated `--neighbor X Y Z` flags supply occupied context cells: these hide adjacent faces but emit no faces of their own. Owned and context sets must be disjoint. Unlisted cells are treated as empty; the tool does not model an unknown/unloaded state.

Use `--edit X Y Z` separately to request edit dependencies. An edited cell can be empty or occupied. Specifying an edit does not change occupancy. If no edit is supplied, the edit records and dirty-chunk union are empty.

| Built-in case | Contents |
| --- | --- |
| `empty` | No occupied cells |
| `isolated` | One cell at the origin; six faces |
| `adjacent` | Cells `(0,0,0)` and `(1,0,0)`; ten faces |
| `boundary` | Two adjacent cells on opposite sides of the positive x chunk boundary; ten faces owned by two chunks |
| `negative-boundary` | Four touching cells around `(-1,-1,-1)` and the three adjacent zero coordinate planes |
| `solid` | Every cell in one chunk; `2*(Nx*Ny + Nx*Nz + Ny*Nz)` faces |
| `checkerboard` | Cells in one chunk with even `x+y+z`; every occupied cell has six exposed faces |

The `neighbor` example emits **five faces** from `(3,0,0)` because `(4,0,0)` occludes the positive-x face. The size `2 3 4` solid example emits **52 unit faces**.

### Fixture schema: `voxel-oracle-v1`

| Field | Meaning |
| --- | --- |
| `schema` | Literal `voxel-oracle-v1` |
| `chunk_size`, `halo`, `conventions` | Explicit interpretation of fixture coordinates and dependencies |
| `owned_cells`, `neighbor_cells` | Sorted integer coordinate triples |
| `mappings` | Coordinate/index records for owned occupied cells |
| `edits`, `dirty_chunks` | Requested dependency records and their union |
| `face_count`, `chunk_face_counts` | Diagnostic totals; not sufficient to prove geometry correct |
| `faces` | Sorted records with exactly `cell`, `normal` and `chunk` |

A face record has this shape:

```json
{
  "cell": [3, 0, 0],
  "normal": [1, 0, 0],
  "chunk": [0, 0, 0]
}
```

`cell` identifies the solid source cell. `normal` is one of `[-1,0,0]`, `[1,0,0]`, `[0,-1,0]`, `[0,1,0]`, `[0,0,-1]`, `[0,0,1]`. For a positive normal, the face lies at the cell's coordinate plus one along that axis; for a negative normal, it lies at the cell's coordinate. `chunk` is the floor-mapped owner of the source cell. In the example, the plane is `x=4`, the outward normal is positive x, and the face spans one cell in y and z.

All source cells are full, opaque, axis-aligned cubes. Transparent material interfaces, different material IDs, ambient occlusion, UVs, vertex normals, winding, partial blocks and smooth scalar surfaces are outside this oracle. Add separate engine tests for those concerns.

## 3. Compare real mesher output

```bash
python3 scripts/voxel_oracles.py check-faces --help
python3 scripts/voxel_oracles.py check-faces --expected boundary.expected.json --actual boundary.actual.json
python3 scripts/voxel_oracles.py check-faces --expected boundary.expected.json --actual boundary.actual.json --max-diffs 50 --output comparison.json
```

Create `boundary.actual.json` with an adapter over the **actual mesher's emitted geometry**. Do not regenerate actual faces from occupancy with a second copy of the expected-face algorithm: that would bypass the implementation under test. A greedy mesher adapter must expand each emitted axis-aligned rectangle into its covered unit faces before comparison. Define exact coordinate conversion or explicit tolerances in that adapter, then export integer records. Do not feed raw triangle counts or rounded screenshot coordinates into this checker.

The engine export is an object with schema `voxel-unit-faces-v1`, the same `chunk_size` as the expected fixture, and a `faces` array using the three-field face schema above. A complete empty-world export is:

```json
{
  "schema": "voxel-unit-faces-v1",
  "chunk_size": [4, 4, 4],
  "faces": []
}
```

An isolated-cell export contains six records. Their order does not matter. The comparison requires equality of the complete face sets and rejects duplicated face records even when their set is otherwise correct. It also validates face normals and chunk ownership. Incorrect ownership is invalid input rather than a normal geometry difference.

| Exit code | Meaning |
| --- | --- |
| `0` | Command succeeded; for `check-faces`, exact match with no duplicate faces |
| `1` | Valid comparison inputs, but faces are missing, unexpected or duplicated |
| `2` | Invalid input, resource limit, unreadable file or refused output overwrite |

The report uses schema `voxel-face-comparison-v1`. It contains total expected/actual records, unique duplicate-face count, duplicate extra-record count, missing/unexpected counts, and example records from each difference category. `--max-diffs` limits displayed examples per category, not the comparison; zero still checks everything and reports totals.

### Input and output bounds

These helpers intentionally serve small reproducible tests:

- At most 4,096 owned cells, 4,096 context cells and 4,096 edited cells per fixture.
- The `solid` and `checkerboard` domain must contain at most 4,096 cells before filtering.
- At most 4,096 distinct dirty chunks and 50,000 per-edit dependency records.
- At most 50,000 imported face records and 32 MiB per JSON input file.
- Duplicate occupied cells, duplicate JSON keys, nonfinite JSON numbers, fractional/boolean coordinates, invalid normals and malformed dimensions are rejected.

Large halo requests are rejected before enumerating their combinations. These limits are test-fixture limits, not advice for game-world size. The scripts are trusted local development helpers, not parsers designed for a public untrusted-upload service.

## 4. Estimate memory before selecting a design

```bash
python3 scripts/voxel_budget.py --help
python3 scripts/voxel_budget.py --chunk-size 16 --resident-radius 3 2 3 --bytes-per-cell 2 --halo 1 --faces-per-chunk 1200 --vertices-per-face 4 --vertex-bytes 32 --indices-per-face 6 --index-bytes 2 --inflight-jobs 4
```

This example supplies **hypothetical inputs**, not recommended engine defaults. The radius denotes an inclusive box of `(2*3+1)*(2*2+1)*(2*3+1) = 245` chunks. It does not denote a sphere or a distance metric. Use `--resident-chunks N` instead to supply a known count, and `--meshed-chunks M` when only some resident chunks retain meshes. This model requires `M <= N`; it does not model meshes retained after their source chunks are evicted.

All dimensions, counts and byte widths are integers. `--bytes-per-cell` is the sum of the modeled fixed-width cell channels, in whole bytes. Compressed, sparse, variable-width or sub-byte representations need a different model or a clearly stated approximation. Face/vertex inputs describe stored geometry; choose values consistent with whether your actual mesher shares vertices. An indexed quad commonly uses four vertices and six indices, but the tool requires the caller to supply those assumptions. Set `--indices-per-face 0` for nonindexed geometry; index-capacity warnings then do not apply.

### Formulas and categories

Let `V = Nx*Ny*Nz`, `P = (Nx+2h)*(Ny+2h)*(Nz+2h)`, `b` be bytes per cell, and `F` be the assumed faces per meshed chunk:

- Core cell storage per chunk: `V*b`.
- Extra halo storage per chunk: `(P-V)*b`.
- One mesh copy: `F*(vertices_per_face*vertex_bytes + indices_per_face*index_bytes)`.
- Retained CPU: all resident cores, optional retained halos, and the specified retained CPU mesh copies.
- Retained GPU: the specified GPU mesh copies for meshed chunks.
- Per-job scratch: padded snapshots, mesh build-buffer copies and explicitly supplied extra scratch bytes.
- Scratch peak: per-job scratch multiplied by `inflight_jobs`.
- CPU plus scratch peak: retained CPU plus all in-flight scratch. GPU is reported separately.

The JSON echoes all assumptions. Defaults are **model choices**, not measured engine behavior:

| Option | Default assumption |
| --- | --- |
| `--meshed-chunks` | All resident chunks have a mesh |
| `--retain-halos` | False; halos are not retained with every core |
| `--cpu-mesh-copies` | 0 |
| `--gpu-mesh-copies` | 1 |
| `--snapshot-copies-per-job` | 1 full padded input copy |
| `--scratch-mesh-copies-per-job` | 1 output build-buffer copy |
| `--extra-scratch-bytes-per-job` | 0 |

Set these to match the implementation. A snapshot copy and a retained CPU mesh copy occupy different categories. If a buffer is shared or reused, do not count it twice. Model upload staging and old/new mesh overlap explicitly using copies or extras. Inputs must account for the maximum simultaneously retained work, not merely the number of threads executing at one instant.

The example produces:

| Modeled category | Bytes | MiB |
| --- | ---: | ---: |
| Retained CPU cores | 2,007,040 | 1.914063 |
| Retained GPU mesh buffers | 41,160,000 | 39.253235 |
| Scratch for four jobs | 718,656 | 0.685364 |
| CPU plus scratch peak | 2,725,696 | 2.599426 |

MiB uses `1,048,576` bytes. JSON reports exact integer bytes and six-decimal MiB strings calculated without floating-point arithmetic. No voxel arrays are allocated by this estimator, even for enormous hypothetical counts.

### Bounds and omissions

The report also includes `6*V` as a **loose unmerged opaque unit-face bound**. It credits neither culling nor merging; it is a bound on six faces per full cube, not a typical surface count, and is not an isosurface/custom-geometry bound. With the example's four vertices per face, this bound gives 98,304 vertices per chunk. That can exceed a single 16-bit unsigned index range even though the assumed 1,200-face mesh has only 4,800 vertices.

The index warning applies to one independently indexed vertex span. A 16-bit unsigned index has 65,536 values; primitive restart may reserve one, and draw partitioning or base-vertex offsets can change the applicable span. The script does not know an engine's actual mesh limits. Verify the target API and test real worst-case content.

The estimator omits engine object/allocator overhead, compression metadata, materials, textures, physics, entities, lighting, navigation and other unspecified systems. It predicts neither FPS nor meshing time. On unified-memory hardware, CPU and GPU categories may alias or duplicate physical allocations; do not add the categories blindly to claim a physical-memory total. Measure actual allocation peaks and frame-time distributions in the engine.

## 5. Validate the bundled tools

```bash
python3 -m unittest discover -s scripts -p 'test_*.py' -v
```

Validation recorded during package creation: **31 tests passed**. Coverage includes negative-coordinate reconstruction, rectangular index bijection, halo dependencies compared against independent sample-domain membership, diagonal dependencies, empty/isolated/adjacent/solid/checkerboard geometry, neighbor occlusion, negative chunk ownership, equal-count wrong geometry, duplicate faces, malformed inputs, deterministic fixtures, refused overwrites, memory arithmetic, boxed residency counts, index limits, large-count arithmetic and all help paths.

The documented coordinate and budget examples were also executed successfully. These checks validate the bundled Python helpers. They do not validate any engine integration, game performance, save format or shipped mesher; the consuming agent must add and run those checks in the target project.

## 6. Check package integrity before redistributing

```bash
python3 scripts/validate_package.py --help
python3 scripts/validate_package.py
```

The offline validator checks required files, the main skill header and length, local Markdown links, Python/JSON syntax, and the presence of named example prompts. It defaults to its own installed skill directory; `--root PATH` selects another package location. Exit code 0 means the structural checks passed; 1 reports package errors; 2 indicates an invocation/read error. This complements the host's skill validator and the helper unit tests. It does not execute the prompts or validate a game. Keep the full folder together when installing or exporting, including `references/example-prompts.md`.

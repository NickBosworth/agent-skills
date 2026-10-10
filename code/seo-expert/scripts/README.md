# Offline utility contracts

Run with **Python 3.10 or later**; the bundled code uses only the standard library. See [validation](../VALIDATION.md) for the version actually tested for this release. No package installation, API key, network access or broad command permission is needed. These are optional aids, not a substitute for the skill's judgement, a live browser, a professional crawler or engine tools.

All observations come from user-supplied local inputs. No utility fetches URLs, executes JavaScript, follows sitemap links, inspects an engine index or publishes changes. Output is JSON data. Treat copied titles/queries as untrusted and potentially private; do not render them unsafely or commit real customer data to a public repository.

## 1. HTML snapshot audit

```sh
python scripts/audit_snapshots.py tests/fixtures/manifest.json
python scripts/audit_snapshots.py /path/to/private-evidence/manifest.json --output /path/to/private-evidence/audit-new.json
```

Input is a UTF-8 JSON object, `schema_version: "1.0"`, a timezone-bearing ISO `captured_at`, optional `scope` metadata and a nonempty `pages` list. Capture real responses/DOM using an approved host tool; do not label hand-written HTML as a live capture.

Each page requires an absolute HTTP(S) `url` and relative `html` path. Optional fields:

| Field | Contract |
|---|---|
| `rendered_html` | Relative path to a separately supplied rendered snapshot; the utility does not render it. |
| `intended_indexable` | Boolean or null. Unknown intention is not silently changed to true. |
| `response_status` | Actual observed integer status or null. Omission stays not-tested. |
| `headers` | Array of `{ "name": "X-Robots-Tag", "value": "bingbot: noindex" }` objects. Preserve repeated headers as separate objects; do not merge scope carelessly. |
| `robots` | Object mapping `googlebot`/`bingbot` to `allowed`, `blocked` or `unknown`, based on external evidence. The utility does not independently evaluate robots.txt. |
| `template` | Optional human grouping label. |

See [synthetic manifest](../tests/fixtures/manifest.json). Paths resolve relative to the manifest's directory and must remain inside it, including ordinary symlink resolution. Copy only authorised sanitised captures into the evidence directory. The limits are 2,000 pages, 5 MiB per HTML file, 128 MiB combined HTML reads and 5 MiB manifest JSON. These are tool safety budgets, **not SEO recommendations**.

The report observes head titles/descriptions, ordinary head and HTTP Link canonicals, initial/rendered differences, a bounded noindex/nofollow directive subset, JSON-LD syntax/types, link counts and missing versus empty image alt. It reports intent conflicts, not a global SEO score. H1 count is observation only. Duplicate titles are review groups, not penalty claims.

Important limits: Python's HTML parser is not a browser's DOM repair algorithm. HTTP Link handling supports common syntax and flags anchor/extended/ambiguous cases for manual review; it is not a complete RFC validator. Only noindex/nofollow and aliases plus ordinary crawler scoping are interpreted; dates, snippet lengths, full robots semantics and nonstandard constructs require other evidence. Outside-head robots meta is interpreted for Google only; Bing interpretation remains untested. Capture timestamps need human consistency checks. Canonical targets are never fetched. Schema truth, full vocabulary and rich-result eligibility are never certified.

Exit codes: `0` means inputs were processed, **not that findings passed**; `2` means invalid input or report-writing failure. Choose any CI failure policy explicitly from evidence and page intent rather than using every warning as a blocker.

## 2. Sitemap XML lint

```sh
python scripts/lint_sitemaps.py tests/fixtures/sitemap.xml --site https://shop.example --as-of 2026-10-10
```

Supply one to twenty local **uncompressed UTF-8** XML files. Standard URL sitemaps and sitemap indexes are accepted. DTD/ENTITY declarations, malformed XML and compressed inputs are rejected before any interpretation. Each input is bounded by the protocol's 52,428,800-byte uncompressed limit. No sitemap or image/video/news reference is followed.

Checks cover standard root namespace, basic entry/URL/date syntax, empty/multiple locations, exact duplicate URLs, protocol entry limits and optionally future `lastmod` dates relative to an explicit `--as-of` day. `--site` supplies an expected host; a differing host is a warning to verify cross-site ownership/submission, not an automatic conclusion that authorised cross-site use is impossible. Functional URL parameters and path case are not silently normalised.

Not checked: the served sitemap URL's path/location scope, HTTP delivery, robots permission, canonical/index state, actual truth of modification dates, engine processing, extension semantics or ownership. A local XML pass is not a sitemap/search inclusion guarantee. Use current official tools and a reconciled inventory for those checks.

Exit codes: `0` means no fail-level lint issues (warnings can remain); `1` means parsed input contains fail-level issues; `2` means input/report errors. `--output` creates a new JSON report file.

## 3. Normalised search-export analysis

```sh
python scripts/analyse_search_export.py tests/fixtures/search.csv --limit 20
```

This is **not** an importer for arbitrary raw Google/Bing/vendor exports. First produce an authorised, provenance-preserving **query+page** CSV with the exact [template headers](../templates/search-export.csv). Unknown columns, ragged rows, duplicate keys, blank query/page values and incompatible dimensions are rejected instead of silently ignored.

Required fields are `dataset_id`, `period_start`, `period_end`, `timezone`, `engine`, `search_type`, `country`, `device`, `query`, `page`, `clicks`, `impressions`. Optional `average_position` must be a finite nonnegative number or blank. Dates are ISO `YYYY-MM-DD`; counts are nonnegative unformatted whole numbers. Use `engine` values `google` or `bing`, and `search_type` values `web`, `image`, `video` or `news`. Use a truthful timezone label from the provider; the utility preserves, but does not translate or independently validate, that label.

One `dataset_id` represents one engine/search-type/timezone reporting context. Keep nonoverlapping windows within each country/device scope. Use `ALL` only for a wholly aggregated country/device dimension; do not mix it with split dimension values in the same dataset. Use separate dataset IDs for alternative overlapping exports and **do not sum their outputs**. Exact duplicate query+page keys are rejected. A different ID is not proof that data is nonoverlapping.

Record the property, export method and privacy limitations beside the CSV. Omit anonymised/hidden query rows rather than inventing query labels or treating table totals as detail. This tool cannot reconstruct omitted query data, property totals or an independently localised search market. Impressions-only AI reports, citation reports and Discover are not accepted as query+page click reports.

Output groups preserve reporting scope, compute CTR as summed clicks/summed impressions and leave a zero-impression CTR null. When reported positions are available for every contributing row, an impression-weighted descriptive value is shown with an explicit label; it is **not** a reconstructed property average. Multiple URLs per query produce a review lead, not a cannibalisation diagnosis. Results are ordered by observed impressions, not fabricated opportunity scores. No keyword volumes, difficulty, causal uplift or conversions are inferred.

Inputs are capped at 32 MiB, 100,000 rows and 4,096 characters per field. Query strings are never evaluated, including spreadsheet-formula-like strings; output remains JSON. Take normal formula-injection precautions before any later conversion to spreadsheet CSV.

Exit codes: `0` processed; `2` input/report error. `--output` creates a new JSON file. All utilities refuse to overwrite an existing output path.

## 4. Package validation

```sh
python -m unittest discover -s tests -v
python scripts/validate_pack.py
python scripts/validate_pack.py --verify-checksums
```

The validator checks required files/frontmatter, source/rule references, evaluation structure, JSON syntax, local Markdown targets, and optionally the complete file checksum inventory. It does not fetch bibliography URLs or test a host/model. Relative-link fragments and semantic claims still need editorial review.

To regenerate the manifest for a **maintained release after all files are final**, run this from the pack root:

```sh
python -c "import hashlib; from pathlib import Path; import sys; sys.path.insert(0, 'scripts'); from validate_pack import tracked_files; root=Path('.'); files=[p for p in tracked_files(root) if p.name != 'MANIFEST.sha256']; Path('MANIFEST.sha256').write_text(''.join(hashlib.sha256(p.read_bytes()).hexdigest()+'  '+p.relative_to(root).as_posix()+'\\n' for p in files), encoding='utf-8')"
python scripts/validate_pack.py --verify-checksums
```

The manifest is an accidental-corruption/content-inventory check, not a cryptographic signature authenticating a maintainer. Python caches and VCS/environment directories are excluded. The generated ZIP has a separate SHA-256 beside it for the release download.

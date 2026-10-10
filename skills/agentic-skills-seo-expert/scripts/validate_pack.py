#!/usr/bin/env python3
"""Check the local pack's structure, rules, sources, relative links and checksums."""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from pathlib import Path

EXCLUDED_PARTS = {".git", "__pycache__", ".pytest_cache", ".venv"}


def tracked_files(root: Path) -> list[Path]:
    return sorted(path for path in root.rglob("*") if path.is_file()
                  and not any(part in EXCLUDED_PARTS for part in path.relative_to(root).parts)
                  and path.name != ".DS_Store" and path.suffix != ".pyc")


def validate(root: Path, verify_checksums: bool = False) -> list[str]:
    errors: list[str] = []
    required = ["SKILL.md", "README.md", "LICENSE", "NOTICE.md", "data/rules.json", "research/sources.json",
                "research/SOURCES.md", "examples/EXAMPLE_PROMPTS.md", "scripts/README.md", "evals/scenarios.json"]
    for name in required:
        if not (root / name).is_file():
            errors.append(f"Missing required file: {name}")
    if errors:
        return errors
    skill = (root / "SKILL.md").read_text(encoding="utf-8")
    if not skill.startswith("---\n") or "\n---\n" not in skill[4:]:
        errors.append("SKILL.md needs YAML frontmatter.")
    else:
        front = skill.split("---", 2)[1]
        match = re.search(r"^name:\s*(.+)$", front, re.M)
        if not match or match.group(1).strip() != "agentic-skills-seo-expert":
            errors.append("Frontmatter name must be agentic-skills-seo-expert.")
        desc = re.search(r"^description:\s*(.+)$", front, re.M)
        if not desc or not 1 <= len(desc.group(1)) <= 1024:
            errors.append("Frontmatter description must be 1–1024 characters.")
        if not re.search(r"^license:\s*CC0-1\.0\s*$", front, re.M):
            errors.append("Expected CC0-1.0 licence declaration.")
    if len(skill.splitlines()) > 500:
        errors.append("SKILL.md exceeds this pack's 500-line progressive-loading budget.")
    if "CC0 1.0 Universal" not in (root / "LICENSE").read_text(encoding="utf-8"):
        errors.append("Full expected CC0 licence text not found.")
    try:
        sources = json.loads((root / "research/sources.json").read_text(encoding="utf-8"))["sources"]
        rules = json.loads((root / "data/rules.json").read_text(encoding="utf-8"))["rules"]
        scenarios = json.loads((root / "evals/scenarios.json").read_text(encoding="utf-8"))["scenarios"]
    except (ValueError, KeyError, TypeError) as exc:
        return errors + [f"Invalid catalogue/source/evaluation structure: {exc}"]
    source_ids = [source.get("id") for source in sources]
    if len(source_ids) != len(set(source_ids)) or any(not isinstance(sid, str) for sid in source_ids):
        errors.append("Source IDs must be unique strings.")
    for source in sources:
        if source.get("review_status") not in ("reviewed", "access-limited", "discovery"):
            errors.append(f"Invalid source access state: {source.get('id')}")
        if not str(source.get("url", "")).startswith("https://") or not source.get("retrieved_at"):
            errors.append(f"Missing HTTPS provenance/date: {source.get('id')}")
    rule_ids = [rule.get("id") for rule in rules]
    if len(rule_ids) != len(set(rule_ids)):
        errors.append("Rule IDs are not unique.")
    needed = {"id", "category", "title", "basis", "engine_scope", "applicability", "priority_hint", "evidence_test",
              "remediation", "false_positive_caveat", "verification", "source_ids", "automation"}
    for rule in rules:
        if needed - set(rule) or any(rule.get(key) in (None, "", []) for key in needed):
            errors.append(f"Incomplete rule: {rule.get('id')}")
        for sid in rule.get("source_ids", []):
            if sid not in source_ids:
                errors.append(f"Unknown source {sid} in {rule.get('id')}")
        if rule.get("priority_hint") not in ("P0", "P1", "P2", "P3"):
            errors.append(f"Invalid priority: {rule.get('id')}")
    scenario_ids = [scenario.get("id") for scenario in scenarios]
    if len(scenario_ids) != len(set(scenario_ids)):
        errors.append("Evaluation scenario IDs are not unique.")
    for scenario in scenarios:
        if not all(scenario.get(key) for key in ("id", "prompt", "expected", "must_not")):
            errors.append(f"Incomplete evaluation: {scenario.get('id')}")
    # Validate all JSON resources, including examples/fixtures, without executing content.
    for path in tracked_files(root):
        if path.suffix == ".json":
            try:
                json.loads(path.read_text(encoding="utf-8"), parse_constant=lambda _: (_ for _ in ()).throw(ValueError("Non-finite JSON")))
            except (ValueError, UnicodeError) as exc:
                errors.append(f"Invalid JSON {path.relative_to(root)}: {exc}")
        if path.suffix != ".md":
            continue
        text = path.read_text(encoding="utf-8")
        for target in re.findall(r"(?<!!)\[[^\]]+\]\(([^)]+)\)", text):
            if re.match(r"^[a-zA-Z][a-zA-Z0-9+.-]*:", target) or target.startswith("#"):
                continue
            relative = target.split("#", 1)[0]
            resolved = (path.parent / relative).resolve()
            try:
                resolved.relative_to(root.resolve())
            except ValueError:
                errors.append(f"Local link escapes pack: {path.relative_to(root)} -> {target}")
                continue
            if not resolved.exists():
                errors.append(f"Broken local link: {path.relative_to(root)} -> {target}")
    if verify_checksums:
        manifest = root / "MANIFEST.sha256"
        if not manifest.exists():
            return errors + ["MANIFEST.sha256 is missing."]
        listed = set()
        for line in manifest.read_text(encoding="utf-8").splitlines():
            match = re.fullmatch(r"([0-9a-f]{64})  (.+)", line)
            if not match:
                errors.append("Malformed checksum line."); continue
            checksum, relative = match.groups()
            if relative in listed:
                errors.append(f"Duplicate checksum entry: {relative}")
            listed.add(relative)
            path = (root / relative).resolve()
            try:
                path.relative_to(root.resolve())
            except ValueError:
                errors.append(f"Checksum path escapes pack: {relative}"); continue
            if not path.is_file() or hashlib.sha256(path.read_bytes()).hexdigest() != checksum:
                errors.append(f"Checksum mismatch/missing file: {relative}")
        expected = {str(path.relative_to(root).as_posix()) for path in tracked_files(root) if path.name != "MANIFEST.sha256"}
        if listed != expected:
            errors.append(f"Manifest inventory differs: missing={sorted(expected-listed)}, extra={sorted(listed-expected)}")
    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--verify-checksums", action="store_true")
    args = parser.parse_args()
    try:
        errors = validate(args.root.resolve(), args.verify_checksums)
    except (OSError, ValueError, TypeError) as exc:
        print(f"Validation error: {exc}", file=sys.stderr)
        return 2
    if errors:
        for error in errors:
            print(f"FAIL: {error}")
        return 1
    print("PASS: local structure, catalogue references, JSON and relative links" + (", plus complete checksums" if args.verify_checksums else ""))
    print("This does not verify live source freshness, host installation, agent behaviour or real-site SEO.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

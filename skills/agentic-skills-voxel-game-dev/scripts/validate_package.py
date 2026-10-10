#!/usr/bin/env python3
"""Check package structure, local links and installed usage examples, offline."""
from __future__ import annotations

import argparse
import ast
import json
from pathlib import Path
import re


def validate(root: Path) -> dict:
    errors = []
    required = [
        "SKILL.md", "agents/openai.yaml", "references/example-prompts.md",
        "references/research-sources.md", "references/tooling.md",
        "scripts/voxel_oracles.py", "scripts/voxel_budget.py",
        "scripts/test_voxel_tools.py", "assets/templates/benchmark-scenario.json",
    ]
    for relative in required:
        if not (root / relative).is_file():
            errors.append(f"Missing required file: {relative}")
    skill = (root / "SKILL.md").read_text(encoding="utf-8") if (root / "SKILL.md").is_file() else ""
    frontmatter = re.match(r"\A---\n(.*?)\n---(?:\n|$)", skill, re.S)
    name = None
    if not frontmatter:
        errors.append("SKILL.md must begin with YAML frontmatter")
    else:
        fields = dict(re.findall(r"^(name|description): (.+)$", frontmatter.group(1), re.M))
        name = fields.get("name")
        if name != "agentic-skills-voxel-game-dev":
            errors.append("Expected name: agentic-skills-voxel-game-dev")
        if not 1 <= len(fields.get("description", "")) <= 1024:
            errors.append("Description must contain 1–1024 characters")
    if len(skill.splitlines()) > 500:
        errors.append("SKILL.md exceeds 500 lines")
    files = sorted(p for p in root.rglob("*") if p.is_file() and "__pycache__" not in p.parts)
    for path in files:
        relative = str(path.relative_to(root))
        if path.is_symlink():
            errors.append(f"Unexpected symbolic link: {relative}")
            continue
        if path.suffix == ".md":
            content = path.read_text(encoding="utf-8")
            if len(re.findall(r"^```", content, re.M)) % 2:
                errors.append(f"Unbalanced fenced block: {relative}")
            if path.parent.name == "references" and len(content.splitlines()) > 100 and "## Contents" not in content:
                errors.append(f"Long reference needs Contents: {relative}")
            for target in re.findall(r"\[[^\]]*\]\(([^\s)]+)\)", content):
                if re.match(r"[A-Za-z][A-Za-z0-9+.-]*:", target) or target.startswith("#"):
                    continue
                linked = (path.parent / target.split("#", 1)[0]).resolve()
                if not linked.is_relative_to(root):
                    errors.append(f"Link leaves package: {relative}: {target}")
                elif not linked.exists():
                    errors.append(f"Missing link target: {relative}: {target}")
        elif path.suffix == ".py":
            try:
                ast.parse(path.read_text(encoding="utf-8"), filename=relative)
            except SyntaxError as exc:
                errors.append(f"Invalid Python: {relative}: {exc.msg}")
        elif path.suffix == ".json":
            try:
                json.loads(path.read_text(encoding="utf-8"))
            except json.JSONDecodeError as exc:
                errors.append(f"Invalid JSON: {relative}: {exc.msg}")
    prompts_path = root / "references/example-prompts.md"
    prompts_text = prompts_path.read_text(encoding="utf-8") if prompts_path.is_file() else ""
    prompts = re.findall(r"^```text\n(.*?)^```", prompts_text, re.M | re.S)
    if not prompts:
        errors.append("Package must retain installed example prompts")
    for number, prompt in enumerate(prompts, 1):
        if "$agentic-skills-voxel-game-dev" not in prompt:
            errors.append(f"Example prompt {number} does not name this skill")
    if "references/example-prompts.md" not in skill:
        errors.append("SKILL.md must link the example prompts")
    metadata_path = root / "agents/openai.yaml"
    if metadata_path.is_file() and "$agentic-skills-voxel-game-dev" not in metadata_path.read_text(encoding="utf-8"):
        errors.append("UI metadata must name the skill in its default prompt")
    return {
        "valid": not errors,
        "skill": name,
        "files_checked": len(files),
        "core_lines": len(skill.splitlines()),
        "core_words": len(skill.split()),
        "example_prompts": len(prompts),
        "errors": errors,
        "scope": "Offline structure, links, syntax and prompt-preservation check; not engine or game validation.",
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1], help="Installed skill directory; defaults to this script's parent package")
    args = parser.parse_args()
    root = args.root.resolve()
    if not root.is_dir():
        parser.error("--root must be an existing skill directory")
    try:
        result = validate(root)
    except (OSError, UnicodeError) as exc:
        parser.error(f"Cannot read package: {exc}")
    print(json.dumps(result, indent=2, ensure_ascii=False, sort_keys=True))
    return 0 if result["valid"] else 1


if __name__ == "__main__":
    raise SystemExit(main())

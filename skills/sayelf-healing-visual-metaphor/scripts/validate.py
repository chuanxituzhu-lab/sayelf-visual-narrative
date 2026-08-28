#!/usr/bin/env python3
"""Validate this Skill package without third-party dependencies."""

from __future__ import annotations

import re
import sys
from pathlib import Path


REQUIRED_FILES = (
    "SKILL.md",
    "README.md",
    "core/visual-metaphor.md",
    "core/emotion-engine.md",
    "core/metaphor-engine.md",
    "core/tension-engine.md",
    "core/decisive-moment.md",
    "core/output-contract.md",
    "styles/realistic-world-cartoon-avatar.md",
    "styles/realistic-world-line-avatar.md",
    "styles/miniature-symbolic-character.md",
    "styles/account-character-system.md",
    "rules/simplicity.md",
    "rules/visual-contrast.md",
    "rules/negative-space.md",
    "rules/lighting.md",
    "rules/anti-clutter.md",
    "rules/continuity-lock.md",
    "rules/motion-budget.md",
    "rules/emotional-peak-lock.md",
    "rules/no-preaching.md",
    "rules/frozen-locks.md",
    "rules/account-character-lock.md",
    "workflows/text-to-metaphor.md",
    "workflows/image-to-metaphor.md",
    "workflows/metaphor-to-video.md",
    "examples/rain-acceptance.md",
    "examples/cliff-hope.md",
    "scripts/validate.py",
)

REQUIRED_EXAMPLE_TOKENS = (
    "[CORE]",
    "[FEEL]",
    "[WOUND]",
    "[AVATAR]",
    "[CHARACTER_PROFILE]",
    "[WORLD]",
    "[METAPHOR]",
    "[TENSION]",
    "[TURN]",
    "[MOMENT]",
    "[AFTERGLOW]",
    "[SILENCE]",
    "## HERO IMAGE",
    "## STORYBOARD + VIDEO PROMPTS",
    "## CONTINUITY LOCK",
    "## FROZEN LOCK CHECKS",
    "## SOUND",
    "## NEGATIVE",
    "## AFTERGLOW",
    "CONTINUITY LOCK",
    "ACCOUNT CHARACTER LOCK",
    "MOTION BUDGET",
    "EMOTIONAL PEAK LOCK",
    "NO PREACHING",
)


def frontmatter_errors(skill_path: Path, content: str) -> list[str]:
    errors: list[str] = []
    match = re.match(r"\A---\r?\n(?P<body>.*?)\r?\n---(?:\r?\n|\Z)", content, re.DOTALL)
    if not match:
        return ["SKILL.md: missing or malformed YAML frontmatter"]

    body = match.group("body")
    allowed = {"name", "description", "license", "allowed-tools", "metadata"}
    top_level: list[str] = []
    values: dict[str, str] = {}
    for line in body.splitlines():
        if not line or line[0].isspace():
            continue
        key_match = re.match(r"^([A-Za-z0-9_-]+):\s*(.*)$", line)
        if key_match:
            key, value = key_match.groups()
            top_level.append(key)
            values[key] = value.strip()
    unexpected = sorted(set(top_level) - allowed)
    if unexpected:
        errors.append(f"SKILL.md: unexpected frontmatter key(s): {', '.join(unexpected)}")
    if values.get("name") != "sayelf-healing-visual-metaphor":
        errors.append("SKILL.md: name must be sayelf-healing-visual-metaphor")
    description = values.get("description", "")
    if not description:
        errors.append("SKILL.md: description is missing")
    if "<" in description or ">" in description:
        errors.append("SKILL.md: description contains angle brackets")
    if len(description) > 1024:
        errors.append("SKILL.md: description exceeds 1024 characters")
    return errors


def link_errors(root: Path) -> list[str]:
    errors: list[str] = []
    link_pattern = re.compile(r"\[[^\]]+\]\(([^)]+)\)")
    for source in root.rglob("*.md"):
        content = source.read_text(encoding="utf-8")
        for match in link_pattern.finditer(content):
            target = match.group(1).split("#", 1)[0]
            if not target or target.startswith(("http://", "https://", "#")):
                continue
            if not (source.parent / target).resolve().exists():
                errors.append(f"{source.relative_to(root)}: broken link {target}")
    return errors


def example_errors(root: Path) -> list[str]:
    errors: list[str] = []
    for relative in ("examples/rain-acceptance.md", "examples/cliff-hope.md"):
        path = root / relative
        content = path.read_text(encoding="utf-8")
        shot_count = len(re.findall(r"^### Shot \d+\b", content, re.MULTILINE))
        prompt_count = len(re.findall(r"^Video prompt:", content, re.MULTILINE))
        motion_count = len(re.findall(r"^Primary motion:", content, re.MULTILINE))
        if shot_count != 5:
            errors.append(f"{relative}: expected 5 shots, found {shot_count}")
        if prompt_count != 5:
            errors.append(f"{relative}: expected 5 video prompts, found {prompt_count}")
        if motion_count != 5:
            errors.append(f"{relative}: expected 5 primary-motion entries, found {motion_count}")
        for token in REQUIRED_EXAMPLE_TOKENS:
            if token not in content:
                errors.append(f"{relative}: missing {token}")
    return errors


def validate(root: Path) -> list[str]:
    errors: list[str] = []
    missing = [relative for relative in REQUIRED_FILES if not (root / relative).is_file()]
    errors.extend(f"missing file: {relative}" for relative in missing)

    skill_path = root / "SKILL.md"
    if skill_path.is_file():
        skill_content = skill_path.read_text(encoding="utf-8")
        errors.extend(frontmatter_errors(skill_path, skill_content))

    placeholder_pattern = re.compile(r"TODO|TBD|PLACEHOLDER|FIXME|lorem ipsum|coming soon", re.IGNORECASE)
    for path in root.rglob("*.md"):
        if placeholder_pattern.search(path.read_text(encoding="utf-8")):
            errors.append(f"placeholder text found: {path.relative_to(root)}")

    if not missing:
        errors.extend(link_errors(root))
        errors.extend(example_errors(root))
    return errors


def main() -> int:
    root = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path(__file__).resolve().parents[1]
    if len(sys.argv) > 2 or not root.is_dir():
        print("Usage: python scripts/validate.py [skill-directory]")
        return 2
    errors = validate(root)
    if errors:
        print("Skill validation: FAIL")
        for error in errors:
            print(f"- {error}")
        return 1
    print(f"Skill validation: PASS ({len(REQUIRED_FILES)} required files, standard library only)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

"""Prepare the optional local dependency used by the external Skill validator."""

from __future__ import annotations

import argparse
import os
from pathlib import Path
import subprocess
import sys


ROOT = Path(__file__).resolve().parents[1]
REQUIREMENTS = ROOT / "requirements-validation.txt"


def python_with_yaml(target: Path | None = None) -> bool:
    env = os.environ.copy()
    if target is not None:
        current = env.get("PYTHONPATH")
        env["PYTHONPATH"] = str(target) + (os.pathsep + current if current else "")
    probe = subprocess.run(
        [sys.executable, "-c", "import yaml; print(yaml.__version__)"],
        env=env,
        capture_output=True,
        text=True,
        check=False,
    )
    if probe.returncode == 0:
        print(f"PyYAML ready: {probe.stdout.strip()}")
        return True
    return False


def main() -> int:
    parser = argparse.ArgumentParser(description="Install optional local PyYAML validation dependency.")
    parser.add_argument(
        "--target",
        type=Path,
        default=ROOT / ".deps" / "python",
        help="Local target directory for the optional dependency (default: .deps/python)",
    )
    args = parser.parse_args()
    target = args.target.expanduser().resolve()

    if python_with_yaml():
        print("No installation needed; current Python already provides PyYAML.")
        return 0

    if python_with_yaml(target):
        print(f"No installation needed; target already provides PyYAML: {target}")
        return 0

    target.mkdir(parents=True, exist_ok=True)
    command = [
        sys.executable,
        "-m",
        "pip",
        "install",
        "--disable-pip-version-check",
        "--no-input",
        "--no-cache-dir",
        "--no-deps",
        "--only-binary=PyYAML",
        "--target",
        str(target),
        "-r",
        str(REQUIREMENTS),
    ]
    print(f"Installing optional validation dependency into: {target}")
    try:
        subprocess.run(command, check=True)
    except subprocess.CalledProcessError as error:
        print(f"PyYAML installation failed with exit code {error.returncode}.", file=sys.stderr)
        return error.returncode or 1

    if not python_with_yaml(target):
        print("PyYAML installation completed but import verification failed.", file=sys.stderr)
        return 1
    print(f"PyYAML validation environment ready: {target}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

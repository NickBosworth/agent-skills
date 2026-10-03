#!/usr/bin/env python3
"""Bounded, local-only structural helpers for the agentic-codebase skill."""

import sys

# A vendored copy may itself live inside --root. Read-only commands must not
# create Python bytecode cache files in that repository merely by importing.
sys.dont_write_bytecode = True

from agentic_core import main


if __name__ == "__main__":
    raise SystemExit(main())

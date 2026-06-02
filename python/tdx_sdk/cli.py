"""Command-line bridge used by the TypeScript side for Python SDK commands."""

from __future__ import annotations

import argparse
import json
import sys
from typing import Any


def main() -> None:
    parser = argparse.ArgumentParser(description="Tongdaxin Python SDK bridge.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    subparsers.add_parser("health", help="Verify that the Python bridge can start.")

    args = parser.parse_args()

    if args.command == "health":
        _write_json({"status": "ok", "bridge": "tdx_sdk.cli"})


def _write_json(payload: dict[str, Any]) -> None:
    sys.stdout.write(f"{json.dumps(payload, ensure_ascii=False)}\n")


if __name__ == "__main__":
    main()

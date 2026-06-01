"""HTTP service wrapper for the local Python SDK.

The TypeScript application can start this module as a long-lived process and
communicate over HTTP once real SDK operations are added.
"""

from __future__ import annotations

import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any

DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 8765


class TdxSdkRequestHandler(BaseHTTPRequestHandler):
    """Empty request handler reserved for future SDK HTTP routes."""

    # No public endpoints are registered yet. Keep this class in place so the
    # server bootstrap remains stable when the real TypeScript-facing SDK routes
    # are added later.

    def log_message(self, format: str, *args: Any) -> None:
        """Keep stdlib request logs concise while preserving service visibility."""
        print(f"[tdx_sdk] {self.address_string()} - {format % args}")


def main() -> None:
    host = os.environ.get("TDX_SDK_HOST", DEFAULT_HOST)
    port = int(os.environ.get("TDX_SDK_PORT", str(DEFAULT_PORT)))

    # ThreadingHTTPServer is enough for the local bridge: it keeps the process
    # ready for future SDK endpoints without adding a framework dependency.
    server = ThreadingHTTPServer((host, port), TdxSdkRequestHandler)
    print(f"[tdx_sdk] listening on http://{host}:{port}")
    server.serve_forever()


if __name__ == "__main__":
    main()

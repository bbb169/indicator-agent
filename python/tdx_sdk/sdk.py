"""Core SDK placeholders for future Tongdaxin indicator logic."""

from __future__ import annotations

from dataclasses import dataclass
import os
from pathlib import Path
import sys
from typing import Any


def _resolve_tdx_user_plugin_dir() -> Path:
    """Find the Tongdaxin `PYPlugins/user` folder that contains `tqcenter.py`."""
    configured_plugin_dir = os.environ.get("TDX_PYPLUGINS_USER")
    if configured_plugin_dir:
        return Path(configured_plugin_dir).expanduser().resolve()

    configured_tdx_home = os.environ.get("TDX_HOME")
    if configured_tdx_home:
        return Path(configured_tdx_home).expanduser().resolve() / "PYPlugins" / "user"

    for install_root in (Path("C:/new_tdx64"), Path("C:/new_tdx")):
        plugin_dir = install_root / "PYPlugins" / "user"
        if (plugin_dir / "tqcenter.py").exists():
            return plugin_dir

    return Path("C:/new_tdx64/PYPlugins/user")


def _load_tdx() -> Any:
    plugin_dir = _resolve_tdx_user_plugin_dir().resolve()
    tqcenter_path = plugin_dir / "tqcenter.py"

    if not tqcenter_path.exists():
        raise FileNotFoundError(
            "Cannot find Tongdaxin tqcenter.py. Set TDX_PYPLUGINS_USER to "
            "the terminal's PYPlugins/user directory, or set TDX_HOME to "
            f"the Tongdaxin install root. Checked: {tqcenter_path}"
        )

    plugin_dir_text = str(plugin_dir)
    if plugin_dir_text not in sys.path:
        sys.path.insert(0, plugin_dir_text)

    from tqcenter import tq as loaded_tq

    # Tongdaxin's docs require `tq.initialize(__file__)` before any API call.
    # Pass this SDK module path, not `tqcenter.py`, so initialization matches
    # the documented strategy-file pattern.
    loaded_tq.initialize(__file__)
    return loaded_tq


tq: Any | None = None


def _tdx() -> Any:
    global tq

    if tq is None:
        tq = _load_tdx()

    return tq


@dataclass(frozen=True)
class TdxSdk:
    """SDK entrypoint reserved for indicator and backtesting interfaces."""

    def tdx(self) -> Any:
        """Return the module-level initialized Tongdaxin `tq` object."""
        return _tdx()

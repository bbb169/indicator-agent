"""Python SDK surface for indicator workflows."""

from typing import TYPE_CHECKING, Any

from .sdk import TdxSdk, _tdx

__all__ = ["TdxSdk", "tq"]

if TYPE_CHECKING:
    tq: Any


def __getattr__(name: str) -> Any:
    if name == "tq":
        return _tdx()

    raise AttributeError(name)

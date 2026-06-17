"""
Connection helper for DaVinci Resolve's scripting API.

Resolve ships a Python module called ``DaVinciResolveScript`` but it is NOT on
the default ``sys.path``. Blackmagic expects you to set three environment
variables (RESOLVE_SCRIPT_API / RESOLVE_SCRIPT_LIB / PYTHONPATH) before
importing it. To keep setup painless this module falls back to the documented
default install locations per-OS when those env vars are missing.

Requirements on the machine running this:
  * DaVinci Resolve (free) or Resolve Studio, *already open*.
  * Preferences -> System -> General -> "External scripting using" = Local.
  * A Python interpreter whose architecture matches Resolve (64-bit).

Note: a handful of API calls (some render + Fusion features) are Studio-only.
Everything in the starter server below works on the free version.
"""

from __future__ import annotations

import os
import sys
import platform
from pathlib import Path


def _default_paths() -> tuple[str, str]:
    """Return (RESOLVE_SCRIPT_API, RESOLVE_SCRIPT_LIB) for the current OS."""
    system = platform.system()
    if system == "Darwin":  # macOS
        api = "/Library/Application Support/Blackmagic Design/DaVinci Resolve/Developer/Scripting"
        lib = "/Applications/DaVinci Resolve/DaVinci Resolve.app/Contents/Libraries/Fusion/fusionscript.so"
    elif system == "Windows":
        program_data = os.environ.get("PROGRAMDATA", r"C:\ProgramData")
        api = rf"{program_data}\Blackmagic Design\DaVinci Resolve\Support\Developer\Scripting"
        lib = r"C:\Program Files\Blackmagic Design\DaVinci Resolve\fusionscript.dll"
    elif system == "Linux":
        api = "/opt/resolve/Developer/Scripting"
        lib = "/opt/resolve/libs/Fusion/fusionscript.so"
    else:
        raise RuntimeError(f"Unsupported OS for Resolve scripting: {system}")
    return api, lib


def _ensure_module_path() -> None:
    """Make ``DaVinciResolveScript`` importable, using env vars or OS defaults."""
    api = os.environ.get("RESOLVE_SCRIPT_API")
    lib = os.environ.get("RESOLVE_SCRIPT_LIB")

    if not api or not lib:
        default_api, default_lib = _default_paths()
        api = api or default_api
        lib = lib or default_lib
        os.environ["RESOLVE_SCRIPT_API"] = api
        os.environ["RESOLVE_SCRIPT_LIB"] = lib

    modules_dir = str(Path(api) / "Modules")
    if modules_dir not in sys.path:
        sys.path.append(modules_dir)


class ResolveConnectionError(RuntimeError):
    """Raised when we cannot reach a running Resolve instance."""


def get_resolve():
    """Return the live ``Resolve`` scripting object, or raise a helpful error."""
    _ensure_module_path()
    try:
        import DaVinciResolveScript as dvr_script  # type: ignore
    except ImportError as exc:  # pragma: no cover - environment dependent
        raise ResolveConnectionError(
            "Could not import DaVinciResolveScript.\n"
            f"  RESOLVE_SCRIPT_API = {os.environ.get('RESOLVE_SCRIPT_API')}\n"
            f"  RESOLVE_SCRIPT_LIB = {os.environ.get('RESOLVE_SCRIPT_LIB')}\n"
            "Check that DaVinci Resolve is installed at the default location, "
            "or set those two env vars to match your install."
        ) from exc

    resolve = dvr_script.scriptapp("Resolve")
    if resolve is None:
        raise ResolveConnectionError(
            "Imported the scripting module but got no Resolve instance.\n"
            "Make sure DaVinci Resolve is RUNNING and that\n"
            "Preferences -> System -> General -> 'External scripting using' is set to 'Local'."
        )
    return resolve


def get_project_manager():
    return get_resolve().GetProjectManager()


def get_current_project():
    project = get_project_manager().GetCurrentProject()
    if project is None:
        raise ResolveConnectionError(
            "No project is open in Resolve. Open or create a project first."
        )
    return project


if __name__ == "__main__":
    # Quick smoke test: run `python resolve_connect.py` on the machine with Resolve open.
    try:
        r = get_resolve()
        pm = r.GetProjectManager()
        proj = pm.GetCurrentProject()
        name = proj.GetName() if proj else "(no project open)"
        print(f"Connected to Resolve. Product: {r.GetProductName()} | Project: {name}")
    except ResolveConnectionError as e:
        print(f"NOT connected:\n{e}")
        sys.exit(1)

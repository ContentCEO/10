"""
DaVinci Resolve MCP server.

Exposes a set of editing tools to Claude over the Model Context Protocol.
Run this on the SAME machine where DaVinci Resolve is installed and running.

  pip install -r requirements.txt
  python server.py            # speaks MCP over stdio

Then register it with Claude (see README.md).
"""

from __future__ import annotations

from typing import Optional

from mcp.server.fastmcp import FastMCP

from resolve_connect import (
    ResolveConnectionError,
    get_current_project,
    get_project_manager,
    get_resolve,
)

mcp = FastMCP("davinci-resolve")


def _err(exc: Exception) -> str:
    return f"ERROR: {exc}"


# --------------------------------------------------------------------------- #
# Status / discovery
# --------------------------------------------------------------------------- #
@mcp.tool()
def resolve_status() -> str:
    """Check the connection to DaVinci Resolve and report product + open project."""
    try:
        resolve = get_resolve()
        pm = resolve.GetProjectManager()
        project = pm.GetCurrentProject()
        project_name = project.GetName() if project else "(none open)"
        return (
            f"Connected.\n"
            f"Product: {resolve.GetProductName()} {resolve.GetVersionString()}\n"
            f"Current page: {resolve.GetCurrentPage()}\n"
            f"Open project: {project_name}"
        )
    except ResolveConnectionError as exc:
        return _err(exc)


@mcp.tool()
def list_projects() -> str:
    """List all projects in the current Resolve database/folder."""
    try:
        pm = get_project_manager()
        names = pm.GetProjectListInCurrentFolder()
        if not names:
            return "No projects found in the current folder."
        return "\n".join(f"- {n}" for n in names)
    except ResolveConnectionError as exc:
        return _err(exc)


@mcp.tool()
def open_project(name: str) -> str:
    """Open a project by name. Returns the resulting current project name."""
    try:
        pm = get_project_manager()
        project = pm.LoadProject(name)
        if project is None:
            return f"Could not open project '{name}'. Check the exact name with list_projects."
        return f"Opened project: {project.GetName()}"
    except ResolveConnectionError as exc:
        return _err(exc)


@mcp.tool()
def create_project(name: str) -> str:
    """Create a new, empty Resolve project and switch to it."""
    try:
        pm = get_project_manager()
        project = pm.CreateProject(name)
        if project is None:
            return f"Could not create project '{name}' (it may already exist)."
        return f"Created and opened project: {project.GetName()}"
    except ResolveConnectionError as exc:
        return _err(exc)


# --------------------------------------------------------------------------- #
# Timelines
# --------------------------------------------------------------------------- #
@mcp.tool()
def list_timelines() -> str:
    """List every timeline in the open project, marking the current one."""
    try:
        project = get_current_project()
        count = project.GetTimelineCount()
        if count == 0:
            return "The project has no timelines yet."
        current = project.GetCurrentTimeline()
        current_name = current.GetName() if current else None
        lines = []
        for i in range(1, count + 1):
            tl = project.GetTimelineByIndex(i)
            name = tl.GetName()
            marker = "  <- current" if name == current_name else ""
            lines.append(f"- {name}{marker}")
        return "\n".join(lines)
    except ResolveConnectionError as exc:
        return _err(exc)


@mcp.tool()
def create_timeline(name: str) -> str:
    """Create an empty timeline in the open project and make it current."""
    try:
        project = get_current_project()
        media_pool = project.GetMediaPool()
        timeline = media_pool.CreateEmptyTimeline(name)
        if timeline is None:
            return f"Could not create timeline '{name}'."
        project.SetCurrentTimeline(timeline)
        return f"Created timeline '{name}' and set it as current."
    except ResolveConnectionError as exc:
        return _err(exc)


@mcp.tool()
def set_current_timeline(name: str) -> str:
    """Switch the active timeline by name."""
    try:
        project = get_current_project()
        for i in range(1, project.GetTimelineCount() + 1):
            tl = project.GetTimelineByIndex(i)
            if tl.GetName() == name:
                project.SetCurrentTimeline(tl)
                return f"Current timeline is now '{name}'."
        return f"No timeline named '{name}'. Use list_timelines to see options."
    except ResolveConnectionError as exc:
        return _err(exc)


# --------------------------------------------------------------------------- #
# Media
# --------------------------------------------------------------------------- #
@mcp.tool()
def import_media(file_paths: list[str]) -> str:
    """Import one or more media files (absolute paths) into the media pool root."""
    try:
        project = get_current_project()
        media_pool = project.GetMediaPool()
        media_storage = get_resolve().GetMediaStorage()
        added = media_storage.AddItemListToMediaPool(file_paths)
        if not added:
            return (
                "Nothing was imported. Check that the paths are absolute and exist "
                "on the machine running Resolve."
            )
        names = [item.GetName() for item in added]
        return f"Imported {len(names)} item(s):\n" + "\n".join(f"- {n}" for n in names)
    except ResolveConnectionError as exc:
        return _err(exc)


@mcp.tool()
def list_media_pool_clips() -> str:
    """List clips in the current media pool folder."""
    try:
        project = get_current_project()
        media_pool = project.GetMediaPool()
        folder = media_pool.GetCurrentFolder()
        clips = folder.GetClipList()
        if not clips:
            return "The current media pool folder is empty."
        lines = []
        for c in clips:
            name = c.GetName()
            duration = c.GetClipProperty("Duration")
            lines.append(f"- {name}  ({duration})")
        return "\n".join(lines)
    except ResolveConnectionError as exc:
        return _err(exc)


@mcp.tool()
def append_clips_to_timeline(clip_names: Optional[list[str]] = None) -> str:
    """
    Append clips from the media pool to the current timeline.

    If clip_names is omitted, every clip in the current media pool folder is
    appended in pool order. If there's no current timeline, one is created.
    """
    try:
        project = get_current_project()
        media_pool = project.GetMediaPool()
        folder = media_pool.GetCurrentFolder()
        clips = folder.GetClipList()
        if not clips:
            return "No clips in the media pool to append. Import media first."

        if clip_names:
            wanted = {n: None for n in clip_names}
            selected = [c for c in clips if c.GetName() in wanted]
            missing = [n for n in clip_names if not any(c.GetName() == n for c in clips)]
            if missing:
                return f"These clips were not found in the pool: {', '.join(missing)}"
        else:
            selected = clips

        if project.GetCurrentTimeline() is None:
            media_pool.CreateEmptyTimeline("Timeline 1")

        items = media_pool.AppendToTimeline(selected)
        appended = len(items) if items else 0
        return f"Appended {appended} clip(s) to '{project.GetCurrentTimeline().GetName()}'."
    except ResolveConnectionError as exc:
        return _err(exc)


# --------------------------------------------------------------------------- #
# Markers + render
# --------------------------------------------------------------------------- #
@mcp.tool()
def add_marker(frame: int, color: str = "Blue", name: str = "", note: str = "") -> str:
    """Add a marker to the current timeline at the given frame number."""
    try:
        project = get_current_project()
        timeline = project.GetCurrentTimeline()
        if timeline is None:
            return "No current timeline. Create one first."
        ok = timeline.AddMarker(frame, color, name or "Marker", note, 1)
        return "Marker added." if ok else "Could not add marker (frame may be out of range or occupied)."
    except ResolveConnectionError as exc:
        return _err(exc)


@mcp.tool()
def render_current_timeline(
    target_dir: str,
    preset: str = "H.264 Master",
    filename: str = "render",
) -> str:
    """
    Queue and start a render of the current timeline to target_dir.

    `preset` must match a render preset available in your Resolve install
    (Deliver page). Returns once the job is queued and rendering has started.
    """
    try:
        project = get_current_project()
        timeline = project.GetCurrentTimeline()
        if timeline is None:
            return "No current timeline to render."

        if not project.LoadRenderPreset(preset):
            presets = project.GetRenderPresetList()
            return (
                f"Render preset '{preset}' not found. Available presets:\n"
                + "\n".join(f"- {p}" for p in presets)
            )

        project.SetRenderSettings(
            {"TargetDir": target_dir, "CustomName": filename}
        )
        job_id = project.AddRenderJob()
        if not job_id:
            return "Failed to add render job."
        project.StartRendering(job_id)
        return f"Render started. Job id: {job_id}\nOutput: {target_dir}/{filename}"
    except ResolveConnectionError as exc:
        return _err(exc)


@mcp.tool()
def render_status() -> str:
    """Report whether a render is in progress and per-job status."""
    try:
        project = get_current_project()
        rendering = project.IsRenderingInProgress()
        jobs = project.GetRenderJobList()
        if not jobs:
            return "No render jobs in the queue."
        lines = [f"Rendering in progress: {rendering}"]
        for job in jobs:
            jid = job.get("JobId", "?")
            status = project.GetRenderJobStatus(jid)
            lines.append(f"- {jid}: {status.get('JobStatus')} {status.get('CompletionPercentage', 0)}%")
        return "\n".join(lines)
    except ResolveConnectionError as exc:
        return _err(exc)


if __name__ == "__main__":
    mcp.run()

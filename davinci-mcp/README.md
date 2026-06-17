# DaVinci Resolve MCP server

Lets Claude (Desktop or Claude Code) drive DaVinci Resolve — create projects and
timelines, import media, append clips, add markers, and render — through
Resolve's official scripting API.

## Why it runs on your machine, not in the cloud

Resolve's scripting API only works **on the same computer Resolve is installed
on**, and Resolve must be **running**. This MCP server is the bridge:

```
Claude (Desktop / Code) ──MCP──▶ server.py ──scripting API──▶ DaVinci Resolve
                                  (all three on YOUR machine)
```

So the cloud assistant wrote this code; **you run it locally**.

## Requirements

- DaVinci Resolve **18 or 19+** (free or Studio), installed and **open**.
- **Python 3.10+**, 64-bit (must match Resolve's architecture).
- A few API calls (some Fusion/advanced render features) are Studio-only;
  everything in this starter works on the free version.

## One-time setup

### 1. Enable external scripting in Resolve
Resolve → **Preferences → System → General → "External scripting using"** →
set to **Local**. Quit and reopen Resolve.

### 2. Get this folder onto your machine
```bash
git clone <this repo>           # or: git pull on an existing clone
cd 10/davinci-mcp
```

### 3. Install dependencies
```bash
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 4. Verify Resolve is reachable
With Resolve open and a project loaded:
```bash
python resolve_connect.py
# -> "Connected to Resolve. Product: DaVinci Resolve Studio | Project: ..."
```
If it says NOT connected, the message tells you which env var/path to fix.
`resolve_connect.py` already fills in the default install paths per-OS; you only
need to set `RESOLVE_SCRIPT_API` / `RESOLVE_SCRIPT_LIB` if you installed Resolve
somewhere non-standard.

## Connect it to Claude

### Option A — Claude Desktop
Edit your config file:
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

Copy the `davinci-resolve` block from `claude_desktop_config.example.json`,
replacing both paths with **absolute** paths (use the venv's python). Restart
Claude Desktop. You'll see a tools icon for `davinci-resolve`.

### Option B — Claude Code (CLI)
```bash
claude mcp add davinci-resolve -- /full/path/to/.venv/bin/python /full/path/to/davinci-mcp/server.py
```

## Try it

Ask Claude:
- "What's the Resolve status?" → `resolve_status`
- "Create a project called Demo and a timeline called Cut 1."
- "Import /Users/me/Footage/a.mov and /Users/me/Footage/b.mov, then append them to the timeline."
- "Add a blue marker at frame 240 named 'intro out'."
- "Render the current timeline to /Users/me/Exports using the H.264 Master preset."

## Tools exposed

| Tool | What it does |
|------|--------------|
| `resolve_status` | Connection + product + open project |
| `list_projects` / `open_project` / `create_project` | Project management |
| `list_timelines` / `create_timeline` / `set_current_timeline` | Timeline management |
| `import_media` / `list_media_pool_clips` | Bring footage into the pool |
| `append_clips_to_timeline` | Lay clips onto the current timeline |
| `add_marker` | Tag a frame |
| `render_current_timeline` / `render_status` | Export |

## Extending

Each tool is a small function in `server.py` decorated with `@mcp.tool()`. To add
capabilities (transitions, color page operations, Fairlight audio, Fusion comps),
add a function that calls the corresponding Resolve API object and Claude can use
it immediately. The full API reference is in the README that ships inside
Resolve's `Developer/Scripting/` folder.

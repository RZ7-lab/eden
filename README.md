<p align="center">
  <strong>eden-me</strong><br>
  Your personal AI identity layer.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/eden-me"><img src="https://img.shields.io/npm/v/eden-me.svg" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/eden-me"><img src="https://img.shields.io/npm/dm/eden-me.svg" alt="npm downloads"></a>
  <a href="https://github.com/RZ7-lab/eden/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/eden-me.svg" alt="license"></a>
  <img src="https://img.shields.io/node/v/eden-me.svg" alt="node version">
</p>

---

Every AI conversation starts from zero. You re-explain your stack, your preferences, your project conventions — over and over, across every tool, every session.

**Eden fixes this.** Install once, and every AI tool you use knows you instantly.

Eden is an [MCP](https://modelcontextprotocol.io/) server that scans your local dev environment, builds a persistent developer profile, and serves it to Claude Code, Cursor, Windsurf, and any MCP-compatible tool — automatically.

## Install

```
npx eden-me
```

That's it. No config files. No API keys for the core experience. No manual setup.

## What happens

```
$ npx eden-me

  ✦ Eden — initializing your AI identity

  Scanning projects...
    Found 12 projects across ~/code, ~/work
    Detected: TypeScript, Python, Rust, Go
    Frameworks: React, FastAPI, Axum

  Building profile...
    Analyzed 847 recent commits
    Mapped active vs dormant projects
    Indexed coding patterns

  Connecting to AI tools...
    ✓ Claude Code — connected (claude mcp add eden)
    ✓ Cursor — config written
    ✓ Windsurf — config written

  ✦ Done. Open Claude Code — it already knows you.
```

## How it works

```
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│  Claude Code  │   │    Cursor    │   │   Windsurf   │
└──────┬───────┘   └──────┬───────┘   └──────┬───────┘
       │                  │                   │
       └──────────┬───────┴───────────────────┘
                  │ MCP (Model Context Protocol)
            ┌─────┴──────┐
            │    Eden    │
            │   server   │
            └─────┬──────┘
                  │
   ┌──────────────┼──────────────┐
   │              │              │
┌──┴───┐   ┌─────┴─────┐   ┌───┴────┐
│ Dev  │   │    Git    │   │ Memory │
│ Env  │   │  History  │   │ Store  │
└──────┘   └───────────┘   └────────┘
```

Eden runs locally. AI tools connect via MCP and receive your full developer context — tech stack, active projects, recent work, accumulated preferences, and cross-session continuity.

When you finish a session in Claude Code and open Cursor the next day, Cursor knows what you were working on and where you left off.

## MCP tools

These tools are automatically available to any connected AI agent:

| Tool | What it does |
|------|-------------|
| `eden_get_user` | Returns your full developer profile: tech stack, active projects, recent sessions, coding patterns, preferences. Agents call this at conversation start. |
| `eden_remember` | Stores a categorized observation about you (preference, pattern, decision, skill, context). Builds your profile over time. |
| `eden_search_memory` | Searches Eden's memory by keyword and optional category. Finds past decisions, preferences, context. |
| `eden_log_session` | Records what was accomplished in a session — enables cross-tool continuity. Tracks unfinished work for follow-up. |
| `eden_get_project` | Returns everything Eden knows about a specific project: profile, related memories, session history, unfinished tasks. |
| `eden_weekly_report` | Generates a narrative weekly insight report — not just stats, but patterns, reflections, and behavioral trends. |

## CLI commands

| Command | Description |
|---------|-------------|
| `eden` | Interactive mode (runs init on first use) |
| `eden init` | Scan your environment and create your identity |
| `eden start` | Start the Eden daemon |
| `eden stop` | Stop the daemon |
| `eden status` | Check daemon status and connected tools |
| `eden connect` | Auto-connect to Claude Code, Cursor, Windsurf |
| `eden mcp` | Start MCP server directly (used by AI tools) |
| `eden journal` | View Eden's journal entries |
| `eden config` | Configure API key and model |

## Privacy

Eden is local-first by design.

- **All data stays on your machine** in `~/.eden/`
- **No cloud sync**, no telemetry, no external calls (except the AI tools you already use)
- **You control exclusions** — skip specific directories or projects
- The MCP server only responds to local tool connections
- Memory is plain JSON — fully inspectable and deletable

## Comparison

| | Eden | [Mem0](https://github.com/mem0ai/mem0) | [OneContext](https://onecontext.ai/) |
|---|---|---|---|
| **Runs locally** | Yes | Cloud-first | Cloud only |
| **MCP native** | Yes | No | No |
| **Auto-connects to tools** | Claude Code, Cursor, Windsurf | Manual integration | Manual integration |
| **Dev environment scanning** | Yes — projects, git, stack | No | No |
| **Cross-tool continuity** | Yes — sessions tracked across tools | Single-tool memory | Context retrieval |
| **Setup** | `npx eden-me` | API key + SDK setup | API key + SDK setup |
| **Privacy** | All local | Data on their servers | Data on their servers |

Eden is purpose-built for developers who use multiple AI coding tools and want persistent context without sending their data to another cloud service.

## Requirements

- Node.js >= 18

## License

MIT

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

Every AI conversation starts from zero. You re-explain your stack, your preferences, your project context — over and over, across every tool, every session.

**Eden fixes this.** Install once, and every AI tool you use knows you instantly.

Eden is an [MCP](https://modelcontextprotocol.io/) server that sleeps until your AI tools wake it up. Each time it wakes, it scans what changed, then serves your identity to Claude Code, Cursor, Windsurf — automatically.

## Install

```
npx eden-me
```

That's it. No config files. No API keys for the core experience.

## What happens

```
$ npx eden-me

  Scanning your environment...

  9 projects. TypeScript, React, Three.js.
  React · Next.js · Tailwind · Vite · Three.js

  ✓ Claude Code → connected
  ✓ Cursor → connected

  Eden is ready. It will sleep until your next AI session.

$ claude

  [Eden wakes up]
  3 hours since last session. 2 new commits in eden-cli.
  All projects clean — nothing uncommitted.
```

## How it works

Eden sleeps between sessions. No daemon, no background process, zero cost.

```
  ┌─────────────────────────────────┐
  │         Eden sleeps             │
  │   zero CPU · zero memory        │
  └───────────────┬─────────────────┘
                  │ agent calls eden_get_user
  ┌───────────────┴─────────────────┐
  │       Eden wakes up             │
  │  < 5 min → cache               │
  │  5m-1h  → quick git scan       │
  │  > 1h   → full project rescan  │
  └───────────────┬─────────────────┘
                  │ returns identity + changes
  ┌──────────┬────┴────┬────────────┐
  │ Claude   │ Cursor  │ Windsurf   │
  │ Code     │         │            │
  └──────────┴─────────┴────────────┘
                  │ session ends
                  → Eden sleeps again
```

## MCP tools

Available to any connected AI agent:

| Tool | Description |
|------|-------------|
| `eden_get_user` | Full developer profile + wake-up report (what changed since last session). Call at conversation start. |
| `eden_remember` | Store a categorized observation: preference, pattern, decision, skill, context. |
| `eden_search_memory` | Search memories by keyword and category. |
| `eden_get_project` | Everything Eden knows about a specific project. |
| `eden_weekly_report` | Narrative weekly insight report — patterns, reflections, not just stats. |

## CLI commands

| Command | Description |
|---------|-------------|
| `eden` | Start a conversation with Eden |
| `eden me` | View your AI identity dashboard |
| `eden me --web` | Open dashboard in browser |
| `eden memories` | Browse Eden's memories |
| `eden report` | Weekly coding insight report |
| `eden report -w 1` | Last week's report |
| `eden config` | Privacy & settings |
| `eden sync github` | Sync GitHub activity |
| `eden sync notion` | Sync Notion pages |
| `eden sync cloud` | Sync to web dashboard |

## Data sources

| Source | How | What Eden learns |
|--------|-----|-----------------|
| Local filesystem | Auto (on init) | Projects, languages, frameworks |
| Git | Auto (on wake-up) | Commits, branches, changes |
| GitHub | `eden sync github` | PRs, issues, starred repos |
| Notion | `eden sync notion` | Recent pages and notes |
| Any file | Drop into `~/.eden/external/` | Anything you want Eden to know |

## Privacy

Eden is local-first by design.

- **All data stays on your machine** in `~/.eden/`
- **No cloud, no telemetry, no tracking**
- **You control exclusions** via `eden config`
- Memory is plain JSON — fully inspectable and deletable
- `rm -rf ~/.eden` removes everything

## Website

[eden-me.vercel.app](https://eden-me.vercel.app)

## License

MIT

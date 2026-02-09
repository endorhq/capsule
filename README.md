# Logs

A session log viewer for AI coding agents. Upload conversation logs from Claude Code, Codex, Copilot, or Gemini and explore them in a unified timeline with a terminal-inspired dark UI.

![SvelteKit](https://img.shields.io/badge/SvelteKit-2-ff3e00?logo=svelte)
![Svelte](https://img.shields.io/badge/Svelte-5-ff3e00?logo=svelte)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06b6d4?logo=tailwindcss)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript)

## Features

- **Multi-agent support** — Parse logs from Claude Code, Codex, Copilot, and Gemini into a single unified timeline
- **Auto-detection** — Automatically identifies the agent format from uploaded files
- **Three-panel layout** — Session list, message timeline, and session metadata side-by-side
- **Tabbed sessions** — Open multiple sessions in tabs and switch between them
- **Timeline filtering** — Search and filter messages within a session
- **Tool call inspection** — Expandable tool call entries with arguments and results
- **Extended thinking** — View thinking/reasoning blocks attached to assistant messages
- **Token stats** — Input, output, cached, and reasoning token breakdowns
- **File tracking** — See which files were read or edited during a session
- **Gist sharing** — Import sessions from GitHub Gists or share your own
- **Drag-and-drop upload** — Drop `.jsonl` or `.json` files anywhere to load them
- **Offline storage** — Sessions are stored locally in OPFS, IndexedDB, or memory as a fallback
- **Dark terminal aesthetic** — Monospace fonts, teal accents, and a `#0a0a0a` background

## Supported Formats

| Agent | File Format | Status |
|-------|-------------|--------|
| Claude Code | `.jsonl` | Supported |
| Codex (OpenAI) | `.jsonl` | Supported |
| Copilot (GitHub) | `.jsonl` | Supported |
| Gemini (Google) | `.json` | Supported |
| OpenCode | directory | Not yet implemented |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [pnpm](https://pnpm.io/)

### Install

```sh
pnpm install
```

### Develop

```sh
pnpm dev
```

### Build

```sh
pnpm build
pnpm preview
```

### Type Check

```sh
pnpm check
```

## Where to Find Agent Logs

| Agent | Default Log Location |
|-------|---------------------|
| Claude Code | `~/.claude/projects/` — each project has `.jsonl` session files |
| Codex | `~/.codex/sessions/` |
| Copilot | VS Code output panel or `~/.vscode/extensions/github.copilot-*/` |
| Gemini | `~/.gemini/logs/` |

## Architecture

```
src/lib/
  parsers/       Format-specific parsers + auto-detection
  state/         Svelte 5 rune-based state (sessions, tabs)
  services/      Storage (OPFS/IndexedDB), Gist integration, Markdown rendering
  types/         ParsedSession, TimelineEntry, AgentFormat, Tab
  components/    UI components
    viewer/      Timeline, entries, filter bar, session panel
```

**Data flow:** Upload file -> detect format -> store in browser -> parse on select -> render timeline

## Tech Stack

- **SvelteKit 2** + **Svelte 5** (runes)
- **TypeScript** (strict)
- **Tailwind CSS v4**
- **Vite 7**
- **marked** + **DOMPurify** for Markdown rendering

## License

[Apache 2.0](LICENSE)

<div align="center">
  <h1>Capsule</h1>

<a href="https://endor.dev"><img alt="Made by Endor" src="https://img.shields.io/badge/Made%20by%20Endor-107e7a.svg?style=for-the-badge&labelColor=000"></a>
<a href="https://www.npmjs.com/package/@endorhq/capsule"><img alt="NPM version" src="https://img.shields.io/npm/v/%40endorhq%2Fcapsule?style=for-the-badge&color=2dd4bf&labelColor=000"></a>
<a href="https://github.com/endorhq/capsule/blob/main/LICENSE"><img alt="License" src="https://img.shields.io/badge/License-Apache%202.0-2dd4bf.svg?style=for-the-badge&labelColor=000"></a>

</div>

Capsule is an **interactive session viewer for AI coding agents**. It allows you to inspect previous session logs from Claude Code, Codex, Copilot, and Gemini into a unified timeline. Use it to **review what an agent did**, **check tool usage**, and **share sessions**.

![Capsule session viewer](https://github.com/user-attachments/assets/d0cb42ba-1ca6-4477-8355-6ddb7ef1cec8)

You can use it online, or locally using our CLI.

## Use Online

Open **[capsule.endor.dev](https://capsule.endor.dev)** and drag-and-drop a session file. Everything stays in your browser — no data is sent to any server.

## Install the CLI

```sh
npm install -g @endorhq/capsule@latest
```

The CLI gives you three commands: **share**, **export**, and **serve**.

### Share a session

Publish a session to a GitHub Gist and get a shareable viewer link on the **[capsule.endor.dev](https://capsule.endor.dev)** website:

```sh
capsule share
```

Capsule auto-discovers sessions from all supported agents on your machine. Pick one, choose what to anonymize, and get a link like `capsule.endor.dev?gist=abc123` you can send to your team.

You can also point it at a specific file:

```sh
capsule share path/to/session.jsonl
```

> Requires the [GitHub CLI](https://cli.github.com/) (`gh`) to be installed and authenticated.

### Export a session

Save an anonymized copy of a session to a local file:

```sh
capsule export
```

### Start a local viewer

Run the web viewer locally on your machine:

```sh
capsule serve
```

This starts a local server at `http://localhost:3000` where you can upload and browse sessions. Use `--port` to change the port.

## Why Capsule?

AI coding agents generate rich conversation logs, but **reviewing them is harder than it should be**:

- **Hard to find.** Session files are buried in dotfiles across `~/.claude/`, `~/.codex/`, `~/.gemini/`, and VS Code extension directories. Each agent stores them differently.
- **Hard to read.** Raw `.jsonl` files are walls of JSON. Thousands of lines with nested tool calls, token metadata, and base64 content mixed in. Not something you open in a text editor.
- **Not interactive.** There's no way to filter, search, or collapse sections. You're scrolling through everything to find the one tool call that went wrong.
- **Hard to share.** When something interesting (or broken) happens in a session, sharing it with your team means sending a raw file and hoping they can make sense of it.

Capsule solves this by giving you a single viewer that works with every major agent format. Upload a file or let the CLI find your sessions automatically. Browse the timeline, inspect tool calls, check token usage, and share a link when you need a second pair of eyes.

## Supported Formats

| Agent | File Format | Discovery Path |
|-------|-------------|----------------|
| Claude Code | `.jsonl` | `~/.claude/projects/` |
| Codex (OpenAI) | `.jsonl` | `~/.codex/sessions/` |
| Copilot (GitHub) | `.jsonl` | `~/.copilot/session-state/` |
| Gemini (Google) | `.json` | `~/.gemini/tmp/` |

Format is auto-detected from file content. The CLI discovers sessions from all agents automatically.

## Features

- **Unified timeline** — Messages, tool calls, and results in a single chronological view
- **Tool call inspection** — Expandable entries showing arguments and results
- **Extended thinking** — View reasoning/thinking blocks attached to assistant messages
- **Token breakdown** — Input, output, cached, and reasoning tokens per message and per session
- **File tracking** — See which files were read or edited during a session
- **Session metadata** — Agent, model, directory, branch, duration, and cost
- **Filtering** — Search and filter messages within a session
- **Tabbed sessions** — Open multiple sessions and switch between them
- **Gist import** — Open sessions directly from a GitHub Gist URL
- **Offline storage** — Sessions stored locally in OPFS, IndexedDB, or memory
- **Anonymization** — Selectively redact sensitive content before sharing or exporting
- **Auto-discovery** — CLI finds sessions from all agents on your machine

## Local Development

```sh
pnpm install
pnpm dev        # Start dev server at localhost:5173
pnpm build      # Build web app with adapter-node
```

## License

[Apache 2.0](LICENSE)

---

<div align="center">

**Built by the [Endor](https://endor.dev) team**

</div>

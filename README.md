<div align="center">
  <a href="https://endor.dev/">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://github.com/user-attachments/assets/d53e2e6d-2dac-4999-b1c9-63961035ffd9">
      <img alt="Endor logo" src="https://github.com/user-attachments/assets/fea0f426-7577-4935-a345-b00ef681b490" height="128">
    </picture>
  </a>
  <h1>Capsule</h1>

<a href="https://endor.dev"><img alt="Made by Endor" src="https://img.shields.io/badge/Made%20by%20Endor-107e7a.svg?style=for-the-badge&labelColor=000"></a>
<a href="https://www.npmjs.com/package/@endorhq/capsule"><img alt="NPM version" src="https://img.shields.io/npm/v/%40endorhq%2Fcapsule?style=for-the-badge&color=2dd4bf&labelColor=000"></a>
<a href="https://github.com/endorhq/capsule/blob/main/LICENSE"><img alt="License" src="https://img.shields.io/badge/License-Apache%202.0-2dd4bf.svg?style=for-the-badge&labelColor=000"></a>
<a href="https://discord.gg/ruMJaQqVKa"><img alt="Join our Discord" src="https://img.shields.io/discord/1404714845995139192?color=7289da&label=Discord&logo=discord&logoColor=white&style=for-the-badge&labelColor=000"></a>

</div>

AI coding agents don't make it easy to revisit past sessions, nor sharing them. Capsule is an **interactive inspector** that turns session logs into a **browsable and explorable timeline**. Check tool results inline, understand subagent purpose, filter by message, and understand what actually happened. When you need a second pair of eyes, share a session as a GitHub Gist.

Works with Claude Code, Codex, Copilot, and Gemini.

![Capsule session viewer](https://github.com/user-attachments/assets/d0cb42ba-1ca6-4477-8355-6ddb7ef1cec8)

Use it **[online](https://capsule.endor.dev)** to quickly inspect a session or open a shared one. Or install the **CLI** to browse your local sessions, anonymize sensitive data, and share them via the built-in GitHub Gist integration.

## Online

Open [capsule.endor.dev](https://capsule.endor.dev) and drag-and-drop a session file. Everything stays in your browser — no data is sent to any server.

You can point to a GitHub Gist to share it: [capsule.endor.dev?gist=8f31b208160d8e5ccca3a6b9cca0ed7a](https://capsule.endor.dev?gist=8f31b208160d8e5ccca3a6b9cca0ed7a)

## CLI

Use it directly with your preferred Node package manager:

```sh
npx @endorhq/capsule --help
# or pnpm
pnpm dlx @endorhq/capsule --help
```

The CLI gives you three commands: 

```plain
capsule — Share and view AI agent session logs

Usage:
  capsule share  [file]       Publish a session to GitHub Gist
  capsule export [file]       Save a session to a local file
  capsule serve  [--port N]   Start a local web viewer

Options:
  --help, -h                  Show this help message
```

### Start a local viewer

Run the web viewer locally on your machine:

```sh
npx @endorhq/capsule serve
# or pnpm
pnpm dlx @endorhq/capsule serve
```

This starts a local server at <http://localhost:3123>. Capsule auto-discovers sessions from all supported agents on your machine. You will be able to navigate through the different detected sessions for multiple AI agents. Use `--port` to change the port.

![Capsule local session picker](https://github.com/user-attachments/assets/7e35a3ad-18a2-4f6f-9f6c-4ae41d8ca131)

### Share a session

Publish a session to a GitHub Gist and get a shareable viewer link on the **[capsule.endor.dev](https://capsule.endor.dev)** website:

```sh
npx @endorhq/capsule share
# or pnpm
pnpm dlx @endorhq/capsule share
```

Capsule auto-discovers sessions from all supported agents on your machine. Pick one, choose what to anonymize, and get a link like `capsule.endor.dev?gist=abc123` you can send to your team.

[Share process with the CLI](https://github.com/user-attachments/assets/caaeada0-5421-433b-b1c9-3c61bc722933)

You can also point it at a specific file:

```sh
npx @endorhq/capsule share path/to/session.jsonl
# or pnpm
pnpm dlx @endorhq/capsule share path/to/session.jsonl
```

> Requires the [GitHub CLI](https://cli.github.com/) (`gh`) to be installed and authenticated.

### Export a session

Discover and export a copy of a session to a local file. You can anonymize the session using the different supported options.

```sh
npx @endorhq/capsule export
# or pnpm
pnpm dlx @endorhq/capsule export
```

## Why Capsule?

AI coding agents generate rich conversation logs, but **reviewing them is harder than it should be**:

- 🔍 **Auto-discovery.** Capsule finds sessions across `~/.claude/`, `~/.codex/`, `~/.gemini/`, and more — no matter where each agent stores them.
- 📄 **Readable timeline.** Thousands of lines of raw JSON become a clean, browsable conversation with tool calls and metadata organized inline.
- 🖱️ **Fully interactive.** Filter, search, and collapse sections. Jump straight to the tool call that matters.
- 🔗 **Easy sharing.** Share a session as a GitHub Gist and send your team a viewer link in seconds.

Capsule solves this by giving you a single viewer that works with every major agent format. Upload a file or let the CLI find your sessions automatically. Browse the timeline, inspect tool calls, check token usage, and share a link when you need a second pair of eyes.

## Supported Formats

| Agent | File Format | Discovery Path |
|-------|-------------|----------------|
| Claude Code | `.jsonl` | `~/.claude/projects/` |
| Codex (OpenAI) | `.jsonl` | `~/.codex/sessions/` |
| Copilot (GitHub) | `.jsonl` | `~/.copilot/session-state/` |
| Gemini (Google) | `.json` | `~/.gemini/tmp/` |

Format is auto-detected from file content. The CLI discovers sessions from all agents automatically.

## Local Development

```sh
pnpm install

# Website
pnpm -C packages/web dev        # Start dev server at localhost:5173
pnpm -C packages/web build        # Build the web

# CLI

# Build first the web and copy to work on serve command 
PUBLIC_DISTRIBUTION=local pnpm -C packages/web build        # Build the web
# Copy it
cp -r ./packages/web/build ./packages/cli/web

# Commands
pnpm -C packages/cli dev        # Run the CLI
pnpm -C packages/cli build        # Build the CLI
```

### Report Issues

Found a bug or have a feature request? Please [open an issue on GitHub](https://github.com/endorhq/capsule/issues). If the issue is realted to a session, we appreciate if you can share with us the session on the issue or privately on Discord.

### Join the Community

We'd love to hear from you! Whether you have questions, feedback, or want to share what you're building with Rover, there are multiple ways to connect.

- **Discord**: [Join our Discord spaceship](https://discord.gg/ruMJaQqVKa) for real-time discussions and help
- **Twitter/X**: Follow us [@EndorHQ](https://twitter.com/EndorHQ) for updates and announcements
- **Mastodon**: Find us at [@EndorHQ@mastodon.social](https://mastodon.social/@EndorHQ)
- **Bluesky**: Follow [@endorhq.bsky.social](https://bsky.app/profile/endorhq.bsky.social)

## License

Capsule is open source software licensed under the Apache 2.0 License.

---

<div align="center">

**Built with ❤️ by the Endor team**

_We build tools to make AI coding agents better_

</div>

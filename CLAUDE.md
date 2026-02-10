# CLAUDE.md

## Project Overview

**pnpm monorepo** with two packages and a root web app:

1. **Root (`.`)** — SvelteKit web app that visualizes conversation logs from AI coding agents (Claude Code, Codex, Copilot, Gemini). Parses different log formats into a unified timeline and renders them in a terminal-inspired dark UI.
2. **`@endorhq/capsule-shared`** (`packages/shared`) — Shared parsers and types consumed by both the web app and the CLI.
3. **`@endorhq/capsule`** (`packages/cli`) — CLI tool (`capsule`) for discovering local agent sessions, anonymizing sensitive data, and publishing them as GitHub Gists with a link to the web viewer at `https://capsule.endor.dev?gist=<ID>`.

## Tech Stack

- **SvelteKit 2** + **Svelte 5** (runes: `$state`, `$derived`, `$props`)
- **TypeScript** (strict mode)
- **Tailwind CSS v4** (new `@theme` syntax, `@tailwindcss/vite` plugin)
- **Vite 7**
- **pnpm** package manager (monorepo via `pnpm-workspace.yaml`)
- **tsup** (CLI bundling) + **tsx** (CLI dev)
- **@clack/prompts** + **picocolors** (CLI interactive UI)

## Commands

### Web App (root)

- `pnpm dev` — Start dev server
- `pnpm build` — Production build
- `pnpm check` — Type-check (svelte-kit sync + svelte-check)
- `pnpm preview` — Preview production build

### CLI (`packages/cli`)

- `pnpm -C packages/cli dev` — Run CLI interactively via tsx
- `pnpm -C packages/cli build` — Bundle CLI to `dist/index.js`

## Architecture

### Monorepo Layout

```
.                        — Root: SvelteKit web app
packages/
  shared/                — @endorhq/capsule-shared: parsers + types
    src/
      parsers/           — claude.ts, codex.ts, copilot.ts, gemini.ts, detect.ts, index.ts
      types/             — timeline.ts (ParsedSession, TimelineEntry, etc.)
  cli/                   — @endorhq/capsule: CLI binary
    src/
      index.ts           — Entry point + interactive flow (@clack/prompts)
      discovery.ts       — Find sessions on disk per agent
      anonymize.ts       — Format-aware anonymization transforms
      publish.ts         — Gist creation via gh CLI
```

### Web App Key Directories

```
src/lib/
  parsers/       — Thin re-exports from @endorhq/capsule-shared
  state/         — Svelte 5 rune-based state (sessions.svelte.ts)
  services/      — Browser storage abstraction (OPFS > IndexedDB > memory fallback)
  types/         — Thin re-export from @endorhq/capsule-shared
  components/    — UI components
    viewer/      — Session viewer (MessageThread, FilterBar, entry components, panel components)
```

### Web App Layout

Three-panel layout: sidebar (session list + upload) | center (message timeline + filter) | right (session metadata panel).

### Data Flow (Web App)

1. User uploads a `.jsonl`/`.json` file via UploadZone or drag-drop
2. `storage.svelte.ts` stores the file and detects the agent format
3. On session select, `sessions.svelte.ts` reads raw content, calls `parseSession()`
4. Parser returns a `ParsedSession` with a flat `TimelineEntry[]` timeline
5. `SessionViewer.svelte` renders the timeline with filtering, grouping tool calls into nested blocks

### CLI Flow (`capsule`)

1. Accepts optional file path argument, or discovers sessions from `~/.claude`, `~/.codex`, `~/.copilot`, `~/.gemini`
2. User selects agent and session interactively
3. User selects anonymization options (multiselect: remove tool outputs, mask paths, remove thinking, etc.)
4. Outputs to GitHub Gist (via `gh`), local file, or stdout

### Parser Pattern

Each parser (`packages/shared/src/parsers/<format>.ts`) follows the same shape:
- Receives raw file content as a string
- Returns `ParsedSession` (format, context, timeline, tokens, files)
- Tool calls are buffered by call ID and matched with their results
- Thinking/reasoning blocks are buffered and attached to the next assistant message

### Shared Package

`@endorhq/capsule-shared` exports raw `.ts` sources (no build step). Both SvelteKit (via Vite) and the CLI (via tsx/tsup) consume TypeScript directly. Exports:
- `@endorhq/capsule-shared/types/timeline` — All type definitions
- `@endorhq/capsule-shared/parsers` — `parseSession()` + `detectFormat()`
- `@endorhq/capsule-shared/parsers/*` — Individual parsers

Web app files in `src/lib/parsers/` and `src/lib/types/` are thin re-exports from the shared package.

### State Management

Singleton via `getSessionState()` in `sessions.svelte.ts`. Uses Svelte 5 runes (`$state` for mutable data, `$derived` for computed values). Parsed sessions are cached in a non-reactive `Map`.

## Code Conventions

- **Tabs** for indentation
- **Single quotes** in TypeScript, **double quotes** in Svelte markup attributes
- **Semicolons** required
- Component props: `interface Props {}` + `let { ... }: Props = $props()`
- Type imports: always use `import type { ... }`
- Component names: PascalCase (e.g., `SessionItem.svelte`)
- Functions: camelCase
- No ESLint/Prettier configs — uses defaults from SvelteKit scaffolding
- No tests configured

## Theme

Dark terminal aesthetic using custom CSS tokens in `layout.css`:
- Base surface: `#0a0a0a`
- Accent: `#2dd4bf` (teal)
- Font: JetBrains Mono / Fira Code / Cascadia Code / SF Mono
- Status colors: success (`#22c55e`), error (`#f87171`), pending (`#eab308`)

## Important Notes

- The `sessions/` directory contains sample log files and is gitignored
- The `design/` directory contains `session-formats-analysis.md` — a comprehensive reference for all 5 agent log formats
- OpenCode parser is not yet implemented (multi-file directory format)
- No testing framework is set up
- CLI discovers sessions from known agent log paths: `~/.claude/projects/`, `~/.codex/sessions/`, `~/.copilot/session-state/`, `~/.gemini/tmp/`

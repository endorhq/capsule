# CLAUDE.md

## Project Overview

Agent session log viewer — a SvelteKit web app that visualizes conversation logs from AI coding agents (Claude Code, Codex, Copilot, Gemini). It parses different log formats into a unified timeline and renders them in a terminal-inspired dark UI.

## Tech Stack

- **SvelteKit 2** + **Svelte 5** (runes: `$state`, `$derived`, `$props`)
- **TypeScript** (strict mode)
- **Tailwind CSS v4** (new `@theme` syntax, `@tailwindcss/vite` plugin)
- **Vite 7**
- **pnpm** package manager

## Commands

- `pnpm dev` — Start dev server
- `pnpm build` — Production build
- `pnpm check` — Type-check (svelte-kit sync + svelte-check)
- `pnpm preview` — Preview production build

## Architecture

### Layout

Three-panel layout: sidebar (session list + upload) | center (message timeline + filter) | right (session metadata panel).

### Key Directories

```
src/lib/
  parsers/       — Format-specific parsers (claude, codex, copilot, gemini) + auto-detection
  state/         — Svelte 5 rune-based state (sessions.svelte.ts)
  services/      — Browser storage abstraction (OPFS > IndexedDB > memory fallback)
  types/         — timeline.ts (ParsedSession, TimelineEntry, etc.)
  components/    — UI components
    viewer/      — Session viewer (MessageThread, FilterBar, entry components, panel components)
```

### Data Flow

1. User uploads a `.jsonl`/`.json` file via UploadZone or drag-drop
2. `storage.svelte.ts` stores the file and detects the agent format
3. On session select, `sessions.svelte.ts` reads raw content, calls `parseSession()`
4. Parser returns a `ParsedSession` with a flat `TimelineEntry[]` timeline
5. `SessionViewer.svelte` renders the timeline with filtering, grouping tool calls into nested blocks

### Parser Pattern

Each parser (`parsers/<format>.ts`) follows the same shape:
- Receives raw file content as a string
- Returns `ParsedSession` (format, context, timeline, tokens, files)
- Tool calls are buffered by call ID and matched with their results
- Thinking/reasoning blocks are buffered and attached to the next assistant message

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

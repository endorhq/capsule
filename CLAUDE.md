# CLAUDE.md

## Project Overview

**pnpm monorepo** with three workspace packages:

1. **`@endorhq/capsule-web`** (`packages/web`) — SvelteKit web app that visualizes conversation logs from AI coding agents (Claude Code, Codex, Copilot, Gemini). Parses different log formats into a unified timeline and renders them in a terminal-inspired dark UI. Builds with adapter-node (default, for CLI consumption) or adapter-cloudflare (for production deploy).
2. **`@endorhq/capsule-shared`** (`packages/shared`) — Shared parsers and types consumed by both the web app and the CLI.
3. **`@endorhq/capsule`** (`packages/cli`) — CLI tool (`capsule`) with three subcommands: `share` (publish to GitHub Gist), `export` (save to local file), and `serve` (start a local web viewer).

The root (`./`) is not a workspace package — it holds monorepo tooling only (biome, lefthook).

## Tech Stack

- **SvelteKit 2** + **Svelte 5** (runes: `$state`, `$derived`, `$props`)
- **TypeScript** (strict mode)
- **Tailwind CSS v4** (new `@theme` syntax, `@tailwindcss/vite` plugin)
- **Vite 7**
- **pnpm** package manager (monorepo via `pnpm-workspace.yaml`)
- **tsup** (CLI bundling) + **tsx** (CLI dev)
- **@clack/prompts** + **picocolors** (CLI interactive UI)
- **@sveltejs/adapter-node** (default build, for `capsule serve`)
- **@sveltejs/adapter-cloudflare** (opt-in via `ADAPTER=cloudflare`, for production)

## Commands

### Web App (`packages/web`)

- `pnpm dev` — Start dev server (proxied from root)
- `pnpm build` — Build with adapter-node + `PUBLIC_DISTRIBUTION=local` (proxied from root)
- `pnpm -C packages/web build:cloudflare` — Build with adapter-cloudflare for production
- `pnpm -C packages/web check` — Type-check (svelte-kit sync + svelte-check)
- `pnpm -C packages/web preview` — Preview production build

### CLI (`packages/cli`)

- `capsule share [file]` — Publish a session to GitHub Gist
- `capsule export [file]` — Save an anonymized session to a local file
- `capsule serve [--port N]` — Start a local web viewer (default port 3000)
- `capsule --help` — Print usage
- `pnpm -C packages/cli dev` — Run CLI via tsx (use `npx tsx src/index.ts <command>` for subcommands)
- `pnpm -C packages/cli build` — Bundle CLI to `dist/index.js`

### Root

- `pnpm dev` — Proxy to `pnpm -C packages/web dev`
- `pnpm build` — Proxy to `pnpm -C packages/web build`
- `pnpm lint` — Run biome lint
- `pnpm format` — Run biome format

## Architecture

### Monorepo Layout

```
.                          — Root: monorepo tooling only
wrangler.jsonc             — Cloudflare Workers config (at root for CF auto-detection)
packages/
  web/                     — @endorhq/capsule-web: SvelteKit app
    src/
      lib/
        features.ts        — Feature flag: isLocal / distribution
        components/        — UI components
          viewer/          — Session viewer (MessageThread, FilterBar, entries, panels)
        parsers/           — Thin re-exports from @endorhq/capsule-shared
        services/          — Browser storage (OPFS > IndexedDB > memory)
        state/             — Svelte 5 rune-based state
        types/             — Thin re-exports from @endorhq/capsule-shared
      routes/              — SvelteKit routes (+page.svelte, +layout.svelte, layout.css)
    svelte.config.js       — Conditional adapter (node default, cloudflare opt-in)
    vite.config.ts         — Tailwind + SvelteKit plugins
    .env                   — PUBLIC_DISTRIBUTION=public (default for dev)
  shared/                  — @endorhq/capsule-shared: parsers + types
    src/
      parsers/             — claude.ts, codex.ts, copilot.ts, gemini.ts, detect.ts, index.ts
      types/               — timeline.ts (ParsedSession, TimelineEntry, etc.)
  cli/                     — @endorhq/capsule: CLI binary
    src/
      index.ts             — Subcommand router (share, export, serve)
      commands/
        share.ts           — capsule share: gh auth → session → anonymize → gist
        export.ts          — capsule export: session → anonymize → save file
        serve.ts           — capsule serve: import handler → http server
      flows/
        session.ts         — Shared: file arg OR discovery → { content, format }
        anonymize-prompt.ts — Shared: multiselect with "Select all" + apply
      discovery.ts         — Find sessions on disk per agent
      anonymize.ts         — Format-aware anonymization transforms
      publish.ts           — Gist creation + file save via gh CLI
```

### Web App Layout

Three-panel layout: sidebar (session list + upload) | center (message timeline + filter) | right (session metadata panel).

### Data Flow (Web App)

1. User uploads a `.jsonl`/`.json` file via UploadZone or drag-drop
2. `storage.svelte.ts` stores the file and detects the agent format
3. On session select, `sessions.svelte.ts` reads raw content, calls `parseSession()`
4. Parser returns a `ParsedSession` with a flat `TimelineEntry[]` timeline
5. `SessionViewer.svelte` renders the timeline with filtering, grouping tool calls into nested blocks

### CLI Subcommands

**`capsule share [file]`** — Check `gh` auth first (fail early), resolve session (file arg or interactive discovery), prompt anonymization, prompt gist visibility, publish gist, print viewer URL.

**`capsule export [file]`** — Resolve session, prompt anonymization, prompt output path, save to disk.

**`capsule serve [--port N]`** — Dynamically imports the pre-built adapter-node handler from `@endorhq/capsule-web/handler`, starts an HTTP server on localhost. The web package must be built first (`pnpm build`).

### Feature Flag Mechanism

`packages/web/src/lib/features.ts` exposes `isLocal` and `distribution` based on the compile-time `PUBLIC_DISTRIBUTION` env var:

- **Node build** (`pnpm build`): `PUBLIC_DISTRIBUTION=local` is baked in → `isLocal === true`
- **Cloudflare build** (`pnpm -C packages/web build:cloudflare`): reads `.env` default `public` → `isLocal === false`
- **Dev server** (`pnpm dev`): reads `.env` default `public` → `isLocal === false`

Components gate local-only features with:

```svelte
<script>
  import { isLocal } from '$lib/features';
</script>
{#if isLocal}
  <!-- local-only UI -->
{/if}
```

### Adapter Selection

`packages/web/svelte.config.js` uses a conditional dynamic import:

- Default: `@sveltejs/adapter-node` (produces `build/handler.js`, `build/client/`, `build/server/`)
- `ADAPTER=cloudflare`: `@sveltejs/adapter-cloudflare` (produces `.svelte-kit/cloudflare/`)

### Build & Dependency Flow

```
@endorhq/capsule-shared (no build step, raw TS)
       ↓                          ↓
@endorhq/capsule-web        @endorhq/capsule (CLI)
  (vite build → build/)          ↓
       ↓                    depends on web
  adapter-node output       imports handler at runtime
  (handler.js, client/, server/)
```

The CLI declares `@endorhq/capsule-web` as a dependency but marks it as `external` in `tsup.config.ts` — the handler is dynamically imported at runtime, not bundled.

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

Web app files in `packages/web/src/lib/parsers/` and `packages/web/src/lib/types/` are thin re-exports from the shared package.

### State Management

Singleton via `getSessionState()` in `sessions.svelte.ts`. Uses Svelte 5 runes (`$state` for mutable data, `$derived` for computed values). Parsed sessions are cached in a non-reactive `Map`.

## Deployment

### Cloudflare Workers

`wrangler.jsonc` lives at the repo root (Cloudflare auto-detects it there). It contains:
- `build.command`: `ADAPTER=cloudflare pnpm -C packages/web build:cloudflare`
- `main`: `packages/web/.svelte-kit/cloudflare/_worker.js`
- `assets.directory`: `packages/web/.svelte-kit/cloudflare`
- `vars.PUBLIC_DISTRIBUTION`: `public`

Deploy with `wrangler deploy` from the repo root, or via Cloudflare's Git integration.

### Local Development

1. `pnpm dev` — starts vite dev server at localhost:5173
2. `pnpm build` — builds web with adapter-node (PUBLIC_DISTRIBUTION=local)
3. `capsule serve` — serves the built web app at localhost:3000 with `isLocal === true`

## Code Conventions

- **Tabs** for indentation
- **Single quotes** in TypeScript, **double quotes** in Svelte markup attributes
- **Semicolons** required
- Component props: `interface Props {}` + `let { ... }: Props = $props()`
- Type imports: always use `import type { ... }`
- Component names: PascalCase (e.g., `SessionItem.svelte`)
- Functions: camelCase
- **Biome** for linting and formatting (no ESLint/Prettier)
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
- CLI anonymization includes a "Select all" option prepended to the multiselect
- The web package must be built before `capsule serve` can work (it imports `@endorhq/capsule-web/handler` at runtime)

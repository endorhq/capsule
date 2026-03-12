# E2E Tests — @endorhq/capsule-web

The web app is a SvelteKit single-page application that lets users upload, parse, and visualize AI agent session logs. Tests exercise the full browser workflow: upload a file → parse → render timeline → interact with filters.

Web E2E tests can use either Playwright (full browser) or vitest with @testing-library/svelte for component-level E2E. The choice depends on what the team prefers for this project.

---

## Suite: Upload & Parse

Preconditions: Dev server or preview server running. Test page loaded.

### Features

- Upload Claude JSONL file and render timeline
  <!-- category: core -->
  Upload `claude-simple.jsonl`. Verify: session appears in sidebar, timeline renders with user and assistant messages, format shows "Claude".

- Upload Codex JSONL file and render timeline
  <!-- category: core -->
  Upload `codex-simple.jsonl`. Verify: session appears in sidebar, timeline renders correctly, format shows "Codex".

- Upload Copilot JSONL file and render timeline
  <!-- category: core -->
  Upload `copilot-simple.jsonl`. Verify similar to above with "Copilot".

- Upload Gemini JSON file and render timeline
  <!-- category: core -->
  Upload `gemini-simple.json`. Verify similar to above with "Gemini".

- Format auto-detection identifies correct agent
  <!-- category: core -->
  Upload each fixture without specifying format. Verify `detectFormat()` assigns the correct `AgentFormat` for each file.

- Upload file with tool calls renders nested tool blocks
  <!-- category: core -->
  Upload `claude-with-tools.jsonl`. Verify tool call entries appear in the timeline with name, arguments, and matched results.

- Upload file with thinking blocks renders thinking sections
  <!-- category: core -->
  Upload `claude-with-thinking.jsonl`. Verify thinking blocks appear attached to assistant messages.

- Upload invalid file shows error
  <!-- category: error -->
  Upload a file with random text content. Verify an error message is displayed and no session is added to the sidebar.

- Upload very large file does not hang
  <!-- category: edge -->
  Upload a fixture with 1000+ lines. Verify parsing completes within a reasonable time and the timeline renders.

---

## Suite: Gist Loading

Preconditions: Mock fetch or MSW intercepting GitHub Gist API requests.

### Features

- Load session from gist ID via URL parameter
  <!-- category: core -->
  Navigate to `/?gist=<mock-id>`. Verify the gist content is fetched, parsed, and displayed in the timeline.

- Gist loading shows error for invalid gist ID
  <!-- category: error -->
  Navigate to `/?gist=nonexistent`. Verify an error message is displayed.

- Gist loading with real GitHub API
  <!-- category: core -->
  <!-- skip: requires-real-gist -->
  Load a known public gist. Verify content renders correctly.

---

## Suite: Storage

Preconditions: Storage initialized (OPFS, IndexedDB, or memory fallback).

### Features

- Uploaded session persists across page reloads
  <!-- category: core -->
  Upload a session, reload the page, verify the session still appears in the sidebar and can be selected.

- Multiple sessions can be stored and switched between
  <!-- category: core -->
  Upload two different sessions. Click each in the sidebar. Verify the timeline updates to show the selected session's content.

- Clear all sessions removes everything
  <!-- category: side-effect -->
  Upload sessions, clear all, verify sidebar is empty and storage is cleaned up.

- Storage fallback works when OPFS is unavailable
  <!-- category: edge -->
  Disable OPFS (e.g., in a worker-less context). Verify storage falls back to IndexedDB or memory and sessions still work.

- Re-uploading same file does not create duplicates
  <!-- category: idempotency -->
  Upload the same file twice. Verify only one session entry appears (or two entries if that's the intended behavior — adjust based on actual implementation).

---

## Suite: Session Viewer

Preconditions: A session is uploaded and selected.

### Features

- Filter bar filters timeline entries by type
  <!-- category: core -->
  Upload a session with mixed entry types. Use the filter bar to hide tool calls. Verify tool call entries are not visible in the timeline.

- Session metadata panel shows format, duration, and token counts
  <!-- category: core -->
  Select a parsed session. Verify the metadata panel displays: agent format, session duration, total tokens, and cost (if available).

- Subagent entries render nested timelines
  <!-- category: edge -->
  Upload a Claude session with subagent (sidechain) entries. Verify the subagent timeline renders as a nested block within the main timeline.

- Empty session shows appropriate empty state
  <!-- category: error -->
  Upload a file that parses to zero timeline entries. Verify a meaningful empty-state message is shown instead of a blank screen.

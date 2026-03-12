# E2E Tests — @endorhq/capsule (CLI)

The CLI has three subcommands (`share`, `export`, `serve`), a format-aware
anonymization engine, and session discovery across four agent log directories.
Tests shell out to the built CLI binary or import command functions directly.

## Fixtures

Tests use sample log files in `packages/shared/tests/fixtures/`:
- `claude-simple.jsonl` — minimal Claude session (3 turns)
- `codex-simple.jsonl` — minimal Codex session (3 turns)
- `copilot-simple.jsonl` — minimal Copilot session (3 turns)
- `gemini-simple.json` — minimal Gemini session (3 turns)
- `claude-with-tools.jsonl` — Claude session with tool calls and results
- `claude-with-thinking.jsonl` — Claude session with thinking blocks
- `codex-with-reasoning.jsonl` — Codex session with reasoning items

---

## Suite: Export

Preconditions: Built CLI binary available or commands importable via tsx.
Temp output directory created.

### Features

- Export writes anonymized session to specified path
  <!-- category: core -->
  Run `capsule export <fixture>` with all anonymization options disabled,
  verify the output file is written and contains valid content matching the
  original format.

- Export with all anonymization options produces sanitized output
  <!-- category: core -->
  Run export with all 7 anonymization options enabled on a Claude fixture.
  Verify: no tool outputs, no file contents, no thinking blocks, no system
  messages, no token usage, file paths are masked, git info is masked.

- Export preserves JSON/JSONL format integrity
  <!-- category: core -->
  Export each fixture format. Verify JSONL outputs have one valid JSON object
  per line; Gemini JSON output is valid JSON.

- Export of empty or minimal session
  <!-- category: edge -->
  Export a fixture with only a single user message. Verify it produces a valid
  output file (not empty, not corrupted).

- Export to non-existent directory fails gracefully
  <!-- category: error -->
  Attempt export to `/nonexistent/path/output.jsonl`. Verify it exits with a
  non-zero code and prints an error message.

- Export idempotency
  <!-- category: idempotency -->
  Run the same export twice to different output paths. Verify both outputs are
  byte-identical.

---

## Suite: Share

Preconditions: Mock `gh` CLI script in `$PATH` that simulates auth success and
gist creation. Temp directory for mock script.

### Features

- Share publishes session and returns viewer URL
  <!-- category: core -->
  <!-- skip: requires-real-gist -->
  Run `capsule share <fixture>` with mocked `gh`. Verify it calls
  `gh gist create`, captures the gist ID, and prints a viewer URL matching
  `https://capsule.endor.dev?gist=<id>`.

- Share checks gh auth before proceeding
  <!-- category: core -->
  Mock `gh auth status` to exit with code 1. Run `capsule share <fixture>`.
  Verify it exits early with an auth error message before prompting anything.

- Share fails when gh is not installed
  <!-- category: error -->
  Remove `gh` from `$PATH`. Run `capsule share <fixture>`. Verify it prints
  an error about missing `gh` CLI.

- Share with anonymization applies transforms before publishing
  <!-- category: core -->
  <!-- skip: requires-gh-auth -->
  Run share with path masking enabled. Capture the temp file written for gist
  creation. Verify file paths are masked in the content.

---

## Suite: Serve

Preconditions: Web package is built (`pnpm build`). Port 0 for random
assignment.

### Features

- Serve starts HTTP server on default port
  <!-- category: core -->
  Start `capsule serve` and verify it binds to port 3123 and responds with
  200 to `GET /`.

- Serve accepts custom port via --port flag
  <!-- category: core -->
  Start `capsule serve --port 0`, capture the assigned port from stdout,
  and verify an HTTP request to that port returns 200.

- Serve handles graceful shutdown on SIGINT
  <!-- category: core -->
  Start serve, send SIGINT, verify the process exits cleanly (code 0) and
  the port is released.

- Serve fails with clear error if web package is not built
  <!-- category: error -->
  Remove or rename the web build output. Run `capsule serve`. Verify it
  prints an error about missing handler.

- Serve responds with static assets
  <!-- category: core -->
  Start serve and request a known static asset path (e.g., CSS or JS file).
  Verify it returns 200 with appropriate content-type.

---

## Suite: Anonymization

Preconditions: Sample fixtures loaded for each format.

### Features

- Claude: mask file paths replaces real paths with generic ones
  <!-- category: core -->
  Anonymize a Claude fixture with "mask file paths" enabled. Verify all
  original paths in tool_use arguments and text blocks are replaced with
  `/project/src/file{N}{ext}` patterns.

- Claude: remove thinking blocks strips thinking content
  <!-- category: core -->
  Anonymize a Claude fixture with thinking blocks. Verify the output
  contains no thinking-type content blocks.

- Claude: remove tool outputs strips tool_result content
  <!-- category: core -->
  Anonymize a Claude fixture with tool calls. Verify all tool_result
  entries have their content removed or replaced with a placeholder.

- Codex: remove reasoning items filters reasoning entries
  <!-- category: core -->
  Anonymize a Codex fixture with reasoning. Verify no reasoning-type
  items remain in the output.

- Copilot: mask session context sanitizes cwd, branch, repository
  <!-- category: core -->
  Anonymize a Copilot fixture. Verify the session context fields (cwd,
  gitBranch, repository) are masked.

- Gemini: anonymization produces valid JSON
  <!-- category: core -->
  Anonymize a Gemini fixture with all options. Verify the output is
  valid, pretty-printed JSON with the expected structure.

- Path masker produces consistent mappings
  <!-- category: edge -->
  Anonymize a fixture where the same path appears multiple times. Verify
  every occurrence maps to the same masked path.

- Git masker handles branch names and repo URLs
  <!-- category: edge -->
  Anonymize a fixture containing git branch names and repository URLs.
  Verify branches become `branch-{N}` and repo URLs become generic.

---

## Suite: Discovery

Preconditions: Temp directory simulating `$HOME` with mock agent log
directories.

### Features

- Discovers Claude sessions from ~/.claude/projects/
  <!-- category: core -->
  Create a temp dir with `<home>/.claude/projects/<project>/session.jsonl`
  containing valid Claude log lines. Run discovery. Verify it finds the
  session with correct metadata (title, date, cwd).

- Discovers Codex sessions from ~/.codex/sessions/
  <!-- category: core -->
  Create a temp dir with valid Codex session structure. Run discovery.
  Verify session is found with metadata extracted from `session_meta`.

- Discovers Copilot sessions from ~/.copilot/session-state/
  <!-- category: core -->
  Create a temp dir with valid Copilot `events.jsonl`. Run discovery.
  Verify session is found with sessionId from `session.start` event.

- Discovers Gemini sessions from ~/.gemini/tmp/
  <!-- category: core -->
  Create a temp dir with valid `session-*.json` file. Run discovery.
  Verify session is found with metadata from JSON content.

- Discovery returns empty list for missing directories
  <!-- category: edge -->
  Point discovery at a temp `$HOME` with no agent directories. Verify
  it returns empty arrays without errors.

- Discovery skips malformed session files
  <!-- category: error -->
  Create agent directories with corrupted/empty files. Verify discovery
  skips them gracefully and returns only valid sessions.

- Discovery sorts sessions by date descending
  <!-- category: side-effect -->
  Create multiple sessions with different dates. Verify the returned
  list is ordered newest-first.

# CLI End to end testing (e2e testing)

This end to end testing description focuses on the `capsule` CLI.

Tests use **Vitest** and run the compiled CLI binary via `execa`. They
use temporary directories, mock tools, and fixture session files. No
network access or real `gh` CLI authentication is required — external
tools are mocked with wrapper scripts in a temporary `PATH`.

## Suite

- [Help and Usage](#help-and-usage)
- [Serve](#serve)
- [Export](#export)
- [Share](#share)

---

## Help and Usage

The `capsule` CLI prints usage information when invoked with `--help`,
`-h`, or no arguments. It also rejects unknown commands.

### Preconditions

The CLI binary has been built (`pnpm -C packages/cli build`).

### Features

#### Default help output

<!-- category: core -->

- Prints usage text including `share`, `export`, and `serve` subcommands when run with no arguments
- Exits with code 0

#### --help flag

<!-- category: core -->

- Prints the same usage text when run with `--help`
- Exits with code 0

#### -h short flag

<!-- category: core -->

- Prints the same usage text when run with `-h`
- Exits with code 0

#### Unknown command

<!-- category: error -->

- Prints an error message containing the unknown command name when run with an unrecognized subcommand
- Prints the usage text after the error
- Exits with a non-zero exit code

### Postconditions

Help output must list all three subcommands (`share`, `export`,
`serve`). No files or state must be created by help commands.

---

## Serve

The `capsule serve` command starts a local HTTP server that serves the
pre-built web app. It requires the web package to be built first.

### Preconditions

The web package has been built with `pnpm build` (adapter-node). The
CLI binary has been built.

### Features

#### Default port

<!-- category: core -->

- Starts an HTTP server on port 3123 by default
- Responds to HTTP requests on `http://127.0.0.1:3123`
- Serves the web app's HTML page at the root URL
- Exits cleanly when receiving SIGTERM

#### Custom port

<!-- category: core -->

- Accepts `--port <number>` to override the default port
- Starts the server on the specified port
- Responds to requests on the custom port

#### Port validation

<!-- category: edge -->

- Ignores invalid port values (non-numeric, out of range) and falls back to the default port

### Postconditions

While running, the server must respond to HTTP GET requests at the
root URL with an HTML response. After termination, the port must be
released.

---

## Export

The `capsule export` command reads a session log file, optionally
anonymizes it, and saves the result to a local file.

### Preconditions

The CLI binary has been built. A valid session log fixture file is
available.

### Features

#### Export with file argument

<!-- category: core -->

- Accepts a session log file path as an argument
- Detects the session format from the file content
- Writes the output file to disk
- The output file contains valid JSON or JSONL matching the input format

#### Format detection

<!-- category: core -->

- Detects Claude Code format from `.jsonl` files with `sessionId` and `type` fields
- Detects Codex format from `.jsonl` files with `session_meta` entries containing `codex` originator
- Detects Copilot format from `.jsonl` files with `session.start` events
- Detects Gemini format from `.json` files with `messages` array and `projectHash` field

#### Output file extension

<!-- category: core -->

- Uses `.json` extension for Gemini format sessions
- Uses `.jsonl` extension for all other formats

### Postconditions

After export, the output file must exist on disk and contain the
session content. The original input file must not be modified.

---

## Share

The `capsule share` command publishes a session log to a GitHub Gist
via the `gh` CLI. It requires `gh` authentication.

### Preconditions

The CLI binary has been built. A valid session log fixture file is
available. The `gh` CLI is mocked (not a real `gh` install).

### Features

#### Authentication check

<!-- category: core -->

- Checks `gh` authentication status before proceeding
- Fails with an error message when `gh auth status` returns a non-zero exit code
- Exits with a non-zero exit code when authentication fails

#### Gist creation with mock gh

<!-- category: core -->

- Calls `gh gist create` with the session content when authentication succeeds
- Passes the session file to `gh gist create`
- Reports the Gist URL on success
- Reports the viewer URL on success

#### Authentication failure

<!-- category: error -->

- Displays an error indicating `gh` authentication is required when `gh` is not authenticated
- Does not attempt to create a Gist when authentication fails

### Postconditions

On success, the mock `gh` CLI must have been invoked with `gist create`
and the correct arguments. On authentication failure, no Gist creation
must have been attempted.

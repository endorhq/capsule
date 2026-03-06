# Web App End to end testing (e2e testing)

This end to end testing description focuses on the `@endorhq/capsule-web`
SvelteKit web app.

Tests use **Playwright** to drive a real browser against the built web
app. The app must be built with `pnpm build` (adapter-node,
`PUBLIC_DISTRIBUTION=local`) before tests run, and served on a local
port during the test suite.

## Suite

- [Session Upload](#session-upload)
- [Sample Loading](#sample-loading)
- [Session Viewing](#session-viewing)
- [Message Filtering](#message-filtering)
- [Session Panel](#session-panel)
- [Tab Management](#tab-management)
- [Session Deletion](#session-deletion)
- [Gist Loading](#gist-loading)

---

## Session Upload

The web app allows users to upload session log files via a file picker
or drag-and-drop. Uploaded files are stored in browser storage, parsed,
and displayed in the session list and timeline viewer.

### Preconditions

The app is running and no sessions have been previously uploaded.

### Features

#### File picker upload

<!-- category: core -->

- Opens a file picker when the "browse files" button is clicked
- Accepts `.jsonl` files and stores the session
- Accepts `.json` files and stores the session
- Adds the uploaded session to the sidebar session list
- Opens the uploaded session in a new tab automatically
- Parses the session and displays the timeline in the message thread

#### Drag-and-drop upload

<!-- category: core -->

- Accepts a `.jsonl` file dropped onto the upload zone
- Accepts a `.json` file dropped onto the upload zone
- Ignores files with unsupported extensions (e.g., `.txt`, `.csv`)
- Shows a visual drag-over indicator when a file is dragged over the upload zone

#### Multiple session uploads

<!-- category: core -->

- Allows uploading multiple sessions sequentially
- Displays all uploaded sessions in the sidebar list
- Each uploaded session opens in its own tab

### Postconditions

After upload, the session must appear in the sidebar list, its tab must
be active, and the timeline must render with the correct number of
entries from the parsed file.

---

## Sample Loading

The app provides built-in sample session files so users can try the
viewer without uploading their own data.

### Preconditions

The app is running and no sessions have been previously loaded.

### Features

#### Load Claude Code sample

<!-- category: core -->

- Loads the Claude Code sample when the "Claude Code" button is clicked
- Adds the sample session to the sidebar list
- Opens the session in a tab and displays its timeline
- The session format is detected as `claude`

#### Load Codex sample

<!-- category: core -->

- Loads the Codex sample when the "Codex" button is clicked
- Adds the sample session to the sidebar list
- Opens the session in a tab and displays its timeline
- The session format is detected as `codex`

### Postconditions

After loading a sample, the session must be present in the sidebar and
the timeline must contain parsed entries with the correct agent format.

---

## Session Viewing

Once a session is loaded, it is parsed and rendered as a timeline of
messages, tool calls, and subagent blocks.

### Preconditions

At least one session has been uploaded or loaded.

### Features

#### Timeline rendering

<!-- category: core -->

- Displays user messages with the user label
- Displays assistant messages with the assistant label
- Displays tool call entries with the tool name
- Shows tool call results when expanded
- Shows thinking/reasoning blocks on assistant messages when present

#### Subagent visualization

<!-- category: core -->

- Displays subagent entries in the main timeline
- Opens a subagent panel below the main timeline when a subagent entry is clicked
- Shows the subagent's nested timeline in the panel
- Shows the subagent description or type in the panel divider bar
- Closes the subagent panel when the "[close]" button is clicked

#### System messages

<!-- category: core -->

- Displays system messages in the timeline when present

### Postconditions

The timeline must accurately reflect all entries from the parsed
session. Subagent panels must open and close without affecting the
main timeline state.

---

## Message Filtering

The filter bar allows users to search across all timeline entries to
narrow down the visible messages.

### Preconditions

A session with multiple entry types (user, assistant, tool call) is
loaded and visible.

### Features

#### Text filter

<!-- category: core -->

- Filters user messages by content when text is entered in the filter bar
- Filters assistant messages by content
- Filters tool call entries by tool name
- Filters tool call entries by result content
- Filters subagent entries by description
- Shows all entries when the filter is cleared
- The filter is case-insensitive

#### Empty results

<!-- category: edge -->

- Shows an empty timeline when no entries match the filter

### Postconditions

The timeline must show only entries matching the filter text. Clearing
the filter must restore the full timeline.

---

## Session Panel

The right-side panel shows metadata about the active session including
context, token usage, and file lists.

### Preconditions

A session is loaded and its tab is active.

### Features

#### Session info display

<!-- category: core -->

- Displays the session file name in the panel header
- Displays the step count (number of timeline entries)
- Shows the agent name and version when available
- Shows the model name when available
- Shows the working directory when available
- Shows the git branch when available

#### Token statistics

<!-- category: core -->

- Displays the total token usage when available
- Shows input, output, and cached token breakdowns when available

#### File list

<!-- category: core -->

- Lists files that were read during the session
- Lists files that were edited during the session
- Distinguishes between read and edited operations

### Postconditions

The panel must accurately reflect the metadata from the parsed session.

---

## Tab Management

The app supports opening multiple sessions in tabs for side-by-side
comparison.

### Preconditions

At least one session is loaded.

### Features

#### Tab creation

<!-- category: core -->

- Opens a new empty tab when the "+" button is clicked
- Opens a new tab with a session when a session is selected from the sidebar
- Displays the session name as the tab label

#### Tab switching

<!-- category: core -->

- Switches the displayed session when a different tab is clicked
- Shows the upload zone when an empty tab is active
- Highlights the active tab visually

#### Tab closing

<!-- category: core -->

- Closes a tab when its close button is clicked
- Activates the nearest remaining tab after closing
- Does not remove the session from the sidebar when its tab is closed

#### Duplicate prevention

<!-- category: edge -->

- Focuses the existing tab when selecting a session that is already open in a tab
- Does not create a duplicate tab for the same session

### Postconditions

Tabs must correctly track which session they display. Closing all tabs
for a session must not remove the session from the sidebar or storage.

---

## Session Deletion

Users can delete sessions from the sidebar or from the session panel.

### Preconditions

At least one session is loaded.

### Features

#### Delete from session panel

<!-- category: core -->

- Shows a confirmation dialog when the delete button is clicked in the session panel
- Removes the session from the sidebar list after confirmation
- Closes all tabs displaying the deleted session
- Does not delete the session when the confirmation is cancelled

#### Session list cleanup

<!-- category: core -->

- Removes the session from browser storage after deletion
- Updates the session count in the sidebar

### Postconditions

After deletion, the session must not appear in the sidebar, its tabs
must be closed, and it must be removed from browser storage.

---

## Gist Loading

Users can load session logs from GitHub Gists by entering a Gist URL
or ID.

### Preconditions

The app is running in public mode (not local-only).

### Features

#### Load from Gist URL

<!-- category: core -->

- Accepts a full `gist.github.com` URL in the Gist input field
- Fetches the Gist content and loads the session
- Adds the loaded session to the sidebar
- Opens the session in a tab

#### Load from Gist ID

<!-- category: core -->

- Accepts a bare Gist ID in the input field
- Fetches and loads the session the same as with a full URL

#### Error handling

<!-- category: error -->

- Displays an error message when the Gist URL is invalid
- Displays an error message when the Gist cannot be fetched (network error, 404)
- Does not create a session entry when loading fails

#### Loading state

<!-- category: core -->

- Shows a loading spinner on the "load gist" button while fetching
- Disables the input and button while loading

### Postconditions

After a successful Gist load, the session must be present in the
sidebar with its timeline rendered. After a failed load, no session
must be added and the error must be visible to the user.

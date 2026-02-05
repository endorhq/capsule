# Agent Session Log Formats Analysis

This document provides a comprehensive analysis of 5 different AI coding agent session
log formats. The goal is to identify common patterns and individual behaviors to inform
the design of a generic session visualizer.

## Table of Contents

- [Formats Overview](#formats-overview)
- [1. Claude Code](#1-claude-code)
- [2. Codex (OpenAI)](#2-codex-openai)
- [3. Copilot (GitHub)](#3-copilot-github)
- [4. Gemini CLI (Google)](#4-gemini-cli-google)
- [5. OpenCode](#5-opencode)
- [Cross-Format Comparison](#cross-format-comparison)
  - [Common Conversation Model](#common-conversation-model)
  - [Message Identity and Linking](#message-identity-and-linking)
  - [Tool Call Correlation](#tool-call-correlation)
  - [Extended Thinking and Reasoning](#extended-thinking-and-reasoning)
  - [Token and Cost Tracking](#token-and-cost-tracking)
  - [Session Metadata](#session-metadata)
- [Individual Behaviors](#individual-behaviors-unique-per-format)
- [Suggested Common Abstraction Layer](#suggested-common-abstraction-layer)

---

## Formats Overview

| Format | File Type | Structure | Source File(s) |
|---|---|---|---|
| Claude Code | `.jsonl` | One JSON object per line | `claude-session.jsonl` |
| Codex (OpenAI) | `.jsonl` | One JSON object per line | `codex-session.jsonl` |
| Copilot (GitHub) | `.jsonl` | One JSON object per line | `copilot-session.jsonl` |
| Gemini CLI | `.json` | Single root JSON object with `messages` array | `gemini-session.json` |
| OpenCode | `.json` (multiple) | File-based hierarchy: session, messages, parts | `opencode/` directory |

---

## 1. Claude Code

### File Format

JSONL (JSON Lines). Each line is a self-contained JSON object representing a single
event in the session.

### Top-Level Entry Types

| Type | Purpose |
|---|---|
| `user` | Messages from the human user |
| `assistant` | Messages from Claude (the agent) |
| `progress` | Intermediate progress events during tool execution |
| `system` | System-level metadata (e.g. turn duration) |
| `file-history-snapshot` | File state snapshots for undo/restore |

### Root-Level Fields (Present on Most Entries)

| Field | Type | Description |
|---|---|---|
| `type` | string | Entry type: `"user"`, `"assistant"`, `"progress"`, `"system"`, `"file-history-snapshot"` |
| `uuid` | string | Unique identifier for this entry |
| `parentUuid` | string or null | UUID of the parent entry (builds a conversation tree) |
| `timestamp` | string (ISO 8601) | When the entry was created |
| `sessionId` | string (UUID) | Session identifier |
| `version` | string | Claude Code version (e.g. `"2.1.31"`) |
| `cwd` | string | Current working directory |
| `gitBranch` | string | Active git branch |
| `slug` | string | Session slug identifier |
| `isSidechain` | boolean | Whether this is part of a sidechain (subagent) execution |
| `userType` | string | `"external"` for user-initiated messages |
| `message` | object | The actual message content (structure varies by type) |
| `requestId` | string | API request identifier |
| `toolUseID` | string | References a specific tool invocation |
| `parentToolUseID` | string | References parent tool use |
| `sourceToolAssistantUUID` | string | UUID of assistant that made the tool call |
| `toolUseResult` | object | Structured result of tool execution |
| `data` | object | For progress messages, contains progress data |
| `subtype` | string or null | Sub-classification (e.g. `"turn_duration"`) |
| `durationMs` | number | Duration in milliseconds (system type) |
| `snapshot` | object | File history snapshot information |
| `messageId` | string | Message identifier |
| `isSnapshotUpdate` | boolean | Whether snapshot is incremental |
| `isMeta` | boolean | Whether message is metadata |
| `todos` | array | Associated task items |
| `thinkingMetadata` | object | Configuration for extended thinking |
| `permissionMode` | string | Permission mode (e.g. `"default"`) |

### Message Content Structure

User messages use either a plain string or an array of content blocks. Assistant
messages always use an array of content blocks.

**Content block types:**

| Block Type | Fields | Purpose |
|---|---|---|
| `text` | `text` | Plain text response |
| `thinking` | `thinking`, `signature` | Extended thinking with cryptographic signature |
| `tool_use` | `id`, `name`, `input` | Tool invocation |
| `tool_result` | `tool_use_id`, `content` | Tool execution result |

### Tool Call Example

```json
{
  "type": "tool_use",
  "id": "toolu_01Pt9QyDAcW6rP2ZLHue3fJc",
  "name": "Read",
  "input": {
    "file_path": "/path/to/file"
  }
}
```

### Tool Result Example

```json
{
  "type": "tool_result",
  "tool_use_id": "toolu_01Pt9QyDAcW6rP2ZLHue3fJc",
  "content": "file content or result text"
}
```

### Structured Tool Result (in `toolUseResult` field)

Different tools produce different result structures:

**Read:**
```json
{
  "type": "text",
  "file": {
    "filePath": "/path",
    "content": "...",
    "numLines": 193,
    "startLine": 1,
    "totalLines": 193
  }
}
```

**Edit:**
```json
{
  "filePath": "/path",
  "oldString": "...",
  "newString": "...",
  "originalFile": "...",
  "structuredPatch": "...",
  "userModified": false,
  "replaceAll": false
}
```

**Glob:**
```json
{
  "filenames": ["file1.js", "file2.js"],
  "numFiles": 2,
  "truncated": false
}
```

### Token Usage

```json
{
  "input_tokens": 3,
  "output_tokens": 9,
  "cache_creation_input_tokens": 5601,
  "cache_read_input_tokens": 15567,
  "service_tier": "standard",
  "cache_creation": {
    "ephemeral_5m_input_tokens": 0,
    "ephemeral_1h_input_tokens": 5601
  },
  "server_tool_use": {
    "web_search_requests": 0,
    "web_fetch_requests": 0
  }
}
```

### Message Flow

```
File-history-snapshot (parentUuid=null)
  User message (parentUuid=null)
    Assistant message (thinking block)
      Assistant message (tool_use block)
        User message (tool_result block)
          Progress message (hook progress data)
            Assistant message (text response)
              System message (turn_duration)
```

Messages form a tree via `parentUuid` references. Multiple assistant messages can chain
before returning to user. Progress messages track intermediate tool execution states.

---

## 2. Codex (OpenAI)

### File Format

JSONL (JSON Lines). Each line has a `timestamp`, `type`, and `payload` field.

### Top-Level Entry Types

| Type | Purpose |
|---|---|
| `session_meta` | Session initialization and configuration |
| `response_item` | Container for messages, function calls, and reasoning |
| `event_msg` | System events (token counts, reasoning, agent messages) |
| `turn_context` | Per-turn configuration snapshot |

### Root-Level Fields

| Field | Type | Description |
|---|---|---|
| `timestamp` | string (ISO 8601) | When the entry was created |
| `type` | string | Entry type |
| `payload` | object | Event-specific data (structure varies by type) |

### `session_meta` Payload

| Field | Type | Description |
|---|---|---|
| `id` | string (UUID) | Session identifier |
| `timestamp` | string | Session creation time |
| `cwd` | string | Working directory |
| `originator` | string | Source (e.g. `"codex_cli_rs"`) |
| `cli_version` | string | CLI version |
| `source` | string | Source type (e.g. `"cli"`) |
| `model_provider` | string | AI provider (e.g. `"openai"`) |
| `base_instructions` | object | System instructions with `text` field |
| `git` | object | `commit_hash`, `branch`, `repository_url` |

### `response_item` Subtypes

The `payload.type` field determines the subtype:

| Subtype | Purpose | Key Fields |
|---|---|---|
| `message` | Conversation message | `role` (`user`/`assistant`/`developer`), `content[]`, `end_turn`, `phase` |
| `function_call` | Tool invocation | `name`, `arguments` (JSON string), `call_id` |
| `function_call_output` | Tool result | `call_id`, `output` |
| `custom_tool_call` | Built-in tool (e.g. `apply_patch`) | `status`, `call_id`, `name`, `input` |
| `reasoning` | Extended thinking | `summary[]`, `content`, `encrypted_content` |

**Content block types in messages:**

| Type | Used By | Purpose |
|---|---|---|
| `input_text` | user, developer | Input content |
| `output_text` | assistant | Output content |

**Phase values:**

| Phase | Meaning |
|---|---|
| `commentary` | Intermediate/progress update |
| `final_answer` | Terminal response |

### `event_msg` Subtypes

| Subtype | Purpose | Key Fields |
|---|---|---|
| `agent_reasoning` | Internal reasoning step | `text` |
| `agent_message` | User-facing message | `message` |
| `token_count` | Token usage and rate limits | `info`, `rate_limits` |
| `turn_aborted` | Turn interrupted | `reason` |

### `turn_context` Payload

| Field | Type | Description |
|---|---|---|
| `cwd` | string | Working directory |
| `approval_policy` | string | e.g. `"untrusted"` |
| `sandbox_policy` | object | `type`, `network_access`, filesystem exclusions |
| `model` | string | Model ID (e.g. `"gpt-5.2-codex"`) |
| `personality` | string | e.g. `"pragmatic"` |
| `collaboration_mode` | object | Mode name and settings |
| `summary` | string | e.g. `"auto"` |
| `user_instructions` | string | System/user instructions |

### Token Usage

```json
{
  "total_token_usage": {
    "input_tokens": 7926,
    "cached_input_tokens": 6528,
    "output_tokens": 183,
    "reasoning_output_tokens": 97,
    "total_tokens": 8109
  },
  "last_token_usage": { "..." : "same structure" },
  "model_context_window": 258400
}
```

### Rate Limits

```json
{
  "primary": { "used_percent": 0.5, "window_minutes": 1, "resets_at": "..." },
  "secondary": { "..." : "same" },
  "credits": { "has_credits": true, "unlimited": false, "balance": 150, "plan_type": "pro" }
}
```

### Function Call Example

```json
{
  "type": "function_call",
  "name": "exec_command",
  "arguments": "{\"cmd\":\"sed -n '1,260p' path/to/file\"}",
  "call_id": "call_M3AUBypmnJNRiz0rkS0AipQB"
}
```

### Function Call Output Example

```json
{
  "type": "function_call_output",
  "call_id": "call_M3AUBypmnJNRiz0rkS0AipQB",
  "output": "file contents..."
}
```

### Message Flow

```
session_meta
turn_context
response_item (message, role: user)
response_item (message, role: developer)   [system instructions as "developer" role]
response_item (reasoning)
response_item (message, role: assistant, phase: commentary)
response_item (function_call)
response_item (function_call_output)
event_msg (token_count)
response_item (message, role: assistant, phase: final_answer)
turn_context                                [next turn starts]
```

---

## 3. Copilot (GitHub)

### File Format

JSONL (JSON Lines). Each line is an event with `type`, `data`, `id`, `timestamp`, and
`parentId`.

### Event Types

| Type | Count (sample) | Purpose |
|---|---|---|
| `session.start` | 1 | Opens a new session |
| `user.message` | per interaction | User input |
| `assistant.turn_start` | per turn | Marks beginning of assistant response |
| `assistant.message` | per turn | Assistant text + tool requests |
| `tool.execution_start` | per tool call | Tool execution begins |
| `tool.execution_complete` | per tool call | Tool execution result |
| `assistant.turn_end` | per turn | Marks end of assistant response |

### Root-Level Fields (All Events)

| Field | Type | Description |
|---|---|---|
| `type` | string | Event type |
| `data` | object | Event-specific payload |
| `id` | string (UUID) | Unique event identifier |
| `timestamp` | string (ISO 8601) | Event timestamp |
| `parentId` | string (UUID) or null | Parent event (causality chain) |

### `session.start` Data

| Field | Type | Description |
|---|---|---|
| `sessionId` | string (UUID) | Session identifier |
| `version` | integer | Format version |
| `producer` | string | e.g. `"copilot-agent"` |
| `copilotVersion` | string | Semantic version (e.g. `"0.0.403"`) |
| `startTime` | string (ISO 8601) | Session start time |
| `context.cwd` | string | Working directory |
| `context.gitRoot` | string | Git repository root |
| `context.branch` | string | Git branch |
| `context.repository` | string | Repository identifier (e.g. `"owner/repo"`) |

### `user.message` Data

| Field | Type | Description |
|---|---|---|
| `content` | string | Original user message |
| `transformedContent` | string | Preprocessed message (with injected context like datetime) |
| `attachments` | array | Attached files or objects |

### `assistant.message` Data

| Field | Type | Description |
|---|---|---|
| `messageId` | string (UUID) or null | Message identifier |
| `content` | string | Assistant text response |
| `toolRequests` | array | Array of tool call objects |
| `reasoningText` | string (optional) | Human-readable reasoning |
| `reasoningOpaque` | string (optional) | Base64-encoded compressed reasoning |

**Tool request object:**

| Field | Type | Description |
|---|---|---|
| `toolCallId` | string | Unique ID (e.g. `"toolu_vrtx_..."`) |
| `name` | string | Tool name (e.g. `"view"`, `"edit"`, `"report_intent"`) |
| `arguments` | object | Tool-specific arguments |
| `type` | string | Always `"function"` |

### `tool.execution_start` Data

| Field | Type | Description |
|---|---|---|
| `toolCallId` | string | Matches the tool request |
| `toolName` | string | Tool being executed |
| `arguments` | object | Arguments passed |

### `tool.execution_complete` Data

| Field | Type | Description |
|---|---|---|
| `toolCallId` | string | Matches the start event |
| `success` | boolean | Whether execution succeeded |
| `result.content` | string | Brief/summary result |
| `result.detailedContent` | string | Full result (diffs, file contents) |
| `toolTelemetry.properties` | object | `command`, `options`, `inputs`, `fileExtension`, `viewType` |
| `toolTelemetry.metrics` | object | `resultLength`, `resultForLlmLength`, `responseTokenLimit`, `linesAdded`, `linesRemoved` |
| `toolTelemetry.restrictedProperties` | object | Sensitive data like `filePaths` |

### `assistant.turn_start` / `assistant.turn_end` Data

| Field | Type | Description |
|---|---|---|
| `turnId` | string | Numeric turn counter as string |

### Message Flow

```
session.start (parentId=null)
  user.message
    assistant.turn_start (turnId: "0")
      assistant.message (with toolRequests[])
        tool.execution_start
          tool.execution_complete
        tool.execution_start
          tool.execution_complete
      assistant.turn_end

    assistant.turn_start (turnId: "1")
      assistant.message (refined response or more tool calls)
        tool.execution_start
          tool.execution_complete
      assistant.turn_end
```

Events form a DAG via `parentId`, allowing reconstruction of causality chains.

---

## 4. Gemini CLI (Google)

### File Format

Single `.json` file. The root is a JSON object (not an array) with session metadata and
a `messages` array.

### Root-Level Fields

| Field | Type | Description |
|---|---|---|
| `sessionId` | string (UUID) | Session identifier |
| `projectHash` | string (SHA-256) | Hash of the project being worked on |
| `startTime` | string (ISO 8601) | Session start time |
| `lastUpdated` | string (ISO 8601) | Last session update time |
| `messages` | array | All messages in the conversation |

### Message Structure

Messages are objects in the `messages` array. Fields vary by type.

**Common fields:**

| Field | Type | Description |
|---|---|---|
| `id` | string (UUID) | Message identifier |
| `timestamp` | string (ISO 8601) | Message creation time |
| `type` | string | `"user"` or `"gemini"` |
| `content` | string | Text content (empty string if tool-calling) |

**Gemini-only fields:**

| Field | Type | Description |
|---|---|---|
| `toolCalls` | array | Tool invocations and their results (inline) |
| `thoughts` | array | Internal reasoning steps |
| `model` | string | Model used (e.g. `"gemini-2.5-flash"`) |
| `tokens` | object | Token usage breakdown |

### Thoughts Structure

```json
{
  "subject": "Initiating the Process",
  "description": "I've begun reading the file's content to identify any typos...",
  "timestamp": "2026-02-05T10:44:20.116Z"
}
```

Most human-readable thinking format of all agents. Each thought has a short `subject`
and a detailed `description`.

### Tool Calls Structure

Tool calls and their results are stored together in the same object:

```json
{
  "id": "read_file-1770288260364-2b173df6d077b",
  "name": "read_file",
  "args": {
    "file_path": "src/content/docs/rover/guides/assign-tasks.mdx"
  },
  "result": [
    {
      "functionResponse": {
        "id": "read_file-1770288260364-2b173df6d077b",
        "name": "read_file",
        "response": {
          "output": "full file contents as string"
        }
      }
    }
  ],
  "status": "success",
  "timestamp": "2026-02-05T10:44:22.506Z",
  "resultDisplay": "",
  "displayName": "ReadFile",
  "description": "Full description of the tool",
  "renderOutputAsMarkdown": true
}
```

**Tool call fields:**

| Field | Type | Description |
|---|---|---|
| `id` | string | Tool-specific ID (`toolname-timestamp-hex`) |
| `name` | string | Internal tool name (`read_file`, `replace`, `list_directory`) |
| `args` | object | Tool arguments |
| `result` | array | Contains `functionResponse` with `response.output` or `response.error` |
| `status` | string | `"success"` or `"error"` |
| `timestamp` | string (ISO 8601) | Execution time |
| `resultDisplay` | string or object | Display-oriented result data |
| `displayName` | string | UI-friendly name (`ReadFile`, `Edit`, `ReadFolder`) |
| `description` | string | Full tool description |
| `renderOutputAsMarkdown` | boolean | Rendering hint |

### Replace Tool Result Display (Rich Diff Data)

```json
{
  "resultDisplay": {
    "fileDiff": "unified diff format string",
    "fileName": "assign-tasks.mdx",
    "filePath": "full path",
    "originalContent": "full original file contents",
    "newContent": "full new file contents",
    "diffStat": {
      "model_added_lines": 1,
      "model_removed_lines": 1,
      "model_added_chars": 110,
      "model_removed_chars": 110,
      "user_added_lines": 1,
      "user_removed_lines": 192,
      "user_added_chars": 110,
      "user_removed_chars": 6287
    },
    "isNewFile": false
  }
}
```

### Token Usage

```json
{
  "input": 8479,
  "output": 22,
  "cached": 0,
  "thoughts": 61,
  "tool": 0,
  "total": 8562
}
```

### Message Flow

```
messages[0]: type "user"     - User instruction
messages[1]: type "gemini"   - Tool calls (read_file), thoughts, empty content
messages[2]: type "gemini"   - Tool calls (replace), thoughts, final text content
messages[3]: type "user"     - Next user instruction
messages[4]: type "gemini"   - Response...
```

Sequential array. No parent references; order is implicit. Tool calls and results are
stored inline within the gemini message that made them.

---

## 5. OpenCode

### File Format

**Distributed file-based format** using multiple JSON files across a directory
hierarchy. This is the only format that is NOT a single file.

### Directory Structure

```
opencode/
  session.json                        # Session metadata
  messages/
    msg_<MESSAGE_ID>.json             # Message metadata (one per message)
    msg_<MESSAGE_ID>.json
    ...
  part/
    msg_<MESSAGE_ID>/                 # Subdirectory per message
      prt_<PART_ID>.json              # Content parts (one per part)
      prt_<PART_ID>.json
      ...
    msg_<MESSAGE_ID>/
      ...
```

### ID Format

All IDs use **self-describing prefixes**:

| Prefix | Entity |
|---|---|
| `ses_` | Session |
| `msg_` | Message |
| `prt_` | Part |

### `session.json`

| Field | Type | Description |
|---|---|---|
| `id` | string | Session ID (`ses_*`) |
| `slug` | string | Human-readable identifier (e.g. `"swift-wolf"`) |
| `version` | string | Format version |
| `projectID` | string | Associated project |
| `directory` | string | Working directory path |
| `title` | string | Session title/description |
| `time.created` | number (Unix ms) | Creation timestamp |
| `time.updated` | number (Unix ms) | Last update timestamp |
| `summary.additions` | number | Total line additions |
| `summary.deletions` | number | Total line deletions |
| `summary.files` | number | Number of files changed |

### Message Files (`messages/msg_*.json`)

Messages contain **metadata only**; actual content lives in parts.

**User message fields:**

| Field | Type | Description |
|---|---|---|
| `id` | string | Message ID (`msg_*`) |
| `sessionID` | string | Parent session ID |
| `role` | string | `"user"` |
| `time.created` | number (Unix ms) | Creation timestamp |
| `summary.title` | string | Summary of user request |
| `summary.diffs` | array | File changes (before/after snapshots) |
| `agent` | string | Target agent (e.g. `"build"`) |
| `model.providerID` | string | Model provider (e.g. `"openai"`) |
| `model.modelID` | string | Model version (e.g. `"gpt-5.2"`) |

**Assistant message fields:**

| Field | Type | Description |
|---|---|---|
| `id` | string | Message ID (`msg_*`) |
| `sessionID` | string | Parent session ID |
| `role` | string | `"assistant"` |
| `time.created` | number (Unix ms) | Creation timestamp |
| `time.completed` | number (Unix ms) | Completion timestamp |
| `parentID` | string | Parent message ID |
| `modelID` | string | Model used |
| `providerID` | string | Model provider |
| `mode` | string | Execution mode (e.g. `"build"`) |
| `agent` | string | Agent name |
| `path.cwd` | string | Current working directory |
| `path.root` | string | Root directory |
| `cost` | number | API cost |
| `tokens.input` | number | Input tokens |
| `tokens.output` | number | Output tokens |
| `tokens.reasoning` | number | Reasoning tokens |
| `tokens.cache.read` | number | Cached tokens read |
| `tokens.cache.write` | number | Cached tokens written |
| `finish` | string | Stop reason (`"tool-calls"`, `"end_turn"`) |

### Part Files (`part/msg_*/prt_*.json`)

Parts contain the actual content, broken into typed segments.

**Common fields (all parts):**

| Field | Type | Description |
|---|---|---|
| `id` | string | Part ID (`prt_*`) |
| `sessionID` | string | Parent session ID |
| `messageID` | string | Parent message ID |
| `type` | string | Part type |

**Part type: `text`**

| Field | Type | Description |
|---|---|---|
| `text` | string | Text content |

**Part type: `reasoning`**

| Field | Type | Description |
|---|---|---|
| `text` | string | Empty (reasoning is encrypted) |
| `metadata.openai.itemId` | string | Reasoning item ID |
| `metadata.openai.reasoningEncryptedContent` | string | Encrypted reasoning (base64) |
| `time.start` | number | Reasoning start timestamp |
| `time.end` | number | Reasoning end timestamp |

**Part type: `step-start`**

| Field | Type | Description |
|---|---|---|
| `snapshot` | string | Git commit hash at step boundary |

**Part type: `tool`**

| Field | Type | Description |
|---|---|---|
| `callID` | string | Tool call identifier |
| `tool` | string | Tool name (e.g. `"apply_patch"`, `"read"`) |
| `state.status` | string | `"completed"`, `"pending"`, `"error"` |
| `state.input` | object | Tool input parameters |
| `state.output` | string or object | Tool output/result |
| `state.title` | string | Human-readable result summary |
| `state.metadata` | object | Tool-specific metadata |
| `state.time.start` | number | Execution start timestamp |
| `state.time.end` | number | Execution end timestamp |
| `metadata.openai.itemId` | string | OpenAI tool call identifier |

### Tool-Specific Structures

**`apply_patch` metadata:**
```json
{
  "diff": "unified diff format",
  "files": [
    {
      "filePath": "/absolute/path",
      "relativePath": "relative/path",
      "type": "update",
      "diff": "...",
      "additions": 4,
      "deletions": 4
    }
  ]
}
```

**`read` tool output format:**
```
<file>
00001| line content
00002| line content
...
(End of file - total X lines)
</file>
```

### Message Flow

```
session.json (root)
  messages/msg_001.json (role: user)
    part/msg_001/prt_001.json (type: text - user prompt)
  messages/msg_002.json (role: assistant, parentID: msg_001)
    part/msg_002/prt_001.json (type: reasoning)
    part/msg_002/prt_002.json (type: step-start, snapshot)
    part/msg_002/prt_003.json (type: tool - read file)
    part/msg_002/prt_004.json (type: tool - apply_patch)
  messages/msg_003.json (role: user)
    part/msg_003/prt_001.json (type: text)
  ...
```

Message metadata is separate from content. Parts within a message are ordered by
creation time. The `parentID` field on assistant messages points back to the originating
user message.

---

## Cross-Format Comparison

### Common Conversation Model

Every format follows the same fundamental interaction loop:

```
User Message -> Assistant Thinking -> Tool Call(s) -> Tool Result(s) -> Assistant Response -> repeat
```

All agents share these semantic roles:

| Concept | Claude | Codex | Copilot | Gemini | OpenCode |
|---|---|---|---|---|---|
| User input | `role: "user"` | `role: "user"` | `type: "user.message"` | `type: "user"` | `role: "user"` |
| Agent output | `role: "assistant"` | `role: "assistant"` | `type: "assistant.message"` | `type: "gemini"` | `role: "assistant"` |
| Tool invocation | `type: "tool_use"` | `type: "function_call"` | `toolRequests[]` | `toolCalls[]` | `type: "tool"` |
| Tool result | `type: "tool_result"` | `type: "function_call_output"` | `tool.execution_complete` | `result[]` (inline) | `state.output` (inline) |

### Message Identity and Linking

All formats use unique IDs. Most use parent references to build a conversation tree or
causality chain:

| Format | ID Field | Parent Link | Structure |
|---|---|---|---|
| Claude | `uuid` | `parentUuid` | Tree (DAG) |
| Codex | (implicit order) | (sequential) | Flat sequence |
| Copilot | `id` (UUID) | `parentId` | DAG |
| Gemini | `id` (UUID) | (sequential in array) | Flat sequence |
| OpenCode | `id` (prefixed) | `parentID` | Tree |

### Tool Call Correlation

Every format links a tool invocation to its result via a call ID:

| Format | Call ID | Correlation Mechanism |
|---|---|---|
| Claude | `tool_use.id` <-> `tool_result.tool_use_id` | Separate entries |
| Codex | `function_call.call_id` <-> `function_call_output.call_id` | Separate entries |
| Copilot | `toolRequests[].toolCallId` <-> `tool.execution_complete.toolCallId` | Separate events |
| Gemini | `toolCalls[].id` <-> `toolCalls[].result[].functionResponse.id` | Inline (same object) |
| OpenCode | `callID` | Inline (same part file) |

### Extended Thinking and Reasoning

All formats capture internal reasoning with different representations:

| Format | Location | Encrypted? | Human-Readable? |
|---|---|---|---|
| Claude | `content[].type: "thinking"` | Signed (signature) | Yes (thinking text) |
| Codex | `response_item.type: "reasoning"` + `event_msg.type: "agent_reasoning"` | Yes (`encrypted_content`) | Partial (summary only) |
| Copilot | `reasoningText` + `reasoningOpaque` | Dual representation | Yes (reasoningText) |
| Gemini | `thoughts[]` with `subject` + `description` | No | Yes (most readable) |
| OpenCode | Part `type: "reasoning"` | Yes (OpenAI encrypted) | No |

### Token and Cost Tracking

| Format | Input | Output | Reasoning | Cached | Total | Cost |
|---|---|---|---|---|---|---|
| Claude | `input_tokens` | `output_tokens` | - | `cache_creation_input_tokens`, `cache_read_input_tokens` | (computed) | - |
| Codex | `input_tokens` | `output_tokens` | `reasoning_output_tokens` | `cached_input_tokens` | `total_tokens` | - |
| Copilot | - | - | - | - | `responseTokenLimit` (cap only) | - |
| Gemini | `input` | `output` | `thoughts` | `cached` | `total` | - |
| OpenCode | `tokens.input` | `tokens.output` | `tokens.reasoning` | `tokens.cache.read`, `tokens.cache.write` | (computed) | `cost` |

### Session Metadata

| Field | Claude | Codex | Copilot | Gemini | OpenCode |
|---|---|---|---|---|---|
| Session ID | `sessionId` | `payload.id` | `data.sessionId` | `sessionId` | `id` |
| Working dir | `cwd` | `cwd` | `context.cwd` | - | `directory` |
| Git branch | `gitBranch` | `git.branch` | `context.branch` | - | - |
| Git repo | - | `git.repository_url` | `context.repository` | - | - |
| Version | `version` | `cli_version` | `copilotVersion` | - | `version` |
| Model | (in system prompt) | `model` | - | `model` | `modelID` |
| Timestamps | ISO 8601 | ISO 8601 | ISO 8601 | ISO 8601 | Unix ms |

### File Format Comparison

| Property | Claude | Codex | Copilot | Gemini | OpenCode |
|---|---|---|---|---|---|
| File type | JSONL | JSONL | JSONL | JSON | Multi-file JSON |
| Parsing | Line-by-line stream | Line-by-line stream | Line-by-line stream | Single parse | Multi-file assembly |
| Ordering | Tree (parentUuid) | Sequential | DAG (parentId) | Array index | Tree (parentID) |
| Tool results | Separate entries | Separate entries | Separate events | Inline | Inline (same part) |
| Content blocks | Array of typed blocks | Array of typed blocks | Fields on object | Fields on object | Separate part files |

---

## Individual Behaviors (Unique Per Format)

### Claude Code

- **Tree-structured messages**: `parentUuid` creates a true DAG, not just a flat list
- **`isSidechain`**: Supports branching/parallel execution paths (subagents)
- **`file-history-snapshot`**: Tracks file state backups with version numbers for undo
- **`progress` type**: Intermediate status events during tool execution (hook progress)
- **`system` type with `subtype: "turn_duration"`**: Explicitly logs wall-clock turn time
- **Prompt cache granularity**: Distinguishes `ephemeral_5m` vs `ephemeral_1h` cache windows
- **`permissionMode`**: Records the access control mode used
- **Thinking signatures**: Cryptographic signature on thinking blocks for verification

### Codex (OpenAI)

- **Three roles**: `user`, `assistant`, **`developer`** (system instructions injected as a role)
- **`turn_context`**: Per-turn configuration snapshot (sandbox policy, model, personality)
- **`phase`**: Messages tagged as `"commentary"` vs `"final_answer"`
- **`custom_tool_call`** vs `function_call`: Two-tier tool system (built-in patches vs shell commands)
- **Rate limit tracking**: `rate_limits` with `used_percent`, `window_minutes`, `resets_at`, credits
- **`sandbox_policy`**: Records network access and filesystem exclusion per turn
- **Personality field**: Agent personality configuration (e.g. `"pragmatic"`)

### Copilot (GitHub)

- **Event-based model**: Uses typed events rather than messages
- **Turn lifecycle**: Explicit `turn_start` / `turn_end` brackets
- **Tool execution lifecycle**: Separate `start` and `complete` events (enables duration tracking)
- **`toolTelemetry`**: Rich per-call metrics (result length, lines added/removed, file extension)
- **`restrictedProperties`**: Sensitive data (file paths) segregated from telemetry
- **`transformedContent`**: Shows preprocessing applied to user messages
- **`detailedContent`**: Tool results carry both summary and full diff
- **`report_intent`**: Special tool for declaring intent before acting

### Gemini CLI (Google)

- **Single JSON file** (not JSONL)
- **`thoughts[]`**: Structured reasoning with `subject` + `description` + `timestamp` (most human-readable)
- **Inline tool results**: Tool call and result stored in the same message object
- **`resultDisplay`**: Separate display-oriented data alongside raw results
- **`diffStat`**: Dual-perspective stats (model vs user changes)
- **`renderOutputAsMarkdown`**: Explicit rendering hint flag
- **`projectHash`**: SHA-256 hash for project identity (not a path)
- **`displayName`**: UI-friendly tool names separate from internal names

### OpenCode

- **File-based distributed format**: Not a single file; hierarchy across directories
- **Three-level hierarchy**: Session -> Messages (metadata) -> Parts (content)
- **`step-start` parts**: Git snapshot hashes at step boundaries for rollback
- **Content separated from metadata**: Message files are lightweight; content lives in parts
- **`summary.diffs`**: User messages carry before/after file diffs
- **`finish` field**: Explicit stop reason per assistant message
- **Prefixed IDs**: `ses_`, `msg_`, `prt_` make ID types self-describing
- **Provider-specific metadata nesting**: `metadata.openai.*` allows multi-provider support
- **Dual timestamps on messages**: Both `time.created` and `time.completed`

---

## Suggested Common Abstraction Layer

Based on the analysis above, a generic visualizer needs these core abstractions:

```
Session
  id: string
  title: string
  startTime: Date
  endTime: Date
  context:
    cwd: string
    gitBranch?: string
    gitRepo?: string
    model?: string
    agentName: string
    agentVersion?: string
  messages[]:
    id: string
    parentId?: string
    role: "user" | "assistant" | "system"
    timestamp: Date
    content?: string
    thinking?:
      text?: string
      isEncrypted: boolean
      subject?: string        (Gemini-style)
    toolCalls[]:
      id: string
      name: string
      displayName?: string
      arguments: object
      result:
        success: boolean
        content: string
        detailedContent?: string
        diff?: string
      startTime?: Date
      endTime?: Date
    tokens?:
      input?: number
      output?: number
      reasoning?: number
      cached?: number
      total?: number
    cost?: number
```

### Parser Architecture

Each source format needs its own **processor** that normalizes into the common model:

| Parser | Input | Strategy |
|---|---|---|
| `ClaudeParser` | Single `.jsonl` file | Line-by-line streaming, tree assembly via `parentUuid` |
| `CodexParser` | Single `.jsonl` file | Line-by-line streaming, group by `type` and `call_id` |
| `CopilotParser` | Single `.jsonl` file | Line-by-line streaming, match events via `parentId` and `toolCallId` |
| `GeminiParser` | Single `.json` file | Single JSON parse, iterate `messages` array, inline tool extraction |
| `OpenCodeParser` | Directory of `.json` files | Multi-file loader: read session, list messages, assemble parts per message |

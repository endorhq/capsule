import { basename, extname } from 'node:path';
import type { AgentFormat } from '@endorhq/capsule-shared/types/timeline';

export interface AnonymizeOptions {
	removeToolOutputs: boolean;
	maskFilePaths: boolean;
	removeFileContents: boolean;
	removeThinking: boolean;
	removeSystemMessages: boolean;
	removeTokenUsage: boolean;
	maskGitInfo: boolean;
}

export const ANONYMIZE_OPTION_LABELS: Record<keyof AnonymizeOptions, string> = {
	removeToolOutputs: 'Remove tool call outputs',
	maskFilePaths: 'Mask file paths',
	removeFileContents: 'Remove file contents',
	removeThinking: 'Remove thinking blocks',
	removeSystemMessages: 'Remove system messages',
	removeTokenUsage: 'Remove token usage',
	maskGitInfo: 'Mask git info'
};

export const DEFAULT_OPTIONS: AnonymizeOptions = {
	removeToolOutputs: false,
	maskFilePaths: false,
	removeFileContents: false,
	removeThinking: false,
	removeSystemMessages: false,
	removeTokenUsage: false,
	maskGitInfo: false
};

class PathMasker {
	private map = new Map<string, string>();
	private counter = 1;

	mask(path: string): string {
		const existing = this.map.get(path);
		if (existing) return existing;

		const ext = extname(path);
		const masked = `/project/src/file${this.counter}${ext}`;
		this.counter++;
		this.map.set(path, masked);
		return masked;
	}

	/**
	 * Replace all occurrences of known paths in a string.
	 * Process longer paths first to avoid partial replacements.
	 */
	maskInString(text: string): string {
		if (!text) return text;

		// First pass: find and register all path-like strings
		const pathRegex = /(?:\/[\w.@-]+){2,}|~\/[\w.@/-]+|[A-Z]:\\[\w.\\-]+/g;
		let match;
		while ((match = pathRegex.exec(text)) !== null) {
			this.mask(match[0]);
		}

		// Second pass: replace all registered paths, longest first
		const entries = [...this.map.entries()].sort((a, b) => b[0].length - a[0].length);
		let result = text;
		for (const [original, masked] of entries) {
			result = result.replaceAll(original, masked);
		}
		return result;
	}
}

class GitMasker {
	private branchMap = new Map<string, string>();
	private repoMap = new Map<string, string>();
	private branchCounter = 1;
	private repoCounter = 1;

	maskBranch(branch: string): string {
		const existing = this.branchMap.get(branch);
		if (existing) return existing;
		const masked = `branch-${this.branchCounter++}`;
		this.branchMap.set(branch, masked);
		return masked;
	}

	maskRepo(repo: string): string {
		const existing = this.repoMap.get(repo);
		if (existing) return existing;
		const masked = `https://github.com/user/repo-${this.repoCounter++}.git`;
		this.repoMap.set(repo, masked);
		return masked;
	}

	maskInString(text: string): string {
		if (!text) return text;
		let result = text;
		const entries = [...this.branchMap.entries(), ...this.repoMap.entries()]
			.sort((a, b) => b[0].length - a[0].length);
		for (const [original, masked] of entries) {
			result = result.replaceAll(original, masked);
		}
		return result;
	}
}

/**
 * Anonymize a session file's raw content based on format and options.
 */
export function anonymize(content: string, format: AgentFormat, options: AnonymizeOptions): string {
	const pathMasker = new PathMasker();
	const gitMasker = new GitMasker();

	if (format === 'gemini') {
		return anonymizeGemini(content, options, pathMasker, gitMasker);
	}

	// JSONL formats: Claude, Codex, Copilot
	const lines = content.split('\n');
	const result: string[] = [];

	for (const line of lines) {
		if (line.trim().length === 0) {
			result.push(line);
			continue;
		}

		let entry: Record<string, unknown>;
		try {
			entry = JSON.parse(line);
		} catch {
			result.push(line);
			continue;
		}

		let processed: Record<string, unknown> | null = null;

		switch (format) {
			case 'claude':
				processed = anonymizeClaudeLine(entry, options, pathMasker, gitMasker);
				break;
			case 'codex':
				processed = anonymizeCodexLine(entry, options, pathMasker, gitMasker);
				break;
			case 'copilot':
				processed = anonymizeCopilotLine(entry, options, pathMasker, gitMasker);
				break;
			default:
				processed = entry;
		}

		if (processed !== null) {
			result.push(JSON.stringify(processed));
		}
	}

	return result.join('\n');
}

// ─── Claude ────────────────────────────────────────────────────────

function anonymizeClaudeLine(
	entry: Record<string, unknown>,
	options: AnonymizeOptions,
	pathMasker: PathMasker,
	gitMasker: GitMasker
): Record<string, unknown> | null {
	const type = entry.type as string;

	// Remove system entries (file-history-snapshot is also system-level)
	if (options.removeSystemMessages && (type === 'system' || type === 'file-history-snapshot')) {
		return null;
	}

	// Remove token usage from entries
	if (options.removeTokenUsage && entry.message && typeof entry.message === 'object') {
		const msg = entry.message as Record<string, unknown>;
		if (msg.usage) {
			msg.usage = undefined;
		}
	}

	// Mask paths in context fields
	if (options.maskFilePaths) {
		if (entry.cwd && typeof entry.cwd === 'string') {
			entry.cwd = pathMasker.mask(entry.cwd);
		}
	}

	// Mask git info
	if (options.maskGitInfo) {
		if (entry.gitBranch && typeof entry.gitBranch === 'string') {
			entry.gitBranch = gitMasker.maskBranch(entry.gitBranch);
		}
	}

	if (type === 'assistant' && entry.message && typeof entry.message === 'object') {
		const msg = entry.message as Record<string, unknown>;
		const content = msg.content as Array<Record<string, unknown>> | undefined;
		if (Array.isArray(content)) {
			msg.content = content
				.filter((block) => {
					// Remove thinking blocks
					if (options.removeThinking && block.type === 'thinking') return false;
					return true;
				})
				.map((block) => {
					// Mask file paths in tool_use arguments
					if (options.maskFilePaths && block.type === 'tool_use' && block.input) {
						block.input = maskPathsInObject(block.input as Record<string, unknown>, pathMasker);
					}
					// Mask file paths in text content
					if (options.maskFilePaths && block.type === 'text' && typeof block.text === 'string') {
						block.text = pathMasker.maskInString(block.text);
					}
					return block;
				});
		}
	}

	if (type === 'user' && entry.message && typeof entry.message === 'object') {
		const msg = entry.message as Record<string, unknown>;
		const content = msg.content;

		// Mask paths in user text
		if (options.maskFilePaths && typeof content === 'string') {
			msg.content = pathMasker.maskInString(content);
		}

		// Process tool results
		if (Array.isArray(content)) {
			msg.content = (content as Array<Record<string, unknown>>).map((block) => {
				if (block.type === 'tool_result') {
					// Remove tool output content
					if (options.removeToolOutputs) {
						block.content = '[removed]';
					} else if (options.removeFileContents && typeof block.content === 'string') {
						block.content = stripFileContents(block.content as string);
					}
					if (options.maskFilePaths && typeof block.content === 'string') {
						block.content = pathMasker.maskInString(block.content as string);
					}
				}
				return block;
			});
		}

		// Remove tool result metadata
		if (options.removeToolOutputs && entry.toolUseResult) {
			entry.toolUseResult = undefined;
		} else if (options.maskFilePaths && entry.toolUseResult && typeof entry.toolUseResult === 'object') {
			entry.toolUseResult = maskPathsInObject(entry.toolUseResult as Record<string, unknown>, pathMasker);
		}
	}

	return entry;
}

// ─── Codex ─────────────────────────────────────────────────────────

function anonymizeCodexLine(
	entry: Record<string, unknown>,
	options: AnonymizeOptions,
	pathMasker: PathMasker,
	gitMasker: GitMasker
): Record<string, unknown> | null {
	const type = entry.type as string;
	const payload = entry.payload as Record<string, unknown> | undefined;
	if (!payload) return entry;

	if (type === 'session_meta') {
		if (options.maskFilePaths && payload.cwd) {
			payload.cwd = pathMasker.mask(payload.cwd as string);
		}
		if (options.maskGitInfo && payload.git) {
			const git = payload.git as Record<string, unknown>;
			if (git.branch) git.branch = gitMasker.maskBranch(git.branch as string);
			if (git.repository_url) git.repository_url = gitMasker.maskRepo(git.repository_url as string);
		}
	}

	if (type === 'response_item') {
		const itemType = payload.type as string;
		const role = payload.role as string | undefined;

		// Remove developer/system messages
		if (options.removeSystemMessages && itemType === 'message' && role === 'developer') {
			return null;
		}

		// Remove reasoning items
		if (options.removeThinking && itemType === 'reasoning') {
			return null;
		}

		// Remove tool output
		if (options.removeToolOutputs && (itemType === 'function_call_output' || itemType === 'custom_tool_call_output')) {
			payload.output = '[removed]';
		}

		// Mask paths in tool call arguments
		if (options.maskFilePaths && (itemType === 'function_call' || itemType === 'custom_tool_call')) {
			if (payload.arguments && typeof payload.arguments === 'string') {
				try {
					const args = JSON.parse(payload.arguments);
					payload.arguments = JSON.stringify(maskPathsInObject(args, pathMasker));
				} catch {
					// ignore
				}
			}
			if (payload.input && typeof payload.input === 'string') {
				payload.input = pathMasker.maskInString(payload.input);
			}
		}

		// Mask paths in message content
		if (options.maskFilePaths && itemType === 'message') {
			const contentArr = payload.content as Array<Record<string, unknown>> | undefined;
			if (Array.isArray(contentArr)) {
				for (const block of contentArr) {
					if (typeof block.text === 'string') {
						block.text = pathMasker.maskInString(block.text);
					}
				}
			}
		}
	}

	// Remove token counts
	if (options.removeTokenUsage && type === 'event_msg' && payload.type === 'token_count') {
		return null;
	}

	return entry;
}

// ─── Copilot ───────────────────────────────────────────────────────

function anonymizeCopilotLine(
	entry: Record<string, unknown>,
	options: AnonymizeOptions,
	pathMasker: PathMasker,
	gitMasker: GitMasker
): Record<string, unknown> | null {
	const type = entry.type as string;
	const data = entry.data as Record<string, unknown> | undefined;
	if (!data) return entry;

	if (type === 'session.start') {
		const ctx = data.context as Record<string, unknown> | undefined;
		if (ctx) {
			if (options.maskFilePaths && ctx.cwd) {
				ctx.cwd = pathMasker.mask(ctx.cwd as string);
			}
			if (options.maskGitInfo) {
				if (ctx.branch) ctx.branch = gitMasker.maskBranch(ctx.branch as string);
				if (ctx.repository) ctx.repository = gitMasker.maskRepo(ctx.repository as string);
			}
		}
	}

	if (type === 'assistant.message') {
		// Remove thinking
		if (options.removeThinking) {
			data.reasoningText = undefined;
			data.reasoningOpaque = undefined;
		}

		// Mask paths in content
		if (options.maskFilePaths && typeof data.content === 'string') {
			data.content = pathMasker.maskInString(data.content);
		}
	}

	if (type === 'user.message') {
		if (options.maskFilePaths && typeof data.content === 'string') {
			data.content = pathMasker.maskInString(data.content);
		}
	}

	// Remove tool outputs
	if (type === 'tool.execution_complete') {
		if (options.removeToolOutputs && data.result && typeof data.result === 'object') {
			const result = data.result as Record<string, unknown>;
			result.content = '[removed]';
			result.detailedContent = undefined;
		} else if (options.removeFileContents && data.result && typeof data.result === 'object') {
			const result = data.result as Record<string, unknown>;
			if (typeof result.content === 'string') {
				result.content = stripFileContents(result.content);
			}
			if (typeof result.detailedContent === 'string') {
				result.detailedContent = stripFileContents(result.detailedContent);
			}
		}
		if (options.maskFilePaths && data.result && typeof data.result === 'object') {
			const result = data.result as Record<string, unknown>;
			if (typeof result.content === 'string') {
				result.content = pathMasker.maskInString(result.content);
			}
		}
	}

	// Mask paths in tool arguments
	if (type === 'tool.execution_start') {
		if (options.maskFilePaths && data.arguments && typeof data.arguments === 'object') {
			data.arguments = maskPathsInObject(data.arguments as Record<string, unknown>, pathMasker);
		}
	}

	return entry;
}

// ─── Gemini ────────────────────────────────────────────────────────

function anonymizeGemini(
	content: string,
	options: AnonymizeOptions,
	pathMasker: PathMasker,
	gitMasker: GitMasker
): string {
	let root: Record<string, unknown>;
	try {
		root = JSON.parse(content);
	} catch {
		return content;
	}

	// Remove token data from messages
	const messages = root.messages as Array<Record<string, unknown>> | undefined;
	if (messages) {
		root.messages = messages
			.filter((msg) => {
				// Remove system messages (type === 'system' if any)
				if (options.removeSystemMessages && msg.type === 'system') return false;
				return true;
			})
			.map((msg) => {
				if (options.removeTokenUsage) {
					msg.tokens = undefined;
				}

				if (options.removeThinking) {
					msg.thoughts = undefined;
				}

				// Process tool calls
				const toolCalls = msg.toolCalls as Array<Record<string, unknown>> | undefined;
				if (toolCalls) {
					msg.toolCalls = toolCalls.map((tc) => {
						if (options.removeToolOutputs) {
							tc.result = undefined;
							tc.resultDisplay = undefined;
						} else if (options.removeFileContents) {
							const resultArr = tc.result as Array<Record<string, unknown>> | undefined;
							if (resultArr) {
								for (const r of resultArr) {
									const funcResp = r.functionResponse as Record<string, unknown> | undefined;
									if (funcResp?.response && typeof funcResp.response === 'object') {
										const resp = funcResp.response as Record<string, string>;
										if (resp.output) {
											resp.output = stripFileContents(resp.output);
										}
									}
								}
							}
						}

						if (options.maskFilePaths && tc.args && typeof tc.args === 'object') {
							tc.args = maskPathsInObject(tc.args as Record<string, unknown>, pathMasker);
						}

						return tc;
					});
				}

				// Mask paths in content
				if (options.maskFilePaths && typeof msg.content === 'string') {
					msg.content = pathMasker.maskInString(msg.content);
				}

				return msg;
			});
	}

	return JSON.stringify(root, null, 2);
}

// ─── Helpers ───────────────────────────────────────────────────────

function maskPathsInObject(obj: Record<string, unknown>, masker: PathMasker): Record<string, unknown> {
	const result: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(obj)) {
		if (typeof value === 'string') {
			// Check if the value looks like a path
			if (value.startsWith('/') || value.startsWith('~') || /^[A-Z]:\\/.test(value)) {
				result[key] = masker.mask(value);
			} else {
				result[key] = masker.maskInString(value);
			}
		} else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
			result[key] = maskPathsInObject(value as Record<string, unknown>, masker);
		} else {
			result[key] = value;
		}
	}
	return result;
}

/**
 * Strip large file body content, keeping just a placeholder.
 * Targets patterns like file content dumps that are many lines long.
 */
function stripFileContents(text: string): string {
	if (!text) return text;
	const lines = text.split('\n');
	if (lines.length > 20) {
		return `[file content removed - ${lines.length} lines]`;
	}
	return text;
}

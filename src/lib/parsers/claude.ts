import type {
	ParsedSession,
	SessionContext,
	TimelineEntry,
	UserEntry,
	AssistantEntry,
	ToolCallEntry,
	SystemEntry,
	FileEntry,
	TokenUsage,
	ThinkingBlock,
	ToolResultMeta
} from '$lib/types/timeline';

interface ContentBlock {
	type: string;
	text?: string;
	thinking?: string;
	signature?: string;
	id?: string;
	name?: string;
	input?: Record<string, unknown>;
	tool_use_id?: string;
	content?: string;
}

interface BufferedToolCall {
	toolUseId: string;
	name: string;
	displayName: string;
	arguments: Record<string, unknown>;
	timestamp: Date;
}

function generateId(index: number): string {
	return `entry-${index}`;
}

function extractToolDisplayName(name: string): string {
	switch (name) {
		case 'Read':
			return 'Read';
		case 'Edit':
			return 'Edit';
		case 'Write':
			return 'Write';
		case 'Glob':
			return 'Glob';
		case 'Grep':
			return 'Grep';
		case 'Bash':
			return 'Shell';
		case 'WebSearch':
			return 'WebSearch';
		case 'WebFetch':
			return 'WebFetch';
		case 'Task':
			return 'Task';
		case 'NotebookEdit':
			return 'NotebookEdit';
		default:
			return name;
	}
}

function basename(path: string): string {
	return path.split('/').pop() || path;
}

export function parseClaudeSession(content: string): ParsedSession {
	const lines = content.split('\n').filter((l) => l.trim().length > 0);

	const context: SessionContext = { agentName: 'claude-code' };
	const timeline: TimelineEntry[] = [];
	const files: FileEntry[] = [];
	const seenFiles = new Set<string>();
	const totalTokens: TokenUsage = { input: 0, output: 0, reasoning: 0, cached: 0, total: 0 };
	let startTime: Date | undefined;
	let endTime: Date | undefined;
	let entryIndex = 0;

	// Buffers
	const pendingToolCalls = new Map<string, BufferedToolCall>();
	let pendingThinking: ThinkingBlock | undefined;

	for (const line of lines) {
		let entry: Record<string, unknown>;
		try {
			entry = JSON.parse(line);
		} catch {
			continue;
		}

		const entryType = entry.type as string;

		// Skip non-conversation entries before timestamp tracking
		// (e.g. file-history-snapshot has timestamp nested inside snapshot, not top-level)
		if (entryType === 'file-history-snapshot' || entryType === 'progress') {
			continue;
		}

		const timestamp = new Date(entry.timestamp as string);

		if (!isNaN(timestamp.getTime())) {
			if (!startTime || timestamp < startTime) startTime = timestamp;
			if (!endTime || timestamp > endTime) endTime = timestamp;
		}

		// Extract context from first entry with these fields
		if (!context.cwd && entry.cwd) {
			context.cwd = entry.cwd as string;
		}
		if (!context.gitBranch && entry.gitBranch) {
			context.gitBranch = entry.gitBranch as string;
		}
		if (!context.agentVersion && entry.version) {
			context.agentVersion = entry.version as string;
		}

		if (entryType === 'system') {
			const subtype = entry.subtype as string | undefined;
			const durationMs = entry.durationMs as number | undefined;
			if (subtype === 'turn_duration' && durationMs !== undefined) {
				const systemEntry: SystemEntry = {
					type: 'system',
					id: generateId(entryIndex++),
					timestamp,
					content: `Turn completed in ${(durationMs / 1000).toFixed(1)}s`
				};
				timeline.push(systemEntry);
			}
			continue;
		}

		const message = entry.message as Record<string, unknown> | undefined;
		if (!message) continue;

		if (entryType === 'user') {
			const msgContent = message.content;

			// Real user message: string content
			if (typeof msgContent === 'string') {
				const userEntry: UserEntry = {
					type: 'user',
					id: generateId(entryIndex++),
					timestamp,
					content: msgContent
				};
				timeline.push(userEntry);
				continue;
			}

			// Tool result: array content with tool_result blocks
			if (Array.isArray(msgContent)) {
				const toolUseResult = entry.toolUseResult as Record<string, unknown> | undefined;

				for (const block of msgContent as ContentBlock[]) {
					if (block.type !== 'tool_result') continue;

					const toolUseId = block.tool_use_id || '';
					const buffered = pendingToolCalls.get(toolUseId);
					if (!buffered) continue;

					const resultContent = typeof block.content === 'string' ? block.content : '';
					const toolName = buffered.name;

					// Build result metadata
					const resultMeta: ToolResultMeta = { output: resultContent };

					// Extract file info from toolUseResult
					if (toolUseResult) {
						if (toolUseResult.file && typeof toolUseResult.file === 'object') {
							const file = toolUseResult.file as Record<string, unknown>;
							const filePath = file.filePath as string | undefined;
							if (filePath) {
								resultMeta.files = [filePath];
								const numLines = file.numLines as number | undefined;
								if (numLines) {
									resultMeta.output = `${numLines} lines`;
								}
							}
						}
						// Edit result: has filePath, structuredPatch
						if (toolUseResult.filePath) {
							const filePath = toolUseResult.filePath as string;
							resultMeta.files = [filePath];
							if (toolUseResult.structuredPatch) {
								resultMeta.output = toolUseResult.structuredPatch as string;
							}
						}
						// Glob result
						if (toolUseResult.filenames) {
							const filenames = toolUseResult.filenames as string[];
							resultMeta.files = filenames;
							resultMeta.output = `${toolUseResult.numFiles} files`;
						}
					}

					// File tracking
					const filePath = (buffered.arguments.file_path as string) || '';
					if (filePath) {
						const isWrite = toolName === 'Edit' || toolName === 'Write';
						const operation = isWrite ? 'edited' : 'read';
						const fileKey = filePath + ':' + operation;
						if (!seenFiles.has(fileKey)) {
							seenFiles.add(fileKey);
							files.push({ path: filePath, operation });
						}
					}
					// Also track files from Edit toolUseResult
					if (toolUseResult?.filePath) {
						const editPath = toolUseResult.filePath as string;
						const fileKey = editPath + ':edited';
						if (!seenFiles.has(fileKey)) {
							seenFiles.add(fileKey);
							files.push({ path: editPath, operation: 'edited' });
						}
					}

					// Build summary
					let summary: string | undefined;
					if (filePath) {
						const name = basename(filePath);
						if (toolName === 'Read') {
							const file = toolUseResult?.file as Record<string, unknown> | undefined;
							const numLines = file?.numLines as number | undefined;
							summary = numLines
								? `file: ${name} // ${numLines} lines read`
								: `file: ${name}`;
						} else if (toolName === 'Edit') {
							summary = `file: ${name}`;
						} else {
							summary = `file: ${name}`;
						}
					} else if (toolName === 'Glob') {
						const numFiles = toolUseResult?.numFiles as number | undefined;
						summary = numFiles !== undefined ? `${numFiles} files found` : undefined;
					}

					const toolEntry: ToolCallEntry = {
						type: 'tool_call',
						id: generateId(entryIndex++),
						timestamp: buffered.timestamp,
						name: toolName,
						displayName: buffered.displayName,
						status: 'success',
						arguments: buffered.arguments,
						result: resultContent,
						resultMeta,
						summary
					};
					timeline.push(toolEntry);

					pendingToolCalls.delete(toolUseId);
				}
			}
			continue;
		}

		if (entryType === 'assistant') {
			const contentBlocks = (message.content as ContentBlock[]) || [];
			const usage = message.usage as Record<string, number> | undefined;
			const model = message.model as string | undefined;

			// Extract model from first assistant message
			if (model && !context.model) {
				context.model = model;
			}

			// Accumulate tokens
			if (usage) {
				const inputTokens = (usage.input_tokens || 0) + (usage.cache_creation_input_tokens || 0);
				const cachedTokens = usage.cache_read_input_tokens || 0;
				totalTokens.input = (totalTokens.input || 0) + inputTokens;
				totalTokens.output = (totalTokens.output || 0) + (usage.output_tokens || 0);
				totalTokens.cached = (totalTokens.cached || 0) + cachedTokens;
				totalTokens.total =
					(totalTokens.total || 0) + inputTokens + cachedTokens + (usage.output_tokens || 0);
			}

			for (const block of contentBlocks) {
				if (block.type === 'thinking') {
					const thinkingText = block.thinking || '';
					pendingThinking = {
						text: thinkingText,
						isEncrypted: false,
						subject: thinkingText.split('\n')[0].slice(0, 100) || undefined
					};
				} else if (block.type === 'text' && block.text && block.text.trim()) {
					const assistantEntry: AssistantEntry = {
						type: 'assistant',
						id: generateId(entryIndex++),
						timestamp,
						content: block.text,
						isIntermediate: false,
						thinking: pendingThinking,
						tokens: usage
							? {
									input:
										(usage.input_tokens || 0) +
										(usage.cache_creation_input_tokens || 0),
									output: usage.output_tokens,
									cached: usage.cache_read_input_tokens,
									total:
										(usage.input_tokens || 0) +
										(usage.cache_creation_input_tokens || 0) +
										(usage.cache_read_input_tokens || 0) +
										(usage.output_tokens || 0)
								}
							: undefined
					};
					timeline.push(assistantEntry);
					pendingThinking = undefined;
				} else if (block.type === 'tool_use') {
					const toolUseId = block.id || '';
					const toolName = block.name || 'unknown';
					pendingToolCalls.set(toolUseId, {
						toolUseId,
						name: toolName,
						displayName: extractToolDisplayName(toolName),
						arguments: block.input || {},
						timestamp
					});
				}
			}
		}
	}

	// Any tool calls that never got a result
	for (const [, tc] of pendingToolCalls) {
		const toolEntry: ToolCallEntry = {
			type: 'tool_call',
			id: generateId(entryIndex++),
			timestamp: tc.timestamp,
			name: tc.name,
			displayName: tc.displayName,
			status: 'aborted',
			arguments: tc.arguments
		};
		timeline.push(toolEntry);
	}

	const duration =
		startTime && endTime
			? Math.round((endTime.getTime() - startTime.getTime()) / 1000)
			: undefined;

	return {
		format: 'claude',
		context,
		startTime: startTime || new Date(),
		endTime,
		duration,
		timeline,
		totalTokens: totalTokens.total ? totalTokens : undefined,
		files
	};
}

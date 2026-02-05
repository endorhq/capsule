import type {
	ParsedSession,
	SessionContext,
	TimelineEntry,
	UserEntry,
	AssistantEntry,
	ToolCallEntry,
	FileEntry,
	TokenUsage,
	ThinkingBlock,
	ToolResultMeta
} from '$lib/types/timeline';

function generateId(index: number): string {
	return `entry-${index}`;
}

function extractToolDisplayName(name: string): string {
	switch (name) {
		case 'read_file':
			return 'ReadFile';
		case 'replace':
			return 'Edit';
		case 'list_directory':
			return 'ReadFolder';
		case 'run_command':
			return 'Shell';
		case 'write_file':
			return 'Write';
		default:
			return name.charAt(0).toUpperCase() + name.slice(1).replace(/_/g, '');
	}
}

function basename(path: string): string {
	return path.split('/').pop() || path;
}

export function parseGeminiSession(content: string): ParsedSession {
	const root = JSON.parse(content);

	const context: SessionContext = { agentName: 'gemini-cli' };
	const timeline: TimelineEntry[] = [];
	const files: FileEntry[] = [];
	const seenFiles = new Set<string>();
	const totalTokens: TokenUsage = { input: 0, output: 0, reasoning: 0, cached: 0, total: 0 };
	let entryIndex = 0;
	let model: string | undefined;

	const startTime = new Date(root.startTime);
	const endTime = root.lastUpdated ? new Date(root.lastUpdated) : undefined;

	const messages = root.messages as Array<Record<string, unknown>>;

	for (const msg of messages) {
		const msgType = msg.type as string;
		const timestamp = new Date(msg.timestamp as string);

		if (msgType === 'user') {
			const userEntry: UserEntry = {
				type: 'user',
				id: generateId(entryIndex++),
				timestamp,
				content: msg.content as string
			};
			timeline.push(userEntry);
			continue;
		}

		if (msgType !== 'gemini') continue;

		// Extract model from first gemini message
		if (!model && msg.model) {
			model = msg.model as string;
			context.model = model;
		}

		// Accumulate tokens
		const tokens = msg.tokens as Record<string, number> | undefined;
		if (tokens) {
			totalTokens.input = (totalTokens.input || 0) + (tokens.input || 0);
			totalTokens.output = (totalTokens.output || 0) + (tokens.output || 0);
			totalTokens.reasoning = (totalTokens.reasoning || 0) + (tokens.thoughts || 0);
			totalTokens.cached = (totalTokens.cached || 0) + (tokens.cached || 0);
			totalTokens.total = (totalTokens.total || 0) + (tokens.total || 0);
		}

		// Build thinking from thoughts[]
		const thoughts = msg.thoughts as Array<Record<string, string>> | undefined;
		let thinking: ThinkingBlock | undefined;
		if (thoughts && thoughts.length > 0) {
			const text = thoughts
				.map((t) => `**${t.subject}**\n${t.description}`)
				.join('\n\n');
			thinking = {
				text,
				isEncrypted: false,
				subject: thoughts[0].subject
			};
		}

		// Process tool calls (inline — call + result in same object)
		const toolCalls = msg.toolCalls as Array<Record<string, unknown>> | undefined;
		if (toolCalls && toolCalls.length > 0) {
			for (const tc of toolCalls) {
				const toolName = tc.name as string;
				const toolDisplayName = (tc.displayName as string) || extractToolDisplayName(toolName);
				const args = (tc.args as Record<string, unknown>) || {};
				const status = (tc.status as string) === 'success' ? 'success' : 'error';
				const tcTimestamp = tc.timestamp ? new Date(tc.timestamp as string) : timestamp;

				// Extract result content
				const resultArr = tc.result as Array<Record<string, unknown>> | undefined;
				let resultOutput = '';
				if (resultArr && resultArr.length > 0) {
					const funcResp = resultArr[0].functionResponse as Record<string, unknown> | undefined;
					if (funcResp?.response) {
						const resp = funcResp.response as Record<string, string>;
						resultOutput = resp.output || resp.error || '';
					}
				}

				// Build structured metadata
				const resultMeta: ToolResultMeta = { output: resultOutput };

				// Extract diff stats from resultDisplay
				const resultDisplay = tc.resultDisplay as Record<string, unknown> | undefined;
				if (resultDisplay && typeof resultDisplay === 'object' && resultDisplay.diffStat) {
					const diffStat = resultDisplay.diffStat as Record<string, number>;
					resultMeta.linesAdded = diffStat.model_added_lines;
					resultMeta.linesRemoved = diffStat.model_removed_lines;
					if (resultDisplay.filePath) {
						resultMeta.files = [resultDisplay.filePath as string];
					}
				}

				// File path from args
				const filePath = (args.file_path as string) || (args.path as string) || '';
				if (filePath) {
					resultMeta.files = resultMeta.files || [filePath];
				}

				// File tracking
				if (filePath) {
					const isWrite = toolName === 'replace' || toolName === 'write_file';
					const operation = isWrite ? 'edited' : 'read';
					const fileKey = filePath + ':' + operation;
					if (!seenFiles.has(fileKey)) {
						seenFiles.add(fileKey);
						const isNew = resultDisplay && typeof resultDisplay === 'object'
							? (resultDisplay as Record<string, unknown>).isNewFile === true
							: false;
						files.push({ path: filePath, operation, isNew: isNew || undefined });
					}
				}

				// Build summary
				let summary: string | undefined;
				if (filePath) {
					const name = basename(filePath);
					if (toolName === 'read_file') {
						const lineCount = resultOutput.split('\n').length;
						summary = `file: ${name} // ${lineCount} lines read`;
					} else if (toolName === 'replace') {
						const parts: string[] = [`file: ${name}`];
						if (resultMeta.linesAdded !== undefined || resultMeta.linesRemoved !== undefined) {
							parts.push(`+${resultMeta.linesAdded || 0} -${resultMeta.linesRemoved || 0}`);
						}
						summary = parts.join(' // ');
					} else if (toolName === 'list_directory') {
						summary = `dir: ${name}`;
					} else {
						summary = `file: ${name}`;
					}
				}

				// Use fileDiff as detailed result when available
				let detailedResult = resultOutput;
				if (resultDisplay && typeof resultDisplay === 'object' && resultDisplay.fileDiff) {
					detailedResult = resultDisplay.fileDiff as string;
				}

				const toolEntry: ToolCallEntry = {
					type: 'tool_call',
					id: generateId(entryIndex++),
					timestamp: tcTimestamp,
					name: toolName,
					displayName: toolDisplayName,
					status,
					arguments: args,
					result: detailedResult,
					resultMeta,
					summary
				};
				timeline.push(toolEntry);
			}
		}

		// Assistant text content (may coexist with tool calls, or be standalone)
		const msgContent = (msg.content as string) || '';
		if (msgContent.trim()) {
			const assistantEntry: AssistantEntry = {
				type: 'assistant',
				id: generateId(entryIndex++),
				timestamp,
				content: msgContent,
				isIntermediate: false,
				thinking,
				tokens: tokens
					? {
							input: tokens.input,
							output: tokens.output,
							reasoning: tokens.thoughts,
							cached: tokens.cached,
							total: tokens.total
						}
					: undefined
			};
			timeline.push(assistantEntry);
		} else if (thinking && (!toolCalls || toolCalls.length === 0)) {
			// Thinking-only message with no content or tools — surface the thinking
			const assistantEntry: AssistantEntry = {
				type: 'assistant',
				id: generateId(entryIndex++),
				timestamp,
				content: thinking.subject || '(thinking)',
				isIntermediate: true,
				thinking
			};
			timeline.push(assistantEntry);
		}
	}

	context.agentName = 'gemini-cli';

	const duration =
		startTime && endTime
			? Math.round((endTime.getTime() - startTime.getTime()) / 1000)
			: undefined;

	return {
		format: 'gemini',
		context,
		startTime,
		endTime,
		duration,
		timeline,
		totalTokens: totalTokens.total ? totalTokens : undefined,
		files
	};
}

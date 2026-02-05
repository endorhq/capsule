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

interface BufferedCall {
	name: string;
	arguments: Record<string, unknown>;
	timestamp: Date;
	input?: string;
}

function generateId(index: number): string {
	return `entry-${index}`;
}

function extractFilesFromPatch(input: string): FileEntry[] {
	const files: FileEntry[] = [];
	const regex = /\*\*\* Update File: (.+)/g;
	let match;
	while ((match = regex.exec(input)) !== null) {
		const path = match[1].trim();
		files.push({ path, operation: 'edited' });
	}
	return files;
}

function extractToolDisplayName(name: string): string {
	switch (name) {
		case 'exec_command':
			return 'Shell';
		case 'apply_patch':
			return 'Patch';
		default:
			return name;
	}
}

function extractToolSummary(name: string, args: Record<string, unknown>, result?: string): string | undefined {
	if (name === 'exec_command' && args.cmd) {
		return `$ ${args.cmd}`;
	}
	if (name === 'apply_patch' && typeof args === 'object') {
		// Try to extract file path from the patch input
		const input = typeof result === 'string' ? result : '';
		const fileMatch = input.match(/Updated the following files:\n(.+)/);
		if (fileMatch) return fileMatch[1].trim();
	}
	return undefined;
}

function determineToolStatus(output: string): 'success' | 'error' | 'pending' | 'aborted' {
	if (!output) return 'pending';
	try {
		const parsed = JSON.parse(output);
		if (parsed.metadata?.exit_code === 0) return 'success';
		if (parsed.metadata?.exit_code !== undefined && parsed.metadata.exit_code !== 0) return 'error';
		if (parsed.output?.includes('Success')) return 'success';
	} catch {
		// Not JSON output
	}

	if (output.includes('failed') || output.includes('error') || output.includes('Rejected')) {
		return 'error';
	}
	if (output.includes('Process exited with code 0') || output.includes('Success')) {
		return 'success';
	}
	return 'success';
}

function parseResultMeta(name: string, args: Record<string, unknown>, output: string): ToolResultMeta {
	const meta: ToolResultMeta = {};

	if (name === 'exec_command') {
		meta.command = args.cmd as string | undefined;

		// Parse structured exec_command output:
		// "Chunk ID: ...\nWall time: ...\nProcess exited with code X\nOriginal token count: ...\nOutput:\n..."
		const exitMatch = output.match(/Process exited with code (\d+)/);
		if (exitMatch) meta.exitCode = parseInt(exitMatch[1], 10);

		const wallMatch = output.match(/Wall time: ([\d.]+) seconds/);
		if (wallMatch) meta.duration = `${parseFloat(wallMatch[1]).toFixed(2)}s`;

		const outputMatch = output.match(/Output:\n([\s\S]*)/);
		if (outputMatch) {
			meta.output = outputMatch[1];
		} else {
			meta.output = output;
		}
	} else if (name === 'apply_patch') {
		// JSON result: { output: "Success. Updated...\nM file1\nM file2\n", metadata: { exit_code, duration_seconds } }
		try {
			const parsed = JSON.parse(output);
			if (parsed.metadata?.exit_code !== undefined) meta.exitCode = parsed.metadata.exit_code;
			if (parsed.metadata?.duration_seconds !== undefined) {
				meta.duration = `${parsed.metadata.duration_seconds.toFixed(2)}s`;
			}
			const outStr = (parsed.output as string) || '';
			meta.output = outStr;
			const fileMatches = outStr.match(/[MAD] (.+)/g);
			if (fileMatches) {
				meta.files = fileMatches.map((m: string) => m.replace(/^[MAD]\s+/, '').trim());
			}
		} catch {
			meta.output = output;
		}
	} else {
		meta.output = output;
	}

	return meta;
}

export function parseCodexSession(content: string): ParsedSession {
	const lines = content.split('\n').filter((l) => l.trim().length > 0);

	const context: SessionContext = { agentName: 'codex' };
	const timeline: TimelineEntry[] = [];
	const files: FileEntry[] = [];
	const seenFiles = new Set<string>();
	let totalTokens: TokenUsage | undefined;
	let startTime: Date | undefined;
	let endTime: Date | undefined;
	let entryIndex = 0;

	// Buffers for matching call/output pairs
	const pendingCalls = new Map<string, BufferedCall>();
	let pendingThinking: ThinkingBlock | null = null;
	let modelExtracted = false;

	for (const line of lines) {
		let entry: Record<string, unknown>;
		try {
			entry = JSON.parse(line);
		} catch {
			continue;
		}

		const timestamp = new Date(entry.timestamp as string);
		if (!startTime || timestamp < startTime) startTime = timestamp;
		if (!endTime || timestamp > endTime) endTime = timestamp;

		const type = entry.type as string;
		const payload = entry.payload as Record<string, unknown> | undefined;
		if (!payload) continue;

		switch (type) {
			case 'session_meta': {
				context.cwd = payload.cwd as string | undefined;
				context.agentVersion = payload.cli_version as string | undefined;
				const originator = payload.originator as string | undefined;
				if (originator) {
					context.agentName = originator.replace(/_/g, ' ').replace(/\bcli\b/i, 'CLI').trim();
				}
				const git = payload.git as Record<string, unknown> | undefined;
				if (git) {
					context.gitBranch = git.branch as string | undefined;
					context.gitRepo = git.repository_url as string | undefined;
				}
				break;
			}

			case 'turn_context': {
				if (!modelExtracted && payload.model) {
					context.model = payload.model as string;
					modelExtracted = true;
				}
				break;
			}

			case 'event_msg': {
				const eventType = payload.type as string;

				if (eventType === 'user_message') {
					const userEntry: UserEntry = {
						type: 'user',
						id: generateId(entryIndex++),
						timestamp,
						content: payload.message as string
					};
					timeline.push(userEntry);
				} else if (eventType === 'token_count') {
					const info = payload.info as Record<string, unknown> | null;
					if (info?.total_token_usage) {
						const usage = info.total_token_usage as Record<string, number>;
						totalTokens = {
							input: usage.input_tokens,
							output: usage.output_tokens,
							reasoning: usage.reasoning_output_tokens,
							cached: usage.cached_input_tokens,
							total: usage.total_tokens
						};
					}
				} else if (eventType === 'turn_aborted') {
					const systemEntry: SystemEntry = {
						type: 'system',
						id: generateId(entryIndex++),
						timestamp,
						content: `Turn aborted: ${(payload.reason as string) || 'unknown reason'}`
					};
					timeline.push(systemEntry);
				}
				// Skip agent_message, agent_reasoning (redundant with response_items)
				break;
			}

			case 'response_item': {
				const itemType = payload.type as string;
				const role = payload.role as string | undefined;

				if (itemType === 'message') {
					const contentArr = payload.content as Array<Record<string, unknown>> | undefined;
					const text = contentArr
						?.map((c) => (c.text as string) || (c.type === 'output_text' ? (c.text as string) : ''))
						.filter(Boolean)
						.join('\n') || '';

					if (role === 'developer') {
						// System/developer message
						const systemEntry: SystemEntry = {
							type: 'system',
							id: generateId(entryIndex++),
							timestamp,
							content: text.slice(0, 500) + (text.length > 500 ? '...' : '')
						};
						timeline.push(systemEntry);
					} else if (role === 'assistant') {
						const phase = payload.phase as string | undefined;
						// In Codex, commentary messages ARE the visible conversation
						// (progress updates shown to the user). Only mark as intermediate
						// if the message is truly redundant — which none of the standard
						// phases are. Reserve isIntermediate for future use / other formats.
						const isIntermediate = false;
						const isFinal = phase === 'final_answer';

						const assistantEntry: AssistantEntry = {
							type: 'assistant',
							id: generateId(entryIndex++),
							timestamp,
							content: text,
							isIntermediate,
							thinking: pendingThinking || undefined,
							isFinal
						};
						pendingThinking = null;
						timeline.push(assistantEntry);
					}
					// Skip role === 'user' response_items (system injections like AGENTS.md)
				} else if (itemType === 'reasoning') {
					const summaryArr = payload.summary as Array<Record<string, unknown>> | undefined;
					const summaryText = summaryArr
						?.map((s) => s.text as string)
						.filter(Boolean)
						.join('\n') || '';
					const hasEncrypted = !!(payload.encrypted_content as string);

					pendingThinking = {
						text: summaryText || undefined,
						isEncrypted: hasEncrypted,
						subject: summaryText || undefined
					};
				} else if (itemType === 'function_call' || itemType === 'custom_tool_call') {
					const callId = payload.call_id as string;
					const name = payload.name as string;
					let args: Record<string, unknown> = {};
					try {
						args = JSON.parse(payload.arguments as string || '{}');
					} catch {
						args = { raw: payload.arguments };
					}

					pendingCalls.set(callId, {
						name,
						arguments: args,
						timestamp,
						input: payload.input as string | undefined
					});

					// Extract files from apply_patch input
					if (name === 'apply_patch') {
						const patchInput = (payload.input as string) || '';
						const patchFiles = extractFilesFromPatch(patchInput);
						for (const f of patchFiles) {
							if (!seenFiles.has(f.path + ':' + f.operation)) {
								seenFiles.add(f.path + ':' + f.operation);
								files.push(f);
							}
						}
					}
				} else if (itemType === 'function_call_output' || itemType === 'custom_tool_call_output') {
					const callId = payload.call_id as string;
					const output = (payload.output as string) || '';
					const buffered = pendingCalls.get(callId);

					if (buffered) {
						pendingCalls.delete(callId);
						const status = determineToolStatus(output);
						const resultMeta = parseResultMeta(buffered.name, buffered.arguments, output);
						const toolEntry: ToolCallEntry = {
							type: 'tool_call',
							id: generateId(entryIndex++),
							timestamp: buffered.timestamp,
							name: buffered.name,
							displayName: extractToolDisplayName(buffered.name),
							status,
							arguments: buffered.arguments,
							result: output,
							resultMeta,
							summary: extractToolSummary(buffered.name, buffered.arguments, output)
						};
						timeline.push(toolEntry);

						// Extract files from apply_patch output
						if (buffered.name === 'apply_patch') {
							try {
								const parsed = JSON.parse(output);
								const outStr = parsed.output as string || '';
								const fileMatches = outStr.match(/M (.+)/g);
								if (fileMatches) {
									for (const m of fileMatches) {
										const filePath = m.replace(/^M\s+/, '').trim();
										const key = filePath + ':edited';
										if (!seenFiles.has(key)) {
											seenFiles.add(key);
											// Check if we already have this file
											const existing = files.find((f) => f.path === filePath);
											if (!existing) {
												files.push({ path: filePath, operation: 'edited' });
											}
										}
									}
								}
							} catch {
								// ignore
							}
						}
					} else {
						// Orphaned output, still add as tool call
						const toolEntry: ToolCallEntry = {
							type: 'tool_call',
							id: generateId(entryIndex++),
							timestamp,
							name: 'unknown',
							status: determineToolStatus(output),
							arguments: {},
							result: output
						};
						timeline.push(toolEntry);
					}
				}
				break;
			}
		}
	}

	// Mark any still-pending calls as aborted
	for (const [, buffered] of pendingCalls) {
		const toolEntry: ToolCallEntry = {
			type: 'tool_call',
			id: generateId(entryIndex++),
			timestamp: buffered.timestamp,
			name: buffered.name,
			displayName: extractToolDisplayName(buffered.name),
			status: 'aborted',
			arguments: buffered.arguments
		};
		timeline.push(toolEntry);
	}

	const duration =
		startTime && endTime
			? Math.round((endTime.getTime() - startTime.getTime()) / 1000)
			: undefined;

	return {
		format: 'codex',
		context,
		startTime: startTime || new Date(),
		endTime,
		duration,
		timeline,
		totalTokens,
		files
	};
}

import type { ParsedSession } from '$lib/types/timeline';
import type { AgentFormat } from '$lib/types/timeline';
import { detectFormat } from './detect';
import { parseCodexSession } from './codex';
import { parseCopilotSession } from './copilot';
import { parseGeminiSession } from './gemini';

export { detectFormat } from './detect';
export { parseCodexSession } from './codex';
export { parseCopilotSession } from './copilot';
export { parseGeminiSession } from './gemini';

export function parseSession(
	content: string,
	fileFormat: 'json' | 'jsonl',
	knownFormat?: AgentFormat
): ParsedSession {
	const format = knownFormat && knownFormat !== 'unknown' ? knownFormat : detectFormat(content, fileFormat);

	switch (format) {
		case 'codex':
			return parseCodexSession(content);
		case 'copilot':
			return parseCopilotSession(content);
		case 'gemini':
			return parseGeminiSession(content);
		case 'claude':
		case 'opencode':
			throw new Error(`Parser for "${format}" is not yet implemented`);
		default:
			throw new Error(`Unknown session format: "${format}"`);
	}
}

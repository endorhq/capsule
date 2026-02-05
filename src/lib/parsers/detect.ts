import type { AgentFormat } from '$lib/types/timeline';

export function detectFormat(content: string, fileFormat: 'json' | 'jsonl'): AgentFormat {
	if (fileFormat === 'json') {
		try {
			const parsed = JSON.parse(content);
			if (parsed.messages && Array.isArray(parsed.messages) && parsed.projectHash) {
				return 'gemini';
			}
		} catch {
			// ignore parse errors
		}
		return 'unknown';
	}

	// JSONL: parse first 10 non-empty lines
	const lines = content.split('\n').filter((l) => l.trim().length > 0);
	const sample = lines.slice(0, 10);

	for (const line of sample) {
		try {
			const entry = JSON.parse(line);

			// Codex: session_meta with originator containing "codex"
			if (
				entry.type === 'session_meta' &&
				entry.payload?.originator?.toLowerCase().includes('codex')
			) {
				return 'codex';
			}

			// Copilot: session.start event
			if (entry.type === 'session.start') {
				return 'copilot';
			}

			// Claude: has sessionId + type in known set
			if (
				entry.sessionId &&
				['user', 'assistant', 'file-history-snapshot'].includes(entry.type)
			) {
				return 'claude';
			}
		} catch {
			// skip malformed lines
		}
	}

	return 'unknown';
}

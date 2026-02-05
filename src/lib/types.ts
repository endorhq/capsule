import type { AgentFormat } from './types/timeline';

export interface SessionMeta {
	id: string;
	name: string;
	filename: string;
	format: 'jsonl' | 'json';
	size: number;
	uploadedAt: number;
	stepCount: number;
	agentFormat?: AgentFormat;
}

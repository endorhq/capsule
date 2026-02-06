import type { AgentFormat } from './types/timeline';

export type SessionSource =
	| { type: 'local' }
	| { type: 'gist'; gistId: string; gistUrl: string; owner?: string };

export interface SessionMeta {
	id: string;
	name: string;
	filename: string;
	format: 'jsonl' | 'json';
	size: number;
	uploadedAt: number;
	stepCount: number;
	agentFormat?: AgentFormat;
	source?: SessionSource; // undefined = local (backward compatible)
}

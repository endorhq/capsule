export type AgentFormat = 'claude' | 'codex' | 'copilot' | 'gemini' | 'opencode' | 'unknown';

export interface SessionContext {
	cwd?: string;
	gitBranch?: string;
	gitRepo?: string;
	model?: string;
	agentName: string;
	agentVersion?: string;
}

export interface FileEntry {
	path: string;
	operation: 'read' | 'edited';
	isNew?: boolean;
}

export interface TokenUsage {
	input?: number;
	output?: number;
	reasoning?: number;
	cached?: number;
	total?: number;
}

export interface ThinkingBlock {
	text?: string;
	isEncrypted: boolean;
	subject?: string;
}

export interface UserEntry {
	type: 'user';
	id: string;
	timestamp: Date;
	content: string;
}

export interface AssistantEntry {
	type: 'assistant';
	id: string;
	timestamp: Date;
	content: string;
	isIntermediate: boolean;
	isFinal?: boolean;
	thinking?: ThinkingBlock;
	tokens?: TokenUsage;
}

export interface ToolResultMeta {
	exitCode?: number;
	duration?: string;
	command?: string;
	files?: string[];
	output?: string;
	linesAdded?: number;
	linesRemoved?: number;
}

export interface ToolCallEntry {
	type: 'tool_call';
	id: string;
	timestamp: Date;
	name: string;
	displayName?: string;
	status: 'success' | 'error' | 'pending' | 'aborted';
	arguments: Record<string, unknown>;
	result?: string;
	resultMeta?: ToolResultMeta;
	summary?: string;
}

export interface SystemEntry {
	type: 'system';
	id: string;
	timestamp: Date;
	content: string;
}

export type TimelineEntry = UserEntry | AssistantEntry | ToolCallEntry | SystemEntry;

export interface ParsedSession {
	format: AgentFormat;
	context: SessionContext;
	startTime: Date;
	endTime?: Date;
	duration?: number;
	timeline: TimelineEntry[];
	totalTokens?: TokenUsage;
	totalCost?: number;
	files: FileEntry[];
}

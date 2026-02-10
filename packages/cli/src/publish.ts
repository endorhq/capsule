import { execFile } from 'node:child_process';
import { writeFile, unlink, mkdtemp } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { promisify } from 'node:util';
import type { AgentFormat } from '@endorhq/capsule-shared/types/timeline';

const exec = promisify(execFile);

const VIEWER_URL = 'https://capsule.endor.dev';

export interface PublishResult {
	gistUrl: string;
	gistId: string;
	viewerUrl: string;
}

/**
 * Check if `gh` CLI is installed and authenticated.
 */
export async function checkGhAuth(): Promise<{ ok: boolean; error?: string }> {
	try {
		await exec('gh', ['auth', 'status']);
		return { ok: true };
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		if (msg.includes('not found') || msg.includes('ENOENT')) {
			return { ok: false, error: 'gh CLI is not installed. Install it from https://cli.github.com/' };
		}
		return { ok: false, error: 'gh CLI is not authenticated. Run `gh auth login` first.' };
	}
}

function getFileExtension(format: AgentFormat): string {
	return format === 'gemini' ? '.json' : '.jsonl';
}

function getFileName(format: AgentFormat): string {
	return `${format}-session${getFileExtension(format)}`;
}

/**
 * Publish content as a GitHub Gist and return the viewer URL.
 */
export async function publishGist(
	content: string,
	format: AgentFormat,
	options: { public: boolean; description?: string }
): Promise<PublishResult> {
	const tempDir = await mkdtemp(join(tmpdir(), 'capsule-'));
	const fileName = getFileName(format);
	const tempFile = join(tempDir, fileName);

	try {
		await writeFile(tempFile, content, 'utf-8');

		const args = ['gist', 'create', tempFile];
		if (options.description) {
			args.push('--desc', options.description);
		}
		if (options.public) {
			args.push('--public');
		}

		const { stdout } = await exec('gh', args);
		const gistUrl = stdout.trim();

		// Extract gist ID from URL (last path segment)
		const gistId = gistUrl.split('/').pop() || '';
		const viewerUrl = `${VIEWER_URL}?gist=${gistId}`;

		return { gistUrl, gistId, viewerUrl };
	} finally {
		try {
			await unlink(tempFile);
		} catch {
			// ignore cleanup errors
		}
	}
}

/**
 * Save anonymized content to a local file.
 */
export async function saveToFile(content: string, outputPath: string): Promise<void> {
	await writeFile(outputPath, content, 'utf-8');
}

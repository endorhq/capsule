export interface GistFile {
	filename: string;
	content: string;
	size: number;
	truncated: boolean;
	raw_url: string;
}

export interface GistMetadata {
	id: string;
	url: string;
	owner?: string;
	description?: string;
}

export interface GistLoadResult {
	metadata: GistMetadata;
	files: GistFile[];
}

export interface GistError {
	type: 'invalid_url' | 'not_found' | 'no_files' | 'rate_limit' | 'network';
	message: string;
}

/**
 * Parse various gist URL formats and extract the gist ID.
 *
 * Supported formats:
 * - https://gist.github.com/user/abc123
 * - https://gist.github.com/abc123
 * - user/abc123
 * - abc123
 */
export function parseGistUrl(input: string): string | null {
	const trimmed = input.trim();
	if (!trimmed) return null;

	// Full URL format: https://gist.github.com/user/abc123 or https://gist.github.com/abc123
	const urlMatch = trimmed.match(/^https?:\/\/gist\.github\.com\/(?:[\w-]+\/)?([a-f0-9]+)/i);
	if (urlMatch) {
		return urlMatch[1];
	}

	// user/gistId format
	const slashMatch = trimmed.match(/^[\w-]+\/([a-f0-9]+)$/i);
	if (slashMatch) {
		return slashMatch[1];
	}

	// Pure gist ID (hexadecimal string)
	if (/^[a-f0-9]+$/i.test(trimmed)) {
		return trimmed;
	}

	return null;
}

/**
 * Fetch a gist from GitHub API and return its metadata and files.
 */
export async function fetchGist(gistId: string): Promise<GistLoadResult> {
	const apiUrl = `https://api.github.com/gists/${gistId}`;

	let response: Response;
	try {
		response = await fetch(apiUrl, {
			headers: {
				Accept: 'application/vnd.github.v3+json'
			}
		});
	} catch {
		throw createGistError('network', 'Failed to fetch gist');
	}

	if (response.status === 404) {
		throw createGistError('not_found', 'Gist not found. Make sure the gist is public.');
	}

	if (response.status === 403) {
		const remaining = response.headers.get('X-RateLimit-Remaining');
		if (remaining === '0') {
			throw createGistError('rate_limit', 'GitHub API rate limit exceeded. Try again later.');
		}
	}

	if (!response.ok) {
		throw createGistError('network', `Failed to fetch gist: ${response.status}`);
	}

	const data = await response.json();

	const metadata: GistMetadata = {
		id: data.id,
		url: data.html_url,
		owner: data.owner?.login,
		description: data.description
	};

	// Filter for .json and .jsonl files only
	const rawFiles = data.files as Record<
		string,
		{
			filename: string;
			size: number;
			truncated: boolean;
			raw_url: string;
			content?: string;
		}
	>;

	const validFiles = Object.values(rawFiles).filter(
		(f) => f.filename.endsWith('.json') || f.filename.endsWith('.jsonl')
	);

	if (validFiles.length === 0) {
		throw createGistError('no_files', 'No .json or .jsonl files found in this gist');
	}

	// Fetch content for each file (some may be truncated)
	const files: GistFile[] = await Promise.all(
		validFiles.map(async (f) => {
			let content = f.content ?? '';

			// If truncated, fetch the full content via raw_url
			if (f.truncated || !content) {
				try {
					const rawResponse = await fetch(f.raw_url);
					if (rawResponse.ok) {
						content = await rawResponse.text();
					}
				} catch {
					// Use whatever content we have
				}
			}

			return {
				filename: f.filename,
				content,
				size: f.size,
				truncated: f.truncated,
				raw_url: f.raw_url
			};
		})
	);

	return { metadata, files };
}

function createGistError(type: GistError['type'], message: string): GistError {
	return { type, message };
}

export function isGistError(error: unknown): error is GistError {
	return (
		typeof error === 'object' &&
		error !== null &&
		'type' in error &&
		'message' in error &&
		['invalid_url', 'not_found', 'no_files', 'rate_limit', 'network'].includes(
			(error as GistError).type
		)
	);
}

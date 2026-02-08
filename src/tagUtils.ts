import { App, TFile, CachedMetadata } from 'obsidian';

/**
 * Check if frontmatter tags contain a specific tag (with nested tag support).
 */
export function hasFrontmatterTag(fmTags: unknown, tag: string): boolean {
	if (!fmTags) return false;

	if (Array.isArray(fmTags)) {
		return fmTags.some((t) => {
			const tagStr = typeof t === 'string' ? t : String(t);
			return tagStr === tag || tagStr.startsWith(tag + '/');
		});
	}

	if (typeof fmTags === 'string') {
		return fmTags === tag || fmTags.startsWith(tag + '/');
	}

	return false;
}

/**
 * Check if a file's cached metadata contains a specific tag (inline or frontmatter).
 */
export function fileHasTag(fileCache: CachedMetadata | null, tag: string): boolean {
	if (!fileCache) return false;

	const hasInlineTag = fileCache.tags?.some((t) => {
		const tagName = t.tag.substring(1);
		return tagName === tag || tagName.startsWith(tag + '/');
	}) ?? false;

	const hasFmTag = hasFrontmatterTag(fileCache.frontmatter?.tags, tag);

	return hasInlineTag || hasFmTag;
}

/**
 * Get all files in the vault that contain a specific tag.
 */
export function getFilesForTag(app: App, tag: string): TFile[] {
	const files: TFile[] = [];

	for (const file of app.vault.getMarkdownFiles()) {
		const fileCache = app.metadataCache.getFileCache(file);
		if (fileHasTag(fileCache, tag)) {
			files.push(file);
		}
	}

	return files;
}

/**
 * Get the count of files that contain a specific tag.
 */
export function getFileCountForTag(app: App, tag: string): number {
	let count = 0;

	for (const file of app.vault.getMarkdownFiles()) {
		const fileCache = app.metadataCache.getFileCache(file);
		if (fileHasTag(fileCache, tag)) {
			count++;
		}
	}

	return count;
}

/**
 * Collect all unique tags from the vault (inline + frontmatter), sorted alphabetically.
 */
export function getAllTags(app: App): string[] {
	const tags = new Set<string>();

	for (const file of app.vault.getMarkdownFiles()) {
		const fileCache = app.metadataCache.getFileCache(file);
		if (fileCache?.tags) {
			for (const tagObj of fileCache.tags) {
				tags.add(tagObj.tag.substring(1));
			}
		}
		if (fileCache?.frontmatter?.tags) {
			const fmTags = fileCache.frontmatter.tags;
			if (Array.isArray(fmTags)) {
				for (const tag of fmTags) {
					tags.add(typeof tag === 'string' ? tag : String(tag));
				}
			} else if (typeof fmTags === 'string') {
				tags.add(fmTags);
			}
		}
	}

	return Array.from(tags).sort((a, b) => a.localeCompare(b));
}

import { ItemView, WorkspaceLeaf, TFile, setIcon } from 'obsidian';
import type TagNavigatorPlugin from './main';
import { VIEW_TYPE_TAG_NAVIGATOR } from './types';

interface TagNode {
	name: string;
	fullPath: string;
	files: TFile[];
	children: Map<string, TagNode>;
}

export class TagNavigatorView extends ItemView {
	plugin: TagNavigatorPlugin;
	private contentEl: HTMLElement;
	private expandedTags: Set<string> = new Set();

	constructor(leaf: WorkspaceLeaf, plugin: TagNavigatorPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return VIEW_TYPE_TAG_NAVIGATOR;
	}

	getDisplayText(): string {
		return 'Tag Navigator';
	}

	getIcon(): string {
		return 'tags';
	}

	async onOpen(): Promise<void> {
		const container = this.containerEl.children[1];
		container.empty();
		container.addClass('tag-navigator-container');

		// Header
		const header = container.createDiv({ cls: 'tag-navigator-header' });
		header.createEl('span', { text: 'Tag Navigator', cls: 'tag-navigator-title' });

		// Refresh button
		const refreshBtn = header.createEl('button', { cls: 'tag-navigator-refresh' });
		setIcon(refreshBtn, 'refresh-cw');
		refreshBtn.setAttribute('aria-label', 'Refresh');
		refreshBtn.addEventListener('click', () => this.refresh());

		// Content area
		this.contentEl = container.createDiv({ cls: 'tag-navigator-content' });

		this.refresh();
	}

	async onClose(): Promise<void> {
		// Cleanup if needed
	}

	public refresh(): void {
		this.contentEl.empty();

		const selectedTags = this.plugin.settings.selectedTags;

		if (selectedTags.length === 0) {
			this.renderEmptyState();
			return;
		}

		const tagTree = this.buildTagTree(selectedTags);
		this.renderTagTree(tagTree, this.contentEl);
	}

	private renderEmptyState(): void {
		const emptyState = this.contentEl.createDiv({ cls: 'tag-navigator-empty' });
		emptyState.createEl('p', { text: 'No tags selected.' });
		emptyState.createEl('p', {
			text: 'Go to Settings → Tag Navigator to select tags to display.',
			cls: 'tag-navigator-empty-hint',
		});

		const settingsBtn = emptyState.createEl('button', { text: 'Open Settings' });
		settingsBtn.addEventListener('click', () => {
			// Open settings tab
			const setting = (this.app as any).setting;
			if (setting) {
				setting.open();
				setting.openTabById('tag-navigator');
			}
		});
	}

	private buildTagTree(selectedTags: string[]): Map<string, TagNode> {
		const rootNodes = new Map<string, TagNode>();

		for (const tag of selectedTags) {
			const files = this.getFilesForTag(tag);

			if (this.plugin.settings.showNestedTags && tag.includes('/')) {
				// Handle nested tags
				const parts = tag.split('/');
				let currentLevel = rootNodes;
				let currentPath = '';

				for (let i = 0; i < parts.length; i++) {
					const part = parts[i];
					currentPath = currentPath ? `${currentPath}/${part}` : part;

					if (!currentLevel.has(part)) {
						currentLevel.set(part, {
							name: part,
							fullPath: currentPath,
							files: [],
							children: new Map(),
						});
					}

					const node = currentLevel.get(part)!;

					// If this is the final part, add the files
					if (i === parts.length - 1) {
						node.files = files;
					}

					currentLevel = node.children;
				}
			} else {
				// Flat tag
				rootNodes.set(tag, {
					name: tag,
					fullPath: tag,
					files: files,
					children: new Map(),
				});
			}
		}

		// Sort the tree
		return this.sortTagNodes(rootNodes);
	}

	private sortTagNodes(nodes: Map<string, TagNode>): Map<string, TagNode> {
		const entries = Array.from(nodes.entries());

		if (this.plugin.settings.sortOrder === 'count') {
			entries.sort((a, b) => {
				const countA = this.getTotalFileCount(a[1]);
				const countB = this.getTotalFileCount(b[1]);
				return countB - countA;
			});
		} else {
			entries.sort((a, b) => a[0].localeCompare(b[0]));
		}

		const sorted = new Map<string, TagNode>();
		for (const [key, node] of entries) {
			node.children = this.sortTagNodes(node.children);
			sorted.set(key, node);
		}

		return sorted;
	}

	private getTotalFileCount(node: TagNode): number {
		let count = node.files.length;
		for (const child of node.children.values()) {
			count += this.getTotalFileCount(child);
		}
		return count;
	}

	private renderTagTree(nodes: Map<string, TagNode>, container: HTMLElement): void {
		for (const node of nodes.values()) {
			this.renderTagNode(node, container);
		}
	}

	private renderTagNode(node: TagNode, container: HTMLElement): void {
		const hasChildren = node.children.size > 0;
		const hasFiles = node.files.length > 0;
		const isExpandable = hasChildren || hasFiles;
		const isExpanded = this.expandedTags.has(node.fullPath);

		// Tag item container
		const tagItem = container.createDiv({ cls: 'tag-navigator-item' });

		// Tag header (clickable row)
		const tagHeader = tagItem.createDiv({ cls: 'tag-navigator-item-header' });

		// Collapse/expand icon
		const collapseIcon = tagHeader.createSpan({ cls: 'tag-navigator-collapse-icon' });
		if (isExpandable) {
			setIcon(collapseIcon, isExpanded ? 'chevron-down' : 'chevron-right');
			collapseIcon.addClass('is-clickable');
		} else {
			collapseIcon.addClass('is-placeholder');
		}

		// Tag icon
		const tagIcon = tagHeader.createSpan({ cls: 'tag-navigator-tag-icon' });
		setIcon(tagIcon, 'hash');

		// Tag name
		const tagName = tagHeader.createSpan({ cls: 'tag-navigator-tag-name' });
		tagName.setText(node.name);

		// File count badge
		const totalCount = this.getTotalFileCount(node);
		if (totalCount > 0) {
			const countBadge = tagHeader.createSpan({ cls: 'tag-navigator-count' });
			countBadge.setText(String(totalCount));
		}

		// Click handler for expand/collapse
		if (isExpandable) {
			tagHeader.addEventListener('click', (e) => {
				e.preventDefault();
				if (isExpanded) {
					this.expandedTags.delete(node.fullPath);
				} else {
					this.expandedTags.add(node.fullPath);
				}
				this.refresh();
			});
			tagHeader.addClass('is-clickable');
		}

		// Children container (only if expanded)
		if (isExpanded && isExpandable) {
			const childrenContainer = tagItem.createDiv({ cls: 'tag-navigator-children' });

			// Render child tags first
			if (hasChildren) {
				this.renderTagTree(node.children, childrenContainer);
			}

			// Then render files
			if (hasFiles) {
				const sortedFiles = this.sortFiles(node.files);
				for (const file of sortedFiles) {
					this.renderFileItem(file, childrenContainer);
				}
			}
		}
	}

	private renderFileItem(file: TFile, container: HTMLElement): void {
		const fileItem = container.createDiv({ cls: 'tag-navigator-file' });

		// File icon
		const fileIcon = fileItem.createSpan({ cls: 'tag-navigator-file-icon' });
		setIcon(fileIcon, 'file-text');

		// File name
		const fileName = fileItem.createSpan({ cls: 'tag-navigator-file-name' });
		fileName.setText(file.basename);

		// Click to open file
		fileItem.addEventListener('click', (e) => {
			e.preventDefault();
			this.app.workspace.getLeaf(false).openFile(file);
		});

		// Right-click context menu
		fileItem.addEventListener('contextmenu', (e) => {
			e.preventDefault();
			const menu = new (require('obsidian').Menu)();

			menu.addItem((item: any) => {
				item.setTitle('Open in new tab')
					.setIcon('file-plus')
					.onClick(() => {
						this.app.workspace.getLeaf('tab').openFile(file);
					});
			});

			menu.addItem((item: any) => {
				item.setTitle('Open to the right')
					.setIcon('separator-vertical')
					.onClick(() => {
						this.app.workspace.getLeaf('split').openFile(file);
					});
			});

			menu.addItem((item: any) => {
				item.setTitle('Reveal in file explorer')
					.setIcon('folder')
					.onClick(() => {
						const fileExplorer = this.app.workspace.getLeavesOfType('file-explorer')[0];
						if (fileExplorer) {
							(fileExplorer.view as any).revealInFolder(file);
						}
					});
			});

			menu.showAtMouseEvent(e);
		});

		fileItem.addClass('is-clickable');
	}

	private getFilesForTag(tag: string): TFile[] {
		const files: TFile[] = [];
		const cache = this.app.metadataCache;

		for (const file of this.app.vault.getMarkdownFiles()) {
			const fileCache = cache.getFileCache(file);

			// Check inline tags
			const hasInlineTag = fileCache?.tags?.some((t) => {
				const tagName = t.tag.substring(1); // Remove #
				return tagName === tag || tagName.startsWith(tag + '/');
			});

			// Check frontmatter tags
			const hasFrontmatterTag = this.checkFrontmatterTag(fileCache?.frontmatter?.tags, tag);

			if (hasInlineTag || hasFrontmatterTag) {
				files.push(file);
			}
		}

		return files;
	}

	private checkFrontmatterTag(fmTags: unknown, tag: string): boolean {
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

	private sortFiles(files: TFile[]): TFile[] {
		return files.sort((a, b) => {
			if (this.plugin.settings.sortOrder === 'alphabetical') {
				return a.basename.localeCompare(b.basename);
			} else {
				// Sort by modification time (newest first) for 'count' mode
				return b.stat.mtime - a.stat.mtime;
			}
		});
	}
}

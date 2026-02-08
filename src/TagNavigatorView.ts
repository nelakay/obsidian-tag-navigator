import { ItemView, WorkspaceLeaf, TFile, Menu, MenuItem, setIcon } from 'obsidian';
import type TagNavigatorPlugin from './main';
import { VIEW_TYPE_TAG_NAVIGATOR } from './types';
import { getFilesForTag } from './tagUtils';

interface TagNode {
	name: string;
	fullPath: string;
	files: TFile[];
	children: Map<string, TagNode>;
}

export class TagNavigatorView extends ItemView {
	plugin: TagNavigatorPlugin;
	private tagContentEl: HTMLElement;
	private expandedTags: Set<string> = new Set();
	private filterQuery = '';

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

		// Search/filter bar
		const searchContainer = container.createDiv({ cls: 'tag-navigator-search' });
		const searchInput = searchContainer.createEl('input', {
			type: 'text',
			placeholder: 'Filter tags and files...',
			cls: 'tag-navigator-search-input',
		});
		searchInput.addEventListener('input', () => {
			this.filterQuery = searchInput.value.toLowerCase();
			this.renderContent();
		});

		// Content area
		this.tagContentEl = container.createDiv({ cls: 'tag-navigator-content' });

		this.refresh();
	}

	async onClose(): Promise<void> {
		// Cleanup
	}

	public refresh(): void {
		this.renderContent();
	}

	private renderContent(): void {
		this.tagContentEl.empty();

		const selectedTags = this.plugin.settings.selectedTags;

		if (selectedTags.length === 0) {
			this.renderEmptyState();
			return;
		}

		const tagTree = this.buildTagTree(selectedTags);
		const filteredTree = this.filterQuery ? this.filterTree(tagTree) : tagTree;

		if (filteredTree.size === 0 && this.filterQuery) {
			const noResults = this.tagContentEl.createDiv({ cls: 'tag-navigator-empty' });
			noResults.createEl('p', { text: 'No tags match your filter.' });
			return;
		}

		this.renderTagTree(filteredTree, this.tagContentEl);
	}

	private renderEmptyState(): void {
		const emptyState = this.tagContentEl.createDiv({ cls: 'tag-navigator-empty' });
		emptyState.createEl('p', { text: 'No tags selected.' });
		emptyState.createEl('p', {
			text: 'Go to Settings \u2192 Tag Navigator to select tags to display.',
			cls: 'tag-navigator-empty-hint',
		});

		const settingsBtn = emptyState.createEl('button', { text: 'Open Settings' });
		settingsBtn.addEventListener('click', () => {
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
			const files = getFilesForTag(this.app, tag);

			if (this.plugin.settings.showNestedTags && tag.includes('/')) {
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

					if (i === parts.length - 1) {
						node.files = files;
					}

					currentLevel = node.children;
				}
			} else {
				rootNodes.set(tag, {
					name: tag,
					fullPath: tag,
					files: files,
					children: new Map(),
				});
			}
		}

		return this.sortTagNodes(rootNodes);
	}

	private filterTree(nodes: Map<string, TagNode>): Map<string, TagNode> {
		const filtered = new Map<string, TagNode>();

		for (const [key, node] of nodes) {
			const nameMatches = node.name.toLowerCase().includes(this.filterQuery);
			const filteredChildren = this.filterTree(node.children);
			const matchingFiles = node.files.filter(f =>
				f.basename.toLowerCase().includes(this.filterQuery)
			);

			if (nameMatches || filteredChildren.size > 0 || matchingFiles.length > 0) {
				filtered.set(key, {
					...node,
					children: nameMatches ? node.children : filteredChildren,
					files: nameMatches ? node.files : matchingFiles,
				});
			}
		}

		return filtered;
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

		const tagItem = container.createDiv({ cls: 'tag-navigator-item' });
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
				this.renderContent();
			});
			tagHeader.addClass('is-clickable');
		}

		// Right-click context menu on tags
		tagHeader.addEventListener('contextmenu', (e) => {
			e.preventDefault();
			const menu = new Menu();

			if (isExpandable) {
				menu.addItem((item: MenuItem) => {
					item.setTitle(isExpanded ? 'Collapse' : 'Expand')
						.setIcon(isExpanded ? 'chevron-right' : 'chevron-down')
						.onClick(() => {
							if (isExpanded) {
								this.expandedTags.delete(node.fullPath);
							} else {
								this.expandedTags.add(node.fullPath);
							}
							this.renderContent();
						});
				});
			}

			menu.addItem((item: MenuItem) => {
				item.setTitle('Expand all under this tag')
					.setIcon('chevrons-down-up')
					.onClick(() => {
						this.expandAll(node);
						this.renderContent();
					});
			});

			menu.addItem((item: MenuItem) => {
				item.setTitle('Collapse all under this tag')
					.setIcon('chevrons-up-down')
					.onClick(() => {
						this.collapseAll(node);
						this.renderContent();
					});
			});

			menu.addSeparator();

			menu.addItem((item: MenuItem) => {
				item.setTitle('Remove from navigator')
					.setIcon('x')
					.onClick(async () => {
						this.plugin.settings.selectedTags =
							this.plugin.settings.selectedTags.filter(t => t !== node.fullPath);
						await this.plugin.saveSettings();
					});
			});

			menu.showAtMouseEvent(e);
		});

		// Children container (only if expanded)
		if (isExpanded && isExpandable) {
			const childrenContainer = tagItem.createDiv({ cls: 'tag-navigator-children' });

			if (hasChildren) {
				this.renderTagTree(node.children, childrenContainer);
			}

			if (hasFiles) {
				const sortedFiles = this.sortFiles(node.files);
				for (const file of sortedFiles) {
					this.renderFileItem(file, childrenContainer);
				}
			}
		}
	}

	private expandAll(node: TagNode): void {
		this.expandedTags.add(node.fullPath);
		for (const child of node.children.values()) {
			this.expandAll(child);
		}
	}

	private collapseAll(node: TagNode): void {
		this.expandedTags.delete(node.fullPath);
		for (const child of node.children.values()) {
			this.collapseAll(child);
		}
	}

	private renderFileItem(file: TFile, container: HTMLElement): void {
		const fileItem = container.createDiv({ cls: 'tag-navigator-file' });

		const fileIcon = fileItem.createSpan({ cls: 'tag-navigator-file-icon' });
		setIcon(fileIcon, 'file-text');

		const fileName = fileItem.createSpan({ cls: 'tag-navigator-file-name' });
		fileName.setText(file.basename);

		fileItem.addEventListener('click', (e) => {
			e.preventDefault();
			this.app.workspace.getLeaf(false).openFile(file);
		});

		fileItem.addEventListener('contextmenu', (e) => {
			e.preventDefault();
			const menu = new Menu();

			menu.addItem((item: MenuItem) => {
				item.setTitle('Open in new tab')
					.setIcon('file-plus')
					.onClick(() => {
						this.app.workspace.getLeaf('tab').openFile(file);
					});
			});

			menu.addItem((item: MenuItem) => {
				item.setTitle('Open to the right')
					.setIcon('separator-vertical')
					.onClick(() => {
						this.app.workspace.getLeaf('split').openFile(file);
					});
			});

			menu.addItem((item: MenuItem) => {
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

	private sortFiles(files: TFile[]): TFile[] {
		return [...files].sort((a, b) => {
			if (this.plugin.settings.sortOrder === 'alphabetical') {
				return a.basename.localeCompare(b.basename);
			} else {
				return b.stat.mtime - a.stat.mtime;
			}
		});
	}
}

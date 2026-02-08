import { App, PluginSettingTab, Setting } from 'obsidian';
import type TagNavigatorPlugin from './main';

export class TagNavigatorSettingTab extends PluginSettingTab {
	plugin: TagNavigatorPlugin;

	constructor(app: App, plugin: TagNavigatorPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h2', { text: 'Tag Navigator Settings' });

		// Get all tags from the vault
		const allTags = this.getAllTags();

		// Tag selection section
		containerEl.createEl('h3', { text: 'Select Tags to Display' });
		containerEl.createEl('p', {
			text: 'Choose which tags should appear in the Tag Navigator sidebar.',
			cls: 'setting-item-description',
		});

		// Quick actions
		new Setting(containerEl)
			.setName('Quick Actions')
			.addButton((btn) =>
				btn.setButtonText('Select All').onClick(async () => {
					this.plugin.settings.selectedTags = [...allTags];
					await this.plugin.saveSettings();
					this.display();
				})
			)
			.addButton((btn) =>
				btn.setButtonText('Clear All').onClick(async () => {
					this.plugin.settings.selectedTags = [];
					await this.plugin.saveSettings();
					this.display();
				})
			);

		// Search/filter for tags
		const searchContainer = containerEl.createDiv({ cls: 'tag-search-container' });
		const searchInput = searchContainer.createEl('input', {
			type: 'text',
			placeholder: 'Filter tags...',
			cls: 'tag-search-input',
		});

		// Tag list container
		const tagListContainer = containerEl.createDiv({ cls: 'tag-list-container' });

		const renderTagList = (filter: string = '') => {
			tagListContainer.empty();

			const filteredTags = allTags.filter((tag) =>
				tag.toLowerCase().includes(filter.toLowerCase())
			);

			if (filteredTags.length === 0) {
				tagListContainer.createEl('p', {
					text: filter ? 'No tags match your filter.' : 'No tags found in vault.',
					cls: 'tag-empty-message',
				});
				return;
			}

			for (const tag of filteredTags) {
				const isSelected = this.plugin.settings.selectedTags.includes(tag);

				new Setting(tagListContainer)
					.setName(tag)
					.setDesc(`${this.getFileCountForTag(tag)} notes`)
					.addToggle((toggle) =>
						toggle.setValue(isSelected).onChange(async (value) => {
							if (value) {
								if (!this.plugin.settings.selectedTags.includes(tag)) {
									this.plugin.settings.selectedTags.push(tag);
								}
							} else {
								this.plugin.settings.selectedTags =
									this.plugin.settings.selectedTags.filter((t) => t !== tag);
							}
							await this.plugin.saveSettings();
						})
					);
			}
		};

		searchInput.addEventListener('input', () => {
			renderTagList(searchInput.value);
		});

		renderTagList();

		// Additional settings
		containerEl.createEl('h3', { text: 'Display Options' });

		new Setting(containerEl)
			.setName('Show nested tags')
			.setDesc('Display nested tags (e.g., #parent/child) in a hierarchical structure')
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.showNestedTags).onChange(async (value) => {
					this.plugin.settings.showNestedTags = value;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName('Sort order')
			.setDesc('How to sort tags and files in the navigator')
			.addDropdown((dropdown) =>
				dropdown
					.addOption('alphabetical', 'Alphabetical')
					.addOption('count', 'By file count')
					.setValue(this.plugin.settings.sortOrder)
					.onChange(async (value: 'alphabetical' | 'count') => {
						this.plugin.settings.sortOrder = value;
						await this.plugin.saveSettings();
					})
			);
	}

	private getAllTags(): string[] {
		const tags = new Set<string>();
		const cache = this.app.metadataCache;

		for (const file of this.app.vault.getMarkdownFiles()) {
			const fileCache = cache.getFileCache(file);
			if (fileCache?.tags) {
				for (const tagObj of fileCache.tags) {
					// Remove the # prefix for storage
					tags.add(tagObj.tag.substring(1));
				}
			}
			// Also check frontmatter tags
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

	private getFileCountForTag(tag: string): number {
		let count = 0;
		const cache = this.app.metadataCache;

		for (const file of this.app.vault.getMarkdownFiles()) {
			const fileCache = cache.getFileCache(file);
			const hasInlineTag = fileCache?.tags?.some(
				(t) => t.tag.substring(1) === tag || t.tag.substring(1).startsWith(tag + '/')
			);
			const hasfrontmatterTag = this.hasFrontmatterTag(fileCache?.frontmatter?.tags, tag);

			if (hasInlineTag || hasfrontmatterTag) {
				count++;
			}
		}

		return count;
	}

	private hasFrontmatterTag(fmTags: unknown, tag: string): boolean {
		if (!fmTags) return false;

		if (Array.isArray(fmTags)) {
			return fmTags.some(
				(t) => t === tag || (typeof t === 'string' && t.startsWith(tag + '/'))
			);
		}

		if (typeof fmTags === 'string') {
			return fmTags === tag || fmTags.startsWith(tag + '/');
		}

		return false;
	}
}

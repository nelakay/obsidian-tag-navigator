import { App, PluginSettingTab, Setting } from 'obsidian';
import type TagNavigatorPlugin from './main';
import { getAllTags, getFileCountForTag } from './tagUtils';

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

		const allTags = getAllTags(this.app);

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
					.setDesc(`${getFileCountForTag(this.app, tag)} notes`)
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

		// Display options
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

		new Setting(containerEl)
			.setName('Auto-open on startup')
			.setDesc('Automatically open the Tag Navigator sidebar when Obsidian starts')
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.autoOpen).onChange(async (value) => {
					this.plugin.settings.autoOpen = value;
					await this.plugin.saveSettings();
				})
			);
	}
}

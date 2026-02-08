import { Notice, Plugin, debounce } from 'obsidian';
import { TagNavigatorView } from './TagNavigatorView';
import { TagNavigatorSettingTab } from './SettingsTab';
import { TagNavigatorSettings, DEFAULT_SETTINGS, VIEW_TYPE_TAG_NAVIGATOR } from './types';
import { getAllTags } from './tagUtils';

export default class TagNavigatorPlugin extends Plugin {
	settings: TagNavigatorSettings;
	private view: TagNavigatorView | null = null;

	private debouncedRefresh = debounce(() => {
		this.refreshView();
	}, 300, true);

	async onload(): Promise<void> {
		try {
			await this.loadSettings();
		} catch {
			new Notice('Tag Navigator: Failed to load settings, using defaults.');
			this.settings = { ...DEFAULT_SETTINGS };
		}

		this.registerView(VIEW_TYPE_TAG_NAVIGATOR, (leaf) => {
			this.view = new TagNavigatorView(leaf, this);
			return this.view;
		});

		this.addRibbonIcon('tags', 'Open Tag Navigator', () => {
			this.activateView();
		});

		this.addCommand({
			id: 'open-tag-navigator',
			name: 'Open Tag Navigator',
			callback: () => {
				this.activateView();
			},
		});

		this.addCommand({
			id: 'refresh-tag-navigator',
			name: 'Refresh Tag Navigator',
			callback: () => {
				this.refreshView();
			},
		});

		this.addSettingTab(new TagNavigatorSettingTab(this.app, this));

		this.registerEvent(
			this.app.metadataCache.on('changed', () => {
				this.debouncedRefresh();
			})
		);

		this.registerEvent(
			this.app.vault.on('delete', () => {
				this.debouncedRefresh();
			})
		);

		this.registerEvent(
			this.app.vault.on('rename', () => {
				this.debouncedRefresh();
			})
		);

		this.app.workspace.onLayoutReady(() => {
			if (this.settings.autoOpen &&
				this.app.workspace.getLeavesOfType(VIEW_TYPE_TAG_NAVIGATOR).length === 0) {
				this.activateView();
			}
		});
	}

	onunload(): void {
		this.app.workspace.detachLeavesOfType(VIEW_TYPE_TAG_NAVIGATOR);
	}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
		this.refreshView();
	}

	async activateView(): Promise<void> {
		const { workspace } = this.app;

		let leaf = workspace.getLeavesOfType(VIEW_TYPE_TAG_NAVIGATOR)[0];

		if (!leaf) {
			const rightLeaf = workspace.getRightLeaf(false);
			if (rightLeaf) {
				await rightLeaf.setViewState({
					type: VIEW_TYPE_TAG_NAVIGATOR,
					active: true,
				});
				leaf = rightLeaf;
			}
		}

		if (leaf) {
			workspace.revealLeaf(leaf);
		}
	}

	private refreshView(): void {
		this.pruneStaleSelectedTags();
		if (this.view) {
			this.view.refresh();
		}
	}

	private pruneStaleSelectedTags(): void {
		const vaultTags = new Set(getAllTags(this.app));
		const before = this.settings.selectedTags.length;
		this.settings.selectedTags = this.settings.selectedTags.filter(
			tag => vaultTags.has(tag)
		);
		if (this.settings.selectedTags.length !== before) {
			this.saveData(this.settings);
		}
	}
}

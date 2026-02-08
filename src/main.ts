import { Plugin } from 'obsidian';
import { TagNavigatorView } from './TagNavigatorView';
import { TagNavigatorSettingTab } from './SettingsTab';
import { TagNavigatorSettings, DEFAULT_SETTINGS, VIEW_TYPE_TAG_NAVIGATOR } from './types';

export default class TagNavigatorPlugin extends Plugin {
	settings: TagNavigatorSettings;
	private view: TagNavigatorView | null = null;

	async onload(): Promise<void> {
		await this.loadSettings();

		// Register the custom view
		this.registerView(VIEW_TYPE_TAG_NAVIGATOR, (leaf) => {
			this.view = new TagNavigatorView(leaf, this);
			return this.view;
		});

		// Add ribbon icon to open the view
		this.addRibbonIcon('tags', 'Open Tag Navigator', () => {
			this.activateView();
		});

		// Add command to open the view
		this.addCommand({
			id: 'open-tag-navigator',
			name: 'Open Tag Navigator',
			callback: () => {
				this.activateView();
			},
		});

		// Add command to refresh the view
		this.addCommand({
			id: 'refresh-tag-navigator',
			name: 'Refresh Tag Navigator',
			callback: () => {
				this.refreshView();
			},
		});

		// Register settings tab
		this.addSettingTab(new TagNavigatorSettingTab(this.app, this));

		// Listen to metadata changes to refresh the view
		this.registerEvent(
			this.app.metadataCache.on('changed', () => {
				this.refreshView();
			})
		);

		// Listen to file deletions
		this.registerEvent(
			this.app.vault.on('delete', () => {
				this.refreshView();
			})
		);

		// Listen to file renames
		this.registerEvent(
			this.app.vault.on('rename', () => {
				this.refreshView();
			})
		);

		// Auto-open the view in the right sidebar on startup (if it was open before)
		this.app.workspace.onLayoutReady(() => {
			if (this.app.workspace.getLeavesOfType(VIEW_TYPE_TAG_NAVIGATOR).length === 0) {
				// Optionally auto-open - commented out by default
				// this.activateView();
			}
		});
	}

	onunload(): void {
		// Cleanup: detach all leaves of this view type
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
			// Open in the right sidebar
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
		if (this.view) {
			this.view.refresh();
		}
	}
}

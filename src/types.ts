export interface TagNavigatorSettings {
	selectedTags: string[];
	showNestedTags: boolean;
	sortOrder: 'alphabetical' | 'count';
}

export const DEFAULT_SETTINGS: TagNavigatorSettings = {
	selectedTags: [],
	showNestedTags: true,
	sortOrder: 'alphabetical',
};

export const VIEW_TYPE_TAG_NAVIGATOR = 'tag-navigator-view';

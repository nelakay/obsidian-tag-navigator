export interface TagNavigatorSettings {
	selectedTags: string[];
	showNestedTags: boolean;
	sortOrder: 'alphabetical' | 'count';
	autoOpen: boolean;
}

export const DEFAULT_SETTINGS: TagNavigatorSettings = {
	selectedTags: [],
	showNestedTags: true,
	sortOrder: 'alphabetical',
	autoOpen: false,
};

export const VIEW_TYPE_TAG_NAVIGATOR = 'tag-navigator-view';

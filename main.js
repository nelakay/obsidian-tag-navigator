var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => TagNavigatorPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian3 = require("obsidian");

// src/TagNavigatorView.ts
var import_obsidian = require("obsidian");

// src/types.ts
var DEFAULT_SETTINGS = {
  selectedTags: [],
  showNestedTags: true,
  sortOrder: "alphabetical",
  autoOpen: false,
  hideParentFiles: false
};
var VIEW_TYPE_TAG_NAVIGATOR = "tag-navigator-view";

// src/tagUtils.ts
function hasFrontmatterTag(fmTags, tag) {
  if (!fmTags)
    return false;
  if (Array.isArray(fmTags)) {
    return fmTags.some((t) => {
      const tagStr = typeof t === "string" ? t : String(t);
      return tagStr === tag || tagStr.startsWith(tag + "/");
    });
  }
  if (typeof fmTags === "string") {
    return fmTags === tag || fmTags.startsWith(tag + "/");
  }
  return false;
}
function fileHasTag(fileCache, tag) {
  var _a, _b, _c;
  if (!fileCache)
    return false;
  const hasInlineTag = (_b = (_a = fileCache.tags) == null ? void 0 : _a.some((t) => {
    const tagName = t.tag.substring(1);
    return tagName === tag || tagName.startsWith(tag + "/");
  })) != null ? _b : false;
  const hasFmTag = hasFrontmatterTag((_c = fileCache.frontmatter) == null ? void 0 : _c.tags, tag);
  return hasInlineTag || hasFmTag;
}
function getFilesForTag(app, tag) {
  const files = [];
  for (const file of app.vault.getMarkdownFiles()) {
    const fileCache = app.metadataCache.getFileCache(file);
    if (fileHasTag(fileCache, tag)) {
      files.push(file);
    }
  }
  return files;
}
function getFileCountForTag(app, tag) {
  let count = 0;
  for (const file of app.vault.getMarkdownFiles()) {
    const fileCache = app.metadataCache.getFileCache(file);
    if (fileHasTag(fileCache, tag)) {
      count++;
    }
  }
  return count;
}
function getAllTags(app) {
  var _a;
  const tags = /* @__PURE__ */ new Set();
  for (const file of app.vault.getMarkdownFiles()) {
    const fileCache = app.metadataCache.getFileCache(file);
    if (fileCache == null ? void 0 : fileCache.tags) {
      for (const tagObj of fileCache.tags) {
        tags.add(tagObj.tag.substring(1));
      }
    }
    if ((_a = fileCache == null ? void 0 : fileCache.frontmatter) == null ? void 0 : _a.tags) {
      const fmTags = fileCache.frontmatter.tags;
      if (Array.isArray(fmTags)) {
        for (const tag of fmTags) {
          tags.add(typeof tag === "string" ? tag : String(tag));
        }
      } else if (typeof fmTags === "string") {
        tags.add(fmTags);
      }
    }
  }
  return Array.from(tags).sort((a, b) => a.localeCompare(b));
}

// src/TagNavigatorView.ts
var TagNavigatorView = class extends import_obsidian.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.expandedTags = /* @__PURE__ */ new Set();
    this.filterQuery = "";
    this.activeFilePath = null;
    this.plugin = plugin;
  }
  getViewType() {
    return VIEW_TYPE_TAG_NAVIGATOR;
  }
  getDisplayText() {
    return "Tag Navigator";
  }
  getIcon() {
    return "tags";
  }
  async onOpen() {
    const container = this.containerEl.children[1];
    container.empty();
    container.addClass("tag-navigator-container");
    const header = container.createDiv({ cls: "tag-navigator-header" });
    header.createEl("span", { text: "Tag Navigator", cls: "tag-navigator-title" });
    const refreshBtn = header.createEl("button", { cls: "tag-navigator-refresh" });
    (0, import_obsidian.setIcon)(refreshBtn, "refresh-cw");
    refreshBtn.setAttribute("aria-label", "Refresh");
    refreshBtn.addEventListener("click", () => this.refresh());
    const searchContainer = container.createDiv({ cls: "tag-navigator-search" });
    const searchInput = searchContainer.createEl("input", {
      type: "text",
      placeholder: "Filter tags and files...",
      cls: "tag-navigator-search-input"
    });
    searchInput.addEventListener("input", () => {
      this.filterQuery = searchInput.value.toLowerCase();
      this.renderContent();
    });
    this.tagContentEl = container.createDiv({ cls: "tag-navigator-content" });
    this.refresh();
  }
  async onClose() {
  }
  refresh() {
    var _a, _b;
    this.activeFilePath = (_b = (_a = this.app.workspace.getActiveFile()) == null ? void 0 : _a.path) != null ? _b : null;
    this.renderContent();
  }
  updateActiveFile() {
    var _a, _b;
    const newPath = (_b = (_a = this.app.workspace.getActiveFile()) == null ? void 0 : _a.path) != null ? _b : null;
    if (newPath === this.activeFilePath)
      return;
    this.activeFilePath = newPath;
    const fileItems = this.tagContentEl.querySelectorAll(".tag-navigator-file");
    fileItems.forEach((el) => {
      const path = el.getAttribute("data-path");
      el.toggleClass("is-active", path === this.activeFilePath);
    });
  }
  renderContent() {
    this.tagContentEl.empty();
    const selectedTags = this.plugin.settings.selectedTags;
    if (selectedTags.length === 0) {
      this.renderEmptyState();
      return;
    }
    const tagTree = this.buildTagTree(selectedTags);
    const filteredTree = this.filterQuery ? this.filterTree(tagTree) : tagTree;
    if (filteredTree.size === 0 && this.filterQuery) {
      const noResults = this.tagContentEl.createDiv({ cls: "tag-navigator-empty" });
      noResults.createEl("p", { text: "No tags match your filter." });
      return;
    }
    this.renderTagTree(filteredTree, this.tagContentEl);
  }
  renderEmptyState() {
    const emptyState = this.tagContentEl.createDiv({ cls: "tag-navigator-empty" });
    emptyState.createEl("p", { text: "No tags selected." });
    emptyState.createEl("p", {
      text: "Go to Settings \u2192 Tag Navigator to select tags to display.",
      cls: "tag-navigator-empty-hint"
    });
    const settingsBtn = emptyState.createEl("button", { text: "Open Settings" });
    settingsBtn.addEventListener("click", () => {
      const setting = this.app.setting;
      if (setting) {
        setting.open();
        setting.openTabById("tag-navigator");
      }
    });
  }
  buildTagTree(selectedTags) {
    const rootNodes = /* @__PURE__ */ new Map();
    for (const tag of selectedTags) {
      const files = getFilesForTag(this.app, tag);
      if (this.plugin.settings.showNestedTags && tag.includes("/")) {
        const parts = tag.split("/");
        let currentLevel = rootNodes;
        let currentPath = "";
        for (let i = 0; i < parts.length; i++) {
          const part = parts[i];
          currentPath = currentPath ? `${currentPath}/${part}` : part;
          if (!currentLevel.has(part)) {
            currentLevel.set(part, {
              name: part,
              fullPath: currentPath,
              files: [],
              children: /* @__PURE__ */ new Map()
            });
          }
          const node = currentLevel.get(part);
          if (i === parts.length - 1) {
            node.files = files;
          }
          currentLevel = node.children;
        }
      } else {
        rootNodes.set(tag, {
          name: tag,
          fullPath: tag,
          files,
          children: /* @__PURE__ */ new Map()
        });
      }
    }
    return this.sortTagNodes(rootNodes);
  }
  filterTree(nodes) {
    const filtered = /* @__PURE__ */ new Map();
    for (const [key, node] of nodes) {
      const nameMatches = node.name.toLowerCase().includes(this.filterQuery);
      const filteredChildren = this.filterTree(node.children);
      const matchingFiles = node.files.filter(
        (f) => f.basename.toLowerCase().includes(this.filterQuery)
      );
      if (nameMatches || filteredChildren.size > 0 || matchingFiles.length > 0) {
        filtered.set(key, {
          ...node,
          children: nameMatches ? node.children : filteredChildren,
          files: nameMatches ? node.files : matchingFiles
        });
      }
    }
    return filtered;
  }
  sortTagNodes(nodes) {
    const entries = Array.from(nodes.entries());
    if (this.plugin.settings.sortOrder === "count") {
      entries.sort((a, b) => {
        const countA = this.getTotalFileCount(a[1]);
        const countB = this.getTotalFileCount(b[1]);
        return countB - countA;
      });
    } else {
      entries.sort((a, b) => a[0].localeCompare(b[0]));
    }
    const sorted = /* @__PURE__ */ new Map();
    for (const [key, node] of entries) {
      node.children = this.sortTagNodes(node.children);
      sorted.set(key, node);
    }
    return sorted;
  }
  getTotalFileCount(node) {
    let count = node.files.length;
    for (const child of node.children.values()) {
      count += this.getTotalFileCount(child);
    }
    return count;
  }
  renderTagTree(nodes, container) {
    for (const node of nodes.values()) {
      this.renderTagNode(node, container);
    }
  }
  renderTagNode(node, container) {
    const hasChildren = node.children.size > 0;
    const hasFiles = node.files.length > 0;
    const isExpandable = hasChildren || hasFiles;
    const isExpanded = this.expandedTags.has(node.fullPath);
    const tagItem = container.createDiv({ cls: "tag-navigator-item" });
    const tagHeader = tagItem.createDiv({ cls: "tag-navigator-item-header" });
    const collapseIcon = tagHeader.createSpan({ cls: "tag-navigator-collapse-icon" });
    if (isExpandable) {
      (0, import_obsidian.setIcon)(collapseIcon, isExpanded ? "chevron-down" : "chevron-right");
      collapseIcon.addClass("is-clickable");
    } else {
      collapseIcon.addClass("is-placeholder");
    }
    const tagIcon = tagHeader.createSpan({ cls: "tag-navigator-tag-icon" });
    (0, import_obsidian.setIcon)(tagIcon, "hash");
    const tagName = tagHeader.createSpan({ cls: "tag-navigator-tag-name" });
    tagName.setText(node.name);
    const totalCount = this.getTotalFileCount(node);
    if (totalCount > 0) {
      const countBadge = tagHeader.createSpan({ cls: "tag-navigator-count" });
      countBadge.setText(String(totalCount));
    }
    if (isExpandable) {
      tagHeader.addEventListener("click", (e) => {
        e.preventDefault();
        if (isExpanded) {
          this.expandedTags.delete(node.fullPath);
        } else {
          this.expandedTags.add(node.fullPath);
        }
        this.renderContent();
      });
      tagHeader.addClass("is-clickable");
    }
    tagHeader.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      const menu = new import_obsidian.Menu();
      if (isExpandable) {
        menu.addItem((item) => {
          item.setTitle(isExpanded ? "Collapse" : "Expand").setIcon(isExpanded ? "chevron-right" : "chevron-down").onClick(() => {
            if (isExpanded) {
              this.expandedTags.delete(node.fullPath);
            } else {
              this.expandedTags.add(node.fullPath);
            }
            this.renderContent();
          });
        });
      }
      menu.addItem((item) => {
        item.setTitle("Expand all under this tag").setIcon("chevrons-down-up").onClick(() => {
          this.expandAll(node);
          this.renderContent();
        });
      });
      menu.addItem((item) => {
        item.setTitle("Collapse all under this tag").setIcon("chevrons-up-down").onClick(() => {
          this.collapseAll(node);
          this.renderContent();
        });
      });
      menu.addSeparator();
      menu.addItem((item) => {
        item.setTitle("Remove from navigator").setIcon("x").onClick(async () => {
          this.plugin.settings.selectedTags = this.plugin.settings.selectedTags.filter((t) => t !== node.fullPath);
          await this.plugin.saveSettings();
        });
      });
      menu.showAtMouseEvent(e);
    });
    if (isExpanded && isExpandable) {
      const childrenContainer = tagItem.createDiv({ cls: "tag-navigator-children" });
      if (hasChildren) {
        this.renderTagTree(node.children, childrenContainer);
      }
      const hideFiles = this.plugin.settings.hideParentFiles && hasChildren;
      if (hasFiles && !hideFiles) {
        const sortedFiles = this.sortFiles(node.files);
        for (const file of sortedFiles) {
          this.renderFileItem(file, childrenContainer);
        }
      }
    }
  }
  expandAll(node) {
    this.expandedTags.add(node.fullPath);
    for (const child of node.children.values()) {
      this.expandAll(child);
    }
  }
  collapseAll(node) {
    this.expandedTags.delete(node.fullPath);
    for (const child of node.children.values()) {
      this.collapseAll(child);
    }
  }
  renderFileItem(file, container) {
    const fileItem = container.createDiv({ cls: "tag-navigator-file" });
    fileItem.setAttribute("data-path", file.path);
    if (file.path === this.activeFilePath) {
      fileItem.addClass("is-active");
    }
    const fileIcon = fileItem.createSpan({ cls: "tag-navigator-file-icon" });
    (0, import_obsidian.setIcon)(fileIcon, "file-text");
    const fileName = fileItem.createSpan({ cls: "tag-navigator-file-name" });
    fileName.setText(file.basename);
    fileItem.addEventListener("click", (e) => {
      e.preventDefault();
      this.app.workspace.getLeaf(false).openFile(file);
    });
    fileItem.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      const menu = new import_obsidian.Menu();
      menu.addItem((item) => {
        item.setTitle("Open in new tab").setIcon("file-plus").onClick(() => {
          this.app.workspace.getLeaf("tab").openFile(file);
        });
      });
      menu.addItem((item) => {
        item.setTitle("Open to the right").setIcon("separator-vertical").onClick(() => {
          this.app.workspace.getLeaf("split").openFile(file);
        });
      });
      menu.addItem((item) => {
        item.setTitle("Reveal in file explorer").setIcon("folder").onClick(() => {
          const fileExplorer = this.app.workspace.getLeavesOfType("file-explorer")[0];
          if (fileExplorer) {
            fileExplorer.view.revealInFolder(file);
          }
        });
      });
      menu.showAtMouseEvent(e);
    });
    fileItem.addClass("is-clickable");
  }
  sortFiles(files) {
    return [...files].sort((a, b) => {
      if (this.plugin.settings.sortOrder === "alphabetical") {
        return a.basename.localeCompare(b.basename);
      } else {
        return b.stat.mtime - a.stat.mtime;
      }
    });
  }
};

// src/SettingsTab.ts
var import_obsidian2 = require("obsidian");
var TagNavigatorSettingTab = class extends import_obsidian2.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Tag Navigator Settings" });
    const allTags = getAllTags(this.app);
    containerEl.createEl("h3", { text: "Select Tags to Display" });
    containerEl.createEl("p", {
      text: "Choose which tags should appear in the Tag Navigator sidebar.",
      cls: "setting-item-description"
    });
    new import_obsidian2.Setting(containerEl).setName("Quick Actions").addButton(
      (btn) => btn.setButtonText("Select All").onClick(async () => {
        this.plugin.settings.selectedTags = [...allTags];
        await this.plugin.saveSettings();
        this.display();
      })
    ).addButton(
      (btn) => btn.setButtonText("Clear All").onClick(async () => {
        this.plugin.settings.selectedTags = [];
        await this.plugin.saveSettings();
        this.display();
      })
    );
    const searchContainer = containerEl.createDiv({ cls: "tag-search-container" });
    const searchInput = searchContainer.createEl("input", {
      type: "text",
      placeholder: "Filter tags...",
      cls: "tag-search-input"
    });
    const tagListContainer = containerEl.createDiv({ cls: "tag-list-container" });
    const renderTagList = (filter = "") => {
      tagListContainer.empty();
      const filteredTags = allTags.filter(
        (tag) => tag.toLowerCase().includes(filter.toLowerCase())
      );
      if (filteredTags.length === 0) {
        tagListContainer.createEl("p", {
          text: filter ? "No tags match your filter." : "No tags found in vault.",
          cls: "tag-empty-message"
        });
        return;
      }
      for (const tag of filteredTags) {
        const isSelected = this.plugin.settings.selectedTags.includes(tag);
        new import_obsidian2.Setting(tagListContainer).setName(tag).setDesc(`${getFileCountForTag(this.app, tag)} notes`).addToggle(
          (toggle) => toggle.setValue(isSelected).onChange(async (value) => {
            if (value) {
              if (!this.plugin.settings.selectedTags.includes(tag)) {
                this.plugin.settings.selectedTags.push(tag);
              }
            } else {
              this.plugin.settings.selectedTags = this.plugin.settings.selectedTags.filter((t) => t !== tag);
            }
            await this.plugin.saveSettings();
          })
        );
      }
    };
    searchInput.addEventListener("input", () => {
      renderTagList(searchInput.value);
    });
    renderTagList();
    containerEl.createEl("h3", { text: "Display Options" });
    new import_obsidian2.Setting(containerEl).setName("Show nested tags").setDesc("Display nested tags (e.g., #parent/child) in a hierarchical structure").addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.showNestedTags).onChange(async (value) => {
        this.plugin.settings.showNestedTags = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian2.Setting(containerEl).setName("Sort order").setDesc("How to sort tags and files in the navigator").addDropdown(
      (dropdown) => dropdown.addOption("alphabetical", "Alphabetical").addOption("count", "By file count").setValue(this.plugin.settings.sortOrder).onChange(async (value) => {
        this.plugin.settings.sortOrder = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian2.Setting(containerEl).setName("Hide files on parent tags").setDesc("When a parent tag has child tags, only show the child tag folders and hide the parent's direct files").addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.hideParentFiles).onChange(async (value) => {
        this.plugin.settings.hideParentFiles = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian2.Setting(containerEl).setName("Auto-open on startup").setDesc("Automatically open the Tag Navigator sidebar when Obsidian starts").addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.autoOpen).onChange(async (value) => {
        this.plugin.settings.autoOpen = value;
        await this.plugin.saveSettings();
      })
    );
  }
};

// src/main.ts
var TagNavigatorPlugin = class extends import_obsidian3.Plugin {
  constructor() {
    super(...arguments);
    this.view = null;
    this.debouncedRefresh = (0, import_obsidian3.debounce)(() => {
      this.refreshView();
    }, 300, true);
  }
  async onload() {
    try {
      await this.loadSettings();
    } catch (e) {
      new import_obsidian3.Notice("Tag Navigator: Failed to load settings, using defaults.");
      this.settings = { ...DEFAULT_SETTINGS };
    }
    this.registerView(VIEW_TYPE_TAG_NAVIGATOR, (leaf) => {
      this.view = new TagNavigatorView(leaf, this);
      return this.view;
    });
    this.addRibbonIcon("tags", "Open Tag Navigator", () => {
      this.activateView();
    });
    this.addCommand({
      id: "open-tag-navigator",
      name: "Open Tag Navigator",
      callback: () => {
        this.activateView();
      }
    });
    this.addCommand({
      id: "refresh-tag-navigator",
      name: "Refresh Tag Navigator",
      callback: () => {
        this.refreshView();
      }
    });
    this.addSettingTab(new TagNavigatorSettingTab(this.app, this));
    this.registerEvent(
      this.app.metadataCache.on("changed", () => {
        this.debouncedRefresh();
      })
    );
    this.registerEvent(
      this.app.vault.on("delete", () => {
        this.debouncedRefresh();
      })
    );
    this.registerEvent(
      this.app.vault.on("rename", () => {
        this.debouncedRefresh();
      })
    );
    this.registerEvent(
      this.app.workspace.on("active-leaf-change", () => {
        if (this.view) {
          this.view.updateActiveFile();
        }
      })
    );
    this.app.workspace.onLayoutReady(() => {
      if (this.settings.autoOpen && this.app.workspace.getLeavesOfType(VIEW_TYPE_TAG_NAVIGATOR).length === 0) {
        this.activateView();
      }
    });
  }
  onunload() {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_TAG_NAVIGATOR);
  }
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }
  async saveSettings() {
    await this.saveData(this.settings);
    this.refreshView();
  }
  async activateView() {
    const { workspace } = this.app;
    let leaf = workspace.getLeavesOfType(VIEW_TYPE_TAG_NAVIGATOR)[0];
    if (!leaf) {
      const rightLeaf = workspace.getRightLeaf(false);
      if (rightLeaf) {
        await rightLeaf.setViewState({
          type: VIEW_TYPE_TAG_NAVIGATOR,
          active: true
        });
        leaf = rightLeaf;
      }
    }
    if (leaf) {
      workspace.revealLeaf(leaf);
    }
  }
  refreshView() {
    this.pruneStaleSelectedTags();
    if (this.view) {
      this.view.refresh();
    }
  }
  pruneStaleSelectedTags() {
    const vaultTags = new Set(getAllTags(this.app));
    const before = this.settings.selectedTags.length;
    this.settings.selectedTags = this.settings.selectedTags.filter(
      (tag) => vaultTags.has(tag)
    );
    if (this.settings.selectedTags.length !== before) {
      this.saveData(this.settings);
    }
  }
};

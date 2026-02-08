# Tag Navigator for Obsidian

A sidebar plugin for [Obsidian](https://obsidian.md) that lets you navigate your vault by tags. Selected tags appear as collapsible folders in the right sidebar, each showing the notes that contain that tag.

![Obsidian](https://img.shields.io/badge/Obsidian-v1.0.0-blue)
![License](https://img.shields.io/github/license/nelakay/obsidian-tag-navigator)

## Features

- **Tag-based navigation** — Browse notes organized by tag instead of folder structure
- **Hierarchical tags** — Nested tags like `#project/planning/budget` display as a collapsible tree
- **Inline + frontmatter support** — Detects both `#inline-tags` and YAML frontmatter `tags:` arrays
- **Sorting options** — Sort tags alphabetically or by file count; files sort alphabetically or by modification time
- **Context menu** — Right-click files to open in new tab, split view, or reveal in file explorer
- **Live updates** — View refreshes automatically when files are created, edited, renamed, or deleted
- **Tag search in settings** — Filter through all vault tags to select which ones to display

## Installation

### From Obsidian Community Plugins (coming soon)

1. Open **Settings > Community plugins**
2. Search for "Tag Navigator"
3. Click **Install**, then **Enable**

### Manual Installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](https://github.com/nelakay/obsidian-tag-navigator/releases)
2. Create a folder `tag-navigator` inside your vault's `.obsidian/plugins/` directory
3. Copy the downloaded files into that folder
4. Restart Obsidian and enable the plugin in **Settings > Community plugins**

## Usage

1. Click the **tags icon** in the ribbon (left sidebar) or run the command **"Open Tag Navigator"**
2. The navigator opens in the right sidebar
3. Go to **Settings > Tag Navigator** to select which tags to display
4. Click a tag to expand/collapse its file list
5. Click a file to open it; right-click for more options

## Settings

| Setting | Description |
|---------|-------------|
| **Tag Selection** | Choose which tags appear in the navigator. Includes search/filter, Select All, and Clear All. |
| **Show nested tags** | Display hierarchical tags (e.g., `#parent/child`) as a tree structure. Default: on |
| **Sort order** | Alphabetical or by file count. Default: alphabetical |

## Development

```bash
# Install dependencies
npm install

# Build for development (watch mode)
npm run dev

# Build for production
npm run build
```

The compiled plugin is output to `main.js` in the project root.

## License

[MIT](LICENSE)

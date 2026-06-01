<div align="center">

# SnapTab

SnapTab is a local-first Chrome new tab extension for building a personalized, fast, and portable browser start surface.

<img
    alt="demo"
    src="./assets/demo.gif"
    width="100%"
  />

[![Chrome Extension](https://img.shields.io/badge/Chrome_Extension-Manifest_V3-4285F4?logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-7.1-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Zustand](https://img.shields.io/badge/Zustand-5.0-443E38)](https://zustand-demo.pmnd.rs/)
[![Vitest](https://img.shields.io/badge/Vitest-4.1-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev/)
[![Playwright](https://img.shields.io/badge/Playwright-1.59-2EAD33?logo=playwright&logoColor=white)](https://playwright.dev/)

</div>

---

## Overview

SnapTab replaces Chrome's new tab page with a customizable workspace. It combines a search widget, paged shortcut grid, folders, wallpaper controls, and backup tools in a single Manifest V3 extension.

The app is shaped by familiar new tab productivity patterns, but it is its own implementation and product direction.

## Features

- Chrome Manifest V3 new tab override
- Full-viewport Canvas with movable and resizable widgets
- Search widget with configurable search providers and display options
- Shortcut Grid widget with paged top-level tiles
- Shortcut add, edit, delete, reorder, and drag behavior
- Toolbar popup for saving the current active website as a shortcut
- Folder creation by dragging shortcuts together
- Folder edit, delete, child reorder, and drag-out promotion flows
- Cross-page tile drag using page-edge hover navigation
- User-uploaded wallpapers, including static images and GIFs
- Wallpaper dim and blur controls
- Shortcut icons from brand matches, uploaded images, or generated fallback labels
- Settings drawer for search, grid, wallpaper, and backup controls
- JSON backup export and replace-only import
- Local-first persistence through Chrome storage
- Reduced motion support

## Technology

- React 19
- TypeScript
- Vite
- Chrome Extension Manifest V3
- Zustand for state management
- Immer for immutable store updates
- Motion for animation with reduced motion support
- Simple Icons for brand icon matching
- Vitest for unit tests
- Playwright for browser smoke tests

## Development

For implementation details and current architecture notes, see [docs/development.md](docs/development.md), [docs/hld.md](docs/hld.md), and [docs/lld-drag-drop.md](docs/lld-drag-drop.md).

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open:

```text
http://localhost:5173/
```

Run unit tests:

```bash
npm test
```

Run the browser smoke test:

```bash
npm run test:smoke
```

## Load In Chrome

Build the extension:

```bash
npm run build
```

Then:

1. Open `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `dist/` directory

After each new build, click the extension card's reload button in `chrome://extensions/`.

## Backup And Persistence

SnapTab is local-first. There is no backend account or sync service in the current app.

Runtime state is persisted to `chrome.storage.local`, with a localStorage fallback for development. Backups are portable JSON files that replace the current state on import.

Uploaded wallpapers and shortcut icons are kept portable as data URLs or media-backed records in the local extension environment.

## Project Docs

- [Development notes](docs/development.md)
- [High-level design](docs/hld.md)
- [Drag-and-drop low-level design](docs/lld-drag-drop.md)
- [Architecture review](docs/architecture-review.md)
- [Roadmap issues](docs/roadmap-issues.md)

## Releases

Releases are manual. When you intentionally want a new version:

1. Merge the release-ready changes to `main`.
2. Run the `Release` workflow from GitHub Actions on `main`.

The workflow checks out `main`, auto-advances the release version if the current tag already exists, syncs `package.json` and `public/manifest.json` for the build, generates release notes from commits since the previous tag, and attaches a zipped `dist/` package to the release.

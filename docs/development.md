# Development Notes

This document captures current Infi Tab implementation notes. Detailed architecture docs live in `docs/hld.md` and `docs/lld-drag-drop.md`.

## Product Direction

Infi Tab is a local-first Chrome new tab extension inspired by Infinity New Tab Pro. The first version intentionally avoids account sync and backend services. User data lives locally and can be exported/imported as a portable JSON backup.

## Current Feature Set

- Chrome Manifest V3 new tab override.
- React + Vite single-page new tab UI.
- Quick-link grid with add, edit, delete, active-page drag reorder, drag-combine folder creation, drag-add-to-folder, and FolderPanel child drag-out promotion.
- Folder tiles that open as modal overlays.
- Shortcut editing with title, URL, fallback label/color, uploaded icon image, and Simple Icons recommendations.
- Bundled default shortcuts with Simple Icons for common websites.
- User-uploaded wallpaper, including GIFs, stored as data URLs in active runtime state.
- Wallpaper dim and blur controls.
- Search provider presets: Google, Bing, Yahoo, Yandex, DuckDuckGo.
- Search-box customization: hide box, hide category labels, hide search mark, size, rounded corners, opacity.
- Layout customization: icon size, grid spacing, column count, label visibility.
- Right-side settings drawer opened by a gear button.
- Full JSON export/import backup with replace-only restore.
- Automated build checks plus unit and browser smoke tests.
- Manual release automation with GitHub Actions.

## Tech Stack

- `react` and `react-dom` for UI.
- `vite` for dev/build.
- `typescript` for type checking.
- `zustand` and `immer` for persisted app state.
- `motion` for page and UI animation.
- `simple-icons` for bundled brand icons.
- Chrome extension Manifest V3.

## Project Structure

```text
public/manifest.json          Chrome extension manifest
src/main.tsx                  React entry point
src/ui/App.tsx                New Tab Surface composition
src/ui/hooks/useNewTabController.ts  Transient UI state, store actions, and overlay actions
src/ui/ShortcutGrid.tsx       Shortcut Page rendering and native drag/drop
src/ui/ShortcutIcon.tsx       Shortcut icon rendering
src/ui/SettingsDrawer.tsx     Settings Drawer composition
src/ui/settings/*             Search, Grid Layout, Wallpaper, and Backup sections
src/ui/modals/*               Folder and shortcut modal overlays
src/ui/model/drafts.ts        Editor draft types and defaults
src/ui/hooks/useShortcutGridMetrics.ts  Grid fitting calculations
src/ui/styles.css             Application styling
tests/smoke/smoke.spec.ts     Browser smoke test
tests/unit/                   Vitest unit tests grouped by source area
vitest.config.ts              Unit test runner config
playwright.config.ts          Browser smoke test config
src/domain/tabState.ts        App state types and default state
src/domain/brandIcons.ts      Curated Simple Icons registry and matching
src/domain/tabOperations.ts   Shortcut, Folder, and layout mutation operations
src/domain/dropActions.ts     Drag/drop actions and folder cleanup reducer
src/domain/backup.ts          Backup parsing and compatibility defaults
src/stores/useTabStore.ts     Zustand + immer persisted state store
src/infrastructure/fileData.ts  File-to-data-URL adapter
src/infrastructure/mediaStorage.ts  IndexedDB media adapter, not active runtime path
src/infrastructure/tabStorage.ts  Unused storage adapter for media materialization path
CONTEXT.md                    Domain glossary and current decisions
docs/hld.md                   High-level design
docs/lld-drag-drop.md         Drag/drop low-level design
docs/architecture-review.md   Architecture deepening notes
docs/roadmap-issues.md        Future issue backlog
docs/development.md           Current development notes
```

## State Model

The source of truth is `TabState` in `src/domain/tabState.ts`.

Top-level fields:

- `schemaVersion`: currently `2`.
- `searchProvider`: active fixed search provider.
- `layout`: search and grid customization settings.
- `wallpaper`: wallpaper data URL plus stable media ID, dim, and blur settings.
- `tiles`: flat map of all `Shortcut` and `Folder` records by ID.
- `pages`: ordered Shortcut Pages. Each page owns a `tileIds[]` list for Top-Level Tile display order.

`Shortcut` icons support three modes:

- `fallback`: generated label and background color.
- `brand`: bundled Simple Icons ID.
- `image`: uploaded image data URL plus stable media ID.

Folders store child shortcuts by ID through `childIds[]`; child shortcut records still live in the flat `tiles` map. Folders with fewer than two valid children are dissolved during normalization or folder cleanup. Deleting a Folder deletes its contained Shortcuts. Legacy schema v1 runtime state is migrated on load from `quickLinks`, nested folder `quickLinks`, and `topLevelTiles` into the v2 flat map and page structure.

## Storage

Runtime state is persisted by Zustand persist in `src/stores/useTabStore.ts`. In Chrome extension context it writes to `chrome.storage.local`; in Vite dev it falls back to `window.localStorage`.

Wallpaper and uploaded shortcut icons are currently stored as portable data URLs inside `TabState`. `src/infrastructure/mediaStorage.ts` and `src/infrastructure/tabStorage.ts` contain IndexedDB media infrastructure, but that path is not wired into active runtime persistence.

The manifest includes:

```json
"permissions": ["storage", "unlimitedStorage"]
```

`unlimitedStorage` remains enabled for local-first storage headroom while media payloads remain in the persisted state blob.

## Backup And Restore

JSON export serializes the full `TabState`, including wallpaper and uploaded icon data URLs so backups stay portable.

Import is replace-only:

1. User chooses a JSON file.
2. App validates the basic backup shape.
3. User confirms replacement.
4. Current state is replaced.

Backup import accepts schema v2 files only. Schema v1 backups are rejected with a user-facing message telling the user to export a fresh backup after opening the latest version. Backups missing newer wallpaper fields get defaults for `dim` and `blur`.

Backup parsing lives in `src/domain/backup.ts` so import compatibility has a dedicated seam.

## Icons

Brand icons are curated in `src/domain/brandIcons.ts`.

Current bundled icon set:

- Facebook
- GitHub
- Gmail
- Google
- Google Calendar
- Google Chrome
- Google Docs
- Google Drive
- Instagram
- Netflix
- Notion
- Reddit
- Spotify
- X
- YouTube

When a shortcut is saved, the app tries to match a bundled Simple Icon using the title and URL. The shortcut editor also shows recommended icons based on the same matcher. If no match is found, the app uses fallback label/color. If the user uploads an icon image, the uploaded image wins.

Simple Icons is CC0 as a package, but individual brand marks remain subject to their trademark guidelines.

Shortcut and Folder editing rules live in `src/domain/tabOperations.ts`. Drag/drop meaning and folder lifecycle rules live in `src/domain/dropActions.ts`.

## UI Decisions

- Main app is a single new-tab surface rather than separate extension pages.
- Settings open in a right-side drawer so more controls fit without covering the whole page.
- Folder contents open in modal overlays.
- Top-Level Tile drag/drop currently uses native HTML drag events with a custom pointer-following overlay.
- Active-page drag supports reorder, Shortcut-to-Shortcut combine, and Shortcut-to-Folder add.
- FolderPanel supports child reorder, drag-out promotion, and center-drop add-to-folder.
- Cross-page drag has domain reducer support but is not wired in the UI.
- Keyboard and touch drag are future input adapters over the same Drop Action interface.
- Local JSON backup is the first sync strategy. Account sync is deferred.

## Development Commands

```bash
npm install
npm run dev
npm run build
```

Load the built extension from `dist/` through `chrome://extensions/` with Developer mode enabled.

## Tooling Config

- Vite builds `newtab.html` as the Rollup input and removes `crossorigin` attributes during build.
- Vitest runs `tests/unit/**/*.test.ts` in a Node environment.
- Playwright smoke tests run from `tests/smoke/` against `http://127.0.0.1:4173`; its web server command is `npm run build && npm run preview -- --port 4173`.
- Manifest V3 currently declares only the new-tab override, `storage`, and `unlimitedStorage`; there is no action popup, background script, content script, or icon set.

## Release Workflow

Release automation lives in `.github/workflows/release.yml`.

The workflow is manual-only, must run from `main`, installs with `npm ci`, auto-selects the next unused patch version from `package.json`, syncs `package.json`, `package-lock.json`, and `public/manifest.json`, builds `dist/`, zips it, creates a `vX.Y.Z` GitHub release, and generates release notes from commit subjects since the previous tag.

## Current Known Gaps

- Drag/drop session logic still lives inside `ShortcutGrid`; it should be extracted before cross-page drag is added.
- Drag UI routes most drops through `createDropAction()` but does not use domain `resolveDrop()` in production.
- Cross-page drag is not wired in the UI.
- Keyboard and touch drag are not implemented.
- Favicon lookup for unknown websites is not implemented.
- Keyboard focus trapping for modals/drawer is not complete.
- Chrome Web Store assets and privacy text are not prepared.
- `@dnd-kit/*` packages are installed but inactive; current drag implementation is native HTML drag.

See `docs/roadmap-issues.md` for issue-ready future slices.

See `docs/architecture-review.md` for the latest architecture deepening pass.

See `docs/hld.md` and `docs/lld-drag-drop.md` for current architecture docs.

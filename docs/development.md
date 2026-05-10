# Development Notes

This document captures current Infi Tab implementation notes. Detailed architecture docs live in `docs/hld.md` and `docs/lld-drag-drop.md`.

## Product Direction

Infi Tab is a local-first Chrome new tab extension inspired by Infinity New Tab Pro. The first version intentionally avoids account sync and backend services. User data lives locally and can be exported/imported as a portable JSON backup.

## Current Feature Set

- Chrome Manifest V3 new tab override.
- React + Vite new tab UI plus toolbar action popup.
- Quick-link grid with add, edit, delete, active-page drag reorder, drag-combine folder creation, drag-add-to-folder, and FolderPanel child drag-out promotion.
- Canvas-based New Tab Surface with movable/resizable Search and Shortcut Grid Widgets.
- Canvas edit toggle with Widget frames and alignment guides; tile drag is disabled while arranging Widgets.
- Toolbar popup for adding the active browser tab as a shortcut with the shared shortcut editor form.
- Folder tiles that open as modal overlays.
- Shortcut editing with title, URL, fallback label/color, uploaded icon image, and Simple Icons recommendations.
- Bundled default shortcuts with Simple Icons for common websites.
- User-uploaded wallpaper, including GIFs, stored as data URLs in active runtime state.
- Wallpaper dim and blur controls.
- Search provider presets: Google, Bing, Yahoo, Yandex, DuckDuckGo.
- Search Widget customization: enabled state, provider tabs, search mark, rounded corners, opacity.
- Shortcut Grid Widget customization: enabled state, icon size, grid spacing, labels, page dots.
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
newtab.html                   New Tab Surface HTML entry
popup.html                    Toolbar popup HTML entry
src/main.tsx                  New Tab Surface React entry point
src/popup.tsx                 Toolbar popup React entry point
src/ui/app/App.tsx            New Tab Surface composition
src/ui/app/useNewTabController.ts  Transient UI state, store actions, and overlay actions
src/ui/canvas/CanvasSurface.tsx    Canvas and WidgetFrame rendering
src/ui/canvas/useCanvasMetrics.ts  Canvas viewport metrics
src/ui/PopupApp.tsx           Toolbar add-current-site popup
src/ui/ShortcutGrid.tsx       Shortcut Page rendering and native drag/drop
src/ui/widgets/search/SearchWidget.tsx  Search Widget composition
src/ui/widgets/shortcut-grid/ShortcutGridWidget.tsx  Shortcut Grid Widget composition
src/ui/widgets/shortcut-grid/useShortcutGridMetrics.ts  Grid fitting calculations
src/ui/widgets/WidgetContextMenu.tsx   Edit-mode Widget settings menu
src/ui/ShortcutIcon.tsx       Shortcut icon rendering
src/ui/SettingsDrawer.tsx     Settings Drawer composition
src/ui/settings/*             Global settings sections
src/ui/modals/*               Folder and shortcut modal overlays
src/ui/ShortcutForm.tsx       Shared shortcut editing form
src/ui/model/drafts.ts        Editor draft types and defaults
src/ui/styles.css             Application styling
tests/smoke/smoke.spec.ts     Browser smoke test
tests/unit/                   Vitest unit tests grouped by source area
vitest.config.ts              Unit test runner config
playwright.config.ts          Browser smoke test config
src/domain/tabState.ts        App state types and default state
src/domain/canvas.ts          Canvas grid, Widget placement, and overlap rules
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
- `searchProvider`: legacy/global mirror of Search Widget provider for compatibility.
- `layout`: legacy layout settings kept for migration and compatibility.
- `canvas`: fixed-viewport Canvas settings, Widget enabled state, Widget placement, and Widget settings.
- `wallpaper`: wallpaper data URL plus stable media ID, dim, and blur settings.
- `tiles`: flat map of all `Shortcut` and `Folder` records by ID.
- `pages`: ordered Shortcut Pages. Each page owns a `tileIds[]` list for Top-Level Tile display order.

The Canvas stores exactly one Search Widget and one Shortcut Grid Widget. Widget placement is persisted in Canvas-relative units and may be fractional for freeform placement. Enabled Widgets cannot overlap; disabled Widgets keep settings and last placement but do not reserve Canvas space.

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
"permissions": ["activeTab", "storage", "unlimitedStorage"]
```

`activeTab` lets the toolbar popup prefill the shortcut title and URL from the current tab. `unlimitedStorage` remains enabled for local-first storage headroom while media payloads remain in the persisted state blob.

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

The New Tab Surface shortcut modal and Toolbar Popup share `src/ui/ShortcutForm.tsx`, so title/URL editing, icon uploads, fallback colors, and brand icon recommendations stay aligned across both surfaces.

Simple Icons is CC0 as a package, but individual brand marks remain subject to their trademark guidelines.

Shortcut and Folder editing rules live in `src/domain/tabOperations.ts`. Drag/drop meaning and folder lifecycle rules live in `src/domain/dropActions.ts`.

## UI Decisions

- Main app is a single new-tab surface rather than separate extension pages.
- The New Tab Surface is a fixed Canvas containing Widgets; it never browser-scrolls.
- Canvas Edit Mode is transient, starts off on new tabs, and enables Widget movement/resizing.
- Shortcut Pages live inside the Shortcut Grid Widget. Wheel navigation applies only while hovering that Widget in normal mode.
- The New Tab Surface no longer renders a Shortcut creation tile; the Toolbar Popup is the shortcut creation flow.
- Toolbar popup is a small secondary entry point for adding the active browser tab to the same persisted `TabState`.
- Settings open in a right-side drawer so more controls fit without covering the whole page.
- Folder contents open in modal overlays.
- Top-Level Tile drag/drop currently uses native HTML drag events with a custom pointer-following overlay.
- Active-page drag supports reorder, Shortcut-to-Shortcut combine, and Shortcut-to-Folder add.
- FolderPanel supports child reorder, drag-out promotion, and center-drop add-to-folder.
- Cross-page Top-Level Tile drag uses 10vw/max-130px page-edge zones. Holding an edge for 300ms switches Shortcut Page during drag; continued hold repeats more slowly. Final drop commits to the target tile or page surface.
- Keyboard Shortcut Page navigation is removed in the Canvas design. Touch drag is a future input adapter over the same Drop Action interface.
- Local JSON backup is the first sync strategy. Account sync is deferred.

## Development Commands

```bash
npm install
npm run dev
npm run build
```

Load the built extension from `dist/` through `chrome://extensions/` with Developer mode enabled.

## Tooling Config

- Vite builds `newtab.html` and `popup.html` as Rollup inputs and removes `crossorigin` attributes during build.
- Vitest runs `tests/unit/**/*.test.ts` in a Node environment.
- Playwright smoke tests run from `tests/smoke/` against `http://127.0.0.1:4173`; its web server command is `npm run build && npm run preview -- --port 4173`.
- Manifest V3 declares the new-tab override, toolbar action popup, `activeTab`, `storage`, and `unlimitedStorage`; there is no background script, content script, or icon set.

## Release Workflow

Release automation lives in `.github/workflows/release.yml`.

The workflow is manual-only, must run from `main`, installs with `npm ci`, auto-selects the next unused patch version from `package.json`, syncs `package.json`, `package-lock.json`, and `public/manifest.json`, builds `dist/`, zips it, creates a `vX.Y.Z` GitHub release, and generates release notes from commit subjects since the previous tag.

## Current Known Gaps

- Drag/drop session logic still lives inside `ShortcutGrid`; it should be extracted before touch or keyboard drag is added.
- Drag UI routes most drops through `createDropAction()` but does not use domain `resolveDrop()` in production.
- Touch drag is not implemented.
- Favicon lookup for unknown websites is not implemented.
- Keyboard focus trapping for modals/drawer is not complete.
- Chrome Web Store assets and privacy text are not prepared.
- `@dnd-kit/*` packages are installed but inactive; current drag implementation is native HTML drag.

See `docs/roadmap-issues.md` for issue-ready future slices.

See `docs/architecture-review.md` for the latest architecture deepening pass.

See `docs/hld.md` and `docs/lld-drag-drop.md` for current architecture docs.

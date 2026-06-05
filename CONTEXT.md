# Context

## Glossary

**New Tab Surface**  
The browser page rendered by SnapTab when Chrome opens a new tab.

**Canvas**  
The fixed, full-viewport workspace inside the New Tab Surface. It never browser-scrolls and contains Widgets snapped to a logical grid.

**Widget**  
A user-configurable surface placed on the Canvas. Widgets have enabled state, freeform placement, visual settings, and type-specific settings.

**Widget Placement**  
A Widget's persisted Canvas-relative rectangle: x, y, width, height, and z-index. Placement can be fractional, must fit inside the Canvas, and enabled Widgets must not overlap.

**Canvas Edit Mode**  
Transient mode where Widget frames and alignment guides are visible and Widgets can be moved or resized. It is never persisted and always starts off on a new tab.

**Search Widget**  
The Widget containing the search input and search-provider controls.

**Shortcut Grid Widget**  
The Widget containing Shortcut Pages, Top-Level Tiles, and tile/folder drag behavior.

**Weather Widget**  
The Widget showing a cached weather snapshot for a configured location, display mode, unit system, and refresh interval.

**Date & Time Widget**  
The Widget showing clock/date information. It supports digital, percentage-complete, and vertical clock modes plus date formatting and per-part colors.

**Snap Feed Widget**  
The Widget showing RSS/Atom feed articles from user-configured feed sources. It fetches feeds through the extension background worker, supports all-feeds and selected-feed modes, and displays feed/article thumbnails or fallback initials.

**Feed Source**  
A user-configured RSS/Atom subscription with ID, title, and URL. Feed Sources are persisted in `TabState` under the Snap Feed Widget settings.

**Feed Item**  
A normalized RSS/Atom article with title, link, source, optional snippet, publication date, author, and image URL. Feed Items are fetched/cache data, not user configuration.

**OPML**  
A portable XML subscription list used by the Snap Feed Widget. OPML import merges Feed Sources by default, skips duplicates, and can replace the current Feed Source list after confirmation.

**Shortcut**  
A top-level or folder-contained link with a title, URL, and icon.

**Shortcut Page**  
A visible partition derived from top-level order and Grid Layout capacity, sized to fit within the viewport without vertical page scrolling.
_Avoid_: browser page, tab page, slide

**Folder**  
A tile on the New Tab Surface that opens a modal overlay containing shortcuts.

**Top-Level Tile**  
A user-arrangeable tile on the New Tab Surface, either a Shortcut or a Folder.
_Avoid_: mixed item, grid item

**Grid Layout**  
A user-selected row and column arrangement that defines how many Top-Level Tiles appear on each Shortcut Page.
_Avoid_: automatic capacity, measured capacity, layout mode

**Wallpaper**  
The user-selected background media for the New Tab Surface. It may be a static image or GIF and is currently persisted as a data URL in `TabState`.

**Settings Drawer**  
The right-side drawer that exposes Wallpaper, Theme, and Backup controls.

**Theme**  
The user-selected global visual preset for the New Tab Surface. A Theme provides shared color tokens for the Canvas, Settings Drawer, Shortcut Grid Widget, Folder Panel, and Shortcut/Folder edit modals.

**Toolbar Popup**  
The Chrome extension action popup used to add the current active website as a Shortcut without opening the New Tab Surface.

**Backup**  
A portable JSON representation of the full `TabState`, including user settings and media data URLs.

**Brand Icon**  
A bundled Simple Icons entry matched from shortcut title or URL.

**Fallback Icon**  
A generated icon using a short text label and background color when no Brand Icon or uploaded image is available.

**Folder Icon**  
A Folder tile's current visual shows a folder glyph with a child count badge.

**Drag Intent**  
The transient interpretation of a drag gesture before drop: leading (left zone), center (combine/add), or trailing (right zone). Drag Intent belongs to UI geometry.

**Drag Source**  
The UI description of what is being dragged before it becomes a Drop Action. A Drag Source may be a Top-Level Tile or a Folder-contained Shortcut.

**Drop Target**  
The UI description of where the current drag is aiming before it becomes a Drop Action. A Drop Target may be a Top-Level Tile, Folder child position, Folder end, Shortcut Page surface, or page edge.

**Drop Preview**  
The transient pairing of a Drag Source and Drop Target used to render insertion, reorder, combine, promotion, and cross-page feedback before commit.

**Drop Action**  
A domain command produced from Drag Intent: `REORDER`, `COMBINE`, `ADD_TO_FOLDER`, `CROSS_PAGE`, `PROMOTE`, or `CANCEL`.

## Current Decisions

### Persistence

- SnapTab is local-first; no backend or account sync exists in the MVP.
- Zustand persist writes runtime state to `chrome.storage.local`; localStorage is the dev fallback.
- The Toolbar Popup writes to the same persisted `TabState` as the New Tab Surface.
- JSON Backup is replace-only on import.
- Wallpapers and uploaded icons remain portable as data URLs.
- IndexedDB media storage is not part of the MVP runtime persistence path.
- Theme choice is persisted in `TabState` and applies globally through CSS variables.
- Snap Feed subscriptions are persisted in `TabState`; fetched Feed Items and feed check results are cache/transient data.
- OPML import/export is scoped to Snap Feed subscriptions and is separate from JSON Backup.

### Product Structure

- The New Tab Surface is a single React app, not multiple extension pages.
- The Canvas is the whole interactive New Tab workspace and contains all user-arrangeable Widgets.
- SnapTab has exactly one Search Widget and exactly one Shortcut Grid Widget.
- SnapTab also has one Weather Widget, one Date & Time Widget, and one Snap Feed Widget.
- Widgets can be disabled; disabled Widgets keep settings and last placement but do not reserve Canvas space.
- Canvas Edit Mode is toggled from the toolbar, shows Widget frames/alignment guides, enables Widget movement/resizing, and disables tile drag.
- The Toolbar Popup is a second React entry point that reuses the shortcut editor form and persisted store.
- UI Modules are grouped by product concept: Canvas hosts Widget placement, each Widget owns its own rendering and settings menu section, Shortcut Grid Widget owns Shortcut tile/icon UI, Settings Drawer owns settings sections, Toolbar Popup owns popup composition, and shared Shortcut editing UI lives under Shortcut Editor.
- Folders are created by dragging one Shortcut onto another (gesture-based combine).
- A Folder always contains at least two Shortcuts; removal that leaves one child promotes it to the page.
- Deleting a Folder deletes its contained Shortcuts.
- The Toolbar Popup is the shortcut creation flow; the New Tab Surface does not show a Shortcut creation tile.

### Snap Feed

- Snap Feed fetches RSS/Atom XML through the Manifest V3 background service worker so host permissions apply to feeds that block browser CORS.
- The manifest declares default `http` and `https` host permissions because feed fetching is a core Snap Feed capability.
- The New Tab Surface still owns rendering and settings; the background worker only fetches feed text and returns it to the page for parsing.
- Feed Source configuration stays clean: ID, title, and URL only.
- Feed cache metadata records feed URL, cached items, last fetched time, last successful fetch, and last error outside Widget settings.
- OPML import merges by default, skips duplicate feed URLs, and has a replace mode guarded by confirmation.
- Feed checks validate whether each Feed Source can be fetched and parsed, then show green/red status in the Snap Feed context menu.
- All-feeds mode is the default. Selected-feed mode is available in settings.
- All-feeds mode applies an items-per-feed cap before applying the global item limit so one noisy source cannot hide other Feed Sources.
- Feed rows prefer article image, then source favicon, then a generated initials fallback tile.

### Tile Management

- Shortcuts and Folders can be arranged together within each Shortcut Page.
- All tile records live in a single flat map keyed by ID.
- Folder membership lives only in `folder.childIds`, not by nesting records.
- Display order lives in per-page `tileIds` arrays, not in tile records.

### Shortcut Pages

- Shortcut Pages live inside the Shortcut Grid Widget, not directly on the Canvas.
- Shortcut Page capacity comes from Grid Layout.
- Persisted `pages[].tileIds` stores top-level order; visible Shortcut Pages are derived by slicing that order by current Grid Layout capacity.
- The main surface must not browser-scroll; overlays may scroll internally.
- Mouse wheel navigation applies to Shortcut Pages only while hovering the Shortcut Grid Widget in normal mode.
- Infinite wrapping for next/prev navigation.
- Page dots shown only when `pageCount > 1`.
- Active page is transient UI state, resets on new tab.
- Keyboard Shortcut Page navigation is not part of the Canvas design.

### Grid Layout

- Canvas placement dimensions are derived from viewport size with square-ish logical cells that fill the viewport.
- Widget Placement persists Canvas-relative units and can use fractional values for freeform placement.
- Shortcut Grid Widget rows and columns are derived from its current rendered size.
- Shortcut Grid Widget settings preserve icon size, column spacing, line spacing, labels, and page dots; fixed row/column presets are retired by the Canvas design.
- The Canvas and Widgets are clamped to avoid browser scrolling.

### Drag and Drop

- Top-Level Tile drag uses native HTML drag events with custom pointer-following overlay.
- Active-page drag supports reorder, combine, and add-to-folder.
- FolderPanel drag supports child reorder, drag-out promotion, and add-to-folder by center drop.
- Tile drag is disabled during Canvas Edit Mode so Widget movement and tile movement cannot conflict.
- Drag UI maps Drag Source plus Drop Target into Drop Action through `src/ui/drag/dropActionAdapter.ts`.
- Drag Intent uses left/center/right UI zones (30%/40%/30%).
- Zone confirmation uses 200ms debounce timer.
- Cross-page Top-Level Tile drag is wired through page-edge hover navigation: 10vw/max-130px edge zones, 300ms first hold, then slower repeat paging.
- Keyboard and touch drag are separate future work.

### Technology

- React 19 + TypeScript + Vite
- Zustand + Immer for state management
- chrome.storage.local for persistence
- Manifest V3 background service worker for RSS/Atom feed fetches
- Native HTML drag events
- Motion (Framer Motion) with reduced motion support
- Global CSS imported through `src/ui/styles.css`; selectors live in Module-owned CSS files beside their UI Modules.

### Implemented Features

- [x] New Tab Surface with wallpaper layer
- [x] Search bar with configurable providers
- [x] Paged tile grid (Shortcut Pages)
- [x] Grid Layout with presets and customization
- [x] Shortcut CRUD
- [x] Toolbar popup add-current-site shortcut flow
- [x] Folder creation via drag combine
- [x] Folder edit/delete modal
- [x] FolderPanel child view
- [x] FolderPanel child reorder and drag-out promotion
- [x] Cross-page Top-Level Tile drag via page-edge hover
- [x] Top-level reorder
- [x] Add shortcut to folder
- [x] Settings Drawer
- [x] Wallpaper upload
- [x] JSON Backup export/import
- [x] Page navigation (dots, wheel, keyboard)
- [x] Weather Widget
- [x] Date & Time Widget
- [x] Snap Feed Widget with RSS/Atom parsing, OPML import/export, feed checks, refresh, thumbnails, and per-feed item limits
- [x] Reduced motion support

### Reference Extension

- Extracted to `references/reference-new-tab/`
- Used for product behavior evidence only
- Not for copying implementation, assets, or code
- Confirms product shape: full-viewport, search, paged grid, folders, wallpaper, settings

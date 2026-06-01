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
The right-side drawer that exposes Search, Grid Layout, Wallpaper, and Backup controls.

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

### Product Structure

- The New Tab Surface is a single React app, not multiple extension pages.
- The Canvas is the whole interactive New Tab workspace and contains all user-arrangeable Widgets.
- SnapTab has exactly one Search Widget and exactly one Shortcut Grid Widget.
- Widgets can be disabled; disabled Widgets keep settings and last placement but do not reserve Canvas space.
- Canvas Edit Mode is toggled from the toolbar, shows Widget frames/alignment guides, enables Widget movement/resizing, and disables tile drag.
- The Toolbar Popup is a second React entry point that reuses the shortcut editor form and persisted store.
- UI Modules are grouped by product concept: Canvas hosts Widget placement, each Widget owns its own rendering and settings menu section, Shortcut Grid Widget owns Shortcut tile/icon UI, Settings Drawer owns settings sections, Toolbar Popup owns popup composition, and shared Shortcut editing UI lives under Shortcut Editor.
- Folders are created by dragging one Shortcut onto another (gesture-based combine).
- A Folder always contains at least two Shortcuts; removal that leaves one child promotes it to the page.
- Deleting a Folder deletes its contained Shortcuts.
- The Toolbar Popup is the shortcut creation flow; the New Tab Surface does not show a Shortcut creation tile.

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
- [x] Reduced motion support

### Reference Extension

- Extracted to `references/reference-new-tab/`
- Used for product behavior evidence only
- Not for copying implementation, assets, or code
- Confirms product shape: full-viewport, search, paged grid, folders, wallpaper, settings

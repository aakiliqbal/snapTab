# Context

## Glossary

**New Tab Surface**  
The browser page rendered by Infi Tab when Chrome opens a new tab.

**Shortcut**  
A top-level or folder-contained link with a title, URL, and icon.

**Shortcut Page**  
A visible partition derived from top-level order, Grid Layout capacity, and the Shortcut creation tile, sized to fit within the viewport without vertical page scrolling.
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

- Infi Tab is local-first; no backend or account sync exists in the MVP.
- Zustand persist writes runtime state to `chrome.storage.local`; localStorage is the dev fallback.
- JSON Backup is replace-only on import.
- Wallpapers and uploaded icons remain portable as data URLs.
- IndexedDB media infrastructure exists but is not wired into the active runtime persistence path.

### Product Structure

- The New Tab Surface is a single React app, not multiple extension pages.
- Folders are created by dragging one Shortcut onto another (gesture-based combine).
- A Folder always contains at least two Shortcuts; removal that leaves one child promotes it to the page.
- Deleting a Folder deletes its contained Shortcuts.
- The Shortcut creation tile participates in Shortcut Page capacity after all user tiles.

### Tile Management

- Shortcuts and Folders can be arranged together within each Shortcut Page.
- All tile records live in a single flat map keyed by ID.
- Folder membership lives only in `folder.childIds`, not by nesting records.
- Display order lives in per-page `tileIds` arrays, not in tile records.

### Shortcut Pages

- Shortcut Page capacity comes from Grid Layout.
- Persisted `pages[].tileIds` stores top-level order; visible Shortcut Pages are derived by slicing that order by current Grid Layout capacity.
- The main surface must not browser-scroll; overlays may scroll internally.
- Mouse wheel navigation applies to Shortcut Pages (thresholded).
- Infinite wrapping for next/prev navigation.
- Page dots shown only when `pageCount > 1`.
- Active page is transient UI state, resets on new tab.

### Grid Layout

- Grid Layout presets: 2x4, 2x5, 2x6, 2x7, 3x3, and Customize.
- Custom rows/columns range 1-8.
- Default: 2x6 preset with 100% icon size and spacing.
- Row/column counts are stored directly; column spacing and line spacing are 0-100%; icon size is 50-120%.
- Grid Layout preserved across viewports; presentation scales to avoid scrolling.

### Drag and Drop

- Top-Level Tile drag uses native HTML drag events with custom pointer-following overlay.
- Active-page drag supports reorder, combine, and add-to-folder.
- FolderPanel drag supports child reorder, drag-out promotion, and add-to-folder by center drop.
- Drag UI maps Drag Source plus Drop Target into Drop Action through `src/ui/drag/dropActionAdapter.ts`.
- Drag Intent uses left/center/right UI zones (30%/40%/30%).
- Zone confirmation uses 200ms debounce timer.
- Cross-page drag is supported in the domain reducer but not wired in the UI.
- Keyboard and touch drag are separate future work.

### Technology

- React 19 + TypeScript + Vite
- Zustand + Immer for state management
- chrome.storage.local for persistence
- Native HTML drag events
- Motion (Framer Motion) with reduced motion support
- Global CSS in `src/ui/styles.css`

### Implemented Features

- [x] New Tab Surface with wallpaper layer
- [x] Search bar with configurable providers
- [x] Paged tile grid (Shortcut Pages)
- [x] Grid Layout with presets and customization
- [x] Shortcut CRUD
- [x] Folder creation via drag combine
- [x] Folder edit/delete modal
- [x] FolderPanel child view
- [x] FolderPanel child reorder and drag-out promotion
- [x] Top-level reorder
- [x] Add shortcut to folder
- [x] Settings Drawer
- [x] Wallpaper upload
- [x] JSON Backup export/import
- [x] Page navigation (dots, wheel, keyboard)
- [x] Reduced motion support

### Reference Extension

- Extracted to `references/infinity-new-tab-pro/`
- Used for product behavior evidence only
- Not for copying implementation, assets, or code
- Confirms product shape: full-viewport, search, paged grid, folders, wallpaper, settings

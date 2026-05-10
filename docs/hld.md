# High-Level Design

## Product Overview

Infi Tab is a local-first Chrome Manifest V3 new-tab extension. Product shape confirmed by reference extension analysis:

- Fixed full-viewport new tab page
- Toolbar popup to add the current site
- Canvas with movable/resizable Search and Shortcut Grid Widgets
- Paged shortcut grid with folders inside the Shortcut Grid Widget
- Wallpaper layer (image/GIF)
- Right-side settings drawer
- JSON backup import/export

## Architecture Layers

```
Chrome Extension
  └─ public/manifest.json          # MV3 extension manifest
      ├─ src/main.tsx           # New Tab Surface React entry point
      │   └─ src/ui/app/App.tsx # New Tab Surface root component
      │       ├─ app/useNewTabController() # Transient UI state and store actions
      │       ├─ canvas/CanvasSurface      # Full-viewport widget canvas
      │       ├─ canvas/WidgetFrame        # Common move/resize shell
      │       ├─ widgets/search/SearchWidget
      │       ├─ widgets/shortcut-grid/ShortcutGridWidget
      │       ├─ ShortcutGrid     # Tile grid content inside Shortcut Grid Widget
      │       ├─ SettingsDrawer  # Settings surface
      │       ├─ FolderModal   # Folder edit modal
      │       ├─ FolderPanel  # Folder child view
      │       └─ ShortcutModal # Shortcut add/edit
      └─ src/popup.tsx          # Toolbar popup React entry point
          ├─ src/ui/PopupApp.tsx
          └─ src/ui/ShortcutForm.tsx # Shared shortcut editor form

Domain Layer (src/domain/)
  ├─ tabState.ts        # State schema & defaults
  ├─ canvas.ts          # Widget placement and Canvas bounds rules
  ├─ tabOperations.ts  # Resolved view models
  ├─ dropActions.ts   # DnD domain logic
  └─ backup.ts      # Import/export

Infrastructure Layer (src/infrastructure/)
  ├─ tabStorage.ts   # chrome.storage.local adapter, not active runtime path
  ├─ mediaStorage.ts # IndexedDB media adapter, not active runtime path
  └─ fileData.ts    # Browser File API

Store Layer (src/stores/)
  └─ useTabStore.ts  # Zustand + immer persisted store
```

## State Model

```ts
TabState {
  schemaVersion: 2
  searchProvider: string
  layout: GridLayout
  canvas: CanvasState
  wallpaper: Wallpaper
  tiles: Record<TileId, Shortcut | Folder>
  pages: ShortcutPage[]
}

ShortcutPage {
  id: string
  tileIds: TileId[]  // Ordered references
}

Shortcut {
  kind: "shortcut"
  id: TileId
  title: string
  url: string
  icon: IconData
}

Folder {
  kind: "folder"
  id: TileId
  title: string
  icon: IconData
  childIds: TileId[]
}
```

Persisted `pages[].tileIds` is top-level order. The visible Shortcut Pages are derived at render time by flattening that order and slicing by the Shortcut Grid Widget capacity derived from its current rendered size.

## Key Invariants

1. **Flat tile map**: All tiles in single `tiles` map, no nesting
2. **Position not in tile**: Page order in `pages[].tileIds`, not in tile records
3. **Folder containment**: Children in `folder.childIds`, not nested records
4. **Folder invariant**: folders with fewer than two valid children are dissolved
5. **One store**: All persisted state in Zustand + immer store
6. **Local-first**: No backend, chrome.storage.local persistence
7. **Canvas bounds**: Widgets persist freeform Canvas-relative placement and enabled Widgets cannot overlap
8. **Widget ownership**: Search settings belong to Search Widget; Shortcut Grid settings belong to Shortcut Grid Widget

## Product Surfaces

| Surface | Description |
|---------|-----------|
| New Tab Surface | Primary runtime page |
| Canvas | Fixed full-viewport workspace containing Widgets |
| Search Widget | Search input and provider controls |
| Shortcut Grid Widget | Shortcut Pages, Top-Level Tiles, and tile drag/drop |
| Toolbar Popup | Add current active website as a Shortcut |
| Shortcut Grid | Paged top-level tile grid |
| Settings Drawer | Right-side settings |
| Shortcut Modal | Add/edit shortcuts |
| Folder Modal | Edit folder metadata |
| Folder Panel | View, reorder, and drag out folder children |
| Backup Flow | JSON replace-only import |

## Technology Choices

| Concern | Choice | Rationale |
|---------|--------|-----------|
| UI Framework | React 19 | Reference uses Vue; React chosen for ecosystem |
| Build Tool | Vite | Fast HMR, extension-friendly |
| State | Zustand + Immer | Store shape from ADR 0004 |
| Drag | Native HTML | dnd-kit deferred; native fits current behavior |
| Styling | Global CSS | Single stylesheet at `src/ui/styles.css` |
| Persistence | Zustand persist to chrome.storage.local | localStorage fallback in dev |
| Animation | Motion (Framer Motion) | Reduced motion support |
| Icons | Lucide + Simple Icons | Brand matching |

## Reference Extension Learnings

The extracted Infinity New Tab Pro extension confirms:

1. Fixed full-viewport with `overflow: hidden`
2. Wallpaper as base layer (CSS background)
3. Search bar positioned top-center
4. Paged grid using row/column variables
5. Page dots/arrows for pagination
6. Folder shows child count badge
7. Drag uses real tile overlay following pointer
8. 30/40/30 split zones for insert/combine/insert
9. Zone confirmation via 200ms timer
10. Cross-page via full-height edge detection: 10vw/max-130px edge zones, 300ms initial hold, slower repeat paging

## Design Decisions from Code

| Decision | Location | Notes |
|----------|----------|-------|
| Native drag | ShortcutGrid.tsx | Custom overlay, no dnd-kit |
| Canvas widget drag | CanvasSurface.tsx | Pointer-based move/resize in Canvas Edit Mode |
| Zone timer | 200ms debounce | Timer in useRef |
| Live shift | getTileShift() | FLIP-like animation |
| Overlay | dragOverlay state | Fixed position following pointer |
| Page dots | Conditional | Only when pageCount > 1 |
| Reduced motion | useReducedMotion | Respects prefers-reduced-motion |

## Current Implementation State

- [x] Top-level reorder (active page)
- [x] Combine (shortcut + shortcut → folder)
- [x] Add to folder (shortcut → folder)
- [x] Cross-page Top-Level Tile drag via page-edge hover
- [x] Folder child drag reorder and drag-out promotion
- [x] Canvas Widget freeform placement
- [x] Canvas Edit Mode with Widget frames and alignment guides
- [x] Debounced Widget placement persistence with pointer-up flush
- [ ] Widget visual style customization controls
- [ ] Keyboard drag
- [ ] Touch drag

## Near-Term Direction

1. Extract drag hook from ShortcutGrid
2. Route native drag through resolveDrop()
3. Extract drag session logic from ShortcutGrid
4. Add touch drag adapters

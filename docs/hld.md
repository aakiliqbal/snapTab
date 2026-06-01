# High-Level Design

## Product Overview

SnapTab is a local-first Chrome Manifest V3 new-tab extension. Product shape confirmed by reference extension analysis:

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
      │       ├─ canvas/CanvasWidgetHost   # Widget mounting, placement wiring, context menu shell
      │       ├─ canvas/CanvasSurface      # Full-viewport Canvas shell
      │       ├─ widgets/WidgetFrame       # Common Widget move/resize frame
      │       ├─ widgets/search/*          # Search Widget rendering and settings menu section
      │       ├─ widgets/shortcut-grid/*   # Shortcut Grid Widget, Shortcut Pages, folders, native drag, tile/icon UI
      │       ├─ settings/*                # Settings Drawer and settings sections
      │       ├─ modals/*                  # Shortcut and Folder edit overlays
      │       └─ shortcut-editor/*         # Shared Shortcut editor form
      └─ src/popup.tsx          # Toolbar popup React entry point
          └─ src/ui/popup/PopupApp.tsx

Domain Layer (src/domain/)
  ├─ tabState.ts        # State schema & defaults
  ├─ canvas.ts          # Widget placement and Canvas bounds rules
  ├─ drafts.ts          # Shortcut/Folder edit command drafts
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

## Current Seams

| Seam | Interface | Adapter / Implementation |
|------|-----------|--------------------------|
| Canvas to Widgets | Widget Placement, enabled state, Widget settings | `src/ui/canvas/CanvasWidgetHost.tsx`, `src/ui/widgets/WidgetFrame.tsx` |
| Shortcut Grid Widget to Shortcut Pages | Grid Layout Capacity, active Shortcut Page, visible Top-Level Tiles | `src/ui/widgets/shortcut-grid/shortcutPageModel.ts` |
| Drag Source / Drop Target to Drop Action | `createDropAction()` UI Adapter | `src/ui/drag/dropActionAdapter.ts`, `src/domain/dropActions.ts` |
| Shortcut editing | `ShortcutDraft` and shared editor form | `src/domain/drafts.ts`, `src/ui/shortcut-editor/ShortcutForm.tsx` |
| Persistence | Zustand persisted `TabState` | `src/stores/useTabStore.ts` with Chrome/localStorage fallback |

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
| Drag | Native HTML | Native fits current desktop Chrome behavior; dnd-kit is deferred and not installed |
| Styling | Global CSS index | Runtime imports `src/ui/styles.css`; selectors live beside owning UI Modules |
| Persistence | Zustand persist to chrome.storage.local | localStorage fallback in dev |
| Animation | Motion (Framer Motion) | Reduced motion support |
| Icons | Lucide + Simple Icons | Brand matching |

## Reference Extension Learnings

The extracted reference extension confirms:

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
| Native drag | widgets/shortcut-grid/ShortcutGrid.tsx + useNativeDragOverlay | Custom overlay, no dnd-kit |
| Canvas widget drag | widgets/WidgetFrame.tsx | Pointer-based move/resize in Canvas Edit Mode |
| Widget mounting | canvas/CanvasWidgetHost.tsx | Canvas-owned Widget frames and context menu shell |
| Shortcut Page model | widgets/shortcut-grid/shortcutPageModel.ts | Pure Grid Layout Capacity and page slicing math |
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
- [x] Toolbar Popup-only Shortcut creation flow
- [ ] Widget visual style customization controls
- [ ] Keyboard drag
- [ ] Touch drag

## Near-Task Done

1. **Extracted**: Native drag session logic now lives in `useGridDragSession` hook (`src/ui/widgets/shortcut-grid/useGridDragSession.ts`). ShortcutGrid is now pure rendering (~385 lines).

## Near-Term Direction

1. Route native drag through resolveDrop() or document the UI Adapter as the chosen seam
2. Add focus management for overlays
3. Add touch drag adapters

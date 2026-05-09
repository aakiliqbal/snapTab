# Low-Level Design: Drag and Drop

## Overview

Drag-and-drop in Infi Tab uses native HTML drag events with a custom pointer-following overlay. The domain layer provides `DropAction` types and `resolveDrop()` decision logic.

## Current Architecture

```
ShortcutGrid.tsx (UI Layer)
  ├── dragState: source tracking
  ├── dropTargetKey: current target
  ├── dropPosition: left/center/right
  ├── moveTimerRef: zone debounce
  └── dragOverlay: pointer follow
          │
          ▼ createDropAction()
dropActionAdapter.ts (UI Adapter)
          │
          ▼ Dispatch DropAction
useTabStore (State Layer)
          │
          ▼ applyDropAction()
dropActions.ts (Domain Layer)
  ├── REORDER
  ├── COMBINE
  ├── ADD_TO_FOLDER
  ├── CROSS_PAGE
  ├── PROMOTE
  └── CANCEL
```

## Key Files

| File | Responsibility |
|------|-------------|
| `src/ui/ShortcutGrid.tsx` | UI session, native drag events |
| `src/ui/modals/FolderPanel.tsx` | Folder child drag session and outgoing drag handoff |
| `src/ui/drag/dropActionAdapter.ts` | Drag Source + Drop Target to Drop Action adapter |
| `src/domain/dropActions.ts` | Domain logic, reducer |
| `src/stores/useTabStore.ts` | State persistence |

## UI Session State

Located in `ShortcutGrid.tsx`:

```typescript
type DragState = {
  sourcePageIndex: number;  // Page being dragged from
  sourceIndex: number;    // Index on that page
  sourceKey: string;     // Tile key (prefixed)
  initialRects: Record<string, DOMRect>;
};

type DropPosition = "left" | "center" | "right";
```

## Hit Zones

```
┌─────────────────────────────────────────────┐
│  left (30%)   │ center (40%) │  right (30%) │
│   leading     │    center    │   trailing   │
│   insert      │   combine    │    insert    │
└─────────────────────────────────────────────┘
```

- Left 30%: Leading insert (before target)
- Center 40%: Combine (shortcut → folder) or add to folder
- Right 30%: Trailing insert (after target)

## Zone Confirmation Timer

Used to prevent accidental combines:

```typescript
const ZONE_DEBOUNCE_MS = 200;

moveTimerRef = useRef<ReturnType<typeof setTimeout>>(null);
pendingZone = useState<DropPosition | null>(null);
confirmedZone = useState<DropPosition | null>(null);
```

Flow:
1. User drags over tile
2. `handleZoneChange()` called with new zone
3. `pendingZone` set to new zone
4. 200ms timer starts
5. If still over same zone, `confirmedZone` set
6. Timer cleared on zone change or leave

## Drop Action Decisions

Current production logic routes UI `DragSource` and `DropTarget` values through `createDropAction()`:

| Condition | Action |
|----------|--------|
| source=shortcut, target=shortcut, position=center | COMBINE |
| source=shortcut, target=folder, position=center | ADD_TO_FOLDER |
| position=left | REORDER (before) |
| position=right | REORDER (after) |

`resolveDrop()` remains domain-tested but is not used by production UI yet.

## Drag Overlay

Custom pointer-following tile:

```typescript
const [dragOverlay, setDragOverlay] = useState<{
  tile: ResolvedTopLevelTile;
  x: number;
  y: number;
} | null>(null);
```

- Renders same tile content as source
- Positioned with `fixed`, `pointerEvents: none`
- Coordinates updated via `window.addEventListener('dragover')`

## Cross-Page Drag

Top-Level Tile drag follows the reference extension pattern:

- Page-edge zones are full-height, `10vw` wide, capped at `130px`.
- Holding left/right edge for `300ms` switches the active Shortcut Page during drag.
- Continued edge hold repeats paging with a slower `900ms` cadence.
- Edge overlays fade in as translucent side panels while active.
- Page edge is a preview/navigation target only; final drop still lands on a Top-Level Tile or Shortcut Page surface.
- The original source page ID is captured at drag start so final drop can become `CROSS_PAGE` when persisted source and target pages differ.

## Live Shift Animation

FLIP-like animation for placeholder positions:

```typescript
function getTileShift(tileKey: string): number {
  // Returns -1, 0, or 1 based on
  // source/target positions and active zone
}
```

- Tiles between source and target shift by one slot
- Uses `transform: translateX()` with 100ms transition
- Disabled when `prefers-reduced-motion: reduce`

## Drop Action Flow

```
1. onDragStart
   └─ Set dragState, dragOverlay
       Hide default drag image

2. onDragOver (section level)
   └─ elementsFromPoint() to find target tile
       getDropPosition() to compute zone
       handleZoneChange() to debounce

3. onDrop (section level)
   └─ Use confirmedZone or dropPosition
        Build DropAction through createDropAction()
        dispatchDropAction() to store

4. onDragEnd
   └─ Clear all state
       Remove overlay
```

## Domain Interface

### DropAction Types

```typescript
type DropAction =
  | { type: "REORDER"; tileId: TileId; targetPageId: string; toIndex: number }
  | { type: "COMBINE"; sourceTileId: TileId; targetTileId: TileId; targetPageId: string; folderId?: TileId }
  | { type: "ADD_TO_FOLDER"; sourceTileId: TileId; folderId: TileId; atIndex?: number }
  | { type: "CROSS_PAGE"; tileId: TileId; fromPageId: string; toPageId: string; toIndex: number }
  | { type: "PROMOTE"; tileId: TileId; fromFolderId: TileId; toPageId: string; toIndex: number }
  | { type: "CANCEL" };
```

### resolveDrop()

Pure function for decision logic:

```typescript
function resolveDrop(state: TabState, input: ResolveDropInput): DropAction
```

Input shape:
```typescript
type ResolveDropInput = {
  activeId: TileId;
  overId: TileId | "surface" | null;
  overZone: DropZone | null;  // "leading" | "center" | "trailing"
  sourcePageId: string;
  sourceFolderId?: TileId;
  previewPageId?: string;
  toIndex?: number;
};
```

## Pending Issues

1. **Extract hook**: Drag state lives in ShortcutGrid
2. **Route through resolveDrop()**: Currently bypasses domain function
3. **Cross-page polish**: Top-Level Tile drag uses page-edge hover; folder-child cross-page polish remains future work
4. **Folder child polish**: UI is wired; extraction and more coverage remain
5. **Keyboard drag**: Not implemented
6. **Touch drag**: Not verified

## CSS Classes

| Class | Purpose |
|-------|--------|
| `.dragging-origin` | Source tile (dragSource) |
| `.drop-leading` | Target with leading insert |
| `.drop-center` | Target for combine/add |
| `.drop-trailing` | Target with trailing insert |
| `.combine-preview` | Center drop preview on shortcuts |
| `.drag-overlay-tile` | Pointer-following overlay |

## Test Coverage

Domain tests: `tests/unit/domain/dropActions.test.ts`
- `applyDropAction` for each action type
- `resolveDrop` decision table
- Folder cleanup logic
- Page compaction

Missing: UI-level testing of drag flows

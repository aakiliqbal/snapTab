# Roadmap Issues

Current backlog after architecture analysis. Reference extension extracted to `references/reference-new-tab/`.

## Implemented Features

- [x] New Tab Surface with wallpaper
- [x] Search bar with provider selection
- [x] Paged Shortcut Grid (2x6 default)
- [x] Grid Layout presets (2x4, 2x5, 2x6, 2x7, 3x3)
- [x] Custom Grid Layout (rows, columns, spacing, icon size)
- [x] Top-level Shortcut CRUD
- [x] Folder creation (drag combine)
- [x] Top-level reorder (active page)
- [x] Add shortcut to folder
- [x] FolderPanel child reorder and drag-out promotion
- [x] Settings Drawer
- [x] Wallpaper upload
- [x] JSON Backup export/import
- [x] Zustand + Immer state
- [x] chrome.storage.local persistence

## Remaining Issues

### 1. Extract Top-Level Tile Drag Hook

**Type:** AFK

Move native drag session state and handlers from `ShortcutGrid.tsx` into `useTopLevelTileDrag()` hook.

**Acceptance criteria:**
- [ ] `ShortcutGrid.tsx` no longer owns raw drag timers or overlay state
- [ ] New hook exposes props/handlers for tiles
- [ ] Active-page reorder works
- [ ] Combine and add-to-folder work
- [ ] Debug logging removed
- [ ] Tests pass

**Blocked by:** None

### 2. Route Native Drag Through resolveDrop()

**Type:** AFK

Wire `resolveDrop()` as the decision function for native drag drops instead of constructing actions directly in UI.

**Acceptance criteria:**
- [ ] UI zone names map to domain zone names
- [ ] handleDrop calls resolveDrop()
- [ ] No duplicate action construction
- [ ] dropActions.test.ts covers decision table

**Blocked by:** Issue 1

### 3. Folder Icon Mini-Preview Grid

**Type:** AFK

Show first child icons in Folder tile.

**Acceptance criteria:**
- [ ] Mini grid of child icons
- [ ] Updates on child changes
- [ ] User-edited label still works
- [ ] Legible at all icon sizes

**Blocked by:** None

### 4. Keyboard Drag

**Type:** HITL

Accessible keyboard drag operations.

**Acceptance criteria:**
- [ ] Keyboard reorder works
- [ ] Keyboard combine has command path
- [ ] aria-live announcements
- [ ] Reduced motion works

**Blocked by:** Issue 2

### 5. Icon Recommendations

**Type:** HITL

Improve brand icon matching.

**Acceptance criteria:**
- [ ] More common sites covered
- [ ] Unknown falls back to generated
- [ ] Optional favicon toggle

**Blocked by:** None

### 6. Focus Management

**Type:** AFK

Keyboard-safe overlays.

**Acceptance criteria:**
- [ ] Focus trap in each overlay
- [ ] Escape closes only active
- [ ] Focus returns on close

**Blocked by:** None

### 7. Chrome Web Store Release

**Type:** HITL

Prepare for CWS submission.

**Acceptance criteria:**
- [ ] Permissions reviewed
- [ ] Privacy text drafted
- [ ] Required icons added
- [ ] Screenshots captured
- [ ] Release artifact ready

**Blocked by:** Release readiness

## Completed Issues

These were completed in earlier work:

- [x] Project scaffold
- [x] React + Vite + TypeScript setup
- [x] Zustand + Immer store
- [x] Basic CRUD for Shortcuts
- [x] Folder edit/delete modal
- [x] FolderPanel view
- [x] Search provider selection
- [x] Wallpaper system
- [x] JSON backup
- [x] Page dots navigation
- [x] Wheel navigation
- [x] Keyboard navigation
- [x] Animation (reduced motion)
- [x] FolderPanel Child Drag (outgoing drag freeze bugfix)
- [x] Folder invariant cleanup on delete/import
- [x] Cross-page Top-Level Tile drag via page-edge hover

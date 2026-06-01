# Architecture Review

Latest pass: 2026-05-12.

## Fixed In This Pass

- Folder containment now has stronger locality: shortcut deletion, folder deletion, Drop Actions, and import normalization all enforce Folder child invariants.
- Malformed `ADD_TO_FOLDER` reducer inputs no longer create nested folders or self-membership.
- Top-level and FolderPanel drags share `hideNativeDragImage()` so custom overlays do not compete with browser drag ghosts.
- Grid layout rendering preserves configured columns and spacing on mobile.
- Drop insertion indicators now have a rendered pseudo-element base.
- Grid metric measurement reacts to column spacing changes.
- Cross-page Top-Level Tile drag now uses page-edge hover navigation close to the reference extension.
- Docs now reflect React 19, global CSS, active Zustand persistence, FolderPanel child drag, release automation, and current architecture docs.
- UI files now follow product-concept locality: Canvas hosts Widgets, Widget Modules own their rendering/settings menu sections, Popup owns Toolbar Popup composition, and shared Shortcut UI owns forms/icons/tile styling.
- `src/domain/drafts.ts` owns edit draft contracts so domain operations no longer import UI model files.
- `shortcutPageModel.ts` owns pure Shortcut Page derivation and insertion-position math for Grid Layout Capacity.
- `src/ui/styles.css` is a global stylesheet index; Module-owned selectors live beside their UI Modules.
- Removed stale New Tab Surface Shortcut creation plumbing from the Shortcut Grid Widget and FolderPanel; the Toolbar Popup remains the Shortcut creation flow.
- Renumbered the native drag ADR to avoid duplicate ADR `0005` identifiers.
- Removed inactive dnd-kit dependencies so native drag is the only installed drag Adapter.
- Removed duplicate Search query state from `useNewTabController`; the New Tab Surface owns transient query input state.
- Added an explicit Canvas Widget controller Interface so `CanvasWidgetHost` no longer depends on the full controller Implementation type.

## Remaining Deepening Opportunities

1. **Drag Session Module**

Files: `src/ui/widgets/shortcut-grid/ShortcutGrid.tsx`, `src/ui/widgets/shortcut-grid/FolderPanel.tsx`, `src/ui/drag/*`.

Problem: drag session timers, overlays, geometry, and action dispatch still spread across UI surfaces.

Solution: extract a deeper drag session module that owns debounce, overlay state, native event details, and `DropTarget` creation per surface.

Benefit: more locality for drag bugs, less duplicate dispatch logic, smaller UI render modules.

2. **Drop Decision Seam**

Files: `src/ui/drag/dropActionAdapter.ts`, `src/domain/dropActions.ts`.

Problem: production UI uses `createDropAction()` while `resolveDrop()` is only domain-tested.

Solution: decide whether UI adapter remains the seam or whether production routes through `resolveDrop()`.

Benefit: one decision surface for Drag Source plus Drop Target -> Drop Action.

3. **Persistence Adapter Choice**

Files: `src/stores/useTabStore.ts`, `src/infrastructure/tabStorage.ts`, `src/infrastructure/mediaStorage.ts`.

Problem: IndexedDB media infrastructure exists but active runtime persistence writes data URLs through Zustand persist.

Solution: either wire media materialization into the active store path or delete/defer unused infrastructure.

Benefit: clearer persistence interface and docs; fewer false assumptions about storage size behaviour.

4. **Overlay Focus Module**

Files: `src/ui/settings/SettingsDrawer.tsx`, `src/ui/modals/*`.

Problem: modal/drawer overlays set `aria-modal` but do not trap focus or restore focus.

Solution: create a small focus management module used by all overlays.

Benefit: one accessibility seam, testable focus behaviour.

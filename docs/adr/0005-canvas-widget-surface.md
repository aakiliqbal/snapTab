# ADR 0005: Canvas Widget Surface

- Status: Superseded by [ADR 0007: Unified Launcher Workspace](0007-unified-launcher-workspace.md).

This ADR records the previous design and is retained for historical context. Its original decision to keep Shortcut Pages inside the Shortcut Grid Widget is no longer the target architecture; migration to peer workspace items is described in `docs/launcher-workspace-migration.md`.

## Previous design

SnapTab moved from a fixed page composition to a Canvas-based New Tab Surface. The Canvas fills the viewport, never browser-scrolls, and initially established exactly one Search Widget and one Shortcut Grid Widget as the core surfaces. The same Canvas Widget pattern also hosts Weather, Date & Time, and Snap Feed Widgets. Widgets persist enabled state, visual settings, type-specific settings, and freeform Canvas-relative placement. Canvas Edit Mode is transient and exposes Widget frames, alignment guides, and Widget movement/resizing controls.

In the previous design, Shortcut Pages remained inside the Shortcut Grid Widget. Shortcut and Folder records lived in the existing flat tile map and `pages[].tileIds` order. The Toolbar Popup remained the shortcut creation flow.

## Previous considerations

- **Keep fixed New Tab layout:** Lowest implementation cost, but search/grid customization remains limited to preset positions and sizes.
- **Make every tile a Canvas item:** Maximum flexibility, but requires a new tile-placement model and changes to current Shortcut Page, Folder, and drag/drop semantics.
- **Canvas with Widgets:** The previous choice handled placement and resizing at Widget level while keeping Shortcut Pages and tile/folder behavior inside Shortcut Grid.

## Retained constraints

- Enabled widgets must not overlap; disabled widgets keep settings and last placement but do not reserve space.
- Search provider and search visual settings belong to Search Widget settings.
- Canvas Edit Mode is transient and is not persisted.

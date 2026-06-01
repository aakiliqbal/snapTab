# Canvas Widget Surface

SnapTab will move from a fixed page composition to a Canvas-based New Tab Surface. The Canvas fills the viewport, never browser-scrolls, and contains exactly one Search Widget and one Shortcut Grid Widget. Widgets persist enabled state, visual settings, type-specific settings, and freeform Canvas-relative placement. Canvas Edit Mode is transient and exposes Widget frames, alignment guides, and Widget movement/resizing controls.

Shortcut Pages remain inside the Shortcut Grid Widget. Shortcut and Folder records continue to live in the existing flat tile map and `pages[].tileIds` order. The Toolbar Popup remains the shortcut creation flow, so the New Tab Surface no longer needs a Shortcut creation tile.

## Considered Options

- **Keep fixed New Tab layout:** Lowest implementation cost, but search/grid customization remains limited to preset positions and sizes. It does not support Nova-launcher-style personalization.
- **Make every tile a Canvas item:** Maximum flexibility, but it breaks current Shortcut Page, Folder, and drag/drop semantics and would require a new tile-placement model.
- **Canvas with Widgets (chosen):** Canvas handles placement and resizing at Widget level. Shortcut Grid keeps Shortcut Pages and tile/folder behavior internally. This preserves current domain code while opening a modular personalization path.

## Consequences

- Widget movement/resize must be separate from tile drag/drop.
- Enabled Widgets must not overlap; disabled Widgets keep settings and last placement but do not reserve space.
- Search provider and search visual settings move under Search Widget settings.
- Shortcut Grid fixed row/column presets are retired; rows and columns derive from Widget size.
- Canvas Edit Mode is not persisted and always starts off on new tabs.

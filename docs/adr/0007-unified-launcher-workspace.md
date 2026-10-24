# ADR 0007: Unified Launcher Workspace

- Status: Proposed
- Date: 2026-10-24
- Supersedes: the Shortcut Grid ownership assumption in ADR 0005

## Context

The current Canvas mounts registered widgets, but the Shortcut Grid Widget still owns shortcut pages and folder/shortcut interaction. This makes shortcuts and folders structurally different from other movable widgets and means future launcher behavior would cross several modules. The workspace also persists through Zustand and Chrome storage, and multiple new-tab pages can be open simultaneously.

## Decision

Adopt a unified workspace model in which widgets, shortcuts, and folders are first-class workspace items. The workspace owns pages, grid placement, spans, generic movement, and edit-mode coordination. Item-specific behavior remains in the relevant feature/domain module.

Widgets are registered through a typed module contract. The workspace consumes capabilities and metadata from the registry and must not contain widget-ID-specific conditional logic. Each widget module owns its component, settings UI, defaults, styles, and service integration. Platform APIs stay behind infrastructure adapters.

Migration proceeds through vertical slices. Introduce and test the new domain contract and state compatibility before changing the visible renderer; keep a compatibility path until all shortcut/folder flows are migrated.

## Performance and concurrency constraints

- Keep drag/pointer updates in transient state; persist only meaningful layout changes.
- Use narrow store selectors and stable component boundaries to limit re-render fan-out.
- Keep layout, collision, and page operations bounded to relevant/visible items.
- Cancel or clean up observers, event listeners, timers, and in-flight requests on unmount.
- Avoid loading non-critical widget data before the workspace shell can render.
- Treat Chrome storage events as external updates. Normalization must be idempotent and synchronization must avoid feedback loops and stale whole-state writes when several tabs are open.
- Do not add dependencies without a measured need.

## Consequences

Positive:
- Shortcuts, folders, and widgets can share page movement and placement behavior.
- Widget additions become mostly module-local and registry-driven.
- Generic workspace logic can be tested without rendering each concrete widget.
- Performance concerns become explicit architecture constraints.

Trade-offs:
- The migration requires a versioned state transition and careful backup compatibility.
- Drag/drop must distinguish generic movement from item-specific actions.
- The old Shortcut Grid implementation must remain temporarily available during migration, which adds short-lived complexity.

## Alternatives considered

1. Keep the Shortcut Grid as the owner: lowest migration cost, but violates the peer-item workspace requirement and makes future extension harder.
2. Move all code in one refactor: faster apparent folder cleanup, but high regression risk and poor rollback boundaries.
3. Adopt vertical slices (chosen): each slice delivers a tested user capability and keeps compatibility until the replacement is proven.

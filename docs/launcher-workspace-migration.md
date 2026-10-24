# Launcher Workspace Migration Plan

Status: Draft implementation plan  
Branch: `feat/launcher-workspace-modularity`

## Goal

Evolve SnapTab from a canvas containing a Shortcut Grid Widget into an Android-launcher-style workspace where shortcuts, folders, and widgets are peer workspace items. Keep the implementation modular so adding a widget primarily means adding its feature module and registering its definition.

This plan is organized as vertical slices: each phase should deliver an end-to-end capability with domain behavior, UI integration, persistence compatibility, and tests where applicable. Avoid a large mechanical folder move.

## Product decisions

- The workspace is the root owner of horizontal pages and item placement.
- Shortcuts, folders, Search, Weather, Date & Time, and Snap Feed are peer workspace items.
- The Shortcut Grid Widget stops being the parent of shortcuts and folders.
- A shared grid/placement engine handles cell coordinates and item spans.
- A shared drag session supports moving any workspace item; item-specific drop policies remain in domain modules.
- Widget rendering, settings, defaults, and optional lifecycle work belong to the widget module.
- Existing shortcut/folder behavior, settings, imports, and backups must remain compatible through explicit normalization/migration.
- Edit mode is transient. Persist user layout and widget configuration, not transient drag/edit state.

## Vertical slices

### Slice 1 — Workspace contracts and compatibility seam

Status: **compatibility seam complete; validation pending**

- [x] Define stable namespaced item IDs, page membership, grid placement, and spans.
- [x] Add pure layout normalization tests for stale IDs, duplicates, invalid geometry, and immutability.
- [x] Add a read-only `TabState` adapter that projects existing shortcut pages, folders, and widget placements into the workspace contract without changing persisted state.
- [x] Cover legacy page ordering, folder-child exclusion, geometry mapping, orphaned top-level tiles, and input immutability.
- [x] Add a pure typed resolver for mixed shortcut, folder, and widget page items, including deterministic fallback placement and stale-reference handling.
- [ ] Add a reverse adapter and round-trip tests before changing the persisted source of truth. This remains blocked on deciding how shared workspace page membership maps to the legacy split state without data loss.
- [ ] Validate build and unit tests in CI or a local checkout.

The visible layout and persisted schema remain unchanged. The domain adapter/resolver and shared render primitives exist, but they are not yet wired into the live app or persistence.

**Exit criteria:** old state normalizes deterministically; no data loss; domain tests cover mixed item types and malformed state.

### Slice 2 — Shared workspace renderer

Status: **in progress — shared surface and typed render adapter added; live UI integration still pending**

- [x] Add a pure resolver that projects mixed workspace IDs into typed widget/shortcut/folder render models.
- [x] Add a generic `WorkspacePageSurface` with shared CSS-grid placement, spans, z-order, and a render callback that does not branch on item type.
- [x] Add `WorkspaceItemRenderer`, a typed adapter that delegates each resolved item kind to its owning feature renderer.
- [x] Add focused UI unit tests for item-kind delegation and shared CSS-grid placement.
- [x] Add `WorkspacePageHost` to compose the shared surface and typed item renderer through feature-owned callbacks; cover mixed widget/shortcut/folder composition in a UI test.
- [x] Add a workspace widget adapter that delegates enabled widget content to the existing widget registry without mounting legacy absolute-positioned frames; cover disabled and enabled paths.
- [x] Add shortcut/folder tile renderers that reuse existing shortcut icon and URL-opening behavior, route folder/edit actions through callbacks, and support label visibility; cover rendered markup.
- [x] Add a pure page-navigation model that resolves stale active-page IDs and moves to adjacent pages without wrapping; cover empty layouts and both edges in unit tests.\n- [x] Add an accessible `WorkspacePager` that renders one resolved page at a time, supports controlled or local active-page state, and exposes previous/next controls with edge disabling.\n- [x] Cover initial/controlled page selection, navigation affordances, and empty-state rendering in UI tests.\n- [ ] Wire the live app action bridge and shared page navigation before enabling this renderer in the production surface.
- [ ] Connect the surface and adapter to the app behind a compatibility flag/path and add concrete item-specific render callbacks.
- Render shortcuts and folders as first-class items alongside widget frames.
- Keep the existing Shortcut Grid available behind a compatibility path while the shared renderer is validated.
- Move only the minimum UI required for the first end-to-end mixed page.

**Exit criteria:** a user can render a page with shortcuts, folders, and at least one widget without nested shortcut-grid ownership.

### Opt-in live workspace preview

Status: **integrated in App as a temporary read-only overlay; build, unit tests, and browser smoke tests passed on the initial preview integration; pager stale-page recovery regression added afterward and awaits CI rerun**

- [x] Add a toolbar toggle to open/close the migration preview without replacing the default legacy canvas.
- [x] Derive the preview grid from the same viewport canvas metrics used by the current app.
- [x] Resolve projected pages into mixed widget/shortcut/folder items and render them through the shared pager and feature adapters.
- [x] Route shortcut editing and folder opening to existing controller actions.
- [x] Display a clear failure state when the projected items cannot fit; do not write projected placements to persisted state.
- [x] Validate build, unit tests, and browser smoke tests for the initial preview integration.
- [ ] Manually review the overlay at different viewport sizes and confirm all widget interactions work acceptably before considering a default switch.
- [x] Recover the pager to the first available page when its active page ID becomes stale; cover the regression with a focused UI test.

This is a migration preview, not the new source of truth. It intentionally has no drag-to-persist behavior and does not change saved TabState. Widget rendering in the preview uses feature components without the legacy absolute-positioned WidgetFrame, so visual differences are expected and should be reviewed before broader integration.

### Unified-grid compatibility projection

Status: **read-only projection helper and tests added; live integration pending**

- [x] Add `projectTabStateToWorkspaceGrid`, which accepts explicit grid metrics, adapts legacy state, and normalizes every projected page without writing to storage.
- [x] Prioritize existing widget geometry when assigning cells, then place shortcut/folder tiles in free cells.
- [x] Return a failure result with the original projected layout if any page cannot fit; never persist a partial projection.
- [x] Test immutability, non-overlapping output, mixed item membership, and small-grid failure.
- [ ] Derive metrics from the actual viewport and target cell size in the live app, then expose this projection only behind an opt-in preview until interaction and reverse-persistence behavior are proven.

The helper does not replace the saved TabState. It provides a testable migration preview and makes the unified grid size an explicit input instead of silently mixing shortcut-grid and canvas coordinates.

### Geometry safety seam — bounded collision-free placements

Status: **pure domain helper added; renderer integration pending**

- [x] Add an atomic geometry normalization helper that clamps item spans/coordinates to page bounds and resolves collisions deterministically in page membership order.
- [x] Preserve immutability and return the original layout unchanged when the page is missing or its items cannot fit.
- [x] Add tests for bounds, collision fallback, deterministic order, overflow rejection, and missing pages.
- [ ] Use the helper at the workspace integration boundary only after a single unified grid metric is chosen for widgets and tiles.

This is intentionally not wired into the legacy app yet: current canvas widgets and shortcut tiles use different coordinate systems, so choosing metrics is a product/migration decision rather than a safe implicit conversion.

### Slice 3 — Unified drag, drop, and edit mode

Status: **in progress — pure operations, drag lifecycle, and bounded placement helpers added; UI wiring next**

- [x] Add pure cross-page/in-page item movement and grid-placement updates.
- [x] Add a shared drag-session state machine for begin, target preview, cancel, and commit, independent of item type.
- [x] Add bounded grid placement, overlap detection, and deterministic row-major free-cell search for future shared drag previews.
- [x] Cover stale drag sources/targets, cancellation, placement preservation, and cross-page commits with domain tests.
- [x] Cover workspace placement bounds, edge-touching rectangles, collision resolution, and full-page behavior with domain tests.
- [x] Allow drag commits to accept grid metrics and resolve overlapping previews to a deterministic free cell; reject the move atomically if the destination page is full.
- [x] Add drag-commit tests for collision fallback, full-page rejection, and stale sessions after a concurrent move.
- [x] Reject commits whose item no longer belongs to the session’s source page, avoiding stale drag sessions overwriting concurrent changes.
- [x] Reject commits when the item’s placement or source-page index changed after drag start, preventing an old drag preview from overwriting a concurrent resize/reposition/reorder.
- [ ] Wire the shared drag session and collision resolver to workspace item hosts and page-edge navigation.

The domain guard now rejects stale source membership, source ordering, and source geometry. This protects the future UI integration from concurrent edits, but drag events are not yet wired into the preview surface.
- Extract drag session lifecycle, pointer/keyboard intent, overlay, geometry, and cancellation into shared workspace drag infrastructure.
- Keep drop decisions pure and domain-owned; adapters translate UI events into domain actions.
- Support reordering, moving across pages, widget movement/resizing, and valid shortcut/folder operations.
- Preserve accessibility and prevent edit-mode widget drag from conflicting with shortcut/folder operations.

**Exit criteria:** shared drag tests cover mixed source/target types, cancellation, page changes, invalid folder operations, and widget span collisions.

### Slice 4 — Widget module boundary and registry

- Establish a typed widget definition contract: ID, label, defaults, renderer, settings UI, supported resize axes/spans, and optional lifecycle hooks.
- Keep the registry as the single composition point; workspace and generic drag code must not branch on concrete widget IDs.
- Co-locate each widget's component, styles, settings UI, defaults, and service adapter.
- Remove concrete widget imports from unrelated modules where the registry or module API can own them.

**Exit criteria:** a sample widget can be added by creating its module and registering its definition, without editing workspace rendering, drag logic, or persistence plumbing.

### Slice 5 — Persistence, multi-tab safety, and performance hardening

- Keep Chrome storage access behind the infrastructure adapter and preserve localStorage fallback.
- Handle simultaneous new-tab instances safely: storage changes must converge without write/rehydration loops or stale whole-state overwrites.
- Keep per-tab transient UI state local; avoid broad Zustand subscriptions that cause every item to re-render for unrelated changes.
- Cache pure layout/placement calculations by stable inputs; avoid repeated full-tree derivation during pointer movement.
- Deduplicate or cancel widget refreshes where possible, use bounded refresh behavior, and clean up listeners/timers on unmount.
- Ensure expensive widgets defer work until visible/needed and do not block initial workspace paint.

**Exit criteria:** build/tests pass; a multi-tab test or documented manual verification covers concurrent edits and storage events; profiling shows drag movement does not trigger unnecessary full-workspace recalculation.

### Slice 6 — Remove compatibility path and finalize architecture

- Remove the Shortcut Grid parent model once all shortcut/folder flows run through workspace pages.
- Delete obsolete placement/page code and update architecture/ADR docs.
- Add a widget authoring guide and a regression checklist.
- Run build, unit tests, and Playwright smoke tests; document anything that cannot be run in the available environment.

**Exit criteria:** no duplicate source of truth for page membership; docs match code; tests and performance checks are reported accurately.

## Target module boundaries

```text
src/
  app/                         # application composition and entry points
  workspace/
    domain/                    # page/item/placement contracts and pure rules
    layout/                    # grid metrics, spans, collision and packing
    drag-drop/                 # generic drag session and event adapters
    components/                # pages, item host, edit mode
    state/                     # workspace selectors and actions
  widgets/
    registry/                  # typed registration/composition seam
    search/
    weather/
    date-time/
    snap-feed/
  shortcuts/                   # shortcut rendering, actions, and domain adapters
  folders/                     # folder rules and UI
  domain/                      # shared cross-feature domain types only
  infrastructure/              # Chrome APIs, storage, network adapters
  shared/                      # generic primitives and utilities
```

This is a target boundary, not a mandate to move every existing file immediately. Move files only when a vertical slice makes the new ownership real.

## Performance requirements

- **Fast first paint:** render the shell and persisted layout before non-critical widget data loads.
- **No global drag state churn:** pointer movement must not update the entire persisted workspace store on every frame; use transient session state and commit placement at meaningful boundaries.
- **Narrow subscriptions:** item components subscribe only to the state they need; use selectors and stable callbacks.
- **Bounded work:** layout and collision operations should scale with visible items, not all possible future pages.
- **Lifecycle hygiene:** listeners, timers, observers, and network requests must be cleaned up or cancelled.
- **Multi-tab correctness:** treat `chrome.storage.onChanged` as external synchronization, avoid rehydrate/write feedback loops, and make normalization idempotent.
- **No speculative dependencies:** prefer existing React/Zustand/Motion capabilities unless profiling proves a need.

## Review and testing checklist

- [ ] Existing settings and backup import/export remain compatible.
- [ ] Shortcut and folder invariants remain enforced.
- [ ] Widget enable/disable and settings survive reload.
- [ ] Mixed item types can be moved and persisted.
- [ ] Multiple tabs opened simultaneously remain responsive and converge on external storage changes.
- [ ] Build, unit tests, and smoke tests are run and results recorded.
- [ ] New-widget authoring requires no workspace-specific conditional branches.

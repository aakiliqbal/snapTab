# Single Zustand + Immer Store

All persisted state — tiles, pages, search provider, layout settings, and wallpaper — lives in a single Zustand store with immer middleware and a `chrome.storage.local` persist adapter. The store exposes `updateState()` for reducer-style mutations; the UI controller currently wraps `applyDropAction()` for drag-and-drop. Non-persisted UI state (modal drafts, drawer open, active page index) remains in React component state — it is transient and does not need persistence or cross-component sharing.

A single store was chosen over two (tiles vs settings) because grid layout changes directly affect page capacity, making the coupling between settings and tiles too tight to split cleanly. One store means one storage key, one `schemaVersion`, one backup value, and no cross-store coordination.

## Considered Options

- **Keep `useState` in `useNewTabController` (former approach):** All state lives in one hook with manual `persistState()` calls. Simpler setup, but multi-phase drag operations (combine, cross-page, promote) require threading state through many async steps. Unit-testing mutations requires rendering the hook.
- **Two Zustand stores (tiles + settings):** Clean separation, but grid layout changes require cross-store coordination to rebalance pages. Two persist middlewares, two storage keys, two schema versions — complexity without real benefit.
- **Single Zustand store (chosen):** All persisted state in one place. Mutations are immer reducers, pure and unit-testable without React. Persistence is declarative via middleware. Layout changes that affect page capacity are a single action. Adds two dependencies (zustand, immer) but removes the manual persistence orchestration and the 230-line controller hook.

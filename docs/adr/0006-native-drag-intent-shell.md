# Native Drag Intent Shell

The active Top-Level Tile drag implementation uses browser-native HTML drag events in `ShortcutGrid.tsx` with a custom pointer-following overlay. Earlier planning preferred dnd-kit, but the current code and reference-extension behavior are better represented as a small drag intent shell over the existing domain reducer.

Native drag is kept for the current desktop Chrome MVP because it already supports active-page reorder, Shortcut-to-Shortcut combine, and Shortcut-to-Folder add with a small UI surface. The deeper interface remains `DropAction`; drag mechanics should be replaceable without rewriting `applyDropAction()` or the state model.

## Drag State Cleanup

When handling mixed drag sources (top-level tile drag + folder-child outgoing drag), stale transient state must be cleared before starting a new drag session. The pattern: `clearDragSession()` called in a `useEffect` keyed on `outgoingDragSource` change before the new drag initializes.

## Consequences

- `ShortcutGrid` owns geometry and transient drag session state.
- `dropActions.ts` owns durable meaning and folder lifecycle rules.
- Cross-page drag, folder-child promote, touch drag, and keyboard drag are not solved by native drag today.
- dnd-kit dependencies are not part of the active implementation and were removed; reintroduce them only through a deliberate future ADR.
- Before adding more drag flows, extract the native drag session into a hook and route UI drops through `resolveDrop()`.
- Mixed drag sessions (folder-child PROMOTE + top-level reorder) require proactive state cleanup.

## Considered Options

- **dnd-kit shell:** Better for keyboard and touch input, but the active code no longer uses it and the earlier issues describe components that do not exist.
- **Native drag shell (chosen):** Smaller and already close to the reference desktop interaction. It carries touch and keyboard limitations, so those must be explicit future adapters instead of hidden assumptions.
- **Pointer events from scratch:** Maximum control, but too much low-level browser behavior for the current MVP.

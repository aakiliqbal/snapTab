import type { TabState } from "./tabState";
import { tabStateToWorkspaceLayout } from "./workspaceAdapter";
import type { WorkspaceLayout } from "./workspace";
import { normalizeWorkspacePageGeometry } from "./workspaceGeometry";
import type { WorkspaceGridMetrics } from "./workspaceLayout";

export type WorkspaceProjectionResult =
  | { ok: true; layout: WorkspaceLayout }
  | { ok: false; reason: "page-overflow"; pageId: string; layout: WorkspaceLayout };

/**
 * Creates a read-only preview of the legacy state on a single explicit grid.
 *
 * Metrics are supplied by the caller (normally derived from viewport size and
 * target cell size). The returned layout is not persisted. Existing widget
 * geometry is prioritized; tiles are placed in available cells around it.
 * If any page cannot fit, the original projected layout is returned atomically.
 */
export function projectTabStateToWorkspaceGrid(
  state: TabState,
  metrics: WorkspaceGridMetrics
): WorkspaceProjectionResult {
  const projected = tabStateToWorkspaceLayout(state);
  let layout = projected;

  for (const page of projected.pages) {
    const normalized = normalizeWorkspacePageGeometry(layout, page.id, metrics);
    if (!normalized.ok) {
      if (normalized.reason === "page-overflow") {
        return { ok: false, reason: "page-overflow", pageId: page.id, layout: projected };
      }
      return { ok: false, reason: "page-overflow", pageId: page.id, layout: projected };
    }
    layout = normalized.layout;
  }

  return { ok: true, layout };
}

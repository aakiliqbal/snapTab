import type { TabState } from "./tabState";
import { workspaceLayoutToTabState } from "./workspaceAdapter";
import type { WorkspaceLayout } from "./workspace";

export type WorkspaceSaveResult =
  | { ok: true; state: TabState }
  | { ok: false; reason: "stale-state" };

/**
 * Builds a candidate saved state only when the underlying legacy state still
 * matches the snapshot used to open the preview. This keeps conflict handling
 * deterministic and testable without coupling the domain to browser storage.
 */
export function prepareWorkspaceLayoutSave(
  baseState: TabState,
  latestState: TabState,
  layout: WorkspaceLayout
): WorkspaceSaveResult {
  if (JSON.stringify(latestState) !== JSON.stringify(baseState)) {
    return { ok: false, reason: "stale-state" };
  }

  return {
    ok: true,
    state: workspaceLayoutToTabState(baseState, layout)
  };
}

import type { ResolvedWorkspaceItem } from "../../domain/workspaceItemModel";
import { WorkspaceItemRenderer, type WorkspaceItemRenderers } from "./WorkspaceItemRenderer";
import { WorkspacePageSurface } from "./WorkspacePageSurface";

export type WorkspacePageHostProps = {
  items: ResolvedWorkspaceItem[];
  columns: number;
  rows: number;
  editMode: boolean;
  renderers: WorkspaceItemRenderers;
};

/**
 * Composes the shared page geometry with the feature-owned item renderer.
 * The caller supplies already-resolved items and feature callbacks, keeping
 * persistence and feature state outside this reusable presentation boundary.
 */
export function WorkspacePageHost({
  columns,
  editMode,
  items,
  renderers,
  rows
}: WorkspacePageHostProps) {
  return (
    <WorkspacePageSurface
      columns={columns}
      editMode={editMode}
      items={items}
      rows={rows}
      renderItem={(item) => <WorkspaceItemRenderer item={item} renderers={renderers} />}
    />
  );
}

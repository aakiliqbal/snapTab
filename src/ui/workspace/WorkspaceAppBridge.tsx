import type { ReactNode } from "react";
import type { ResolvedWorkspaceItem } from "../../domain/workspaceItemModel";
import type { Shortcut } from "../../domain/tabState";
import type { WidgetRenderContext } from "../widgets/widgetRegistry";
import { WorkspacePageHost } from "./WorkspacePageHost";
import { createWorkspaceTileRenderers } from "./WorkspaceTileRenderers";
import { renderWorkspaceWidget } from "./workspaceWidgetAdapter";

export type WorkspaceAppBridgeProps = {
  items: ResolvedWorkspaceItem[];
  columns: number;
  rows: number;
  editMode: boolean;
  widgetContext: WidgetRenderContext;
  onOpenFolder: (folderId: string) => void;
  onEditShortcut: (shortcut: Shortcut) => void;
  showLabels?: boolean;
};

export function WorkspaceAppBridge({
  columns,
  editMode,
  items,
  onEditShortcut,
  onOpenFolder,
  rows,
  showLabels,
  widgetContext
}: WorkspaceAppBridgeProps): ReactNode {
  const renderers = createWorkspaceTileRenderers({
    renderWidget: (item) => renderWorkspaceWidget(item, widgetContext),
    onOpenFolder,
    onEditShortcut,
    showLabels
  });

  return (
    <WorkspacePageHost
      columns={columns}
      editMode={editMode}
      items={items}
      renderers={renderers}
      rows={rows}
    />
  );
}

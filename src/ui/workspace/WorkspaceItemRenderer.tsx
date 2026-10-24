import type { ReactNode } from "react";
import type { ResolvedWorkspaceItem } from "../../domain/workspaceItemModel";

export type WorkspaceItemRenderers = {
  renderWidget: (item: Extract<ResolvedWorkspaceItem, { kind: "widget" }>) => ReactNode;
  renderShortcut: (item: Extract<ResolvedWorkspaceItem, { kind: "shortcut" }>) => ReactNode;
  renderFolder: (item: Extract<ResolvedWorkspaceItem, { kind: "folder" }>) => ReactNode;
};

type WorkspaceItemRendererProps = {
  item: ResolvedWorkspaceItem;
  renderers: WorkspaceItemRenderers;
};

/**
 * Feature adapter for the shared workspace surface.
 *
 * This component intentionally knows only the resolved item discriminant. The
 * widget registry and shortcut/folder modules own their rendering and actions;
 * workspace layout and drag code do not need to import feature components.
 */
export function WorkspaceItemRenderer({ item, renderers }: WorkspaceItemRendererProps) {
  switch (item.kind) {
    case "widget":
      return <>{renderers.renderWidget(item)}</>;
    case "shortcut":
      return <>{renderers.renderShortcut(item)}</>;
    case "folder":
      return <>{renderers.renderFolder(item)}</>;
  }
}

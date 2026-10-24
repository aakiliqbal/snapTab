import type { ReactNode } from "react";
import type { ResolvedWorkspaceItem } from "../../domain/workspaceItemModel";
import type { Shortcut } from "../../domain/tabState";
import { openShortcutUrl } from "../../infrastructure/openShortcutUrl";
import { ShortcutIcon } from "../widgets/shortcut-grid/shortcuts";
import type { WorkspaceItemRenderers } from "./WorkspaceItemRenderer";

type WorkspaceShortcut = Extract<ResolvedWorkspaceItem, { kind: "shortcut" }>;
type WorkspaceFolder = Extract<ResolvedWorkspaceItem, { kind: "folder" }>;

export type WorkspaceTileRendererOptions = {
  renderWidget: (item: Extract<ResolvedWorkspaceItem, { kind: "widget" }>) => ReactNode;
  onOpenFolder: (folderId: string) => void;
  onEditShortcut: (shortcut: Shortcut) => void;
  showLabels?: boolean;
};

/**
 * Bridges workspace tile models to the existing shortcut icon and URL-opening
 * behavior. Folder/shortcut callbacks remain owned by the app/controller.
 */
export function createWorkspaceTileRenderers({
  onEditShortcut,
  onOpenFolder,
  renderWidget,
  showLabels = true
}: WorkspaceTileRendererOptions): WorkspaceItemRenderers {
  return {
    renderWidget,
    renderShortcut: (item: WorkspaceShortcut) => (
      <div className="quick-link workspace-quick-link">
        <a
          className="quick-link-launch"
          href={item.tile.url}
          draggable={false}
          onClick={(event) => {
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
              return;
            }

            event.preventDefault();
            openShortcutUrl(item.tile.url);
          }}
        >
          <ShortcutIcon shortcut={item.tile} />
          {showLabels ? <span className="quick-link-title">{item.tile.title}</span> : null}
        </a>
        <button
          className="quick-link-edit"
          type="button"
          aria-label={`Edit ${item.tile.title}`}
          onClick={(event) => {
            event.stopPropagation();
            onEditShortcut(item.tile);
          }}
        >
          <span aria-hidden="true">✎</span>
        </button>
      </div>
    ),
    renderFolder: (item: WorkspaceFolder) => (
      <button
        className="quick-link folder-link workspace-quick-link"
        type="button"
        onClick={() => onOpenFolder(item.tileId)}
        aria-label={`Open folder ${item.tile.title}`}
      >
        <span
          className="quick-link-icon folder-icon"
          style={{ backgroundColor: item.tile.icon.background }}
          aria-hidden="true"
        >
          {item.tile.icon.label}
        </span>
        {showLabels ? <span className="quick-link-title">{item.tile.title}</span> : null}
      </button>
    )
  };
}

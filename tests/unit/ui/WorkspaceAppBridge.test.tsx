import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ResolvedWorkspaceItem } from "../../../src/domain/workspaceItemModel";
import { WorkspaceAppBridge } from "../../../src/ui/workspace/WorkspaceAppBridge";
import type { WidgetRenderContext } from "../../../src/ui/widgets/widgetRegistry";

const placement = { column: 0, row: 0, columnSpan: 1, rowSpan: 1, zIndex: 1 };

describe("WorkspaceAppBridge", () => {
  it("binds existing shortcut and folder callbacks into the shared host", () => {
    const shortcut = {
      kind: "shortcut" as const,
      id: "docs",
      title: "Docs",
      url: "https://example.com",
      icon: { type: "fallback" as const, label: "D", background: "#123456" }
    };
    const folder = {
      kind: "folder" as const,
      id: "tools",
      title: "Tools",
      icon: { type: "fallback" as const, label: "T", background: "#654321" },
      childIds: []
    };
    const items = [
      { kind: "shortcut", id: "tile:docs", tileId: "docs", tile: shortcut, placement },
      { kind: "folder", id: "tile:tools", tileId: "tools", tile: folder, placement }
    ] as unknown as ResolvedWorkspaceItem[];
    const onOpenFolder = vi.fn();
    const onEditShortcut = vi.fn();

    const markup = renderToStaticMarkup(
      <WorkspaceAppBridge
        items={items}
        columns={6}
        rows={4}
        editMode={false}
        widgetContext={{} as WidgetRenderContext}
        onOpenFolder={onOpenFolder}
        onEditShortcut={onEditShortcut}
      />
    );

    expect(markup).toContain('aria-label="Launcher workspace"');
    expect(markup).toContain("Docs");
    expect(markup).toContain("Tools");
    expect(markup).toContain('data-workspace-item-id="tile:docs"');
    expect(markup).toContain('data-workspace-item-id="tile:tools"');
  });
});

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ResolvedWorkspaceItem } from "../../../src/domain/workspaceItemModel";
import { createWorkspaceTileRenderers } from "../../../src/ui/workspace/WorkspaceTileRenderers";

const placement = { column: 0, row: 0, columnSpan: 1, rowSpan: 1, zIndex: 1 };
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

describe("WorkspaceTileRenderers", () => {
  it("renders shortcut and folder tiles with their existing visual classes", () => {
    const renderers = createWorkspaceTileRenderers({
      renderWidget: () => createElement("div", null, "widget"),
      onOpenFolder: vi.fn(),
      onEditShortcut: vi.fn()
    });
    const shortcutItem = {
      kind: "shortcut", id: "tile:docs", tileId: "docs", tile: shortcut, placement
    } as unknown as ResolvedWorkspaceItem;
    const folderItem = {
      kind: "folder", id: "tile:tools", tileId: "tools", tile: folder, placement
    } as unknown as ResolvedWorkspaceItem;

    const shortcutMarkup = renderToStaticMarkup(
      renderers.renderShortcut(shortcutItem as Extract<ResolvedWorkspaceItem, { kind: "shortcut" }>) as never
    );
    const folderMarkup = renderToStaticMarkup(
      renderers.renderFolder(folderItem as Extract<ResolvedWorkspaceItem, { kind: "folder" }>) as never
    );

    expect(shortcutMarkup).toContain('href="https://example.com"');
    expect(shortcutMarkup).toContain("Docs");
    expect(shortcutMarkup).toContain('aria-label="Edit Docs"');
    expect(folderMarkup).toContain('aria-label="Open folder Tools"');
    expect(folderMarkup).toContain("Tools");
  });

  it("can omit labels while keeping shortcut/folder accessible names", () => {
    const renderers = createWorkspaceTileRenderers({
      renderWidget: () => null,
      onOpenFolder: vi.fn(),
      onEditShortcut: vi.fn(),
      showLabels: false
    });
    const folderItem = {
      kind: "folder", id: "tile:tools", tileId: "tools", tile: folder, placement
    } as unknown as Extract<ResolvedWorkspaceItem, { kind: "folder" }>;
    const markup = renderToStaticMarkup(renderers.renderFolder(folderItem) as never);

    expect(markup).toContain('aria-label="Open folder Tools"');
    expect(markup).not.toContain('class="quick-link-title"');
  });
});

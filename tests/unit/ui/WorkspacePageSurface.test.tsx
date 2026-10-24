import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ResolvedWorkspaceItem } from "../../../src/domain/workspaceItemModel";
import { WorkspacePageSurface } from "../../../src/ui/workspace/WorkspacePageSurface";

describe("WorkspacePageSurface", () => {
  it("applies shared grid placement and delegates item content", () => {
    const item = {
      kind: "shortcut",
      id: "tile:docs",
      placement: { column: 2, row: 1, columnSpan: 2, rowSpan: 1, zIndex: 4 }
    } as unknown as ResolvedWorkspaceItem;
    const renderItem = vi.fn(() => createElement("button", null, "Docs"));

    const markup = renderToStaticMarkup(
      createElement(WorkspacePageSurface, {
        columns: 6,
        rows: 4,
        editMode: true,
        items: [item],
        renderItem
      })
    );

    expect(markup).toContain('aria-label="Launcher workspace"');
    expect(markup).toContain('class="workspace-page-surface editing"');
    expect(markup).toContain("grid-template-columns:repeat(6, minmax(0, 1fr))");
    expect(markup).toContain("grid-column:3 / span 2");
    expect(markup).toContain("grid-row:2 / span 1");
    expect(markup).toContain("z-index:4");
    expect(markup).toContain("Docs");
    expect(renderItem).toHaveBeenCalledWith(item);
  });
});

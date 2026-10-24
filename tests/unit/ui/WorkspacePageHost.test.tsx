import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ResolvedWorkspaceItem } from "../../../src/domain/workspaceItemModel";
import { WorkspacePageHost } from "../../../src/ui/workspace/WorkspacePageHost";

function item(kind: "widget" | "shortcut" | "folder", id: string): ResolvedWorkspaceItem {
  return {
    kind,
    id,
    placement: { column: 0, row: 0, columnSpan: 1, rowSpan: 1, zIndex: 1 }
  } as unknown as ResolvedWorkspaceItem;
}

describe("WorkspacePageHost", () => {
  it("composes the shared surface with feature-owned render callbacks", () => {
    const widget = item("widget", "widget:weather");
    const shortcut = item("shortcut", "tile:docs");
    const folder = item("folder", "tile:tools");
    const renderers = {
      renderWidget: vi.fn(() => createElement("div", null, "Weather widget")),
      renderShortcut: vi.fn(() => createElement("button", null, "Docs shortcut")),
      renderFolder: vi.fn(() => createElement("button", null, "Tools folder"))
    };

    const markup = renderToStaticMarkup(
      createElement(WorkspacePageHost, {
        items: [widget, shortcut, folder],
        columns: 6,
        rows: 4,
        editMode: false,
        renderers
      })
    );

    expect(markup).toContain('aria-label="Launcher workspace"');
    expect(markup).toContain('data-workspace-item-id="widget:weather"');
    expect(markup).toContain('data-workspace-item-id="tile:docs"');
    expect(markup).toContain('data-workspace-item-id="tile:tools"');
    expect(markup).toContain("Weather widget");
    expect(markup).toContain("Docs shortcut");
    expect(markup).toContain("Tools folder");
    expect(renderers.renderWidget).toHaveBeenCalledWith(widget);
    expect(renderers.renderShortcut).toHaveBeenCalledWith(shortcut);
    expect(renderers.renderFolder).toHaveBeenCalledWith(folder);
  });
});

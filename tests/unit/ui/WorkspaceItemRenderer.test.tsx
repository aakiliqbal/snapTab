import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ResolvedWorkspaceItem } from "../../../src/domain/workspaceItemModel";
import { WorkspaceItemRenderer } from "../../../src/ui/workspace/WorkspaceItemRenderer";

describe("WorkspaceItemRenderer", () => {
  it.each(["widget", "shortcut", "folder"] as const)("delegates %s items to their feature renderer", (kind) => {
    const renderWidget = vi.fn(() => createElement("div", null, "widget-view"));
    const renderShortcut = vi.fn(() => createElement("div", null, "shortcut-view"));
    const renderFolder = vi.fn(() => createElement("div", null, "folder-view"));
    const item = { kind, id: `${kind}:example` } as unknown as ResolvedWorkspaceItem;

    const markup = renderToStaticMarkup(
      createElement(WorkspaceItemRenderer, {
        item,
        renderers: { renderWidget, renderShortcut, renderFolder }
      })
    );

    if (kind === "widget") {
      expect(markup).toContain("widget-view");
      expect(renderWidget).toHaveBeenCalledWith(item);
      expect(renderShortcut).not.toHaveBeenCalled();
      expect(renderFolder).not.toHaveBeenCalled();
    } else if (kind === "shortcut") {
      expect(markup).toContain("shortcut-view");
      expect(renderShortcut).toHaveBeenCalledWith(item);
      expect(renderWidget).not.toHaveBeenCalled();
      expect(renderFolder).not.toHaveBeenCalled();
    } else {
      expect(markup).toContain("folder-view");
      expect(renderFolder).toHaveBeenCalledWith(item);
      expect(renderWidget).not.toHaveBeenCalled();
      expect(renderShortcut).not.toHaveBeenCalled();
    }
  });
});

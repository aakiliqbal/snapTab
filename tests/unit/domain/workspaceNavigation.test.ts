import { describe, expect, it } from "vitest";
import { getAdjacentWorkspacePageId, getWorkspacePageIndex } from "../../../src/domain/workspaceNavigation";
import { type WorkspaceLayout } from "../../../src/domain/workspace";

const layout: WorkspaceLayout = {
  schemaVersion: 1,
  pages: [
    { id: "home", itemIds: [] },
    { id: "work", itemIds: [] },
    { id: "media", itemIds: [] }
  ],
  placements: {}
};

describe("workspace navigation", () => {
  it("resolves the active page index and falls back for a stale page ID", () => {
    expect(getWorkspacePageIndex(layout, "work")).toBe(1);
    expect(getWorkspacePageIndex(layout, "deleted-page")).toBe(0);
    expect(getWorkspacePageIndex({ ...layout, pages: [] }, "home")).toBe(-1);
  });

  it("navigates between adjacent pages without wrapping at either edge", () => {
    expect(getAdjacentWorkspacePageId(layout, "home", "previous")).toBe("home");
    expect(getAdjacentWorkspacePageId(layout, "home", "next")).toBe("work");
    expect(getAdjacentWorkspacePageId(layout, "work", "previous")).toBe("home");
    expect(getAdjacentWorkspacePageId(layout, "work", "next")).toBe("media");
    expect(getAdjacentWorkspacePageId(layout, "media", "next")).toBe("media");
  });

  it("returns null when there are no pages", () => {
    expect(getAdjacentWorkspacePageId({ ...layout, pages: [] }, "home", "next")).toBeNull();
  });
});

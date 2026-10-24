import { describe, expect, it } from "vitest";
import { defaultTabState } from "../../../src/domain/tabState";
import { projectTabStateToWorkspaceGrid } from "../../../src/domain/workspaceProjection";
import { workspaceTileItemId, workspaceWidgetItemId } from "../../../src/domain/workspace";
import { workspacePlacementsOverlap } from "../../../src/domain/workspaceLayout";

describe("projectTabStateToWorkspaceGrid", () => {
  it("projects legacy items into one bounded grid without mutating saved state", () => {
    const state = structuredClone(defaultTabState);
    state.pages = [{ id: "home", tileIds: ["docs"] }];
    state.canvas.widgets.search.placement = {
      x: 0, y: 0, width: 5, height: 1, zIndex: 1
    };
    state.canvas.widgets.weather.placement = {
      x: 8, y: 0, width: 4, height: 3, zIndex: 1
    };
    const snapshot = structuredClone(state);

    const result = projectTabStateToWorkspaceGrid(state, { columns: 34, rows: 19 });

    expect(result.ok).toBe(true);
    expect(state).toEqual(snapshot);
    if (!result.ok) return;

    const home = result.layout.pages.find((page) => page.id === "home")!;
    expect(home.itemIds).toContain(workspaceTileItemId("docs"));
    expect(home.itemIds).toContain(workspaceWidgetItemId("search"));
    expect(home.itemIds).toContain(workspaceWidgetItemId("weather"));

    const placements = home.itemIds
      .map((id) => result.layout.placements[id])
      .filter((placement): placement is NonNullable<typeof placement> => Boolean(placement));
    for (let left = 0; left < placements.length; left += 1) {
      for (let right = left + 1; right < placements.length; right += 1) {
        expect(workspacePlacementsOverlap(placements[left], placements[right])).toBe(false);
      }
    }
  });

  it("fails atomically when the unified grid cannot fit all projected widgets", () => {
    const state = structuredClone(defaultTabState);
    state.pages = [{ id: "home", tileIds: [] }];

    const result = projectTabStateToWorkspaceGrid(state, { columns: 2, rows: 2 });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("page-overflow");
      expect(result.pageId).toBe("home");
      expect(result.layout.pages[0].itemIds).toContain(workspaceWidgetItemId("search"));
    }
  });
});

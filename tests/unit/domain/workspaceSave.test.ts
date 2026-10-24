import { describe, expect, it } from "vitest";
import { defaultTabState } from "../../../src/domain/tabState";
import { tabStateToWorkspaceLayout, workspaceLayoutToTabState } from "../../../src/domain/workspaceAdapter";
import { prepareWorkspaceLayoutSave } from "../../../src/domain/workspaceSave";
import { workspaceTileItemId, workspaceWidgetItemId } from "../../../src/domain/workspace";

describe("prepareWorkspaceLayoutSave", () => {
  it("prepares a saved state when the base snapshot is still current", () => {
    const base = structuredClone(defaultTabState);
    const latest = structuredClone(base);
    const layout = tabStateToWorkspaceLayout(base);
    layout.pages[0].itemIds = layout.pages[0].itemIds.filter((id) => id !== workspaceTileItemId("docs"));
    layout.pages.push({ id: "work", itemIds: [workspaceTileItemId("docs")] });
    layout.placements[workspaceWidgetItemId("weather")] = {
      column: 2,
      row: 1,
      columnSpan: 4,
      rowSpan: 3,
      zIndex: 9
    };

    const result = prepareWorkspaceLayoutSave(base, latest, layout);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.pages.map((page) => ({ id: page.id, tileIds: page.tileIds }))).toEqual([
      { id: "page-1", tileIds: base.pages[0].tileIds.filter((id) => id !== "docs") },
      { id: "work", tileIds: ["docs"] }
    ]);
    expect(result.state.canvas.widgets.weather.placement).toEqual({
      x: 2,
      y: 1,
      width: 4,
      height: 3,
      zIndex: 9
    });
    expect(result.state.tiles).toEqual(base.tiles);
    expect(base).toEqual(defaultTabState);
  });

  it("rejects saving if another tab or panel changed the state after preview opened", () => {
    const base = structuredClone(defaultTabState);
    const latest = structuredClone(base);
    latest.themeId = latest.themeId === "light" ? "dark" : "light";
    const layout = tabStateToWorkspaceLayout(base);
    const latestSnapshot = structuredClone(latest);

    const result = prepareWorkspaceLayoutSave(base, latest, layout);

    expect(result).toEqual({ ok: false, reason: "stale-state" });
    expect(latest).toEqual(latestSnapshot);
  });

  it("does not report a conflict for equivalent snapshots", () => {
    const base = structuredClone(defaultTabState);
    const latest = structuredClone(base);
    const result = prepareWorkspaceLayoutSave(base, latest, tabStateToWorkspaceLayout(base));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.state).toEqual(workspaceLayoutToTabState(base, tabStateToWorkspaceLayout(base)));
    }
  });
});

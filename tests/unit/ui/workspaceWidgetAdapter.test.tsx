import { describe, expect, it } from "vitest";
import { defaultCanvasState } from "../../../src/domain/canvas";
import type { ResolvedWorkspaceItem } from "../../../src/domain/workspaceItemModel";
import { renderWorkspaceWidget } from "../../../src/ui/workspace/workspaceWidgetAdapter";
import type { WidgetRenderContext } from "../../../src/ui/widgets/widgetRegistry";

const placement = { column: 0, row: 0, columnSpan: 2, rowSpan: 2, zIndex: 1 };

function workspaceWeather(enabled: boolean): Extract<ResolvedWorkspaceItem, { kind: "widget" }> {
  return {
    kind: "widget",
    id: "widget:weather",
    widgetId: "weather",
    enabled,
    placement,
    widget: defaultCanvasState.widgets.weather
  };
}

describe("renderWorkspaceWidget", () => {
  it("does not render disabled workspace widgets", () => {
    expect(
      renderWorkspaceWidget(workspaceWeather(false), {} as WidgetRenderContext)
    ).toBeNull();
  });

  it("delegates enabled widget content to the existing widget registry", () => {
    const result = renderWorkspaceWidget(workspaceWeather(true), {} as WidgetRenderContext);
    expect(result).not.toBeNull();
    expect(result).not.toBe(false);
  });
});

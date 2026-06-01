import { describe, expect, it } from "vitest";
import { snapPlacementToCenterGuides } from "../../../../src/ui/widgets/WidgetFrame";

describe("WidgetFrame center snapping", () => {
  const metrics = {
    columns: 34,
    rows: 13,
    cellWidth: 56,
    cellHeight: 56
  };

  it("can snap to the vertical center line without changing vertical placement", () => {
    const snapped = snapPlacementToCenterGuides(
      { x: 10.3, y: 3.2, width: 13, height: 7, zIndex: 5 },
      metrics,
      { x: true, y: false }
    );

    expect(snapped).toEqual({ x: 10.5, y: 3.2, width: 13, height: 7, zIndex: 5 });
  });
});

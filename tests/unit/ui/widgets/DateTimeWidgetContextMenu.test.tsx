// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultCanvasState } from "../../../../src/domain/canvas";
import { DateTimeWidgetContextMenu } from "../../../../src/ui/widgets/date-time/DateTimeWidgetContextMenu";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("DateTimeWidgetContextMenu", () => {
  let root: ReturnType<typeof createRoot> | undefined;
  let container: HTMLDivElement | undefined;

  afterEach(() => {
    if (root) {
      act(() => root?.unmount());
    }
    container?.remove();
    root = undefined;
    container = undefined;
  });

  it("routes hour, minute, and second choices through one shared color picker", () => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    const changeDateTimeWidgetSetting = vi.fn();
    const settings = defaultCanvasState.widgets.dateTime.settings;

    act(() => {
      root?.render(
        <DateTimeWidgetContextMenu
          changeDateTimeWidgetSetting={changeDateTimeWidgetSetting}
          dateTimeWidget={defaultCanvasState.widgets.dateTime}
          setEnabled={vi.fn()}
        />
      );
    });

    const colorInputs = container.querySelectorAll<HTMLInputElement>('input[type="color"]');
    expect(colorInputs).toHaveLength(1);

    const colorInput = colorInputs[0];
    const click = vi.spyOn(colorInput, "click").mockImplementation(() => undefined);

    clickColorButton("Minute");
    expect(colorInput.value).toBe(settings.minuteColor);

    act(() => {
      colorInput.value = "#123456";
      colorInput.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(changeDateTimeWidgetSetting).toHaveBeenLastCalledWith("minuteColor", "#123456");

    clickColorButton("Second");
    expect(colorInput.value).toBe(settings.secondColor);
    expect(click).toHaveBeenCalledTimes(2);

    function clickColorButton(label: string) {
      const button = Array.from(container?.querySelectorAll("button") ?? []).find((candidate) =>
        candidate.textContent?.includes(label)
      );

      expect(button).toBeDefined();
      act(() => button?.click());
    }
  });
});

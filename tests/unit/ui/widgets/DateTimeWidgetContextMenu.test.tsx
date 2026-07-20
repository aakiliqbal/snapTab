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

  it("routes custom palette choices to the selected clock color", () => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    const changeDateTimeWidgetSetting = vi.fn();
    act(() => {
      root?.render(
        <DateTimeWidgetContextMenu
          changeDateTimeWidgetSetting={changeDateTimeWidgetSetting}
          dateTimeWidget={defaultCanvasState.widgets.dateTime}
          setEnabled={vi.fn()}
        />
      );
    });

    expect(container.querySelectorAll<HTMLInputElement>('input[type="color"]')).toHaveLength(0);

    clickColorButton("Minute");
    clickPaletteSwatch("#38bdf8");
    expect(changeDateTimeWidgetSetting).toHaveBeenLastCalledWith("minuteColor", "#38bdf8");

    const hexInput = container.querySelector<HTMLInputElement>('input[aria-label="Minute hex colour"]');
    expect(hexInput).toBeDefined();

    act(() => {
      if (hexInput) {
        setInputValue(hexInput, "#123456");
        hexInput.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });
    expect(changeDateTimeWidgetSetting).toHaveBeenLastCalledWith("minuteColor", "#123456");

    clickColorButton("Second");
    clickPaletteSwatch("#f472b6");
    expect(changeDateTimeWidgetSetting).toHaveBeenLastCalledWith("secondColor", "#f472b6");

    function clickColorButton(label: string) {
      const button = Array.from(container?.querySelectorAll("button") ?? []).find((candidate) =>
        candidate.textContent?.includes(label)
      );

      expect(button).toBeDefined();
      act(() => button?.click());
    }

    function clickPaletteSwatch(color: string) {
      const button = container?.querySelector<HTMLButtonElement>(`button[data-color="${color}"]`);

      expect(button).toBeDefined();
      act(() => button?.click());
    }

    function setInputValue(input: HTMLInputElement, value: string) {
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set?.call(input, value);
    }
  });
});

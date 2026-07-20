import type { CSSProperties } from "react";
import type { TabState } from "../../domain/tabState";
import type { WidgetId } from "../../domain/canvas";
import { renderWidgetContextMenu, type CanvasWidgetController, type RegisteredWidgetDefinition, type WidgetCanvasMetrics } from "./widgetRegistry";

type ContextMenuState =
  | { type: "canvas"; x: number; y: number }
  | { type: "widget"; widgetId: WidgetId; x: number; y: number };

type WidgetContextMenuProps = {
  canvasMetrics: WidgetCanvasMetrics;
  close: () => void;
  controller: CanvasWidgetController;
  menu: ContextMenuState;
  setWidgetEnabled: (widgetId: WidgetId, enabled: boolean) => void;
  tabState: TabState;
  widgetDefinitionByType: Record<WidgetId, RegisteredWidgetDefinition>;
};

export type { ContextMenuState };

export function WidgetContextMenu({
  canvasMetrics,
  close,
  controller,
  menu,
  setWidgetEnabled,
  tabState,
  widgetDefinitionByType
}: WidgetContextMenuProps) {
  // This shell owns menu positioning and Canvas-level toggles; each Widget owns its settings section.
  const style = {
    "--context-menu-x": `${menu.x}px`,
    "--context-menu-y": `${menu.y}px`
  } as CSSProperties;

  return (
    <div className="widget-context-backdrop" onMouseDown={close} role="presentation">
      <section
        className="widget-context-menu"
        onMouseDown={(event) => event.stopPropagation()}
        role="menu"
        style={style}
      >
        {menu.type === "canvas" ? (
          <>
            <header className="widget-context-header">
              <span>Canvas</span>
              <strong>Widgets</strong>
            </header>
            {Object.values(widgetDefinitionByType).map((definition) => {
              const widget = tabState.canvas.widgets[definition.type];
              return (
                <label className="context-toggle-row" key={definition.type}>
                  <span>{definition.label}</span>
                  <input
                    checked={widget.enabled}
                    onChange={(event) => setWidgetEnabled(definition.type, event.target.checked)}
                    type="checkbox"
                  />
                </label>
              );
            })}
          </>
        ) : (
          renderWidgetContextMenu(widgetDefinitionByType[menu.widgetId], tabState.canvas.widgets[menu.widgetId], {
            canvasMetrics,
            controller,
            setWidgetEnabled,
            tabState
          })
        )}
      </section>
    </div>
  );
}

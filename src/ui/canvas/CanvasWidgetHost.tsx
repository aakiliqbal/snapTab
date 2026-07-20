import { MouseEvent, useEffect, useState } from "react";
import {
  resolveResponsiveDefaultWidgetPlacement,
  type WidgetInstance,
  type WidgetId
} from "../../domain/canvas";
import type { TabState } from "../../domain/tabState";
import type { DragSource } from "../drag/dragModel";
import { WidgetContextMenu, type ContextMenuState } from "../widgets/WidgetContextMenu";
import { WidgetFrame } from "../widgets/WidgetFrame";
import {
  renderWidget,
  widgetDefinitionByType,
  widgetDefinitions,
  type CanvasWidgetController
} from "../widgets/widgetRegistry";
import { CanvasSurface } from "./CanvasSurface";

type CanvasMetrics = ReturnType<typeof import("./useCanvasMetrics").useCanvasMetrics>;

export type { CanvasWidgetController };

type CanvasWidgetHostProps = {
  canvasMetrics: CanvasMetrics;
  controller: CanvasWidgetController;
  isCanvasEditMode: boolean;
  outgoingDragSource: DragSource | null;
  query: string;
  setOutgoingDragSource: (source: DragSource | null) => void;
  setQuery: (query: string) => void;
  tabState: TabState;
};

export function CanvasWidgetHost({
  canvasMetrics,
  controller,
  isCanvasEditMode,
  outgoingDragSource,
  query,
  setOutgoingDragSource,
  setQuery,
  tabState
}: CanvasWidgetHostProps) {
  // Canvas owns Widget mounting and placement wiring so App stays focused on New Tab Surface overlays.
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  useEffect(() => {
    if (!contextMenu) {
      return;
    }

    function closeContextMenu(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setContextMenu(null);
      }
    }

    window.addEventListener("keydown", closeContextMenu);
    return () => window.removeEventListener("keydown", closeContextMenu);
  }, [contextMenu]);

  function openCanvasContextMenu(event: MouseEvent<HTMLElement>) {
    if (!isCanvasEditMode || event.target !== event.currentTarget) {
      return;
    }

    event.preventDefault();
    setContextMenu({ type: "canvas", x: event.clientX, y: event.clientY });
  }

  function openWidgetContextMenu(widgetId: WidgetId, event: MouseEvent<HTMLElement>) {
    if (!isCanvasEditMode) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    setContextMenu({ type: "widget", widgetId, x: event.clientX, y: event.clientY });
  }

  return (
    <>
      <CanvasSurface editMode={isCanvasEditMode} metrics={canvasMetrics} onCanvasContextMenu={openCanvasContextMenu}>
        {widgetDefinitions.map((definition) => {
          const widget = tabState.canvas.widgets[definition.type];
          const placement = resolveResponsiveDefaultWidgetPlacement(definition.type, widget.placement, canvasMetrics);
          const resolvedWidget = { ...widget, placement } as WidgetInstance;

          return (
            <WidgetFrame
              centerSnapAxes={definition.centerSnapAxes}
              editMode={isCanvasEditMode}
              enabled={widget.enabled}
              key={definition.type}
              label={definition.label}
              metrics={canvasMetrics}
              onMove={(nextPlacement) => controller.updateWidgetPlacement(definition.type, nextPlacement, canvasMetrics)}
              onResize={(nextPlacement) => controller.updateWidgetPlacement(definition.type, nextPlacement, canvasMetrics)}
              onWidgetContextMenu={openWidgetContextMenu}
              placement={placement}
              resizeAxis={definition.resizeAxis}
              widgetId={definition.type}
            >
              {renderWidget(definition, resolvedWidget, {
                canvasMetrics,
                controller,
                isCanvasEditMode,
                outgoingDragSource,
                query,
                setOutgoingDragSource,
                setQuery,
                tabState
              })}
            </WidgetFrame>
          );
        })}
      </CanvasSurface>

      {contextMenu ? (
        <WidgetContextMenu
          canvasMetrics={canvasMetrics}
          close={() => setContextMenu(null)}
          menu={contextMenu}
          setWidgetEnabled={(widgetId, enabled) => controller.setWidgetEnabled(widgetId, enabled, canvasMetrics)}
          tabState={tabState}
          widgetDefinitionByType={widgetDefinitionByType}
          controller={controller}
        />
      ) : null}
    </>
  );
}

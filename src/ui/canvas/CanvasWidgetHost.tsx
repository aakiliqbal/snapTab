import { MouseEvent, useEffect, useState, type RefObject } from "react";
import {
  resolveResponsiveDefaultWidgetPlacement,
  type CanvasGrid,
  type DateTimeWidgetSettings,
  type RssWidgetSettings,
  type SearchWidgetSettings,
  type ShortcutGridWidgetSettings,
  type WeatherWidgetSettings,
  type WidgetId,
  type WidgetPlacement
} from "../../domain/canvas";
import type { DropAction } from "../../domain/dropActions";
import type { ResolvedTopLevelTile } from "../../domain/tabOperations";
import { searchProviders, type SearchProviderId, type SearchVerticalId, type Shortcut, type TabState } from "../../domain/tabState";
import type { DragSource } from "../drag/dragModel";
import { WidgetContextMenu, type ContextMenuState } from "../widgets/WidgetContextMenu";
import { WidgetFrame } from "../widgets/WidgetFrame";
import { SearchWidget } from "../widgets/search";
import { ShortcutGridWidget } from "../widgets/shortcut-grid";
import { WeatherWidget } from "../widgets/weather";
import { DateTimeWidget } from "../widgets/date-time";
import { RssWidget } from "../widgets/rss";
import { CanvasSurface } from "./CanvasSurface";

type CanvasMetrics = ReturnType<typeof import("./useCanvasMetrics").useCanvasMetrics>;

export type CanvasWidgetController = {
  activeSearchProvider: (typeof searchProviders)[SearchProviderId];
  activeShortcutPage: number;
  changeDateTimeWidgetSetting: <K extends keyof DateTimeWidgetSettings>(key: K, value: DateTimeWidgetSettings[K]) => void;
  changeRssWidgetSetting: <K extends keyof RssWidgetSettings>(key: K, value: RssWidgetSettings[K]) => void;
  changeRssWidgetSettings: (settings: Partial<RssWidgetSettings>) => void;
  changeSearchProvider: (providerId: SearchProviderId) => void;
  changeSearchWidgetSetting: <K extends keyof SearchWidgetSettings>(key: K, value: SearchWidgetSettings[K]) => void;
  changeShortcutGridWidgetSetting: <K extends keyof ShortcutGridWidgetSettings>(
    key: K,
    value: ShortcutGridWidgetSettings[K],
    grid?: CanvasGrid & { cellWidth: number; cellHeight: number }
  ) => void;
  changeWeatherWidgetSetting: <K extends keyof WeatherWidgetSettings>(key: K, value: WeatherWidgetSettings[K]) => void;
  changeWeatherWidgetSettings: (settings: Partial<WeatherWidgetSettings>) => void;
  dispatchDropAction: (action: DropAction) => void;
  gridRef: RefObject<HTMLElement | null>;
  hasOverlayOpen: boolean;
  openEditShortcutDialog: (shortcut: Shortcut, folderId?: string | null) => void;
  setActiveFolderId: (folderId: string | null) => void;
  setActiveShortcutPage: (pageIndex: number | ((current: number) => number)) => void;
  setWidgetEnabled: (widgetId: WidgetId, enabled: boolean, grid?: CanvasGrid) => void;
  topLevelTiles: ResolvedTopLevelTile[];
  updateWidgetPlacement: (widgetId: WidgetId, placement: WidgetPlacement, grid: CanvasGrid) => void;
};

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
  const shortcutGridWidget = tabState.canvas.widgets.shortcutGrid;
  const searchWidget = tabState.canvas.widgets.search;
  const weatherWidget = tabState.canvas.widgets.weather;
  const dateTimeWidget = tabState.canvas.widgets.dateTime;
  const rssWidget = tabState.canvas.widgets.rss;
  const searchPlacement = resolveResponsiveDefaultWidgetPlacement("search", searchWidget.placement, canvasMetrics);
  const shortcutGridPlacement = resolveResponsiveDefaultWidgetPlacement(
    "shortcutGrid",
    shortcutGridWidget.placement,
    canvasMetrics
  );
  const weatherPlacement = resolveResponsiveDefaultWidgetPlacement("weather", weatherWidget.placement, canvasMetrics);
  const dateTimePlacement = resolveResponsiveDefaultWidgetPlacement("dateTime", dateTimeWidget.placement, canvasMetrics);
  const rssPlacement = resolveResponsiveDefaultWidgetPlacement("rss", rssWidget.placement, canvasMetrics);

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
        <WidgetFrame
          editMode={isCanvasEditMode}
          enabled={dateTimeWidget.enabled}
          label="Date & Time Widget"
          metrics={canvasMetrics}
          onMove={(placement) => controller.updateWidgetPlacement("dateTime", placement, canvasMetrics)}
          onResize={(placement) => controller.updateWidgetPlacement("dateTime", placement, canvasMetrics)}
          onWidgetContextMenu={openWidgetContextMenu}
          placement={dateTimePlacement}
          widgetId="dateTime"
        >
          <DateTimeWidget settings={dateTimeWidget.settings} />
        </WidgetFrame>

        <WidgetFrame
          editMode={isCanvasEditMode}
          enabled={searchWidget.enabled}
          label="Search Widget"
          metrics={canvasMetrics}
          onMove={(placement) => controller.updateWidgetPlacement("search", placement, canvasMetrics)}
          onResize={(placement) => controller.updateWidgetPlacement("search", placement, canvasMetrics)}
          onWidgetContextMenu={openWidgetContextMenu}
          placement={searchPlacement}
          resizeAxis="horizontal"
          widgetId="search"
        >
          <SearchWidget
            activeProvider={controller.activeSearchProvider}
            changeSearchVertical={(verticalId: SearchVerticalId) => controller.changeSearchWidgetSetting("searchVertical", verticalId)}
            query={query}
            setQuery={setQuery}
            settings={searchWidget.settings}
          />
        </WidgetFrame>

        <WidgetFrame
          editMode={isCanvasEditMode}
          enabled={weatherWidget.enabled}
          label="Weather Widget"
          metrics={canvasMetrics}
          onMove={(placement) => controller.updateWidgetPlacement("weather", placement, canvasMetrics)}
          onResize={(placement) => controller.updateWidgetPlacement("weather", placement, canvasMetrics)}
          onWidgetContextMenu={openWidgetContextMenu}
          placement={weatherPlacement}
          widgetId="weather"
        >
          <WeatherWidget settings={weatherWidget.settings} />
        </WidgetFrame>

        <WidgetFrame
          editMode={isCanvasEditMode}
          enabled={rssWidget.enabled}
          label="Snap Feed Widget"
          metrics={canvasMetrics}
          onMove={(placement) => controller.updateWidgetPlacement("rss", placement, canvasMetrics)}
          onResize={(placement) => controller.updateWidgetPlacement("rss", placement, canvasMetrics)}
          onWidgetContextMenu={openWidgetContextMenu}
          placement={rssPlacement}
          widgetId="rss"
        >
          <RssWidget settings={rssWidget.settings} />
        </WidgetFrame>

        <WidgetFrame
          centerSnapAxes={{ x: true, y: false }}
          editMode={isCanvasEditMode}
          enabled={shortcutGridWidget.enabled}
          label="Shortcut Grid Widget"
          metrics={canvasMetrics}
          onMove={(placement) => controller.updateWidgetPlacement("shortcutGrid", placement, canvasMetrics)}
          onResize={(placement) => controller.updateWidgetPlacement("shortcutGrid", placement, canvasMetrics)}
          onWidgetContextMenu={openWidgetContextMenu}
          placement={shortcutGridPlacement}
          widgetId="shortcutGrid"
        >
          <ShortcutGridWidget
            activeShortcutPage={controller.activeShortcutPage}
            canvasMetrics={canvasMetrics}
            dispatchDropAction={controller.dispatchDropAction}
            gridRef={controller.gridRef}
            hasOverlayOpen={controller.hasOverlayOpen}
            isCanvasEditMode={isCanvasEditMode}
            onClearOutgoingDrag={() => setOutgoingDragSource(null)}
            onEditShortcut={controller.openEditShortcutDialog}
            onSetActiveFolderId={controller.setActiveFolderId}
            outgoingDragSource={outgoingDragSource}
            setActiveShortcutPage={controller.setActiveShortcutPage}
            settings={shortcutGridWidget.settings}
            tabState={tabState}
            topLevelTiles={controller.topLevelTiles}
            widgetPlacement={shortcutGridPlacement}
          />
        </WidgetFrame>
      </CanvasSurface>

      {contextMenu ? (
        <WidgetContextMenu
          changeSearchWidgetSetting={controller.changeSearchWidgetSetting}
          changeShortcutGridWidgetSetting={(key, value) => controller.changeShortcutGridWidgetSetting(key, value, canvasMetrics)}
          changeWeatherWidgetSetting={controller.changeWeatherWidgetSetting}
          changeWeatherWidgetSettings={controller.changeWeatherWidgetSettings}
          changeDateTimeWidgetSetting={controller.changeDateTimeWidgetSetting}
          changeRssWidgetSetting={controller.changeRssWidgetSetting}
          changeRssWidgetSettings={controller.changeRssWidgetSettings}
          close={() => setContextMenu(null)}
          menu={contextMenu}
          setWidgetEnabled={(widgetId, enabled) => controller.setWidgetEnabled(widgetId, enabled, canvasMetrics)}
          tabState={tabState}
        />
      ) : null}
    </>
  );
}

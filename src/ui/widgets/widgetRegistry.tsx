import type { RefObject, ReactNode } from "react";
import {
  type CanvasGrid,
  type DateTimeWidgetSettings,
  type RssWidgetSettings,
  type SearchWidgetSettings,
  type ShortcutGridWidgetSettings,
  type WeatherWidgetSettings,
  type WidgetId,
  type WidgetInstance,
  type WidgetInstanceByType,
  type WidgetPlacement
} from "../../domain/canvas";
import type { DropAction } from "../../domain/dropActions";
import type { ResolvedTopLevelTile } from "../../domain/tabOperations";
import { searchProviders, type SearchProviderId, type SearchVerticalId, type Shortcut, type TabState } from "../../domain/tabState";
import type { DragSource } from "../drag/dragModel";
import { DateTimeWidget, DateTimeWidgetContextMenu } from "./date-time";
import { RssWidget, RssWidgetContextMenu } from "./rss";
import { SearchWidget, SearchWidgetContextMenu } from "./search";
import { ShortcutGridWidget, ShortcutGridWidgetContextMenu } from "./shortcut-grid";
import { WeatherWidget, WeatherWidgetContextMenu } from "./weather";

export type WidgetCanvasMetrics = CanvasGrid & {
  cellWidth: number;
  cellHeight: number;
};

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
    grid?: WidgetCanvasMetrics
  ) => void;
  changeWeatherWidgetSetting: <K extends keyof WeatherWidgetSettings>(key: K, value: WeatherWidgetSettings[K]) => void;
  changeWeatherWidgetSettings: (settings: Partial<WeatherWidgetSettings>) => void;
  dispatchDropAction: (action: DropAction) => void;
  gridRef: RefObject<HTMLElement | null>;
  hasOverlayOpen: boolean;
  openEditShortcutDialog: (shortcut: Shortcut, folderId?: string | null) => void;
  openNewShortcutDialog: () => void;
  removeShortcutFromGrid: (shortcut: Shortcut) => void;
  setActiveFolderId: (folderId: string | null) => void;
  setActiveShortcutPage: (pageIndex: number | ((current: number) => number)) => void;
  setWidgetEnabled: (widgetId: WidgetId, enabled: boolean, grid?: CanvasGrid) => void;
  topLevelTiles: ResolvedTopLevelTile[];
  updateWidgetPlacement: (widgetId: WidgetId, placement: WidgetPlacement, grid: CanvasGrid) => void;
};

export type WidgetRenderContext = {
  canvasMetrics: WidgetCanvasMetrics;
  controller: CanvasWidgetController;
  isCanvasEditMode: boolean;
  outgoingDragSource: DragSource | null;
  query: string;
  setOutgoingDragSource: (source: DragSource | null) => void;
  setQuery: (query: string) => void;
  tabState: TabState;
};

export type WidgetContextMenuRenderContext = {
  canvasMetrics: WidgetCanvasMetrics;
  controller: CanvasWidgetController;
  setWidgetEnabled: (widgetId: WidgetId, enabled: boolean) => void;
  tabState: TabState;
};

export type WidgetDefinition<TType extends WidgetId = WidgetId> = {
  type: TType;
  label: string;
  centerSnapAxes?: { x: boolean; y: boolean };
  resizeAxis?: "both" | "horizontal";
  render: (widget: WidgetInstanceByType[TType], context: WidgetRenderContext) => ReactNode;
  renderContextMenu: (widget: WidgetInstanceByType[TType], context: WidgetContextMenuRenderContext) => ReactNode;
};

export type RegisteredWidgetDefinition = Omit<WidgetDefinition<any>, "type"> & { type: WidgetId };

function defineWidget<TType extends WidgetId>(definition: WidgetDefinition<TType>) {
  return definition;
}

export const widgetDefinitions = [
  defineWidget({
    type: "dateTime",
    label: "Date & Time Widget",
    render: (widget) => <DateTimeWidget settings={widget.settings} />,
    renderContextMenu: (widget, { setWidgetEnabled, controller }) => (
      <DateTimeWidgetContextMenu
        changeDateTimeWidgetSetting={controller.changeDateTimeWidgetSetting}
        dateTimeWidget={widget}
        setEnabled={(enabled) => setWidgetEnabled("dateTime", enabled)}
      />
    )
  }),
  defineWidget({
    type: "search",
    label: "Search Widget",
    resizeAxis: "horizontal",
    render: (widget, { controller, query, setQuery }) => (
      <SearchWidget
        activeProvider={controller.activeSearchProvider}
        changeSearchVertical={(verticalId: SearchVerticalId) => controller.changeSearchWidgetSetting("searchVertical", verticalId)}
        query={query}
        setQuery={setQuery}
        settings={widget.settings}
      />
    ),
    renderContextMenu: (widget, { setWidgetEnabled, controller }) => (
      <SearchWidgetContextMenu
        changeSearchWidgetSetting={controller.changeSearchWidgetSetting}
        searchWidget={widget}
        setEnabled={(enabled) => setWidgetEnabled("search", enabled)}
      />
    )
  }),
  defineWidget({
    type: "weather",
    label: "Weather Widget",
    render: (widget) => <WeatherWidget settings={widget.settings} />,
    renderContextMenu: (widget, { setWidgetEnabled, controller }) => (
      <WeatherWidgetContextMenu
        changeWeatherWidgetSetting={controller.changeWeatherWidgetSetting}
        changeWeatherWidgetSettings={controller.changeWeatherWidgetSettings}
        setEnabled={(enabled) => setWidgetEnabled("weather", enabled)}
        weatherWidget={widget}
      />
    )
  }),
  defineWidget({
    type: "rss",
    label: "Snap Feed Widget",
    render: (widget) => <RssWidget settings={widget.settings} />,
    renderContextMenu: (widget, { setWidgetEnabled, controller }) => (
      <RssWidgetContextMenu
        changeRssWidgetSetting={controller.changeRssWidgetSetting}
        changeRssWidgetSettings={controller.changeRssWidgetSettings}
        rssWidget={widget}
        setEnabled={(enabled) => setWidgetEnabled("rss", enabled)}
      />
    )
  }),
  defineWidget({
    type: "shortcutGrid",
    label: "Shortcut Grid Widget",
    centerSnapAxes: { x: true, y: false },
    render: (widget, { canvasMetrics, controller, isCanvasEditMode, outgoingDragSource, setOutgoingDragSource, tabState }) => (
      <ShortcutGridWidget
        activeShortcutPage={controller.activeShortcutPage}
        canvasMetrics={canvasMetrics}
        dispatchDropAction={controller.dispatchDropAction}
        gridRef={controller.gridRef}
        hasOverlayOpen={controller.hasOverlayOpen}
        isCanvasEditMode={isCanvasEditMode}
        onClearOutgoingDrag={() => setOutgoingDragSource(null)}
        onAddShortcut={controller.openNewShortcutDialog}
        onEditShortcut={controller.openEditShortcutDialog}
        onRemoveShortcut={controller.removeShortcutFromGrid}
        onSetActiveFolderId={controller.setActiveFolderId}
        outgoingDragSource={outgoingDragSource}
        setActiveShortcutPage={controller.setActiveShortcutPage}
        settings={widget.settings}
        tabState={tabState}
        topLevelTiles={controller.topLevelTiles}
        widgetPlacement={widget.placement}
      />
    ),
    renderContextMenu: (widget, { canvasMetrics, setWidgetEnabled, controller }) => (
      <ShortcutGridWidgetContextMenu
        changeShortcutGridWidgetSetting={(key, value) => controller.changeShortcutGridWidgetSetting(key, value, canvasMetrics)}
        setEnabled={(enabled) => setWidgetEnabled("shortcutGrid", enabled)}
        shortcutGridWidget={widget}
      />
    )
  })
] as const;

export const widgetDefinitionByType = Object.fromEntries(
  widgetDefinitions.map((definition) => [definition.type, definition])
) as Record<WidgetId, RegisteredWidgetDefinition>;

export function renderWidget(definition: RegisteredWidgetDefinition, widget: WidgetInstance, context: WidgetRenderContext) {
  return definition.render(widget as never, context);
}

export function renderWidgetContextMenu(
  definition: RegisteredWidgetDefinition,
  widget: WidgetInstance,
  context: WidgetContextMenuRenderContext
) {
  return definition.renderContextMenu(widget as never, context);
}

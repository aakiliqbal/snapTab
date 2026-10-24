import type { ReactNode } from "react";
import type { ResolvedWorkspaceItem } from "../../domain/workspaceItemModel";
import {
  renderWidget,
  widgetDefinitionByType,
  type WidgetRenderContext
} from "../widgets/widgetRegistry";

type WorkspaceWidgetItem = Extract<ResolvedWorkspaceItem, { kind: "widget" }>;

/**
 * Bridges a resolved workspace widget to the existing widget registry.
 *
 * Widget feature modules continue to own their content and settings. The
 * workspace host owns only the outer grid cell; this adapter deliberately
 * does not mount a legacy absolute-positioned WidgetFrame.
 */
export function renderWorkspaceWidget(
  item: WorkspaceWidgetItem,
  context: WidgetRenderContext
): ReactNode {
  if (!item.enabled) {
    return null;
  }

  const definition = widgetDefinitionByType[item.widgetId];
  return renderWidget(definition, item.widget, context);
}

import type { CSSProperties } from "react";
import type { WidgetVisualSettings } from "../../domain/canvas";

export type TranslucentWidgetSurfaceSettings = {
  visual: WidgetVisualSettings;
};

export function getWidgetSurfaceStyle(settings: TranslucentWidgetSurfaceSettings) {
  const backgroundOpacity = settings.visual.backgroundOpacity / 100;
  const borderOpacity = settings.visual.showBorder ? settings.visual.borderOpacity / 100 : backgroundOpacity * 0.42;

  return {
    "--widget-bg-opacity": `${backgroundOpacity}`,
    "--widget-bg-accent-opacity": `${backgroundOpacity * 0.65}`,
    "--widget-border-opacity": `${borderOpacity}`,
    "--widget-shadow-opacity": `${(settings.visual.shadow / 60) * backgroundOpacity}`,
    "--widget-radius": `${settings.visual.radius}px`,
    "--widget-padding": `${settings.visual.padding}px`,
    "--widget-bg-color": settings.visual.backgroundColor,
    "--widget-border-color": settings.visual.borderColor
  } as CSSProperties;
}

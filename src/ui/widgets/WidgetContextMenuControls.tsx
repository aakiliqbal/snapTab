import type { WidgetVisualSettings } from "../../domain/canvas";

type RangeRowProps = {
  label: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  suffix: string;
  value: number;
};

export function RangeRow({ label, max, min, onChange, suffix, value }: RangeRowProps) {
  return (
    <label className="context-range-row">
      <span>{label}</span>
      <input min={min} max={max} onChange={(event) => onChange(Number(event.target.value))} type="range" value={value} />
      <output>{value}{suffix}</output>
    </label>
  );
}

type WidgetVisualControlsProps = {
  onChange: (visual: WidgetVisualSettings) => void;
  visual: WidgetVisualSettings;
};

export function WidgetVisualControls({ onChange, visual }: WidgetVisualControlsProps) {
  return (
    <RangeRow
      label="Translucence"
      max={100}
      min={0}
      onChange={(value) => onChange({ ...visual, backgroundOpacity: value })}
      suffix="%"
      value={visual.backgroundOpacity}
    />
  );
}

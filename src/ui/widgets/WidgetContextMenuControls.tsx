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

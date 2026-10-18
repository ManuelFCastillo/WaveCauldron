import { useId } from 'react';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  log?: boolean;
  onChange: (value: number) => void;
}

const RESOLUTION = 1000;

function toSlider(value: number, min: number, max: number, log: boolean): number {
  if (log) return (Math.log(value / min) / Math.log(max / min)) * RESOLUTION;
  return ((value - min) / (max - min)) * RESOLUTION;
}

function fromSlider(pos: number, min: number, max: number, log: boolean): number {
  const t = pos / RESOLUTION;
  if (log) return min * Math.pow(max / min, t);
  return min + (max - min) * t;
}

function format(value: number, step: number): string {
  if (step >= 1) return Math.round(value).toString();
  const decimals = Math.min(3, Math.ceil(-Math.log10(step)));
  return value.toFixed(decimals);
}

export function Slider({ label, value, min, max, step, unit, log = false, onChange }: SliderProps) {
  const id = useId();
  const snap = (v: number) => {
    const clamped = Math.min(max, Math.max(min, v));
    return Number((Math.round(clamped / step) * step).toFixed(6));
  };
  return (
    <div className="slider">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="range"
        min={0}
        max={RESOLUTION}
        step={1}
        value={toSlider(Math.max(value, min), min, max, log)}
        onChange={(e) => onChange(snap(fromSlider(Number(e.target.value), min, max, log)))}
      />
      <span className="slider-value">
        <input
          type="number"
          value={format(value, step)}
          min={min}
          max={max}
          step={step}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (Number.isFinite(v)) onChange(snap(v));
          }}
          aria-label={`${label} value`}
        />
        {unit && <span className="unit">{unit}</span>}
      </span>
    </div>
  );
}

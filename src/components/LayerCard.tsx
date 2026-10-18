import {
  FILTER_TYPES,
  LAYER_PARAMS,
  WAVEFORMS,
  isNoise,
  type Layer,
  type NumericLayerKey,
  type ParamSpec,
} from '../engine';
import { Slider } from './Slider';

interface LayerCardProps {
  layer: Layer;
  index: number;
  count: number;
  onPatch: (changes: Partial<Layer>, patchKey?: string) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onMove: (direction: -1 | 1) => void;
}

const GROUPS: { id: ParamSpec['group']; title: string }[] = [
  { id: 'pitch', title: 'Pitch' },
  { id: 'envelope', title: 'Envelope' },
  { id: 'filter', title: 'Filter' },
  { id: 'effects', title: 'Effects' },
  { id: 'mix', title: 'Mix' },
];

export function LayerCard({ layer, index, count, onPatch, onRemove, onDuplicate, onMove }: LayerCardProps) {
  const noise = isNoise(layer.waveform);

  const visible = (spec: ParamSpec): boolean => {
    if (noise && spec.group === 'pitch') return false;
    if (spec.key === 'duty' && layer.waveform !== 'square') return false;
    if (layer.filterType === 'none' && spec.group === 'filter') return false;
    return true;
  };

  const slider = (spec: ParamSpec) => (
    <Slider
      key={spec.key}
      label={spec.label}
      value={layer[spec.key as NumericLayerKey]}
      min={spec.min}
      max={spec.max}
      step={spec.step}
      unit={spec.unit}
      log={spec.log}
      onChange={(v) => onPatch({ [spec.key]: v }, `${layer.id}:${spec.key}`)}
    />
  );

  return (
    <section className={`layer-card ${layer.enabled ? '' : 'disabled'}`}>
      <header className="layer-header">
        <input
          type="checkbox"
          checked={layer.enabled}
          onChange={(e) => onPatch({ enabled: e.target.checked })}
          title="Enable layer"
        />
        <input
          className="layer-name"
          value={layer.name}
          onChange={(e) => onPatch({ name: e.target.value }, `${layer.id}:name`)}
          aria-label="Layer name"
        />
        <select value={layer.waveform} onChange={(e) => onPatch({ waveform: e.target.value as Layer['waveform'] })}>
          {WAVEFORMS.map((w) => (
            <option key={w} value={w}>
              {w}
            </option>
          ))}
        </select>
        <select value={layer.filterType} onChange={(e) => onPatch({ filterType: e.target.value as Layer['filterType'] })}>
          {FILTER_TYPES.map((f) => (
            <option key={f} value={f}>
              {f === 'none' ? 'no filter' : f}
            </option>
          ))}
        </select>
        <span className="layer-actions">
          <button onClick={() => onMove(-1)} disabled={index === 0} title="Move up">↑</button>
          <button onClick={() => onMove(1)} disabled={index === count - 1} title="Move down">↓</button>
          <button onClick={onDuplicate} title="Duplicate layer">⧉</button>
          <button onClick={onRemove} title="Remove layer" className="danger">✕</button>
        </span>
      </header>
      <div className="layer-body">
        {GROUPS.map((group) => {
          const specs = LAYER_PARAMS.filter((s) => s.group === group.id && visible(s));
          if (specs.length === 0) return null;
          return (
            <div className="param-group" key={group.id}>
              <h4>{group.title}</h4>
              {specs.map(slider)}
            </div>
          );
        })}
      </div>
    </section>
  );
}

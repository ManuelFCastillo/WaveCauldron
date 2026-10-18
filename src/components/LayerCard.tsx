import { useState } from 'react';
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
import { Icon, WaveIcon, type IconName } from './Icon';

interface LayerCardProps {
  layer: Layer;
  index: number;
  count: number;
  onPatch: (changes: Partial<Layer>, patchKey?: string) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onMove: (direction: -1 | 1) => void;
}

const GROUPS: { id: ParamSpec['group']; title: string; icon: IconName }[] = [
  { id: 'pitch', title: 'Pitch', icon: 'activity' },
  { id: 'envelope', title: 'Envelope', icon: 'envelope' },
  { id: 'filter', title: 'Filter', icon: 'filter' },
  { id: 'effects', title: 'Effects', icon: 'sparkles' },
  { id: 'mix', title: 'Mix', icon: 'mix' },
];

export function LayerCard({ layer, index, count, onPatch, onRemove, onDuplicate, onMove }: LayerCardProps) {
  const [open, setOpen] = useState(true);
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
    <section className={`card layer-card ${layer.enabled ? '' : 'disabled'} ${open ? '' : 'collapsed'}`}>
      <header className="layer-header">
        <input
          type="checkbox"
          checked={layer.enabled}
          onChange={(e) => onPatch({ enabled: e.target.checked })}
          title="Enable layer"
        />
        <span className="layer-wave" title={layer.waveform}>
          <WaveIcon waveform={layer.waveform} />
        </span>
        <input
          className="layer-name"
          value={layer.name}
          onChange={(e) => onPatch({ name: e.target.value }, `${layer.id}:name`)}
          aria-label="Layer name"
        />
        <select value={layer.waveform} onChange={(e) => onPatch({ waveform: e.target.value as Layer['waveform'] })} aria-label="Waveform">
          {WAVEFORMS.map((w) => (
            <option key={w} value={w}>
              {w}
            </option>
          ))}
        </select>
        <select value={layer.filterType} onChange={(e) => onPatch({ filterType: e.target.value as Layer['filterType'] })} aria-label="Filter type">
          {FILTER_TYPES.map((f) => (
            <option key={f} value={f}>
              {f === 'none' ? 'no filter' : f}
            </option>
          ))}
        </select>
        <span className="layer-actions">
          <button className="ghost" onClick={onDuplicate} title="Duplicate layer"><Icon name="copy" /></button>
          <button className="ghost" onClick={() => onMove(-1)} disabled={index === 0} title="Move up"><Icon name="arrowUp" /></button>
          <button className="ghost" onClick={() => onMove(1)} disabled={index === count - 1} title="Move down"><Icon name="arrowDown" /></button>
          <button className="ghost danger" onClick={onRemove} title="Remove layer"><Icon name="trash" /></button>
          <button className="ghost" onClick={() => setOpen((o) => !o)} title={open ? 'Collapse' : 'Expand'} aria-expanded={open}>
            <Icon name={open ? 'chevronUp' : 'chevronDown'} />
          </button>
        </span>
      </header>
      {open && (
        <div className="layer-body">
          {GROUPS.map((group) => {
            const specs = LAYER_PARAMS.filter((s) => s.group === group.id && visible(s));
            if (specs.length === 0) return null;
            return (
              <div className="param-group" key={group.id}>
                <h4>
                  <Icon name={group.icon} size={14} />
                  {group.title}
                </h4>
                {specs.map(slider)}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

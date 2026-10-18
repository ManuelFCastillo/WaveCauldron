import { useMemo } from 'react';
import { DEFAULT_SAMPLE_RATE, encodeWav, renderRecipe, type Recipe } from '../engine';
import { playSamples } from '../audio/player';
import { downloadBlob, slugify } from '../utils/download';
import { Icon } from './Icon';

interface VariationsProps {
  variations: Recipe[];
  onUse: (recipe: Recipe) => void;
  onClear: () => void;
}

export function Variations({ variations, onUse, onClear }: VariationsProps) {
  const rendered = useMemo(
    () => variations.map((v) => renderRecipe(v, { sampleRate: DEFAULT_SAMPLE_RATE })),
    [variations],
  );

  if (variations.length === 0) return null;

  const exportAll = () => {
    rendered.forEach((samples, i) => {
      downloadBlob(encodeWav(samples, DEFAULT_SAMPLE_RATE), `${slugify(variations[i].name)}.wav`, 'audio/wav');
    });
  };

  return (
    <section className="card variations">
      <header className="card-header">
        <span className="card-icon">
          <Icon name="cube" size={18} />
        </span>
        <h4>Variations</h4>
        <span className="spacer" />
        <button onClick={exportAll}>
          <Icon name="download" /> Export all
        </button>
        <button className="ghost" onClick={onClear} title="Clear variations">
          <Icon name="trash" />
        </button>
      </header>
      <div className="variation-grid">
        {variations.map((v, i) => (
          <div className="variation" key={v.seed + ':' + i}>
            <span className="variation-name">{v.name}</span>
            <button className="primary icon-only" onClick={() => playSamples(rendered[i], DEFAULT_SAMPLE_RATE)} title="Play">
              <Icon name="play" />
            </button>
            <button onClick={() => onUse(v)}>Use</button>
            <button
              className="ghost"
              title="Export WAV"
              onClick={() => downloadBlob(encodeWav(rendered[i], DEFAULT_SAMPLE_RATE), `${slugify(v.name)}.wav`, 'audio/wav')}
            >
              <Icon name="download" />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

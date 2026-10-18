import { useMemo } from 'react';
import { DEFAULT_SAMPLE_RATE, encodeWav, renderRecipe, type Recipe } from '../engine';
import { playSamples } from '../audio/player';
import { downloadBlob, slugify } from '../utils/download';

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
    <section className="variations">
      <header>
        <h3>Variations</h3>
        <span className="spacer" />
        <button onClick={exportAll}>Export all WAV</button>
        <button onClick={onClear}>Clear</button>
      </header>
      <div className="variation-grid">
        {variations.map((v, i) => (
          <div className="variation" key={v.seed + ':' + i}>
            <span className="variation-name">{v.name}</span>
            <button className="primary" onClick={() => playSamples(rendered[i], DEFAULT_SAMPLE_RATE)}>
              ▶
            </button>
            <button onClick={() => onUse(v)}>Use</button>
            <button onClick={() => downloadBlob(encodeWav(rendered[i], DEFAULT_SAMPLE_RATE), `${slugify(v.name)}.wav`, 'audio/wav')}>
              WAV
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

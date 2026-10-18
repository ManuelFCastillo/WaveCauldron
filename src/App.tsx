import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DEFAULT_SAMPLE_RATE,
  PRESETS,
  clonePreset,
  decodeRecipeFromUrl,
  defaultLayer,
  encodeRecipeForUrl,
  encodeWav,
  mutateRecipe,
  newLayerId,
  parseRecipe,
  randomSeed,
  renderRecipe,
  serializeRecipe,
  type Layer,
  type Preset,
  type Recipe,
} from './engine';
import { playSamples, stopPlayback } from './audio/player';
import { useHistory } from './hooks/useHistory';
import { downloadBlob, pickFile, slugify } from './utils/download';
import { PresetList } from './components/PresetList';
import { LayerCard } from './components/LayerCard';
import { Waveform } from './components/Waveform';
import { GlobalControls } from './components/GlobalControls';
import { Variations } from './components/Variations';

function initialRecipe(): { recipe: Recipe; presetId: string | null } {
  const match = /[#&]r=([^&]+)/.exec(window.location.hash);
  if (match) {
    try {
      return { recipe: decodeRecipeFromUrl(match[1]), presetId: null };
    } catch {
      // Fall through to the default preset.
    }
  }
  return { recipe: clonePreset(PRESETS[0]), presetId: PRESETS[0].id };
}

export function App() {
  const [initial] = useState(initialRecipe);
  const history = useHistory<Recipe>(initial.recipe);
  const recipe = history.value;
  const [presetId, setPresetId] = useState<string | null>(initial.presetId);
  const [mutateAmount, setMutateAmount] = useState(0.25);
  const [autoPlay, setAutoPlay] = useState(true);
  const [variations, setVariations] = useState<Recipe[]>([]);
  const [status, setStatus] = useState<string>('');
  const firstRender = useRef(true);

  const samples = useMemo(() => renderRecipe(recipe, { sampleRate: DEFAULT_SAMPLE_RATE }), [recipe]);

  const play = useCallback(() => playSamples(samples, DEFAULT_SAMPLE_RATE), [samples]);

  // Auto-audition after edits (debounced so slider drags don't stutter).
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (!autoPlay) return;
    const t = setTimeout(play, 120);
    return () => clearTimeout(t);
  }, [samples, autoPlay, play]);

  // Keep the URL in sync so any recipe can be shared as a link.
  useEffect(() => {
    const t = setTimeout(() => {
      window.history.replaceState(null, '', `#r=${encodeRecipeForUrl(recipe)}`);
    }, 300);
    return () => clearTimeout(t);
  }, [recipe]);

  // Keyboard shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) && (target as HTMLInputElement).type !== 'range';
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) history.redo();
        else history.undo();
      } else if (!typing && e.code === 'Space') {
        e.preventDefault();
        play();
      } else if (!typing && e.key.toLowerCase() === 'm') {
        mutate();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const flash = (message: string) => {
    setStatus(message);
    setTimeout(() => setStatus(''), 2000);
  };

  const update = (changes: Partial<Recipe>, patchKey?: string) => {
    const next = { ...recipe, ...changes };
    if (patchKey) history.patch(next, patchKey);
    else history.set(next);
  };

  const updateLayer = (id: string, changes: Partial<Layer>, patchKey?: string) => {
    update({ layers: recipe.layers.map((l) => (l.id === id ? { ...l, ...changes } : l)) }, patchKey);
  };

  const selectPreset = (preset: Preset) => {
    history.set(clonePreset(preset));
    setPresetId(preset.id);
    setVariations([]);
  };

  const mutate = () => {
    const next = mutateRecipe(recipe, { amount: mutateAmount, seed: randomSeed() });
    history.set({ ...next, name: nextVariantName(recipe.name) });
    setPresetId(null);
  };

  const brewVariations = () => {
    const batch = Array.from({ length: 8 }, (_, i) => ({
      ...mutateRecipe(recipe, { amount: mutateAmount, seed: randomSeed() }),
      name: `${baseName(recipe.name)} v${i + 1}`,
    }));
    setVariations(batch);
  };

  const addLayer = () => {
    update({ layers: [...recipe.layers, defaultLayer({ name: `Layer ${recipe.layers.length + 1}` })] });
  };

  const moveLayer = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= recipe.layers.length) return;
    const layers = [...recipe.layers];
    [layers[index], layers[target]] = [layers[target], layers[index]];
    update({ layers });
  };

  const exportWav = () => {
    downloadBlob(encodeWav(samples, DEFAULT_SAMPLE_RATE), `${slugify(recipe.name)}.wav`, 'audio/wav');
  };

  const exportJson = () => {
    downloadBlob(serializeRecipe(recipe), `${slugify(recipe.name)}.cauldron.json`, 'application/json');
  };

  const importJson = async () => {
    const file = await pickFile('.json,application/json');
    if (!file) return;
    try {
      history.set(parseRecipe(await file.text()));
      setPresetId(null);
      flash(`Imported ${file.name}`);
    } catch (err) {
      flash(`Could not import: ${(err as Error).message}`);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      flash('Link copied');
    } catch {
      flash('Clipboard unavailable, copy the URL from the address bar');
    }
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-icon" aria-hidden>
            🜍
          </span>
          <span className="brand-name">WaveCauldron</span>
        </div>
        <input
          className="recipe-name"
          value={recipe.name}
          onChange={(e) => update({ name: e.target.value }, 'name')}
          aria-label="Sound name"
        />
        <div className="transport">
          <button className="primary" onClick={play} title="Play (Space)">
            ▶ Play
          </button>
          <button onClick={stopPlayback}>■</button>
          <button onClick={mutate} title="Mutate (M)">
            ⚗ Mutate
          </button>
          <button onClick={brewVariations}>Brew 8 variations</button>
          <label className="inline">
            Strength
            <input
              type="range"
              min={0.05}
              max={1}
              step={0.05}
              value={mutateAmount}
              onChange={(e) => setMutateAmount(Number(e.target.value))}
            />
          </label>
          <button onClick={history.undo} disabled={!history.canUndo} title="Undo (Ctrl+Z)">
            ↶
          </button>
          <button onClick={history.redo} disabled={!history.canRedo} title="Redo (Ctrl+Shift+Z)">
            ↷
          </button>
          <span className="spacer" />
          <button className="primary" onClick={exportWav}>
            Export WAV
          </button>
          <button onClick={exportJson}>Save recipe</button>
          <button onClick={importJson}>Load recipe</button>
          <button onClick={copyLink}>Copy link</button>
        </div>
      </header>

      <aside className="sidebar">
        <PresetList activeId={presetId} onSelect={selectPreset} />
      </aside>

      <main className="workbench">
        <Waveform samples={samples} sampleRate={DEFAULT_SAMPLE_RATE} />
        <div className="workbench-options">
          <label className="checkbox">
            <input type="checkbox" checked={autoPlay} onChange={(e) => setAutoPlay(e.target.checked)} />
            Auto-play on change
          </label>
          <span className="status" role="status">
            {status}
          </span>
        </div>

        <Variations variations={variations} onUse={(v) => { history.set(v); setPresetId(null); }} onClear={() => setVariations([])} />

        <GlobalControls recipe={recipe} onPatch={update} />

        <div className="layers-header">
          <h3>Ingredients</h3>
          <span className="spacer" />
          <button onClick={addLayer}>+ Add layer</button>
        </div>
        {recipe.layers.length === 0 && (
          <p className="empty">The cauldron is empty. Add a layer or pick a preset to start brewing.</p>
        )}
        {recipe.layers.map((layer, index) => (
          <LayerCard
            key={layer.id}
            layer={layer}
            index={index}
            count={recipe.layers.length}
            onPatch={(changes, key) => updateLayer(layer.id, changes, key)}
            onRemove={() => update({ layers: recipe.layers.filter((l) => l.id !== layer.id) })}
            onDuplicate={() => {
              const copy = { ...layer, id: newLayerId(), name: `${layer.name} copy` };
              const layers = [...recipe.layers];
              layers.splice(index + 1, 0, copy);
              update({ layers });
            }}
            onMove={(direction) => moveLayer(index, direction)}
          />
        ))}
      </main>

      <footer className="footer">
        Space: play · M: mutate · Ctrl+Z: undo · Recipes are plain JSON and live in the URL, so a link is a save.
      </footer>
    </div>
  );
}

function baseName(name: string): string {
  return name.replace(/\s+v\d+$/, '').replace(/\s+\(mutant \d+\)$/, '');
}

function nextVariantName(name: string): string {
  const match = /^(.*) \(mutant (\d+)\)$/.exec(name);
  if (match) return `${match[1]} (mutant ${Number(match[2]) + 1})`;
  return `${name} (mutant 1)`;
}

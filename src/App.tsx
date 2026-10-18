import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DEFAULT_SAMPLE_RATE,
  PRESETS,
  clonePreset,
  decodeRecipeFromUrl,
  defaultLayer,
  encodeRecipeForUrl,
  encodeWav,
  findPreset,
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
import { useTheme } from './hooks/useTheme';
import { downloadBlob, pickFile, slugify } from './utils/download';
import { PresetList, presetIcon } from './components/PresetList';
import { LayerCard } from './components/LayerCard';
import { Waveform } from './components/Waveform';
import { GlobalControls } from './components/GlobalControls';
import { Variations } from './components/Variations';
import { BrewPrompt } from './components/BrewPrompt';
import { Icon } from './components/Icon';

type MobileTab = 'recipes' | 'studio';

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
  const [mobileTab, setMobileTab] = useState<MobileTab>('studio');
  const [theme, toggleTheme] = useTheme();
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
      const typing =
        target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) && (target as HTMLInputElement).type !== 'range';
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
    setMobileTab('studio');
  };

  const resetToPreset = () => {
    const preset = presetId ? findPreset(presetId) : undefined;
    if (preset) history.set(clonePreset(preset));
  };

  const mutate = () => {
    const next = mutateRecipe(recipe, { amount: mutateAmount, seed: randomSeed() });
    history.set({ ...next, name: nextVariantName(recipe.name) });
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

  const isPresetDirty = presetId !== null && findPreset(presetId) !== undefined;

  return (
    <div className={`app tab-${mobileTab}`}>
      <header className="topbar">
        <div className="brand">
          <span className="brand-icon">
            <Icon name="brand" size={26} />
          </span>
          <span className="brand-name">WaveCauldron</span>
          <span className="brand-tagline">Craft. Layer. Play. Repeat.</span>
        </div>
        <div className="transport">
          <button className="primary" onClick={play} title="Play (Space)">
            <Icon name="play" /> Play
          </button>
          <button className="icon-only" onClick={stopPlayback} title="Stop">
            <Icon name="stop" />
          </button>
          <button onClick={mutate} title="Mutate (M)">
            <Icon name="shuffle" /> Mutate
          </button>
          <button onClick={brewVariations}>
            <Icon name="cube" /> Brew 8 variations
          </button>
          <label className="inline strength">
            Strength
            <input
              type="range"
              min={0.05}
              max={1}
              step={0.05}
              value={mutateAmount}
              onChange={(e) => setMutateAmount(Number(e.target.value))}
            />
            <span className="pill">{Math.round(mutateAmount * 100)}%</span>
          </label>
          <button className="icon-only" onClick={history.undo} disabled={!history.canUndo} title="Undo (Ctrl+Z)">
            <Icon name="undo" />
          </button>
          <button className="icon-only" onClick={history.redo} disabled={!history.canRedo} title="Redo (Ctrl+Shift+Z)">
            <Icon name="redo" />
          </button>
        </div>
        <div className="file-actions">
          <button className="primary" onClick={exportWav}>
            <Icon name="download" /> Export WAV
          </button>
          <button onClick={exportJson} title="Download recipe JSON">
            <Icon name="save" /> <span className="label">Save recipe</span>
          </button>
          <button onClick={importJson} title="Load a recipe JSON file">
            <Icon name="folder" /> <span className="label">Load recipe</span>
          </button>
          <button onClick={copyLink} title="Copy a shareable link">
            <Icon name="link" /> <span className="label">Copy link</span>
          </button>
          <button
            className="icon-only theme-toggle"
            onClick={toggleTheme}
            title={theme === 'october' ? 'Switch to the regular skin' : 'Switch to the October skin'}
          >
            <Icon name={theme === 'october' ? 'sun' : 'moon'} />
          </button>
        </div>
      </header>

      <aside className="sidebar">
        <PresetList activeId={presetId} onSelect={selectPreset} />
      </aside>

      <main className="workbench">
        <section className="card hero">
          <div className="hero-top">
            <span className="hero-icon">
              <Icon name={presetIcon(presetId)} size={32} />
            </span>
            <div className="hero-text">
              <input
                className="recipe-name"
                value={recipe.name}
                onChange={(e) => update({ name: e.target.value }, 'name')}
                aria-label="Sound name"
              />
              <input
                className="recipe-desc"
                value={recipe.description ?? ''}
                placeholder="Describe this sound…"
                onChange={(e) => update({ description: e.target.value }, 'description')}
                aria-label="Sound description"
              />
            </div>
            <div className="hero-actions">
              <button className="primary" onClick={play}>
                <Icon name="play" /> Play
              </button>
              <button onClick={exportWav}>
                <Icon name="download" /> Export WAV
              </button>
            </div>
          </div>
          <Waveform samples={samples} sampleRate={DEFAULT_SAMPLE_RATE} theme={theme} />
          <div className="hero-bottom">
            <label className="checkbox switch">
              <input type="checkbox" checked={autoPlay} onChange={(e) => setAutoPlay(e.target.checked)} />
              <span className="track" />
              Auto-play on change
            </label>
            <span className="status" role="status">
              {status}
            </span>
            <span className="spacer" />
            <button className="ghost" onClick={resetToPreset} disabled={!isPresetDirty} title="Reload the preset's original recipe">
              <Icon name="reset" /> Reset to default
            </button>
          </div>
        </section>

        <BrewPrompt
          current={recipe}
          onBrewed={(brewed) => {
            history.set(brewed);
            setPresetId(null);
            setVariations([]);
            flash(`Brewed “${brewed.name}”`);
          }}
        />

        <Variations
          variations={variations}
          onUse={(v) => {
            history.set(v);
            setPresetId(null);
          }}
          onClear={() => setVariations([])}
        />

        <GlobalControls recipe={recipe} onPatch={update} />

        <div className="section-header">
          <span className="card-icon">
            <Icon name="layers" size={20} />
          </span>
          <div>
            <h3>Ingredients</h3>
            <p className="muted">Layer and shape sounds to create your effect</p>
          </div>
          <span className="spacer" />
          <button className="primary" onClick={addLayer}>
            <Icon name="plus" /> Add layer
          </button>
        </div>
        {recipe.layers.length === 0 && (
          <p className="empty">The cauldron is empty. Add a layer or pick a recipe to start brewing.</p>
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
        <span>Space: play · M: mutate · Ctrl+Z: undo · Recipes are plain JSON and live in the URL, so a link is a save.</span>
      </footer>

      <nav className="mobile-nav" aria-label="Mobile navigation">
        <button className={mobileTab === 'recipes' ? 'active' : ''} onClick={() => setMobileTab('recipes')}>
          <Icon name="book" size={22} />
          <span>Recipes</span>
        </button>
        <button className="play-fab" onClick={play} aria-label="Play">
          <Icon name="play" size={26} />
        </button>
        <button className={mobileTab === 'studio' ? 'active' : ''} onClick={() => setMobileTab('studio')}>
          <Icon name="layers" size={22} />
          <span>Studio</span>
        </button>
      </nav>
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

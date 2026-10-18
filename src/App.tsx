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
import { AI_CATEGORY, findSound, serializeLibrary, type SavedSound } from './library/store';
import { playSamples, stopPlayback } from './audio/player';
import { useHistory } from './hooks/useHistory';
import { useTheme } from './hooks/useTheme';
import { useLibrary } from './hooks/useLibrary';
import { downloadBlob, pickFile, slugify } from './utils/download';
import { Sidebar, presetIcon } from './components/Sidebar';
import { LayerCard } from './components/LayerCard';
import { Waveform } from './components/Waveform';
import { GlobalControls } from './components/GlobalControls';
import { Variations } from './components/Variations';
import { BrewPrompt } from './components/BrewPrompt';
import { SaveDialog } from './components/SaveDialog';
import { Menu } from './components/Menu';
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
  const lib = useLibrary();
  const [presetId, setPresetId] = useState<string | null>(initial.presetId);
  const [activeSoundId, setActiveSoundId] = useState<string | null>(null);
  const [saveDialog, setSaveDialog] = useState<{ existing: SavedSound | null } | null>(null);
  const [mutateAmount, setMutateAmount] = useState(0.25);
  const [autoPlay, setAutoPlay] = useState(true);
  const [variations, setVariations] = useState<Recipe[]>([]);
  const [status, setStatus] = useState<string>('');
  const [mobileTab, setMobileTab] = useState<MobileTab>('studio');
  const [theme, toggleTheme] = useTheme();
  const firstRender = useRef(true);

  const samples = useMemo(() => renderRecipe(recipe, { sampleRate: DEFAULT_SAMPLE_RATE }), [recipe]);
  const play = useCallback(() => playSamples(samples, DEFAULT_SAMPLE_RATE), [samples]);

  const activeSound = findSound(lib.library, activeSoundId) ?? null;
  const isDirty = activeSound ? JSON.stringify(activeSound.recipe) !== JSON.stringify(recipe) : false;

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

  const flash = (message: string) => {
    setStatus(message);
    setTimeout(() => setStatus(''), 2500);
  };

  const update = (changes: Partial<Recipe>, patchKey?: string) => {
    const next = { ...recipe, ...changes };
    if (patchKey) history.patch(next, patchKey);
    else history.set(next);
  };

  const updateLayer = (id: string, changes: Partial<Layer>, patchKey?: string) => {
    update({ layers: recipe.layers.map((l) => (l.id === id ? { ...l, ...changes } : l)) }, patchKey);
  };

  const load = (next: Recipe, source: { presetId?: string; soundId?: string }) => {
    history.set(next);
    setPresetId(source.presetId ?? null);
    setActiveSoundId(source.soundId ?? null);
    setVariations([]);
    setMobileTab('studio');
  };

  const selectPreset = (preset: Preset) => load(clonePreset(preset), { presetId: preset.id });
  const selectSound = (sound: SavedSound) => load(structuredClone(sound.recipe), { soundId: sound.id });

  const resetToPreset = () => {
    const preset = presetId ? findPreset(presetId) : undefined;
    if (preset) history.set(clonePreset(preset));
    else if (activeSound) history.set(structuredClone(activeSound.recipe));
  };

  // --- library ---------------------------------------------------------------

  const quickSave = () => {
    if (activeSound) {
      lib.update(activeSound.id, { recipe, name: recipe.name });
      flash(`Saved “${recipe.name}”`);
    } else {
      setSaveDialog({ existing: null });
    }
  };

  const onSaveDialog = ({ name, category, asNew }: { name: string; category: string; asNew: boolean }) => {
    const named = { ...recipe, name };
    if (saveDialog?.existing && !asNew) {
      lib.update(saveDialog.existing.id, { name, category, recipe: named });
      if (saveDialog.existing.id === activeSoundId) history.set(named);
      flash(`Updated “${name}”`);
    } else {
      const sound = lib.add({ name, category, recipe: named });
      history.set(named);
      setActiveSoundId(sound.id);
      setPresetId(null);
      flash(`Saved “${name}” to ${category}`);
    }
    setSaveDialog(null);
  };

  const deleteSound = (sound: SavedSound) => {
    if (!window.confirm(`Delete “${sound.name}” from your sounds?`)) return;
    lib.remove(sound.id);
    if (sound.id === activeSoundId) setActiveSoundId(null);
  };

  const renameCategory = (name: string) => {
    const next = window.prompt('Rename category', name);
    if (next && next.trim() && next.trim() !== name) lib.renameCategory(name, next);
  };

  const deleteCategory = (name: string) => {
    const count = lib.library.sounds.filter((s) => s.category === name).length;
    const note = count ? ` Its ${count} sound${count === 1 ? '' : 's'} will move to “My sounds”.` : '';
    if (window.confirm(`Delete the category “${name}”?${note}`)) lib.removeCategory(name);
  };

  const newCategory = () => {
    const name = window.prompt('New category name');
    if (name && name.trim()) lib.addCategory(name);
  };

  const exportLibrary = () => {
    downloadBlob(serializeLibrary(lib.library), 'wavecauldron-library.json', 'application/json');
  };

  const importLibrary = async () => {
    const file = await pickFile('.json,application/json');
    if (!file) return;
    try {
      const n = lib.importJson(await file.text());
      flash(`Imported ${n} sound${n === 1 ? '' : 's'}`);
    } catch (err) {
      flash(`Could not import: ${(err as Error).message}`);
    }
  };

  // --- transport / files ------------------------------------------------------

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
      load(parseRecipe(await file.text()), {});
      flash(`Loaded ${file.name}`);
    } catch (err) {
      flash(`Could not load: ${(err as Error).message}`);
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

  // Keyboard shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) && (target as HTMLInputElement).type !== 'range';
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) history.redo();
        else history.undo();
      } else if (mod && e.key.toLowerCase() === 's') {
        e.preventDefault();
        quickSave();
      } else if (!typing && !saveDialog && e.code === 'Space') {
        e.preventDefault();
        play();
      } else if (!typing && !saveDialog && e.key.toLowerCase() === 'm') {
        mutate();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const canReset = (presetId !== null && findPreset(presetId) !== undefined) || isDirty;

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
          <button onClick={quickSave} title={activeSound ? 'Save changes (Ctrl+S)' : 'Save to my sounds (Ctrl+S)'}>
            <Icon name="save" /> <span className="label">Save</span>
            {isDirty && <span className="dirty-dot" aria-label="Unsaved changes" />}
          </button>
          <button className="primary" onClick={exportWav}>
            <Icon name="download" /> <span className="label">Export WAV</span>
          </button>
          <Menu
            title="More"
            items={[
              { label: 'Save as new…', icon: 'save', onSelect: () => setSaveDialog({ existing: activeSound }) },
              { label: 'Download recipe JSON', icon: 'download', onSelect: exportJson },
              { label: 'Load recipe JSON…', icon: 'folder', onSelect: importJson },
              { label: 'Copy share link', icon: 'link', onSelect: copyLink },
              { label: 'Export my sounds', icon: 'book', onSelect: exportLibrary },
              { label: 'Import my sounds…', icon: 'folder', onSelect: importLibrary },
            ]}
          >
            ⋯
          </Menu>
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
        <Sidebar
          activePresetId={presetId}
          activeSoundId={activeSoundId}
          library={lib.library}
          onSelectPreset={selectPreset}
          onSelectSound={selectSound}
          onDeleteSound={deleteSound}
          onRenameSound={(sound) => setSaveDialog({ existing: sound })}
          onRenameCategory={renameCategory}
          onDeleteCategory={deleteCategory}
          onNewCategory={newCategory}
        />
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
              <span className="hero-badge">
                {activeSound ? (
                  <>
                    <Icon name="folder" size={12} /> {activeSound.category}
                    {isDirty && <em> · unsaved changes</em>}
                  </>
                ) : presetId ? (
                  <>
                    <Icon name="book" size={12} /> Preset · save it to make it yours
                  </>
                ) : (
                  <>
                    <Icon name="flask" size={12} /> Not saved yet
                  </>
                )}
              </span>
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
            <button className="ghost" onClick={resetToPreset} disabled={!canReset} title="Discard edits and reload the saved version">
              <Icon name="reset" /> {activeSound ? 'Revert to saved' : 'Reset to default'}
            </button>
          </div>
        </section>

        <BrewPrompt
          current={recipe}
          onBrewed={(brewed) => {
            const sound = lib.add({ name: brewed.name, category: AI_CATEGORY, recipe: brewed });
            load(brewed, { soundId: sound.id });
            flash(`Brewed “${brewed.name}” and saved it to ${AI_CATEGORY}`);
          }}
        />

        <Variations
          variations={variations}
          onUse={(v) => load(v, {})}
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
        <span>Space: play · M: mutate · Ctrl+S: save · Ctrl+Z: undo · Your sounds are stored in this browser; export them from the ⋯ menu to back up.</span>
      </footer>

      <nav className="mobile-nav" aria-label="Mobile navigation">
        <button className={mobileTab === 'recipes' ? 'active' : ''} onClick={() => setMobileTab('recipes')}>
          <Icon name="book" size={22} />
          <span>Sounds</span>
        </button>
        <button className="play-fab" onClick={play} aria-label="Play">
          <Icon name="play" size={26} />
        </button>
        <button className={mobileTab === 'studio' ? 'active' : ''} onClick={() => setMobileTab('studio')}>
          <Icon name="layers" size={22} />
          <span>Studio</span>
        </button>
      </nav>

      {saveDialog && (
        <SaveDialog
          existing={saveDialog.existing}
          defaultName={recipe.name}
          categories={lib.library.categories}
          onSave={onSaveDialog}
          onClose={() => setSaveDialog(null)}
        />
      )}
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

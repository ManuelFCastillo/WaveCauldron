import { useState, type FormEvent } from 'react';
import type { Recipe } from '../engine';
import { BrewClientError, getStoredApiKey, requestBrew, setStoredApiKey } from '../ai/client';
import { Icon } from './Icon';

interface BrewPromptProps {
  current: Recipe;
  onBrewed: (recipe: Recipe, notes: string) => void;
}

const SUGGESTIONS = [
  'heavy spaceship door with hydraulic hiss and a metal clunk',
  '8-bit coin pickup, bright and cheerful',
  'wet footstep in mud',
  'ice spell shattering into crystals',
  'low menacing dungeon door creak',
  'soft UI toggle, like a tiny bubble pop',
];

export function BrewPrompt({ current, onBrewed }: BrewPromptProps) {
  const [prompt, setPrompt] = useState('');
  const [refine, setRefine] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; kind: string } | null>(null);
  const [notes, setNotes] = useState('');
  const [apiKey, setApiKey] = useState(getStoredApiKey);
  const [showKey, setShowKey] = useState(false);

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!prompt.trim() || busy) return;
    setBusy(true);
    setError(null);
    setNotes('');
    try {
      const result = await requestBrew({ prompt, current: refine ? current : null }, apiKey);
      setNotes(result.notes);
      onBrewed(result.recipe, result.notes);
    } catch (err) {
      if (err instanceof BrewClientError) {
        setError({ message: err.message, kind: err.kind });
        if (err.kind === 'unavailable' || err.kind === 'auth') setShowKey(true);
      } else {
        setError({ message: (err as Error).message, kind: 'other' });
      }
    } finally {
      setBusy(false);
    }
  };

  const saveKey = (value: string) => {
    setApiKey(value.trim());
    setStoredApiKey(value.trim());
  };

  return (
    <section className="card brew">
      <form className="brew-form" onSubmit={submit}>
        <span className="card-icon">
          <Icon name="wand" size={18} />
        </span>
        <input
          type="text"
          className="brew-input"
          placeholder={refine ? 'How should this sound change? e.g. "make it punchier and shorter"' : 'Describe a sound… e.g. "rusty drawbridge lowering"'}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          maxLength={600}
          disabled={busy}
          aria-label="Describe a sound"
        />
        <button type="submit" className="primary" disabled={busy || !prompt.trim()}>
          {busy ? <span className="spinner" aria-hidden /> : <Icon name="sparkles" />}
          {busy ? 'Brewing…' : refine ? 'Refine with AI' : 'Brew with AI'}
        </button>
        <button type="button" className="ghost" onClick={() => setShowKey((s) => !s)} title="AI settings" aria-expanded={showKey}>
          <Icon name="sliders" />
        </button>
      </form>
      <div className="brew-options">
        <label className="checkbox">
          <input type="checkbox" checked={refine} onChange={(e) => setRefine(e.target.checked)} />
          Start from the current recipe
        </label>
        {!prompt && !refine && (
          <span className="brew-suggestions">
            {SUGGESTIONS.slice(0, 4).map((s) => (
              <button key={s} type="button" className="chip" onClick={() => setPrompt(s)}>
                {s}
              </button>
            ))}
          </span>
        )}
      </div>
      {notes && (
        <p className="brew-notes">
          <Icon name="sparkles" size={14} /> {notes}
        </p>
      )}
      {error && (
        <p className="brew-error" role="alert">
          {error.message}
          {error.kind === 'unavailable' && ' Add your own Anthropic API key below, or deploy with ANTHROPIC_API_KEY set.'}
        </p>
      )}
      {showKey && (
        <div className="brew-key">
          <label>
            Your Anthropic API key (optional)
            <input
              type="password"
              value={apiKey}
              placeholder="sk-ant-…"
              onChange={(e) => saveKey(e.target.value)}
              autoComplete="off"
            />
          </label>
          <p className="muted">
            Stored only in this browser and sent straight to Anthropic. Leave empty to use the server's key when the app is
            deployed with one.
          </p>
        </div>
      )}
    </section>
  );
}

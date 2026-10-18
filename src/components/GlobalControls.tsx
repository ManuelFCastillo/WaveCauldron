import { useState, type ReactNode } from 'react';
import { randomSeed, type Recipe } from '../engine';
import { Slider } from './Slider';
import { Icon, type IconName } from './Icon';

interface GlobalControlsProps {
  recipe: Recipe;
  onPatch: (changes: Partial<Recipe>, patchKey?: string) => void;
}

function Card({ icon, title, children }: { icon: IconName; title: string; children: ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <section className={`card fx-card ${open ? '' : 'collapsed'}`}>
      <header className="card-header" onClick={() => setOpen((o) => !o)}>
        <span className="card-icon">
          <Icon name={icon} size={18} />
        </span>
        <h4>{title}</h4>
        <span className="spacer" />
        <button className="ghost" aria-label={open ? `Collapse ${title}` : `Expand ${title}`} aria-expanded={open}>
          <Icon name={open ? 'chevronUp' : 'chevronDown'} />
        </button>
      </header>
      {open && <div className="card-body">{children}</div>}
    </section>
  );
}

export function GlobalControls({ recipe, onPatch }: GlobalControlsProps) {
  const { reverb, echo } = recipe;
  return (
    <div className="global-controls">
      <Card icon="sliders" title="Master">
        <Slider label="Gain" value={recipe.masterGain} min={0} max={1} step={0.01} onChange={(v) => onPatch({ masterGain: v }, 'masterGain')} />
        <label className="checkbox">
          <input type="checkbox" checked={recipe.normalize} onChange={(e) => onPatch({ normalize: e.target.checked })} />
          Normalize peak
        </label>
        <div className="seed-row">
          <Slider label="Seed" value={recipe.seed} min={0} max={99999} step={1} onChange={(v) => onPatch({ seed: v }, 'seed')} />
          <button className="ghost" title="Random seed" onClick={() => onPatch({ seed: randomSeed() % 100000 })}>
            <Icon name="dice" />
          </button>
        </div>
      </Card>
      <Card icon="activity" title="Reverb">
        <Slider label="Amount" value={reverb.amount} min={0} max={1} step={0.01} onChange={(v) => onPatch({ reverb: { ...reverb, amount: v } }, 'reverb.amount')} />
        <Slider label="Size" value={reverb.size} min={0.05} max={6} step={0.05} unit="s" onChange={(v) => onPatch({ reverb: { ...reverb, size: v } }, 'reverb.size')} />
      </Card>
      <Card icon="echo" title="Echo">
        <Slider label="Amount" value={echo.amount} min={0} max={1} step={0.01} onChange={(v) => onPatch({ echo: { ...echo, amount: v } }, 'echo.amount')} />
        <Slider label="Time" value={echo.time} min={0.01} max={1} step={0.01} unit="s" onChange={(v) => onPatch({ echo: { ...echo, time: v } }, 'echo.time')} />
        <Slider label="Feedback" value={echo.feedback} min={0} max={0.95} step={0.01} onChange={(v) => onPatch({ echo: { ...echo, feedback: v } }, 'echo.feedback')} />
      </Card>
    </div>
  );
}

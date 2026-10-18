import type { Recipe } from '../engine';
import { Slider } from './Slider';

interface GlobalControlsProps {
  recipe: Recipe;
  onPatch: (changes: Partial<Recipe>, patchKey?: string) => void;
}

export function GlobalControls({ recipe, onPatch }: GlobalControlsProps) {
  const { reverb, echo } = recipe;
  return (
    <section className="global-controls">
      <div className="param-group">
        <h4>Master</h4>
        <Slider label="Gain" value={recipe.masterGain} min={0} max={1} step={0.01} onChange={(v) => onPatch({ masterGain: v }, 'masterGain')} />
        <label className="checkbox">
          <input type="checkbox" checked={recipe.normalize} onChange={(e) => onPatch({ normalize: e.target.checked })} />
          Normalize peak
        </label>
        <Slider label="Seed" value={recipe.seed} min={0} max={99999} step={1} onChange={(v) => onPatch({ seed: v }, 'seed')} />
      </div>
      <div className="param-group">
        <h4>Reverb</h4>
        <Slider label="Amount" value={reverb.amount} min={0} max={1} step={0.01} onChange={(v) => onPatch({ reverb: { ...reverb, amount: v } }, 'reverb.amount')} />
        <Slider label="Size" value={reverb.size} min={0.05} max={6} step={0.05} unit="s" onChange={(v) => onPatch({ reverb: { ...reverb, size: v } }, 'reverb.size')} />
      </div>
      <div className="param-group">
        <h4>Echo</h4>
        <Slider label="Amount" value={echo.amount} min={0} max={1} step={0.01} onChange={(v) => onPatch({ echo: { ...echo, amount: v } }, 'echo.amount')} />
        <Slider label="Time" value={echo.time} min={0.01} max={1} step={0.01} unit="s" onChange={(v) => onPatch({ echo: { ...echo, time: v } }, 'echo.time')} />
        <Slider label="Feedback" value={echo.feedback} min={0} max={0.95} step={0.01} onChange={(v) => onPatch({ echo: { ...echo, feedback: v } }, 'echo.feedback')} />
      </div>
    </section>
  );
}

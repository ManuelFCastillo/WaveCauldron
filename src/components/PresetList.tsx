import { useState } from 'react';
import { PRESETS, type Preset, type PresetCategory } from '../engine';
import { Icon, type IconName } from './Icon';

interface PresetListProps {
  activeId: string | null;
  onSelect: (preset: Preset) => void;
}

export const CATEGORY_ICON: Record<PresetCategory, IconName> = {
  Magic: 'wand',
  Combat: 'swords',
  Retro: 'zap',
  UI: 'pointer',
  World: 'globe',
};

const PRESET_ICON: Record<string, IconName> = {
  fireball: 'sparkles',
  'ice-shard': 'sparkles',
  sparkle: 'sparkles',
  explosion: 'zap',
  'sword-clash': 'swords',
  hurt: 'activity',
  laser: 'zap',
  jump: 'arrowUp',
  coin: 'cube',
  powerup: 'sparkles',
  'ui-click': 'pointer',
  'ui-confirm': 'pointer',
  'ui-error': 'pointer',
  'spaceship-door': 'globe',
  footstep: 'globe',
  thunder: 'activity',
};

export function presetIcon(id: string | null): IconName {
  return (id && PRESET_ICON[id]) || 'flask';
}

export function PresetList({ activeId, onSelect }: PresetListProps) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const matches = (p: Preset) =>
    !q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
  const categories = Array.from(new Set(PRESETS.map((p) => p.category))) as PresetCategory[];

  return (
    <nav className="preset-list" aria-label="Presets">
      <label className="search">
        <Icon name="search" />
        <input
          type="search"
          placeholder="Search recipes…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search recipes"
        />
      </label>
      {categories.map((category) => {
        const items = PRESETS.filter((p) => p.category === category && matches(p));
        if (items.length === 0) return null;
        return (
          <div key={category} className="preset-category">
            <h3>
              <Icon name={CATEGORY_ICON[category]} size={14} />
              <span>{category}</span>
              <span className="count">{items.length}</span>
            </h3>
            {items.map((preset) => (
              <button
                key={preset.id}
                className={`preset ${preset.id === activeId ? 'active' : ''}`}
                onClick={() => onSelect(preset)}
              >
                <span className="preset-icon">
                  <Icon name={presetIcon(preset.id)} size={18} />
                </span>
                <span className="preset-text">
                  <span className="preset-name">{preset.name}</span>
                  <span className="preset-desc">{preset.description}</span>
                </span>
              </button>
            ))}
          </div>
        );
      })}
      {q && PRESETS.every((p) => !matches(p)) && <p className="empty small">No recipes match “{query}”.</p>}
    </nav>
  );
}

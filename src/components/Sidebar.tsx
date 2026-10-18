import { useState, type ReactNode } from 'react';
import { PRESETS, type Preset, type PresetCategory } from '../engine';
import type { Library, SavedSound } from '../library/store';
import { soundsIn } from '../library/store';
import { Icon, type IconName } from './Icon';
import { Menu } from './Menu';

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

const COLLAPSED_KEY = 'wavecauldron.collapsed';

function loadCollapsed(): Set<string> {
  try {
    const raw = localStorage.getItem(COLLAPSED_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

interface SidebarProps {
  activePresetId: string | null;
  activeSoundId: string | null;
  library: Library;
  onSelectPreset: (preset: Preset) => void;
  onSelectSound: (sound: SavedSound) => void;
  onDeleteSound: (sound: SavedSound) => void;
  onRenameSound: (sound: SavedSound) => void;
  onRenameCategory: (name: string) => void;
  onDeleteCategory: (name: string) => void;
  onNewCategory: () => void;
}

export function Sidebar({
  activePresetId,
  activeSoundId,
  library,
  onSelectPreset,
  onSelectSound,
  onDeleteSound,
  onRenameSound,
  onRenameCategory,
  onDeleteCategory,
  onNewCategory,
}: SidebarProps) {
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(loadCollapsed);
  const q = query.trim().toLowerCase();
  const searching = q.length > 0;

  const toggle = (key: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      try {
        localStorage.setItem(COLLAPSED_KEY, JSON.stringify([...next]));
      } catch {
        // Fine; collapse state just won't persist.
      }
      return next;
    });
  };

  const matchesText = (...parts: (string | undefined)[]) =>
    !searching || parts.some((p) => p && p.toLowerCase().includes(q));

  const section = (key: string, title: ReactNode, count: number, items: ReactNode[], extra?: ReactNode) => {
    if (items.length === 0 && searching) return null;
    // A search expands everything so matches are visible.
    const open = searching || !collapsed.has(key);
    return (
      <div className={`sidebar-section ${open ? '' : 'collapsed'}`} key={key}>
        <h3>
          <button type="button" className="disclosure" onClick={() => toggle(key)} aria-expanded={open}>
            <Icon name="chevronDown" size={12} className="caret" />
            {title}
          </button>
          <span className="count">{count}</span>
          {extra}
        </h3>
        {open && items}
        {open && items.length === 0 && <p className="empty small">Nothing here yet.</p>}
      </div>
    );
  };

  const presetCategories = Array.from(new Set(PRESETS.map((p) => p.category))) as PresetCategory[];

  return (
    <nav className="sidebar-nav" aria-label="Sounds">
      <label className="search">
        <Icon name="search" />
        <input
          type="search"
          placeholder="Search sounds…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search sounds"
        />
      </label>

      <div className="sidebar-group">
        <div className="sidebar-group-title">
          <Icon name="folder" size={14} />
          <span>My sounds</span>
          <span className="spacer" />
          <button type="button" className="ghost" onClick={onNewCategory} title="New category">
            <Icon name="plus" size={14} />
          </button>
        </div>
        {library.categories.length === 0 && !searching && (
          <p className="empty small">Save a sound or brew one with AI and it will appear here.</p>
        )}
        {library.categories.map((category) => {
          const sounds = soundsIn(library, category).filter((s) => matchesText(s.name, s.recipe.description, category));
          return section(
            `lib:${category}`,
            <span>{category}</span>,
            soundsIn(library, category).length,
            sounds.map((sound) => (
              <div key={sound.id} className={`preset sound ${sound.id === activeSoundId ? 'active' : ''}`}>
                <button type="button" className="preset-main" onClick={() => onSelectSound(sound)}>
                  <span className="preset-icon">
                    <Icon name="flask" size={18} />
                  </span>
                  <span className="preset-text">
                    <span className="preset-name">{sound.name}</span>
                    {sound.recipe.description && <span className="preset-desc">{sound.recipe.description}</span>}
                  </span>
                </button>
                <Menu
                  className="item-menu"
                  title="Sound options"
                  items={[
                    { label: 'Rename / move…', icon: 'save', onSelect: () => onRenameSound(sound) },
                    { label: 'Delete', icon: 'trash', danger: true, onSelect: () => onDeleteSound(sound) },
                  ]}
                >
                  ⋯
                </Menu>
              </div>
            )),
            <Menu
              className="item-menu"
              title="Category options"
              items={[
                { label: 'Rename category', onSelect: () => onRenameCategory(category) },
                { label: 'Delete category', icon: 'trash', danger: true, onSelect: () => onDeleteCategory(category) },
              ]}
            >
              ⋯
            </Menu>,
          );
        })}
      </div>

      <div className="sidebar-group">
        <div className="sidebar-group-title">
          <Icon name="book" size={14} />
          <span>Presets</span>
        </div>
        {presetCategories.map((category) => {
          const items = PRESETS.filter((p) => p.category === category && matchesText(p.name, p.description, p.category));
          return section(
            `preset:${category}`,
            <>
              <Icon name={CATEGORY_ICON[category]} size={14} />
              <span>{category}</span>
            </>,
            PRESETS.filter((p) => p.category === category).length,
            items.map((preset) => (
              <button
                type="button"
                key={preset.id}
                className={`preset ${preset.id === activePresetId ? 'active' : ''}`}
                onClick={() => onSelectPreset(preset)}
              >
                <span className="preset-icon">
                  <Icon name={presetIcon(preset.id)} size={18} />
                </span>
                <span className="preset-text">
                  <span className="preset-name">{preset.name}</span>
                  <span className="preset-desc">{preset.description}</span>
                </span>
              </button>
            )),
          );
        })}
      </div>
    </nav>
  );
}

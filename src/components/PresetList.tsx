import { PRESETS, type Preset, type PresetCategory } from '../engine';

interface PresetListProps {
  activeId: string | null;
  onSelect: (preset: Preset) => void;
}

export function PresetList({ activeId, onSelect }: PresetListProps) {
  const categories = Array.from(new Set(PRESETS.map((p) => p.category))) as PresetCategory[];
  return (
    <nav className="preset-list" aria-label="Presets">
      {categories.map((category) => (
        <div key={category} className="preset-category">
          <h3>{category}</h3>
          {PRESETS.filter((p) => p.category === category).map((preset) => (
            <button
              key={preset.id}
              className={`preset ${preset.id === activeId ? 'active' : ''}`}
              onClick={() => onSelect(preset)}
              title={preset.description}
            >
              <span className="preset-name">{preset.name}</span>
              <span className="preset-desc">{preset.description}</span>
            </button>
          ))}
        </div>
      ))}
    </nav>
  );
}

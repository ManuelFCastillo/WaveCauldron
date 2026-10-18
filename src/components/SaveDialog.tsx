import { useEffect, useState, type FormEvent } from 'react';
import type { SavedSound } from '../library/store';
import { DEFAULT_CATEGORY } from '../library/store';
import { Icon } from './Icon';

interface SaveDialogProps {
  /** The sound being updated, or null when saving something new. */
  existing: SavedSound | null;
  defaultName: string;
  categories: string[];
  onSave: (input: { name: string; category: string; asNew: boolean }) => void;
  onClose: () => void;
}

const NEW = '__new__';

export function SaveDialog({ existing, defaultName, categories, onSave, onClose }: SaveDialogProps) {
  const [name, setName] = useState(existing?.name ?? defaultName);
  const initialCategory = existing?.category ?? categories[0] ?? NEW;
  const [category, setCategory] = useState(categories.length ? initialCategory : NEW);
  const [newCategory, setNewCategory] = useState(categories.length ? '' : DEFAULT_CATEGORY);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const resolvedCategory = category === NEW ? newCategory.trim() : category;
  const valid = name.trim().length > 0 && resolvedCategory.length > 0;

  const submit = (asNew: boolean) => (e?: FormEvent) => {
    e?.preventDefault();
    if (!valid) return;
    onSave({ name: name.trim(), category: resolvedCategory, asNew });
  };

  return (
    <div className="dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="dialog card" onSubmit={submit(false)} role="dialog" aria-modal="true" aria-labelledby="save-title">
        <header className="card-header">
          <span className="card-icon">
            <Icon name="save" size={18} />
          </span>
          <h4 id="save-title">{existing ? 'Update sound' : 'Save to my sounds'}</h4>
          <span className="spacer" />
          <button type="button" className="ghost" onClick={onClose} aria-label="Close">
            <Icon name="plus" style={{ transform: 'rotate(45deg)' }} />
          </button>
        </header>
        <div className="dialog-body">
          <label>
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </label>
          <label>
            Category
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              <option value={NEW}>+ New category…</option>
            </select>
          </label>
          {category === NEW && (
            <label>
              New category name
              <input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="e.g. Weapons" autoFocus />
            </label>
          )}
        </div>
        <footer className="dialog-footer">
          {existing && (
            <button type="button" onClick={submit(true)} disabled={!valid}>
              Save as new
            </button>
          )}
          <span className="spacer" />
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="primary" disabled={!valid}>
            <Icon name="save" /> {existing ? 'Update' : 'Save'}
          </button>
        </footer>
      </form>
    </div>
  );
}

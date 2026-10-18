import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

export interface MenuItem {
  label: string;
  icon?: IconName;
  onSelect: () => void;
  danger?: boolean;
}

interface MenuProps {
  items: MenuItem[];
  /** The trigger button's content. */
  children: ReactNode;
  className?: string;
  title?: string;
  align?: 'left' | 'right';
}

/** A small dropdown menu: closes on outside click or Escape. */
export function Menu({ items, children, className = '', title, align = 'right' }: MenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className={`menu ${className}`} ref={ref}>
      <button
        type="button"
        className={open ? 'active' : ''}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        title={title}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {children}
      </button>
      {open && (
        <div className={`menu-list ${align}`} role="menu">
          {items.map((item) => (
            <button
              type="button"
              role="menuitem"
              key={item.label}
              className={item.danger ? 'danger' : ''}
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                item.onSelect();
              }}
            >
              {item.icon && <Icon name={item.icon} size={14} />}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

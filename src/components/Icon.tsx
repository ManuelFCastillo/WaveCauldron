import type { SVGProps } from 'react';
import type { Waveform } from '../engine';

/** Small inline icon set (24x24, stroke-based) so the UI has no icon-font dependency. */
const PATHS: Record<string, string[]> = {
  play: ['M6 4l14 8-14 8z'],
  stop: ['M6 6h12v12H6z'],
  shuffle: ['M16 3h5v5', 'M4 20L21 3', 'M21 16v5h-5', 'M15 15l6 6', 'M4 4l5 5'],
  cube: ['M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z', 'M3.27 6.96L12 12.01l8.73-5.05', 'M12 22.08V12'],
  undo: ['M3 7v6h6', 'M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13'],
  redo: ['M21 7v6h-6', 'M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7'],
  download: ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'M7 10l5 5 5-5', 'M12 15V3'],
  save: ['M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z', 'M17 21v-8H7v8', 'M7 3v5h8'],
  folder: ['M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z'],
  link: ['M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71', 'M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71'],
  search: ['M11 3a8 8 0 1 0 0 16 8 8 0 0 0 0-16z', 'M21 21l-4.35-4.35'],
  plus: ['M12 5v14', 'M5 12h14'],
  chevronDown: ['M6 9l6 6 6-6'],
  chevronUp: ['M18 15l-6-6-6 6'],
  arrowUp: ['M12 19V5', 'M5 12l7-7 7 7'],
  arrowDown: ['M12 5v14', 'M19 12l-7 7-7-7'],
  copy: ['M9 9h13v13H9z', 'M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1'],
  trash: ['M3 6h18', 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6', 'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2'],
  layers: ['M12 2L2 7l10 5 10-5-10-5z', 'M2 17l10 5 10-5', 'M2 12l10 5 10-5'],
  sliders: ['M4 21v-7', 'M4 10V3', 'M12 21v-9', 'M12 8V3', 'M20 21v-5', 'M20 12V3', 'M1 14h6', 'M9 8h6', 'M17 16h6'],
  activity: ['M22 12h-4l-3 9L9 3l-3 9H2'],
  echo: ['M12 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4z', 'M16.24 7.76a6 6 0 0 1 0 8.49', 'M7.76 16.24a6 6 0 0 1 0-8.49', 'M20.07 4.93a10 10 0 0 1 0 14.14', 'M3.93 19.07a10 10 0 0 1 0-14.14'],
  envelope: ['M2 20l5-14 3 8 3-3 9 9'],
  filter: ['M22 3H2l8 9.46V19l4 2v-8.54L22 3z'],
  sparkles: ['M12 3l1.9 5.6 5.6 1.9-5.6 1.9L12 18l-1.9-5.6-5.6-1.9 5.6-1.9z', 'M19 2l.7 2 2 .7-2 .7L19 7.5l-.7-2.1-2-.7 2-.7z'],
  mix: ['M18 20V10', 'M12 20V4', 'M6 20v-6'],
  reset: ['M3 2v6h6', 'M3.51 15a9 9 0 1 0 2.13-9.36L3 8'],
  brand: ['M2 12h3l3-8 4 16 4-12 2 4h4'],
  zap: ['M13 2L3 14h9l-1 8 10-12h-9l1-8z'],
  wand: ['M15 4V2', 'M15 16v-2', 'M8 9h2', 'M20 9h2', 'M17.8 11.8L19 13', 'M17.8 6.2L19 5', 'M3 21l9-9', 'M12.2 6.2L11 5'],
  swords: ['M14.5 17.5L3 6V3h3l11.5 11.5', 'M13 19l6-6', 'M16 16l4 4', 'M19 21l2-2', 'M14.5 6.5L18 3h3v3l-3.5 3.5', 'M5 14l4 4', 'M7 17l-4 4', 'M3 19l2 2'],
  pointer: ['M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z', 'M13 13l6 6'],
  globe: ['M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z', 'M2 12h20', 'M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z'],
  moon: ['M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z'],
  sun: ['M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10z', 'M12 1v2', 'M12 21v2', 'M4.22 4.22l1.42 1.42', 'M18.36 18.36l1.42 1.42', 'M1 12h2', 'M21 12h2', 'M4.22 19.78l1.42-1.42', 'M18.36 5.64l1.42-1.42'],
  book: ['M4 19.5A2.5 2.5 0 0 1 6.5 17H20', 'M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z'],
  flask: ['M9 3h6', 'M10 3v6L4 20a1 1 0 0 0 .9 1.5h14.2A1 1 0 0 0 20 20l-6-11V3'],
  dice: ['M3 3h18v18H3z', 'M8 8h.01', 'M16 8h.01', 'M12 12h.01', 'M8 16h.01', 'M16 16h.01'],
};

export type IconName = keyof typeof PATHS;

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName;
  size?: number;
}

export function Icon({ name, size = 16, ...rest }: IconProps) {
  const paths = PATHS[name];
  const filled = name === 'play' || name === 'stop';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={filled ? 0 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...rest}
    >
      {paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}

/** A tiny picture of the layer's waveform, so layers are recognisable at a glance. */
export function WaveIcon({ waveform, size = 18 }: { waveform: Waveform; size?: number }) {
  let d: string;
  switch (waveform) {
    case 'sine': d = 'M2 12c2.5-8 5-8 7.5 0s5 8 7.5 0 5-8 5 0'; break;
    case 'square': d = 'M2 18V6h5v12h5V6h5v12h5'; break;
    case 'sawtooth': d = 'M2 18L9 6v12L16 6v12L22 8'; break;
    case 'triangle': d = 'M2 18l5-12 5 12 5-12 5 12'; break;
    case 'brown': d = 'M2 14l2-4 2 6 2-3 2 2 2-5 2 4 2-2 2 3 2-4 2 2'; break;
    case 'pink': d = 'M2 12l1.5-5 1.5 8 1.5-6 1.5 4 1.5-7 1.5 9 1.5-5 1.5 3 1.5-6 1.5 7 1.5-4 1.5 5 1.5-6 1.5 3'; break;
    default: d = 'M2 12l1-8 1 14 1-10 1 8 1-12 1 14 1-9 1 6 1-11 1 14 1-7 1 5 1-10 1 12 1-8 1 6 1-9 1 7 1-5';
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

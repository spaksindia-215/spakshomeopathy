/**
 * Small inline-SVG line-icon set for the Herbs Store (category tiles,
 * trust section, star ratings, cart/wishlist/search glyphs). Self
 * contained — no icon-font/npm dependency added (§46: avoid unnecessary
 * dependencies), consistent with the rest of this app using Font Awesome
 * via `<i>` classes for legacy pages and plain inline SVG elsewhere
 * (`src/components/ui/StarRating.tsx`).
 */

import type { CSSProperties } from 'react';

export type HerbIconName =
  | 'leaf'
  | 'mortar'
  | 'root'
  | 'leaves'
  | 'seed'
  | 'flower'
  | 'droplet'
  | 'flask'
  | 'oil'
  | 'tea'
  | 'bundle'
  | 'hair'
  | 'skin'
  | 'digestion'
  | 'shield'
  | 'bone'
  | 'calm'
  | 'woman'
  | 'man'
  | 'lungs'
  | 'wellness'
  | 'scale'
  | 'heart'
  | 'brain'
  | 'cart'
  | 'wishlist'
  | 'wishlist-filled'
  | 'search'
  | 'star'
  | 'star-filled'
  | 'check'
  | 'truck'
  | 'lock'
  | 'support'
  | 'close'
  | 'chevron-down'
  | 'filter'
  | 'grid'
  | 'eye'
  | 'minus'
  | 'plus';

const PATHS: Record<HerbIconName, string> = {
  leaf: 'M12 3C7 3 4 8 4 13c0 4 3 7 7 7 5 0 9-4 9-11 0-2 0-5-1-6-1 2-3 3-5 3-3 0-5-2-2-3Z',
  mortar: 'M6 14h12M7 14a5 5 0 0010 0M9 14V7l1-3h4l1 3v7',
  root: 'M12 3v6M12 9c-2 2-3 4-2 8M12 9c2 2 3 4 2 8M12 9c0 3-1 5 0 9',
  leaves: 'M12 21c-5-1-8-5-8-10 4 0 7 2 8 5 1-3 4-5 8-5 0 5-3 9-8 10Z',
  seed: 'M12 3c4 3 6 7 4 12-2 4-6 5-8 2-2-3 0-8 4-14Z',
  flower:
    'M12 12a3 3 0 100-6 3 3 0 000 6ZM12 3c1.5 2 1.5 4 0 6M21 12c-2 1.5-4 1.5-6 0M12 21c-1.5-2-1.5-4 0-6M3 12c2-1.5 4-1.5 6 0',
  droplet: 'M12 3c4 5 6 8 6 11a6 6 0 11-12 0c0-3 2-6 6-11Z',
  flask: 'M9 3h6M10 3v6l-5 9a2 2 0 002 3h10a2 2 0 002-3l-5-9V3',
  oil: 'M9 3h6v4l3 3v9a2 2 0 01-2 2H8a2 2 0 01-2-2v-9l3-3V3Z',
  tea: 'M4 8h13a3 3 0 010 6h-1M4 8v8a3 3 0 003 3h6a3 3 0 003-3v-2M4 8l1-4h8l1 4',
  bundle: 'M4 12l4-8 4 3 4-3 4 8M4 12l4 8h8l4-8M4 12h16',
  hair: 'M6 21c0-6 1-10 6-10s6 4 6 10M8 11c-1-3 0-6 4-6s5 3 4 6',
  skin: 'M12 3a9 9 0 100 18 9 9 0 000-18Zm0 4a5 5 0 010 10',
  digestion: 'M8 3c0 3-2 4-2 7a6 6 0 0012 0c0-3-2-4-2-7M9 13c1 2 5 2 6 0',
  shield: 'M12 3l7 3v6c0 5-3 8-7 9-4-1-7-4-7-9V6l7-3Z',
  bone: 'M6 9a3 3 0 116 0 3 3 0 010 6 3 3 0 11-6 0 3 3 0 010-6ZM18 9a3 3 0 116 0M9 12h6',
  calm: 'M12 3a9 9 0 100 18 9 9 0 000-18Zm-3 8s1 2 3 2 3-2 3-2M9 9h.01M15 9h.01',
  woman: 'M12 3a4 4 0 100 8 4 4 0 000-8Zm0 8v10m-4-4h8',
  man: 'M12 3a4 4 0 100 8 4 4 0 000-8Zm0 8v10m-3-3h6',
  lungs: 'M12 3v8m0 0c-2-3-6-3-7 0-1 4 1 9 4 9 2 0 3-3 3-5m0-4c2-3 6-3 7 0 1 4-1 9-4 9-2 0-3-3-3-5',
  wellness: 'M12 21s-7-4.5-9.5-9A6 6 0 0112 6a6 6 0 019.5 6c-2.5 4.5-9.5 9-9.5 9Z',
  scale: 'M12 3v18M6 7l-3 6a3 3 0 006 0l-3-6Zm12 0l-3 6a3 3 0 006 0l-3-6ZM5 7h14',
  heart: 'M12 21s-7-4.5-9.5-9A6 6 0 0112 6a6 6 0 019.5 6c-2.5 4.5-9.5 9-9.5 9Z',
  brain:
    'M9 4a3 3 0 00-3 3v1a3 3 0 000 6v1a3 3 0 003 3M15 4a3 3 0 013 3v1a3 3 0 010 6v1a3 3 0 01-3 3M9 4v16M15 4v16',
  cart: 'M3 4h2l2.4 12.2a2 2 0 002 1.8h7.2a2 2 0 002-1.8L20 8H6M9 21a1 1 0 100-2 1 1 0 000 2Zm8 0a1 1 0 100-2 1 1 0 000 2Z',
  wishlist:
    'M12 20s-7-4.5-9-8.5C1 7.5 3.5 4 7 4c2 0 4 1 5 3 1-2 3-3 5-3 3.5 0 6 3.5 4 7.5-2 4-9 8.5-9 8.5Z',
  'wishlist-filled':
    'M12 20s-7-4.5-9-8.5C1 7.5 3.5 4 7 4c2 0 4 1 5 3 1-2 3-3 5-3 3.5 0 6 3.5 4 7.5-2 4-9 8.5-9 8.5Z',
  search: 'M11 19a8 8 0 100-16 8 8 0 000 16Zm10 2-5.5-5.5',
  star: 'M12 3l2.6 5.6 6 .8-4.4 4.2 1.1 6-5.3-3-5.3 3 1.1-6L3.4 9.4l6-.8L12 3Z',
  'star-filled': 'M12 3l2.6 5.6 6 .8-4.4 4.2 1.1 6-5.3-3-5.3 3 1.1-6L3.4 9.4l6-.8L12 3Z',
  check: 'M4 12l5 5L20 6',
  truck:
    'M3 7h11v9H3zM14 11h4l3 3v2h-7v-5ZM6.5 20a1.5 1.5 0 100-3 1.5 1.5 0 000 3Zm12 0a1.5 1.5 0 100-3 1.5 1.5 0 000 3Z',
  lock: 'M6 11V8a6 6 0 1112 0v3M5 11h14v9H5v-9Z',
  support: 'M4 13a8 8 0 1116 0v4a2 2 0 01-2 2h-1v-6h3M4 13v4a2 2 0 002 2h1v-6H4Z',
  close: 'M6 6l12 12M18 6L6 18',
  'chevron-down': 'M6 9l6 6 6-6',
  filter: 'M4 6h16M7 12h10M10 18h4',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Zm10 3a3 3 0 100-6 3 3 0 000 6Z',
  minus: 'M5 12h14',
  plus: 'M12 5v14M5 12h14',
};

const FILLED: Partial<Record<HerbIconName, true>> = {
  'wishlist-filled': true,
  'star-filled': true,
};

export interface HerbIconProps {
  name: HerbIconName;
  size?: number;
  className?: string;
  strokeWidth?: number;
  style?: CSSProperties;
}

export function HerbIcon({ name, size = 20, className, strokeWidth = 1.8, style }: HerbIconProps) {
  const d = PATHS[name];
  const isFilled = FILLED[name];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={isFilled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

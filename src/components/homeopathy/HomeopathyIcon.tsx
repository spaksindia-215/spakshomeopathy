/**
 * Small inline-SVG line-icon set for the Homeopathy Store — recreated
 * from the Herbs Store's `HerbIcon.tsx` (same technique: no icon-font/npm
 * dependency, consistent with the rest of the app's inline-SVG icons).
 * Icon names are homeopathy-appropriate (bottle/dilution/pill instead of
 * leaf/root/seed) where the Herbs set's names were herb-specific.
 */

import type { CSSProperties } from 'react';

export type HomeopathyIconName =
  | 'bottle'
  | 'droplet'
  | 'pill'
  | 'mortar'
  | 'shield'
  | 'heart'
  | 'stethoscope'
  | 'wellness'
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
  | 'plus'
  | 'sparkle';

const PATHS: Record<HomeopathyIconName, string> = {
  bottle: 'M9 3h6v4l2 2v10a2 2 0 01-2 2H9a2 2 0 01-2-2V9l2-2V3ZM8 12h8',
  droplet: 'M12 3c4 5 6 8 6 11a6 6 0 11-12 0c0-3 2-6 6-11Z',
  pill: 'M6.5 17.5 17.5 6.5a4.95 4.95 0 117 7L13.5 24.5a4.95 4.95 0 01-7-7Zm4-4L15 18',
  mortar: 'M6 14h12M7 14a5 5 0 0010 0M9 14V7l1-3h4l1 3v7',
  shield: 'M12 3l7 3v6c0 5-3 8-7 9-4-1-7-4-7-9V6l7-3Z',
  heart: 'M12 21s-7-4.5-9.5-9A6 6 0 0112 6a6 6 0 019.5 6c-2.5 4.5-9.5 9-9.5 9Z',
  stethoscope:
    'M5 3v6a4 4 0 008 0V3M9 13v2a5 5 0 0010 0v-2m-5 8a3 3 0 100-6 3 3 0 000 6Z',
  wellness: 'M12 21s-7-4.5-9.5-9A6 6 0 0112 6a6 6 0 019.5 6c-2.5 4.5-9.5 9-9.5 9Z',
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
  sparkle: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3ZM19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15Z',
};

const FILLED: Partial<Record<HomeopathyIconName, true>> = {
  'wishlist-filled': true,
  'star-filled': true,
};

export interface HomeopathyIconProps {
  name: HomeopathyIconName;
  size?: number;
  className?: string;
  strokeWidth?: number;
  style?: CSSProperties;
}

export function HomeopathyIcon({
  name,
  size = 20,
  className,
  strokeWidth = 1.8,
  style,
}: HomeopathyIconProps) {
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

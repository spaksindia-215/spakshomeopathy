/**
 * Self-contained inline-SVG placeholder art for Herbs Store products and
 * categories. Deliberately NOT hotlinked third-party images and NOT the
 * legacy `/uploaded_files/products/*` files (those are real production
 * customer/business uploads with unrelated filenames — greeting cards,
 * WhatsApp exports, etc. — not curated product photography; using them
 * here would misrepresent unrelated files as herb photos). Each key maps
 * to a small hand-built gradient/motif SVG so every demo product still
 * gets a distinct, on-brand visual instead of one repeated placeholder box.
 *
 * `art` values referenced from `src/lib/herbs/data/products.ts`'s `image`/
 * `gallery` fields. Swap to real photography later by pointing those
 * fields at uploaded file paths — this component and its callers do not
 * need to change shape.
 */

import type { CSSProperties } from 'react';

const PALETTES: Record<string, [string, string]> = {
  'root-powder': ['#c98a4b', '#8a5a2b'],
  'root-whole': ['#a97a4a', '#6b4423'],
  'powder-jar': ['#d9a86c', '#a3672f'],
  'berry-powder': ['#8fae4e', '#5c7a2e'],
  'berry-whole': ['#6f9143', '#3f5c22'],
  'leaf-powder': ['#7fae6a', '#456b34'],
  'leaf-powder-green': ['#6bab5a', '#3a6b2c'],
  'leaf-powder-deep-green': ['#4f8f52', '#25502a'],
  'stem-pieces': ['#9c8156', '#5f4d2c'],
  'root-powder-light': ['#e0c397', '#b3925a'],
  'blend-powder': ['#c9a15f', '#8f6b32'],
  'tea-leaves': ['#5f9a5e', '#2e5c30'],
  'bark-powder': ['#a06a3f', '#5c3a1f'],
  'seed-bowl': ['#c7a35c', '#8a6a2f'],
  'seed-bowl-brown': ['#a5793f', '#6b4a22'],
  'dried-flower-red': ['#c95a5a', '#8a2f2f'],
  'dried-flower-white': ['#e8e0c7', '#bfae7a'],
  'resin-tears': ['#b98a4a', '#7a5525'],
  'root-sticks': ['#c9b184', '#8f7847'],
  'oil-bottle-green': ['#6ba36a', '#356b38'],
  'combo-pack': ['#d9b26a', '#a3762f'],
  'combo-pack-green': ['#7fae6a', '#3f6b2e'],
  'spice-powder': ['#d99a4b', '#a3612a'],
  'spice-powder-yellow': ['#e8b93f', '#b8841c'],
  'powder-cream': ['#e6d3ae', '#bfa26b'],
  'tea-blend-seeds': ['#c9a15f', '#8f6b32'],
  default: ['#7fae6a', '#3f6b2e'],
};

/** Distinct motif "shapes" so cards don't feel identical beyond colour. */
const MOTIFS: Record<string, 'leaf' | 'root' | 'seed' | 'flower' | 'drop' | 'jar'> = {
  'root-powder': 'jar',
  'root-whole': 'root',
  'powder-jar': 'jar',
  'berry-powder': 'seed',
  'berry-whole': 'seed',
  'leaf-powder': 'leaf',
  'leaf-powder-green': 'leaf',
  'leaf-powder-deep-green': 'leaf',
  'stem-pieces': 'root',
  'root-powder-light': 'jar',
  'blend-powder': 'jar',
  'tea-leaves': 'leaf',
  'bark-powder': 'root',
  'seed-bowl': 'seed',
  'seed-bowl-brown': 'seed',
  'dried-flower-red': 'flower',
  'dried-flower-white': 'flower',
  'resin-tears': 'drop',
  'root-sticks': 'root',
  'oil-bottle-green': 'drop',
  'combo-pack': 'jar',
  'combo-pack-green': 'jar',
  'spice-powder': 'jar',
  'spice-powder-yellow': 'jar',
  'powder-cream': 'jar',
  'tea-blend-seeds': 'seed',
  default: 'leaf',
};

function Motif({ kind, color }: { kind: string; color: string }) {
  switch (kind) {
    case 'leaf':
      return (
        <path
          d="M100 50 C 140 60, 160 100, 130 150 C 100 190, 60 190, 50 150 C 40 100, 60 60, 100 50 Z"
          fill={color}
          opacity="0.9"
        />
      );
    case 'root':
      return (
        <path
          d="M100 40 C 95 90, 110 100, 90 140 M100 40 C 105 90, 95 110, 115 150 M100 40 C 100 80, 100 120, 100 160"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          fill="none"
          opacity="0.9"
        />
      );
    case 'seed':
      return (
        <>
          <ellipse cx="80" cy="90" rx="16" ry="22" fill={color} opacity="0.9" />
          <ellipse cx="115" cy="120" rx="16" ry="22" fill={color} opacity="0.7" />
          <ellipse cx="95" cy="150" rx="16" ry="22" fill={color} opacity="0.8" />
        </>
      );
    case 'flower':
      return (
        <g opacity="0.9">
          {[0, 60, 120, 180, 240, 300].map((deg) => (
            <ellipse
              key={deg}
              cx="100"
              cy="100"
              rx="14"
              ry="34"
              fill={color}
              transform={`rotate(${deg} 100 100) translate(0 -34)`}
            />
          ))}
          <circle cx="100" cy="100" r="14" fill="#f4b942" />
        </g>
      );
    case 'drop':
      return (
        <path
          d="M100 40 C 130 90, 150 120, 130 150 C 115 172, 85 172, 70 150 C 50 120, 70 90, 100 40 Z"
          fill={color}
          opacity="0.9"
        />
      );
    case 'jar':
    default:
      return (
        <g opacity="0.9">
          <rect x="65" y="70" width="70" height="90" rx="10" fill={color} />
          <rect x="75" y="55" width="50" height="20" rx="6" fill={color} opacity="0.8" />
        </g>
      );
  }
}

export interface HerbArtProps {
  art: string;
  label?: string;
  className?: string;
  style?: CSSProperties;
}

/** Deterministic small variation so repeated art keys aren't pixel-identical. */
function seedFrom(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) % 997;
  return h;
}

/**
 * `art` values are almost always one of the generated-SVG keys in
 * `PALETTES`/`MOTIFS` above, but an admin-uploaded product photo
 * (`@/lib/herbs/uploads`) instead stores a real `/uploaded_files/herbs/…`
 * path in the same `image`/`gallery` fields — this lets a single
 * `<HerbArt>` call site work for both without every caller needing to
 * branch itself.
 */
export function isRealImagePath(value: string): boolean {
  return (
    value.startsWith('/uploaded_files/') ||
    value.startsWith('http://') ||
    value.startsWith('https://')
  );
}

export function HerbArt({ art, label, className, style }: HerbArtProps) {
  if (isRealImagePath(art)) {
    return (
      <img
        src={art}
        alt={label ?? 'Herb product photo'}
        className={className}
        style={{ objectFit: 'cover', width: '100%', height: '100%', ...style }}
      />
    );
  }

  const [c1, c2] = PALETTES[art] ?? PALETTES.default ?? ['#7fae6a', '#3f6b2e'];
  const motif = MOTIFS[art] ?? 'leaf';
  const seed = seedFrom(art + (label ?? ''));
  const gradId = `herbart-grad-${art}-${seed}`;

  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      style={style}
      role="img"
      aria-label={label ?? 'Herb product illustration'}
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={c1} stopOpacity="0.18" />
          <stop offset="100%" stopColor={c2} stopOpacity="0.35" />
        </linearGradient>
      </defs>
      <rect width="200" height="200" fill={`url(#${gradId})`} />
      <circle cx={40 + (seed % 20)} cy={30 + (seed % 15)} r="70" fill={c1} opacity="0.08" />
      <Motif kind={motif} color={c2} />
    </svg>
  );
}

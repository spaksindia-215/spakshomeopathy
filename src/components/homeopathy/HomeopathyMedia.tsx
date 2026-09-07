/**
 * Real product/category photography for the Homeopathy Store, with a
 * minimal inline-SVG placeholder fallback for the rare product with no
 * `pBestimg`. Unlike the Herbs Store's `HerbArt` (which draws generated
 * gradient/motif art for its seed catalogue because no real photography
 * exists for those demo products), every real homeopathy product here
 * has an actual uploaded photo under `/uploaded_files/products/` (see
 * `src/app/product-details/[slug]/page.tsx`'s established path
 * convention) — so this component's default path is a plain `<img>` at
 * that real path, not generated art.
 */

import type { CSSProperties } from 'react';

export interface ProductImageProps {
  /** Filename from `product.pBestimg` (or a `slot{N}.pImage`) — resolved
   * against `/uploaded_files/products/`. */
  filename: string | null | undefined;
  alt: string;
  className?: string;
  style?: CSSProperties;
}

export function ProductImage({ filename, alt, className, style }: ProductImageProps) {
  if (!filename) {
    return <HomeopathyPlaceholder label={alt} className={className} style={style} />;
  }
  return (
    <img
      src={`/uploaded_files/products/${filename}`}
      alt={alt}
      className={className}
      style={{ objectFit: 'cover', width: '100%', height: '100%', ...style }}
    />
  );
}

export interface CategoryImageProps {
  filename: string | null | undefined;
  alt: string;
  className?: string;
  style?: CSSProperties;
}

export function CategoryImage({ filename, alt, className, style }: CategoryImageProps) {
  if (!filename) {
    return <HomeopathyPlaceholder label={alt} className={className} style={style} />;
  }
  return (
    <img
      src={`/uploaded_files/categories/${filename}`}
      alt={alt}
      className={className}
      style={{ objectFit: 'cover', width: '100%', height: '100%', ...style }}
    />
  );
}

/** Deterministic small hue variation so repeated placeholders (a product
 * with no photo) aren't pixel-identical. */
function seedFrom(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) % 997;
  return h;
}

/**
 * Minimal inline-SVG placeholder (bottle-and-droplet motif, on-brand
 * navy/teal) for the small number of products/categories missing a real
 * uploaded photo. Not a hotlinked stock photo — a small hand-built shape
 * consistent with `HomeopathyIcon`'s glyph style.
 */
export function HomeopathyPlaceholder({
  label,
  className,
  style,
}: {
  label?: string;
  className?: string;
  style?: CSSProperties;
}) {
  const seed = seedFrom(label ?? 'homeopathy');
  const gradId = `hm-placeholder-grad-${seed}`;
  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      style={style}
      role="img"
      aria-label={label ?? 'Homeopathy product'}
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0f4469" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#00bf79" stopOpacity="0.28" />
        </linearGradient>
      </defs>
      <rect width="200" height="200" fill={`url(#${gradId})`} />
      <circle cx={40 + (seed % 20)} cy={30 + (seed % 15)} r="70" fill="#0f4469" opacity="0.06" />
      <path
        d="M88 30h24v22l14 14v78a10 10 0 01-10 10H84a10 10 0 01-10-10V66l14-14V30Zm-8 60h40"
        fill="none"
        stroke="#00bf79"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.85"
      />
    </svg>
  );
}

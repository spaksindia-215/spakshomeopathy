/**
 * Small shared UI primitives for the Homeopathy Store: star rating, price
 * tag, quantity selector, empty state. Recreated from the Herbs Store's
 * `HerbsUI.tsx` (same components, same reasoning for keeping them in one
 * file), adapted to the real `Product` schema's fields (`pRating` is a
 * plain 0-5 int, not a float; discount is derived from `pMrp`/`pPrice`).
 *
 * No `'use client'` here (unlike `HerbsUI.tsx`): none of these components
 * hold state or attach effects — `QuantitySelector` only accepts an
 * `onChange` callback prop, which is fine to render from a Server
 * Component when the caller passing it is itself a Client Component.
 * Keeping this file server-renderable lets `HomeopathyProductCard` (used
 * from server-rendered pages) call the plain `getDiscountPercent()`
 * helper directly — a client-boundary module cannot have its exports
 * called from server code, only rendered as JSX.
 */

import type { ReactNode } from 'react';
import { HomeopathyIcon } from './HomeopathyIcon';

export function StarRating({ rating, size = 14 }: { rating: number; size?: number }) {
  const rounded = Math.round(rating);
  return (
    <span className="hm-rating__stars" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((i) => (
        <HomeopathyIcon key={i} name={i <= rounded ? 'star-filled' : 'star'} size={size} />
      ))}
    </span>
  );
}

export function RatingLine({ rating }: { rating: number | null | undefined }) {
  const value = rating ?? 0;
  return (
    <span className="hm-rating">
      <StarRating rating={value} />
      <span>{value.toFixed(1)}</span>
    </span>
  );
}

export function getDiscountPercent(
  mrp: number | null | undefined,
  price: number | null | undefined
): number | null {
  if (!mrp || !price || mrp <= price) return null;
  return Math.round(((mrp - price) / mrp) * 100);
}

export function PriceTag({
  price,
  mrp,
}: {
  price: number | null | undefined;
  mrp?: number | null | undefined;
}) {
  const discount = getDiscountPercent(mrp, price);
  return (
    <span className="hm-product-card__price">
      <span className="hm-price">₹{price ?? 0}</span>
      {mrp && mrp > (price ?? 0) && <span className="hm-price--compare">₹{mrp}</span>}
      {discount && <span className="hm-price--discount">{discount}% off</span>}
    </span>
  );
}

export function QuantitySelector({
  quantity,
  onChange,
  max,
  disabled,
}: {
  quantity: number;
  onChange: (next: number) => void;
  max?: number;
  disabled?: boolean;
}) {
  return (
    <div className="hm-qty">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, quantity - 1))}
        disabled={disabled || quantity <= 1}
        aria-label="Decrease quantity"
      >
        <HomeopathyIcon name="minus" size={14} />
      </button>
      <input
        type="number"
        min={1}
        max={max}
        value={quantity}
        disabled={disabled}
        onChange={(e) => {
          const next = parseInt(e.target.value, 10);
          if (!Number.isNaN(next) && next >= 1) onChange(max ? Math.min(next, max) : next);
        }}
        aria-label="Quantity"
      />
      <button
        type="button"
        onClick={() => onChange(max ? Math.min(max, quantity + 1) : quantity + 1)}
        disabled={disabled || (max !== undefined && quantity >= max)}
        aria-label="Increase quantity"
      >
        <HomeopathyIcon name="plus" size={14} />
      </button>
    </div>
  );
}

export function EmptyState({
  icon = 'bottle' as const,
  title,
  text,
  action,
}: {
  icon?: Parameters<typeof HomeopathyIcon>[0]['name'];
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="hm-empty-state">
      <div className="hm-empty-state__icon">
        <HomeopathyIcon name={icon} size={28} />
      </div>
      <p className="hm-empty-state__title">{title}</p>
      <p className="hm-empty-state__text">{text}</p>
      {action}
    </div>
  );
}

/**
 * "<Product> added to cart" confirmation toast — recreated from the
 * Herbs Store's `HerbsUI.tsx#Toast` (defined there but never actually
 * wired up to any add-to-cart action). Rendered once from
 * `HomeopathyShell`, driven by `useHomeopathyStore().toastMessage`, so
 * every add-to-cart entry point (product card, Quick View, PDP) shows
 * the same confirmation.
 */
export function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="hm-toast" role="status">
      <span className="hm-toast__icon">
        <HomeopathyIcon name="check" size={18} />
      </span>
      {message}
      <button
        type="button"
        onClick={onClose}
        aria-label="Dismiss"
        style={{
          background: 'none',
          border: 'none',
          color: '#fff',
          cursor: 'pointer',
          marginLeft: 6,
          display: 'inline-flex',
        }}
      >
        <HomeopathyIcon name="close" size={14} />
      </button>
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="hm-product-grid" aria-hidden="true" aria-busy="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="hm-product-card">
          <div className="hm-skeleton" style={{ aspectRatio: '1/1' }} />
          <div className="hm-product-card__body">
            <div className="hm-skeleton" style={{ height: 10, width: '40%' }} />
            <div className="hm-skeleton" style={{ height: 14, width: '80%' }} />
            <div className="hm-skeleton" style={{ height: 18, width: '50%' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

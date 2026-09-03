'use client';

/**
 * Small shared UI primitives for the Herbs Store: star rating, price tag,
 * quantity selector, empty/loading/error states. Kept in one file since
 * each is a handful of lines and they're always imported together by the
 * larger Herbs components — splitting further would be fragmentation
 * without benefit (§38 of the original brief: "do not create unnecessary
 * component fragmentation").
 */

import type { ReactNode } from 'react';
import { HerbIcon } from './HerbIcon';
import { getDiscountPercent } from '@/lib/herbs/types';

export function StarRating({ rating, size = 14 }: { rating: number; size?: number }) {
  const rounded = Math.round(rating * 2) / 2;
  return (
    <span className="hs-rating__stars" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((i) => (
        <HerbIcon key={i} name={i <= rounded ? 'star-filled' : 'star'} size={size} />
      ))}
    </span>
  );
}

export function RatingLine({ rating, reviewCount }: { rating: number; reviewCount: number }) {
  return (
    <span className="hs-rating">
      <StarRating rating={rating} />
      <span>
        {rating.toFixed(1)} ({reviewCount})
      </span>
    </span>
  );
}

export function PriceTag({ price, compareAtPrice }: { price: number; compareAtPrice?: number }) {
  const discount = getDiscountPercent(price, compareAtPrice);
  return (
    <span className="hs-product-card__price">
      <span className="hs-price">₹{price}</span>
      {compareAtPrice && <span className="hs-price--compare">₹{compareAtPrice}</span>}
      {discount && <span className="hs-price--discount">{discount}% off</span>}
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
    <div className="hs-qty">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, quantity - 1))}
        disabled={disabled || quantity <= 1}
        aria-label="Decrease quantity"
      >
        <HerbIcon name="minus" size={14} />
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
        <HerbIcon name="plus" size={14} />
      </button>
    </div>
  );
}

export function EmptyState({
  icon = 'leaf' as const,
  title,
  text,
  action,
}: {
  icon?: Parameters<typeof HerbIcon>[0]['name'];
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="hs-empty-state">
      <div className="hs-empty-state__icon">
        <HerbIcon name={icon} size={28} />
      </div>
      <p className="hs-empty-state__title">{title}</p>
      <p className="hs-empty-state__text">{text}</p>
      {action}
    </div>
  );
}

export function ErrorState({ text }: { text: string }) {
  return (
    <div className="hs-error-state">
      <HerbIcon name="close" size={22} />
      <p style={{ marginTop: 10 }}>{text}</p>
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="hs-product-grid" aria-hidden="true" aria-busy="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="hs-product-card">
          <div className="hs-skeleton" style={{ aspectRatio: '1/1' }} />
          <div className="hs-product-card__body">
            <div className="hs-skeleton" style={{ height: 10, width: '40%' }} />
            <div className="hs-skeleton" style={{ height: 14, width: '80%' }} />
            <div className="hs-skeleton" style={{ height: 18, width: '50%' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="hs-toast" role="status">
      <span className="hs-toast__icon">
        <HerbIcon name="check" size={18} />
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
        }}
      >
        <HerbIcon name="close" size={14} />
      </button>
    </div>
  );
}

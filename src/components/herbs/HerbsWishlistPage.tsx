'use client';

import Link from 'next/link';
import { HerbProductCard } from './HerbProductCard';
import { EmptyState } from './HerbsUI';
import { useHerbsStore } from './HerbsStoreProvider';
import { getAllHerbProducts } from '@/lib/herbs/queries';
import type { HerbProduct } from '@/lib/herbs/types';

export interface HerbsWishlistPageProps {
  /** Optional DB-merged catalogue (see `HerbCatalog`'s `catalog` prop doc
   * for the full rationale). Falls back to the static seed catalogue
   * when omitted. */
  catalog?: HerbProduct[];
}

/** `/herbs/wishlist` (§19 of the original brief) — real, working wishlist state. */
export function HerbsWishlistPage({ catalog }: HerbsWishlistPageProps = {}) {
  const { wishlist } = useHerbsStore();
  const all = getAllHerbProducts(catalog);
  const products = wishlist
    .map((id) => all.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  return (
    <section className="hs-section hs-section--tight">
      <div className="container">
        <div className="hs-section__head">
          <div>
            <h1 className="hs-section__title">Your Wishlist</h1>
            <p className="hs-section__subtitle">{products.length} saved herb(s)</p>
          </div>
          <Link href="/herbs/products" className="hs-section__link">
            ← Continue Shopping
          </Link>
        </div>

        {products.length === 0 ? (
          <EmptyState
            icon="wishlist"
            title="Your wishlist is empty."
            text="Tap the heart icon on any herb to save it here."
            action={
              <Link href="/herbs/products" className="hs-btn hs-btn--primary hs-btn--sm">
                Browse Herbs
              </Link>
            }
          />
        ) : (
          <div className="hs-product-grid">
            {products.map((p) => (
              <HerbProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

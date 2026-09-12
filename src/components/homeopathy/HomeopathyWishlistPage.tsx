'use client';

import Link from 'next/link';
import { HomeopathyProductCard } from './HomeopathyProductCard';
import { EmptyState } from './HomeopathyUI';
import { useHomeopathyStore } from './HomeopathyStoreProvider';
import { getAllProducts } from '@/lib/demo/products';

/**
 * `/homeopathy/wishlist` — real, working wishlist state, recreated from
 * the Herbs Store's `HerbsWishlistPage.tsx` so both storefronts' wishlist
 * experience match exactly, per the owner's request.
 */
export function HomeopathyWishlistPage() {
  const { wishlist } = useHomeopathyStore();
  const all = getAllProducts();
  const products = wishlist
    .map((id) => all.find((p) => p.legacyId === id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  return (
    <section className="hm-section hm-section--tight">
      <div className="container">
        <div className="hm-section__head">
          <div>
            <h1 className="hm-section__title">Your Wishlist</h1>
            <p className="hm-section__subtitle">{products.length} saved medicine(s)</p>
          </div>
          <Link href="/homeopathy/products" className="hm-section__link">
            ← Continue Shopping
          </Link>
        </div>

        {products.length === 0 ? (
          <EmptyState
            icon="wishlist"
            title="Your wishlist is empty."
            text="Tap the heart icon on any medicine to save it here."
            action={
              <Link href="/homeopathy/products" className="hm-btn hm-btn--primary hm-btn--sm">
                Browse Medicines
              </Link>
            }
          />
        ) : (
          <div className="hm-product-grid">
            {products.map((p) => (
              <HomeopathyProductCard key={p.legacyId} product={p} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

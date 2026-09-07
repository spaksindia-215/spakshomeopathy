'use client';

import { Fragment, useMemo, useState, type ReactNode } from 'react';
import { HomeopathyIcon } from './HomeopathyIcon';
import { EmptyState, ProductGridSkeleton } from './HomeopathyUI';
import { SORT_LABELS, getHomeopathyPriceRange, type SortOption } from '@/lib/homeopathy/queries';
import type { Category, Product } from '@/lib/mongodb/schemas';

const PAGE_SIZE = 12;

export interface HomeopathyCatalogProps {
  /** The real product pool this catalog page shows — already resolved
   * server-side (`getActiveProducts()`, or `getProductsByCategory()` for
   * a category-scoped page) and passed down, so this client component
   * only filters/sorts/paginates in memory, it never re-fetches. */
  products: Product[];
  /** One pre-rendered `<HomeopathyProductCard>` per product, keyed by
   * `Product.legacyId`, built by the calling SERVER component. Required
   * because `HomeopathyProductCard` renders `AddToCartForm`, which calls
   * server-only `generateCsrfToken()` (reads `process.env` via
   * `getCryptoConfig()`) during render — that must run on the server.
   * This catalog is `'use client'` (filter/sort/pagination state), so it
   * cannot import or invoke that render itself: doing so bundles the
   * server-only code into the client bundle, where a later filter/sort/
   * page interaction re-renders it in the browser with no `process.env`,
   * throwing "Missing required environment variable: APP_KEY" — exactly
   * the failure this prop shape avoids. This component only *selects*
   * pre-built nodes out of the map after filtering/sorting/paginating
   * the data; it never constructs a card itself. */
  cardsById: Map<number, ReactNode>;
  /** Real category rows, for the category filter group. Omit (or pass an
   * empty array) on a page whose category is already fixed. */
  categories?: Category[];
  title: string;
  subtitle?: string;
  /** Pre-select and lock the category filter to this real category
   * (`Category.legacyId`) — used by `/homeopathy/category/[slug]`. */
  lockedCategoryId?: number;
  initialQuery?: string;
}

/**
 * Catalog page body: filters (desktop sidebar + mobile drawer), sort,
 * responsive product grid, pagination — recreated from the Herbs Store's
 * `HerbCatalog.tsx` UX pattern (`hm-catalog`/`hm-filters`/`hm-toolbar`/
 * `hm-pagination`), over the real 125-product catalogue and real
 * category tree instead of a static taxonomy + seed catalogue.
 */
export function HomeopathyCatalog({
  products,
  cardsById,
  categories = [],
  title,
  subtitle,
  lockedCategoryId,
  initialQuery,
}: HomeopathyCatalogProps) {
  const priceRange = useMemo(() => getHomeopathyPriceRange(products), [products]);
  const [categoryId, setCategoryId] = useState<number | undefined>(lockedCategoryId);
  const [minPrice, setMinPrice] = useState<number | undefined>(undefined);
  const [maxPrice, setMaxPrice] = useState<number | undefined>(undefined);
  const [minRating, setMinRating] = useState<number | undefined>(undefined);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sort, setSort] = useState<SortOption>('featured');
  const [page, setPage] = useState(1);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const results = useMemo(() => {
    let list = products;

    if (categoryId !== undefined) list = list.filter((p) => p.pCat === categoryId);

    if (initialQuery) {
      const q = initialQuery.trim().toLowerCase();
      if (q) {
        list = list.filter((p) =>
          [p.pName, p.pHeading, p.searchTerms].some((f) => (f ?? '').toLowerCase().includes(q))
        );
      }
    }

    if (minPrice !== undefined) list = list.filter((p) => (p.pPrice ?? 0) >= minPrice);
    if (maxPrice !== undefined) list = list.filter((p) => (p.pPrice ?? 0) <= maxPrice);
    if (minRating !== undefined) list = list.filter((p) => (p.pRating ?? 0) >= minRating);
    if (inStockOnly) list = list.filter((p) => (p.pQuantity ?? 0) > 0);

    const sorted = [...list];
    switch (sort) {
      case 'price-asc':
        sorted.sort((a, b) => (a.pPrice ?? 0) - (b.pPrice ?? 0));
        break;
      case 'price-desc':
        sorted.sort((a, b) => (b.pPrice ?? 0) - (a.pPrice ?? 0));
        break;
      case 'rating':
        sorted.sort((a, b) => (b.pRating ?? 0) - (a.pRating ?? 0));
        break;
      case 'newest':
        sorted.sort((a, b) => {
          const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return bt - at;
        });
        break;
      case 'featured':
      default:
        sorted.sort((a, b) => (b.pRating ?? 0) - (a.pRating ?? 0));
        break;
    }
    return sorted;
  }, [products, categoryId, initialQuery, minPrice, maxPrice, minRating, inStockOnly, sort]);

  const totalPages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const paged = results.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function resetFilters() {
    if (lockedCategoryId === undefined) setCategoryId(undefined);
    setMinPrice(undefined);
    setMaxPrice(undefined);
    setMinRating(undefined);
    setInStockOnly(false);
    setPage(1);
  }

  function changePage(next: number) {
    setPage(next);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const showCategoryFilter = lockedCategoryId === undefined && categories.length > 0;

  const FiltersPanel = (
    <div className="hm-filters">
      {showCategoryFilter && (
        <div className="hm-filters__group">
          <p className="hm-filters__title">Category</p>
          {categories.map((c) => (
            <label key={c.legacyId} className="hm-filters__option" data-active={categoryId === c.legacyId}>
              <input
                type="radio"
                name="category"
                checked={categoryId === c.legacyId}
                onChange={() => {
                  setCategoryId(c.legacyId);
                  setPage(1);
                }}
              />
              {c.name}
            </label>
          ))}
        </div>
      )}

      <div className="hm-filters__group">
        <p className="hm-filters__title">Price Range</p>
        <div className="hm-price-inputs">
          <input
            type="number"
            placeholder={`₹${priceRange.min}`}
            value={minPrice ?? ''}
            onChange={(e) => {
              setMinPrice(e.target.value ? Number(e.target.value) : undefined);
              setPage(1);
            }}
            aria-label="Minimum price"
          />
          <span>–</span>
          <input
            type="number"
            placeholder={`₹${priceRange.max}`}
            value={maxPrice ?? ''}
            onChange={(e) => {
              setMaxPrice(e.target.value ? Number(e.target.value) : undefined);
              setPage(1);
            }}
            aria-label="Maximum price"
          />
        </div>
      </div>

      <div className="hm-filters__group">
        <p className="hm-filters__title">Rating</p>
        {[4, 3].map((r) => (
          <label key={r} className="hm-filters__option" data-active={minRating === r}>
            <input
              type="radio"
              name="rating"
              checked={minRating === r}
              onChange={() => {
                setMinRating(r);
                setPage(1);
              }}
            />
            {r}★ &amp; above
          </label>
        ))}
      </div>

      <div className="hm-filters__group">
        <label className="hm-filters__option" data-active={inStockOnly}>
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={(e) => {
              setInStockOnly(e.target.checked);
              setPage(1);
            }}
          />
          In stock only
        </label>
      </div>

      <button type="button" className="hm-filters__clear" onClick={resetFilters}>
        Clear all filters
      </button>
    </div>
  );

  return (
    <section className="hm-section hm-section--tight">
      <div className="container">
        <div className="hm-section__head">
          <div>
            <h1 className="hm-section__title">{title}</h1>
            {subtitle && <p className="hm-section__subtitle">{subtitle}</p>}
          </div>
        </div>

        <div className="hm-catalog">
          {FiltersPanel}

          <div>
            <div className="hm-toolbar">
              <span className="hm-toolbar__count">
                {results.length} {results.length === 1 ? 'medicine' : 'medicines'} found
              </span>
              <div className="hm-toolbar__right">
                <button
                  type="button"
                  className="hm-filter-toggle"
                  onClick={() => setDrawerOpen(true)}
                >
                  <HomeopathyIcon name="filter" size={15} /> Filters
                </button>
                <select
                  className="hm-select"
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortOption)}
                  aria-label="Sort products"
                >
                  {Object.entries(SORT_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {results.length === 0 ? (
              <EmptyState
                icon="bottle"
                title="No medicines found."
                text="Try adjusting your filters or search terms."
                action={
                  <button
                    type="button"
                    className="hm-btn hm-btn--outline hm-btn--sm"
                    onClick={resetFilters}
                  >
                    Clear Filters
                  </button>
                }
              />
            ) : (
              <>
                <div className="hm-product-grid">
                  {paged.map((p) => (
                    <Fragment key={p.legacyId}>{cardsById.get(p.legacyId)}</Fragment>
                  ))}
                </div>

                {totalPages > 1 && (
                  <nav className="hm-pagination" aria-label="Pagination">
                    <button
                      type="button"
                      onClick={() => changePage(page - 1)}
                      disabled={page === 1}
                      aria-label="Previous page"
                    >
                      <HomeopathyIcon
                        name="chevron-down"
                        size={14}
                        style={{ transform: 'rotate(90deg)' }}
                      />
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => changePage(n)}
                        aria-current={n === page ? 'page' : undefined}
                      >
                        {n}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => changePage(page + 1)}
                      disabled={page === totalPages}
                      aria-label="Next page"
                    >
                      <HomeopathyIcon
                        name="chevron-down"
                        size={14}
                        style={{ transform: 'rotate(-90deg)' }}
                      />
                    </button>
                  </nav>
                )}
              </>
            )}
          </div>
        </div>

        {drawerOpen && (
          <>
            <div className="hm-drawer-backdrop" onClick={() => setDrawerOpen(false)} />
            <div className="hm-drawer" role="dialog" aria-modal="true" aria-label="Filter medicines">
              <div className="hm-drawer__head">
                <h3>Filters</h3>
                <button
                  type="button"
                  className="hm-icon-btn"
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Close filters"
                >
                  <HomeopathyIcon name="close" size={18} />
                </button>
              </div>
              {FiltersPanel}
              <button
                type="button"
                className="hm-btn hm-btn--primary hm-btn--full"
                style={{ marginTop: 16 }}
                onClick={() => setDrawerOpen(false)}
              >
                Show {results.length} Results
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

export function ProductGridLoading() {
  return (
    <section className="hm-section hm-section--tight">
      <div className="container">
        <ProductGridSkeleton />
      </div>
    </section>
  );
}

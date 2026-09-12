'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { HomeopathyIcon } from './HomeopathyIcon';
import { HomeopathyProductCard } from './HomeopathyProductCard';
import { EmptyState, ProductGridSkeleton } from './HomeopathyUI';
import {
  SORT_LABELS,
  getHomeopathyPriceRange,
  groupProductsByDisease,
  type SortOption,
} from '@/lib/homeopathy/queries';
import type { Category, Product } from '@/lib/mongodb/schemas';

const PAGE_SIZE = 12;

export interface HomeopathyCatalogProps {
  /** The real product pool this catalog page shows — already resolved
   * server-side (`getActiveProducts()`, or `getProductsByCategory()` for
   * a category-scoped page) and passed down, so this client component
   * only filters/sorts/paginates in memory, it never re-fetches. Cards
   * are built directly from this list with `<HomeopathyProductCard>` —
   * no server-prebuilt `cardsById` map is needed any more now that Add to
   * Cart is the client-side `useHomeopathyStore()` interaction (matching
   * the Herbs Store's `HerbCatalog`) rather than the old `AddToCartForm`,
   * which needed a server render for its CSRF token. */
  products: Product[];
  /** Real category rows, for the category filter group. Omit (or pass an
   * empty array) on a page whose category is already fixed. */
  categories?: Category[];
  title: string;
  subtitle?: string;
  /** Pre-select and lock the category filter to this real category
   * (`Category.legacyId`) — used by `/homeopathy/category/[slug]`. */
  lockedCategoryId?: number;
  initialQuery?: string;
  /** When true, show an empty grid with a "choose a filter" prompt instead
   * of the full `products` pool until the shopper applies at least one
   * filter (category/condition/price/rating/in-stock) or a search query.
   * Used by `/homeopathy/products` ("Shop All Medicines") only — per the
   * owner's request that that page not dump the entire catalogue on
   * first load. Other pages using this catalog (`/mother-tincture`,
   * `/nutrition`, `/homeopathy/category/[slug]`) are themselves already a
   * pre-applied filter/scope, so they keep showing their pool immediately
   * (default `false`, unchanged behavior). */
  emptyUntilFiltered?: boolean;
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
  categories = [],
  title,
  subtitle,
  lockedCategoryId,
  initialQuery,
  emptyUntilFiltered = false,
}: HomeopathyCatalogProps) {
  const router = useRouter();
  const priceRange = useMemo(() => getHomeopathyPriceRange(products), [products]);
  const [categoryId, setCategoryId] = useState<number | undefined>(lockedCategoryId);
  const [diseaseKey, setDiseaseKey] = useState<string | undefined>(undefined);
  const [minPrice, setMinPrice] = useState<number | undefined>(undefined);
  const [maxPrice, setMaxPrice] = useState<number | undefined>(undefined);
  const [minRating, setMinRating] = useState<number | undefined>(undefined);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sort, setSort] = useState<SortOption>('featured');
  const [page, setPage] = useState(1);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // "Condition" filter options — one per distinct `pHeading` (disease/
  // subcategory, see `groupProductsByDisease`'s header) within whatever
  // the category filter has already narrowed to, so this list is scoped
  // to the selected category on a locked category page, or spans the
  // whole catalogue on the unlocked Shop All page.
  const conditionPool = useMemo(
    () => (categoryId !== undefined ? products.filter((p) => p.pCat === categoryId) : products),
    [products, categoryId]
  );
  const diseaseGroups = useMemo(() => groupProductsByDisease(conditionPool), [conditionPool]);

  const hasActiveFilter =
    categoryId !== undefined ||
    diseaseKey !== undefined ||
    Boolean(initialQuery?.trim()) ||
    minPrice !== undefined ||
    maxPrice !== undefined ||
    minRating !== undefined ||
    inStockOnly;

  const results = useMemo(() => {
    if (emptyUntilFiltered && !hasActiveFilter) return [];

    let list = products;

    if (categoryId !== undefined) list = list.filter((p) => p.pCat === categoryId);
    if (diseaseKey !== undefined) {
      const group = diseaseGroups.find((g) => g.key === diseaseKey);
      const ids = new Set(group?.products.map((p) => p.legacyId) ?? []);
      list = list.filter((p) => ids.has(p.legacyId));
    }

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
  }, [
    products,
    categoryId,
    diseaseKey,
    diseaseGroups,
    initialQuery,
    minPrice,
    maxPrice,
    minRating,
    inStockOnly,
    sort,
    emptyUntilFiltered,
    hasActiveFilter,
  ]);

  const totalPages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const paged = results.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function resetFilters() {
    if (lockedCategoryId === undefined) setCategoryId(undefined);
    setDiseaseKey(undefined);
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
                  // Navigate to the category's disease/subcategory picker
                  // (`/homeopathy/category/[slug]`) instead of filtering
                  // this page's grid in place — category selection now
                  // drills down (category -> disease -> medicine)
                  // everywhere, not just on pages reached via the
                  // homepage's "Shop by Category" grid.
                  if (c.slug) router.push(`/homeopathy/category/${c.slug}`);
                }}
              />
              {c.name}
            </label>
          ))}
        </div>
      )}

      {diseaseGroups.length > 0 && (
        <div className="hm-filters__group">
          <p className="hm-filters__title">Condition</p>
          <div className="hm-filters__scroll">
            {diseaseGroups.map((g) => (
              <label key={g.key} className="hm-filters__option" data-active={diseaseKey === g.key}>
                <input
                  type="radio"
                  name="condition"
                  checked={diseaseKey === g.key}
                  onChange={() => {
                    setDiseaseKey(g.key);
                    setPage(1);
                  }}
                />
                {g.heading}
              </label>
            ))}
          </div>
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
                {emptyUntilFiltered && !hasActiveFilter
                  ? `${products.length} medicines available`
                  : `${results.length} ${results.length === 1 ? 'medicine' : 'medicines'} found`}
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

            {results.length === 0 && emptyUntilFiltered && !hasActiveFilter ? (
              <EmptyState
                icon="filter"
                title="Choose a category or search to see medicines."
                text="Pick a category, condition, price, or rating filter on the left, or search above, to browse our medicines."
              />
            ) : results.length === 0 ? (
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
                    <HomeopathyProductCard key={p.legacyId} product={p} />
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

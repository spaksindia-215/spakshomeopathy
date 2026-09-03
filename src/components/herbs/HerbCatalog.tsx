'use client';

import { useMemo, useState } from 'react';
import { HerbProductCard } from './HerbProductCard';
import { HerbIcon } from './HerbIcon';
import { EmptyState, ProductGridSkeleton } from './HerbsUI';
import { HERB_FORM_CATEGORIES, WELLNESS_CATEGORIES } from '@/lib/herbs/data/taxonomy';
import {
  filterAndSortHerbProducts,
  getPriceRange,
  type HerbProductFilters,
} from '@/lib/herbs/queries';
import type { HerbForm, HerbProduct, SortOption, WellnessCategory } from '@/lib/herbs/types';

const PAGE_SIZE = 12;

const SORT_LABELS: Record<SortOption, string> = {
  featured: 'Featured',
  popular: 'Popular',
  newest: 'Newest',
  'price-asc': 'Price: Low to High',
  'price-desc': 'Price: High to Low',
  rating: 'Rating',
};

export interface HerbCatalogProps {
  initialForm?: HerbForm;
  initialWellness?: WellnessCategory;
  initialQuery?: string;
  title: string;
  subtitle?: string;
  /** Hide the form/wellness filter group matching the page's own fixed scope. */
  lockedFilter?: 'form' | 'wellness';
  /** Optional DB-merged catalogue from `getMergedHerbCatalog()` (server-side).
   * Falls back to the static seed catalogue when omitted, so existing
   * callers that don't pass this keep working unchanged. */
  catalog?: HerbProduct[];
}

/**
 * Catalog page body: filters (desktop sidebar + mobile drawer), sort,
 * responsive product grid, pagination (§10, §13 of the original brief).
 * A client component because filtering/sorting/pagination are genuinely
 * interactive and operate on the in-memory demo catalogue; the page
 * itself (`/herbs/products`, category/wellness pages) stays a server
 * component that only supplies the fixed scope + metadata.
 */
export function HerbCatalog({
  initialForm,
  initialWellness,
  initialQuery,
  title,
  subtitle,
  lockedFilter,
  catalog,
}: HerbCatalogProps) {
  const priceRange = useMemo(() => getPriceRange(catalog), [catalog]);
  const [form, setForm] = useState<HerbForm | undefined>(initialForm);
  const [wellness, setWellness] = useState<WellnessCategory | undefined>(initialWellness);
  const [minPrice, setMinPrice] = useState<number | undefined>(undefined);
  const [maxPrice, setMaxPrice] = useState<number | undefined>(undefined);
  const [minRating, setMinRating] = useState<number | undefined>(undefined);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sort, setSort] = useState<SortOption>('featured');
  const [page, setPage] = useState(1);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const results = useMemo(() => {
    const filters: HerbProductFilters = {
      ...(form ? { form } : {}),
      ...(wellness ? { wellness } : {}),
      ...(minPrice !== undefined ? { minPrice } : {}),
      ...(maxPrice !== undefined ? { maxPrice } : {}),
      ...(minRating !== undefined ? { minRating } : {}),
      ...(initialQuery ? { query: initialQuery } : {}),
      inStockOnly,
      sort,
    };
    return filterAndSortHerbProducts(filters, catalog);
  }, [form, wellness, minPrice, maxPrice, minRating, inStockOnly, sort, initialQuery, catalog]);

  const totalPages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const paged = results.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function resetFilters() {
    if (lockedFilter !== 'form') setForm(undefined);
    if (lockedFilter !== 'wellness') setWellness(undefined);
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

  const FiltersPanel = (
    <div className="hs-filters">
      {lockedFilter !== 'form' && (
        <div className="hs-filters__group">
          <p className="hs-filters__title">Herb Form</p>
          {HERB_FORM_CATEGORIES.map((c) => (
            <label key={c.form} className="hs-filters__option" data-active={form === c.form}>
              <input
                type="radio"
                name="form"
                checked={form === c.form}
                onChange={() => {
                  setForm(c.form);
                  setPage(1);
                }}
              />
              {c.label}
            </label>
          ))}
        </div>
      )}

      {lockedFilter !== 'wellness' && (
        <div className="hs-filters__group">
          <p className="hs-filters__title">Wellness Category</p>
          {WELLNESS_CATEGORIES.map((c) => (
            <label key={c.key} className="hs-filters__option" data-active={wellness === c.key}>
              <input
                type="radio"
                name="wellness"
                checked={wellness === c.key}
                onChange={() => {
                  setWellness(c.key);
                  setPage(1);
                }}
              />
              {c.label}
            </label>
          ))}
        </div>
      )}

      <div className="hs-filters__group">
        <p className="hs-filters__title">Price Range</p>
        <div className="hs-price-inputs">
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

      <div className="hs-filters__group">
        <p className="hs-filters__title">Rating</p>
        {[4, 3].map((r) => (
          <label key={r} className="hs-filters__option" data-active={minRating === r}>
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

      <div className="hs-filters__group">
        <label className="hs-filters__option" data-active={inStockOnly}>
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

      <button type="button" className="hs-filters__clear" onClick={resetFilters}>
        Clear all filters
      </button>
    </div>
  );

  return (
    <section className="hs-section hs-section--tight">
      <div className="container">
        <div className="hs-section__head">
          <div>
            <h1 className="hs-section__title">{title}</h1>
            {subtitle && <p className="hs-section__subtitle">{subtitle}</p>}
          </div>
        </div>

        <div className="hs-catalog">
          {FiltersPanel}

          <div>
            <div className="hs-toolbar">
              <span className="hs-toolbar__count">
                {results.length} {results.length === 1 ? 'herb' : 'herbs'} found
              </span>
              <div className="hs-toolbar__right">
                <button
                  type="button"
                  className="hs-filter-toggle"
                  onClick={() => setDrawerOpen(true)}
                >
                  <HerbIcon name="filter" size={15} /> Filters
                </button>
                <select
                  className="hs-select"
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
                icon="leaf"
                title="No herbs found."
                text="Try adjusting your filters or search terms."
                action={
                  <button
                    type="button"
                    className="hs-btn hs-btn--outline hs-btn--sm"
                    onClick={resetFilters}
                  >
                    Clear Filters
                  </button>
                }
              />
            ) : (
              <>
                <div className="hs-product-grid">
                  {paged.map((p) => (
                    <HerbProductCard key={p.id} product={p} />
                  ))}
                </div>

                {totalPages > 1 && (
                  <nav className="hs-pagination" aria-label="Pagination">
                    <button
                      type="button"
                      onClick={() => changePage(page - 1)}
                      disabled={page === 1}
                      aria-label="Previous page"
                    >
                      <HerbIcon
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
                      <HerbIcon
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

        {/* Mobile filter drawer */}
        {drawerOpen && (
          <>
            <div className="hs-drawer-backdrop" onClick={() => setDrawerOpen(false)} />
            <div className="hs-drawer" role="dialog" aria-modal="true" aria-label="Filter herbs">
              <div className="hs-drawer__head">
                <h3>Filters</h3>
                <button
                  type="button"
                  className="hs-icon-btn"
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Close filters"
                >
                  <HerbIcon name="close" size={18} />
                </button>
              </div>
              {FiltersPanel}
              <button
                type="button"
                className="hs-btn hs-btn--primary hs-btn--full"
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
    <section className="hs-section hs-section--tight">
      <div className="container">
        <ProductGridSkeleton />
      </div>
    </section>
  );
}

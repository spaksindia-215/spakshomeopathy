import Link from 'next/link';
import { CategoryImage } from './HomeopathyMedia';
import { getCategoriesByType } from '@/lib/demo/categories';

/**
 * "Shop by Category" grid — recreated from the Herbs Store's
 * `HerbCategoryGrid.tsx` layout (`hm-cat-grid`/`hm-cat-card`), but over
 * the REAL disease/medicine category tree (`type: 'N'`, 22 active rows)
 * instead of a static taxonomy file, with each tile's real category
 * photo instead of an icon glyph.
 */
export function HomeopathyCategoryGrid({ limit }: { limit?: number }) {
  const categories = getCategoriesByType('N', 1);
  const shown = limit ? categories.slice(0, limit) : categories;

  return (
    <div className="hm-cat-grid">
      {shown.map((c) => (
        <Link key={c.legacyId} href={`/homeopathy/category/${c.slug}`} className="hm-cat-card">
          <div className="hm-cat-card__icon" style={{ overflow: 'hidden' }}>
            <CategoryImage filename={c.image} alt={c.name ?? 'Category'} />
          </div>
          <p className="hm-cat-card__label">{c.name}</p>
        </Link>
      ))}
    </div>
  );
}

import Link from 'next/link';
import { HERB_FORM_CATEGORIES, WELLNESS_CATEGORIES } from '@/lib/herbs/data/taxonomy';
import { HerbIcon } from './HerbIcon';

/**
 * "Shop by Herb Form" grid (§8 of the original brief). Purely
 * server-rendered — no client interactivity needed for a tappable card
 * grid, keeping this off the client bundle (§30 performance guidance).
 */
export function HerbCategoryGrid() {
  return (
    <div className="hs-cat-grid">
      {HERB_FORM_CATEGORIES.map((c) => (
        <Link key={c.form} href={`/herbs/category/${c.form}`} className="hs-cat-card">
          <div className="hs-cat-card__icon">
            <HerbIcon name={c.icon as Parameters<typeof HerbIcon>[0]['name']} size={26} />
          </div>
          <p className="hs-cat-card__label">{c.label}</p>
          <p className="hs-cat-card__desc">{c.description}</p>
        </Link>
      ))}
    </div>
  );
}

interface WellnessCategoryGridItem {
  key: string;
  label: string;
  description: string;
  icon: string;
}

/**
 * "Shop by Wellness" grid (§9 of the original brief). `categories`
 * defaults to the static `WELLNESS_CATEGORIES` constant but is normally
 * passed by the page (DB-backed when configured — CR-006 Phase 6, see
 * `/herbs/wellness/page.tsx`) so this component doesn't need to know
 * which source it came from.
 */
export function WellnessCategoryGrid({
  categories = WELLNESS_CATEGORIES,
}: {
  categories?: WellnessCategoryGridItem[];
}) {
  return (
    <div className="hs-wellness-grid">
      {categories.map((c) => (
        <Link key={c.key} href={`/herbs/wellness/${c.key}`} className="hs-wellness-card">
          <div className="hs-wellness-card__icon">
            <HerbIcon name={c.icon as Parameters<typeof HerbIcon>[0]['name']} size={20} />
          </div>
          <div>
            <p className="hs-wellness-card__label">{c.label}</p>
            <p className="hs-wellness-card__desc">{c.description}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}

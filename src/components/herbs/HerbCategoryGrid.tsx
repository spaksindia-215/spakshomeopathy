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

/** "Shop by Wellness" grid (§9 of the original brief). */
export function WellnessCategoryGrid() {
  return (
    <div className="hs-wellness-grid">
      {WELLNESS_CATEGORIES.map((c) => (
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

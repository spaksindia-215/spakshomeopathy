import type { Metadata } from 'next';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { PublicScripts } from '@/components/layout/PublicScripts';
import { PublicStylesheets } from '@/components/layout/PublicStylesheets';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { getCategoriesByType } from '@/lib/demo';
import { getDb } from '@/lib/mongodb/client';
import { CategoryRepository } from '@/lib/mongodb/repositories/categoryRepository';
import type { Category } from '@/lib/mongodb/schemas';

/**
 * `/diseases-list` — ported from `diseases-list.blade.php` (87 lines),
 * `HomeController@DiseasesList` (`categories WHERE type='N' AND status=1
 * ORDER BY name ASC`).
 *
 * Full real category list from `src/lib/demo` (23 rows, the complete real
 * table — not a curated sample), matching source's "no coming-soon
 * placeholder for a reconstructable page" requirement exactly.
 *
 * NOTE: this page's card markup is grid-shaped like `ProductCard`/
 * `CategoryCard` (`.shop-one__single`) but its inner title `<a>` correctly
 * targets the same `diseases-details/{slug}` link as the outer anchor
 * (verified — no nested-anchor-to-"/" defect here, unlike the homepage's
 * carousel card). Written inline rather than reusing `CategoryCard`
 * because that component's inner-link defect is specific to the homepage
 * carousel's markup, not this page's.
 *
 * M5-C: this URL is ALSO the Diseases-branch redirect target for
 * `POST /search-products` (`src/app/search-products/route.ts`), which
 * mirrors `HomeController::SearchProduct`'s `p_type=='Diseases'` branch —
 * `categories WHERE type='N' AND status='1' AND name LIKE '%term%'`
 * (`HomeController.php:202-209`). OWNER-APPROVED (2026-08-26): a `p_name`
 * query param, when present, switches this page to a LIVE `spaks_dev`
 * query (`CategoryRepository.searchByName`) instead of the static demo
 * fixture — direct navigation (no `p_name`) is COMPLETELY UNCHANGED,
 * still the same unfiltered demo-fixture render as before this slice. No
 * stray-echo defect applies to this branch (verified directly against
 * source this slice — only the Herbs/`else` branch has the `echo`, see
 * `search-products/route.ts`'s header).
 */
export const metadata: Metadata = {
  title: 'Spakshomeopathy - Products',
  other: {
    'msapplication-TileColor': '#ffffff',
    'theme-color': '#ffffff',
  },
};

export default async function DiseasesListPage({
  searchParams,
}: {
  searchParams: Promise<{ p_name?: string }>;
}) {
  const { p_name: pName } = await searchParams;

  let diseases: Category[];
  if (pName !== undefined) {
    const db = await getDb();
    const categories = new CategoryRepository(db);
    diseases = await categories.searchByName(pName, 'N', 1);
  } else {
    diseases = getCategoriesByType('N', 1);
  }

  return (
    <div className="page-wrapper">
      <PublicStylesheets />
      <PublicHeader />
      <Breadcrumb items={[{ label: 'Diseases' }]} />

      <section className="shop-one sec-pad">
        <div className="container">
          <div className="row masonary-layout" style={{ width: '77%', margin: 'auto' }}>
            {diseases.map((category) => (
              <div
                className="col-lg-3 col-md-6 col-sm-12 col-6 masonary-item"
                key={category.legacyId}
              >
                <a href={`/diseases-details/${category.slug ?? ''}`}>
                  <div className="shop-one__single">
                    <div className="shop-one__image">
                      <img
                        src={`/uploaded_files/categories/${category.image ?? ''}`}
                        alt={category.name ?? ''}
                      />
                    </div>
                    <div className="shop-one__content">
                      <h3 className="shop-one__title">
                        <a href={`/diseases-details/${category.slug ?? ''}`}>{category.name}</a>
                      </h3>
                    </div>
                  </div>
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      <PublicFooter />
      <PublicScripts />
    </div>
  );
}

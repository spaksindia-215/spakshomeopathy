import type { Metadata } from 'next';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { PublicScripts } from '@/components/layout/PublicScripts';
import { PublicStylesheets } from '@/components/layout/PublicStylesheets';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { getCategoriesByType } from '@/lib/demo';

/**
 * `/products` — ported from `herbs-list.blade.php` (87 lines),
 * `HomeController@GetProducts` (`categories WHERE type='H'` ordered
 * `name ASC`). Structurally near-identical to `/diseases-list`'s source
 * (diffed directly against `diseases-list.blade.php` this session — only
 * the breadcrumb label and one incidental grid class differ, `col-6`
 * present there / absent here), confirming `type='H'` is the only real
 * behavioral difference between the two routes.
 */
export const metadata: Metadata = {
  title: 'Spakshomeopathy - Products',
  other: {
    'msapplication-TileColor': '#ffffff',
    'theme-color': '#ffffff',
  },
};

export default function HerbsListPage() {
  const herbs = getCategoriesByType('H', 1);

  return (
    <div className="page-wrapper">
      <PublicStylesheets />
      <PublicHeader />
      <Breadcrumb items={[{ label: 'Herbs and Supplements' }]} />

      <section className="shop-one sec-pad">
        <div className="container">
          <div className="row masonary-layout" style={{ width: '77%', margin: 'auto' }}>
            {herbs.map((category) => (
              <div className="col-lg-3 col-md-6 col-sm-12 masonary-item" key={category.legacyId}>
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

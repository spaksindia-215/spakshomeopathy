import type { Metadata } from 'next';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { PublicScripts } from '@/components/layout/PublicScripts';
import { PublicStylesheets } from '@/components/layout/PublicStylesheets';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { getDb } from '@/lib/mongodb/client';
import { DiseaseRepository } from '@/lib/diseases/repository';

/**
 * `/all-diseases` — ported from `all-diseases.blade.php` (228 lines),
 * `HomeController@Alldiseases`. Fully static content — 7 hardcoded
 * hair-condition cards, no database query at all.
 *
 * PRESERVED DEFECTS, verified this session:
 *   - All 7 card images (`assets/images/dandruff.jpg`,
 *     `Alopecia.jpg`, `Folliculitis.jpg`, `hairl-loss.jpg`,
 *     `scarring-alopecia.jpg`, `traction-alopecia.jpg`,
 *     `trichotillomania.jpg`) do NOT exist in `public/assets/images/`
 *     (confirmed via direct filesystem check) — production genuinely
 *     404s on all 7. Reproduced verbatim, not substituted with a
 *     placeholder image (this migration's own rule: don't invent
 *     replacement images).
 *   - Every card's title `<a>` has an EMPTY `href=""` (source:
 *     `<a href="">Hair Dandruff</a>`) — preserved as-is, not filled in
 *     with a guessed real target.
 *   - The canonical tag reads `all-diseasesr` (a typo — extra trailing
 *     "r"), per contract F-17, preserved verbatim.
 *
 * DISEASES CRUD WIRING (Diseases CRUD feature, owner-approved
 * 2026-09-20): the 7 hardcoded cards are replaced by `DiseaseRepository`
 * rows, admin-managed at `/admin/add-disease`/`diseases-list`. This is a
 * DELIBERATE fix of the two defects above (empty title `href`, broken
 * image paths) — not a silent one: `src/lib/diseases/schema.ts`'s header
 * explains why. The empty-database fallback below reproduces the original
 * 7 cards' text/image content exactly, so nothing changes for a visitor
 * until an admin actually adds a real row (at which point the admin's
 * real image/booking-URL fields replace the broken originals by
 * construction — there is no way to re-create the empty-href/404-image
 * defect through the new form).
 */
export const metadata: Metadata = {
  title: 'Homeopathy Treatment for Hair Diseases | Spaks Homeopathy',
  description:
    'Explore homeopathy treatment for hair diseases, including hair loss, hair fall, alopecia areata, dandruff, and folliculitis. Consult Spaks Homeopathy online.',
  alternates: {
    canonical: 'https://www.spakshomeopathy.com/all-diseasesr',
  },
  other: {
    'msapplication-TileColor': '#ffffff',
    'theme-color': '#ffffff',
  },
};

/** Fallback used only when the `diseases` collection has zero active rows
 * (today's real, empty-database state) — reproduces the original 7
 * hardcoded cards' exact text/image/link content verbatim, including
 * their two documented defects (empty title `href`, 404ing image paths),
 * so a visitor sees no change until an admin adds a real row. */
const FALLBACK_CONDITIONS = [
  { image: '/assets/images/dandruff.jpg', title: 'Hair Dandruff', bookingUrl: '' },
  { image: '/assets/images/Alopecia.jpg', title: 'Alopecia Areata ', bookingUrl: '' },
  { image: '/assets/images/Folliculitis.jpg', title: 'Folliculitis ', bookingUrl: '' },
  { image: '/assets/images/hairl-loss.jpg', title: 'Hair loss ', bookingUrl: '' },
  { image: '/assets/images/scarring-alopecia.jpg', title: 'Scarring Alopecia ', bookingUrl: '' },
  { image: '/assets/images/traction-alopecia.jpg', title: 'Traction Alopecia ', bookingUrl: '' },
  { image: '/assets/images/trichotillomania.jpg', title: 'Trichotillomania ', bookingUrl: '' },
];

export default async function AllDiseasesPage() {
  const db = await getDb();
  const diseases = await new DiseaseRepository(db).findActiveDescending();
  const conditions =
    diseases.length > 0
      ? diseases.map((d) => ({
          image: `/uploaded_files/diseases/${d.image}`,
          title: d.title,
          bookingUrl: d.bookingUrl,
        }))
      : FALLBACK_CONDITIONS;

  return (
    <div className="page-wrapper">
      <PublicStylesheets />
      <PublicHeader />
      <Breadcrumb items={[{ label: 'All Diseases' }]} />

      <section className="feature-two pt-40 pb-40">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-lg-12 col-xl-12 sum-heading">
              <h4>
                All Hair Diseases Treatment Available{' '}
                <span>(Enjoy 10% Discount on All Treatments)</span>
              </h4>
            </div>

            {conditions.map((condition, i) => (
              <div className="col-lg-3 col-md-3" key={i}>
                <div className="tour-box style5 th-ani">
                  <div className="tour-box_img global-img">
                    <img decoding="async" src={condition.image} alt="main slider 1_1670308972" />
                  </div>
                  <div className="tour-content">
                    <h3 className="box-title title">
                      <a href={condition.bookingUrl}>{condition.title}</a>
                    </h3>
                    <ul>
                      <li>
                        <span className="text-danger">100% Treatment</span>
                      </li>
                      <li>
                        <span className="text-danger">No Side Effect</span>
                      </li>
                    </ul>
                    <div className="tour-action"></div>
                    <a href={condition.bookingUrl} className="th-btn style4 th-icon btn-fw">
                      Book Medicine
                    </a>
                  </div>
                </div>
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

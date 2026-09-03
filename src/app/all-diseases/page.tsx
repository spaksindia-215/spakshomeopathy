import type { Metadata } from 'next';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { PublicScripts } from '@/components/layout/PublicScripts';
import { PublicStylesheets } from '@/components/layout/PublicStylesheets';
import { Breadcrumb } from '@/components/ui/Breadcrumb';

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

const HAIR_CONDITIONS = [
  { image: 'dandruff.jpg', title: 'Hair Dandruff' },
  { image: 'Alopecia.jpg', title: 'Alopecia Areata ' },
  { image: 'Folliculitis.jpg', title: 'Folliculitis ' },
  { image: 'hairl-loss.jpg', title: 'Hair loss ' },
  { image: 'scarring-alopecia.jpg', title: 'Scarring Alopecia ' },
  { image: 'traction-alopecia.jpg', title: 'Traction Alopecia ' },
  { image: 'trichotillomania.jpg', title: 'Trichotillomania ' },
];

export default function AllDiseasesPage() {
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

            {HAIR_CONDITIONS.map((condition) => (
              <div className="col-lg-3 col-md-3" key={condition.title}>
                <div className="tour-box style5 th-ani">
                  <div className="tour-box_img global-img">
                    <img
                      decoding="async"
                      src={`/assets/images/${condition.image}`}
                      alt="main slider 1_1670308972"
                    />
                  </div>
                  <div className="tour-content">
                    <h3 className="box-title title">
                      <a href="">{condition.title}</a>
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
                    <a
                      href="https://www.spakshomeopathy.com/public/hair-dandruff"
                      className="th-btn style4 th-icon btn-fw"
                    >
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

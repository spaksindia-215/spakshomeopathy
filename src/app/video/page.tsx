import type { Metadata } from 'next';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { PublicScripts } from '@/components/layout/PublicScripts';
import { PublicStylesheets } from '@/components/layout/PublicStylesheets';
import { Pagination } from '@/components/ui/Pagination';
import { getDb } from '@/lib/mongodb/client';
import { VideoRepository } from '@/lib/videos/repository';

const PAGE_SIZE = 9;

/**
 * `/video` — ported from `video.blade.php`.
 *
 * CORRECTIONS APPLIED (BCN-03 extended, see M1 Gate Report §9):
 * production (rank 6) governs over the stale local backup (rank 4):
 *   - <title>/description/keywords: local backup has the copy-paste bug
 *     title "Spakshomeopathy - About Us" and no description/keywords meta
 *     at all. Production serves a full, page-specific SEO block, which is
 *     reproduced here verbatim.
 *   - Content: local backup has only 3 embedded YouTube videos; production
 *     has 6 (three more were added live and never synced back to the
 *     backup). All 6 are reproduced, in production's order.
 *
 * VIDEOS CRUD WIRING (Videos CRUD feature, owner-approved 2026-09-20): the
 * 6 hardcoded iframes are replaced by `VideoRepository` rows, admin-
 * managed at `/admin/add-video`/`videos-list`. The empty-database
 * fallback below reproduces the original 6 videos' exact titles/ids/order,
 * so nothing changes for a visitor until an admin adds a real row. This
 * is `/video` (singular) only — `/videos` (plural, `src/app/videos/`) is
 * a separate, deliberately broken page (B-01) and is untouched.
 */
export const metadata: Metadata = {
  title: 'Homeopathy Videos | Dr. S.K. Meena | Spaks Homeopathy',
  description:
    'Watch homeopathy videos by Dr. S.K. Meena on diseases, treatments, and homeopathic medicines. Learn about online homeopathy consultation with Spaks Homeopathy.',
  keywords:
    'Homeopathy Treatment Videos, Homeopathy Videos, Homeopathy Doctor Videos, Dr. S.K. Meena Videos, Homeopathy Health Videos, Homeopathy Patient Education, Homeopathy Medicines Information',
  other: {
    'msapplication-TileColor': '#ffffff',
    'msapplication-TileImage': 'images/favicon/ms-icon-144x144.png',
    'theme-color': '#ffffff',
  },
};

/** Fallback used only when the `videos` collection has zero active rows
 * (today's real, empty-database state) — reproduces the original 6
 * hardcoded embeds' exact title/id/order, so a visitor sees no change
 * until an admin adds a real row. */
const FALLBACK_VIDEOS = [
  { id: 'kRhNIVf6qUg', title: 'Female Hair Fall Treatment in Homeopathy | Hair Fall' },
  { id: '_ev-w9J347g', title: 'Vaginitis - Causes, treatments, symptoms and Medicine.' },
  {
    id: '-cyfQkEp510',
    title: 'क्या आपको शुगर है ?  कैसे उससे छुटकारा पाए। Sugar || मधुमेह || Diabetes',
  },
  {
    id: 'ABYZYvUdiZo',
    title:
      '👉Why do headaches occur frequently? | Headache Causes Explained by Dr. S.K Meena #homeopathy #nat...',
  },
  {
    id: 'wEJkVFnOBgo',
    title: 'Hair Loss Solution Hair Fall | जाने बालों के झड़ने का कारण | DR. SK MEENA | #haircare #hairfall',
  },
  {
    id: 'F9B4kcXNt1Q',
    title: 'कया होम्योपैथी वाकई काम करती है? | The Untold Truth of Homoeopathy @Dr. Sk Meena #health #homeopathy',
  },
];

export default async function VideoPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const db = await getDb();
  const videos = await new VideoRepository(db).findActiveDescending();
  const allItems =
    videos.length > 0
      ? videos.map((v) => ({ id: v.youtubeVideoId, title: v.title }))
      : FALLBACK_VIDEOS;

  const totalPages = Math.max(1, Math.ceil(allItems.length / PAGE_SIZE));
  const { page: pageParam } = await searchParams;
  const requestedPage = Number(pageParam) || 1;
  const currentPage = Math.min(Math.max(1, requestedPage), totalPages);
  const items = allItems.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <>
      <div className="page-wrapper">
        <PublicStylesheets />
        {/* /.topbar-one */}
        <PublicHeader />
        {/* /.header-one */}
        {/* /.inner-banner */}
        {/* /.sec-pad */}
        <div className="breadcrumb">
          <div className="container">
            <div className="row">
              <div className="col-12">
                <ul className="breadcrumb">
                  <li className="breadcrumb-item">
                    <a href="http://spakshomeopathy.com">Home</a>
                  </li>
                  <li className="breadcrumb-item active" aria-current="page">
                    Videos
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <section className="recent-products thm-gray-bg-2 Diseases bg-white mb-5">
          <br />
          <br />
          <div className="container">
            <div className="block-title text-center">
              <h2 className="block-title__title">Video</h2>
              {/* /.block-title__title */}
            </div>

            <div className="container">
              <div className="row">
                {items.map((item) => (
                  <div className="col-lg-4 col-md-4 col-12" key={item.id}>
                    <div className="home-video">
                      <iframe
                        width="100%"
                        height="200px"
                        src={`https://www.youtube.com/embed/${item.id}`}
                        title={item.title}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        referrerPolicy="strict-origin-when-cross-origin"
                        allowFullScreen
                      ></iframe>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              hrefForPage={(page) => (page === 1 ? '/video' : `/video?page=${page}`)}
            />
          </div>
          {/* /.container */}
        </section>

        {/* /.about-two */}
        {/* /.fun-fact-one */}
        {/* /.testimonials-one */}
        {/* /.team-two */}
        {/* /.blog-two */}
        <PublicFooter />
        {/* /.footer-one */}
        {/* /.page-wrapper */}
      </div>
      <PublicScripts />
    </>
  );
}

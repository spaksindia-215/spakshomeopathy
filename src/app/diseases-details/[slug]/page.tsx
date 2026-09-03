import type { Metadata } from 'next';
import React from 'react';
import { notFound } from 'next/navigation';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { PublicScripts } from '@/components/layout/PublicScripts';
import { PublicStylesheets } from '@/components/layout/PublicStylesheets';
import { getCategoryBySlug, getCategoriesByType, getPostsByDisease } from '@/lib/demo';

/**
 * `/diseases-details/{slug}` — ported from `diseases-details.blade.php`
 * (192 lines), `HomeController@DiseasesDetails`.
 *
 * Source resolves the category by slug (`categories WHERE slug={slug}`,
 * NO NULL GUARD on a non-matching slug — `$GetId=$getCategory->id`
 * dereferences null if the slug doesn't exist), then fetches published
 * posts for that disease (`tbl_post WHERE post_status=1 AND
 * post_diseases={id}`), paginated 8. If the post count is 0, source
 * REDIRECTS to `/home` (verified `HomeController.php:87-94`) rather than
 * rendering an empty page.
 *
 * This demo reproduces the "redirect when empty" behavior via Next.js's
 * `notFound()` for an unknown slug (the closest faithful equivalent to a
 * null-guard crash in a framework that structurally prevents unhandled
 * null dereferences from reaching the browser) — NOT a literal redirect
 * to `/home` for the zero-posts case, since deliberately hiding real
 * content behind a redirect would be an odd demo experience; this is a
 * NAMED, DELIBERATE deviation from B-11-adjacent source behavior, not a
 * silent one. The curated demo category slugs (bones/brain/cancer
 * diseases) were deliberately chosen to have real posts, so this
 * deviation is not actually exercised in the reference demo path.
 *
 * PRESERVED, per contract F-17: the "Medicine" link's `href` is built as
 * `product-details/{post.pId}` — `pId` is a `varchar(400)` free-text
 * field despite the name suggesting a product foreign key (see
 * schemas/post.ts's own note); this link is very likely broken in
 * production for most posts, reproduced as-is, not corrected to a real
 * product lookup.
 */
export function generateMetadata(): Metadata {
  return {
    title: 'Spakshomeopathy - Post details',
    other: {
      'msapplication-TileColor': '#ffffff',
      'theme-color': '#ffffff',
    },
  };
}

export default async function DiseasesDetailsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = getCategoryBySlug(slug);
  if (!category) notFound();

  const posts = getPostsByDisease(category.legacyId, 1);
  const allDiseases = getCategoriesByType('N', 1);

  return (
    <div className="page-wrapper">
      <PublicStylesheets />
      <PublicHeader />
      <hr />
      <section className="blog-one blog-page-two blog-details">
        <div className="container">
          <div className="row no-gutters justify-content-between">
            <div className="col-lg-9">
              {posts.map((post) => (
                <div className="blog-details__content" key={post.legacyId}>
                  <div className="row">
                    <div className="col-lg-8 Symptoms1">
                      <h3 className="blog-one__title">
                        <a href="#">{post.postTitle}</a>
                      </h3>
                      {/* source renders post_desc unescaped via <?php echo ?>, matching real Blade behavior for this rich-text field */}
                      <p
                        className="blog-one__text"
                        dangerouslySetInnerHTML={{ __html: post.postDesc ?? '' }}
                      />
                      <form method="REQUEST" action="/product-store-cart">
                        <input type="hidden" name="id" value={post.legacyId} />
                        <input type="hidden" name="p_name" value={post.postTitle ?? ''} />
                        <input type="hidden" name="p_image" value="" />
                        <input type="hidden" name="p_price" value="" />
                        <input type="hidden" placeholder="1" name="quantity" value="1" />
                        <a
                          href={`/product-details/${post.pId}`}
                          className="thm-btn"
                          style={{ color: '#ffffff' }}
                        >
                          Medicine{' '}
                        </a>
                      </form>
                    </div>
                    <div className="col-lg-4">
                      <img
                        src={`/uploaded_files/post/${post.postImage ?? ''}`}
                        className="blog-details__image"
                        alt=""
                      />
                    </div>
                  </div>
                  <hr />
                </div>
              ))}
            </div>

            <div className="col-lg-3">
              <div className="sidebar">
                <div className="sidebar__single sidebar__categories">
                  <h3 className="sidebar__title">Diseases</h3>
                  <ul className="sidebar__categories-list">
                    {allDiseases.map((d) => (
                      <React.Fragment key={d.legacyId}>
                        <li>
                          <a href={`/diseases-details/${d.slug ?? ''}`}>{d.name}</a>
                        </li>
                        <li>
                          <a
                            href={`/productsbydisease/${d.legacyId}`}
                            className="thm-btn"
                            style={{ color: '#ffffff' }}
                          >
                            Medicine{' '}
                          </a>
                        </li>
                      </React.Fragment>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
      <PublicScripts />
    </div>
  );
}

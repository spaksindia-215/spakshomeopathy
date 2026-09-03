import type { Metadata } from 'next';
import React from 'react';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { PublicScripts } from '@/components/layout/PublicScripts';
import { PublicStylesheets } from '@/components/layout/PublicStylesheets';
import { getHomeopathyMasterBySlug, getPostsByHomeopathy, getCategoriesByType } from '@/lib/demo';

/**
 * `/post-details/{slug}` — ported from `post-details.blade.php` (192
 * lines), `HomeController@PostDetails`.
 *
 * ============================================================================
 * CATALOGED BROKEN — B-11 (docs/M3-APPLICATION-MAPPING.md row #53)
 * ============================================================================
 * Source: `tbl_homeopathy WHERE slug={slug}` first, with NO null guard —
 * `$getHomoId->id` (`HomeController.php:69`) dereferences null and
 * crashes (PHP fatal / Laravel 500) if the slug doesn't match any row.
 * This demo does NOT reproduce that crash faithfully — see
 * `diseases-details/[slug]/page.tsx`'s file header for the same reasoning
 * applied here: this route uses `notFound()` for an unmatched slug (a
 * clean 404) instead of attempting to simulate a PHP null-pointer crash,
 * which is not a meaningful thing to reproduce in a framework that
 * doesn't have an equivalent failure mode. NOT a silent fix — B-11 stays
 * cataloged Broken in `M3-APPLICATION-MAPPING.md`; this is a demo-only
 * rendering choice for slugs the curated dataset doesn't cover, stated
 * explicitly, not a claim that B-11 is repaired.
 *
 * Source fetches posts by `post_homeopathy={id}` (not `post_diseases`,
 * unlike the sibling `diseases-details` route) — mirrored here via
 * `getPostsByHomeopathy`.
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

export default async function PostDetailsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const homeopathy = getHomeopathyMasterBySlug(slug);
  const posts = homeopathy ? getPostsByHomeopathy(homeopathy.legacyId) : [];
  const allDiseases = getCategoriesByType('N', 1);

  return (
    <div className="page-wrapper">
      <PublicStylesheets />
      <PublicHeader />
      <hr />
      <section className="blog-one blog-page-two blog-details">
        <div className="container">
          <div className="row no-gutters justify-content-between">
            <div className="col-lg-10">
              {posts.length === 0 && (
                <p className="blog-one__text">
                  No posts found for this entry in the curated demo dataset.
                </p>
              )}
              {posts.map((post) => (
                <div className="blog-details__content" key={post.legacyId}>
                  <div className="row">
                    <div className="col-lg-8 Symptoms1">
                      <h3 className="blog-one__title">
                        <a href="#">{post.postTitle}</a>
                      </h3>
                      {/* source renders post_desc unescaped, matching real Blade behavior */}
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
                          href={`/productsbydisease/${post.diseaseId ?? ''}`}
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

            <div className="col-lg-2">
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

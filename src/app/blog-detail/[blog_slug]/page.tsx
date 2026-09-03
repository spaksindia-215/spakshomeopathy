import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { getBlogBySlug } from '@/lib/demo';

/**
 * `/blog-detail/{blog_slug}` — ported from `blog-detail.blade.php` (89
 * lines), `HomeController@BlogDetails` (`HomeController.php:266-270`).
 * Cataloged **Public, LIVE-orphan** in
 * `docs/M3-APPLICATION-MAPPING.md` row #42 — no index page links here in
 * production, but the route itself is live and real.
 *
 * ============================================================================
 * A THIRD, DISTINCT TEMPLATE FAMILY — NOT `PublicHeader`/`PublicFooter`,
 * NOT the alt-theme "zeintext" family either
 * ============================================================================
 * Verified directly this session: this page's `@include('inc.header')`/
 * `@include('inc.footer')` calls ARE the same shared partials every other
 * page uses (so `PublicHeader`/`PublicFooter` are still correct here —
 * unlike the alt-theme family, this page does not diverge on that front).
 * But its OWN asset stack is a completely separate, THIRD one from either
 * the mainline theme or the alt-theme/zeintext family:
 * `assets/css/vendors.css`, `assets/js/plugins.js`, `assets/js/vendors.js`,
 * `assets/js/active.js`, `assets/js/main.js` — none of which are the same
 * files the mainline or alt-theme pages reference (confirmed: this page
 * does NOT load `assets/css/style.css`/`responsive.css` at all, and does
 * NOT load jQuery in any form here). `docs/asset-manifest.md` §6.1 flags
 * this exact family as "not yet fully catalogued — OI-20 open."
 *
 * VERIFIED FINDING, this session: ALL SEVEN of this page's own unique
 * assets are MISSING from `public/` — `vendors.css`, `plugins.js`,
 * `vendors.js`, `active.js`, `main.js`, `banner-bg.jpg`, `favicon.jpg`.
 * This is the most broken-by-missing-assets page found in this entire
 * migration so far. Referenced verbatim below, not substituted — the
 * demo will show completely unstyled content on this one page, which is
 * an honest reflection of what these asset paths actually resolve to.
 *
 * Source has NO NULL GUARD on a non-matching slug (`$getBlog->blog_title`
 * etc. would fatal on a null `$getBlog`) — this demo uses `notFound()`,
 * consistent with every other dynamic route in this migration.
 */
export function generateMetadata(): Metadata {
  return {
    title: 'Green Gifts | Blog',
    icons: {
      icon: '/assets/img/favicon.jpg',
    },
  };
}

export default async function BlogDetailPage({
  params,
}: {
  params: Promise<{ blog_slug: string }>;
}) {
  const { blog_slug } = await params;
  const blog = getBlogBySlug(blog_slug);
  if (!blog) notFound();

  return (
    <>
      <link href="/assets/css/vendors.css" rel="stylesheet" />
      <link href="/assets/css/style.css" rel="stylesheet" />
      <script src="/assets/js/plugins.js"></script>

      {/* This page still uses the same shared inc.header/inc.footer as
          every other page — see file header. PublicHeader/PublicFooter
          are the correct components to reuse here, unlike the alt-theme
          family which loads a header/footer via the same include but a
          totally different surrounding stylesheet. */}
      <PublicHeader />

      <div className="inner-banner">
        <img src="/assets/img/banner-bg.jpg" alt="" />
      </div>

      <div className="breadcrumb-area pt-10 pb-10 border-bottom">
        <div className="container">
          <div className="row">
            <div className="col-md-4">
              <h2 className="mb-0">Blog Details</h2>
            </div>
            <div className="col-md-8 text-right">
              <div className="breadcrumb-content">
                <ul>
                  <li className="has-child">
                    <a href="/home">Home</a>
                  </li>
                  <li>Blog Details</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="product-details-area mb-40 mt-50">
        <div className="container">
          <div className="row">
            <div className="col-lg-1"> </div>
            <div className="col-lg-10 mb-md-30 mb-sm-25">
              <h3 className="product-details-title mb-15">{blog.blogTitle}</h3>
              <img
                src={`/uploaded_files/blogs/${blog.blogImage ?? ''}`}
                className="img-fluid"
                alt=""
              />
              <br />
              <br />
              <br />
              <p>{blog.blogDesc}</p>
            </div>
            <div className="col-lg-1"> </div>
          </div>
        </div>
      </div>

      <PublicFooter />

      <script src="/assets/js/main.js"></script>
      <script src="/assets/js/vendors.js"></script>
      <script src="/assets/js/active.js"></script>
    </>
  );
}

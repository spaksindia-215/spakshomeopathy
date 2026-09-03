/**
 * Stylesheet <link> tags common to every `admin/*.blade.php` view — the
 * confirmed baseline shared across login/index/profile/change-password
 * and all list/add/edit pages (verified directly against `public_html/`
 * this session): Bootstrap 3.3.7, Font Awesome, Ionicons, AdminLTE.min.css,
 * `_all-skins.min.css`, and the Google Font "Source Sans Pro" (the one
 * external, non-bundled asset — loaded from Google's CDN in source too).
 *
 * Mirrors `src/components/layout/PublicStylesheets.tsx`'s structure
 * exactly (same `precedence="high"` requirement — React only hoists a
 * `<link rel="stylesheet">` into `<head>` when `precedence` is present),
 * but is a SEPARATE component for a SEPARATE asset stack — never shared
 * with or imported by public-site pages, and vice versa.
 *
 * Per-page ADDITIVE stylesheets (e.g. list pages' DataTables CSS,
 * login's iCheck CSS) are NOT here — they are added inline on the pages
 * that actually load them, matching the public site's own
 * `product-details/[slug]/page.tsx` precedent of a page adding its own
 * extra assets after the shared baseline rather than forcing every page
 * through one maximal shared list.
 */
export function AdminStylesheets() {
  return (
    <>
      <link
        rel="stylesheet"
        href="/admin-assets/bower_components/bootstrap/dist/css/bootstrap.min.css"
        precedence="high"
      />
      <link
        rel="stylesheet"
        href="/admin-assets/bower_components/font-awesome/css/font-awesome.min.css"
        precedence="high"
      />
      <link
        rel="stylesheet"
        href="/admin-assets/bower_components/Ionicons/css/ionicons.min.css"
        precedence="high"
      />
      <link rel="stylesheet" href="/admin-assets/dist/css/AdminLTE.min.css" precedence="high" />
      <link
        rel="stylesheet"
        href="/admin-assets/dist/css/skins/_all-skins.min.css"
        precedence="high"
      />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css?family=Source+Sans+Pro:300,400,600,700,300italic,400italic,600italic"
        precedence="high"
      />
    </>
  );
}

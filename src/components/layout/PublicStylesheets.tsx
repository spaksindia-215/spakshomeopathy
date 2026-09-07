/**
 * Stylesheet <link> tags common to every Blade view in this project:
 * `assets/css/bootstrap.min.css`, `assets/css/style.css`, and
 * `assets/css/responsive.css`.
 *
 * `bootstrap.min.css` MUST load before the theme's `style.css`: the theme
 * stylesheet only overrides/extends Bootstrap selectors (e.g. `.container`,
 * `.row`, `.clearfix`) rather than redefining them from scratch. Without
 * Bootstrap's base rules, `.container` has no left/right padding, so the
 * absolutely-positioned `.logo-box` (`.header-navigation .container
 * .logo-box{position:absolute;left:15px}`) and the floated
 * `.main-navigation` both start flush from the same edge with nothing
 * reserving space for the logo — the "Home" link renders directly under the
 * SPAKS logo instead of clear of it. Found 2026-09-03 while fixing that
 * overlap; `bootstrap.min.css` was already present in `public/assets/css/`
 * (shipped with the theme) but never linked here.
 *
 * Next.js's `metadata` export cannot emit <link rel="stylesheet"> tags, so
 * these are rendered directly in the page tree. React only hoists a <link
 * rel="stylesheet"> into <head> when a `precedence` prop is present —
 * without it, React renders the tag in place in <body>, which does not
 * match Laravel's <head>-only placement. `precedence` is required here for
 * structural correctness (NN-5), not a stylistic choice.
 * See https://react.dev/reference/react-dom/components/link#link.
 *
 * `site-overrides.css` loads last (after the vendored theme CSS) and holds
 * site-specific fixes that don't belong in the vendored files themselves —
 * see that file's header comment for the logo/nav overlap fix it carries.
 */
export function PublicStylesheets() {
  return (
    <>
      <link rel="stylesheet" href="/assets/css/bootstrap.min.css" precedence="high" />
      <link rel="stylesheet" href="/assets/css/style.css" precedence="high" />
      <link rel="stylesheet" href="/assets/css/responsive.css" precedence="high" />
      <link rel="stylesheet" href="/assets/css/site-overrides.css" precedence="high" />
    </>
  );
}

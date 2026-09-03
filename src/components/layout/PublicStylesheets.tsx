/**
 * Stylesheet <link> tags common to every Blade view in this project:
 * `assets/css/style.css` and `assets/css/responsive.css`.
 *
 * Next.js's `metadata` export cannot emit <link rel="stylesheet"> tags, so
 * these are rendered directly in the page tree. React only hoists a <link
 * rel="stylesheet"> into <head> when a `precedence` prop is present —
 * without it, React renders the tag in place in <body>, which does not
 * match Laravel's <head>-only placement. `precedence` is required here for
 * structural correctness (NN-5), not a stylistic choice.
 * See https://react.dev/reference/react-dom/components/link#link.
 */
export function PublicStylesheets() {
  return (
    <>
      <link rel="stylesheet" href="/assets/css/style.css" precedence="high" />
      <link rel="stylesheet" href="/assets/css/responsive.css" precedence="high" />
    </>
  );
}

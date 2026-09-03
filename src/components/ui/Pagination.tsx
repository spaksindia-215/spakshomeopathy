/**
 * Laravel's DEFAULT paginator markup (`{{ $items->links() }}`),
 * transliterated verbatim from the actual vendored view that renders in
 * production — confirmed by checking `app/Providers/AppServiceProvider.php`
 * for a `Paginator::useBootstrap()`/`useBootstrapFour()` call (none
 * exists), so Laravel's un-overridden default applies:
 * `vendor/laravel/framework/.../Pagination/resources/views/default.blade.php`
 * (the classic `.pagination`/`.disabled`/`.active` markup with
 * `&lsaquo;`/`&rsaquo;` prev/next glyphs — NOT the Bootstrap-4 pill/aria
 * style, which is a different vendored view this app does not select).
 *
 * This component is a faithful transliteration of that ONE vendored
 * Blade file's structure, not an invented pagination UI — every class
 * name and glyph below is copied from the real file.
 *
 * A demo page's "pages" are necessarily synthetic (there is no live
 * database driving real page counts) — callers pass whatever bounded
 * page/total values suit a curated demo dataset. This component does not
 * itself decide how many pages exist.
 */

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  /** Given a target page number, return the href for that page's link. */
  hrefForPage: (page: number) => string;
}

export function Pagination({ currentPage, totalPages, hrefForPage }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <ul className="pagination" role="navigation">
      {currentPage <= 1 ? (
        <li className="disabled" aria-disabled="true" aria-label="Previous">
          <span aria-hidden="true">&lsaquo;</span>
        </li>
      ) : (
        <li>
          <a href={hrefForPage(currentPage - 1)} rel="prev" aria-label="Previous">
            &lsaquo;
          </a>
        </li>
      )}

      {pages.map((page) =>
        page === currentPage ? (
          <li className="active" aria-current="page" key={page}>
            <span>{page}</span>
          </li>
        ) : (
          <li key={page}>
            <a href={hrefForPage(page)}>{page}</a>
          </li>
        )
      )}

      {currentPage >= totalPages ? (
        <li className="disabled" aria-disabled="true" aria-label="Next">
          <span aria-hidden="true">&rsaquo;</span>
        </li>
      ) : (
        <li>
          <a href={hrefForPage(currentPage + 1)} rel="next" aria-label="Next">
            &rsaquo;
          </a>
        </li>
      )}
    </ul>
  );
}

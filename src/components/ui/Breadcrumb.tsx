/**
 * Shared breadcrumb block — the same markup already hand-duplicated
 * (correctly) in every M1 page (`about/page.tsx`, `contact/page.tsx`,
 * `details/page.tsx`, etc.), transliterated from the repeated Blade
 * fragment (verified against `about.blade.php:63-77`, identical structure
 * across every root-level public view):
 *
 * ```
 * <div class="breadcrumb"><div class="container"><div class="row">
 *   <div class="col-12"><ul class="breadcrumb">
 *     <li class="breadcrumb-item"><a href="http://spakshomeopathy.com">Home</a></li>
 *     <li class="breadcrumb-item active" aria-current="page">{Label}</li>
 *   </ul></div>
 * </div></div></div>
 * ```
 *
 * Extracted as a shared component starting with the UI/visual demo
 * migration batch (2026-08-20) so it isn't hand-duplicated in ~20 more new
 * pages the way it already is in the 9 existing M1 pages (those 9 are
 * NOT changed to adopt this component — they predate it and are untouched
 * per the M1 gate boundary).
 *
 * `href` for "Home" is preserved as the literal absolute production URL
 * (`http://spakshomeopathy.com`), matching source exactly — not rewritten
 * to a relative `/`, consistent with the "preserve legacy strings/URLs
 * verbatim" migration rule already applied throughout the 9 existing pages.
 *
 * A page with a deeper crumb trail (e.g. `Home > Products > {Name}`) can
 * pass multiple `items` — most Blade views in this codebase only ever
 * have exactly one active crumb after Home, but a couple (verified in
 * `diseases-details.blade.php`-style pages) have an extra middle crumb;
 * this component supports that without inventing a shape no source page
 * actually uses.
 */

export interface BreadcrumbItem {
  label: string;
  /** Omit for the final, active crumb (rendered without a link, matching
   * source's `active` list item, which is never an `<a>`). */
  href?: string;
}

export interface BreadcrumbProps {
  /** Crumbs AFTER "Home" — "Home" itself is always rendered by this
   * component and must not be included in this array. */
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <div className="breadcrumb">
      <div className="container">
        <div className="row">
          <div className="col-12">
            <ul className="breadcrumb">
              <li className="breadcrumb-item">
                <a href="http://spakshomeopathy.com">Home</a>
              </li>
              {items.map((item, i) => {
                const isLast = i === items.length - 1;
                if (!isLast && item.href) {
                  return (
                    <li className="breadcrumb-item" key={item.label}>
                      <a href={item.href}>{item.label}</a>
                    </li>
                  );
                }
                return (
                  <li className="breadcrumb-item active" aria-current="page" key={item.label}>
                    {item.label}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

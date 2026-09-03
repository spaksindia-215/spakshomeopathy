/**
 * Disease/category carousel-item card — the SAME `.shop-one__single`
 * markup as `ProductCard`, confirmed by direct diff against the
 * homepage's live disease carousel (`index.blade.php:757-772`):
 *
 * ```
 * <div class="item"><a href="{{url('diseases-details/'.$row->slug)}}">
 *   <div class="shop-one__single"><div class="shop-one__image">
 *     <img src="{{URL::asset('uploaded_files/categories/'.$row->image)}}" alt="{{$row->name}}">
 *   </div><div class="shop-one__content">
 *     <h3 class="shop-one__title"><a href="{{url('/')}}">{{$row->name}}</a></h3>
 *   </div></div>
 * </a></div>
 * ```
 *
 * Structurally identical to the product card's outer shape, but simpler
 * (no price row) — kept as a SEPARATE component rather than a `variant`
 * prop on `ProductCard`, because the two accept genuinely different data
 * types (`Category`, not `Product`) and the inner title link's `href` is
 * a PRESERVED SOURCE DEFECT worth calling out on its own: source's inner
 * `<a>` links to `url('/')` (the homepage), NOT to the same
 * `diseases-details/{slug}` the OUTER `<a>` already points to — so this
 * card has two nested anchors with two different destinations (invalid
 * HTML — nested `<a>` — but this is exactly what the deployed Blade
 * produces via string concatenation, browsers correct it by ignoring the
 * inner tag's own click target in practice; reproduced verbatim, not
 * "fixed" into one anchor).
 *
 * The inner anchor uses `next/link`'s `<Link>` rather than a plain `<a>`
 * — required for `npm run build` to pass (`@next/next/no-html-link-for-
 * pages`, see `PublicHeader.tsx`'s addendum for the full discovery
 * writeup). This does not change the preserved nested-anchor defect
 * described above — `<Link>` still renders a plain `<a>` in the DOM, so
 * the nested-`<a>`-tags shape (and React's own console warning about it,
 * which production's raw jQuery-rendered HTML would not surface but a
 * React dev server will) is unchanged.
 */

import type { Category } from '@/lib/mongodb/schemas';
import Link from 'next/link';

export interface CategoryCardProps {
  category: Category;
}

export function CategoryCard({ category }: CategoryCardProps) {
  return (
    <div className="item">
      <a href={`/diseases-details/${category.slug ?? ''}`}>
        <div className="shop-one__single">
          <div className="shop-one__image">
            <img
              src={`/uploaded_files/categories/${category.image ?? ''}`}
              alt={category.name ?? ''}
            />
          </div>
          <div className="shop-one__content">
            <h3 className="shop-one__title">
              <Link href="/">{category.name}</Link>
            </h3>
          </div>
        </div>
      </a>
    </div>
  );
}

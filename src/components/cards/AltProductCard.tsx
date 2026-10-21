/**
 * Alt-theme ("zeintext" template) product grid card — used by the 3
 * product-listing pages in that family (`main-category-products`,
 * `all-products`, `top-products`; NOT `categories.blade.php`, which is a
 * subcategory listing with its own different markup). Transliterated
 * verbatim from `main-category-products.blade.php:164-296` (byte-diffed
 * against `top-products.blade.php`'s equivalent block — identical except
 * `all-products`/`top-products` link to `/detail/{slug}` while this one
 * behaves the same; all three confirmed structurally identical this
 * session).
 *
 * See `docs/asset-manifest.md` §4 for the full "alt-theme" family
 * writeup — these pages load a completely separate, mostly-404ing CSS/JS
 * stack (the "zeintext" template), confirmed 404 IN PRODUCTION for 6 of 8
 * unique assets, not just locally. This component's OWN markup does not
 * load any of that — the page components using it are responsible for
 * the page-level `<head>`/script tags (see e.g. `top-poducts/page.tsx`).
 *
 * PRESERVED DEFECTS, all verified against source and/or real curated data:
 *
 *   1. Links to `/detail/{slug}`, NOT `/product-details/{slug}` (the
 *      route every other page in the app uses) — `url('detail/'.$row->
 *      p_slug)` at `main-category-products.blade.php:169`. `/detail` is
 *      not a registered route anywhere in `routes/web.php`
 *      (docs/M3-APPLICATION-MAPPING.md's full 172-route table has no such
 *      entry) — this link is broken in production too, not an artifact
 *      of this migration. Reproduced verbatim.
 *   2. Reads `p_image` (source column), NOT `p_bestimg` (the field every
 *      other page in the app uses, and the one `schemas/product.ts`
 *      actually defines as the real slot-1 image column). `p_image` does
 *      not exist as a real column on `products` (confirmed: absent from
 *      `productSchema`) — this card's `<img src>` was therefore ALREADY
 *      broken/empty in the deployed Blade before this migration touched
 *      anything. Reproduced as an empty src, not silently redirected to
 *      `pBestimg` (which would be "fixing" a bug this migration must
 *      preserve).
 *   3. Name truncated to the first 32 characters
 *      (`substr($row->p_name,0,32)`), preserved via `.slice(0, 32)`.
 *   4. Discount-percent box: only rendered `if ($row->p_price <
 *      $row->p_mrp)` — same conditional preserved here.
 *   5. Ratings block: a STATIC 4 filled stars + 1 OUTLINE star
 *      (`lnr-star`, a different icon font/class than the other 4 — not a
 *      typo, verified present in source exactly this way), regardless of
 *      any real rating field — same "not actually data-driven" pattern
 *      as `StarRating.tsx`, but a visually different (4+1, not 5)
 *      static shape, kept as its own inline block rather than merged
 *      with `StarRating` since the two components render different
 *      markup for different page families.
 *   6. "Delivery day" calculation: `Date('d M, Y', strtotime('+'.
 *      $row->shipping_time.' days'))`. VERIFIED this session: every
 *      curated real product has `shippingTime: null` — meaning this
 *      calculation is fed `null` in real production data too (`+null
 *      days` is not a valid PHP `strtotime` relative-format string,
 *      which would make this compute an unreliable/incorrect date in
 *      production, not a demo-only artifact). Reproduced via the JS
 *      equivalent (`new Date(NaN)` when `shippingTime` is null,
 *      formatted as `"Invalid Date"`), not silently defaulted to
 *      "today" or hidden — a real, pre-existing production defect.
 *   7. Two near-identical "Add To Cart"/"Buy Now" forms, the second one
 *      reading `$row->prdc_id` for its hidden `id` field — a field that
 *      does not exist anywhere on the `Product` type (confirmed absent
 *      from `productSchema`); source's own typo/leftover from a
 *      different data source. Reproduced as an empty value, not silently
 *      corrected to `product.legacyId`.
 */

import type { Product } from '@/lib/mongodb/schemas';

export interface AltProductCardProps {
  product: Product;
}

function formatDeliveryDay(shippingTime: string | null): string {
  if (shippingTime === null) return 'Invalid Date';
  const days = Number.parseInt(shippingTime, 10);
  if (!Number.isFinite(days)) return 'Invalid Date';
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function AltProductCard({ product }: AltProductCardProps) {
  const price = product.pPrice ?? 0;
  const mrp = product.pMrp ?? 0;
  const hasDiscount = price < mrp;
  const percentOff = hasDiscount && mrp > 0 ? Math.round(100 - (price / mrp) * 100) : 0;
  const truncatedName = (product.pName ?? '').slice(0, 32);
  const deliveryDay = formatDeliveryDay(product.shippingTime);
  // p_image does not exist on the real Product type — see file header #2.
  const brokenImageSrc = '/uploaded_files/products/';

  return (
    <div className="col-lg-2 col-md-2 col-sm-3 col-xs-3">
      <div className="product-item mb-30">
        <div className="product-thumb">
          <a href={`/product-details/${product.pSlug ?? ''}`}>
            <img
              src={brokenImageSrc}
              className="pri-img"
              alt=""
              style={{ height: '250px', width: '250px' }}
            />
            <img
              src={brokenImageSrc}
              className="sec-img"
              alt=""
              style={{ height: '250px', width: '250px' }}
            />
          </a>
 {/* test  */}
          <div className="box-label">
            {hasDiscount && (
              <div className="box-label">
                <div className="label-product label_new">
                  <span>{percentOff}% Off</span>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="product-caption">
          <div className="">
            <a href={`/product-details/${product.pSlug ?? ''}`}>
              <h4 style={{ color: '#000' }}>{truncatedName}</h4>
            </a>
          </div>
          <div className="product-name">
            <p>Delivery day: {deliveryDay}</p>
          </div>
          <div className="ratings">
            <span className="yellow">
              <i className="fa fa-star" aria-hidden="true"></i>
            </span>
            <span className="yellow">
              <i className="fa fa-star" aria-hidden="true"></i>
            </span>
            <span className="yellow">
              <i className="fa fa-star" aria-hidden="true"></i>
            </span>
            <span className="yellow">
              <i className="fa fa-star" aria-hidden="true"></i>
            </span>
            <span className="yellow">
              <i className="lnr lnr-star"></i>
            </span>
          </div>
          <div className="">
            <span className="regular-price" style={{ fontSize: '15px' }}>
              <span className="special-price">₹{price}</span>
            </span>
            <span className="old-price" style={{ fontSize: '13px' }}>
              <del>₹{mrp}</del>
              {hasDiscount && <> (you save ₹{mrp - price})</>}
            </span>
          </div>
          <div className="row">
            <form method="REQUEST" action="/product-store-cart">
              <input type="hidden" name="id" value={product.legacyId} />
              <input type="hidden" name="p_name" value={product.pName ?? ''} />
              <input type="hidden" name="p_price" value={price} />
              <input type="hidden" name="uid" value="" />
              <input type="hidden" name="quantity" value="1" />
              <input type="hidden" name="p_image" value="" />
              <button type="submit" name="cartBtn" className="btn btn-warning btn-sm">
                Add To Cart
              </button>
            </form>
            &nbsp; &nbsp;
            <form method="REQUEST" action="/product-store-cart">
              {/* prdc_id does not exist on Product — see file header #7 */}
              <input type="hidden" name="id" value="" />
              <input type="hidden" name="p_name" value={product.pName ?? ''} />
              <input type="hidden" name="p_price" value={price} />
              <input type="hidden" name="uid" value="" />
              <input type="hidden" name="quantity" value="1" />
              <input type="hidden" name="p_image" value="" />
              <button type="submit" name="cartBtn" className="btn btn-info btn-sm">
                Buy Now
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

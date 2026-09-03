/**
 * Product-detail "Add To Cart" form, transliterated verbatim from
 * `product-detail.blade.php:354-386`. Generalizes the single-product,
 * hardcoded-values pattern already established in `details/page.tsx`
 * (M1, kept untouched) into a reusable component, since this page needs
 * to render the same form shape for many different curated demo products.
 *
 * PRESERVED, NOT "FIXED":
 *   - `method="REQUEST"` — not a valid HTML form method (browsers treat
 *     an unrecognized method as GET); copied verbatim, not corrected to
 *     "GET"/"POST". Since browsers coerce this to GET, and `/product-store
 *     -cart` is ALSO independently routed as a real `GET` handler in
 *     source (`routes/web.php:43`, blueprint §3.1 row #25 — "the actual
 *     path used"), this form's submission is now (M5) a genuinely
 *     FUNCTIONAL add-to-cart, not a dead end — see `src/app/
 *     product-store-cart/route.ts`.
 *   - Ten `p_name{N}`/`p_image{N}` hidden fields (2 through 10) exist in
 *     source to carry the OTHER 9 variant slots' data if a variant is
 *     selected client-side (by JS this migration phase does not port —
 *     no variant-selection script exists in `assets/js/` matching this
 *     behavior; the fields are wired here as empty placeholders exactly
 *     as source's own un-selected-variant default is empty, matching
 *     `product-detail.blade.php:369-378`'s literal `value=""` defaults).
 *   - No visible quantity selector exists in source for this page at all
 *     — `jquery.bootstrap-touchspin.js` is loaded
 *     (`product-detail.blade.php:650`) but never attached to any element
 *     in this view (verified: no `touchspin`/`type="number"`/spinner
 *     class exists anywhere in the source file). The hidden `quantity`
 *     field is a static `value="1"`, not a user control. This component
 *     does NOT add a quantity input — doing so would be inventing a UI
 *     feature the deployed page does not have.
 *
 * M5 UPDATE (2026-08-31): `_token` now carries a real generated CSRF
 * token (`generateCsrfToken()`, per `csrf.ts`) instead of the M4-era
 * empty placeholder — matches `register`/`login`/etc.'s established
 * pattern. Not actually verified by `product-store-cart/route.ts` (a GET
 * route — Laravel's own `VerifyCsrfToken` exempts GET/HEAD/OPTIONS
 * entirely, so source performs no CSRF check on this path either; the
 * field is populated for structural/markup parity with source's own
 * `@csrf`-equivalent hidden field, not because a GET handler checks it).
 */

import type { Product } from '@/lib/mongodb/schemas';
import { generateCsrfToken } from '@/lib/auth/csrf';

export interface AddToCartFormProps {
  product: Product;
}

export function AddToCartForm({ product }: AddToCartFormProps) {
  const csrfToken = generateCsrfToken();
  return (
    <form method="REQUEST" action="/product-store-cart">
      <input type="hidden" name="_token" value={csrfToken} />
      <input type="hidden" name="id" value={product.legacyId} />
      <input type="hidden" name="p_name" value={product.pName ?? ''} />
      <input type="hidden" name="p_name2" id="p_name2" value="" />
      <input type="hidden" name="p_name3" id="p_name3" value="" />
      <input type="hidden" name="p_name4" id="p_name4" value="" />
      <input type="hidden" name="p_name5" id="p_name5" value="" />
      <input type="hidden" name="p_name6" id="p_name6" value="" />
      <input type="hidden" name="p_name7" id="p_name7" value="" />
      <input type="hidden" name="p_name8" id="p_name8" value="" />
      <input type="hidden" name="p_name9" id="p_name9" value="" />
      <input type="hidden" name="p_name10" id="p_name10" value="" />

      <input type="hidden" name="p_image" id="imageId" value={product.pBestimg ?? ''} />
      <input type="hidden" name="p_image2" id="imageId2" value="" />
      <input type="hidden" name="p_image3" id="imageId3" value="" />
      <input type="hidden" name="p_image4" id="imageId4" value="" />
      <input type="hidden" name="p_image5" id="imageId5" value="" />
      <input type="hidden" name="p_image6" id="imageId6" value="" />
      <input type="hidden" name="p_image7" id="imageId7" value="" />
      <input type="hidden" name="p_image8" id="imageId8" value="" />
      <input type="hidden" name="p_image9" id="imageId9" value="" />
      <input type="hidden" name="p_image10" id="imageId10" value="" />

      <input type="hidden" name="p_price" id="priceId" value={product.pPrice ?? ''} />
      <input type="hidden" placeholder="1" name="quantity" value="1" />

      <button type="submit" name="sbmtBtn" className="thm-btn">
        Add To Cart{' '}
      </button>
    </form>
  );
}

import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { PublicScripts } from '@/components/layout/PublicScripts';
import { PublicStylesheets } from '@/components/layout/PublicStylesheets';
import { getCartContent, getSubTotal, type CartItem } from '@/lib/cart';
import { getCartOrderId } from '@/lib/cartOrderIdCookie';
import { generateCsrfToken } from '@/lib/auth/csrf';

/**
 * Shared content for `/shopping-cart` and `/cart-list` — ported from
 * `shopping-cart.blade.php` (479 lines).
 *
 * ============================================================================
 * ROUTE CLASSIFICATION — a deliberate, named deviation (unchanged, M1-era)
 * ============================================================================
 * Per `docs/M3-APPLICATION-MAPPING.md` row #26, `/shopping-cart` is
 * cataloged **Broken (B-16)**: `CartController@ShopCart` (the controller
 * actually bound to that route) returns `view('shopping-cart')` with ZERO
 * view data — the Blade template expects `$items`/`$SubTotal`/`$i`/
 * `$DeliveryPrice`, none of which are supplied, so production genuinely
 * errors/renders broken on that exact route. The CONTENT-BEARING version
 * (what this component renders) is only reachable in real production via
 * the DIFFERENT route `/cart-list` (named `cartList`,
 * `CartController@cartList`, row #35), which supplies all four variables
 * correctly. This demo/M5 build renders the SAME populated content at BOTH
 * `/shopping-cart` and `/cart-list` — a deliberate choice carried forward
 * from the M1 demo, not a silent fix of B-16, still flagged here. B-16
 * remains cataloged Broken in `M3-APPLICATION-MAPPING.md`.
 *
 * ============================================================================
 * M5 — REAL CART DATA (replaces the M1-era static-fixture demo)
 * ============================================================================
 * Per the owner's M5 decision (2026-08-31): this component now reads the
 * REAL session cart (`src/lib/cart.ts`'s `getCartContent()`/
 * `getSubTotal()`, HMAC-signed `spaks_cart` cookie) instead of
 * `src/lib/demo/cart.ts`'s fixed 2-item fixture. `src/lib/demo/cart.ts` is
 * left in place, unused by this file, per contract NN-8 (no feature
 * removal without approval). UPDATE (M6, 2026-08-31): `/product-checkout`
 * (the file this note originally cross-referenced as still using
 * `getDemoCartSubtotal`/`getAllStatezones`) was rewired to real
 * session/cart/buyer_profile/statezones data this milestone — no page in
 * this app reads from `src/lib/demo` for checkout data any longer; only
 * `src/lib/demo/cart.ts` itself remains unreferenced-but-retained.
 *
 * FULL 10-SLOT IMAGE/NAME RENDERING (M5 correction of an M1-era
 * simplification): the real `shopping-cart.blade.php` (lines 90-176)
 * renders ALL TEN `image`/`image2..10` and `name`/`name2..10` attribute
 * slots per cart line (one `<img>`/`<a>` per non-empty slot, not just the
 * first) — reproduced in full below via the `IMAGE_ATTR_KEYS`/
 * `NAME_ATTR_KEYS` loops, matching source's own repeated `@if(...)` ladder
 * exactly rather than the M1 demo's single-image/single-name
 * simplification.
 *
 * FORM ACTION: real `_token` (generated via `generateCsrfToken()`, per
 * `csrf.ts`), real `OrderId` (from `getCartOrderId()`, set by the last
 * add-to-cart action) — both were static/empty placeholders in the M1
 * demo.
 */

const IMAGE_ATTR_KEYS = [
  'image',
  'image2',
  'image3',
  'image4',
  'image5',
  'image6',
  'image7',
  'image8',
  'image9',
  'image10',
] as const;

const NAME_ATTR_KEYS = [
  'name2',
  'name3',
  'name4',
  'name5',
  'name6',
  'name7',
  'name8',
  'name9',
  'name10',
] as const;

function CartRow({ item }: { item: CartItem }) {
  return (
    <tr>
      <td className="card-product">
        {IMAGE_ATTR_KEYS.map((key) => {
          const value = item.attributes[key];
          if (value === '') return null;
          // shopping-cart.blade.php:96 — the primary `image` slot alone
          // renders at 50px width; slots 2-10 render at 30px for image2/3,
          // 50px thereafter (verified per-slot against source's own
          // per-`@if` inline `style="width: ...px"` values, which are NOT
          // uniform — 30px only on image2/image3, 50px everywhere else,
          // including the primary slot).
          const width = key === 'image2' || key === 'image3' ? 30 : 50;
          return (
            <a href="#" key={key}>
              <img
                src={`/uploaded_files/products/${value}`}
                style={{ width: `${width}px` }}
                alt=""
              />
            </a>
          );
        })}
      </td>
      <td className="card-productname">
        {item.name !== '' && <a href="#">{item.name}</a>}
        {NAME_ATTR_KEYS.map((key) => {
          const value = item.attributes[key];
          if (value === '') return null;
          return (
            <a href="#" key={key}>
              {value}
            </a>
          );
        })}
      </td>
      <td>₹{item.price}</td>
      <input type="hidden" name="price[]" value={item.price} />
      <input type="hidden" name="productIds[]" value={item.id} />
      <input type="hidden" name="uid[]" value={item.attributes.uid} />
      <input type="hidden" name="OrderImage[]" value={item.attributes.image} />
      <td>
        <label>
          Quantity :
          <input
            type="number"
            defaultValue={item.quantity}
            id={`product_quantity${item.id}`}
            placeholder="Quantity"
          />
        </label>
        <input
          type="button"
          data-price={item.price}
          className="updateCart"
          value="Update Cart"
          data-id={item.id}
        />
      </td>
      <td>₹{item.price * item.quantity}</td>
      <td>
        <input type="hidden" name="id" value={item.id} />
        <button type="button" className="btn btn-danger">
          <a href={`/remove-cart/${item.id}`}>
            <i className="text-white fa fa-trash"></i>
          </a>
        </button>
      </td>
    </tr>
  );
}

export async function CartPageContent() {
  const items = await getCartContent();
  const subtotal = getSubTotal(items);
  const orderId = await getCartOrderId();
  const csrfToken = generateCsrfToken();
  const hasItems = items.length > 0;

  return (
    <div className="page-wrapper">
      <PublicStylesheets />
      <PublicHeader />

      <section className="inner-banner inner-banner__two">
        <div className="container">
          <h2 className="inner-banner__title">Shopping Cart</h2>
          <ul className="thm-breadcrumb">
            <li>
              <a href="#">Home</a>
            </li>
            <li>
              <span className="sep">/</span>
            </li>
            <li>
              <span className="page-title">Shopping Cart</span>
            </li>
          </ul>
        </div>
      </section>

      <section className="cart-section sec-pad pb-0">
        <div className="container">
          <div className="col-12 col-sm-12 col-md-12 col-lg-12">
            <div className="section-title">
              <h3>Shopping Cart</h3>
            </div>

            {hasItems ? (
              <form action="/product-checkout" method="POST">
                <div className="table-responsive card-grid">
                  <table className="table table-bordered">
                    <thead>
                      <tr>
                        <th>Image</th>
                        <th>Product Name</th>
                        <th>Price</th>
                        <th>Quantity</th>
                        <th>Total</th>
                        <th>Remove</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => (
                        <CartRow item={item} key={item.id} />
                      ))}
                    </tbody>
                  </table>
                </div>

                <br />
                <div className="cart-amount-wrapper">
                  <div className="row">
                    <div className="col-12 col-sm-12 col-md-4 offset-md-8 card-grid">
                      <table className="table table-bordered">
                        <tbody>
                          <tr>
                            <th>
                              <strong>Sub-Total:</strong>
                            </th>
                            <td>₹{subtotal}</td>
                          </tr>
                          <tr>
                            <th>
                              <strong>Delivery Charges:</strong>
                            </th>
                            <td>Free</td>
                          </tr>
                          <tr>
                            <th>
                              <strong>Total:</strong>
                            </th>
                            <td>
                              <span className="color-primary">₹{subtotal}</span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div className="cart-button-wrapper d-flex justify-content-between mt-4">
                  <a href="/home" className="btn btn-info">
                    Continue Shopping
                  </a>
                  <input type="hidden" name="DeliveryCharge" value="0" />
                  <input type="hidden" name="OrderId" value={orderId ?? ''} />
                  <input type="hidden" name="_token" value={csrfToken} />
                  <button type="submit" name="chckbtn" className="btn btn-info">
                    {' '}
                    Place Order
                  </button>
                </div>
              </form>
            ) : (
              <center>
                <h4>Your cart is empty!</h4> <br />
                <a href="/home" className="btn btn-info">
                  Shop Now
                </a>
              </center>
            )}
          </div>
        </div>
      </section>
      <br />
      <br />

      <PublicFooter />
      <PublicScripts />

      {/* Reproduced verbatim from source (shopping-cart.blade.php:394-472)
          — a real AJAX cart-update handler, now wired to a real,
          functional `/update-cart-ajax` endpoint (M5) instead of the M1
          demo's inert placeholder. Source embeds the token directly into
          the inline script via Blade's own server-side `{{csrf_token()}}`
          interpolation (`shopping-cart.blade.php`'s inline `<script>`,
          same file, same mechanism) — no separate DOM node for it exists
          in source, so none is added here either; the real generated
          token is interpolated directly into this Server Component's
          template literal at render time, the same place source
          interpolates it, not read back from an extra hidden input. */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
$(document).ready(function(){
  $('.removeBtn').click(function(){ alert('hiii'); });
});
$('.updateCart').on('click', function(){
  var id = $(this).data('id');
  var quantity = $('#product_quantity'+id).val();
  $.ajax({
    type: 'POST',
    url: '/update-cart-ajax',
    data: { 'id': id, 'quantity': quantity, '_token': ${JSON.stringify(csrfToken)} },
    success: function(response) {
      if (response) { console.log(response); window.location.href = '/cart-list'; }
      else { console.log('Failed Response From Server'); }
    },
    error: function(jqXHR, textStatus, errorThrown) {
      console.log(JSON.stringify(jqXHR));
      console.log('AJAX error: ' + textStatus + ' : ' + errorThrown);
    }
  });
});
`,
        }}
      />
    </div>
  );
}

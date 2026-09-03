import type { Metadata } from 'next';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { PublicScripts } from '@/components/layout/PublicScripts';
import { PublicStylesheets } from '@/components/layout/PublicStylesheets';
import { requireBuyerSession } from '@/lib/auth/guard';
import { getDb } from '@/lib/mongodb/client';
import { buildCheckoutPageData } from '@/lib/services/checkoutService';
import { generateCsrfToken } from '@/lib/auth/csrf';

/**
 * `/product-checkout` — ported from `cart-checkout.blade.php` (642 lines),
 * `HomeController@Checkout` (`HomeController.php:391-405`, inside the
 * `checkBuyer` group, `web.php:104-119`).
 *
 * This IS the real, live checkout page despite its route name
 * (`/product-checkout`, not `/checkout`, which is DEAD per
 * `docs/M3-APPLICATION-MAPPING.md` row #66's classification of the sibling
 * `checkout.blade.php`).
 *
 * ============================================================================
 * FRAMEWORK-MAPPING NOTE: POST-only source route rendered as a page.tsx
 * ============================================================================
 * Source binds this route as `Route::post('product-checkout', ...)` ONLY —
 * there is no `GET product-checkout` (the sibling `//Route::get(...)` at
 * `web.php:116` is commented out, carries no authority per contract §12.4).
 * `CartPageContent.tsx`'s "Place Order" form (`method="POST"`) is the ONLY
 * real submitter of this route. Verified empirically this session: a
 * Next.js App Router `page.tsx` with no sibling `route.ts` renders
 * identically regardless of the incoming request's HTTP method (there is
 * no method-based rejection for a page-only route) — so a real POST
 * submission from the cart page IS served by this file, matching source's
 * POST-only reachability without inventing a GET entry point Laravel
 * doesn't have. (M5's gate report had flagged this file as still reading
 * demo-fixture data with a to-do for M6 to wire it to the real cart/auth —
 * this is that wiring.)
 *
 * `Checkout(Request $req)`'s TWO POST-body reads are BOTH effectively
 * unused/defective on any real submission — see `checkoutService.ts`'s
 * `buildCheckoutPageData` header for the full `$req->getOrderId` mismatch
 * analysis (the real form field is named `OrderId`, source reads
 * `getOrderId`, so `$getOrderId` is always null and this view's own
 * `order_id` hidden field is populated from `session()->get('getOrderId')`
 * directly instead, bypassing the view variable). `$req->DeliveryCharge`
 * (from the cart form's own `DeliveryCharge` hidden field, hardcoded `"0"`
 * — `CartPageContent.tsx`) is read straight through since it IS correctly
 * named and sent, unlike `getOrderId`.
 */
export const metadata: Metadata = {
  title: 'Spakshomeopathy - Checkout',
  other: {
    'msapplication-TileColor': '#ffffff',
    'theme-color': '#ffffff',
  },
};

export default async function ProductCheckoutPage() {
  // Mirrors CheckBuyer — redirects a guest/non-buyer to /login.
  const session = await requireBuyerSession();

  const db = await getDb();
  const { getCartOrderId } = await import('@/lib/cartOrderIdCookie');
  const sessionOrderId = await getCartOrderId(); // session('getOrderId') — the REAL source
  // of this page's order_id hidden field, per the file-header note above.

  const pageData = await buildCheckoutPageData(db, session.userId, sessionOrderId, '0');
  const csrfToken = generateCsrfToken();

  const { subTotal, deliveryCharge, statezones, userData, getOrderId } = pageData;
  const deliveryChargeNum = deliveryCharge !== null ? Number(deliveryCharge) : 0;

  return (
    <div className="page-wrapper">
      <PublicStylesheets />
      <PublicHeader />

      <section className="inner-banner inner-banner__two">
        <div className="container">
          <h2 className="inner-banner__title">Checkout</h2>
          <ul className="thm-breadcrumb">
            <li>
              <a href="#">Home</a>
            </li>
            <li>
              <span className="sep">/</span>
            </li>
            <li>
              <span className="page-title">Checkout</span>
            </li>
          </ul>
        </div>
      </section>

      <section className="checkout-section sec-pad cart-section">
        <div className="container">
          <div className="row">
            <div className="col-12 col-sm-12 col-md-12 col-lg-12">
              <main id="primary" className="site-main">
                <form action="/payment/method" method="post" id="offline_payment">
                  <input type="hidden" name="_token" value={csrfToken} />
                  <div className="checkout-area">
                    <div className="row">
                      <div className="col-12 col-sm-12 col-md-6 col-lg-7">
                        <div className="checkout-form">
                          <div className="section-title left-aligned">
                            <h3>Billing Details</h3>
                            <span style={{ fontWeight: 'bold', color: 'green' }}>
                              Note: Please Scan QR code and pay amount after that put transaction id
                              then you can placed order.{' '}
                            </span>
                          </div>

                          <input type="hidden" name="tid" id="tid" readOnly />
                          <input type="hidden" name="merchant_id" value="271753" />
                          <input type="hidden" name="order_id" value={getOrderId ?? ''} />
                          <input type="hidden" name="amount" value={subTotal + deliveryChargeNum} />
                          <input type="hidden" name="currency" value="INR" />
                          <input type="hidden" name="redirect_url" value="" />
                          <input type="hidden" name="cancel_url" value="" />
                          <input type="hidden" name="language" value="EN" />
                          <input type="hidden" name="billing_name" value={userData?.name ?? ''} />
                          <input
                            type="hidden"
                            name="billing_address"
                            value={userData?.fullAddress ?? ''}
                          />
                          <input
                            type="hidden"
                            name="billing_city"
                            value={userData?.houseNo ?? ''}
                          />
                          <input type="hidden" name="billing_state" value={userData?.state ?? ''} />
                          <input type="hidden" name="billing_zip" value={userData?.pinCode ?? ''} />
                          <input type="hidden" name="billing_country" value="India" />
                          <input type="hidden" name="billing_tel" value={userData?.mobile ?? ''} />
                          <input
                            type="hidden"
                            name="billing_email"
                            value={`t${userData?.email ?? ''}`}
                          />
                          <input type="hidden" name="delivery_name" value={userData?.name ?? ''} />
                          <input
                            type="hidden"
                            name="delivery_address"
                            value={userData?.fullAddress ?? ''}
                          />
                          <input
                            type="hidden"
                            name="delivery_city"
                            value={userData?.houseNo ?? ''}
                          />
                          <input
                            type="hidden"
                            name="delivery_state"
                            value={userData?.state ?? ''}
                          />
                          <input
                            type="hidden"
                            name="delivery_zip"
                            value={userData?.pinCode ?? ''}
                          />
                          <input type="hidden" name="delivery_country" value="India" />
                          <input type="hidden" name="delivery_tel" value={userData?.mobile ?? ''} />
                          <input type="hidden" name="merchant_param1" value="additional Info." />
                          <input type="hidden" name="merchant_param2" value="additional Info." />
                          <input type="hidden" name="merchant_param3" value="additional Info." />
                          <input type="hidden" name="merchant_param4" value="additional Info." />
                          <input type="hidden" name="merchant_param5" value="additional Info." />
                          <input type="hidden" name="promo_code" value="" />
                          <input type="hidden" name="customer_identifier" value="" />
                          <input type="hidden" name="DeliveryCharge" value={deliveryChargeNum} />

                          <div className="form-row mb-3">
                            <div className="form-group col-12 col-sm-12 col-md-6">
                              <span className="text-danger" id="transectionidmsg">
                                &nbsp;
                              </span>
                              <label htmlFor="transection_id">
                                Transaction id <span className="text-danger">*</span>
                              </label>
                              <input
                                type="text"
                                className="form-control"
                                name="transection_id"
                                defaultValue=""
                                required
                                id="transection_id"
                              />
                            </div>
                            <div className="form-group col-12 col-sm-12 col-md-6">
                              <label htmlFor="uname">
                                First Name <span className="text-danger">*</span>
                              </label>
                              <input
                                type="text"
                                className="form-control"
                                name="name"
                                defaultValue={userData?.name ?? ''}
                                required
                                readOnly
                                id="uname"
                              />
                            </div>
                            <div className="form-group col-12 col-sm-12 col-md-6">
                              <label htmlFor="uemail">
                                Email Id <span className="text-danger">*</span>
                              </label>
                              <input
                                type="text"
                                className="form-control"
                                name="email"
                                defaultValue={userData?.email ?? ''}
                                required
                                readOnly
                                id="uemail"
                              />
                            </div>
                          </div>

                          <div className="form-row mb-3">
                            <div className="form-group col-12 col-sm-12 col-md-6">
                              <label htmlFor="umobile">Mobile No</label>
                              <input
                                type="text"
                                className="form-control"
                                name="mobile"
                                defaultValue={userData?.mobile ?? ''}
                                required
                                id="umobile"
                              />
                            </div>
                            <div className="form-group col-12 col-sm-12 col-md-6">
                              <label htmlFor="upincode">
                                Pin Code <span className="text-danger">*</span>
                              </label>
                              <input
                                type="text"
                                className="form-control"
                                name="PinCode"
                                defaultValue={userData?.pinCode ?? ''}
                                id="upincode"
                                required
                              />
                            </div>
                          </div>

                          <div className="form-row mb-3">
                            <div className="form-group col-12 col-sm-12 col-md-12">
                              <label htmlFor="ufulladdress">
                                Full Address <span className="text-danger">*</span>
                              </label>
                              <input
                                type="text"
                                className="form-control"
                                name="FullAddress"
                                defaultValue={userData?.fullAddress ?? ''}
                                id="ufulladdress"
                                required
                              />
                            </div>
                          </div>

                          <div className="form-row mb-3">
                            <div className="form-group col-12 col-sm-12 col-md-6">
                              <label htmlFor="uhouseno">
                                House No <span className="text-danger">*</span>
                              </label>
                              <input
                                type="text"
                                className="form-control"
                                name="HouseNo"
                                defaultValue={userData?.houseNo ?? ''}
                                id="uhouseno"
                                required
                              />
                            </div>
                            <div className="form-group col-12 col-sm-12 col-md-6">
                              <label htmlFor="ulandmark">
                                Landmark <span className="text-danger">*</span>
                              </label>
                              <input
                                type="text"
                                className="form-control"
                                name="Landmark"
                                defaultValue={userData?.landmark ?? ''}
                                id="ulandmark"
                                required
                              />
                            </div>
                          </div>

                          <div className="form-row mb-3">
                            <div className="form-group col-12 col-sm-12 col-md-6">
                              <label htmlFor="ustate">
                                State <span className="text-danger">*</span>
                              </label>
                              <select className="form-control" name="State" id="ustate" required>
                                <option value="">--Select State--</option>
                                {statezones.map((sz) => (
                                  <option
                                    value={sz.zoneName ?? ''}
                                    key={sz.legacyId}
                                    selected={sz.zoneName === userData?.state}
                                  >
                                    {' '}
                                    {sz.zoneName}{' '}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="form-group col-12 col-sm-12 col-md-6">
                              <label htmlFor="country_name" className="d-block">
                                Country <span className="text-danger">*</span>
                              </label>
                              <select name="Country" className="form-control nice-select">
                                <option value="India">India</option>
                              </select>
                            </div>
                          </div>

                          <div className="form-row">
                            <div className="form-group col-12 col-sm-12 col-md-12">
                              <label htmlFor="uordernotes">Order Notes</label>
                              <textarea
                                id="uordernotes"
                                className="form-control"
                                name="order_notes"
                                placeholder="Notes about your order, e.g. special notes for delivery."
                              ></textarea>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="col-12 col-sm-12 col-md-6 col-lg-5">
                        <div className="order-summary">
                          <div className="section-title left-aligned">
                            <h3>Your Order</h3>
                          </div>

                          {/* product-container is genuinely empty in source — no @foreach
                              over cart items exists in that div in cart-checkout.blade.php */}
                          <div className="product-container"></div>

                          <div className="order-review">
                            <div className="table-responsive">
                              <table className="table table-bordered">
                                <tbody>
                                  <tr className="cart-subtotal">
                                    <th>Subtotal</th>
                                    <td className="text-center">₹{subTotal}</td>
                                  </tr>
                                  <tr className="cart-subtotal">
                                    <th>Delivery Charges</th>
                                    <td className="text-center">₹{deliveryChargeNum}</td>
                                  </tr>
                                  <tr className="order-total">
                                    <th>Total</th>
                                    <td className="text-center">
                                      <strong>₹{subTotal + deliveryChargeNum}</strong>
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>

                          <div className="checkout-payment">
                            <div className="form-row">
                              <div className="custom-radio">
                                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                                <input
                                  className="form-check-input"
                                  type="radio"
                                  name="ptype"
                                  id="online_payment"
                                  value="offline_payment"
                                  defaultChecked
                                />
                                <span className="checkmark"></span>
                                <label className="form-check-label" htmlFor="paypal_payment">
                                  Pay By QR Code
                                </label>
                              </div>
                            </div>

                            <div className="form-row">
                              <div className="form-check">
                                <div className="custom-checkbox">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                    id="terms_acceptance"
                                    defaultChecked
                                    readOnly
                                  />
                                  <span className="checkmark"></span>
                                  <label className="form-check-label" htmlFor="terms_acceptance">
                                    I agree to the <a href="#">terms of service</a> and will adhere
                                    to them unconditionally.
                                  </label>
                                </div>
                              </div>
                            </div>

                            <div className="form-row justify-content-end">
                              <input
                                type="button"
                                className="btn btn-success dark checkout-btn"
                                value="CheckOut"
                              />
                            </div>
                            <div>
                              <img src="/assets/images/qrcode.jpg" alt="" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Duplicate hidden-field block — reproduced from source
                      lines 479-504, a real redundancy, not consolidated. */}
                  <input type="hidden" name="_token" value={csrfToken} />
                  <input
                    type="hidden"
                    className="form-control"
                    name="name"
                    value={userData?.name ?? ''}
                    readOnly
                    id="uuname"
                  />
                  <input
                    type="hidden"
                    className="form-control"
                    name="email"
                    value={userData?.email ?? ''}
                    readOnly
                    id="uuemail"
                  />
                  <input
                    type="hidden"
                    className="form-control"
                    name="mobile"
                    value={userData?.mobile ?? ''}
                    id="uumobile"
                  />
                  <input
                    type="hidden"
                    className="form-control"
                    name="PinCode"
                    value={userData?.pinCode ?? ''}
                    id="uupincode"
                  />
                  <input
                    type="hidden"
                    className="form-control"
                    name="FullAddress"
                    value={userData?.fullAddress ?? ''}
                    id="uufulladdress"
                  />
                  <input
                    type="hidden"
                    className="form-control"
                    name="HouseNo"
                    value={userData?.houseNo ?? ''}
                    id="uuhouseno"
                  />
                  <input
                    type="hidden"
                    className="form-control"
                    name="Landmark"
                    value={userData?.landmark ?? ''}
                    id="uulandmark"
                  />
                  <input
                    type="hidden"
                    className="form-control"
                    name="State"
                    value={userData?.state ?? ''}
                    id="uustate"
                  />
                  <input type="hidden" name="order_id" value={getOrderId ?? ''} />
                  <input type="hidden" name="amount" value={subTotal + deliveryChargeNum} />
                  <input type="hidden" name="OrderNotes" value={subTotal} id="uuordernotes" />
                  <input type="hidden" name="DeliveryCharge" value={deliveryChargeNum} />
                </form>
              </main>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
      <PublicScripts />
    </div>
  );
}

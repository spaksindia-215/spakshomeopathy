import type { Metadata } from 'next';
import { redirect, notFound } from 'next/navigation';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { PublicScripts } from '@/components/layout/PublicScripts';
import { PublicStylesheets } from '@/components/layout/PublicStylesheets';
import { getSession } from '@/lib/auth/session';
import { getDb } from '@/lib/mongodb/client';
import { buildBuyProductPageData } from '@/lib/services/checkoutService';

/**
 * `GET /buy-product/{pslug}` — mirrors `routes/web.php:86`
 * (`Route::get('buy-product/{pslug}','HomeController@BuyProduct')`),
 * `HomeController@BuyProduct` (`HomeController.php:439-485`, note
 * `Public function BuyProduct` — capitalized `Public` keyword, PHP is
 * case-insensitive on keywords so this is syntactically valid, a literal
 * source oddity, not reproduced as anything here since it has no runtime
 * effect).
 *
 * LIVE-ORPHAN single-product buy-now page (blueprint §3.1 row #46 — no
 * inbound link from any live navigation, but reachable if hit directly).
 *
 * AUTH GUARD — INLINE, NOT MIDDLEWARE-BASED (matching source exactly):
 * `\Auth::check()` / `$user->utype==3` are checked INSIDE the controller
 * method body, not via route-group middleware (this route sits OUTSIDE
 * `checkBuyer`, `web.php:86`, same as B-15's `payment/method` and
 * `success-order`). Guest → redirect `login` + `'Please login first'`;
 * authenticated non-buyer → redirect `login` + `'Please login as a
 * Buyer'` (`HomeController.php:476-484`) — the REDIRECT DESTINATION is
 * reproduced (`/login`); the accompanying flash MESSAGE is NOT, for the
 * same mechanical reason `guard.ts`'s own header documents for
 * `requireBuyerSession()`: this guard runs inside a Server Component
 * during PAGE RENDER (not a Route Handler/Server Action), and Next.js
 * throws a hard runtime error if `cookies().set()` is called from a
 * render (confirmed directly this session — the exact same constraint
 * `guard.ts` already hit and documented). `buildBuyProductPageData`
 * itself still computes and returns the correct `loginMessage` per
 * branch (independently unit-testable), it is simply not surfaced as a
 * flash cookie from THIS specific call site — a small, disclosed gap,
 * not a silent one.
 *

 * FORM TARGET NOT REBUILT: the rendered view's own `<form>` posts to the
 * excluded `cc/ccavRequestHandler.php` (`checkout-buy-product.blade.php:83`
 * — CCAvenue, out of scope per contract §3.1/D-02/D-08). The PAGE is
 * ported faithfully (same markup, same fields); the form's submit target
 * is preserved as literal, non-functional text, not wired to a working
 * endpoint — rebuilding it into something that actually places an order
 * would be inventing a payment integration source never had (`blueprint.md`
 * §9.3: "There is no payment gateway integration in the live application").
 */
export const metadata: Metadata = {
  title:
    'Online Shopping Site for Mobiles, Electronics, Furniture, Grocery, Lifestyle, Books & More. Best Offers!',
};

export default async function BuyProductPage({ params }: { params: Promise<{ pslug: string }> }) {
  const { pslug } = await params;
  const session = await getSession();

  // Mirrors HomeController.php:441/445's own ordering: \Auth::check() and
  // the utype==3 guard are evaluated BEFORE any DB::table() call — no
  // database query happens at all for a guest or non-buyer. Checked here,
  // before getDb(), for the same reason (and NOT merely to route around
  // this sandbox's MongoDB connectivity issue — see
  // docs/GATE-REPORT-M6-CHECKOUT.md's verification section for that
  // separate, disclosed gap).
  if (!session || session.utype !== 3) {
    // See file header AUTH GUARD note — the flash message
    // ('Please login first' / 'Please login as a Buyer') cannot be set
    // from this Server Component render.
    redirect('/login');
  }

  const db = await getDb();
  const pageData = await buildBuyProductPageData(
    db,
    { userId: session.userId, utype: session.utype },
    pslug
  );

  if (!pageData.data) {
    // HomeController.php:456 — $getPid->id with no null guard on a
    // non-matching slug; see buildBuyProductPageData's own header for why
    // this surfaces as a 404 here rather than a literal PHP fatal.
    notFound();
  }

  const { userData, data, getProduct } = pageData;

  return (
    <div>
      <PublicStylesheets />
      <PublicHeader />

      <div className="breadcrumb-area mb-60">
        <div className="container-fluid">
          <div className="row">
            <div className="col-12">
              <div className="breadcrumb-wrap">
                <nav aria-label="breadcrumb">
                  <ul className="breadcrumb">
                    <li className="breadcrumb-item">
                      <a href="/home">Home</a>
                    </li>
                    <li className="breadcrumb-item active" aria-current="page">
                      Checkout
                    </li>
                  </ul>
                </nav>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="checkout-wrapper pt-10 pb-70">
        <div className="container-fluid">
          <div className="row">
            <div className="col-12 col-sm-12 col-md-12 col-lg-12">
              <main id="primary" className="site-main">
                <form action="/cc/ccavRequestHandler.php" method="post">
                  <div className="checkout-area">
                    <div className="row">
                      <div className="col-12 col-sm-12 col-md-6 col-lg-7">
                        <div className="checkout-form">
                          <div className="section-title left-aligned">
                            <h3>Billing Details</h3>
                          </div>

                          <input type="hidden" name="tid" id="tid" readOnly />
                          <input type="hidden" name="merchant_id" value="271753" />
                          <input type="hidden" name="order_id" value="123654789" />
                          <input type="hidden" name="amount" value="1.00" />
                          <input type="hidden" name="currency" value="INR" />
                          <input
                            type="hidden"
                            name="redirect_url"
                            value="https://zeintext.com/cc/ccavResponseHandler.php"
                          />
                          <input
                            type="hidden"
                            name="cancel_url"
                            value="https://zeintext.com/cc/ccavResponseHandler.php"
                          />
                          <input type="hidden" name="language" value="EN" />
                          <input type="hidden" name="billing_name" value="Charli" />
                          <input
                            type="hidden"
                            name="billing_address"
                            value="Room no 1101, near Railway station Ambad"
                          />
                          <input type="hidden" name="billing_city" value="Indore" />
                          <input type="hidden" name="billing_state" value="MP" />
                          <input type="hidden" name="billing_zip" value="425001" />
                          <input type="hidden" name="billing_country" value="India" />
                          <input type="hidden" name="billing_tel" value="9876543210" />
                          <input type="hidden" name="billing_email" value="test@test.com" />
                          <input type="hidden" name="delivery_name" value="Chaplin" />
                          <input
                            type="hidden"
                            name="delivery_address"
                            value="room no.701 near bus stand"
                          />
                          <input type="hidden" name="delivery_city" value="Hyderabad" />
                          <input type="hidden" name="delivery_state" value="Andhra" />
                          <input type="hidden" name="delivery_zip" value="425001" />
                          <input type="hidden" name="delivery_country" value="India" />
                          <input type="hidden" name="delivery_tel" value="9876543210" />
                          <input type="hidden" name="merchant_param1" value="additional Info." />
                          <input type="hidden" name="merchant_param2" value="additional Info." />
                          <input type="hidden" name="merchant_param3" value="additional Info." />
                          <input type="hidden" name="merchant_param4" value="additional Info." />
                          <input type="hidden" name="merchant_param5" value="additional Info." />
                          <input type="hidden" name="promo_code" value="" />
                          <input type="hidden" name="customer_identifier" value="" />

                          <div className="form-row mb-3">
                            <div className="form-group col-12 col-sm-12 col-md-6">
                              <label htmlFor="first_name">
                                First Name <span className="text-danger">*</span>
                              </label>
                              <input
                                type="text"
                                className="form-control"
                                name="name"
                                defaultValue={userData?.name ?? ''}
                                required
                              />
                            </div>
                            <div className="form-group col-12 col-sm-12 col-md-6">
                              <label htmlFor="last_name">
                                Email Id <span className="text-danger">*</span>
                              </label>
                              <input
                                type="text"
                                className="form-control"
                                name="email"
                                defaultValue={userData?.email ?? ''}
                                required
                              />
                            </div>
                          </div>
                          <div className="form-row mb-3">
                            <div className="form-group col-12 col-sm-12 col-md-6">
                              <label htmlFor="company_name">Mobile No</label>
                              <input
                                type="text"
                                className="form-control"
                                name="mobile"
                                defaultValue={userData?.mobile ?? ''}
                              />
                            </div>
                            <div className="form-group col-12 col-sm-12 col-md-6">
                              <label htmlFor="email_address">
                                Pin Code <span className="text-danger">*</span>
                              </label>
                              <input
                                type="text"
                                className="form-control"
                                name="PinCode"
                                defaultValue={userData?.pinCode ?? ''}
                                required
                              />
                            </div>
                          </div>
                          <div className="form-row mb-3">
                            <div className="form-group col-12 col-sm-12 col-md-12">
                              <label htmlFor="p_address">
                                Full Address <span className="text-danger">*</span>
                              </label>
                              <input
                                type="text"
                                className="form-control"
                                name="FullAddress"
                                defaultValue={userData?.fullAddress ?? ''}
                                required
                              />
                            </div>
                          </div>
                          <div className="form-row mb-3">
                            <div className="form-group col-12 col-sm-12 col-md-6">
                              <label htmlFor="city_name">
                                House No <span className="text-danger">*</span>
                              </label>
                              <input
                                type="text"
                                className="form-control"
                                name="HouseNo"
                                defaultValue={userData?.houseNo ?? ''}
                                required
                              />
                            </div>
                            <div className="form-group col-12 col-sm-12 col-md-6">
                              <label htmlFor="province_name">
                                Landmark <span className="text-danger">*</span>
                              </label>
                              {/* source: value="{{$userData->FullAddress}}" — the SAME field
                                  as FullAddress above, not Landmark. Preserved verbatim,
                                  not corrected — a real source copy-paste defect. */}
                              <input
                                type="text"
                                className="form-control"
                                name="Landmark"
                                defaultValue={userData?.fullAddress ?? ''}
                                required
                              />
                            </div>
                          </div>

                          <div className="form-row mb-3">
                            <div className="form-group col-12 col-sm-12 col-md-6">
                              <label htmlFor="zip_code">
                                State <span className="text-danger">*</span>
                              </label>
                              {/* source: value="{{$userData->FullAddress}}" — again the
                                  FullAddress field, not State. Preserved verbatim. */}
                              <input
                                type="text"
                                className="form-control"
                                name="State"
                                defaultValue={userData?.fullAddress ?? ''}
                                required
                              />
                            </div>
                            <div className="form-group col-12 col-sm-12 col-md-6">
                              <label htmlFor="country_name" className="d-block">
                                Country <span className="text-danger">*</span>
                              </label>
                              <select name="Country" className="form-control nice-select" required>
                                <option value="India">India</option>
                              </select>
                            </div>
                          </div>

                          <div className="form-row">
                            <div className="form-group col-12 col-sm-12 col-md-12">
                              <label htmlFor="order_notes">Order Notes</label>
                              <textarea
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
                          <div className="product-container">
                            {getProduct.map((row, index) => (
                              <div className="product-list" key={index}>
                                <div className="product-inner media align-items-center">
                                  <div className="product-image mr-4 mr-sm-5 mr-md-4 mr-lg-5">
                                    <a href={`/detail/${row.pSlug ?? ''}`}>
                                      <img
                                        src={`/uploaded_files/products/${row.pImage ?? ''}`}
                                        alt={row.pName ?? ''}
                                        title={row.pName ?? ''}
                                      />
                                    </a>
                                  </div>
                                  <div className="media-body">
                                    <h5>{row.pName}</h5>
                                    <p className="product-quantity">Quantity: 1</p>
                                    <p className="product-final-price">₹{row.pPrice}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="order-review">
                            <div className="table-responsive">
                              <table className="table table-bordered">
                                <tbody>
                                  <tr className="cart-subtotal">
                                    <th>Subtotal</th>
                                    <td className="text-center">₹{data.price}</td>
                                  </tr>
                                  <tr className="order-total">
                                    <th>Total</th>
                                    <td className="text-center">
                                      <strong>₹{data.price}</strong>
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>
                          <div className="checkout-payment">
                            <input type="hidden" name="pid" value={data.pid} />
                            <input type="hidden" name="price" value={data.price ?? ''} />
                            <input
                              type="hidden"
                              name="shipping_time"
                              value={data.deliveryDate ?? ''}
                            />

                            <div className="form-row">
                              <div className="custom-radio">
                                <input
                                  className="form-check-input"
                                  type="radio"
                                  name="ptype"
                                  id="cash_delivery_payment"
                                  value="cash_delivery_payment"
                                  required
                                />
                                <span className="checkmark"></span>
                                <label className="form-check-label" htmlFor="cash_delivery_payment">
                                  Cash on Delivery
                                </label>
                              </div>
                              &nbsp;&nbsp;
                              <div className="custom-radio">
                                <input
                                  className="form-check-input"
                                  type="radio"
                                  name="ptype"
                                  id="online_payment"
                                  value="online_payment"
                                />
                                <span className="checkmark"></span>
                                <label className="form-check-label" htmlFor="paypal_payment">
                                  Pay Online
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
                                    required
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
                                type="submit"
                                className="btn btn-secondary dark"
                                value="CheckOut"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </form>
              </main>
            </div>
          </div>
        </div>
      </div>

      <PublicFooter />
      <PublicScripts />
    </div>
  );
}

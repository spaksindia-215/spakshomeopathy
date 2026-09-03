import type { Metadata } from 'next';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { PublicScripts } from '@/components/layout/PublicScripts';
import { PublicStylesheets } from '@/components/layout/PublicStylesheets';
import { readAndClearSuccessOrderRow } from '@/lib/services/successOrderStash';

/**
 * `GET /order-placed` — mirrors `routes/web.php:88`
 * (`Route::get('order-placed','HomeController@OrderPlaced')`),
 * `HomeController@OrderPlaced` (`HomeController.php:433-436`):
 *
 *   public function OrderPlaced()
 *   {
 *     return view('order-placed');
 *   }
 *
 * ============================================================================
 * B-17 — REPRODUCED, NOT FIXED (contract NN-4/IR-9; task brief's explicit
 * instruction: "reproduce the crash, do not fix")
 * ============================================================================
 * `order-placed.blade.php` unconditionally dereferences `$row`
 * (`$row->name`, `$row->deliveryDate`, `$row->amount`, `$row->orderId`,
 * `$row->PayMode`, `$row->orderDate`, `$row->FullAddress`, `$row->PinCode`,
 * `$row->State`, `$row->Country`, `$row->HouseNo`, `$row->Landmark`,
 * `$row->mobile` — 13 distinct property accesses, verified directly) but
 * `OrderPlaced()` supplies NO view data at all. On real Laravel this
 * throws `ErrorException: Undefined variable: row` at the FIRST `{{$row->
 * name}}` expression — the framework's own Whoops/500 error page
 * (`APP_DEBUG=true` in production per `docs/M3-APPLICATION-MAPPING.md`
 * row #48).
 *
 * ONE PATH SUCCESSFULLY SUPPLIES `$row`: `SuccessOrder`
 * (`HomeController.php:488-564`, `POST /success-order`) returns
 * `view('order-placed', ['row'=>$row])` DIRECTLY — it does not redirect.
 * Reproducing that exact "POST returns page markup directly" shape is not
 * mechanically possible in this framework (a Next.js `route.ts` POST
 * handler cannot return page JSX — see
 * `src/lib/services/successOrderStash.ts`'s header for the full
 * reasoning), so `success-order/route.ts` stashes `$row`'s equivalent data
 * in a short-lived, signed, ONE-REQUEST cookie and redirects here — this
 * page reads (and immediately clears) that stash.
 *
 * THE B-17 CRASH IS STILL FAITHFULLY REPRODUCED FOR EVERY REQUEST SHAPE
 * THAT MATTERS: a bare `GET /order-placed` (no prior successful
 * `success-order` POST in this same browser) finds no stash and crashes —
 * exactly matching source's own OrderPlaced()'s unconditional
 * no-view-data behavior for a DIRECT hit (blueprint's own bucket label,
 * "`/order-placed` (direct hit)"). Only a request that JUST completed a
 * real `POST /success-order` in the same browser sees real content — the
 * SAME distinction source itself draws (SuccessOrder succeeds because it
 * supplies `$row` itself; OrderPlaced/`GET /order-placed` never does).
 */
export const metadata: Metadata = {
  title:
    'Online Shopping Site for Mobiles, Electronics, Furniture, Grocery, Lifestyle, Books & More. Best Offers!',
};

export default async function OrderPlacedPage() {
  const row = await readAndClearSuccessOrderRow();

  if (!row) {
    // Direct hit, no stash — reproduces B-17's crash. See file header.
    throw new Error(
      'B-17 (reproduced, not fixed): order-placed.blade.php dereferences ' +
        '$row, which HomeController@OrderPlaced never supplies on a direct ' +
        'GET /order-placed hit.'
    );
  }

  return (
    <div>
      <PublicStylesheets />
      <PublicHeader />

      <div className="breadcrumb-area mb-30">
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
                      Order
                    </li>
                  </ul>
                </nav>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="blog-area-wrapper pt-40 pb-70">
        <div className="container-fluid">
          <div className="row">
            <div className="col-lg-12 order-first order-lg-last">
              <div className="blog-wrapper-inner">
                <div className="single-blogg-item mb-30">
                  <div className="blogg-content">
                    <h5>Hi, {row.name}</h5>
                    <h5 className="alert alert-success">
                      Your order has been successfully placed.
                    </h5>

                    <div className="row">
                      <div className="col-lg-6 col-md-6">
                        <h5>Order Details</h5>
                        <p className="blog-desc">
                          <b>Delivery by:</b> {formatDMY(row.deliveryDate)}
                        </p>
                        <p className="blog-desc">
                          <b>Amount Payable:</b> ₹{row.amount}
                        </p>
                        <p className="blog-desc">
                          <b>Order Id:</b> #{row.orderId}
                        </p>
                        <p className="blog-desc">
                          <b>Payment Type:</b> {row.payMode}
                        </p>
                        <p className="blog-desc">
                          <b>Order Date:</b> {formatDMY(row.orderDate)}
                        </p>
                      </div>

                      <div className="col-lg-6 col-md-6">
                        <h5>Delivery Address</h5>
                        <p className="blog-desc">
                          <b>Address:</b> {row.fullAddress}, ({row.pinCode}), {row.state},{' '}
                          {row.country}
                        </p>
                        <p className="blog-desc">
                          <b>House No:</b> {row.houseNo}
                        </p>
                        <p className="blog-desc">
                          <b>Landmark:</b> {row.landmark}
                        </p>
                        <p className="blog-desc">
                          <b>SMS updates sent to: </b> {row.mobile}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <PublicFooter />
      <PublicScripts />
    </div>
  );
}

/** Mirrors Blade's `Carbon\Carbon::parse($x)->format('d M, Y')` used twice
 * in `order-placed.blade.php` (deliveryDate, orderDate). */
function formatDMY(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const day = date.getDate();
  const month = date.toLocaleString('en-US', { month: 'short' });
  const year = date.getFullYear();
  return `${day} ${month}, ${year}`;
}

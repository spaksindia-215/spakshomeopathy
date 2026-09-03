import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { PublicScripts } from '@/components/layout/PublicScripts';
import { PublicStylesheets } from '@/components/layout/PublicStylesheets';
import { requireBuyerSession } from '@/lib/auth/guard';
import { readAndClearFlash } from '@/lib/auth/flash';
import { getDb } from '@/lib/mongodb/client';
import { getBuyerManageOrdersView } from '@/lib/services/orderService';
import { encryptGroupId } from '@/lib/auth/orderToken';

/**
 * `/manage-orders` — ported from `manage-orders.blade.php` (verified
 * directly this session — line count varies with HTML whitespace, ~110
 * meaningful lines), `BuyerController@ManageOrders`
 * (`BuyerController.php:71-82`).
 *
 * DATA SOURCE: `getBuyerManageOrdersView()`
 * (`src/lib/services/orderService.ts`), the M4 buyer-orders slice's real
 * implementation of `ManageOrders`' 3-table join
 * (`orderproducts ⋈ products ⋈ orders`), buyer-filtered via
 * `orderProducts.buyerId` (the exact column source filters by), ordered
 * DESC to match `orderBy('orderproducts.id', 'DESC')`. See that
 * function's own header for the documented pagination gap (source
 * paginates 20/page; not implemented — no real `spaks_dev` buyer account
 * has enough order lines to reach it, verified this session).
 *
 * EMPTY STATE: source has NO explicit empty-state markup — `@foreach` over
 * zero rows simply renders zero `<tr>`s, leaving an empty `<tbody>` inside
 * a `<table>` with headers still shown. Reproduced identically: no "You
 * have no orders" message invented (contract: "do not invent behavior
 * where the Laravel source provides none").
 *
 * STATUS LABELS: `manage-orders.blade.php`'s exact 6-way `@if/@elseif`
 * chain over `OrderStatus` (0=Pending, 1=Confirm, 2=Shipped,
 * 3=Completed, 4=Refund, 5=Cancelled) reproduced verbatim, including its
 * own English ("Confirm" not "Confirmed", "Refund" not "Refunded") — not
 * corrected, per contract F-17/NN-4.
 *
 * CANCEL LINK: source renders `cancel-order?cncl_id={{encrypt($row->GroupId)}}`
 * ONLY when `OrderStatus` is 0, 1, or 2 (Pending/Confirm/Shipped) —
 * reproduced exactly, same three-way condition. `encrypt()` is replaced by
 * `encryptGroupId()` (`src/lib/auth/orderToken.ts`) — see that module's
 * header for why this is source-EQUIVALENT (same opacity/tamper-evidence
 * property) rather than byte-compatible with Laravel's own cipher, and
 * why that distinction doesn't matter here (no cross-system decode is
 * ever required).
 *
 * ROUTE PROTECTION: gated by `requireBuyerSession()`, mirroring
 * `routes/web.php`'s `checkBuyer` group (`manage-orders` is one of its
 * routes, `web.php:112`).
 */
export const metadata: Metadata = {
  title: 'Spakshomeopathy - Manage Orders',
  other: {
    'msapplication-TileColor': '#ffffff',
    'theme-color': '#ffffff',
  },
};

const STATUS_LABEL: Record<number, string> = {
  0: 'Pending',
  1: 'Confirm',
  2: 'Shipped',
  3: 'Completed',
  4: 'Refund',
  5: 'Cancelled',
};

const CANCELLABLE_STATUSES = new Set([0, 1, 2]);

export default async function ManageOrdersPage() {
  const session = await requireBuyerSession();
  const message = await readAndClearFlash('message');

  const db = await getDb();
  const rows = await getBuyerManageOrdersView(db, session.userId);

  return (
    <div className="page-wrapper">
      <PublicStylesheets />
      <PublicHeader />

      <div className="row">
        <div className="col-12">
          <div className="breadcrumb-wrap">
            <nav aria-label="breadcrumb">
              <ul className="breadcrumb">
                <li className="breadcrumb-item">
                  <Link href="/">Home</Link>
                </li>
                <li className="breadcrumb-item active" aria-current="page">
                  My Orders
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </div>

      <section className="cart-section sec-pad pb-0">
        <div className="container">
          <div className="inner-container">
            {message !== null && <div className="alert alert-success">{message}</div>}

            <table className="table table-bordered">
              <thead>
                <tr>
                  <th style={{ width: '10%' }}>S.No</th>
                  <th style={{ width: '10%' }}>Transection Id</th>
                  <th style={{ width: '25%' }}>Product Title</th>
                  <th style={{ width: '10%' }}>quantity</th>
                  <th style={{ width: '10%' }}>Sell Price</th>
                  <th style={{ width: '10%' }}>Total Price</th>
                  <th style={{ width: '25%' }}>Order Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={row.orderLineLegacyId}>
                    <td>{index + 1}</td>
                    <td>{row.qrTransectionId}</td>
                    <td>
                      {row.productSlug ? (
                        <a
                          href={`/product-details/${row.productSlug}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {row.productName}
                        </a>
                      ) : (
                        row.productName
                      )}
                    </td>
                    <td>{row.quantity}</td>
                    <td>₹{row.sellPrice}</td>
                    <td>₹{row.totalPrice}</td>
                    <td>
                      {row.orderStatus !== null && (
                        <button className="btn btn-info">
                          {STATUS_LABEL[row.orderStatus] ?? row.orderStatus}
                        </button>
                      )}
                      {row.orderStatus !== null && CANCELLABLE_STATUSES.has(row.orderStatus) && (
                        <a
                          href={`/cancel-order?cncl_id=${encodeURIComponent(encryptGroupId(row.groupId))}`}
                          className="btn btn-danger"
                        >
                          Cancel?
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="result"></div>
          </div>
        </div>
      </section>
      <br />
      <br />

      <PublicFooter />
      <PublicScripts />
    </div>
  );
}

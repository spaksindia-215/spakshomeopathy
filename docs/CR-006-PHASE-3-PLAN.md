# CR-006 Phase 3 — Implementation Plan: Orders (migration, not new product)

**Status:** 📋 PLAN ONLY — awaiting explicit "Proceed with Phase 3" approval,
matching the Phase 2 process. Nothing in this document has been
implemented.
**Depends on:** `CR-006-ANALYSIS-PHASE1.md` §1 (Orders correction, approved),
`GATE-REPORT-CR006-PHASE-2.md` (Phase 2 complete), owner's phase-order
approval (2026-09-12).
**Scope:** Port the existing Laravel admin order-management screens
(list, detail, ship, cancel, seller-orders, payments, appointments) to
Next.js. This is migration work — no new business logic, no new status
values, no "better" workflow. Every defect/asymmetry in the current
Laravel behavior is preserved, not fixed.

---

## 0. A design fork this plan surfaces rather than decides silently

Inspection this phase found that **the admin surface today is a mix of two
conventions**:

- 23 of 39 currently-ported `(shell)` admin pages read from `@/lib/demo`
  (a curated, static fixture — not live MongoDB).
- The order data itself, however, already has a **fully live**, carefully
  documented MongoDB implementation on the **buyer** side:
  `OrderRepository`/`OrderProductRepository`/`PaymentRepository`
  (`src/lib/mongodb/repositories/orderRepository.ts`) and a service layer
  over them (`src/lib/services/orderService.ts`, e.g.
  `getBuyerManageOrdersView`, `getBuyerOrderDetail`, `cancelBuyerOrder`).
  These already implement the exact 3-collection reconstruction Laravel's
  admin `ManageOrders`/`ViewOrder` also need, including the documented
  P-03 status-asymmetry and the exact field names/types (`orders.SellPrice`
  as a string vs. `orderProducts.sellPrice` as a number, etc.).

**Recommendation (not self-authorized — flagged for confirmation in §12):**
build the admin order pages **live**, reusing the existing repositories and
extending `orderService.ts` (or a sibling `adminOrderService.ts`) with
admin-shaped functions — rather than adding order data to the `@/lib/demo`
fixture. Reasons:
1. Reuses real, already-approved, already-tested infrastructure instead of
   duplicating it as static fixture data (directly serves the "identify
   reusable components" instruction).
2. The order data's row/document-level fidelity (P-03's asymmetry, the
   string/number type mismatches) is exactly the kind of subtle behavior a
   hand-written demo fixture would be likely to flatten or lose; the live
   repositories already encode it correctly.
3. Demo-fixture pages exist because most other admin modules (products,
   categories, blog) don't yet have an approved live-migration slice for
   their own collections — Orders is different: its live layer already
   exists and was built for exactly this purpose.

If this recommendation is not what's wanted, the alternative (demo-fixture
order pages, matching the majority convention) is described as Option B in
§12 and this plan is revised before implementation begins.

---

## 1. Files to create

Assuming the live-data recommendation in §0 (revise per §12 if Option B is
chosen instead):

| File | Purpose |
|---|---|
| `src/lib/services/adminOrderService.ts` | New service functions: `getAdminOrderListView` (mirrors `AdminController::ManageOrders` — all orders, `orderproducts` join `products`, unpaginated, DESC), `getAdminOrderDetail` (mirrors `ViewOrder` — join `orderproducts`+`products`+`users`+`buyer_profile`), `getSellerOrdersView` (mirrors `SellerOrders`), `shipOrder` (mirrors `ChangeOrderStatus` — writes `orderProducts.orderStatus=3` ONLY, preserving the documented asymmetry), `adminCancelOrder` (mirrors `CancelOrder` — writes `orders`/`orderProducts`=5, `payments`=4, preserving P-03's mismatch verbatim; **no ownership check**, matching source exactly — this is an admin action over any order, unlike the buyer path's owner-scoped `cancelBuyerOrder`). Reuses `OrderRepository`/`OrderProductRepository`/`PaymentRepository`/`getOrderByGroupId` — no new repository class. |
| `src/lib/services/adminPaymentService.ts` | `getAdminPaymentsView` (mirrors `ManagePayment`, the singular, ROUTED method — explicitly NOT the dead unrouted `ManagePayments` plural, per `CR-006-ANALYSIS-PHASE1.md` §1's note), `getSellerPaymentsView` (mirrors `SellerPayment`), `updatePaymentStatus` (mirrors `ChangePaymentStatus` — sets `payStatus=2` and `payDate` to today, formatted `d M, Y` to match source's `date('d M, Y')`). |
| `src/lib/services/adminAppointmentService.ts` | `getAppointmentsView` (mirrors `ManageAppointment` — read-only, `tbl_appointment`, DESC, unpaginated). Read-only per source; no write method, since none exists in Laravel. |
| `src/app/admin/(shell)/order-list/page.tsx` | Ports `admin/order-list.blade.php`. Uses `getAdminOrderListView`. |
| `src/app/admin/(shell)/view-order/[orderId]/page.tsx` | Ports `admin/view-orders.blade.php`. Route param name `orderId` preserved even though the Laravel method's own internal variable is `$OrderPid` (a cosmetic source mismatch, no behavioral effect — see M3 catalog row #138). |
| `src/app/admin/(shell)/seller-orders/[sid]/page.tsx` | Ports `admin/seller-orders.blade.php` (titled "Order List" in source, per M3 catalog — reproduced verbatim, not corrected). LIVE-orphan per M3 catalog (no sidebar link) — built but not linked from the sidebar, matching source exactly (§6, open item confirmed resolved as "port but don't add a sidebar link Laravel itself never had"). |
| `src/app/admin/(shell)/manage-payments/page.tsx` | Ports `admin/manage-payments.blade.php`. |
| `src/app/admin/(shell)/seller-payments/[sid]/page.tsx` | Ports `admin/seller-payments.blade.php`. LIVE-orphan, same treatment as seller-orders. |
| `src/app/admin/(shell)/appointment-list/page.tsx` | Ports `admin/manage-appointment.blade.php`. Read-only list, no action column (source has none). |
| `src/app/admin/change-order-status/route.ts` | `GET` handler (source route is a GET despite being a state-changing action — preserved, per contract NN-3 "POST-action-like (GET)" pattern already used elsewhere in this codebase, e.g. `cancel-order`). Calls `shipOrder`, redirects back with the exact flash message `'Order shipped successfully!!'`. |
| `src/app/admin/cancel-order/route.ts` | `GET` handler. Calls `adminCancelOrder`. Redirects back with `'Order cancelled successfully!!'`. **Named distinctly from the existing public `src/app/cancel-order/route.ts`** (buyer-side, already built) — this is a separate file under `src/app/admin/`, not a shared route, exactly mirroring Laravel's two separate `cancel-order` routes (one in `web.php` → `BuyerController@CancelOrder`, one in `admin.php` → `AdminController@CancelOrder`, confirmed as genuinely different controller methods with different write behavior in `CR-006-ANALYSIS-PHASE1.md` §1). |
| `src/app/admin/change-payment-status/route.ts` | `GET` handler. Calls `updatePaymentStatus`. |
| `tests/services/adminOrderService.test.ts`, `tests/services/adminPaymentService.test.ts`, `tests/services/adminAppointmentService.test.ts` | Unit tests for the three new service files, following the existing `tests/services/enquiryService.test.ts`/`appointmentService.test.ts` pattern. |

## 2. Files to modify

**None**, if `AdminSidebar.tsx`'s existing `/admin/order-list` link is
already correctly pointed (confirmed in Phase 1 analysis — it is). No
existing route, component, or service file needs to change to add these
new, additive pages. `seller-orders`/`seller-payments` are deliberately
**not** added to the sidebar, matching Laravel's own LIVE-orphan status for
those two screens.

## 3. Routes

All new, additive, matching Laravel's exact URL structure 1:1 (contract
O-5, preserve SEO/URL surface — admin routes aren't indexed, but the
principle of not inventing new paths still applies):

```
GET  /admin/order-list
GET  /admin/view-order/{orderId}
GET  /admin/seller-orders/{sid}
GET  /admin/change-order-status   (POST-action-like GET, per source)
GET  /admin/cancel-order          (POST-action-like GET, per source)
GET  /admin/manage-payments
GET  /admin/seller-payments/{sid}
GET  /admin/change-payment-status (POST-action-like GET, per source)
GET  /admin/appointment-list
```

No route is renamed, restructured, or given query-string/REST conventions
Laravel doesn't already use.

## 4. APIs

No new JSON/AJAX API. Every "API" here is a traditional GET-triggered
Server Action-equivalent (a Next.js Route Handler returning a redirect),
matching Laravel's own non-AJAX, full-page-redirect pattern for these five
actions. No client-side fetch, no new API contract.

## 5. Database impact

**Zero new collections, zero schema changes.** All three collections
(`orders`, `orderProducts`, `payments`) and their schemas
(`orderSchema`/`orderProductSchema`/`paymentSchema`) already exist,
already validated, already used by the buyer-side flow. Phase 3 adds
**read queries and two status-update writes** against existing, already-
approved schemas — no `Zod` schema changes, no new field, no index change.

`tbl_appointment`'s MongoDB equivalent: **needs to be confirmed to already
exist** before implementation — flagged as a pre-condition in §11/§12, not
assumed.

## 6. Authentication changes

**None.** Every new page/route calls the existing, unmodified
`requireAdminSession()` (from Phase 2's onward-compatible design, this is
composed with `requirePermission(session, PERMISSIONS.ORDERS_VIEW)` /
`PERMISSIONS.ORDERS_UPDATE` — see §7).

## 7. RBAC wiring (first real use of Phase 2's mechanism)

This is the first phase to actually call `requirePermission()`:

- `order-list`, `view-order/[orderId]`, `seller-orders/[sid]`,
  `manage-payments`, `seller-payments/[sid]`, `appointment-list` →
  `requirePermission(session, PERMISSIONS.ORDERS_VIEW)`
- `change-order-status`, `cancel-order`, `change-payment-status` →
  `requirePermission(session, PERMISSIONS.ORDERS_UPDATE)`

Since the only role reachable today is the implicit `SUPER_ADMIN` (Phase 2
design), this has **no observable effect on the current single admin
account** — it passes every check, exactly as it does today without any
check at all. This wiring exists so Phase 9's real roles (e.g.
`ORDER_MANAGER`) work correctly the moment they become assignable, without
revisiting these routes again.

## 8. Risks

| Risk | Mitigation |
|---|---|
| Confusing the two, genuinely different `cancel-order` behaviors (buyer: unconditional 4/4/4 + ownership check; admin: 5/5/4 mismatch + no ownership check) | Kept as two entirely separate files/functions (`cancelBuyerOrder` untouched; new `adminCancelOrder` in a new file) — never merged into one parametrized function, which would risk one path's behavior leaking into the other. |
| Silently "fixing" the ship-only-updates-`orderProducts` asymmetry or the cancel 5/5/4 mismatch because it looks like a bug | Explicitly preserved per contract's defect-preservation mandate and this CR's own Phase 1 analysis §1 — call sites and tests assert the exact per-collection values, not "consistent" ones. |
| `tbl_appointment`'s Mongo equivalent not actually existing yet | Must be verified against `src/lib/mongodb/collections.ts`/`schemas/` before writing `adminAppointmentService.ts` — if absent, this single sub-item (Appointments) is deferred to its own follow-up within Phase 3, not blocking the rest. |
| Building on the recommendation in §0 without confirmation | Explicitly gated — see §12. |
| Seller-orders/seller-payments being LIVE-orphan pages could be mistaken for "should get a sidebar link since we're already here" | Explicitly not added to the sidebar — matches Laravel exactly; scope creep resisted here on purpose. |

## 9. Testing

- Unit tests for all three new service files (list/detail assembly,
  status-write field-level correctness — asserting the exact asymmetric
  values, not just "some update happened").
- Full existing suite re-run after implementation (524 tests today) to
  confirm zero regression, same as Phase 2's gate report.
- Typecheck + lint clean, same bar as Phase 2.

## 10. Existing functionality that remains untouched

- Buyer-side order flow (`manage-orders`, `view-order/[orderId]`,
  `cancel-order` at the public route) — completely unaffected; no shared
  file is modified, only new admin-specific files added.
- `orderRepository.ts`'s existing exports — used, not modified.
- Every other currently-ported admin module (products, categories, blog,
  sliders, herbs, pincodes, enquiries, users) — untouched.
- Phase 2's RBAC files — used (per §7) but not modified.
- `product_variations` — not referenced (requirement carried over from
  Phase 2's constraints, still applicable).
- `PublicHeader.tsx`/`PublicFooter.tsx`/`AdminSidebar.tsx` (CR-001 §24.5)
  — untouched; `AdminSidebar.tsx`'s existing "Manage Orders" link needs no
  edit since it already points at the right URL.

## 11. Pre-implementation confirmations needed (small, factual — not scope questions)

1. Confirm `tbl_appointment`'s MongoDB collection/schema already exists
   (expected, since M3-A's scope reportedly covered it) — if not, scope
   Appointments out of this phase's first pass rather than inventing a new
   collection unapprovedly.
2. Confirm `products.legacyId` join keys used by the new admin queries
   behave the same way the existing buyer-side `orderService.ts` already
   assumes (should be trivially true, reusing the same repository) —
   sanity check, not new design.

## 12. Decision needed before implementation

**§0's fork:** confirm Option A (live MongoDB, reusing/extending
`orderService.ts`-style repositories — this plan's default) vs. Option B
(demo-fixture data added to `@/lib/demo`, matching the majority of
currently-ported admin pages, deferring live wiring to a later,
separately-scoped slice). This plan is written for Option A; switching to
Option B would change §1's file list materially (no new service files;
instead, order/payment/appointment fixtures added to `@/lib/demo`) and
should be confirmed rather than assumed.

---

**Awaiting explicit "Proceed with Phase 3" (and resolution of §12) before
any file listed in §1 is created.**

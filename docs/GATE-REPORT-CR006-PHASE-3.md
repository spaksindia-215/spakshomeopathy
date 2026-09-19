# GATE REPORT — CR-006 Phase 3 (Orders — migration, not new product)

**Status:** ✅ COMPLETE — implemented per `docs/CR-006-PHASE-3-PLAN.md`
(Option A, live MongoDB, confirmed by owner 2026-09-12), with one
in-flight correction recorded in full (§6).
**Next step:** Awaiting separate, explicit approval before Phase 4
(Catalog core + disease/`tbl_homeopathy` CRUD). No Phase 4 work has begun.

---

## 1. What changed

Ported the existing Laravel admin order/payment/appointment screens to
Next.js, reusing the already-existing live MongoDB order infrastructure
(`OrderRepository`/`OrderProductRepository`/`PaymentRepository`,
`AppointmentRepository`, `ProductRepository`, `UserRepository`) — no new
repository class, no new collection, no new schema.

**New service files (3):**
- `src/lib/services/adminOrderService.ts` — `getAdminOrderListView`,
  `getSellerOrdersView`, `shipOrder`, `adminCancelOrder`,
  `getAdminOrderDetail`
- `src/lib/services/adminPaymentService.ts` — `getAdminPaymentsView`,
  `getSellerPaymentsView`, `updatePaymentStatus`
- `src/lib/services/adminAppointmentService.ts` — `getAdminAppointmentsView`
  (read-only, matching source's own lack of a write route)

**New pages/routes (10):**
- `/admin/order-list`, `/admin/view-order/[orderId]`,
  `/admin/seller-orders/[sid]`, `/admin/manage-payments`,
  `/admin/seller-payments/[sid]`, `/admin/appointment-list`
- `/admin/change-order-status`, `/admin/cancel-order` (admin-specific,
  kept separate from the pre-existing buyer `/cancel-order`),
  `/admin/change-payment-status`

**New tests (4 files, 26 tests):**
`tests/services/adminOrderService.test.ts` (11),
`tests/services/adminPaymentService.test.ts` (3),
`tests/services/adminAppointmentService.test.ts` (2), plus the
`getAdminOrderDetail` cases added to the first file.

**New docs (2):** `docs/CR-006-PHASE-3-BUYER-PROFILE-GAP.md` (see §6),
this gate report.

**No existing file was modified** — confirmed by mtime check against
every reused/protected file (`session.ts`, `guard.ts`, `authService.ts`,
`orderService.ts`, `orderRepository.ts`, `userRepository.ts`,
`productRepository.ts`, `schemas/user.ts`, `schemas/order.ts`,
`PublicHeader.tsx`, `PublicFooter.tsx`, `AdminSidebar.tsx`,
`(shell)/layout.tsx`) — all predate this session.

## 2. Preserved defects (verified, not "fixed")

- `shipOrder` writes `orderProducts.orderStatus=3` only — `orders` is
  never touched on ship, a real asymmetry versus cancel.
- `adminCancelOrder` writes `5` to `orders`/`orderProducts` but `4` to
  `payments` (P-03's documented mismatch) — preserved verbatim, both
  values asserted independently in tests, not normalized.
- Admin cancel/ship perform **no ownership check** (any admin can act on
  any order) — matches source exactly; the buyer-side path's
  owner-authorized ownership check is not applied here, since it belongs
  to a different controller method with different, correct-for-its-role
  behavior.
- `admin/seller-orders.blade.php`'s and `admin/seller-payments.blade.php`'s
  page-title mislabels ("Order List" / "Manage Sellers" respectively,
  copy-paste artifacts from other views) reproduced verbatim.
- `seller-orders`' independently-diverging status-label mapping
  (4=Cancelled/5=Refund, swapped versus `order-list`'s own
  4=Refund/5=Cancelled) reproduced exactly, not unified.
- The dead, unrouted `ManagePayments` (plural) method was **not** ported —
  only the real, routed `ManagePayment` (singular).
- `payId` is sent unencrypted in `change-payment-status`'s query string,
  matching source exactly (unlike `order_id`/`cncl_id`, which source does
  encrypt) — not "fixed" to be consistent.

## 3. What was tested

| Check | Result |
|---|---|
| `npm run typecheck` | ✅ Clean |
| `npm run lint` | ✅ 0 errors, 4 pre-existing warnings (unrelated files, unchanged since Phase 2) |
| `npx prettier --check` on all new/changed files | ✅ Clean (after one `--write` pass corrected initial formatting on 4 files) |
| `npx vitest run` — full suite | ✅ **540/540 passed, 60/60 test files** — zero regressions |
| Protected-file mtime check | ✅ Every reused file (auth, session, existing repositories/schemas, `PublicHeader`/`PublicFooter`/`AdminSidebar`) predates this session |

## 4. Files changed

**Created (17):** 3 service files, 9 page/route files (order-list,
view-order/[orderId], seller-orders/[sid], manage-payments,
seller-payments/[sid], appointment-list, change-order-status, cancel-order,
change-payment-status), 4 test files, 2 docs (buyer-profile-gap record,
this gate report — 1 additional Phase 3 planning doc was created in the
prior turn).

**Modified:** none.

**Deleted:** none.

## 5. RBAC wiring (first real use of Phase 2's mechanism)

Every new page/route calls `requireAdminSession()` (unchanged) composed
with `requirePermission(session, PERMISSIONS.ORDERS_VIEW)` (read pages) or
`PERMISSIONS.ORDERS_UPDATE` (the three write routes). Per Phase 2's
design, the current single admin account resolves to the implicit
`SUPER_ADMIN` and passes every check — **no observable behavior change**
for that account. This is the intended first real exercise of the
mechanism Phase 2 shipped unused.

## 6. Correction made during this phase (disclosed in full)

Mid-implementation, `view-order/[orderId]`'s data dependency
(`buyer_profile`, for shipping-address fields) was reported as missing —
"no MongoDB schema, collection, or repository for `buyer_profile` exists
anywhere in this codebase." Based on that report, the owner approved
building the rest of Phase 3 now and deferring `view-order/[orderId]` to
a follow-up.

**That report was wrong.** `buyer_profile` is already modeled — embedded
as an optional `buyerProfile` field on the `users` document
(`schemas/user.ts`), per an existing DR-01-style decision
(`docs/M3-DATABASE-MAPPING.md` §1.1) predating this phase entirely. The
original search checked only for a standalone schema file/repository
class and missed the embedded field. Once found, `getAdminOrderDetail()`
and the `view-order/[orderId]` page were built in this same phase — no
new persistence, route, or schema was actually needed, so no further
owner authorization was required once the correction was confirmed.

Full record, including the original incorrect statement verbatim, is in
`docs/CR-006-PHASE-3-BUYER-PROFILE-GAP.md`, per this project's
append-and-correct (never silently erase) convention. `seller-orders`'
pre-existing "View" link, which always pointed at this URL, now resolves
instead of 404ing.

## 7. Files intentionally left untouched

- Buyer-side order flow (`/manage-orders`, `/view-order/[orderId]`
  at the public route, `/cancel-order` at the public route) — completely
  unaffected; the admin `/admin/cancel-order` is a separate file with
  separate behavior, never merged with the buyer one.
- Every other currently-ported admin module (products, categories, blog,
  sliders, herbs, pincodes, enquiries, users) — untouched.
- `AdminSidebar.tsx` — no edit needed; its pre-existing "Manage Orders"
  link now simply resolves instead of 404ing.
- `PublicHeader.tsx`/`PublicFooter.tsx` (CR-001 §24.5) — untouched.
- `product_variations` — not referenced anywhere in this phase.
- No new database collection, index, or migration.
- No dependency added — `package.json`/`package-lock.json` untouched.

## 8. Limitations / known gaps carried forward

- Unpaginated lists (order-list, manage-payments, appointment-list) —
  matches source's own P-15 limitation; not "improved."
- `seller-orders`/`seller-payments` are reachable but deliberately not
  linked from the sidebar, matching Laravel's own LIVE-orphan status for
  those two screens.
- No git repository exists in this project (confirmed at Phase 2's gate
  report and unchanged since); mtime + grep + full-suite-pass is the
  available substitute for a diff review.

---

**Awaiting explicit approval before Phase 4 (Catalog core: product
categories/products extension, disease/`tbl_homeopathy` CRUD). No Phase 4
work has begun.**

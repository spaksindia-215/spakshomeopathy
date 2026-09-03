# M4-PREP — Application-Layer Migration Preparation

**Status:** Architecture + three small, independently verifiable slices.
**No MongoDB connection was made.** **No Laravel source was modified.**
**No admin/auth/payment/checkout was implemented.**
**Date:** 2026-08-20
**Builds on:** `docs/GATE-REPORT-M3C.md` (M3-C's Atlas tooling, deferred
by the owner, untouched here), `docs/M3-APPLICATION-MAPPING.md`,
`docs/M3-MONGODB-ARCHITECTURE.md`, `docs/M3-OWNER-DECISION-RECORDS.md`,
the existing `src/lib/mongodb/repositories/` layer built in M3-A.

---

## 1. Objective

The owner deferred the real Atlas connection/migration indefinitely
(`M3-C ATLAS EXECUTION — DEFERRED`, 2026-08-20) but asked the
Laravel→Next.js migration to keep moving at the application-architecture
level: build the repository/service scaffolding so MongoDB can be plugged
in later without redesigning anything, using small, independently
verifiable slices — not a full 172-route migration.

This phase does not connect to MongoDB, does not touch Laravel source, and
does not implement authentication, payment, checkout, or admin
functionality. It extends the existing M3-A repository pattern
(`src/lib/mongodb/repositories/`) with two new repositories, adds the
codebase's first service layer (`src/lib/services/`) with three
functions, and documents a small, representative slice of the
Laravel→Next.js route mapping.

---

## 2. The three slices, and why these three

| Slice | Mirrors | Route(s) | New files |
|---|---|---|---|
| Enquiry submission | `HomeController@saveEnq` (`public_html/app/Http/Controllers/HomeController.php:316-342`) | `POST /save-enquiry` (M3 row #15) | `EnquiryRepository`, `enquiryService.ts` |
| Appointment booking | `HomeController@SaveAppointment` (`HomeController.php:829-838`) | `POST /save-appointment` (M3 row #55) | `AppointmentRepository`, `appointmentService.ts` |
| Buyer order read-reconstruction | `BuyerController@ManageOrders`/`ViewOrder` (`BuyerController.php:71-91`) | `GET /manage-orders`, `GET /view-order/{orderId}` (M3 rows #58/#59) | `orderService.ts` only — no new repository, reuses the existing `OrderRepository`/`getOrderByGroupId`/`getOrderGroupIdsForBuyer` |

**Why these three:** enquiries and appointments are the lowest-relationship
entities in the entire schema (zero foreign keys, confirmed in
`docs/M3-DATABASE-MAPPING.md` §1.5/§1.6) and both repositories were
already pre-named as "mechanical to add" in
`src/lib/mongodb/repositories/index.ts`'s own comment before this phase.
The order slice directly answers the owner's specific instruction #4
("pay special attention to orders/orderProducts/payments") without adding
any new collection, schema, or repository — it only adds a service that
composes what M3-A already built and tested.

**Rejected for this phase (too broad for "small slices"):** posts/blog
(pagination + two joined collections), sliders (P-18 — intentionally
unused by the live homepage, no real workflow to mirror), the full
checkout/payment write path, and all 102 admin routes.

---

## 3. Source-behavior fidelity notes

### Enquiry (`enquiryService.submitEnquiry`)

Verified directly against `public_html/` (the current authoritative
Laravel export) this phase:

```php
$validatedData = $req->validate(['name'=>'required','email'=>'required','subject'=>'required']);
$data=array('name'=>$name,'email'=>$email,'subject'=>$subject,'message'=>$message);
DB::table('enquiries')->insert($data);
Mail::send('enquiry-email', $data2, ...);
```

- Exactly `name`/`email`/`subject` are required; `message` is not.
- `phone` is never read from the request at all — this is P-01 (Preserved
  Defect Register). `submitEnquiry` has no `mobile`/`phone` parameter on
  its input type at all, and hardcodes `mobile: null` on every insert —
  the caller cannot make it persist a phone number, because Laravel's own
  handler can't either.
- `Mail::send(...)` is **not implemented**. This is a documented boundary,
  not an oversight — see §5 below.

### Appointment (`appointmentService.bookAppointment`)

```php
$data=array('name'=>$name,'age'=>$age,'gender'=>$gender,'phone'=>$phone,
            'appointment_date'=>$appointment_date,'consultant_hour'=>$consultant_hour);
$saveData=DB::table('tbl_appointment')->insert($data);
```

There is **no `$req->validate(...)` call anywhere in this method** —
verified directly. `bookAppointment` preserves this exactly: it performs
no validation of its own and never throws for a missing/empty field. This
is a deliberate inversion of normal service-layer instinct, called out
explicitly in the file's own header comment and in
`tests/services/appointmentService.test.ts`'s own comments, so a future
contributor does not "helpfully" add validation Laravel never had (that
would be exactly the kind of unauthorized validation-tightening contract
F-12 forbids).

### Order read-reconstruction (`orderService.ts`)

`getBuyerOrderGroupIds` wraps the existing `getOrderGroupIdsForBuyer` —
**documented scope gap:** the real `ManageOrders` query is a 3-table join
(`orderproducts ⋈ products ⋈ orders`) with sorting and pagination; the
wrapped function returns only distinct GroupIds, no product join, no sort,
no pagination. Extending it to fully match `ManageOrders`' output shape is
real, additional work deliberately deferred — it would require pulling
`ProductRepository` into this file and designing pagination semantics not
yet touched anywhere in this codebase, which would exceed this phase's
"small slice" boundary.

`getBuyerOrderView` wraps the existing `getOrderByGroupId`. The real
`ViewOrder` route is cataloged **Broken (B-12)** in
`docs/M3-APPLICATION-MAPPING.md` — verified directly this phase: it joins
`products` on `orders.pid`, a column that does not exist (the real field
is `orders.ProductId`/`productId`). Every real request to that Laravel
route throws a SQL error. `getBuyerOrderView` deliberately does **not**
reproduce this crash: B-12 is a runtime join failure, not a
fidelity-relevant difference in output shape or calculation — there is no
"broken output" worth preserving, only a broken route that never
successfully returns anything to compare against. This choice is stated
plainly in `orderService.ts`'s file header, not silently made. If a future
phase disagrees, B-12 is where to revisit it.

---

## 4. DR-01 — flagged, not resolved, plus a discovered pre-existing contradiction

The owner's instruction for this phase ("keep orders/orderProducts/payments
as three separate collections; do not embed them") is consistent with, and
is treated here as, a decision in favor of **DR-01 Option B** for this
phase's implementation purposes (which was already the shape every
existing repository/schema in this codebase assumes). This document does
not edit `docs/M3-OWNER-DECISION-RECORDS.md` or mark DR-01 formally
resolved.

**A pre-existing contradiction was discovered this phase, not introduced
by it:** `docs/M3-OWNER-DECISION-RECORDS.md` states, in its own header,
"**No decision below is approved**" — DR-01 included. But
`src/lib/mongodb/schemas/order.ts`'s own header comment (written the same
day, ~7 minutes later per file timestamps) claims "DR-01 (**APPROVED**,
2026-08-16)". These two committed files disagree about DR-01's formal
status. Both already agree on the same shape (three separate collections),
so no code built this phase is affected either way — but this is flagged
here rather than silently resolved in either direction, per this project's
own "document contradictions, don't guess" rule. **Neither file was edited
by this phase.** A future phase should get the owner's formal, explicit
sign-off on DR-01 and correct whichever of the two documents is wrong.

---

## 5. Deferred to a later phase

### Full admin route → Next.js mapping

**Deferred entirely.** 102 admin routes exist (`docs/M3-APPLICATION-MAPPING.md`
§3). Even a mapping-only exercise (no implementation) at this level of
detail would exceed "small, independently verifiable slices." This is a
scope decision, not an oversight.

### Authentication — documentation only, nothing implemented

Current Laravel mechanism, briefly characterized (not deep-dived, per this
phase's own boundary):
- `Auth\LoginController@UserLogin` (`Auth/LoginController.php:18-79`,
  verified this phase): `Auth::attempt(['email','password','status'=>1])`,
  then a follow-up `users` query for `utype`-based role redirect
  (admin/seller/buyer branches, plus an `Auth::logout()` + "Wrong Login
  Details" fallback on role mismatch).
- `Auth\RegisterController@UserRegister` (`Auth/RegisterController.php:37-159`,
  not re-read line-by-line this phase, per `M3-APPLICATION-MAPPING.md`
  row #20): password hashing, `unique:users` validation, seller-branch
  file upload.

What already exists on the MongoDB side: `UserRepository.findByEmail`/
`.emailExists` (built M3-A) — an application-level uniqueness check, not a
database constraint (DR-04, still pending).

What's still missing, not built or decided this phase:
- Session/credential-store strategy — blocked on **DR-05** (session store:
  MongoDB `sessions` collection vs. Redis), still formally pending.
- Password-hash compatibility verification (bcrypt format reuse across a
  Laravel→Next.js boundary) — not investigated this phase.
- No decision made on NextAuth vs. a custom session mechanism.
- **Flagged, not investigated:** a duplicate pair of controllers exists at
  the top level of `app/Http/Controllers/` —
  `LoginController.php`/`RegisterController.php` — alongside the real,
  routed `Auth/LoginController.php`/`Auth/RegisterController.php`.
  Confirmed present on disk this phase (both timestamped identically to
  the rest of the `Controllers/` tree). Not read, not analyzed further —
  flagged here for whoever picks up auth work next.

### Payment / checkout — documentation only, nothing implemented

Current live checkout is `POST /product-checkout` → `HomeController@Checkout`
(M3 row #65), rendering `cart-checkout.blade.php` — **this is the actual
live checkout page despite its route name** (`/product-checkout`, not
`/checkout`, which is dead). Cart itself is session-based
(`darryldecode/cart`), with no MongoDB collection — `collections.ts`
already notes this explicitly ("no collection for cart — session-based").

What already exists on the MongoDB side: `OrderRepository`/
`OrderProductRepository`/`PaymentRepository` (read-only so far, built
M3-A), plus this phase's `orderService.ts` (read-only).

What's missing: a write-path service mirroring the real insert sequence
(`HomeController.php:711`/`:818` — a per-cart-line loop inserting one
`orderproducts` row and one `payments` row each, non-transactional,
matching DR-01's Option B shape). Payment-gateway (QR/offline) integration
specifics were not explored this phase — named as unexplored rather than
guessed at.

### UI wiring / frontend cutover

Not built. No page, route, or component consumes any service added this
phase. Confirmed by directory-listing sweep: no file under `src/app/` was
touched.

### Anything requiring a real MongoDB connection

No script, test, or new file constructs a `MongoClient` or calls
`.connect()` — confirmed by grep sweep (§8 below).

---

## 6. Test-label taxonomy

Every new test file states its label in its own header comment, in prose
— matching the existing `tests/mongodb/readBack.test.ts` convention.
Four labels total, per the owner's instruction:

| Label | Meaning | Used by any test in this repo? |
|---|---|---|
| `UNIT` | Pure function/logic, no I/O, no fake collection | Yes — the required-field/no-validation assertions in the new service tests |
| `FIXTURE` | Multiple units exercised together against an explicit, in-memory, clearly-labeled fake `Db`/`Collection` — never described as "integration" in the database sense | Yes — all new repository tests and the fake-`Db`-backed parts of the new service tests |
| `MONGODB-INTEGRATION — NOT AVAILABLE` | Reserved for a future phase with a real, reachable, non-production MongoDB target | **No test in this repository carries this label.** None will, until a real connection is authorized and available — out of scope this phase (the owner explicitly deferred Atlas execution) |
| `PRODUCTION — NOT TESTED` | Reserved, stated as permanently inapplicable | **No test uses this label.** Production is never a test target in this codebase's suite, by design — included here only so the 4-way taxonomy is documented completely |

---

## 7. Note on version control

This repository has no `.git` (confirmed: `git status` from the project
root returns "not a git repository"). File changes in this phase are
therefore verified by directory listing and file-modification-time
comparison (`find ... -newer package.json`), not `git diff` — the same
constraint every prior gate report in this project has worked under.

---

## 8. Verification performed this phase

| Check | Result |
|---|---|
| `npm run typecheck` | ✅ Pass, 0 errors |
| `npm run lint` | ✅ Pass, 0 errors |
| `npm run format:check` | ✅ Pass |
| `npm run test` | ✅ **178/178 pass** (164 existing + 14 new), 23 test files |
| `npm run build` | ✅ Pass, same 9 static routes, zero regression |
| Grep sweep: `MongoClient`/`.connect()` in any new file | ✅ Zero matches |
| `src/app/**` touched this phase | ✅ Zero files (directory-listing sweep, mtime comparison) |
| `public_html/**`, `spakshomeopathy.com/**` touched this phase | ✅ Zero files (mtime comparison) |
| `.env.local` touched this phase | ✅ Unchanged (mtime predates this phase's start) |
| `src/lib/mongodb/client.ts`, `environmentGuard.ts` touched this phase | ✅ Zero — not opened for editing at any point |

---

## 9. Files created / modified

See `docs/GATE-REPORT-M4-PREP.md` for the complete, itemized list.

---

*Companion documents: `docs/M4-NEXTJS-ROUTE-MAPPING.md`,
`docs/GATE-REPORT-M4-PREP.md`.*

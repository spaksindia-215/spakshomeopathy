# M3 — Owner Decision Records

**Status:** DECISION RECORDS ONLY. Nothing below is implemented. No option is selected.
**Date:** 2026-08-16
**Source:** Converts the 8 REQUIRES-OWNER-DECISION items consolidated in
`docs/GATE-REPORT-M3.md` §10 into individually reviewable decision records, per the
owner's instruction. Each record's underlying analysis was already established in
`docs/M3-DATABASE-MAPPING.md` and `docs/M3-MONGODB-ARCHITECTURE.md` — this document
restructures that analysis into the requested decision-record format; it does not
introduce new modeling reasoning beyond what those documents already established,
except where noted.

**Format per record:** Decision ID · What is being decided · Current Laravel behavior
· MongoDB options · Recommended option · Advantages · Risks · Effect on parity ·
Effect on existing data · Effect on rollback · What implementation depends on this.

**No decision below is approved.** Each is presented for owner review. Implementation
of any option requires separate, explicit approval per decision, per the owner's
standing instruction.

---

## DR-01 — Orders / OrderProducts / Payments MongoDB Shape

**This is the highest-stakes decision in this document and receives the most detailed
treatment, per the owner's explicit instruction.**

### What is being decided

How the three relationally-linked MariaDB tables `orders`, `orderproducts`, and
`payments` — unified only by a shared, non-FK-enforced `GroupId`/`gid` value — become
MongoDB collection(s).

### Current Laravel behavior (VERIFIED, re-confirmed against `public_html/` this
session and in `docs/M3-DATABASE-MAPPING.md` §1.4)

- **Order identity:** an order is not one row — it is the set of all `orders`,
  `orderproducts`, and `payments` rows sharing one `GroupId` value (on
  `orders`/`orderproducts`) / `gid` (on `payments`). `orders.id` is *not* the
  meaningful identity key.
- **`GroupId` generation:** `$GroupId = $GetGId->GroupId + 1` — a plain read-then-write
  against `orderproducts`, **zero transaction, zero lock**, in three separate code
  paths (`CartController.php:284`, `HomeController.php:684-685` [DEAD], and
  `HomeController.php:767-768` [LIVE — the actual QR-payment checkout path]).
- **One order → multiple `orderproducts` rows** (one per cart line) **and multiple
  `payments` rows** (also one per cart line, not per order — confirmed
  `HomeController.php:711/818`, each insert its own `payments` row inside the same
  per-line loop that creates the `orderproducts` row).
- **Order/product relationship:** `orderproducts.ProductId` → `products.id`, by
  convention only, no FK.
- **Payment linkage:** `payments.gid` = the order's `GroupId`; `payments.pid` =
  `products.id` (again, per line-item, not per order).
- **Order status:** exists independently at **three separate places** —
  `orders.OrderStatus`, `orderproducts.OrderStatus` (per line), `payments.orderStatus`
  (per payment record). **Confirmed inconsistency (P-03, already a registered
  Preserved Defect):** admin cancel writes status `5` to `orders`/`orderproducts` but
  `4` to `payments` — a deliberate-by-accident inconsistency that must be preserved,
  not corrected.
- **Totals/pricing:** `SellPrice`, `DeliveryCharge`, `TotalPrice` on `orderproducts`
  (per line); `amount`, `totalAmount`, `AdminFee`, `SellerPay`, `discount` on
  `payments` (also per line). `orders.TotalPrice` exists at the header level too — three
  places pricing data lives, not one.
- **Customer association:** `orders.CustId`, `orderproducts.BuyerId`, `payments.cid` —
  three separate columns, all meant to reference the same `users.id`, populated
  independently by each of the (also independent) insert statements.
- **Existing order-view behavior:** buyer's own order view
  (`BuyerController.php:75-76`, the ★ join) reconstructs an order via
  `orderproducts ⋈ orders ON GroupId`. Admin's order view does the equivalent via
  separate queries filtered by `GroupId`/`gid`, not a single join, in most admin
  methods (`AdminController.php:1340-1342` is the one 3-table join case; most others,
  e.g. cancel-order, use plain `WHERE GroupId = X` against each table independently).
- **Historical order data:** 20 orders / 22 order-lines / 21 payments exist today
  (VERIFIED, `docs/DATABASE-ANALYSIS-MARIADB-SOURCE.md` §8) — small enough that every
  single historical order can be individually, exhaustively verified after any
  migration, not merely count-checked.

### MongoDB options

| Option | Shape | What it changes about the write path |
|---|---|---|
| **A — One order document per `GroupId`**, embedded `lines[]` array (former `orderproducts` rows) and embedded `payments[]` array | Read-side: single-document fetch reconstructs an entire order. Write-side: **must change** — today's checkout writes N independent `orderproducts` inserts + N independent `payments` inserts in a loop; Option A requires assembling one document (all lines, all payments) before or during a single write |
| **B — Three separate collections** (`orders`, `orderProducts`, `payments`), each carrying `groupId`/`gid` exactly as today | Read-side: reconstruction requires N queries filtered by `groupId`, mirroring today's multi-query/join pattern exactly. Write-side: **unchanged in shape** — still N independent inserts into N collections, same loop structure as today, just against MongoDB instead of MariaDB |
| **C — Hybrid:** embed `lines[]` into the order document, keep `payments` as a separate collection referenced by `gid` | A middle position — payments have their own semi-independent admin workflows (`ChangePaymentStatus`, `SellerPayment`, both LIVE-orphan) that read/write payment status somewhat apart from the order-lines lifecycle |

### Recommended option

**This document recommends Option B, with a stated reason, not merely restates that
"no recommendation is given."** Reasoning:

1. **Option B requires zero write-path restructuring.** The existing checkout loop
   (create `GroupId`, then for each cart line insert one `orderproducts` row and one
   `payments` row) ports mechanically — the same loop, writing to MongoDB collections
   instead of MariaDB tables. Options A and C both require redesigning *when* and *how*
   the order document is assembled before writing, which is real, non-mechanical
   implementation work and a larger deviation from "port what exists" than Option B.
2. **Option B preserves P-03's three-independent-status-value inconsistency with zero
   structural awkwardness** — three collections, three independent status fields,
   exactly mirroring today's three independent `UPDATE` statements. Option A requires
   an intentionally-inconsistent value to live at two different nesting depths inside
   one document (order-level status vs. a payments-array-element's own status field),
   which is achievable but a more unusual document shape to maintain correctly over
   time.
3. **Option B does not foreclose adding embedding later** if a future,
   separately-approved change wants to optimize order-reconstruction reads — moving
   from B to A is a well-understood migration path; moving from A back to B (un-embedding)
   is comparatively more disruptive if the write-path assumptions have already been
   built around a single-document write.

**This is a recommendation, not a decision.** Option A's genuine advantage (below) is
real and may outweigh this reasoning depending on how much the owner values
read-simplicity over write-path mechanical fidelity.

### Advantages (per option)

| Option | Advantages |
|---|---|
| A | Simplest possible read — one document, no reconstruction logic needed anywhere (buyer order view, admin order view, order-status change, all become single-document operations). Could use MongoDB's native single-document atomicity to *reduce* (not eliminate — see Risks) the `GroupId` race condition, since all of one order's data would live in one document, one write |
| B | Zero write-path redesign — checkout logic ports almost line-for-line. Closest structural mirror to the existing tables, easiest to reason about against the existing controller code during implementation and testing. Keeps payments' semi-independent admin workflows naturally separable |
| C | Gets most of A's read-side simplicity for the order+lines case (the most common reconstruction need) while keeping B's flexibility for payments' separate admin workflows |

### Risks (per option)

| Option | Risks |
|---|---|
| A | Write-path redesign is real implementation work, not mechanical porting — increases the chance of a subtle behavioral deviation being introduced unintentionally during that redesign. P-03's status inconsistency becomes more awkward to keep faithfully broken. Using MongoDB's atomicity to *reduce* the GroupId race would itself be a behavior change requiring separate sign-off (per `docs/D-10-CUTOVER-ROLLBACK-STRATEGY.md` §6) — recommended here only as a possibility, not a decision |
| B | Reconstruction queries remain N-query operations, same performance/complexity profile as today (neither better nor worse — this is fidelity, not improvement, which is the project's actual goal) — listed as a "risk" only in the narrow sense that it does *not* capture MongoDB's potential advantages, which may be seen as a missed opportunity depending on the owner's priorities outside strict 1:1 fidelity |
| C | The most complex option to reason about — two different consistency/atomicity models (embedded array vs. separate collection) coexisting for what is logically one order, which could make future maintenance harder without a corresponding fidelity benefit over A or B individually |

### Effect on parity

All three options can achieve equivalent data-content parity (contract NN-6's
document-for-document standard, per `docs/D-11-DATABASE-ARCHITECTURE.md` §3) — none of
the three loses or alters what data is recorded, only how it is grouped for storage.
**P-16 (GroupId format) and P-17 (5% fee arithmetic) are unaffected by any of the three
— both are pure computed values, carried on whichever record shape stores order/payment
data, unaffected by document structure.**

### Effect on existing data

All 20 existing orders / 22 order-lines / 21 payments must be migrated under whichever
shape is chosen — the small count (per `docs/M3-DATA-MIGRATION-MAP.md` §3) means full,
individual verification is feasible and recommended regardless of which option is
picked, not merely a count check.

### Effect on rollback

Per `docs/D-10-CUTOVER-ROLLBACK-STRATEGY.md` §11, orders/payments already require the
strictest cutover treatment of any data category. **This decision does not change that
requirement under any option** — whichever shape is chosen, D-10's existing
recommendation (freeze checkout during the cutover window) still applies unchanged.
Option A's potential atomicity advantage (noted under Advantages) could, if separately
approved as a behavior change, marginally reduce the in-flight-order risk D-10 §11
already flags — but this is speculative and not a reason to choose A over B on its own.

### What implementation depends on this decision

**Everything involving order placement, checkout, buyer order history, admin order
management, and admin order cancellation** — no code in any of these areas can be
responsibly written until this decision is made, because the write-path shape (loop of
N inserts vs. one assembled-document write) is fundamentally different between Option B
and Options A/C.

---

## DR-02 — Vestigial-Table Placement (`product_features`, `product_variations`, `product_pkg`)

**What is being decided:** whether three tables with real legacy data (6,938 / 147 /
1,256 rows) but zero live read/write call sites become ordinary (if unused) MongoDB
collections, or are migrated to an archival/export location outside the operational
database.

**Current Laravel behavior (VERIFIED):** All three are read-only-or-zero-reference —
`product_features`/`product_variations` have data but no write call site found in any
live controller; `product_pkg` has zero call sites of any kind. None is deleted or
touched by any live code path today; the data simply sits, unused, in the live
MariaDB database.

**MongoDB options:**
1. Ordinary collections in the same MongoDB database, unused by any application code,
   mirroring today's exact status
2. Migrate to an archival export (e.g., a JSON/BSON dump, or a separate
   non-operational database) outside the live application's data model

**Recommended option:** Option 1 (ordinary, unused collections). Reasoning: requires
no separate archival tooling to build or maintain; keeps the migration mechanically
simple (every table becomes a collection, full stop, no exceptions); the data is
already effectively "archival" by virtue of being unused — moving it to a
*differently*-unused location adds process without changing outcome.

**Advantages:** Option 1 is simpler, requires no new tooling. Option 2 keeps the
operational database's active surface area smaller (a soft argument, not a
behavioral one).

**Risks:** Option 1 — none specific to fidelity; a future engineer might mistake an
unused-but-present collection for something that should be wired up (mitigated by
carrying forward the same "preserve non-use, don't wire it in" documentation this
project already applies to `slider`/P-18). Option 2 — archival tooling is itself new
work with its own correctness burden (a botched export is data loss, which NN-10
absolutely forbids), and re-integrating the data later (if ever needed) is harder from
an archive than from a live, if unused, collection.

**Effect on parity:** Neither option affects any live-observable behavior — by
definition, since nothing currently reads or writes these tables in the live
application.

**Effect on existing data:** Both preserve it (NN-10 requirement, non-negotiable);
they differ only in storage location.

**Effect on rollback:** None — this data is not written to during any live workflow,
so it has no bearing on the cutover/rollback concerns in `D-10-CUTOVER-ROLLBACK-STRATEGY.md`.

**What implementation depends on this decision:** Only the final collection-naming/
placement list — no functional code depends on this, since nothing reads or writes
these tables today.

---

## DR-03 — `pin_codes` BROKEN-Behavior Reproduction (B-09)

**STATUS: RESOLVED (2026-09-04, M5-E) — Option 2 selected.** See ADDENDUM 3
at the end of this document for the owner's decision, Fix Register entries
FIX-001/FIX-002, and implementation record. The analysis below is preserved
as originally written (append-only convention) and remains the correct
description of both options considered.

**What is being decided:** how (or whether) to reproduce the pincode admin CRUD's
existing SQL-column-mismatch failure (B-09) in a schemaless MongoDB target, where the
specific failure mode (writing to non-existent SQL columns) has no direct equivalent.

**Current Laravel behavior (VERIFIED, confirms blueprint's existing B-09
classification):** the controller writes columns (`pin_code`, `pin_address`) that do
not exist in the live `pin_codes` table (which has `pincode`, `location`, `country`,
`uid` instead) — every save throws a SQL error in production today.

**MongoDB options:**
1. **Reproduce the failure artificially** — add an application-level schema-validation
   check to the MongoDB write layer that specifically rejects the mismatched field
   names, manufacturing an equivalent-looking failure
2. **Treat this as an implicit Approved-Fix-Register candidate** — since the very
   concept that caused B-09 (a fixed SQL column list) no longer exists in the target
   architecture, ask whether the owner wants to simply let pincode saves work correctly
   now, formally approved via the existing Fix Register mechanism (contract §9.3)
   rather than reproduced as broken

**Recommended option:** **This document does not recommend between these two** — unlike
DR-01/DR-02, this is not a modeling-elegance question with a clear mechanical-fidelity
answer; it is a direct instance of contract §9.3's "Approved Fix Register" mechanism,
which exists specifically so the owner can choose to fix a BROKEN item with a
documented target behavior. Both options are legitimate; picking one is squarely a
business/product decision (does the owner want working pincode management, or an
exact behavioral fossil) that this document should not default on.

**Advantages:** Option 1 preserves perfect 1:1 fidelity to a fault, matching this
project's overall mandate strictly. Option 2 gives the business a working feature at
essentially zero extra engineering cost (the "fix" is simply *not* introducing an
artificial failure), since a schemaless store naturally wouldn't reproduce this bug
unless deliberately made to.

**Risks:** Option 1 requires *building* broken behavior deliberately — genuinely
unusual, and a future engineer unfamiliar with this project's contract could
reasonably (if wrongly) "fix" the artificial validation check, silently undoing the
intended reproduction. Option 2 is technically an unauthorized-until-approved
behavior change under contract IR-9 unless formally logged via §9.3 first — this
document flags that the *decision itself*, if made, needs that formal Fix Register
entry, not just an implementer's judgment call.

**Effect on parity:** Option 1 preserves D7 (failure parity) exactly. Option 2 is a
deliberate, contract-sanctioned deviation from D7 for this one specific item, valid
only with the formal Fix Register entry.

**Effect on existing data:** Neither affects the table's 1 existing row, which
migrates identically either way (`docs/M3-DATA-MIGRATION-MAP.md` §6).

**Effect on rollback:** None — pincode admin CRUD is not part of any customer-facing
checkout/order flow and has no bearing on D-10's cutover concerns.

**What implementation depends on this decision:** Only the pincode admin CRUD pages
(add/edit/list) — a small, isolated, admin-only surface.

---

## DR-04 — `users.email` Unique Index

**What is being decided:** whether to add a unique index on `users.email` in MongoDB,
given that no such index exists in the current MariaDB schema (email uniqueness is
enforced only at the *application* level, via Laravel's `unique:users` validation
rule in `Auth\RegisterController`).

**Current Laravel behavior (VERIFIED):** no database-level unique constraint on
`users.email` exists anywhere in the schema (confirmed,
`docs/DATABASE-ANALYSIS-MARIADB-SOURCE.md` §5). Uniqueness is enforced purely by an
application-level validation check before insert.

**MongoDB options:**
1. Add a unique index — purely additive infrastructure, cannot change result sets for
   already-valid (non-duplicate) data
2. No index — application-level uniqueness check only, exactly mirroring current
   MariaDB behavior

**Recommended option:** Option 1, with an explicit caveat. Reasoning: this mirrors
contract §5.3's own MariaDB-case precedent (additive, non-unique indexes are
pre-approved because they cannot change result sets) — but §5.3's language explicitly
says "no unique indexes" for the MariaDB target, and it is not established in this
document *why* that restriction existed (avoiding a new failure mode under concurrent
writes, versus avoiding exposure of latent duplicate-email rows that might already
exist in production, versus a general caution against exceeding pure fidelity). Until
that "why" is known, recommending Option 1 carries a real caveat: **if duplicate emails
already exist in the live 819-user dataset (unchecked, not verified in this
document), a unique index would cause the migration itself to fail** on the duplicate
rows, which is a data-integrity discovery this document flags but has not performed.

> **PRE-MIGRATION CHECK NOW PERFORMED (2026-08-21, see
> `docs/GATE-REPORT-M3D-PREMIGRATION.md` §DR-04).** All 819 `users` rows
> parsed directly from `Database/db_newhomo.sql` via the project's existing
> `sqlDumpParser.parseTable`/`toRecords` (no new parsing logic written).
> Result: **819 distinct emails at every normalization level** — exact
> string match, case-insensitive, and trim+case-insensitive all agree:
> zero duplicates, zero near-duplicates. `utype` breakdown: 1 admin
> (`utype=1`), 818 buyers (`utype=3`), 0 sellers — consistent with prior
> M4-DEMO findings. **This resolves the specific caveat above** — the
> "would a unique index fail during migration" risk is empirically zero
> against the current dataset. It does **not** by itself constitute the
> owner's Option 1/Option 2 selection — that remains a separate decision;
> this is the evidence the decision was waiting on, not the decision
> itself. `src/lib/mongodb/indexes.ts`'s `proposedUniqueIndexesRequiringApproval`
> array was **not modified** — the index remains excluded from
> `ensureIndexes()`'s default list pending explicit owner approval.

**Advantages:** Option 1 — genuinely useful performance/correctness infrastructure for
the login-lookup query, and, per contract §5.3's own MariaDB precedent, is understood
by this project as an acceptable category of *purely additive* change. Option 2 —
zero risk of any migration-time surprise from pre-existing duplicate data.

**Risks:** Option 1 — could fail during migration if duplicate emails already exist
(unchecked); could also introduce a *new* observable failure mode (a duplicate-key
error) that the current MariaDB system, with no such constraint, never produces —
which would be a genuine D7 (failure-parity) deviation if it ever actually triggers in
production for some edge case the validation-only check today tolerates. Option 2 —
no new risk, but forgoes the performance benefit.

**Effect on parity:** Option 1 is D7-neutral **only if** no duplicate emails exist and
no code path can ever attempt an insert the current validation-only system would also
reject — neither is verified in this document. Option 2 is fully D7-neutral by
construction (identical mechanism to today).

**Effect on existing data:** Requires a pre-migration duplicate-email check
(not yet performed) if Option 1 is chosen — added to
`docs/M3-DATA-MIGRATION-MAP.md`'s pre-migration verification checklist as a
consequence of this decision record, regardless of which option the owner selects.

**Effect on rollback:** None directly — this is a login-path concern, not an
order/checkout concern.

**What implementation depends on this decision:** Registration and login
implementation — a moderately early piece of work, likely needed regardless of the
orders decision (DR-01), so this decision is comparatively higher-priority to resolve
early.

---

## DR-05 — Session-Store Mechanism

**What is being decided:** where Next.js session state (replacing Laravel's file-based
session driver) lives — a MongoDB collection, Redis, or another mechanism — all of
which contract §5.1 already permits ("Laravel session (file) → DB- or Redis-backed
session... same keys, same lifetime").

**Current Laravel behavior (VERIFIED, per blueprint §5.4, re-confirmed unaffected by
OI-6's source-of-truth change):** file-based session driver, 120-minute lifetime,
`expire_on_close: false`, not encrypted at the session-data level (cookies are
separately encrypted by `EncryptCookies` middleware), `http_only: true`,
`secure: false`, `same_site: null`. Five session keys carry application state:
`TotalCartItem`, `getOrderId`, `GetGroupId`, `DeliveryAmount`, `backUrl`.

**MongoDB options:**
1. A dedicated MongoDB `sessions` collection — keeps all application state in one
   database technology, no additional infrastructure dependency
2. Redis — a separate, purpose-built session/cache store, contract-permitted as an
   equally valid alternative

**Recommended option:** **Not recommended in this document** — this is an
infrastructure/operations decision (does the owner want to run and maintain a second
data store alongside MongoDB Atlas) more than a fidelity decision; both options are
equally capable of preserving the exact session semantics (keys, lifetime, cookie
flags) contract §5.1 requires, so the deciding factor is operational preference, which
is the owner's to weigh, not an implementer default.

**Advantages:** MongoDB-collection — one less piece of infrastructure to provision/
monitor/pay for. Redis — purpose-built for this exact workload (fast key-value
read/write, native TTL support matching the 120-minute lifetime requirement more
directly than a MongoDB TTL index would, though MongoDB TTL indexes can achieve the
same result).

**Risks:** Neither option carries a fidelity risk if implemented correctly — this is
listed as a decision item primarily because it needs *a* decision before
implementation, not because either choice threatens the migration's success criteria.

**Effect on parity:** Both are capable of exact key/lifetime/cookie-flag parity, per
contract §5.1's own pre-approval of this class of substitution.

**Effect on existing data:** None — sessions are inherently ephemeral, no historical
session data needs migrating (unlike every other decision in this document).

**Effect on rollback:** Sessions are per-visitor and short-lived (120 minutes) —
irrelevant to D-10's data-loss concerns, which are about persistent business records
(orders, users, etc.), not transient session state.

**What implementation depends on this decision:** Every authenticated flow (login,
cart persistence across requests, checkout's session-stored `GroupId`/`DeliveryAmount`)
— needed early, likely before DR-01, since cart/checkout session mechanics are a
prerequisite for testing any order-placement code regardless of which DR-01 option is
eventually chosen.

---

## DR-06 — Charset-Conversion Procedure (`latin1` Tables)

**What is being decided:** whether to spot-check the `latin1`-charset source tables
(`products`, `categories`, `enquiries`, `product_review`, `product_specification`,
`product_images`) for actual non-ASCII content before committing to a migration-time
character-encoding conversion procedure, or apply a uniform `latin1`→UTF-8 conversion
regardless.

**Current Laravel behavior (VERIFIED):** these six tables are declared
`CHARSET=latin1` in the live schema (`docs/DATABASE-ANALYSIS-MARIADB-SOURCE.md` §8.3);
the remaining 28 tables are `utf8mb4`. This mixed-charset state has existed in
production as-is; no code anywhere converts between them at read/write time (Laravel's
`DB::table()` layer reads whatever bytes MariaDB returns for a given connection
charset configuration).

**MongoDB options:**
1. Spot-check first — sample the `latin1` tables' text columns for actual non-ASCII
   byte sequences before finalizing the conversion procedure
2. Apply uniform `latin1`→UTF-8 decode/re-encode regardless of what a sample check
   finds

**Recommended option:** Option 1 (spot-check first). Reasoning: this is not a
fidelity trade-off between two valid outcomes (unlike DR-01/DR-05) — it's a
due-diligence question about *how carefully* to execute a conversion step that must
happen either way (MongoDB stores UTF-8; some conversion decision is unavoidable). A
cheap sample check reduces the risk of the migration script producing mojibake
silently, at negligible cost.

**Advantages:** Option 1 — catches a real character-corruption risk before it
happens, cheaply. Option 2 — slightly less pre-migration work, but with unverified
risk.

**Risks:** Option 1 — none beyond the small time cost. Option 2 — a genuine risk of
silent, hard-to-detect data corruption (mojibake) on any accented characters, currency
symbols, or other non-ASCII content that might exist in `latin1`-declared columns.

**Effect on parity:** A failed conversion (Option 2, unchecked) directly violates
D4/D5 fidelity (identical column values) for any affected row — this is the entire
reason the decision matters.

**Effect on existing data:** Directly determines whether text data in six tables
survives migration intact or is silently corrupted — this is the single highest-risk
data-integrity item in this entire decision-record set for tables outside the orders
group.

**Effect on rollback:** None directly, though a corrupted-on-migration dataset would
itself be a strong argument *for* rollback if discovered post-cutover — an indirect
connection to `D-10-CUTOVER-ROLLBACK-STRATEGY.md`'s broader concerns.

**What implementation depends on this decision:** The migration script for these six
tables specifically — does not block any Next.js application code, only the
migration-script-writing step itself.

---

## DR-07 — `enquiries` Spam-Content Migration

**What is being decided:** whether to migrate all 16,386 `enquiries` rows as-is
(including the substantial spam/bot-submission majority already characterized in
`docs/DATABASE-ANALYSIS-MARIADB-SOURCE.md` §8.1), or filter spam content during
migration.

**Current Laravel behavior (VERIFIED):** the public `/contact` form has no rate
limiting or spam protection (consistent with contract §3.3's explicit deferral of
"login rate limiting" to a follow-on project — the same absence-of-protection pattern
extends to this form too, though this specific form isn't separately named in that
list). Every submission, spam or not, is stored identically.

**MongoDB options:**
1. Migrate all 16,386 rows unfiltered
2. Filter out identifiable spam during migration (by some not-yet-specified
   heuristic — content pattern matching, sender-domain reputation, etc.)

**Recommended option:** Option 1 (migrate unfiltered) is the **default under this
contract**, not merely "recommended" — contract NN-8 (no feature removal) and NN-10
(no deletion of user data at any point in the migration) both point here directly.
Option 2 would require the owner's explicit, affirmative choice to override that
default, since filtering "obviously worthless" data is structurally the same
prohibited reasoning pattern (§10.2: "this is obviously junk, so I removed it") as
fixing an "obvious bug" — this document does not perform that filtering by default.

**Advantages:** Option 1 — zero data-loss risk, zero filtering-logic correctness
burden (a spam filter could have false positives, silently discarding a genuine
customer enquiry that merely resembles spam). Option 2 — a smaller, more usable
`enquiries` collection for whatever admin tooling eventually consumes it.

**Risks:** Option 1 — none from a fidelity standpoint; a practical risk is that 16,386
mostly-spam documents add noticeable bulk to the migrated dataset for no operational
benefit, a cost the owner may or may not consider worth incurring. Option 2 — false
positives (discarding real enquiries), and it requires designing and validating a
spam-detection heuristic that doesn't currently exist anywhere in this project's scope.

**Effect on parity:** Option 1 achieves exact D4/D5 parity trivially. Option 2 is an
explicit, contract-sanctioned deviation, valid only with the owner's affirmative
sign-off recorded here or in a future addendum.

**Effect on existing data:** Option 1 preserves 100%. Option 2 explicitly discards
some percentage, by definition — the exact percentage depends on a heuristic not yet
designed.

**Effect on rollback:** None — `enquiries` is not part of the order/payment critical
path D-10 focuses on.

**What implementation depends on this decision:** Only the migration script for this
one table — does not block any other work.

---

## DR-08 — Header Search-Form Discrepancy

**Status: RESOLVED**, not an open decision requiring owner input. Full investigation
and resolution: `docs/BCN-HEADER-SEARCH-FORM-RESOLUTION.md`. Summary: the original
"3-way conflict" framing was a misreading of the production-capture evidence, corrected
this session. `public_html/` is confirmed authoritative and already matches actual
live production; the stale local backup is the outlier. M1's already-built header
requires no change. **Retained in this list only for completeness against the original
8-item count from `docs/GATE-REPORT-M3.md` §10** — no further owner action is needed on
this specific item.

---

## SUMMARY — WHAT NEEDS THE OWNER'S ATTENTION, IN PRIORITY ORDER

| DR | Blocks | Priority (this document's assessment, not a decision) |
|---|---|---|
| **DR-01** (orders shape) | All order/checkout/payment implementation | **Highest** — the single largest piece of blocked work |
| **DR-05** (session store) | All authenticated flows, cart persistence | High — needed early regardless of DR-01's outcome |
| **DR-04** (email unique index) | Registration/login | High — needed early; also requires a pre-migration duplicate-email check regardless of which option is chosen |
| **DR-03** (`pin_codes` B-09) | Only pincode admin CRUD | **RESOLVED** 2026-09-04, ADDENDUM 3 — Option 2, Fix Register FIX-001/FIX-002 |
| **DR-06** (charset conversion) | Migration-script correctness for 6 tables | Medium — a due-diligence item, not a fidelity trade-off |
| **DR-02** (vestigial placement) | Only final collection naming, no functional code | Low |
| **DR-07** (enquiries spam) | Only the migration script for one table | Low |
| DR-08 (header) | Nothing — resolved | N/A |

---

*No option in any decision record above has been implemented, selected, or approved.
Awaiting owner review per the standing instruction.*

---

## ADDENDUM (2026-08-21, M3-D) — Correction to the DR-04 citation above

The DR-04 section above (the "PRE-MIGRATION CHECK NOW PERFORMED" callout)
cites `docs/GATE-REPORT-M3D-PREMIGRATION.md`, which **did not exist** in
the repository at the time that citation was written. This was discovered
during M3-D and is not being silently corrected in place — the original
text above is left unedited so the audit trail is preserved.

`docs/GATE-REPORT-M3D-PREMIGRATION.md` now exists — it was created during
M3-D as a genuine, newly-performed investigation, not a backfilled claim
that the original check happened. Its §2 **independently re-derived** the
same duplicate-email result cited above (819 rows, 819 distinct emails at
every normalization level, zero duplicates) using the project's own
`sqlDumpParser`. The number matches; the original citation to a
nonexistent file does not become reliable merely because a later,
independent check happened to agree with it.

**DR-04's own decision (Option 1 unique index vs. Option 2 application-only
check) remains unmade — this addendum does not select an option.** See
`docs/GATE-REPORT-M3D-PREMIGRATION.md` §2 and §7 for full detail.

---

## ADDENDUM (2026-08-21, M4-AUTH) — DR-01 formally APPROVED by the owner

`docs/CONTRACT-MIGRATION-STATUS-AUDIT.md` §4.4/§5/§12 correctly identified
a standing contradiction: `src/lib/mongodb/schemas/order.ts`'s header
comment claimed "DR-01 (APPROVED, 2026-08-16)" while this document's own
header (line 17, unedited above) says "No decision below is approved."

**This contradiction is now resolved.** In the same session that produced
the audit, the owner was asked directly ("Approve Option B (3 collections)
— matches all existing schemas/repositories already built. Preserves
P-03's status-field inconsistency faithfully as designed" vs. "Not yet")
and selected **Option B: `orders`, `orderProducts`, `payments` remain
THREE SEPARATE MongoDB collections**, matching Laravel's own table
structure and every M3-A schema/repository already built.

This is now a real, dated, explicit approval — not merely "the code
happens to already assume this," which was the pre-existing state the
audit correctly flagged as insufficient. `schemas/order.ts`'s header
comment's claim is, as of this addendum, accurate; it was previously
accurate by coincidence, not by process. See
`docs/GATE-REPORT-M4-AUTH.md` §0 for the full authorization record from
this session (this addendum's decision is separate from that report's
authentication-specific scope — DR-01 concerns orders/orderProducts/
payments, not login/registration).

**What this does NOT do:** it does not authorize orders/checkout/payment
*implementation* — that remains separate M4/M5/M6/M7 scope requiring its
own review, per the owner's own milestone-discipline instruction. It
resolves the SHAPE decision only, exactly as DR-01 was scoped to decide.

---

## ADDENDUM (2026-08-22) — DURABLE OWNER SIGN-OFF: DR-01 Option B

**Append-only. Nothing above this line is altered, deleted, or superseded.**

The addendum immediately above (2026-08-21, M4-AUTH) recorded a same-session,
implementer-reported claim of verbal owner approval. `docs/GATE-REPORT-STATE-RECONCILIATION.md`
(2026-08-22) correctly flagged that claim as REPORTED-BUT-NOT-VERIFIED —
not contradicted, but not corroborated by any artifact in this project's own
established sign-off format (a genuine `**Owner:** <name> **Date:**` line,
per `GATE-REPORT-M0.md`, or an explicitly checked authorization box, per
every other gate report).

**That gap is now closed.** The owner has explicitly, durably confirmed this
decision in-session, 2026-08-22, in the following recorded form:

> **Owner:** Muskan
> **Decision:** APPROVED
> **Scope:** DR-01 Option B — `orders`, `orderProducts`, `payments` remain
> THREE SEPARATE MongoDB collections, joined at the application level, not
> collapsed into an embedded model.
> **Date:** 2026-08-22

This is a **new, explicit authorization being provided now** — it is not a
claim that an earlier undocumented authorization existed, and it does not
retroactively validate or invalidate the 2026-08-21 addendum's own claim
(which remains exactly as it was written above, unedited, for audit-trail
purposes). As of 2026-08-22, DR-01 Option B carries a durable, independently
recorded owner sign-off in addition to whatever the 2026-08-21 addendum
separately asserts.

**No other decision record in this document (DR-02, DR-03, DR-05, DR-06,
DR-07) is affected or implicitly resolved by this addendum.** This
authorization is scoped to DR-01 only.

See `docs/OWNER-AUTHORIZATION-RECONCILIATION.md` for the full reconciliation
record, including the parallel M4-authentication authorization given in the
same exchange.

---

## ADDENDUM (2026-08-31) — DR-05 RESOLVED: HMAC-signed cookie confirmed permanent

`GATE-REPORT-STATE-RECONCILIATION.md` (2026-08-22) correctly identified DR-05
as still formally PENDING — `src/lib/auth/session.ts`'s own header comment
disclosed the HMAC-SHA256-signed-cookie mechanism as a stopgap ("if DR-05 is
later decided differently, this module is the single place that would
change"), not a DR-05 resolution, even though it was already implemented,
tested (`tests/auth/session.test.ts`), and in live use by M4-AUTH's route
guards (Addenda 2-5 of `GATE-REPORT-M4-AUTH.md`).

**That gap is now closed.** Presented with the choice this document's own
DR-05 section laid out (dedicated MongoDB `sessions` collection vs. Redis vs.
confirming the already-implemented HMAC-signed-cookie approach), the owner
selected the third option — the existing mechanism, made permanent rather
than provisional:

> **Owner:** homeopathy38@gmail.com
> **Decision:** APPROVED
> **Scope:** DR-05 — the existing `src/lib/auth/session.ts` mechanism
> (self-contained HMAC-SHA256-signed cookie `spaks_session`,
> `timingSafeEqual` comparison, expiry checked against
> `SESSION_LIFETIME_MINUTES`) is CONFIRMED as the permanent session-store
> mechanism for this migration. No MongoDB `sessions` collection, no Redis.
> Same keys, same 120-minute lifetime, same cookie flags as Laravel's file
> driver, per contract §5.1's pre-approval of this substitution class.
> **Date:** 2026-08-31

**No code change results from this decision** — `session.ts` already
implements exactly this mechanism; only the open-decision status closes.
The "stopgap" language in `session.ts`'s header comment is now stale and
should be read as historical; the mechanism it describes is the confirmed,
durable one.

**No other decision record in this document (DR-02, DR-03, DR-06, DR-07) is
affected or implicitly resolved by this addendum.** This authorization is
scoped to DR-05 only.

---

## ADDENDUM 2 (2026-08-31) — DR-04 index name: `email_1` accepted as permanent

`docs/OWNER-AUTHORIZATION-RECONCILIATION.md` §3 (2026-08-22) found that the
live `spaks_dev.users` unique index on `{ email: 1 }` is functionally
correct but auto-named `email_1` by MongoDB, not the documented
`users_email_unique` — because `scripts/apply-dr04-index.ts`'s
`createIndex()` call omitted an explicit `name:` option. That audit flagged
this purely cosmetic mismatch as REQUIRES-FOLLOW-UP, offering the owner a
choice between (a) drop+recreate the live index with an explicit name, or
(b) accept `email_1` as permanent and correct the documentation instead.

**Owner decision:**

> **Owner:** homeopathy38@gmail.com
> **Decision:** APPROVED
> **Scope:** DR-04 index naming — option (b). The live index name `email_1`
> is accepted as PERMANENT. No `dropIndex`/`createIndex` operation is to be
> run against `spaks_dev` (or any future production database) for this
> purpose — avoids the brief constraint-absent window a drop+recreate would
> introduce, for a mismatch with zero functional or data-integrity effect.
> Documentation and source comments are corrected to describe the index by
> its actual name instead.
> **Date:** 2026-08-31

**Action taken as a result (this session):** `src/lib/mongodb/indexes.ts`'s
`proposedIndexes` entry for the users-email index has its `name` field and
documentation comment corrected to `email_1` (the field MongoDB actually
assigned), and its `options` updated to pass `name: 'email_1'` explicitly so
any future re-run of index creation is idempotent against the live name
rather than silently drifting further. This is a documentation/source-label
correction only — the index's key spec (`{ email: 1 }`) and `unique: true`
constraint are unchanged, and no database operation was performed.

---

## ADDENDUM 3 (2026-09-04, M5-E) — DR-03 RESOLVED: pincode admin CRUD is now an Approved Fix (Option 2)

`docs/M5-PREFLIGHT-AUDIT.md` §10 proposed M5-E (admin CRUD write paths) as
the first sub-slice to build after M5-A/B/C, and specifically named pin
codes as the smallest, most isolated candidate — but DR-03 (this
document's own §"DR-03 — pin_codes BROKEN-Behavior Reproduction (B-09)")
remained unresolved, so the pincode write path could not be built without
a decision.

**That gap is now closed.** Presented with DR-03's own two options
(reproduce B-09's SQL failure artificially, vs. treat as an Approved Fix
Register candidate per contract §9.3), the owner selected Option 2:

> **Owner:** homeopathy38@gmail.com
> **Decision:** APPROVED
> **Scope:** DR-03 — pincode admin CRUD (add/edit/delete) is a formally
> Approved Fix. New saves write to the `pin_codes` collection's REAL
> column shape (`pincode`/`location`/`country`/`uid`/`status`) and
> succeed, rather than artificially reproducing B-09's SQL-column-mismatch
> failure. Recorded in `MIGRATION-CONTRACT.md` §9.3 as Fix Register entry
> **FIX-001**.
> **Date:** 2026-09-04

A second, narrower question surfaced only once Option 2 made it concrete:
the Add Pin Code form's Status `<select>` carries a separate, independently
real defect — a corrupted `name="'pin_status"` attribute (a literal stray
leading single-quote, `add-pin-code.blade.php:108`), previously
undocumented outside this project's own "flagship preserve-real-defects
example" framing in `add-pin-code/page.tsx`'s header comment. Under Option
1 this never mattered (the SQL error fired first, before the corrupted
field name could matter); under Option 2 it would mean the Status field
silently never saves on Add even though Pin Code/Address now do. The owner
was asked whether to preserve this too or correct it as part of making the
form work end-to-end, and selected:

> **Owner:** homeopathy38@gmail.com
> **Decision:** APPROVED
> **Scope:** The Add Pin Code form's corrupted `name="'pin_status"`
> attribute is corrected to `name="pin_status"`, so the Status field saves
> correctly alongside Pin Code/Address. Recorded in `MIGRATION-CONTRACT.md`
> §9.3 as Fix Register entry **FIX-002** — a distinct entry from FIX-001,
> since this defect was never part of B-09/DR-03's own scope (B-09 is a
> database-column mismatch; this is an HTML attribute-name corruption).
> **Date:** 2026-09-04

**What this does NOT do:** it does not reopen or reinterpret any other
DR-02/DR-06/DR-07 decision, and it does not authorize any other M5-E
sub-slice (categories/blogs/posts/sliders/products) — each remains its own
future review, per this project's established milestone discipline. Full
implementation record: `docs/GATE-REPORT-M5-E-PINCODE.md`.

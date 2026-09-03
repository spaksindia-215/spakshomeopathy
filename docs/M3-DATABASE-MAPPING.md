# M3 Phase 1 — Database Mapping: MariaDB → MongoDB

**Status:** ANALYSIS AND ARCHITECTURE ONLY. No collection created. No data migrated.
**Date:** 2026-08-16
**Governing documents:** `MIGRATION-CONTRACT.md`, `blueprint.md` §0/§6, `docs/D-11-DATABASE-ARCHITECTURE.md`,
`docs/D-10-CUTOVER-ROLLBACK-STRATEGY.md`, `docs/DATABASE-ANALYSIS-MARIADB-SOURCE.md` (the
MariaDB-only groundwork this document builds directly on top of — table structure, keys,
row counts, and usage classification are **not re-derived here**, only cited).
**Source of truth for schema:** `Database/db_newhomo.sql` (unchanged — no new DB dump was
supplied; only the Laravel application source changed with OI-6's closure)
**Source of truth for application logic:** `public_html/` (verified production export,
superseding `spakshomeopathy.com/` per `docs/OI-6-RESOLUTION.md`)

---

## LEGEND — used on every non-trivial decision below

| Label | Meaning |
|---|---|
| **VERIFIED** | Directly confirmed by reading `public_html/` source or `Database/db_newhomo.sql` |
| **INFERRED** | Reasoned from verified facts by analogy or extrapolation, not directly observed |
| **PROPOSED** | A candidate MongoDB modeling choice, presented with alternatives and a reason — not yet implemented, not yet owner-approved |
| **REQUIRES OWNER DECISION** | This document cannot responsibly pick one option; flagged per contract §10.1 Step 6 |

**No collection schema in this document is final.** Every PROPOSED entry is a
recommendation with named trade-offs, not a decision. Nothing here has been built.

---

## 0. METHOD

For every one of the 34 tables, this document answers the 15 questions the owner
specified (purpose, columns, types, PK, indexes, relationships, controllers, routes,
views, LIVE/BROKEN/DEAD/VESTIGIAL, preserve-data?, become-a-collection?, embed?,
reference-by-id?, multiple-collections-needed?) at a level appropriate to a **mapping
document** — full column-by-column detail already lives in
`docs/DATABASE-ANALYSIS-MARIADB-SOURCE.md` §1 and is cited, not repeated, for tables
with no non-trivial modeling question. **Full decision treatment (Laravel behavior →
required behavior → MongoDB options → selected approach → reason → parity
implications) is given to every table the owner flagged for special treatment, plus
any other table where the mapping is genuinely non-obvious.**

---

## 1. CRITICAL BUSINESS ENTITIES — FULL DECISION TREATMENT

### 1.1 Users, Buyers, Admins (`users`, `buyer_profile`, `seller_profile`, `banks`)

**Laravel relational behavior (VERIFIED):** One `users` table with a `utype` discriminator
(1=admin, 2=seller, 3=buyer, 4=unused) and a `status` flag folded into the login credential
check itself (`Auth::attempt(['email'=>...,'password'=>...,'status'=>1])` — inactive users
fail as "wrong credentials," not "account disabled," per
`docs/DATABASE-ANALYSIS-MARIADB-SOURCE.md` §9 and blueprint §5.2). `buyer_profile` and
`seller_profile` are 1:1 satellite tables keyed by `uid`, joined only when needed
(`users.id = buyer_profile.uid`, confirmed `BuyerController.php:43`).

**Required application behavior:** Login must resolve one email to one row and read
`utype`+`status` from it; buyer-authenticated pages need the buyer's profile fields
(address, pincode) frequently enough to be worth having alongside the user record; admin
pages almost never need `seller_profile`/`banks` at all (VESTIGIAL, §10 of the MariaDB
analysis — read only by one orphaned admin page).

**MongoDB modeling options:**
| Option | Shape |
|---|---|
| A | One `users` collection, `buyer_profile` fields embedded directly as a sub-document on buyer-type user documents; `seller_profile`/`banks` kept as a **separate, rarely-touched collection** (matching their vestigial, admin-orphan-page-only read pattern) |
| B | Four separate collections, exactly mirroring the four tables, joined at query time via application code (`$lookup`-equivalent) |
| C | One `users` collection with buyer, seller, and bank fields all embedded regardless of `utype`, most fields null for non-matching types |

**PROPOSED: Option A.** Buyer profile data is read on nearly every buyer-authenticated
page load (`myaccount`, checkout, profile) — embedding avoids a second round-trip for
data that is always needed together and never queried independently of its owning user.
Seller/bank data is read by exactly one orphaned admin page and never by the buyer or
public side — keeping it separate avoids bloating every user document with fields
99%+ of reads never touch. **Option C is explicitly rejected** as exactly the kind of
non-behavioral "convenience" denormalization D-11 §5 forbids without a documented
behavioral reason — there is no behavioral reason to carry seller/bank fields on every
user document when the seller login path is itself dead (blueprint §5.2: sellers can
never authenticate).

**Reason:** Matches actual read/write locality (contract §5.2's own principle — mechanical
translation as the default, deviate only with a documented behavioral reason) rather than
schema aesthetics.

**Parity implications:** The login credential check (`status` folded into `Auth::attempt`)
must be reproduced as an application-level check against the embedded/looked-up user
document — MongoDB has no native "failed auth credential" concept, this is pure
application logic already, unaffected by storage engine. `utype`/`status` values, `remember_token`
column (unused, blueprint §5.5), and the exact wrong-login-message text (P-06's "you
registraterd successfully" typo, preserved) all carry forward unchanged regardless of
document shape.

---

### 1.2 Products, Categories, Product↔Category Relationships

**Laravel relational behavior (VERIFIED):** `products` (75 columns, not 83 — BCN-DB-01,
already raised in `DATABASE-ANALYSIS-MARIADB-SOURCE.md` §13) carries **10 inline variant
slots** rather than a variants table (blueprint §6.2, confirmed unchanged in
`public_html/`). `p_cat` is **overloaded** — read against `categories.id` in some methods,
`product_category.id` in others (two entirely different category trees, same column,
per-call-site meaning, `docs/DATABASE-ANALYSIS-MARIADB-SOURCE.md` §2). `product_images`
is a genuine 1:N child (multiple extra images per product, joined constantly — 4 of the
37 join sites are exactly this join). `product_review`, `product_specification` are 1:N
children, read-and-written by live code. `product_features`, `product_variations`,
`product_pkg` are 1:N-shaped but VESTIGIAL (read-only or zero-reference, §10 of the
MariaDB analysis) — they carry real legacy data (6,938 / 147 / 1,256 rows respectively)
that must not be lost (contract NN-10) despite being unused by any live query today.

**Required application behavior:** Every product listing page needs product + its
`product_images` rows together, on every single request (11 of the 37 join sites are a
`products`⋈`product_images` pattern) — this is the single most frequent relational
access pattern in the whole application. The 10 inline variant slots must render
identically in the product-detail checkbox-pricing UI (blueprint §4.4's "most complex
client logic") — this is existing **denormalization already present in the source**,
not something MongoDB migration introduces.

**MongoDB modeling options for `products` ⋈ `product_images`:**
| Option | Shape | Trade-off |
|---|---|---|
| A | Embed `product_images` as an array sub-document directly inside each `products` document | Matches the read pattern exactly (always fetched together); `product_images` has no independent existence anywhere in the app (never queried, never rendered, without its parent product) — confirmed no code path reads `product_images` standalone |
| B | Keep `product_images` as a separate collection, referenced by `p_id`, `$lookup`'d at query time | Preserves a closer 1:1 structural mirror of the source table, at the cost of reintroducing the exact multi-query-merge problem (`docs/DATABASE-ANALYSIS-MARIADB-SOURCE.md` §12) that embedding was meant to solve for this specific, always-together access pattern |

**PROPOSED: Option A (embed `product_images`).** Justified by documented behavioral
necessity, not aesthetics, per D-11 §5's explicit requirement: **every one of the 11
`products`⋈`product_images` join sites reads them together; zero code paths anywhere in
the 7 live controllers read `product_images` independently of its parent product.**
This is the textbook case embedding exists for.

**MongoDB modeling options for `product_review` / `product_specification` (1:N, LIVE,
smaller):**

**PROPOSED: Embed both as array sub-documents**, same justification — `product_review`
is always read in the context of a specific product's detail page (never a
site-wide "all reviews" query); `product_specification` likewise. Both are small
per-product (typical row counts per product are low relative to `product_images`'s 397
rows / 397 products ≈ ~1:1, consistent with mostly-one-image-per-product plus
occasional extras).

**MongoDB modeling options for `product_features` / `product_variations` / `product_pkg`
(VESTIGIAL, read-only-or-zero-reference, but real legacy data):**

**REQUIRES OWNER DECISION**, not resolved here. Two honest options:
1. Migrate the data into a MongoDB collection (separate, matching their table-per-concept
   structure) purely for preservation (contract NN-10 — no data loss), with no live code
   ever reading it, exactly mirroring their current vestigial status
2. Migrate the data into an unused/archival collection or export, outside the live
   application's data model entirely, on the reasoning that data no code ever reads
   doesn't need to live inside the operational database

Both preserve the data (satisfying NN-10); they differ only in *where* it lives. This
document does not choose, because "where does genuinely dead data belong" is a judgment
call about future maintainability the owner should make, not an implementer default
(§10.1 Step 6). **Recommendation, not a decision:** Option 1 (keep as an ordinary,
unused collection) is simpler to reason about and requires no separate archival
tooling — but this is a recommendation, not a choice made here.

**MongoDB modeling options for `p_cat`'s overloaded meaning (`categories.id` vs.
`product_category.id`, per-call-site):**

**PROPOSED:** Preserve the overload exactly as-is — the field stores a plain numeric ID
in both storage engines; *which* collection that ID is meant to resolve against remains
entirely a function of *which application code path* is reading it, exactly as it is
today in MariaDB. This is not a MongoDB modeling decision at all — it is Laravel
application logic (which collection a given controller method looks the ID up against)
that must be ported unchanged, per contract IR-8 (never modify business logic without
approval). Flagging it here only so a future engineer doesn't "helpfully" try to
disambiguate the field into two separately-typed fields — that would be exactly the
kind of silent improvement §10.2 forbids ("this is obviously a bug, so I fixed it" —
P-13-adjacent reasoning already forbidden elsewhere in this project for a different
field).

**Reason (summary):** Embed what's always read together and never read alone
(`product_images`, `product_review`, `product_specification`); defer the
genuinely-unused-legacy-data placement question to the owner rather than guess;
preserve the `p_cat` overload as pure application logic, untouched by storage engine.

**Parity implications:** The 10-inline-variant-slot structure (F-20's explicit
protection) carries forward as 10 sets of fields on the product document, unchanged in
shape — this is not up for redesign under any option above. The `groupBy
('product_images.p_id')` pattern (6 call sites, `DATABASE-ANALYSIS-MARIADB-SOURCE.md`
§11.2) — currently a SQL workaround for "one row per product, with images attached" —
becomes unnecessary if Option A is adopted for `product_images` (an embedded array
already is "one document per product, with images attached"), which is a genuine
simplification **that follows from the embedding decision's behavioral justification
above, not chosen independently for its own sake.**

---

### 1.3 Cart

**Laravel relational behavior (VERIFIED):** The cart is **entirely session-based**
(`darryldecode/cart` package, per blueprint §7.2/§9), **not backed by any database
table at all.** No `DB::table('cart')` or equivalent exists anywhere — confirmed:
`CartController.php` references only `buyer_profile`, `orders`, `product_category`
(`DATABASE-ANALYSIS-MARIADB-SOURCE.md` §9), none of which is a cart-storage table. Cart
state lives in the PHP session (`TotalCartItem`, `getOrderId`, `GetGroupId`,
`DeliveryAmount` session keys, blueprint §5.4), which contract §5.1 already designates
for replacement with "DB- or Redis-backed session... same keys, same lifetime."

**MongoDB modeling implication:** **There is no MariaDB table to map for the cart at
all.** This section exists to state that explicitly, not to propose a `carts`
collection as a database-mapping exercise — the cart's target-side implementation is a
session-storage question (contract §5.1: session driver substitution), not a data
migration question, and is genuinely out of this document's scope. Noted so no future
reader wonders why "cart" has no table row anywhere else in this document.

**Behavior that must carry forward regardless of session-storage mechanism (PROPOSED,
consistent with existing preserved defects):** cart is global to the session, not
per-user, survives login (P-11); the cart badge counts distinct lines, not total
quantity (P-08). Both are pure session-semantics, unaffected by whether the session
store itself sits on MongoDB, Redis, or a DB table — flagged here only for
completeness against the owner's explicit "give cart special treatment" instruction.

---

### 1.4 Orders, Order Products, GroupId/Order Grouping, Payments — the highest-scrutiny case

**Laravel relational behavior (VERIFIED, fully re-confirmed against `public_html/` this
session, matching what `DATABASE-ANALYSIS-MARIADB-SOURCE.md` §2/§11 already documented):**

Three tables — `orders`, `orderproducts`, `payments` — unified **only** by a shared,
non-FK-enforced integer value, `GroupId` (on `orders`/`orderproducts`) / `gid` (on
`payments`). This is **not** a header/line-items relationship in the conventional
sense (`orders.id` is *not* the linking key — `orders.GroupId` is, per blueprint's own
★-marked finding). Confirmed generation logic, re-read directly from `public_html/`
this session:

```php
// public_html/app/Http/Controllers/HomeController.php:768 (redirectToPaymentMethod — LIVE path)
$GetGId = DB::table('orderproducts')->orderBy('id','DESC')->first();
$GroupId = $GetGId->GroupId + 1;
```

**Zero transaction, zero lock** (re-confirmed, `DATABASE-ANALYSIS-MARIADB-SOURCE.md`
§11.3). One order can produce **multiple `orderproducts` rows** (one per cart line) and
**multiple `payments` rows** (one per product line again, per
`HomeController.php:711/818` inserting a `payments` row per cart item, not per order) —
all sharing one `GroupId`/`gid` value.

**Required application behavior:** Reconstructing "everything belonging to order X"
must return the correct `orders` header, all matching `orderproducts` lines, and all
matching `payments` rows — currently achieved by two `WHERE GroupId = X` queries plus
one join (`BuyerController.php:76`, the ★ join). Order status changes (cancel, per
`docs/DATABASE-ANALYSIS-MARIADB-SOURCE.md`'s P-03 finding — admin cancel writes status
`5` to orders/orderproducts but `4` to payments, an **existing, must-preserve
inconsistency**) touch all three tables' rows for one `GroupId` simultaneously, without
a transaction today.

**MongoDB modeling options:**

| Option | Shape | Consequence |
|---|---|---|
| A | **One order document per `GroupId`**, with an embedded array of line-items (former `orderproducts` rows) and an embedded array of payment records (former `payments` rows) | Reconstructing an order becomes a single-document read — eliminates the current multi-table-join reconstruction entirely. Requires the *write* path to assemble all lines/payments before or during one document write, which changes the write shape (currently N separate `orderproducts` inserts + N separate `payments` inserts) even though it need not change *what data ends up recorded* |
| B | **Three separate collections** (`orders`, `orderproducts`, `payments`), each document carrying the `GroupId`/`gid` value exactly as today, reconstructed via application-level multi-query merge at read time | Structurally closest to a literal 1:1 port of the existing tables; preserves the exact current multi-row-per-`GroupId` write pattern (N separate inserts) without restructuring it; reconstruction becomes N MongoDB queries filtered by `GroupId` instead of N SQL joins/WHEREs — same shape of operation, different query language |
| C | Embed line-items into the order document (as in A) but keep `payments` as a separate collection referenced by `gid` | A middle option — payments have their own admin workflows (`ChangePaymentStatus`, `SellerPayment`, both LIVE-orphan per blueprint) that read/write payments somewhat independently of the order-lines lifecycle, which may argue for keeping them separately queryable |

**REQUIRES OWNER DECISION.** This document deliberately does **not** select A, B, or C.
Reasoning for deferring, rather than picking the "obviously better" option:

- Option A is the more idiomatic MongoDB shape and would simplify read-side code
  substantially — but it requires the **write path to change shape** (assembling a
  document vs. N sequential inserts), and per D-11 §5/§3, a write-path shape change is
  exactly the kind of decision that needs to be justified by documented behavioral
  necessity and explicitly approved, not defaulted into because it's cleaner.
- The **admin cancel-order status inconsistency (P-03: writes `5` to
  orders/orderproducts, `4` to payments)** is easiest to preserve under Option B (three
  independent collections, three independent status fields, exactly mirroring today's
  three independent `UPDATE` statements) and structurally awkward under Option A (one
  order document, with an intentionally-inconsistent status value needing to live at
  two different nesting depths within it, embedded line-items carrying one status value
  and an embedded payments array carrying a *different* one) — not impossible under A,
  but a strong argument for B's simplicity in preserving this specific, deliberately-odd
  behavior faithfully.
- The `GroupId`-generation race condition (§6 of `docs/D-10-CUTOVER-ROLLBACK-STRATEGY.md`,
  already flagged High severity) has a **different concurrency profile** under each
  option: Option A's single-document-per-order write could use MongoDB's atomic
  single-document operations to *reduce* (not eliminate — see D-10 §6) the race window
  in a way Option B's N-separate-collection-writes cannot, which is a genuine technical
  trade-off, not just a style preference — but *choosing to fix/reduce a known race
  condition* is also a behavior-affecting decision requiring the same sign-off any other
  behavior change does (contract §5.3's precedent: the MariaDB-target transaction fix
  was itself something the contract had to pre-approve explicitly, not something an
  implementer could default into).

**Parity implications (apply under any eventual option):** `GroupId` generation format
(`$GetGId->GroupId + 1`) must produce the same *numeric* sequence behavior a fresh
MongoDB implementation reproduces, not merely "some unique ID" — contract P-16
explicitly protects this format. The admin-cancel status-code inconsistency (P-03) must
be reproduced exactly (`5`/`5`/`4` across the three logical record types), regardless of
which option nests them. The 5%-fee arithmetic (P-17, `AdminFee`/`SellerPay` computed
and stored on the `payments` record though no real payout occurs) is unaffected by
storage shape — it's pure arithmetic, carried on whichever record shape stores payment
data.

---

### 1.5 Appointments (`tbl_appointment`)

**Laravel relational behavior (VERIFIED):** Standalone table, no FK-by-convention
relationship to any other table (no `uid` column, purely anonymous bookings: `name`,
`age`, `gender`, `phone`, `appointment_date`, `consultant_hour`). Written by the public
`/save-appointment` route, read by one admin list page (`appointment-list`). 33 rows
(`DATABASE-ANALYSIS-MARIADB-SOURCE.md` §8).

**MongoDB modeling options:** Given zero relationships to any other entity, this is
the simplest table in the schema to map.

**PROPOSED: One `appointments` collection, one document per booking, direct 1:1 field
mapping.** No embedding question exists (nothing to embed into or from) and no
reference question exists (nothing references it, it references nothing). Flagged for
"particular scrutiny" per the owner's instruction primarily because it's an
**order-adjacent, real-world-commitment record** (a customer-facing booking, same
category of care as orders per D-10 §11's cutover-freeze recommendation) — not because
its *data model* is complex. Its cutover handling (whether appointment booking should be
frozen during cutover alongside checkout, per D-10 §11) is a D-10 concern, already
raised there, not repeated as a new decision here.

---

### 1.6 Enquiries (`enquiries`)

**Laravel relational behavior (VERIFIED):** Standalone, no relationships. 332
`INSERT` statements / 16,386 rows, the overwhelming majority confirmed spam/bot
submissions (`DATABASE-ANALYSIS-MARIADB-SOURCE.md` §8.1) — a public, unauthenticated,
unrate-limited form (contract §3.3 explicitly defers rate-limiting to a follow-on
project; not addressed here).

**PROPOSED: One `enquiries` collection, direct 1:1 field mapping**, same reasoning as
appointments — no relational complexity. **Data migration note (not a modeling
question, flagged for §M3-DATA-MIGRATION-MAP):** 16,386 rows of mostly-spam content is
a genuine question for that document's row-count/parity-check planning, not a schema
question — noted here only as a cross-reference.

---

### 1.7 Posts / Blog Content (`tbl_post`, `blogs`, `blog_category`, `tbl_homeopathy`)

**Laravel relational behavior (VERIFIED):** `tbl_post.post_diseases` → `categories.id`
(disease articles) and `tbl_post.post_homeopathy` → `tbl_homeopathy.id` (confirmed via
the one `leftJoin`, `AdminController.php:787`) are two **independent** FK-by-convention
relationships on the same table. `blogs.blog_catid` → `blog_category.id` is a separate,
unrelated content type (LIVE-orphan — no sidebar link, but functional, per blueprint
§3.3). Preserved defect P-04 (post create looks up category by slug, edit looks up by
id) lives entirely in application logic, not the data model.

**MongoDB modeling options for `tbl_post`'s two relationships:**

**PROPOSED: Reference by ID, not embed, for both `post_diseases` and
`post_homeopathy`.** Justification: disease/homeopathy-master records
(`categories`/`tbl_homeopathy`) are shared across many posts and read independently of
any specific post (disease listing pages, homeopathy-master admin CRUD) — embedding a
post's disease/homeopathy data into the post itself would duplicate shared master data
across many post documents and require multi-document updates if a category's name
ever changed, the classic case against embedding a many-referenced shared entity.

**PROPOSED for `blogs`/`blog_category`:** Same reasoning, reference by ID — a blog
category is shared across multiple blog posts and read independently (the blog-category
list admin page).

**Parity implications:** P-04's create-by-slug/edit-by-id asymmetry is pure application
logic in the controller methods resolving these references — unaffected by whether the
reference is a MongoDB ObjectId/lookup or a MariaDB FK-by-convention integer; must be
preserved exactly regardless (contract NN-4/F-16, this is a registered BROKEN-pattern
defect, not fixed here or anywhere without an Approved Fix Register entry).

---

### 1.8 Sliders (`slider`)

**Laravel relational behavior (VERIFIED):** No relationships. Full admin CRUD exists
(write path active). **Zero rows, and never read by the homepage template, which
hardcodes its banner images instead** (P-18, already a registered Preserved Defect —
"Sliders table maintained by admin but unused by the homepage. Preserve both sides.").

**PROPOSED: One `sliders` collection, direct 1:1 mapping, kept empty/unused exactly as
today.** This is the one table on the owner's "critical entities" list where the
*correct* modeling decision is closest to "do nothing interesting" — the entire point
of P-18 is that this table's disconnect from the homepage is a **preserved defect**,
not a data-modeling problem to solve. Flagging explicitly so no future engineer
"helpfully" wires the slider collection into the homepage template while porting it —
that would violate P-18/NN-8 (no feature "fixing") even though it would look like an
obvious improvement.

---

### 1.9 Pincodes (`pin_codes`)

**Laravel relational behavior (VERIFIED):** `docs/DATABASE-ANALYSIS-MARIADB-SOURCE.md`
already documents this as the schema's **column-name mismatch** case: the controller
writes columns (`pin_code`, `pin_address`) that do not exist in the live table (which
has `pincode`, `location`, `country`, `uid` instead) — confirmed BROKEN (B-09), every
save throws a SQL error in production today.

**MongoDB modeling implication — REQUIRES OWNER DECISION, but of a different kind than
the orders question above.** A schema-level column mismatch is a **BROKEN item** (NN-4:
"Broken stays broken... reproduce their observable failure... Repair requires an
approved entry in the Approved Fix Register"). This raises a genuine, not-yet-resolved
question this document flags rather than answers: **what does "reproduce a SQL
column-mismatch error" even mean for a schemaless MongoDB document, which has no
fixed-column concept to mismatch against?** A naive MongoDB `insertOne` with a field
name that doesn't match anything else simply *succeeds* and creates that field — there
is no equivalent failure mode to reproduce faithfully. This is not resolved here; it is
named as a concrete instance of the "BROKEN joins on non-existent columns" problem
class already flagged at a general level in `DATABASE-ANALYSIS-MARIADB-SOURCE.md` §12,
now made concrete for a specific table. **Candidate approaches (not chosen):** (a)
reproduce the failure by having the MongoDB write layer perform an equivalent
schema-validation check that rejects the mismatched field names, manufacturing an
artificial failure to match B-09's observable behavior; (b) treat this as one of the
Approved-Fix-Register candidates already flagged (OI-19-adjacent, from the M2 gate
report) and ask the owner whether B-09 should simply be fixed now that the underlying
storage engine no longer has the SQL-column concept that caused it. **Not decided
here.**

---

## 2. REMAINING TABLES — SUMMARY TREATMENT

Full detail (columns, types, keys, row counts) for every table below already exists in
`docs/DATABASE-ANALYSIS-MARIADB-SOURCE.md` §1/§9/§10 and is cited by table name, not
repeated. Modeling decision given here is proportional to how non-trivial the mapping
actually is — none of these tables has a relationship complex enough to need the
full-decision treatment given to §1's entities above.

| Table | Bucket | Preserve data? | PROPOSED collection treatment | Reason (brief) |
|---|---|---|---|---|
| `categories` | LIVE | Yes | Own collection, referenced by ID from `products`/`tbl_post` | Shared master data, read independently (disease-list pages) |
| `product_category` | LIVE-orphan | Yes | Own collection, self-referential `parent_id` preserved as a plain field (3-level tree, per blueprint §6.3) | Shared master data; self-reference is a pure application-logic tree-walk today, unaffected by storage engine |
| `product_features`, `product_variations`, `product_pkg` | VESTIGIAL | Yes (NN-10) | See §1.2 — **REQUIRES OWNER DECISION** on placement, not on whether to keep the data |
| `seller_profile`, `banks` | VESTIGIAL | Yes | See §1.1 — kept as a separate, rarely-touched collection |
| `baskets`, `sellerpayment` | VESTIGIAL (write-only, DEAD read path) | Yes (NN-10) | Own collections, unused by any live code, mirroring current status | No behavioral reason to change; DEAD `SuccessOrder` write path is itself not being ported (unrouted per blueprint) |
| `order_fullfill`, `statuscode`, `variation`, `password_resets` | VESTIGIAL (zero live reference) | Yes (NN-10) | Own collections, unused, mirroring current status | Same reasoning — preserve the data, preserve the non-use |
| `shipping` | VESTIGIAL (read call site commented out, P-09) | Yes (NN-10) | Own collection, unused by any live query (the read is commented out — carries no authority, contract §12.4) | Preserve P-09 exactly: delivery charge stays hardcoded `0` regardless of this table's content |
| `cities`, `statezones` | LIVE-orphan / LIVE | Yes | `statezones` own collection; `cities` own collection referencing `statezones` by ID | Shared, independently-admin-managed lookup data |
| `blog_category`, `blogs` | LIVE-orphan | Yes | See §1.7 | — |
| `product_review`, `product_specification` | LIVE | Yes | See §1.2 — embedded in `products` | — |
| `migrations` | Infrastructure, not application data | N/A | Not migrated — this is Laravel's own framework bookkeeping table, has no MongoDB equivalent need (Next.js's migration/build tooling is a different concern entirely) | Out of scope for data migration by definition |

---

## 3. CROSS-CUTTING FINDINGS — APPLY ACROSS MULTIPLE TABLES

### 3.1 Zero foreign keys, one non-PK index (re-confirmed against `public_html/`)

No new finding — `DATABASE-ANALYSIS-MARIADB-SOURCE.md` §4/§5 already established this
against `Database/db_newhomo.sql`, which is unchanged (OI-6 closed the *application
source* gap, not a database-schema gap; no new DB dump was supplied, confirmed §0 of
this document). Restated here because it directly bears on every embed/reference
decision above: **the source system enforces zero referential integrity at the
database level today.** Whatever MongoDB modeling choice is eventually made, it
inherits this baseline — an orphaned `orderproducts.ProductId` pointing at a deleted
product is already possible in the live system, and no MongoDB modeling decision
above is obligated to prevent it either (preserving the *absence* of a constraint is
itself a preservation requirement, not an oversight).

### 3.2 `int(21)` and other declared-width anomalies

`DATABASE-ANALYSIS-MARIADB-SOURCE.md` §7 already catalogues these (a widespread
`int(21)` pattern across `products`' category/type columns and several other tables'
ID-like columns, versus the dominant `int(11)`). **PROPOSED for the MongoDB mapping:**
these become plain BSON `Int32`/`Int64` fields with no declared-width concept —
MongoDB has no equivalent of MySQL's display-width `int(N)` (a cosmetic
display-formatting hint, not a value-range constraint, in MySQL/MariaDB) — so this
specific anomaly has **no MongoDB-side decision to make**; it simply ceases to exist
as a concept, without needing to be "preserved" in a meaningful sense, since it never
constrained actual stored values in MariaDB either.

### 3.3 Mixed `latin1`/`utf8mb4` character sets

`DATABASE-ANALYSIS-MARIADB-SOURCE.md` §8.3 already flags this as a genuine
data-integrity risk (several tables, including `products`, `categories`, `enquiries`,
`product_review`, `product_specification`, `product_images`, are `latin1`, not
`utf8mb4`). **REQUIRES OWNER DECISION, restated here because it is directly a data-migration
concern:** MongoDB stores all strings as UTF-8 internally — migrating `latin1`-encoded
column data requires an explicit encoding-conversion step during the transform phase
(§M3-DATA-MIGRATION-MAP), and a naive byte-for-byte copy risks mojibake on any non-ASCII
content those tables contain. Not resolved here; flagged as a data-migration-time
concern, cross-referenced into `docs/M3-DATA-MIGRATION-MAP.md`.

---

## 4. WHAT THIS DOCUMENT DOES NOT DO

- Does not create any MongoDB collection
- Does not connect to MongoDB Atlas or request credentials
- Does not migrate any data
- Does not finalize the Orders/OrderProducts/Payments modeling decision (§1.4) — flagged
  REQUIRES OWNER DECISION
- Does not finalize the vestigial-table-placement decision (§1.2, §2) — flagged REQUIRES
  OWNER DECISION
- Does not finalize how to reproduce `pin_codes`' BROKEN column-mismatch behavior (§1.9)
  in a schemaless target — flagged REQUIRES OWNER DECISION
- Does not modify `public_html/`, `spakshomeopathy.com/`, `Database/db_newhomo.sql`, or
  any file under `spakshomeopathy-next/src/`
- Does not begin M3 implementation of any kind

---

*Next documents: `docs/M3-MONGODB-ARCHITECTURE.md` (proposed collection/index/query
architecture built on the decisions and open questions above), `docs/M3-APPLICATION-MAPPING.md`
(route-level mapping, produced separately), `docs/M3-DATA-MIGRATION-MAP.md` (per-table
migration/transformation/parity plan), `docs/GATE-REPORT-M3.md` (this phase's gate
report, consolidating all four).*

# M3 Phase 1 — Proposed MongoDB / Next.js Target Architecture

**Status:** PROPOSED ARCHITECTURE ONLY. No MongoDB connection attempted. No collection
created. No credentials requested.
**Date:** 2026-08-16
**Builds directly on:** `docs/M3-DATABASE-MAPPING.md` (per-table decisions and open
questions — this document does not repeat that reasoning, only its conclusions)
**Governing documents:** `MIGRATION-CONTRACT.md`, `docs/D-11-DATABASE-ARCHITECTURE.md`,
`docs/D-10-CUTOVER-ROLLBACK-STRATEGY.md`

---

## LEGEND

Same as `docs/M3-DATABASE-MAPPING.md`: **VERIFIED** / **INFERRED** / **PROPOSED** /
**REQUIRES OWNER DECISION**. Everything in this document is PROPOSED unless labeled
otherwise — this entire document is an architecture proposal, not an implementation.

---

## 1. TARGET ARCHITECTURE DIAGRAM (PROPOSED)

```
Next.js
│
├── App Router
│     ├── Public routes           (no auth)
│     ├── Buyer routes            (session-based auth check, mirrors checkBuyer)
│     └── Admin routes            (session-based auth check, mirrors userAuth)
│
├── Server Components             — read-only page rendering (product listings,
│                                    category pages, static content)
├── Client Components             — interactive widgets requiring the exact jQuery-
│                                    plugin behaviors contract F-23 forbids reimplementing
│                                    (bxSlider, Owl Carousel, Fancybox, etc. — unaffected
│                                    by the database question, carried over unchanged
│                                    from M1/M2's existing analysis)
│
├── Route Handlers / Server Actions  — form submissions, cart mutations, checkout,
│                                       admin CRUD (the "AJAX/API-like" and "POST-action"
│                                       routes catalogued in docs/M3-APPLICATION-MAPPING.md)
│
├── Authentication                — session-based, mirrors Laravel's session-cookie
│                                    approach (contract §5.1 already pre-approves
│                                    "Laravel session (file) → DB- or Redis-backed
│                                    session... same keys, same lifetime")
│
├── Business logic                — ported 1:1 from public_html/ controllers, per
│                                    contract IR-8 (frozen without approval)
│
└── MongoDB data layer
        │
        └── MongoDB Atlas
              ├── Collections proposed in §2 below
              └── Session store (PROPOSED: a dedicated `sessions` collection,
                    consistent with contract §5.1's "DB-backed session" option —
                    an alternative, Redis, is also contract-permitted and not
                    ruled out here; this is a REQUIRES OWNER DECISION item, §6)
```

**Nothing above this line has been built.** This is the shape being proposed for
review, matching the format the owner specified in the instruction.

---

## 2. PROPOSED COLLECTIONS

Each row cites the `docs/M3-DATABASE-MAPPING.md` section its shape decision came from.
Collections marked **REQUIRES OWNER DECISION** in that document are listed here with
their open question restated, not resolved.

| # | Collection | Source table(s) | Shape | Status |
|---|---|---|---|---|
| 1 | `users` | `users` + embedded `buyer_profile` | One doc per user; buyer-type users carry an embedded `buyerProfile` sub-document | PROPOSED (§1.1) |
| 2 | `sellerProfiles` | `seller_profile` + `banks` (kept together, both vestigial, both read only by the same orphaned page) | Separate, low-traffic collection | PROPOSED (§1.1) |
| 3 | `products` | `products` + embedded `product_images`, `product_review`, `product_specification` | One doc per product, three embedded arrays | PROPOSED (§1.2) |
| 4 | `categories` | `categories` | Referenced by ID from `products`, `tbl_post` | PROPOSED (§1.2, §1.7) |
| 5 | `productCategories` | `product_category` | Self-referential `parentId` field, referenced by ID from `products` | PROPOSED (§2) |
| 6 | `orders` | `orders` + `orderproducts` + `payments` | **REQUIRES OWNER DECISION among 3 shape options** — see M3-DATABASE-MAPPING §1.4 | **NOT PROPOSED — open** |
| 7 | `appointments` | `tbl_appointment` | One doc per booking, no relationships | PROPOSED (§1.5) |
| 8 | `enquiries` | `enquiries` | One doc per submission, no relationships | PROPOSED (§1.6) |
| 9 | `posts` | `tbl_post` | Referenced `diseaseId` (→`categories`) and `homeopathyId` (→`tbl_homeopathy`) fields | PROPOSED (§1.7) |
| 10 | `homeopathyMaster` | `tbl_homeopathy` | Referenced by ID from `posts` | PROPOSED (§1.7) |
| 11 | `blogs` | `blogs` | Referenced `categoryId` field | PROPOSED (§1.7) |
| 12 | `blogCategories` | `blog_category` | Referenced by ID from `blogs` | PROPOSED (§1.7) |
| 13 | `sliders` | `slider` | One doc per slide, kept unused by the homepage (P-18) | PROPOSED (§1.8) |
| 14 | `pinCodes` | `pin_codes` | Shape itself is fine; **REQUIRES OWNER DECISION on how to reproduce B-09's column-mismatch failure** in a schemaless store | PROPOSED shape / **open failure-mode question** (§1.9) |
| 15 | `statezones` | `statezones` | Referenced by ID from `cities` | PROPOSED (§2) |
| 16 | `cities` | `cities` | Referenced `zoneId` field | PROPOSED (§2) |
| 17 | `productFeatures`, `productVariations`, `productPkg` | (3 vestigial tables) | **REQUIRES OWNER DECISION on placement** (ordinary unused collections vs. archival/export) — see M3-DATABASE-MAPPING §1.2 | **NOT PROPOSED — open** |
| 18 | `baskets`, `sellerPayments`, `orderFullfill`, `statusCodes`, `variations`, `passwordResets`, `shipping` | (7 vestigial/dead-write tables) | PROPOSED: ordinary, unused collections, mirroring current non-use exactly | PROPOSED (§2 of M3-DATABASE-MAPPING) |

**Not migrated:** `migrations` (Laravel framework bookkeeping — see
`docs/M3-DATABASE-MAPPING.md` §2, out of scope by definition).

**Cart:** no collection — session-based, not a data-migration concern (M3-DATABASE-MAPPING §1.3).

---

## 3. PROPOSED DOCUMENT SHAPES — the entities requiring genuine design, not 1:1 mechanical translation

### 3.1 `products` (PROPOSED, illustrative shape — not final field-by-field until §1.2's owner decisions above resolve)

```
{
  _id: ObjectId,
  legacyId: Int32,              // preserves the MariaDB `products.id` value for
                                  // migration-time traceability and any lingering
                                  // hardcoded external references (URLs, uploaded
                                  // filenames keyed by id, etc. — see
                                  // docs/M3-DATA-MIGRATION-MAP.md)
  pCat: Int32,                   // preserved AS-IS, overloaded meaning intact
                                  // (see M3-DATABASE-MAPPING §1.2 — do not split)
  pSubcat: Int32,
  pOcat: Int32,
  // ...all remaining top-level product fields, 1:1 from the 75-column source,
  //    including all 10 inline variant slots (pName..pName10, pMrp..pMrp10, etc.)
  //    per F-20's explicit protection — NOT restructured into an array of variants
  images: [ { legacyId: Int32, pImage: String } ],   // was product_images
  reviews: [ { legacyId: Int32, rName: String, rEmail: String, rRating: Int32,
               rReview: String, rStatus: Int32 } ],   // was product_review
  specifications: [ { legacyId: Int32, pHeading: String, pSpecification: String } ]
                                                        // was product_specification
}
```

**Why `legacyId` on every migrated document (PROPOSED, applies to every collection, not
just `products`):** MariaDB's `id` values are referenced in ways beyond in-database
joins — uploaded filenames sometimes encode IDs, external bookmarks/links may too. This
is not a modeling preference; it is a `docs/M3-DATA-MIGRATION-MAP.md`-level traceability
requirement, surfaced here because it affects every proposed shape above.

### 3.2 `orders` — NOT proposed pending the owner's decision in `docs/M3-DATABASE-MAPPING.md` §1.4

Illustrative sketches of what **Options A/B/C** would each look like, provided so the
owner's decision in the linked document has something concrete to evaluate against —
**none of these is being proposed as the answer**:

**Option A shape (embedded lines + embedded payments):**
```
{
  _id: ObjectId,
  groupId: Int32,          // preserves P-16's exact generation format/value
  legacyOrderId: Int32,     // was orders.id
  custId: ObjectId,         // references users
  orderStatus: Int32,       // header-level status
  lines: [ { productId: ObjectId, quantity: Int32, sellPrice: Int32,
             deliveryCharge: Int32, totalPrice: Int32, sellerId: ObjectId,
             buyerId: ObjectId, orderStatus: Int32 } ],  // was orderproducts,
                                                            // own orderStatus field
                                                            // preserved separately —
                                                            // needed for P-03
  payments: [ { qunt: Int32, amount: Int32, totalAmount: Int32, payStatus: Int32,
                orderStatus: Int32, adminFee: Int32, sellerPay: Int32,
                discount: Int32, payMode: String, payDate: Date } ]
                                                            // was payments, own
                                                            // orderStatus field too —
                                                            // P-03's third value
}
```

**Option B shape (three separate collections, unchanged structure):**
```
orders:          { _id, groupId, legacyOrderId, custId, orderStatus, ... }
orderProducts:    { _id, groupId, productId, quantity, orderStatus, ... }  // N per groupId
payments:         { _id, gid, pid, amount, payStatus, orderStatus, ... }   // N per groupId
```

**Both sketches preserve P-03's three-independent-status-value inconsistency and
P-16's GroupId format equally faithfully — the difference is write-path shape and
query-time reconstruction cost, not fidelity, exactly as already argued in
M3-DATABASE-MAPPING §1.4.** Repeated here only so this document's own reader has the
concrete alternatives in view; the decision itself is not made in either document.

---

## 4. PROPOSED INDEXES

Per contract §5.3 (additive indexes are pre-approved for the MariaDB case) and D-11 §3
(the fidelity mandate survives the engine swap) — the *principle* that indexes are
purely additive, non-behavior-changing infrastructure carries forward to MongoDB
indexes too. **None of these are created yet.** Proposed, based on the exact query
patterns already catalogued in `docs/DATABASE-ANALYSIS-MARIADB-SOURCE.md` §11 (the
37-join, 6-groupBy catalogue) and blueprint §6.4 (the currently-unindexed hot columns):

| Collection | Proposed index | Matches this query pattern |
|---|---|---|
| `products` | `pSlug` | `product-details/{slug}` lookups (currently unindexed in MariaDB too — blueprint §6.4) |
| `products` | `pCat`, `pStatus` | Category listing pages (6 of the catalogued `groupBy` sites) |
| `orders`/lines (whichever shape §1.4 resolves to) | `groupId` | The single most-queried relational key in the entire schema |
| `orderproducts` (if Option B) | `buyerId` | Buyer's own order-history page |
| `payments` (if Option B or C) | `gid` | Cancel-order / payment-status update paths |
| `users` | `email` (unique) | Login lookup — **note:** MariaDB has **no index on `users.email` today** (confirmed, `DATABASE-ANALYSIS-MARIADB-SOURCE.md` §5) despite it being the login lookup column; proposing one here is a pure performance addition with the same "cannot change result sets" safety property contract §5.3 already established for the MariaDB case — **flagged as requiring the same sign-off pattern**, not silently added |
| `posts` | `postDiseases`, `postHomeopathy` | The disease-detail post-listing query and the one `leftJoin` site |

**REQUIRES OWNER DECISION:** whether a `users.email` unique index is acceptable to add
(it is purely additive and cannot change result sets for valid data, mirroring contract
§5.3's MariaDB precedent — but "no unique indexes" is also explicitly named as a
constraint in that same section, written for the MariaDB case; whether that specific
restriction was about avoiding new failure modes under concurrent writes or was purely
about not exposing latent duplicate-email rows is not stated in the contract and
shouldn't be assumed). Not resolved here.

---

## 5. QUERY PATTERNS, TRANSACTIONS, AND CONCURRENCY — mapped from the existing catalogue

This section takes `docs/DATABASE-ANALYSIS-MARIADB-SOURCE.md` §11's 37 joins / 6
groupBys / 0 transactions and states, for each *pattern class* (not each individual
call site — that level of detail belongs in the eventual implementation, not this
architecture document), what the MongoDB-side mechanism would be:

| Source pattern | MongoDB mechanism (PROPOSED, mechanism only, not final code) |
|---|---|
| `products`⋈`product_images` (11 sites) | Eliminated — becomes a single-document read once `product_images` is embedded (§2 row 3) |
| `users`⋈`buyer_profile` (5 sites) | Eliminated — becomes a single-document read once embedded (§2 row 1) |
| `orderproducts`⋈`products`⋈`users`⋈`buyer_profile` (multi-way chains, #22-25) | Depends entirely on the still-open §1.4 orders decision — either a single-document read (Option A) or an application-level multi-query merge (Option B), explicitly not decided here |
| `payments`⋈`products`⋈`users` (×3, #26-31) | Same — depends on §1.4 |
| The ★ `orders.GroupId`↔`orderproducts.GroupId` join (#35) | Same — this join **is** the §1.4 question |
| `cities`⋈`statezones` (#32) | Application-level `$lookup` or a two-query merge — both are separate, independently-managed, genuinely-many-to-many-referenced collections (many cities, one zone, but zones are also independently admin-managed) — no embedding case argued for either in M3-DATABASE-MAPPING §2 |
| `tbl_post`⋈`tbl_homeopathy` (the one `leftJoin`, #37) | Application-level `$lookup`, `LEFT JOIN` semantics (tolerates a post with no matching homeopathy-master row) map to MongoDB's `$lookup` (which already returns an empty array for no match, the natural `LEFT JOIN`-equivalent) — a genuine, low-risk 1:1 mechanism match |
| `groupBy('product_images.p_id')` (6 sites) | Eliminated as a *query concern* once `product_images` is embedded — "one row per product with images attached" is simply what an embedded-array document already is; **this is a consequence of the §1.2 embedding decision, not a separately chosen simplification** |
| Zero transactions today; `GroupId`/`IncrementId` race (3 sites) | MongoDB offers both multi-document ACID transactions (Atlas, replica-set-backed) and atomic single-document `findOneAndUpdate` counters — **which one applies depends on the still-open §1.4 orders-shape decision** (Option A's single-document write could use an atomic counter pattern; Option B's N-collection write would need a multi-document transaction to get equivalent atomicity) — not decided here, and per `docs/D-10-CUTOVER-ROLLBACK-STRATEGY.md` §6, *whether to even fix this race* (versus faithfully reproducing its current unprotected form) is itself a behavior decision requiring separate sign-off, mirroring contract §5.3's precedent for the MariaDB case |

---

## 6. WHERE MARIADB PROVIDES BEHAVIOR MONGODB DOES NOT AUTOMATICALLY PROVIDE

Per the owner's specific instruction to pay particular attention here — consolidated
from findings already made in earlier documents, not re-derived, cited to their source:

| MariaDB behavior | MongoDB gap | Where already flagged |
|---|---|---|
| `ONLY_FULL_GROUP_BY`-tolerant `groupBy` queries | No equivalent concept — moot once `product_images` is embedded (§5 above), but the *general pattern* of "MariaDB silently tolerates a query shape MongoDB has no equivalent for" is the same class of gap | `DATABASE-ANALYSIS-MARIADB-SOURCE.md` §11.2, §12 |
| Zero FK constraints, but application-enforced convention relationships | MongoDB also has no FK mechanism — **this is not actually a gap**, since the source never relied on database-enforced integrity in the first place (`DATABASE-ANALYSIS-MARIADB-SOURCE.md` §4's own conclusion) | `M3-DATABASE-MAPPING.md` §3.1 |
| Shared MySQL `AUTO_INCREMENT` sequence semantics (used implicitly by the `GroupId`/`IncrementId` read-then-write pattern) | MongoDB has no native auto-increment; the existing pattern's race condition and its potential remedies are a genuine architectural gap requiring explicit design work, not a mechanical substitution | `D-10-CUTOVER-ROLLBACK-STRATEGY.md` §6, this document §5 |
| Single-database ACID transaction scope (implicitly relied upon for the multi-table order write today, even though no explicit transaction is used) | MongoDB Atlas *does* provide equivalent or better transactional guarantees (multi-document ACID on replica sets) — this is a case where the target is capable of *more* than the source ever used, which raises the question (already flagged, §1.4/§5) of whether to use that new capability to close R-6, a decision requiring sign-off, not a default | `D-10-CUTOVER-ROLLBACK-STRATEGY.md` §6 |
| `email(191)`-prefix-length index workaround (`password_resets_email_index`) — a MySQL/InnoDB-specific historical limitation | Not applicable — MongoDB has no equivalent byte-length index-key limit in the same form; the workaround itself has nothing to port, only the *underlying intent* (index `email` for fast lookup) survives | `DATABASE-ANALYSIS-MARIADB-SOURCE.md` §5 |
| `sql_mode`-dependent query tolerance in general | Already resolved as moot for this target — OI-2 DEFERRED/NOT APPLICABLE per D-11 | `GATE-REPORT-M0.md`/`M2.md` addenda |

---

## 7. VALIDATION, UNIQUE CONSTRAINTS

**PROPOSED, with the same caution as everywhere else in this document:** contract F-12
forbids adding validation that doesn't exist in the source, and F-21 forbids adding
unique indexes/FK constraints without approval (written for the MariaDB case, but
D-11 §3 explicitly carries the fidelity mandate forward). The source system has
**exactly one unique-ish constraint implied anywhere** — the buyer-registration email
uniqueness check (`Auth\RegisterController`'s `unique:users` validation rule, an
*application-level* Laravel validation rule, not a database unique index — confirmed no
unique index exists on `users.email` in the schema, §4 above). **PROPOSED:** replicate
this as application-level validation in the Next.js registration handler (a query
checking for an existing email before insert), matching the source's actual mechanism
(app-level check, not DB-level constraint) rather than "upgrading" it to a MongoDB
unique index — doing the latter would be adding a constraint the source never had,
which is exactly what F-21's MariaDB-case prohibition was written to prevent, and D-11
§3 says that principle survives the engine change.

---

## 8. WHAT THIS DOCUMENT DOES NOT DO

- Does not create any collection, index, or document in any MongoDB instance
- Does not connect to MongoDB Atlas
- Does not request or use any MongoDB credentials
- Does not finalize any of the REQUIRES OWNER DECISION items carried over from
  `docs/M3-DATABASE-MAPPING.md` (orders/orderproducts/payments shape; vestigial-table
  placement; `pin_codes`' BROKEN-behavior reproduction) or newly raised here
  (`users.email` unique index; session-store mechanism)
- Does not write any MongoDB driver code, connection string, or schema-validation rule
  in the Next.js project
- Does not modify `spakshomeopathy-next/src/` in any way

---

*Next: `docs/M3-APPLICATION-MAPPING.md` (route-level mapping, produced separately by a
parallel analysis pass), `docs/M3-DATA-MIGRATION-MAP.md`, `docs/GATE-REPORT-M3.md`.*

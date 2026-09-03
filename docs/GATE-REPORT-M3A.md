# MILESTONE GATE REPORT — M3-A: MongoDB Data Layer Foundation

**Milestone:** M3-A (first controlled implementation phase, per owner authorization)
**Period:** 2026-08-16
**Author:** Migration Implementer
**Report date:** 2026-08-16
**Contract version:** 1.0

---

## 0. CONTRACT ACKNOWLEDGEMENT

- [x] I have read `MIGRATION-CONTRACT.md` in full
- [x] I have read `blueprint.md` §0 (Governing Policy)
- [x] I have read `docs/D-11-DATABASE-ARCHITECTURE.md`,
      `docs/M3-DATABASE-MAPPING.md`, `docs/M3-MONGODB-ARCHITECTURE.md`,
      `docs/M3-OWNER-DECISION-RECORDS.md` — this phase implements DR-01 as
      approved and deliberately does NOT implement DR-02/03/04/05/06/07
- [x] I confirm no undocumented deviation was introduced
- [x] I confirm no production MongoDB was connected to or modified
- [x] I confirm no Laravel source (`public_html/`, `spakshomeopathy.com/`)
      was modified
- [x] I confirm no production data was migrated
- [x] I confirm no checkout, payment, authentication, admin, or public-page
      implementation occurred — foundation only, per the owner's explicit
      M3-A boundary

---

## 1. OBJECTIVE

**Owner-authorized scope (2026-08-16, "M3-A — MongoDB data layer
foundation"):** MongoDB Atlas connection abstraction, environment
configuration, TypeScript types/interfaces, collection
definitions/constants, indexes, repositories/data-access layer, validation
schemas, mapping utilities, test fixtures, unit tests, and migration
tooling *design* (not execution).

**Achieved:** ☑ Fully, for the scope specified. See §2 for the complete
file inventory and §8 for how each of the owner's 10 required report
sections is addressed.

---

## 2. COLLECTIONS CREATED/DESIGNED

**No collection was created in any real database — this section describes
what was DESIGNED (`src/lib/mongodb/collections.ts`) and VALIDATED
(`src/lib/mongodb/schemas/`), per the owner's explicit "collection
definitions/constants" and "validation schemas" allowances.**

### 2.1 Collection name constants

`src/lib/mongodb/collections.ts` — 29 named collections (per
`docs/M3-MONGODB-ARCHITECTURE.md` §2's proposed list), covering all 34
source MariaDB tables except `migrations` (out of scope by definition) and
the cart (session-based, no table to migrate). **DR-01 applied exactly as
approved:** `orders`, `orderProducts`, `payments` are three separate
named constants — no embedding, no collapsing into one collection.

### 2.2 Document schemas (Zod)

14 schema files under `src/lib/mongodb/schemas/`, covering the entities
the owner named as critical plus enough of the remaining schema to
establish the pattern:

| File | Collections covered | Depth |
|---|---|---|
| `common.ts` | shared primitives | — |
| `user.ts` | `users` (+ embedded `buyerProfile`) | Full |
| `sellerProfile.ts` | `sellerProfiles` (combines `seller_profile`+`banks`) | Full |
| `product.ts` | `products` (+ embedded images/reviews/specifications) | Full — all 75 source columns, all 10 variant slots individually named |
| `category.ts` | `categories`, `productCategories` | Full |
| `order.ts` | `orders`, `orderProducts`, `payments` | **Full, highest scrutiny** — see §4 |
| `appointment.ts` | `appointments` | Full |
| `enquiry.ts` | `enquiries` | Full |
| `post.ts` | `posts`, `homeopathyMaster`, `blogs`, `blogCategories` | Full |
| `slider.ts` | `sliders` | Full |
| `pinCode.ts` | `pinCodes` | Full — DR-03 groundwork, no decision applied |
| `geo.ts` | `statezones`, `cities` | Full |
| `vestigial.ts` | `productFeatures`, `productVariations`, `productPkg`, `baskets`, `sellerPayments`, `orderFullfill`, `statusCodes`, `variations`, `passwordResets`, `shipping` | Full — DR-02 groundwork, placement not decided |

**Not yet schema'd:** none of the 34 source tables are missing — every one
has either a dedicated schema file above or is explicitly out of scope
(`migrations`) or has no table at all (cart). This exceeds what M3-A's
authorized scope strictly required (which named the critical entities
specifically) — the remaining tables were added because the marginal cost
was low once the pattern was established, not because it was required.

**Every schema was checked column-by-column against
`Database/db_newhomo.sql`'s CREATE TABLE statements directly this
session**, not solely against the earlier `docs/DATABASE-ANALYSIS-MARIADB-SOURCE.md`
analysis — this caught and preserved several anomalies that would have
been easy to miss or "normalize" (see §9, Preserved Anomalies).

---

## 3. INDEXES

`src/lib/mongodb/indexes.ts` — 8 proposed non-unique indexes (definitions
only; `ensureIndexes()` is exported but never called anywhere in this
phase), matching `docs/M3-MONGODB-ARCHITECTURE.md` §4's list:
`products.pSlug`, `products.{pCat,pStatus}`, `orders.groupId`,
`orderProducts.groupId`, `orderProducts.buyerId`, `payments.gid`,
`posts.diseaseId`, `posts.homeopathyId`.

**DR-04's proposed `users.email` unique index is defined SEPARATELY**
(`proposedUniqueIndexesRequiringApproval`, not included in
`ensureIndexes()`'s default list) — per the owner's instruction that only
approved decisions get implemented; DR-04 was not approved, so this index
is designed but structurally excluded from being applied by default.

---

## 4. TYPE DEFINITIONS

Every schema file exports both the Zod schema and its inferred TypeScript
type (`z.infer<typeof x>`) — one source of truth, no hand-maintained
duplicate type/validator pair to drift apart.

**Orders group — the highest-scrutiny type definitions, per the owner's
DR-01 approval instruction to preserve ten specific behaviors:**

| Owner's required behavior | Where preserved |
|---|---|
| Order identity | `groupId` field on all three schemas — NOT any collection's own `legacyId`/`_id` |
| GroupId | `orders.groupId`, `orderProducts.groupId`, `payments.gid` — three field names, one linking value, matching source's own inconsistent naming (`GroupId` vs `gid`) exactly |
| Customer association | `orders.custId`, `orderProducts.buyerId`, `payments.cid` — three separately-named columns preserved as three separately-named fields, not unified |
| Product association | `orders.productId`, `orderProducts.productId`, `payments.pid` — same pattern |
| Order/product relationships | Preserved as plain reference fields, resolved at the repository layer, not embedded (DR-01 Option B) |
| Payment linkage | `payments.gid` → `orders.groupId`/`orderProducts.groupId` |
| Order status | THREE independent fields (`orders.orderStatus`, `orderProducts.orderStatus`, `payments.orderStatus`) — P-03's inconsistency is structurally preserved, not normalizable by the schema (see `tests/mongodb/schemas.test.ts`'s explicit P-03 test) |
| Pricing/totals | `orders.sellPrice` (STRING, source: varchar) vs. `orderProducts.sellPrice` (NUMBER, source: int) — the type mismatch between two similarly-named fields across collections is preserved exactly, unit-tested explicitly |
| Historical order information | All fields nullable/typed exactly per source; `legacyId` preserved on every document for migration traceability |
| Admin/customer order views | `getOrderByGroupId()`/`getOrderGroupIdsForBuyer()` in `orderRepository.ts` — see §5 |

**One additional type-fidelity finding, caught by direct re-verification
of the source (not assumed from the earlier analysis document):**
`orders.OrderId` is `int(11)` while `payments.orderId` is `varchar(255)` —
two differently-typed columns, same conceptual name, in two different
tables. Preserved as `orders.orderId: number | null` vs.
`payments.orderId: string | null` respectively — documented in both
schema files' comments and covered by an explicit unit test.

---

## 5. REPOSITORY/DATA-ACCESS STRUCTURE

`src/lib/mongodb/repositories/` — a `ValidatedRepository<T>` base class
(generic find/findOne/insertOne/count, Zod-validating every document that
crosses the boundary) plus 5 entity repositories: `UserRepository`,
`ProductRepository`, `CategoryRepository`/`ProductCategoryRepository`,
`PinCodeRepository`, and the DR-01 orders group
(`OrderRepository`/`OrderProductRepository`/`PaymentRepository` plus two
free functions, `getOrderByGroupId`/`getOrderGroupIdsForBuyer`, that
coordinate across all three).

**"Do not blindly translate SQL joins into inefficient MongoDB queries"
(owner's DR-01 instruction) — applied and documented at two points:**

1. **`getOrderByGroupId`** — the ★ join (`BuyerController.php:75-76`)
   becomes three parallel (`Promise.all`) queries, not a join. Documented
   inline as a "MongoDB-specific implementation difference," per the
   owner's explicit instruction to document every one.
2. **`ProductRepository`** — the 11 catalogued `products`⋈`product_images`
   join sites become **zero queries** (embedded array, already returned
   with the product). This is the single largest efficiency/fidelity win
   in this phase, and it's a *consequence* of the already-approved
   embedding decision in `docs/M3-DATABASE-MAPPING.md` §1.2, not a new,
   independently-made choice.

**No write methods exist for checkout/order-placement** — `insertOne` is
present on the base class (used by `PinCodeRepository.insertPinCode` as an
example) but no order-placement business logic was built, consistent with
the owner's explicit "checkout implementation... NOT allowed yet"
boundary.

---

## 6. VALIDATION

Every repository read/write passes through `ValidatedRepository`'s Zod
`.parse()` call — a malformed document throws immediately, with the
collection's schema file identifying exactly which field failed, rather
than propagating a wrong shape silently into application code.

**Fidelity discipline applied throughout (contract F-12 restated for
schemas, `docs/M3-MONGODB-ARCHITECTURE.md` §7):** every nullable source
column is a nullable/optional schema field; every NOT NULL source column
(a small minority — `users.name/email/password`, `products.pHeading`,
`orders.qrTransectionId`, `productCategories.catName`,
`sliders.*` [all four business columns], `orderFullfill.*`) is required.
No schema adds a stricter constraint than the source had.

---

## 7. QUERY MAPPINGS

Covered in §5 above (repository methods) and §9 below (documented
MongoDB-specific mechanisms). Summary table, Laravel source → MongoDB
mechanism, for every query pattern actually implemented this phase:

| Laravel source | MongoDB mechanism | File |
|---|---|---|
| `Auth\LoginController` email lookup | `UserRepository.findByEmail` | `userRepository.ts` |
| `Auth\RegisterController`'s `unique:users` check | `UserRepository.emailExists` (app-level check, matching source — no DB constraint applied, DR-04 not approved) | `userRepository.ts` |
| `HomeController::ProductDetail` slug lookup | `ProductRepository.findBySlug` | `productRepository.ts` |
| `GetCatProducts`/`GetAllProducts`/`TopProducts` category filter | `ProductRepository.findByCategory` | `productRepository.ts` |
| `HomeController::DiseasesList` type/status filter | `CategoryRepository.findByType` | `categoryRepository.ts` |
| `HomeController::SubCategory` parent-tree walk | `ProductCategoryRepository.findChildren` | `categoryRepository.ts` |
| ★ `BuyerController.php:75-76` order join | `getOrderByGroupId` | `orderRepository.ts` |
| `BuyerController` `ManageOrders` buyer filter | `getOrderGroupIdsForBuyer` | `orderRepository.ts` |

---

## 8. TESTS

**54 unit tests, 5 files, all passing, zero database connection required
for 53 of them (the 54th mocks the driver — see below):**

| File | Tests | What it proves |
|---|---|---|
| `tests/mongodb/schemas.test.ts` | 21 | Every fixture (a well-formed, faithfully-migrated document) passes its schema; deliberately-malformed variants are rejected; the specific preserved anomalies (sellPrice type mismatch, orderId type mismatch, misspellings, P-03's independent status values) are exercised explicitly |
| `tests/mongodb/mapping.test.ts` | 13 | `toLegacyId`/`decodeLatin1`/`preserveReference`/`toDate` — pure functions, no I/O |
| `tests/mongodb/env.test.ts` | 10 | `getMongoConfig()`'s fail-fast validation; the production-guard CONDITION (without importing the client) |
| `tests/mongodb/production-guard.test.ts` | 3 | The ACTUAL `getMongoClient()` guard, exercised against a **mocked** `MongoClient` (no real network connection) — proves `connect()` is never called when `MONGODB_ENV=production` without the explicit allow flag, and IS called when the flag is set or the env is development |
| `tests/infrastructure/env.test.ts` | 7 | Pre-existing (M0), unaffected — regression check |

**No test connects to a real MongoDB instance, development or
production.** This was a deliberate choice for M3-A: the owner's boundary
allows "development/local MongoDB configuration" to be designed, but
actually running tests against a live (even local/dev) MongoDB instance
would require provisioning one, which is arguably adjacent to but not
explicitly named in the M3-A allowed list. Unit tests instead validate
schemas, pure mapping functions, and the safety-guard logic directly. This
is flagged as a choice, not hidden — see §12.

---

## 9. PRESERVED ANOMALIES — DOCUMENTED, NOT NORMALIZED

Per contract §5.4/§10.2 ("never" list includes normalizing away
inconsistencies) and the owner's explicit "document every intentional
MongoDB-specific implementation difference" instruction, every anomaly
below was found by direct re-verification against
`Database/db_newhomo.sql` this session (not merely inherited from the
earlier analysis document) and preserved, not corrected:

| Anomaly | Where |
|---|---|
| `orders.sellPrice` (string) vs. `orderProducts.sellPrice` (number) | `order.ts`, unit-tested |
| `orders.orderId` (number) vs. `payments.orderId` (string) | `order.ts`, unit-tested — **newly caught this session**, not previously flagged in any earlier M3 document |
| `orderProducts.DelaveryDate`/`DelaveryBy` (misspelled "Delavery") | `order.ts`, field names preserved verbatim |
| `payments.qunt` (misspelled "quantity") | `order.ts`, field name preserved verbatim |
| `orders.qr_transection_id` (misspelled "transection") | `order.ts`, comment notes it, field itself is camelCased but the source spelling is documented |
| `baskets`' second, inconsistent camelCase naming convention (`custId`/`sellerId` vs. the live path's `CustId`/`SellerId`) | `vestigial.ts` |
| `sellerpayment.payStatus`/`orderId` as strings, unlike every sibling `payStatus` column (all int elsewhere) | `vestigial.ts` |
| `products.uid` always null (confirms B-07/B-08) | `product.ts`, and a unit test asserts null is accepted |
| `categories.type` enum comment's own typo ("harbels") | `category.ts`, comment preserves it verbatim |
| `pin_codes.status` as varchar, unlike every other numeric status column | `pinCode.ts`, unit-tested |
| `tbl_post.p_id` as a required varchar(400), not the integer its name suggests | `post.ts`, flagged for a future session not to "fix" |
| `products.p_name9` uniquely `varchar(600)` vs. every sibling slot's `varchar(400)` | `product.ts` comment on `variantSlotSchema` |

**None of these were corrected.** Each is preserved exactly as the source
declares it, with an inline comment explaining why, per this project's
standing discipline.

---

## 10. WHAT REMAINS UNIMPLEMENTED (BY DESIGN, PER THE M3-A BOUNDARY)

- No production MongoDB write, connection, or credential
- No data migration executed (only `mapping.ts`'s reusable primitives —
  `toLegacyId`, `decodeLatin1`, `toDate`, `preserveReference` — exist; no
  table-specific migration script was written)
- No checkout, payment, or order-placement business logic
- No authentication implementation (login/registration flows) — only the
  data-access primitives (`findByEmail`, `emailExists`) exist
- No admin implementation
- No public-page implementation
- No change to Laravel (`public_html/`, `spakshomeopathy.com/`)
- No deletion or modification of existing Laravel functionality
- `ensureIndexes()` exists but is never called — no index was applied to
  any real database
- 20 of 34 source tables have no repository class yet (schemas exist for
  all of them; repositories exist for the entities M3-A's scope actually
  required — users, products, categories, pinCodes, the orders group).
  Adding one is mechanical, following `ValidatedRepository`'s established
  pattern, whenever a later phase needs it.
- No integration test against a real (even local/dev) MongoDB instance —
  see §8's note on this deliberate choice

---

## 11. NEW RISKS

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| N-15 | The `orders.orderId`/`payments.orderId` type mismatch (number vs. string) was found only during this session's direct re-verification — it was NOT flagged in any earlier M3 document (`M3-DATABASE-MAPPING.md`, `M3-MONGODB-ARCHITECTURE.md`, `M3-DATA-MIGRATION-MAP.md`). This suggests the earlier documents' column-level detail, while extensive, was not 100% exhaustive. | Low-Medium | Medium — a future migration script trusting only the earlier documents (not re-checking source directly) could get this one wrong | Documented here, in the schema file, and unit-tested; flagged explicitly so future work re-verifies against source rather than trusting prior documents alone for column-level type details |
| N-16 | Unit tests validate schema/mapping/guard LOGIC but never exercise a real MongoDB query (`find`/`insertOne` against an actual collection) — a real Atlas/local MongoDB quirk (e.g. BSON type coercion surprises) could exist that these tests cannot catch | Low | Medium | Explicitly disclosed in §8/§12, not hidden; the next phase that provisions a real dev MongoDB instance should add integration-level tests before any production-adjacent work |
| N-17 | 20 of 34 tables have schemas but no repository — a future engineer needing one of them might duplicate `ValidatedRepository`'s pattern slightly differently rather than reusing it exactly | Low | Low | `ValidatedRepository`'s pattern is documented in `base.ts`'s own comments; the 5 existing repositories serve as consistent examples |

---

## 12. OWNER DECISIONS STILL BLOCKING SUBSEQUENT PHASES

Unchanged from `docs/M3-OWNER-DECISION-RECORDS.md`, restated with M3-A's
bearing on each:

| DR | Status | M3-A's treatment |
|---|---|---|
| DR-01 (orders shape) | **APPROVED, implemented this phase** | Three collections, application-level joins — see §4/§5 |
| DR-02 (vestigial placement) | Not approved | Schemas exist (`vestigial.ts`); collection names exist; no repository built; placement (ordinary vs. archival) still open |
| DR-03 (`pin_codes` B-09) | Not approved | Schema + a plain, working `insertPinCode` exist; the file explicitly does NOT implement either DR-03 option — see `pinCodeRepository.ts`'s header |
| DR-04 (email unique index) | Not approved | Index DEFINED but structurally excluded from `ensureIndexes()`'s default list; `UserRepository` enforces uniqueness at the application level only, matching source |
| DR-05 (session store) | Not approved (genuine ops decision, not fidelity) | Not implemented in M3-A — sessions were out of this phase's named scope entirely |
| DR-06 (charset conversion) | Not approved | `decodeLatin1` procedure exists in `mapping.ts`; WHETHER to spot-check first is still undecided, noted in the function's own comment |
| DR-07 (enquiries spam) | Default stands (migrate unfiltered, per NN-8/NN-10) | Not yet relevant — no migration executed this phase |
| DR-08 (header conflict) | **Resolved** (prior session) | N/A to this phase |

**M3-B (or whatever the owner designates next) remains blocked on:** DR-02
through DR-07 for their respective scopes (see the table above for exactly
which future work each blocks), and on the owner's own explicit,
un-given authorization to proceed past M3-A, per the standing instruction
this report itself must wait for.

---

## 13. TOOLCHAIN VERIFICATION

| Check | Result |
|---|---|
| `npm run typecheck` | ✅ Pass, 0 errors |
| `npm run lint` | ✅ Pass, 0 errors (1 real unused-import error found and fixed during this session — `pinCode.ts`'s unused `timestampSchema` import) |
| `npm run format:check` | ✅ Pass (4 files needed `prettier --write`, applied — import wrapping/quote-style only, no logic change) |
| `npm run test` | ✅ **54/54 pass** (47 new this phase + 7 pre-existing M0 tests, unaffected) |
| `npm run build` | ✅ Compiles; same 9 static (`○`) routes as before this phase — zero new pages, zero regression |

---

## 14. FILES CREATED

**30 files** (25 under `src/lib/mongodb/`, 5 under `tests/mongodb/`):

```
src/lib/mongodb/
├── client.ts                          — connection + production guard
├── collections.ts                     — 29 collection name constants
├── indexes.ts                         — 8 proposed indexes + DR-04's gated one
├── mapping.ts                         — 4 reusable migration primitives
├── schemas/
│   ├── common.ts, user.ts, sellerProfile.ts, product.ts, category.ts,
│   │   order.ts, appointment.ts, enquiry.ts, post.ts, slider.ts,
│   │   pinCode.ts, geo.ts, vestigial.ts, index.ts   (14 files)
└── repositories/
    ├── base.ts, userRepository.ts, productRepository.ts,
    │   categoryRepository.ts, pinCodeRepository.ts, orderRepository.ts,
    │   index.ts   (7 files)

tests/mongodb/
├── fixtures.ts, schemas.test.ts, mapping.test.ts, env.test.ts,
│   production-guard.test.ts   (5 files)
```

## 15. FILES MODIFIED

| Path | Change |
|---|---|
| `package.json` / `package-lock.json` | Added `mongodb@^6.21.0`, `zod@^4.4.3` as dependencies (zod was already a transitive dependency via `kysely-codegen`, now promoted to direct) |
| `.env.example` | Added the `MONGODB_*` variable block; marked the pre-existing `DATABASE_*` block as superseded-but-retained |
| `src/lib/env.ts` | Added `getMongoConfig()`; annotated `getDatabaseConfig()` as superseded |
| `src/lib/db/index.ts` | Annotated as superseded (no functional change — still a valid, if now-inert, module) |

## 16. FILES DELETED

**ZERO.**

---

## 17. NEW-DEPENDENCY SAFETY CHECK

`npm audit` shows 7 pre-existing advisories (kysely, postcss/next, vitest,
nanoid) — all pre-dating this session, already tracked as OI-5 in
`docs/GATE-REPORT-M0.md`. **Neither `mongodb` nor `zod` introduced any new
advisory** — confirmed via `npm ls mongodb zod`, both installed clean.

---

## 18. SIGN-OFF

**Implementer:** Migration Implementer **Date:** 2026-08-16

**Owner:** _________________________ **Date:** ___________

**M3-B (or next phase) authorized:** ☐ Yes ☑ **No — awaiting explicit owner
review of this report**

**Note:** Per the owner's instruction, this report stops here. No MongoDB
collection exists in any real database. No production connection was made
or attempted. No Laravel functionality was touched. Waiting for review.

---

*End of Milestone 3-A Gate Report*

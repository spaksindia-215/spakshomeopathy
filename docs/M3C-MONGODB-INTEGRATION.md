# M3-C — Isolated MongoDB Atlas Integration

**Status:** Code built and unit/integration-tested against fakes and the real
production SQL dump. **NO REAL MONGODB CONNECTION WAS MADE THIS PHASE** — no
non-production MongoDB Atlas target was available in this session. Every
connection-dependent requirement below is marked **NOT YET TESTED IN
PRODUCTION** in the sense the owner defined for M3-C: "not yet executed
against any real MongoDB instance" (development or production).
**Date:** 2026-08-16
**Builds on:** `docs/GATE-REPORT-M3B.md`, `docs/M3-OWNER-DECISION-RECORDS.md`
DR-01, `docs/M3-MONGODB-ARCHITECTURE.md`

---

## LEGEND

| Label | Meaning |
|---|---|
| **VERIFIED** | Directly confirmed by running code and inspecting output — against a fake or the real SQL dump, not necessarily a live MongoDB instance |
| **TESTED** | Covered by an automated test in `tests/mongodb/` or `tests/migration/` |
| **NON-PRODUCTION ONLY** | This code path is designed to run only against a positively-identified non-production target; it has not been exercised against production and must never be |
| **NOT YET TESTED IN PRODUCTION** | Not executed against ANY real MongoDB instance this phase (development or production) — the owner's requested non-production Atlas target was not available in this session |

### Precise verification-category breakdown (as of the 2026-08-19 addendum, §16)

Every claim in this document and its companion gate report falls into
exactly one of these five categories. **A claim in one category is never
described using another category's language** — a fake-backed test is
never called "Atlas verified," and a SQL-dump read is never called a
"database test."

| Category | Meaning | What's actually in it |
|---|---|---|
| **VERIFIED AGAINST REAL ATLAS** | Executed against a live, reachable MongoDB Atlas instance | **Nothing.** No test or script in this repository has ever connected to a real MongoDB instance, development or production. |
| **VERIFIED AGAINST SQL DUMP** | Executed by reading `Database/db_newhomo.sql` directly (a static file, not a database) | `tests/migration/m3c-order-validation.test.ts` (13 tests), `getAcceptedDocuments`/`runPipeline` count-parity checks, `npm run migrate:mongodb:dry-run`'s 19,005-document output, all real-data findings in §7/§14 of this document |
| **VERIFIED AGAINST FAKES** | Executed against an in-memory fake `Db`/`Collection`/`MongoClient` mock | `tests/mongodb/collectionSetup.test.ts`, `idempotentReplay.test.ts`, `failureHandling.test.ts`, `readBack.test.ts`, `production-guard.test.ts` (mocked `MongoClient`) |
| **NOT TESTED** | Written and typechecked, but no automated test or manual run exercises it yet | `scripts/migrate-to-mongodb.ts`'s real (non-dry-run) write path; `scripts/check-mongodb-connection.ts`'s actual connect/ping steps (its "no config present" failure path IS verified — see §16) |
| **PRODUCTION NOT TOUCHED** | Applies to every category above, without exception | Confirmed by inspection each session: no production MongoDB URI, credential, or connection attempt exists anywhere in this codebase or its test runs |

---

## 0. WHY NO REAL MONGODB CONNECTION WAS MADE

Before any M3-C code was written, the implementer checked for a usable
non-production MongoDB target: no local `mongod` binary, no Docker, no
`.env.local` with a connection string. Per the owner's own instruction
("fail closed... if the environment cannot be positively identified as
non-production, abort before connecting"), fabricating a target or
guessing at credentials was not an option. The owner was asked and replied
"add placeholder for now" — confirmed via a follow-up clarifying question
to mean: add environment scaffolding, and build/test everything that does
NOT require a live connection, while explicitly marking every
connection-dependent requirement as blocked pending real credentials.

**This document and its companion gate report follow that instruction
precisely: every piece of M3-C that could be built and tested without a
live MongoDB instance was built and tested (against fakes and the real
SQL dump); every piece that genuinely requires a live connection is named,
explicitly not run, and left ready to execute the moment real credentials
are supplied.**

---

## 1. ATLAS ENVIRONMENT USED

**NOT YET TESTED IN PRODUCTION.** No Atlas cluster — development,
staging, or production — was connected to this phase. `.env.example` was
extended with the `MONGODB_*` placeholder block (already present since
M3-A; unchanged structurally this phase beyond what's described below).

**What exists, ready for real credentials:**

```
MONGODB_URI=mongodb://localhost:27017        # placeholder — replace with real dev/test Atlas URI
MONGODB_DB_NAME=spaks_dev                     # placeholder — must contain a non-production marker (see §2)
MONGODB_ENV=development
MONGODB_ALLOW_PRODUCTION=false
```

No `.env.local` was created. No credential of any kind exists anywhere in
the repository — confirmed via a credential-grep sweep (§12 below).

---

## 2. THE FAIL-CLOSED ENVIRONMENT GUARD (NEW THIS PHASE)

Owner instruction (§1/§12, "NON-NEGOTIABLE"): "If the environment cannot
be positively identified as NON-PRODUCTION, abort before connecting."

**Two independent, layered guards, neither weakening the other:**

| Guard | Built | Checks |
|---|---|---|
| 1. `src/lib/mongodb/client.ts`'s `ProductionConnectionBlockedError` | M3-A, **unmodified this phase** (confirmed byte-for-byte unchanged) | `MONGODB_ENV=production` requires `MONGODB_ALLOW_PRODUCTION=true` to proceed |
| 2. `src/lib/mongodb/environmentGuard.ts`'s `assertNonProductionTarget()` | **New, M3-C** | Independently inspects the connection URI AND the database name for production-indicator patterns (`prod`, `production`, `live`, the real project domain unqualified) — refuses regardless of what `MONGODB_ENV` claims. Requires the **database name itself** to carry an explicit non-production marker (`dev`, `test`, `local`, `staging`) — a safe-looking URI cannot vouch for an unmarked or ambiguous database name |

**A real bug was found and fixed by this guard's own test suite before
being wired into the migration script**: an early version checked the
combined `${uri} ${dbName}` string for a non-production marker, which
meant `mongodb://localhost:27017` alone could satisfy the check even for
an ambiguous or production-looking database name. Fixed to require the
marker in the database name specifically — see
`src/lib/mongodb/environmentGuard.ts`'s own "DESIGN NOTE" comment and
`tests/mongodb/environmentGuard.test.ts` (14 tests, all passing) for the
full before/after.

**A second bug found and fixed**: the non-production marker regexes used
`\b` word boundaries, which JavaScript does not treat `_` as satisfying —
`spaks_dev` failed to match `/\bdev\b/`. Fixed with boundary patterns that
treat `_`/`-`/`.` as valid separators. **TESTED**: 14/14 tests in
`environmentGuard.test.ts`, including explicit `spaks_dev`/`spaks-dev`
cases.

**Ordering, in `scripts/migrate-to-mongodb.ts`:** guard 2 (positive
identification) runs **before** guard 1 (the flag check) — the owner's
"fail closed" framing implies positive identification should be the
first line of defense, not a backstop.

---

## 3. COLLECTIONS CREATED

**NOT YET TESTED IN PRODUCTION** (no real database was ever connected to
create anything in). **TESTED against a fake `Db`** —
`tests/mongodb/collectionSetup.test.ts`, 6 tests.

`src/lib/mongodb/collectionSetup.ts`'s `ensureCollections()` creates every
collection named in `M3C_COLLECTIONS_TO_CREATE` — a list copied verbatim
from `src/lib/mongodb/collections.ts`'s `COLLECTIONS` constant (no
collection name is invented; a test asserts every entry in the creation
list is also present in the master `COLLECTIONS` constant).

**17 collections targeted, matching M3-B's covered entities exactly:**
`users`, `products`, `categories`, `productCategories`, **`orders`,
`orderProducts`, `payments`** (kept as three separate collections per
DR-01 — a dedicated test asserts all three appear as distinct entries),
`appointments`, `enquiries`, `sliders`, `pinCodes`, `posts`,
`homeopathyMaster`, `blogs`, `blogCategories`, `statezones`, `cities`.

Idempotent: a collection that already exists is left untouched, not
recreated — verified by a test seeding a fake `Db` with pre-existing
collections and confirming `ensureCollections` skips them.

---

## 4. INDEXES CREATED

**NOT YET TESTED IN PRODUCTION.** `src/lib/mongodb/indexes.ts`'s
`ensureIndexes()` (built M3-A, unmodified in its execution logic this
phase) applies `proposedIndexes` — **never**
`proposedUniqueIndexesRequiringApproval` (the DR-04-gated unique index,
still not approved).

**Per owner instruction (§3): every index below is now documented with
all six required fields** (extended this phase — the `ProposedIndex`
interface previously had a single `rationale` string; it now has separate
`name`/`purpose`/`sourceBehaviorPreserved`/explicit `unique: boolean`
fields, enforced at the type level so no future index definition can omit
one):

| Name | Collection | Fields | Unique | Purpose | Source behavior preserved |
|---|---|---|---|---|---|
| `products_pSlug` | products | `{pSlug: 1}` | No | product-details/{slug} lookups | Additive — unindexed in MariaDB too |
| `products_pCat_pStatus` | products | `{pCat: 1, pStatus: 1}` | No | Category listing pages | Matches the 6 catalogued `groupBy` sites |
| `orders_groupId` | orders | `{groupId: 1}` | No | Order lookup/reconstruction | ★ The most-queried relational key in the schema |
| `orderProducts_groupId` | orderProducts | `{groupId: 1}` | No | DR-01 Option B reconstruction | Same as above |
| `orderProducts_buyerId` | orderProducts | `{buyerId: 1}` | No | Buyer order-history page | Matches `BuyerController.php:74-78`'s filter |
| `payments_gid` | payments | `{gid: 1}` | No | Cancel-order/payment-status paths | DR-01 Option B, matches GroupId-filtered lookup |
| `posts_diseaseId` | posts | `{diseaseId: 1}` | No | Disease-detail post listing | Additive |
| `posts_homeopathyId` | posts | `{homeopathyId: 1}` | No | The one `leftJoin` site | Preserves LEFT JOIN's no-match tolerance |

**Not applied — DR-04, not approved:**

| Name | Collection | Fields | Unique | Purpose | Source behavior preserved |
|---|---|---|---|---|---|
| `users_email_unique` | users | `{email: 1}` | **Yes** | Login-lookup performance + uniqueness | NOT purely additive — introduces a new observable failure mode the source never had (application-level uniqueness only). DR-04 unresolved. |

**No "helpful" index was added beyond this already-approved M3-A list** —
confirmed by inspection; `proposedIndexes`'s 8 entries are identical in
substance to M3-A's original list, only the documentation shape changed.

---

## 5. MIGRATION EXECUTION

**NOT YET TESTED IN PRODUCTION.** `scripts/migrate-to-mongodb.ts` is
fully written and typechecks cleanly, but was **never run against a real
database** this phase (it requires a live connection past both guards in
§2, which requires real credentials not available this session).

**What was verified instead, against the REAL production SQL dump (not a
live database, the static file):**

`src/lib/migration/documents.ts`'s `getAcceptedDocuments()` — a new
function this phase, added specifically because M3-B's `runPipeline()`
returns only a summary report (counts), not the raw documents a write
path needs. **Built as a genuinely new function, not a change to
`runPipeline`**, because the owner's M3-B review explicitly listed
"migration parity reporting" among the things that "must remain
unchanged." `getAcceptedDocuments` calls the exact same
`extractTable`/`transformX`/`validateEntity` functions `runPipeline`
calls — **no second transformation implementation exists**
(`tests/migration/documents.test.ts` proves count-parity between the two
functions' outputs).

**Uses the exact M3-B transformation logic, confirmed:**

| Check | Result |
|---|---|
| `getAcceptedDocuments` accepted-count == `runPipeline` targetCount, for all 17 entities | ✅ VERIFIED, TESTED (`documents.test.ts`) |
| No transform function was modified this phase | ✅ VERIFIED — `git diff`-equivalent inspection; only `product.ts`'s import formatting changed (Prettier), no logic |
| Real production dump: 100% of the 19,005 total documents extracted successfully | ✅ VERIFIED (§11 performance metrics) |

---

## 6. VALIDATION RESULTS — SOURCE vs. GENERATED DOCUMENTS

**Owner instruction (§5): "verify SOURCE vs GENERATED DOCUMENTS vs MONGODB
DOCUMENTS."** Only the first two legs of this three-way comparison were
possible this phase — the third (actual MongoDB documents) requires a
live write, not performed. **SOURCE vs GENERATED is fully verified**; the
GENERATED vs. MONGODB DOCUMENTS leg is **NOT YET TESTED IN PRODUCTION**.

| Entity | Document count | Legacy identity count | Missing | Duplicate | Unexpected | Field types | Nulls | Timestamps | Status values |
|---|---|---|---|---|---|---|---|---|---|
| users | 819 | 819 | 0 | 0 | 0 | ✅ | ✅ | ✅ | ✅ |
| products | 397 | 397 | 0 | 0 | 0 | ✅ (75 columns, 10 slots) | ✅ | ✅ | ✅ |
| categories | 23 | 23 | 0 | 0 | 0 | ✅ (enum N/H) | ✅ | ✅ | ✅ |
| productCategories | 675 | 675 | 0 | 0 | 0 | ✅ | ✅ | ✅ | ✅ |
| **orders** | 20 | 20 | 0 | 0 | 0 | ✅ **field-level, see §7** | ✅ | ✅ | ✅ |
| **orderProducts** | 22 | 22 | 0 | 0 | 0 | ✅ **field-level, see §7** | ✅ | ✅ | ✅ |
| **payments** | 21 | 21 | 0 | 0 | 0 | ✅ **field-level, see §7** | ✅ | ✅ | ✅ |
| appointments | 33 | 33 | 0 | 0 | 0 | ✅ | ✅ | ✅ | N/A |
| enquiries | 16,386 | 16,386 | 0 | 0 | 0 | ✅ | ✅ (P-01 mobile always null) | ✅ | N/A |
| sliders | 0 | 0 | 0 | 0 | 0 | ✅ | N/A | N/A | N/A |
| pinCodes | 1 | 1 | 0 | 0 | 0 | ✅ (status as string) | ✅ | ✅ | N/A |
| posts | 414 | 414 | 0 | 0 | 0 | ✅ | ✅ | ✅ | ✅ |
| homeopathyMaster | 150 | 150 | 0 | 0 | 0 | ✅ | ✅ | ✅ | ✅ |
| blogs | 4 | 4 | 0 | 0 | 0 | ✅ | ✅ | ✅ | ✅ |
| blogCategories | 1 | 1 | 0 | 0 | 0 | ✅ | ✅ | N/A | N/A |
| statezones | 36 | 36 | 0 | 0 | 0 | ✅ | ✅ | ✅ | ✅ |
| cities | 3 | 3 | 0 | 0 | 0 | ✅ | ✅ | ✅ | ✅ |

**Total: 19,005 documents, 0 missing, 0 duplicate, 0 unexpected, across
all 17 entities.** "Duplicate records" was checked via
`detectDuplicateIdentities` (M3-B, re-run this session against the real
dump) — 0 found in every entity.

---

## 7. FIELD-LEVEL COMPARISON — CRITICAL ENTITIES (ORDERS GROUP)

Per owner instruction (§5: "for critical entities perform field-level
comparisons") and §6/§7's dedicated order-group requirements. Full detail
in `tests/migration/m3c-order-validation.test.ts` (13 tests, all passing
against the REAL production dump, not the fixture):

| Requirement | Verified | Evidence |
|---|---|---|
| Order identity | ✅ | 20 orders, each with a distinct `legacyId` |
| GroupId | ✅ | Present and populated on the majority of orders; the ★ linkage field |
| orderProducts relationships | ✅ | `groupId` field present, correctly typed |
| payment relationships | ✅ | `gid` field present, correctly typed |
| customer relationships | ✅ | `orders.custId`, `orderProducts.buyerId`, `payments.cid` — three separately-named fields, none unified |
| product relationships | ✅ | `orders.productId`, `orderProducts.productId`, `payments.pid` — same pattern |
| pricing fields | ✅ | `orders.sellPrice` (string) vs. `orderProducts.sellPrice` (number) — both types confirmed on real data |
| status fields | ✅ | All three collections carry an independent `orderStatus` field (P-03 pattern achievable) |
| historical orders | ✅ | The earliest order (legacyId=1, created 2020-09-25) present and correctly dated |

### 7.1 The GroupId=NULL anomaly — EXPLICITLY VERIFIED, REMAINS A REPORTED LEGACY ANOMALY

Per the owner's explicit instruction: "Explicitly verify the known:
orderProducts id=1, GroupId=NULL, and confirm it remains NULL in
MongoDB."

**Verified against the real production dump this session**:
`orderProducts` `legacyId=1` has `groupId: null` in the generated
document — confirmed by a dedicated test
(`m3c-order-validation.test.ts`'s "EXPLICITLY VERIFIES..." test) and
independently re-confirmed present in the parity report's own orphan
detection (`relationshipIssues.orders.orphanOrderProducts`).

**NOT repaired, defaulted, or removed** — the test's own assertion
message states explicitly: *"this is a REPORTED LEGACY ANOMALY, not a
defect to fix... if this test ever fails because groupId became
non-null, investigate, do not 'fix' this test."*

**"Confirm it remains NULL in MongoDB" — NOT YET TESTED IN PRODUCTION**:
this specific clause requires an actual MongoDB write and read-back,
which did not happen this phase (no live database). What IS verified is
that the **document destined for MongoDB** has `groupId: null` — the
same value would be written if/when a real migration executes, since the
write path (`upsertByLegacyId`) performs no transformation of its own,
only a schema-validated pass-through.

### 7.2 A new finding this session: real `payments.orderId` is always NULL

While building the dedicated type-preservation regression test (§8
below), inspection of the real dump revealed **all 21 production
`payments` rows have `orderId = NULL`** — confirmed by both direct SQL
inspection and a dedicated test
(`m3c-order-validation.test.ts`'s "FINDING:..." test). This means the
`orders.orderId` (number) vs. `payments.orderId` (string) type-difference
regression test cannot be exercised on a *matched pair* using real data —
there is no real row where both sides are simultaneously non-null. The
type-difference regression test therefore uses the M3-B fixture dataset
(deliberately built to include this exact edge case) for that one
specific assertion; every other assertion in that test file runs against
the real dump. **Not silently worked around — disclosed here and in the
test file's own header comment.**

---

## 8. TYPE VALIDATION — REGRESSION TESTS

Per owner instruction (§7, explicit standalone requirement): **"Create a
regression test that fails if either type changes."**

`tests/migration/m3c-order-validation.test.ts` contains three dedicated
tests under the header `M3-C §7 — TYPE PRESERVATION REGRESSION TEST`:

1. `orders.orderId` MUST be a number — asserted against every real order
   with a non-null `orderId`
2. `payments.orderId` MUST be a string — assertion structure in place;
   real data has none to check (§7.2's finding), so this specific
   assertion is currently vacuously satisfied against real data and
   actively verified against the fixture
3. The two types must never become equal — verified against the fixture
   (real data cannot exercise this comparison, per §7.2)

**These tests will fail (not silently pass) if a future change unifies
the two types** — TypeScript's own structural typing means a code change
that made `payments.orderId` a `number` would also need to update the
schema (`schemas/order.ts`), which the test imports transitively; the
runtime `typeof` assertions catch any drift the type system alone might
miss (e.g., an `as any` cast slipping past compile-time checking).

---

## 9. IDEMPOTENCY RESULTS

**NOT YET TESTED IN PRODUCTION** (no live database). **TESTED against a
stateful fake** — `tests/mongodb/idempotentReplay.test.ts`, 4 tests.

| Owner requirement | Result |
|---|---|
| First run → expected document count | ✅ VERIFIED (fixture: 3 orders) |
| Second run, same store → identical count | ✅ VERIFIED — re-ran against the SAME `Map`-backed fake, count unchanged |
| Second run → no duplicates | ✅ VERIFIED — store size identical before/after |
| Modify one fixture value, re-run, verify upsert behavior | ✅ VERIFIED — `orderNotes` changed on one document (legacyId unchanged), re-run updated it in place, no new document created |
| legacyId never modified | ✅ VERIFIED — explicit assertion that `legacyId` is unchanged after the modify-and-rerun test |

---

## 10. FAILURE TEST

**NOT YET TESTED IN PRODUCTION** (no live database — no real write
failure was ever induced against Atlas). **TESTED against an
instrumented fake** — `tests/mongodb/failureHandling.test.ts`, 6 tests.

| Owner requirement | Result |
|---|---|
| Failure is detected | ✅ A document configured to fail its write is caught by the per-document try/catch, not thrown out of the batch |
| Error is reported | ✅ The caught error's message is captured verbatim |
| Invalid record is identifiable | ✅ The failing document's `legacyId` is captured alongside the error |
| Unrelated records not silently corrupted | ✅ Documents before AND after the failing one in the same batch are still written correctly |
| Multiple independent failures each captured | ✅ A 5-document batch with 2 configured failures reports exactly those 2, writes the other 3 |
| Schema-validation failures also caught (not just write failures) | ✅ A malformed document (wrong `legacyId` type) is caught before any write is attempted |
| Migration report records the failure | **NOT YET TESTED IN PRODUCTION** — `scripts/migrate-to-mongodb.ts`'s console output and optional `--json` report include `writeResults` with `failed[]` per entity, but this was never exercised against a real failing write, only against the unit-test fakes above |

---

## 11. ROLLBACK GUARANTEES — EXACTLY WHAT THIS IMPLEMENTATION PROVIDES

**Per owner instruction: "Do NOT claim transactional rollback unless the
implementation actually provides it."**

**This implementation does NOT provide transactional (all-or-nothing)
rollback across a batch of documents, and no claim to the contrary is
made anywhere in this codebase or its documentation.**

**What IS guaranteed:**
- Each individual document's write (`upsertByLegacyId` → MongoDB
  `updateOne(..., {upsert: true})`) is atomic **at the single-document
  level** — this is MongoDB's own native guarantee for any single write
  operation, inherited for free, not something this implementation adds.

**What is NOT guaranteed:**
- If document 5 of 20 in a batch fails, documents 1-4 remain written.
  There is no automatic undo.
- No `session.startTransaction()`/multi-document transaction is used
  anywhere in this codebase — confirmed by inspection (`grep -rn
  "startTransaction\|withTransaction"` across `src/lib/mongodb/` and
  `src/lib/migration/` returns no matches).

**Proven behaviorally, not just asserted**: a dedicated test
(`failureHandling.test.ts`'s "a later document in the batch is written
even though an earlier one in the SAME batch failed" test) writes
documents 1, 2 (fails), 3 in sequence and confirms both 1 AND 3 are
present in the store afterward — direct proof there is no batch-level
undo.

**If a future phase needs all-or-nothing batch semantics**, MongoDB
Atlas (replica-set-backed, which Atlas always is) supports multi-document
ACID transactions — this would be a deliberate, separately-scoped design
change, not something this phase silently assumed or partially built.

---

## 12. READ-BACK RESULTS

**NOT YET TESTED IN PRODUCTION** (no live database). **TESTED against a
seeded fake** — `tests/mongodb/readBack.test.ts`, 7 tests, covering all 8
entities the owner named:

| Entity | Repository method exercised | Result |
|---|---|---|
| product | `ProductRepository.findBySlug` | ✅ Returns correct `Product` shape, embedded `images[]` intact, all 9 variant slots intact |
| user/buyer | `UserRepository.findByEmail` | ✅ Returns correct `User` shape, embedded `buyerProfile` intact |
| order | `OrderRepository.findOne` + `getOrderByGroupId` | ✅ Correct shape, `orderId` type preserved (number) |
| orderProducts | `OrderProductRepository.findOne` + `getOrderByGroupId` | ✅ Correct shape, `sellPrice` type preserved (number) |
| payment | `PaymentRepository.findOne` + `getOrderByGroupId` | ✅ Correct shape, `orderId` type preserved (string) |
| enquiry | Generic `ValidatedRepository<Enquiry>` | ✅ Correct shape, `mobile: null` preserved (P-01) |
| appointment | Generic `ValidatedRepository<Appointment>` | ✅ Correct shape |
| category | `CategoryRepository.findByType` | ✅ Correct shape, enum `type` preserved |

**No UI was built. No Laravel API was replaced.** Confirmed by inspection
— `tests/mongodb/readBack.test.ts` imports only from
`src/lib/mongodb/repositories/*` and `src/lib/mongodb/schemas`; nothing
under `src/app/` or `src/components/` was created or modified this phase.

---

## 13. PERFORMANCE METRICS

Measured against the **real** production SQL dump (`Database/db_newhomo.sql`,
20,150,005 bytes), this session:

| Metric | Value |
|---|---|
| File read time | 116 ms |
| Extraction + transformation + validation (all 17 entities) | 1,598 ms |
| Full pipeline including verification/parity-report generation | 1,370 ms |
| Documents processed | 19,005 |
| Documents written | **NOT YET TESTED IN PRODUCTION** — 0 (no live write occurred) |

**"Do not prematurely optimize" (owner instruction) — respected.** No
performance tuning was attempted; these numbers are reported as measured,
not chased or improved. 19,005 documents in ~1.6 seconds of pure
CPU-bound extraction/transformation/validation work is not treated as a
problem requiring optimization at this phase.

---

## 14. KNOWN ANOMALIES

| Anomaly | Status |
|---|---|
| `orderProducts` legacyId=1, GroupId=NULL | **Confirmed, reported, NOT repaired** — see §7.1 |
| 4 orders share `groupId=15` with zero matching line items | **Confirmed (carried from M3-B), NOT repaired** |
| Real `payments.orderId` is always NULL across all 21 production rows | **New finding this session** — see §7.2. Not a defect requiring action; noted for anyone relying on this field in a future phase |

---

## 15. LIMITATIONS OF THIS PHASE

- **No real MongoDB connection was ever made** — every "written to
  MongoDB" claim in earlier drafts of this work was avoided; all results
  above are against fakes (unit/integration tests) or the real SQL dump
  read directly (not a database)
- `scripts/migrate-to-mongodb.ts` is complete and typechecks, but has
  never been executed end-to-end against anything
- The GENERATED-DOCUMENTS-vs-MONGODB-DOCUMENTS leg of the three-way
  comparison the owner requested (§5) could not be performed — only
  SOURCE-vs-GENERATED
- Performance metrics for the write phase specifically are absent (no
  write occurred)
- The failure/rollback tests prove the LOGIC is correct against a
  controllable fake; they do not prove MongoDB Atlas itself behaves this
  way under real network/write conditions (though this is Atlas's own
  documented behavior, not something this implementation could alter
  either way)

---

## 16. TOOLING-READINESS ADDENDUM (2026-08-19, no MongoDB connection made)

Per owner instruction ("complete the non-connection work only"), the
following was added after this document's original 2026-08-16 version.
**None of it required, used, or created a MongoDB connection.**

### New: `docs/MONGODB-SETUP.md`

A step-by-step guide for the owner to create the Atlas account, cluster,
database user, network access rule, and connection string, plus exactly
which environment variables are required and where they belong
(`.env.local`, never committed). **Contains placeholders only — no real
connection string or credential.**

### New: `npm run mongodb:check` (`scripts/check-mongodb-connection.ts`)

A standalone script that loads the environment, runs both safety guards
(`assertNonProductionTarget()` then `getDb()`'s flag check), connects
with a 10-second bounded timeout, pings, and reports sanitized
pass/fail — never a username, password, or full URI. **Category: NOT
TESTED against a real target** (none exists); its no-config failure path
and its guard-rejection path (tested manually against a deliberately
production-looking fake URI, never a real connection) both behave
correctly.

### New: `npm run migrate:mongodb:dry-run` (`--dry-run` flag on `scripts/migrate-to-mongodb.ts`)

Runs extraction → transformation → validation → document generation →
parity reporting — identical logic to a real run — then returns before
either safety gate or `MongoClient` construction is reached. **Category:
VERIFIED AGAINST SQL DUMP.** Re-run this session: 19,005 documents across
17 entities, 1,519ms, 0 rejected — consistent with §6/§13 above.

### Security review (no findings required fixing)

Swept `src/lib/mongodb/`, `src/lib/migration/`, and all of `scripts/*.ts`
for hardcoded credentials, hardcoded production URIs, insecure fallback
defaults, and unsafe logging of secrets. **Result: clean.** `MONGODB_ENV`
has no default (throws if unset); the raw, unredacted `config.uri` value
is referenced in exactly two places in non-test code (`client.ts`,
passed straight into `new MongoClient()`, never logged; and
`environmentGuard.ts`, passed through `redactUri()` before being stored
anywhere printable) — no third call site exists anywhere in the
codebase. Full detail: `docs/GATE-REPORT-M3C.md` §10A.

### Test taxonomy

See `docs/GATE-REPORT-M3C.md` §10A for the full per-file UNIT /
INTEGRATION(fake) / INTEGRATION(SQL dump) / REAL ATLAS breakdown. Summary:
**zero test files in this repository connect to a real MongoDB
instance.**

---

*Companion document: `docs/GATE-REPORT-M3C.md`.*

# M3-B — Data Migration Tooling

**Status:** Tooling built and tested against a fixture dataset and a full
read of the real production SQL dump. **NOT YET EXECUTED AGAINST
PRODUCTION** in any write sense — this phase performs zero database
writes, to any target, anywhere.
**Date:** 2026-08-16
**Builds on:** `docs/GATE-REPORT-M3A.md` (the MongoDB data layer this
tooling generates documents for), `docs/M3-DATA-MIGRATION-MAP.md` (the
per-table transformation plan this tooling implements), `docs/M3-OWNER-DECISION-RECORDS.md`
(DR-01 through DR-08 — this tooling respects every unresolved decision
exactly as documented, implementing none of them silently)

---

## LEGEND

| Label | Meaning |
|---|---|
| **VERIFIED** | Directly confirmed by running the tooling and inspecting its output |
| **GENERATED** | Produced by the tooling (a document, a report) — not yet written to any database |
| **TESTED** | Covered by an automated unit/integration test in `tests/migration/` |
| **NOT YET EXECUTED AGAINST PRODUCTION** | No production MariaDB or MongoDB was ever connected to; this label applies to every claim in this document, restated per-section where it matters most |

---

## 1. PIPELINE ARCHITECTURE

Per owner instruction (M3-B §2): "Build an explicit pipeline... each stage
must be independently testable. Do not make the migration script a single
opaque command."

```
MariaDB/SQL source (Database/db_newhomo.sql)
        ↓
EXTRACTION           src/lib/migration/extract/
                      — parses the SQL dump text directly (no MariaDB
                        server connection of any kind)
        ↓
TRANSFORMATION        src/lib/migration/transform/
                      — maps raw SQL rows to typed MongoDB document shapes
                        (src/lib/mongodb/schemas/), one function per entity
        ↓
VALIDATION            src/lib/migration/validate/
                      — runs every transformed value through its Zod
                        schema; separates accepted from rejected
        ↓
MongoDB DOCUMENT GENERATION
                      — validated documents ARE the generated documents;
                        no separate step exists this phase (see
                        pipeline.ts's own header comment for why)
        ↓
VERIFICATION           src/lib/migration/verify/
                      — orphan/relationship detection, duplicate-identity
                        detection, type-conversion tracking, parity report
```

**Every stage is independently testable and independently tested** — see
§7. `src/lib/migration/pipeline.ts` is a thin coordinator (≈300 lines,
almost entirely sequential calls to the four stages above) — it contains
no transformation or validation logic of its own.

---

## 2. SOURCE DATA (owner instruction §1)

**GENERATED, VERIFIED:** the tooling reads `Database/db_newhomo.sql`
directly — the same dump used throughout M2/M3's schema analysis. No live
MariaDB server is required to run any part of this pipeline.

**Verified against real production data this session:** every one of the
17 entities the pipeline covers was extracted and transformed against the
*actual* `Database/db_newhomo.sql` (not just the fixture), with results
matching every row count already independently established in
`docs/DATABASE-ANALYSIS-MARIADB-SOURCE.md` and `docs/M3-DATA-MIGRATION-MAP.md`
exactly:

| Entity | Source rows (VERIFIED against real dump) |
|---|---|
| users | 819 |
| products | 397 |
| categories | 23 |
| productCategories | 675 |
| orders | 20 |
| orderProducts | 22 |
| payments | 21 |
| appointments | 33 |
| enquiries | 16,386 |
| sliders | 0 |
| pinCodes | 1 |
| posts | 414 |
| homeopathyMaster | 150 |
| blogs | 4 |
| blogCategories | 1 |
| statezones | 36 |
| cities | 3 |

**Every one of these 17 entities transformed and validated with ZERO
rejections against the real production dump** — 100% acceptance rate,
confirming the schemas and transform functions are faithful to the actual
data, not just the fixture's idealized cases.

**"Do not silently fix bad/legacy data" (owner instruction):** confirmed —
no transform function normalizes, sanitizes, or corrects a value. See §5.

---

## 3. REQUIRED CAPABILITIES (owner instruction §3)

Every entity the owner named has transform tooling:

| Entity | Transform function(s) | File |
|---|---|---|
| users | `transformUsers`/`transformUser` | `transform/user.ts` |
| buyers | embedded via `transformUsers` (buyer_profile → buyerProfile) | `transform/user.ts` |
| products | `transformProducts`/`transformProduct` | `transform/product.ts` |
| categories | `transformCategories` | `transform/category.ts` |
| product/category relationships | `transformProductCategories` (self-referential `parentId`) | `transform/category.ts` |
| orders | `transformOrders` | `transform/order.ts` |
| orderProducts | `transformOrderProducts` | `transform/order.ts` |
| payments | `transformPayments` | `transform/order.ts` |
| posts | `transformPosts` (+ `transformHomeopathyMasters`, `transformBlogs`, `transformBlogCategories`) | `transform/simple.ts` |
| sliders | `transformSliders` | `transform/simple.ts` |
| pincodes | `transformPinCodes` | `transform/simple.ts` |
| appointments | `transformAppointments` | `transform/simple.ts` |
| enquiries | `transformEnquiries` | `transform/simple.ts` |
| other LIVE entities | `statezones`/`cities` (geo, referenced by cities/product-shipping-adjacent lookups) | `transform/simple.ts` |

**Explicitly NOT covered this phase** (per §3's "clearly document which
datasets are intentionally excluded and why"):

| Excluded | Reason |
|---|---|
| `sellerProfiles` (seller_profile + banks) | VESTIGIAL, not named in the owner's M3-B required-capabilities list; schema exists (`src/lib/mongodb/schemas/sellerProfile.ts`), transform does not |
| `productFeatures`, `productVariations`, `productPkg` | VESTIGIAL, DR-02 (placement) unresolved; schemas exist (`schemas/vestigial.ts`), transforms do not — building a transform before DR-02 resolves where the data should live would be premature |
| `baskets`, `sellerPayments`, `orderFullfill`, `statusCodes`, `variations`, `passwordResets`, `shipping` | Same as above — VESTIGIAL/DEAD-write-only, DR-02-adjacent, not named in the required-capabilities list |
| `migrations` (Laravel framework bookkeeping) | Out of scope by definition (not application data) |

**LIVE/BROKEN/DEAD/VESTIGIAL classification used throughout, per owner
instruction:** every transform function's file header cites the entity's
classification from `docs/M3-DATABASE-MAPPING.md`. **No DEAD/VESTIGIAL
record is omitted from the source migration analysis** — the exclusions
above are about *which entities have transform tooling built this phase*,
not about *hiding* their existence; all are catalogued in
`docs/M3-DATABASE-MAPPING.md` §1-§2 already, and their row counts are
preserved in that document's record.

---

## 4. DATA PRESERVATION (owner instruction §4)

**TESTED** — every preservation requirement has a corresponding unit test
in `tests/migration/transform.test.ts`:

| Preserved | How | Test |
|---|---|---|
| Original identifiers | `legacyId` on every document, always equal to the source `id` | "preserves the legacyId exactly equal to the source id" |
| Timestamps | `toDate()` mapping, preserves the exact instant, returns null for null/empty | (exercised throughout; see `tests/mongodb/mapping.test.ts`'s `toDate` suite) |
| Status values | Every status field copied as-is, including P-03's three-independent-value pattern | "preserves P-03: order (status 5) and payment (status 4)... carry DIFFERENT status values" |
| Legacy strings/typos | `delaveryDate`/`delaveryBy`/`qunt` field names preserved verbatim | "preserves the DelaveryDate/DelaveryBy misspellings as field names" |
| Nullable values | Every nullable source column maps to a nullable field; null stays null, never defaulted | "preserves null fields as null, not defaulted to empty string or 0" |
| Existing relationships | `groupId`/`gid`, `p_id`, `parentId`, etc. carried as plain reference values, not validated for existence at transform time (existence-checking is the VERIFY stage's job, not transform's) | "embeds only images whose p_id matches this product (orphan image excluded)" |
| Historical records | Every source row transforms independently — no date-range filtering, no "recent only" logic anywhere in the pipeline | (implicit — no such filter exists in any transform function) |

**§4's specific instruction — `orders.orderId` (integer) vs.
`payments.orderId` (string), NOT unified:**

```
orders.orderId    → number  (source: int(11))
payments.orderId  → string  (source: varchar(255))
```

**VERIFIED, TESTED:** `tests/migration/transform.test.ts`'s "preserves
orders.orderId as a number and payments.orderId as a string for the same
conceptual order" test asserts both types explicitly, for the SAME
GroupId, so the test would fail if either were silently coerced to match
the other. Also re-verified this session directly against the real
production dump's `orders`/`payments` INSERT statements (§1's CREATE
TABLE re-read) — the type declarations are exactly as documented in
`docs/GATE-REPORT-M3A.md` §9.

---

## 5. GROUPID / ORDER RELATIONSHIPS (owner instruction §5)

**TESTED, VERIFIED against real production data.**

`src/lib/migration/verify/orphans.ts`'s `detectOrderOrphans` implements
every check the owner named:

| Check | Function/field | Real-data result (VERIFIED, §1's dump run) |
|---|---|---|
| Orphan orderProducts | `orphanOrderProducts` | **1 found** — legacyId=1, groupId=null (a genuine, pre-existing 2020-09-25 row with no GroupId — see below) |
| Orphan payments | `orphanPayments` | 0 found |
| Missing orders | `missingOrders` | 0 found |
| Broken GroupId relationships | Both of the above together | 1 total issue |
| Duplicate identities | `detectDuplicateIdentities` (separate function, applied to every entity, not just orders) | 0 duplicates found across all 17 entities |
| Unexpected type conversions | `verify/typeConversions.ts`'s `isExpectedConversion` — every conversion the pipeline actually performs is checked against a fixed, documented list; anything NOT on that list would be flagged as unexpected (none were, this phase) | 0 unexpected (all conversions performed matched the documented list) |

**A genuine pre-existing data-integrity finding, surfaced not repaired:**
running the pipeline against the real dump found `orderproducts` row
`id=1` has `GroupId = NULL` — confirmed by direct inspection of the dump's
own INSERT statement (`(1, NULL, NULL, NULL, ..., '2020-09-25 10:42:00',
...)`). This is the earliest order-related row in the database (matching
`orders` id=1's own timestamp) and is most plausibly an incomplete/test
row from the application's earliest days. **This was not repaired,
defaulted, or excluded** — it appears in the parity report's
`orphanOrderProducts` list exactly as found, per the owner's explicit "do
not silently repair these, report them" instruction.

**Also surfaced:** 4 orders share `groupId=15` with zero matching
`orderProducts` rows (`ordersWithNoLines`) — again, reported, not
investigated further or repaired, consistent with the same instruction.

---

## 6. IDEMPOTENCY (owner instruction §6)

**TESTED**, via `src/lib/mongodb/migrationState.ts`'s `upsertByLegacyId`
and `tests/migration/migrationState.test.ts` (7 tests, using a minimal
in-memory fake `Collection` — no real MongoDB connection).

**Mechanism:** `upsertByLegacyId` uses `{legacyId: document.legacyId}` as
the update filter with `{upsert: true}` — a second call with the same
`legacyId` REPLACES the existing document via MongoDB's native upsert
semantics; it never inserts a duplicate.

**"Do not solve this by changing business identifiers" — confirmed:**
`legacyId` is set once, by the transformation stage, directly from the
source `id` column (via `toLegacyId`, `src/lib/mongodb/mapping.ts`,
unchanged since M3-A) and never modified by the idempotency mechanism.
The test "the legacyId itself is never altered by the upsert mechanism"
asserts this directly across two calls with different payload content.

**NOT CALLED ANYWHERE IN THE PIPELINE THIS PHASE** — `upsertByLegacyId`
is built and tested as the documented mechanism, ready for whichever
future phase is authorized to perform an actual (development-target)
write. The M3-B pipeline itself (`pipeline.ts`, `scripts/migrate.ts`)
never calls it — dry-run mode has nothing to upsert against.

---

## 7. DRY-RUN (owner instruction §7)

**VERIFIED.** `scripts/migrate.ts` is a CLI that:

1. Reads the source dump (a local file, `Database/db_newhomo.sql` by
   default, overridable via `--dump`)
2. Runs `runPipeline()` — performs all four stages (extraction through
   verification)
3. Prints/writes a human-readable report (`--out <path>`) and optionally
   a machine-readable JSON report (`--json <path>`)
4. **Performs NO database writes** — structurally incapable of doing so
   (confirmed: `grep`-verified zero references to
   `src/lib/mongodb/client.ts` or `MongoClient` anywhere in
   `src/lib/migration/` or `scripts/migrate.ts`, other than the comment
   stating this fact)

**Usage:**
```bash
npx tsx scripts/migrate.ts --dump Database/db_newhomo.sql --out report.txt --json report.json
# or, via package.json:
npm run migrate:dry-run -- --out report.txt --json report.json
```

**This is the ONLY mode this tooling has.** There is no `--write` flag,
no write path, no code that would need one disabled — dry-run is not a
mode selected among several; it is the entire capability this phase
built, per the owner's M3-B stop condition excluding any actual
migration execution.

---

## 8. PARITY REPORT (owner instruction §8)

**GENERATED, VERIFIED.** `src/lib/migration/verify/parityReport.ts`
produces both formats from one shared data structure
(`MigrationParityReport`):

- **Machine-readable:** `JSON.stringify(report, null, 2)` — a plain,
  serializable object, no functions or class instances, safe to write to
  disk or pipe into another tool
- **Human-readable:** `renderHumanReadable(report)` — plain text, one
  section per entity

**Every field the owner asked for, confirmed present** (§8's list, mapped
to the `EntityParitySection` type in `parityReport.ts`):

| Requested | Field |
|---|---|
| Source count | `sourceCount` |
| Target/generated count | `targetCount` |
| Rejected count | `rejectedCount` (+ `rejectedSamples`, up to 20 shown) |
| Warning count | `warningCount` (+ `warnings`) |
| Missing relationships | `relationshipIssues.orders.missingOrders` (report-level, since this is a cross-entity concern, not per-entity) |
| Duplicate identities | `duplicateIdentities` |
| Type conversions | `typeConversionsApplied` |
| Transformation rules applied | `transformationRulesApplied` |

**Field-level validation for critical entities ("where possible"):**
the orders group gets dedicated relationship-level detail
(`relationshipIssues.orders`) beyond the standard per-entity section,
matching the owner's "particular scrutiny" instruction from earlier M3
phases, carried forward here.

---

## 9. TEST DATA (owner instruction §9)

**GENERATED, TESTED.** `tests/migration/fixtures/sample-dump.ts` — a
small, hand-written phpMyAdmin-format SQL dump (not derived from real
data), covering every edge case the owner named:

| Required edge case | Where in the fixture |
|---|---|
| Normal product | `products` id=1 |
| Null values | `users` id=2 (every nullable field null); `products` id=2 (minimal, only the NOT NULL heading present) |
| Legacy/typo values | `categories` id=2 ("Legacy Slug With Spaces12345" — unsanitized, P-07-style) |
| Duplicate-like identifiers | Exercised via `detectDuplicateIdentities`'s own unit tests (`tests/migration/verify.test.ts`), which construct duplicate legacyIds directly rather than relying on the fixture to contain one (a real duplicate legacyId in the fixture would itself be invalid test data, since source `id` columns are genuinely unique) |
| Order with multiple products | `orders`/`orderproducts` GroupId=100 (2 line items) |
| Order with payment | GroupId=100 (has a matching `payments` row) |
| Order with missing optional payment | GroupId=200 (no matching `payments` row) |
| GroupId relationships | GroupId=100/200/300 (valid), plus a deliberate orphan (`orderproducts` id=6, GroupId=999, matching no order) |
| Historical status values | GroupId=300 — the P-03 pattern: orders/orderProducts status=5, payments status=4 |
| Integer/string orderId mismatch | GroupId=100: `orders.OrderId=1200101` (int), `payments.orderId='1200101'` (string) |

**"Must never contain real credentials or sensitive production data" —
confirmed:** every value in the fixture is synthetic (`*.test.invalid`
email addresses, `FAKE_HASH_NOT_REAL_*` password placeholders, invented
names/addresses). No value corresponds to any real person, and no
password hash is valid bcrypt output. Explicitly stated in the fixture
file's own header comment.

---

## 10. PRODUCTION SAFETY (owner instruction §10)

**VERIFIED, unchanged from M3-A:**

- `src/lib/mongodb/client.ts`'s `ProductionConnectionBlockedError` guard
  is **byte-for-byte unmodified** this phase (confirmed:
  `git diff`-equivalent file-content check — no edit was made to this
  file in M3-B)
- **No flag was added that makes production access easier.** The only
  new environment-adjacent code this phase touches is
  `scripts/migrate.ts`, which reads `Database/db_newhomo.sql` (a local
  file) and never references `MONGODB_ENV`, `MONGODB_ALLOW_PRODUCTION`,
  or any Mongo credential variable at all
- **No Atlas credential appears anywhere** in this phase's code,
  fixtures, or documentation — confirmed via the same credential-grep
  sweep used in M3-A
- **No collection was created** in any real database — the pipeline
  never opens a MongoDB connection (see §7's structural-incapability
  confirmation)
- **`ensureIndexes()` (from M3-A) was not called** — not referenced
  anywhere in M3-B's code

---

## 11. TESTING (owner instruction §11)

**110 tests total, all passing** (56 new this phase + 54 carried from
M3-A/M0, zero regressions):

| Owner-required coverage | Test file | Count |
|---|---|---|
| Transformation correctness | `tests/migration/transform.test.ts` | 12 |
| Identifier preservation | Same file, "preserves the legacyId..." tests | (subset of above) |
| Type preservation | Same file, sellPrice/orderId mismatch tests | (subset of above) |
| Relationship preservation | Same file, embedded-images tests | (subset of above) |
| Null handling | Same file + `tests/migration/extract.test.ts` | (subset of above) |
| Status preservation | `transform.test.ts`'s P-03 test | (subset of above) |
| Idempotency | `tests/migration/migrationState.test.ts` | 7 |
| Dry-run behavior | `tests/migration/pipeline.test.ts` | 9 |
| Error handling | `tests/migration/validate.test.ts` | 4 |
| Count reconciliation | `tests/migration/pipeline.test.ts`'s "every entity satisfies sourceCount = targetCount + rejectedCount" | (subset of above) |
| Extraction/parser correctness | `tests/migration/extract.test.ts` | 10 |
| Orphan/relationship detection | `tests/migration/verify.test.ts` | 14 |

**Toolchain, all independently re-run this session:**

| Check | Result |
|---|---|
| `npm run typecheck` | ✅ Pass, 0 errors |
| `npm run lint` | ✅ Pass, 0 errors |
| `npm run format:check` | ✅ Pass |
| `npm run test` | ✅ **110/110 pass** |
| `npm run build` | ✅ Pass (see `docs/GATE-REPORT-M3B.md` §13 for the full record) |

**All existing M3-A tests continue passing** — confirmed, no test file
from M3-A was modified, and the full suite (including
`tests/mongodb/*.test.ts`) ran clean alongside the new `tests/migration/*`
suite in the same `npm run test` invocation.

---

## 12. NOT YET EXECUTED AGAINST PRODUCTION — RESTATED

Every claim in this document about entity counts, orphan detection, and
type preservation was verified by running the tooling against **either
the fixture dataset or a read-only parse of the real
`Database/db_newhomo.sql` file**. At no point did this phase:

- Connect to production MariaDB
- Connect to production or development MongoDB Atlas
- Write a single document to any database
- Modify `Database/db_newhomo.sql` or any Laravel source file
- Create any MongoDB collection anywhere

**This tooling is ready to be pointed at a development MongoDB target in
a future, separately-authorized phase.** It has not been.

---

*Companion document: `docs/GATE-REPORT-M3B.md` (the formal gate report for
this phase).*

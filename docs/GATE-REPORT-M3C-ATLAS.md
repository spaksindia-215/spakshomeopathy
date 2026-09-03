# MILESTONE GATE REPORT — M3-C MONGODB SMOKE MIGRATION (ATLAS, DEVELOPMENT)

**Milestone:** M3-C follow-on — full smoke migration + read-back + idempotency
(owner authorization: "MongoDB smoke migration... execute and verify the
existing M3-C MongoDB migration pipeline against the development Atlas
database")
**Period:** 2026-08-21
**Author:** Migration Implementer
**Report date:** 2026-08-21

**Objective (verbatim scope):** PROVE THAT THE APPROVED M3 MIGRATION
PIPELINE WORKS AGAINST DEVELOPMENT MONGODB ATLAS. Nothing more. No M4, no
API/auth/UI/payment work was started — see §9 below.

---

## 0. Prior state acknowledged

This phase builds directly on `docs/GATE-REPORT-M3C-ATLAS-SMOKE.md`
(earlier the same day, 2026-08-21), which established the Atlas connection
and ran a read-only repository smoke test but explicitly did **not** run
any migration or write any data. This report covers the next step: the
actual write migration, read-back verification, and idempotency test that
report deferred.

The existing pipeline code (`scripts/migrate-to-mongodb.ts`,
`src/lib/migration/**`, `src/lib/mongodb/**`) was inspected but **not
modified** in any way. No safety gate was edited or bypassed.

---

## 1. Connection

| Check | Result |
|---|---|
| `npm run mongodb:check` | ✅ PASS, exit code 0 |
| Environment | `development` |
| Database | `spaks_dev` |
| Production guard | **PASSED** |
| Connection | **SUCCESS** |
| Ping | **SUCCESS** |

Both independent safety gates (`assertNonProductionTarget()` in
`environmentGuard.ts`, and `getDb()`'s own `MONGODB_ENV`/
`MONGODB_ALLOW_PRODUCTION` guard in `client.ts`) ran unmodified and both
correctly identified the target as non-production before any connection
was attempted.

---

## 2. Migration

Two full runs were executed via `npm run migrate:mongodb` (real write
mode, not `--dry-run`), both against `spaks_dev` only.

| Metric | Run 1 (first write) | Run 2 (idempotency check) |
|---|---|---|
| Source record count | 19,005 | 19,005 |
| Generated (transformed+validated) document count | 19,005 | 19,005 |
| Inserted/upserted count | 19,005 | 19,005 |
| Rejected count | 0 | 0 |
| Failures | 0 | 0 |
| Extraction+transform time | 1,692 ms | 1,831 ms |
| Write time | 645,066 ms (~10m45s) | 578,739 ms (~9m39s) |
| Total time | 649,817 ms | 582,898 ms |

A `--dry-run` was also executed beforehand (extraction/transform/
validation/report only, no MongoDB import at all) as a pre-flight check;
its counts matched the real runs exactly.

**Per-collection results (both runs identical, 100% written, 0 failed):**

| Collection | Source count | Written |
|---|---:|---:|
| users | 819 | 819/819 |
| products | 397 | 397/397 |
| categories | 23 | 23/23 |
| productCategories | 675 | 675/675 |
| orders | 20 | 20/20 |
| orderProducts | 22 | 22/22 |
| payments | 21 | 21/21 |
| appointments | 33 | 33/33 |
| enquiries | 16,386 | 16,386/16,386 |
| sliders | 0 | 0/0 |
| pinCodes | 1 | 1/1 |
| posts | 414 | 414/414 |
| homeopathyMaster | 150 | 150/150 |
| blogs | 4 | 4/4 |
| blogCategories | 1 | 1/1 |
| statezones | 36 | 36/36 |
| cities | 3 | 3/3 |
| **TOTAL** | **19,005** | **19,005/19,005** |

**Note on scope:** the migration pipeline (`schemaFor()` in
`migrate-to-mongodb.ts`) covers exactly these 17 collections. `COLLECTIONS`
(`collections.ts`) additionally names 7 more (`sellerProfiles`,
`productFeatures`, `productVariations`, `productPkg`, `baskets`,
`sellerPayments`, `orderFullfill`, `statusCodes`, `variations`,
`passwordResets`, `shipping`) that are **not wired into this pipeline** —
this is the existing, pre-approved scope of the M3-B/M3-C pipeline as
built, not a discard discovered this phase. No source record from any of
the 17 in-scope tables was silently discarded (0 rejected across both
runs).

---

## 3. Collections

All 17 collections listed above were created on the first run
("created: <name>" in the log) and correctly recognized as already
existing on the second run ("already existed: <name>"). Read back from
Atlas via `listCollections()`:

```
appointments, blogCategories, blogs, categories, cities, enquiries,
homeopathyMaster, orderProducts, orders, payments, pinCodes, posts,
productCategories, products, sliders, statezones, users
```

**17 collections total in the database — no more, no fewer.** No
unexpected collection was created; the "UNEXPECTED COLLECTIONS" check
(comparing live `listCollections()` output against the pipeline's own
17-collection list) returned **(none)** on both post-run-1 and
post-run-2 verification passes.

---

## 4. Indexes

`ensureIndexes()` (`src/lib/mongodb/indexes.ts`) was called unmodified by
the migration script. It applies exactly the 8 non-unique
`proposedIndexes` and — correctly — does **not** apply
`proposedUniqueIndexesRequiringApproval` (the DR-04-gated
`users_email_unique` index), since that array is never referenced by
`ensureIndexes()`.

| Index | Collection | Spec | Verified on Atlas |
|---|---|---|---|
| `products_pSlug` | products | `{pSlug:1}` | ✅ Present |
| `products_pCat_pStatus` | products | `{pCat:1,pStatus:1}` | ✅ Present |
| `orders_groupId` | orders | `{groupId:1}` | ✅ Present |
| `orderProducts_groupId` | orderProducts | `{groupId:1}` | ✅ Present |
| `orderProducts_buyerId` | orderProducts | `{buyerId:1}` | ✅ Present |
| `payments_gid` | payments | `{gid:1}` | ✅ Present |
| `posts_diseaseId` | posts | `{diseaseId:1}` | ✅ Present |
| `posts_homeopathyId` | posts | `{homeopathyId:1}` | ✅ Present |
| `users_email_unique` (DR-04, unapproved) | users | `{email:1}`, unique | ✅ **Confirmed absent** — `users` collection carries only the default `_id_` index |

All 8 approved indexes present after run 1; identical set (no duplicates,
no drift) confirmed again after run 2.

---

## 5. Parity

| Stage | Count |
|---|---:|
| Source (SQL dump rows, 17 in-scope tables) | 19,005 |
| Transformed | 19,005 |
| Inserted/upserted | 19,005 |
| Rejected | 0 |
| **Atlas (live `countDocuments()`, all 17 collections)** | **19,005** |

**Parity result: EXACT MATCH**, source → transformed → written → Atlas,
per-collection and in total, on both runs. This was verified by an
independent read-back script (`getDb()` + `countDocuments()` per
collection against the live database), not merely inferred from the
migration script's own self-reported "written" count.

**Known anomalies confirmed preserved, read back live from Atlas:**

- `orderProducts` legacyId=1 has `groupId: null` — the known GroupId=NULL
  anomaly. Confirmed present and unchanged after both runs.
- `payments.orderId` is `null` on **all 21** payment documents in Atlas —
  cross-checked directly against the SQL dump (`Database/db_newhomo.sql`
  lines 18300–18320): all 21 source rows have `orderId = NULL` in
  MariaDB. This is not a transformation defect; NULL was correctly
  preserved as NULL, not coerced to `0`, `""`, or dropped.
- `orders.orderId` verified as BSON `number` on non-null samples (e.g.
  `25922`, `1883`).
- `payments.orderId` verified as the schema-declared `string` type at the
  Zod-schema/type level (per `tests/migration/m3c-order-validation.test.ts`,
  which passed); since every real source value is NULL, no live document
  exercises a non-null string value — the type distinction from
  `orders.orderId` (number) exists but is not observable in this
  particular dataset's actual data, only in the schema and code.
- NULL preserved elsewhere too, e.g. `users.emailVerifiedAt`, `users.image`,
  `users.rememberToken` remain `null` where source is NULL (spot-checked).

---

## 6. Idempotency

| Check | Run 1 | Run 2 |
|---|---|---|
| Collections | 17 created | 17 "already existed" |
| Documents written per collection | matches source exactly | **identical** counts, no change |
| Total documents | 19,005 | 19,005 (unchanged) |
| `legacyId` values | as generated | **stable** — spot-checked sample (`users` legacyId=1) unchanged |
| Indexes | 8 approved indexes created | **identical 8**, no duplicates, no new indexes |
| Unexpected collections | none | none |

Both runs used `ValidatedRepository.upsertByLegacyId`
(`repositories/base.ts` → `migrationState.ts`'s `upsertByLegacyId`),
confirmed by code inspection to perform a MongoDB `updateOne(...,
{upsert: true})` keyed by `legacyId` — not an `insertOne`. The second run
produced **zero net change** in document counts, confirming documents
were updated in place rather than duplicated.

---

## 7. Failure handling

No destructive test was run against the real Atlas database, per
instruction. The existing fixture-based test suite was run instead:

| Test file | Result |
|---|---|
| `tests/mongodb/failureHandling.test.ts` | ✅ 6/6 passed |
| `tests/mongodb/idempotentReplay.test.ts` | ✅ 4/4 passed |
| `tests/mongodb/readBack.test.ts` | ✅ 7/7 passed |
| Full suite (`npm run test`) | ✅ **178/178 passed**, 23 files |

`failureHandling.test.ts` exercises `ValidatedRepository.upsertByLegacyId`
against a **fake, in-memory** `Db`/`Collection` instrumented to throw on
one specific `legacyId`, proving: the failure is caught per-document, the
bad `legacyId` is identifiable, and unrelated documents are unaffected —
without touching any real database.

**This migration does NOT provide transactional rollback.** Each
document write is an independent `updateOne` upsert; a failure partway
through a collection's write loop leaves every document written so far
in place and reports the failed `legacyId`(s) separately — it does not
undo prior writes in that run. This is stated directly in the test file's
own header comment and is repeated here per instruction, not
newly discovered.

---

## 8. Security

| Check | Result |
|---|---|
| Credentials printed to terminal/logs | **No** — only the tool's own built-in `<redacted>` host string appeared, in both run logs |
| Full MongoDB URI logged | **No** |
| Password in any report or JSON output | **No** — both `migration-run1.json`/`migration-run2.json` scanned, zero `mongodb://`/`mongodb+srv://` occurrences |
| Production connection attempted | **No** — both gates ran and passed as non-production on every invocation |
| Production guard bypassed/modified | **No** — `client.ts` and `environmentGuard.ts` were not opened for editing |
| `.env.local` modified | **No** — mtime unchanged (`2026-08-20 21:47:39`), predates this phase |

---

## 9. Not started (per STOP CONDITION)

No API routes, authentication, MongoDB-backed UI, checkout, payment
integration, admin CRUD, business-logic migration, or production
migration were started or touched this phase. Only:

1. Ran `npm run mongodb:check` (read-only)
2. Ran `npm run migrate:mongodb:dry-run` once (no DB writes)
3. Ran `npm run migrate:mongodb` twice, against `spaks_dev` only
4. Ran a temporary, read-only verification script
   (`scripts/tmp-atlas-verify.ts`, created and then **deleted** after use
   — not left in the repo) to independently cross-check Atlas state
   against the migration report
5. Ran the existing test suite (`npm run test`)
6. Wrote this report

---

## 10. Known limitations (carried forward, not new)

- **No transactional rollback** (§7) — carried forward from M3-B/M3-C;
  restated, not newly discovered.
- **DR-04 (`users.email` unique index) remains unapproved and unapplied**
  — correctly excluded from this run (§4). The decision record
  (`docs/M3-OWNER-DECISION-RECORDS.md` DR-04) cites a pre-migration
  duplicate-email check result (819 distinct emails, zero duplicates)
  attributed to `docs/GATE-REPORT-M3D-PREMIGRATION.md` — **that file does
  not exist in `docs/` as of this report**. This phase did not re-run
  that check or rely on it for anything (the unique index was never
  applied), but the citation is unverifiable as-is and is flagged here
  for owner awareness, not resolved.
- **DR-06 (charset spot-check for the 6 `latin1` source tables:
  `products`, `categories`, `enquiries`, `product_review`,
  `product_specification`, `product_images`) has not been performed** —
  it remains an open "what is being decided" item in
  `docs/M3-OWNER-DECISION-RECORDS.md`, not a resolved one. This phase's
  migration ran the existing transformation logic as-is (no charset
  handling was added, changed, or verified) — 0 rejections occurred, but
  that does not by itself confirm the absence of silent mojibake in
  non-ASCII content, since validation checks shape/type, not byte-level
  charset correctness. This is an existing gap restated, not introduced
  by this phase.
- **The parity report's rejected-sample list caps at 20 per entity**
  (pre-existing, M3-B N-20) — not relevant this run since rejected counts
  were 0 everywhere, but noted for future runs against different data.
- **`scripts/atlas-smoke-test.ts`** (from the prior connection-only
  phase) is still present in `scripts/` and was not removed — it was not
  created by this phase and the prior report deferred its removal to
  owner review; this phase did not touch it either.
- Write performance is sequential, one document at a time (no bulk
  operations) — ~575–650 seconds for 19,005 documents. Acceptable for a
  smoke test; would be a reasonable optimization target before a
  production-scale run, not attempted here (out of scope).

---

## 11. Files changed this phase

| Path | Change |
|---|---|
| `docs/GATE-REPORT-M3C-ATLAS.md` | Created (this file) |
| `scripts/tmp-atlas-verify.ts` | Created, used for read-only verification, then **deleted** |
| `scripts/tmp-atlas-verify2.ts` | Created, used for a follow-up `orderId` type check, then **deleted** |

**Database changes:** 17 collections created (or confirmed existing) and
populated in `spaks_dev` on Atlas; 8 approved indexes applied. No other
database, and no other environment, was touched.

**Files explicitly NOT touched:** `src/lib/mongodb/client.ts`,
`src/lib/mongodb/environmentGuard.ts`, `.env.local`, `.env.example`, all
Laravel source (`public_html/**`, `spakshomeopathy.com/**`), the SQL dump
(`Database/db_newhomo.sql`), all migration transformation logic
(`src/lib/migration/**`), all schemas, all repositories.

---

## 12. Sign-off

**Result: Objective achieved.** The approved M3 migration pipeline
successfully writes to, and idempotently re-writes to, development
MongoDB Atlas (`spaks_dev`), with exact source-to-Atlas parity (19,005/
19,005 documents, 0 rejected, 0 failed) and correct preservation of known
data anomalies (NULL `GroupId`, NULL `payments.orderId`, numeric
`orders.orderId`).

**Full migration to production: NOT authorized by this report.**

**STOP — awaiting review and explicit authorization before any of:** M4,
API routes, authentication, MongoDB-backed UI, checkout, payment
integration, admin CRUD, business-logic migration, or production
migration.

*Companion documents: `docs/GATE-REPORT-M3C-ATLAS-SMOKE.md` (connection-only
phase, same day), `docs/GATE-REPORT-M3C.md`, `docs/M3C-MONGODB-INTEGRATION.md`,
`docs/M3B-DATA-MIGRATION-TOOLING.md`, `docs/M3-OWNER-DECISION-RECORDS.md`.*

*End of M3-C Atlas Smoke Migration Gate Report*

---

## ADDENDUM (2026-08-21, M3-D) — Follow-up on §10's flagged DR-04/DR-06 citations

§10 above correctly flagged that `docs/GATE-REPORT-M3D-PREMIGRATION.md` did
not exist in `docs/` at the time of this report, and correctly declined to
rely on or re-verify the DR-04/DR-06 claims cited to it. That flag was
accurate and is left unedited above.

M3-D has since: (1) created `docs/GATE-REPORT-M3D-PREMIGRATION.md` as a
genuine, newly-performed investigation (not a backfilled claim that the
original citation's checks happened); (2) independently re-derived DR-04's
duplicate-email result (819 distinct emails, zero duplicates — matches the
originally-cited number); (3) found DR-06's originally-cited "zero
non-ASCII bytes" claim to be **false** (1,403 non-ASCII lines exist in the
dump), while also finding that the entire dump decodes as valid UTF-8 and
the existing migration scripts' uniform UTF-8 read is therefore safe for
this specific dataset, for a different and more precisely-evidenced reason
than the original claim gave. Neither the DR-04 unique index nor any
charset-handling code change was applied. See
`docs/GATE-REPORT-M3D-PREMIGRATION.md` for full detail.

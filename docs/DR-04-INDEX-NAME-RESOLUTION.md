# DR-04 — INDEX NAME RESOLUTION

**Type:** Owner-approved, targeted database correction. One index, one
collection, `spaks_dev` (development) only. No document was read, written,
or modified. No migration was run. No other index was touched. No
application/auth code was changed. No other owner decision was altered.
**Date:** 2026-08-22
**Authorization:** Owner explicitly approved this exact procedure in-session,
2026-08-22, following the discrepancy first reported in
`docs/GATE-REPORT-STATE-RECONCILIATION.md` §4 and restated in
`docs/OWNER-AUTHORIZATION-RECONCILIATION.md` §3.
**Executed via:** a temporary, single-purpose script
(`scripts/_dr04-rename-index-tmp.ts`), created for this task and deleted
immediately afterward — not a permanent addition to `scripts/`.

---

## 1. PREVIOUS STATE

Live index on `spaks_dev.users`, confirmed by `listIndexes()` immediately
before any change was made:

```json
[
  { "v": 2, "key": { "_id": 1 }, "name": "_id_" },
  { "v": 2, "key": { "email": 1 }, "name": "email_1", "unique": true }
]
```

- Key spec: `{ email: 1 }` — **correct**.
- `unique: true` — **correct**.
- Name: `email_1` (MongoDB's auto-generated default) — **incorrect**;
  required name per `docs/M3-OWNER-DECISION-RECORDS.md` DR-04 and
  `src/lib/mongodb/indexes.ts` was `users_email_unique`.
- Root cause (unchanged from prior report): `scripts/apply-dr04-index.ts`'s
  original `createIndex(spec, options)` call never included a `name:`
  option, so MongoDB fell back to its default naming convention.

---

## 2. ACTION TAKEN

Executed in order, exactly as specified, against `spaks_dev` only:

1. **Read and verified current `users` indexes** — confirmed exactly two
   indexes exist (`_id_`, `email_1`), no surprises.
2. **Confirmed `email_1` is the unique `{email: 1}` index** — key spec and
   `unique` flag both checked programmatically before proceeding; the
   script was written to abort if either check failed (neither did).
3. **Dropped ONLY `email_1`**:
   ```
   dropIndex('email_1') result:
   {"nIndexesWas":2,"ok":1, ...}
   ```
   (`nIndexesWas: 2` confirms the collection had exactly 2 indexes — `_id_`
   and the one being dropped — immediately before the drop.)
4. **Recreated the same index with the explicit name**:
   ```
   createIndex({ email: 1 }, { unique: true, name: 'users_email_unique' })
   → returned: "users_email_unique"
   ```
5. **No other index, on any other collection, was touched.** The script
   only ever called `dropIndex`/`createIndex` against `COLLECTIONS.users`,
   once each.
6. **No document was read for any purpose other than the explicit,
   pre-approved post-change spot-checks in §6 below** (legacyId=1 lookup,
   MAX(legacyId) lookup) — no document was inserted, updated, or deleted at
   any point.

---

## 3. FINAL STATE

Live index on `spaks_dev.users`, confirmed by `listIndexes()` immediately
after the change:

```json
[
  { "v": 2, "key": { "_id": 1 }, "name": "_id_" },
  { "v": 2, "key": { "email": 1 }, "name": "users_email_unique", "unique": true }
]
```

- Name: **`users_email_unique`** ✅ — now matches the required name exactly.
- Key spec: **`{ email: 1 }`** ✅ — unchanged.
- `unique`: **`true`** ✅ — unchanged.
- Old `email_1` name: **absent** ✅ — confirmed no longer present.
- Total indexes on `users`: exactly 2 (`_id_`, `users_email_unique`) — no
  unintended extra index was created or left behind.

---

## 4. LIVE VERIFICATION EVIDENCE

### 4.1 — Direct `listIndexes()` check (this task, immediately post-change)

```
users_email_unique present: YES
  key: {"email":1} (expected {"email":1})
  unique: true (expected true)
old email_1 still present: NO (expected)
Exactly [_id_, users_email_unique] present, no unintended index: YES
```

### 4.2 — Independent cross-check via the project's existing, unmodified
read-only verification script (`npm run mongodb:verify-readonly`), run
separately after the temporary script had already been deleted:

```
--- Index verification (all approved indexes, including DR-04) ---
  users_email_unique (users, unique): PRESENT
  products_pSlug (products): PRESENT
  products_pCat_pStatus (products): PRESENT
  orders_groupId (orders): PRESENT
  orderProducts_groupId (orderProducts): PRESENT
  orderProducts_buyerId (orderProducts): PRESENT
  payments_gid (payments): PRESENT
  posts_diseaseId (posts): PRESENT
  posts_homeopathyId (posts): PRESENT
```

This check now reports `users_email_unique` as present by matching the
**actual live MongoDB index name** — previously (prior audit) this same
"PRESENT" label was true only by the project's internal label, not the real
database name. That distinction is now resolved: the label and the live
name agree.

**All 8 other previously-approved indexes remain present, unmodified,
unaffected** — confirmed by this same independent script run, not merely
by the assertion inside the temporary correction script.

---

## 5. DOCUMENT / COLLECTION COUNTS — BEFORE AND AFTER

| Collection | Before | After | Match? |
|---|---:|---:|---|
| users | 819 | 819 | ✅ |
| products | 397 | 397 | ✅ |
| categories | 23 | 23 | ✅ |
| productCategories | 675 | 675 | ✅ |
| orders | 20 | 20 | ✅ |
| orderProducts | 22 | 22 | ✅ |
| payments | 21 | 21 | ✅ |
| appointments | 33 | 33 | ✅ |
| enquiries | 16,386 | 16,386 | ✅ |
| sliders | 0 | 0 | ✅ |
| pinCodes | 1 | 1 | ✅ |
| posts | 414 | 414 | ✅ |
| homeopathyMaster | 150 | 150 | ✅ |
| blogs | 4 | 4 | ✅ |
| blogCategories | 1 | 1 | ✅ |
| statezones | 36 | 36 | ✅ |
| cities | 3 | 3 | ✅ |
| **TOTAL** | **19,005** | **19,005** | ✅ |

**Live collections (`listCollections()`):** 17 before, 17 after — identical
list both times: `appointments, blogCategories, blogs, categories, cities,
enquiries, homeopathyMaster, orderProducts, orders, payments, pinCodes,
posts, productCategories, products, sliders, statezones, users`.

**`users` count specifically: 819 → 819, unchanged.**

**legacyId stability (read-only spot-checks, before dropIndex and after
createIndex both confirm the same values):**
- `users` legacyId=1 present: `true`, email=`spaksindia@gmail.com` —
  unchanged from the prior audit's own citation of this same record.
- `users` MAX(legacyId): `820` — unchanged (matches the prior audit's
  documented AUTO_INCREMENT-gap finding; not affected by an index
  drop/recreate, which touches no document field).
- `orderProducts` legacyId=1 `groupId`: `null` — the known, expected
  anomaly, confirmed still present and unchanged.

**No document was modified.** An index drop/recreate operation does not
read, write, or touch any document's field values — this is confirmed both
by the nature of the MongoDB operations performed (`dropIndex`/
`createIndex` operate on index metadata only) and by the before/after count
and spot-check equality shown above.

---

## 6. VERIFICATION SUITE RESULT

Ran `npm run verify` (`typecheck && lint && format:check && test`) after
the index correction:

```
typecheck    ✅ 0 errors
lint         ✅ 0 errors (4 pre-existing warnings, unrelated: Google Font
                display/custom-font warnings in admin/login/page.tsx and
                AdminStylesheets.tsx)
format:check ✅ pass
test         ✅ 199 / 199 passed, 26 test files, 0 failures
```

No test regression, no new failure. The test suite runs against fixtures/
mocks for most cases and against real `spaks_dev` data for the
`m3c-order-validation.test.ts` suite specifically (13 tests, all passing) —
none of which depend on the `users.email` index's name, so this result was
expected to be, and is, identical to the pre-correction baseline.

---

## 7. SUMMARY

| Item | Result |
|---|---|
| Procedure followed exactly as specified (steps 1–7) | ✅ Yes |
| Target database | `spaks_dev` only — confirmed via `assertNonProductionTarget()` + explicit database-name check in the script itself |
| Production touched | ❌ No |
| Migration run | ❌ No |
| Documents modified | ❌ No — 0 writes to any document, confirmed by before/after count and spot-check equality |
| Other indexes touched | ❌ No — all 8 other approved indexes independently confirmed unchanged |
| Other owner decisions altered | ❌ No |
| Route guards begun | ❌ No |
| M5 started | ❌ No |
| DR-04 index name | **RESOLVED** — `users_email_unique`, `{email:1}`, `unique:true`, live-verified twice (directly, and independently via the project's existing read-only script) |
| Collections | 17 before, 17 after |
| Total documents | 19,005 before, 19,005 after |
| Verification suite | 199/199 tests passing, 0 errors |

---

*End of append-only DR-04 index-name resolution report. Temporary script
`scripts/_dr04-rename-index-tmp.ts` was deleted after use and is not part of
the repository. Stopping here per instruction.*

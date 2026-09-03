# MILESTONE GATE REPORT — M3-D PRE-MIGRATION READINESS

**Milestone:** M3-D (pre-migration issue resolution — DR-04 duplicate-email
check, DR-06 charset verification, Atlas dev-database validation,
investigation of the previously-missing report this file replaces)
**Period:** 2026-08-21
**Author:** Migration Implementer
**Report date:** 2026-08-21
**Contract version:** 1.0

---

## 0. WHY THIS FILE EXISTS — READ THIS FIRST

Four existing documents
(`docs/M3-OWNER-DECISION-RECORDS.md` DR-04, `docs/M3-DATA-MIGRATION-MAP.md`
§7 DR-06, `docs/GATE-REPORT-M3C-ATLAS.md` §"Deviations", and the top-level
`docs/CONTRACT-MIGRATION-STATUS-AUDIT.md`) cite a file at this exact path —
`docs/GATE-REPORT-M3D-PREMIGRATION.md` — as the source of two specific
numeric findings:

1. DR-04: "819 distinct emails at every normalization level... zero
   duplicates, zero near-duplicates"
2. DR-06: "the entire `Database/db_newhomo.sql` dump... contains zero bytes
   outside the 7-bit ASCII range"

**That file did not exist anywhere in the repository before this report was
written.** This was discovered and confirmed by direct filesystem search
(`grep -rl` across the full repository, `find` across `docs/`) at the start
of this M3-D phase — not merely by trusting the audit's own claim of the
same finding.

**This report does NOT claim the citing documents' 2026-08-21 checks were
actually performed and then merely lost.** No evidence of that was found —
no draft, no deleted-file trace, no log output, nothing. The most honest
characterization is: **the citation was fabricated** — written as if a
validation report existed, when it did not. This report is a new,
independently-performed investigation, run today, that happens to
partially confirm one of the two cited numeric claims and **directly
contradicts** the other. See §2 and §3 below for exactly what was actually
done and found, each one distinctly labeled by evidentiary status.

No prior report's historical narrative has been rewritten. The four citing
documents are corrected via append-only addenda (see §6) rather than by
silently editing their original text.

---

## 1. CONTRACT ACKNOWLEDGEMENT

- [x] I have read `docs/M3-OWNER-DECISION-RECORDS.md` (DR-04, DR-06) in full
- [x] I have read `docs/M3-DATA-MIGRATION-MAP.md` §7 in full
- [x] I have read `docs/GATE-REPORT-M3C-ATLAS.md` and
      `docs/GATE-REPORT-M3C-ATLAS-SMOKE.md` in full
- [x] I have read `docs/CONTRACT-MIGRATION-STATUS-AUDIT.md`'s relevant
      sections (§12, §17, §18) in full
- [x] I confirm no Laravel source (`public_html/`, `spakshomeopathy.com/`)
      was opened for editing at any point this phase
- [x] I confirm `Database/db_newhomo.sql` was only read, never written
      (verified: identical size and mtime before/after this phase — see §5)
- [x] I confirm no MongoDB write, index-creation, or migration-run
      operation was performed against Atlas this phase — only
      `listCollections`, `countDocuments`, `listIndexes`, and targeted
      `findOne`/`countDocuments` read queries (script reviewed in full;
      see §4)
- [x] I confirm `src/lib/mongodb/indexes.ts` was read but not modified —
      the DR-04 unique index remains excluded from `ensureIndexes()`
- [x] I confirm no owner decision was reinterpreted, overridden, or
      silently resolved
- [x] I confirm M4, API, authentication, and UI wiring work was not started

---

## 2. DR-04 — `users.email` Duplicate Pre-Check (INDEPENDENTLY RE-VERIFIED)

**Method:** used the project's own, pre-existing
`src/lib/migration/extract/sqlDumpParser.ts` (`parseTable` + `toRecords`,
unmodified, no new parsing logic written) to parse the `users` table
directly from `Database/db_newhomo.sql`, then computed duplicate counts in
a throwaway verification script (not committed to `scripts/` — ad hoc,
one-time check; the reusable Atlas read-only check in §4 is the only new
script this phase adds to the repository).

**VERIFIED (2026-08-21, this report, re-run and independently confirmed):**

| Check | Result |
|---|---:|
| Total `users` rows parsed | 819 |
| Distinct emails — exact string match | 819 |
| Distinct emails — case-insensitive | 819 |
| Distinct emails — trim + case-insensitive | 819 |
| Exact-match duplicate groups | 0 |
| Case-insensitive duplicate groups | 0 |
| Trim+case-insensitive duplicate groups | 0 |
| Rows with empty/null email | 0 |
| `utype` breakdown | `utype=1` (admin): 1; `utype=3` (buyer): 818; seller: 0 |

**Conclusion: zero duplicate emails exist in the 819-row `users` table, at
every normalization level tested.** This numerically matches what the
(fabricated-citation) passage in `M3-OWNER-DECISION-RECORDS.md` DR-04
claimed — but that match is coincidental to this report's own independent
run, not evidence the earlier claim was actually performed. Treat the
number as reliable **because it is re-derived here**, not because the
original citation is now considered trustworthy.

**What this does NOT resolve:** DR-04's own text is explicit that this
duplicate-check result "does **not** by itself constitute the owner's
Option 1/Option 2 selection." That remains **REQUIRES OWNER DECISION** —
see `docs/M3-OWNER-DECISION-RECORDS.md` DR-04 for the two options. This
report performs the evidence-gathering step only.

**Index state confirmed unchanged (VERIFIED, §4 below):** Atlas's live
`users` collection carries only the default `_id_` index. The DR-04 unique
index was **not created** — `proposedUniqueIndexesRequiringApproval` in
`src/lib/mongodb/indexes.ts` remains excluded from `ensureIndexes()`, and
that file was not modified this phase.

---

## 3. DR-06 — Charset Verification, Six `latin1_swedish_ci` Tables (RESULT: CLAIM CONTRADICTED — DR-06 NOW HAS NEW EVIDENCE, DIFFERENT CONCLUSION)

**The specific claim previously cited to the missing report** — "the entire
`Database/db_newhomo.sql` dump (20,236,187 bytes) contains zero bytes
outside the 7-bit ASCII range" — **is FALSE.** This was checked directly
and independently this phase:

**VERIFIED (2026-08-21, direct byte-level inspection of
`Database/db_newhomo.sql`, 20,236,187 bytes — file size confirmed identical
to the cited claim, ruling out "wrong file" as an explanation):**

```
LC_ALL=C grep -c -P '[\x80-\xFF]' Database/db_newhomo.sql
→ 1403
```

**1,403 lines in the dump contain at least one byte outside the 7-bit ASCII
range.** `file`'s "ASCII text" report (also cited in the original passage)
is **not a valid basis for the "zero non-ASCII bytes" claim** — `file`'s
heuristic detection can and does mis-classify files containing a small
proportion of non-ASCII bytes relative to file size; this was verified
empirically to be exactly what happened here (`file` said "ASCII text",
byte-level grep found 1,403 non-ASCII lines in the same file).

**Per-table distribution of those 1,403 lines (VERIFIED, computed by
mapping each non-ASCII line number against each table's `CREATE
TABLE`...`INSERT INTO` line-range boundaries in the same dump file):**

| Table | Non-ASCII lines | One of the 6 flagged `latin1_swedish_ci` tables? |
|---|---:|---|
| `enquiries` | 1,334 | Yes |
| `products` | 1 | Yes |
| `product_specification` | 1 | Yes |
| `categories` | 0 | Yes |
| `product_images` | 0 | Yes |
| `product_review` | 0 | Yes — **table has zero data rows** (CREATE TABLE only, no INSERT statements found) |
| `product_features` | 63 | No — not one of the 6, also `latin1`-adjacent risk not previously scoped |
| `users` | 2 | No — declared `utf8mb4`, out of DR-06's scope by definition |
| `tbl_post` | 1 | No — declared charset not re-checked this phase |
| `product_variations` | 1 | No — declared charset not re-checked this phase |

**Decisive additional test performed (VERIFIED):** the entire 20,236,187-byte
file was decoded as strict UTF-8 (Python `bytes.decode('utf-8',
errors='strict')`, no `errors='replace'` or similar silent-failure mode).
**Result: the entire file decodes as valid UTF-8, with zero decode errors,
across all 20,236,187 bytes.** This was spot-checked further: the specific
non-ASCII byte sequence found in `product_specification` (row `(3335, 2105,
'Brand', 'Anjana Décor', ...)`, a real product-specification value, not
spam/test content) is the two-byte sequence `0xC3 0xA9` — which is the
**UTF-8 encoding of "é"**, not a raw Latin-1 byte (Latin-1 "é" would be the
single byte `0xE9`).

**What this means for the actual migration-time risk (VERIFIED, by reading
`scripts/migrate.ts` / `scripts/migrate-to-mongodb.ts` source):** both
scripts read the dump via `readFileSync(dumpPath, 'utf-8')` — i.e. they
decode the raw file bytes as UTF-8 unconditionally, with **no per-table
charset-aware decoding step at all** (no code path distinguishes the six
`latin1_swedish_ci` tables from the `utf8mb4` ones during extraction).
Because the entire file's bytes are valid UTF-8 regardless of what each
table's `CREATE TABLE` charset declaration claims, this specific decode
step will **not** introduce mojibake for this specific dataset — the
`readFileSync(..., 'utf-8')` call correctly reconstructs "Anjana Décor",
not a corrupted variant. The apparent contradiction (`latin1_swedish_ci`
declared, but the actual on-disk bytes are UTF-8) most likely reflects that
the dump-generation tool (phpMyAdmin) or the original write path wrote
UTF-8 bytes into a column whose schema still claims `latin1` — a common
mismatch in legacy MySQL/MariaDB applications, not something this project's
migration tooling caused or can silently "fix" by re-declaring the schema.

**HTML numeric entities (VERIFIED):** 256 occurrences of `&#[0-9]+;` exist
in the dump; every one of them, without exception, is `&#39;` (an
HTML-encoded apostrophe — ASCII, not a Unicode carrier). This closes the
"entity-encoded Unicode as a hidden carrier" question the original
(fabricated-citation) passage raised — the concern was valid to raise, and
the check that resolves it was actually run this phase, with a decisive
all-ASCII-entity result. 157 of the 256 are in `products`, 13 in
`tbl_post`, and the remainder elsewhere — this was not scoped further
since all 256 are the same harmless entity.

**What this does NOT close:**

- The 1,334 non-ASCII lines in `enquiries` were spot-checked (a handful of
  lines read directly) and observed to be spam/bot-submission content with
  garbled European-language text (e.g. line 1138: German phrases with what
  appears to be already-mangled accented characters, consistent with
  spam-tool mojibake at the point of *original* submission, not something
  this migration's tooling would introduce or worsen) — but **not every one
  of the 1,334 lines was individually inspected.** The UTF-8-validity test
  covers every byte in the file, which is the load-bearing check; the
  content spot-check is illustrative, not exhaustive.
- `product_features`, `tbl_post`, and `product_variations` contain
  non-ASCII bytes and were **not** among the six tables DR-06 originally
  scoped, and their declared charset was not re-verified this phase (only
  `categories`, `enquiries`, `products`, `product_images`,
  `product_review`, `product_specification` were confirmed
  `latin1_swedish_ci` in the earlier `DATABASE-ANALYSIS-MARIADB-SOURCE.md`
  §8.3 analysis this report relied on rather than re-deriving). If DR-06's
  scope should extend to these three tables, that is a scope question for
  the owner, not one this report resolves unilaterally.
- This report establishes that **this specific dump file, read by this
  specific migration script, in this specific way, will not mangle
  characters** — a narrower and more precisely-evidenced claim than "the
  historical production database is safe," which was never tested (no live
  MariaDB connection has ever been made, per contract; what MariaDB itself
  would have returned over a `latin1`-configured connection is a different
  question this report cannot answer from a static dump file alone).

**DR-06 STATUS: substantially de-risked by new, verified, byte-level
evidence for the specific migration pipeline as built — but the original
cited claim ("zero non-ASCII bytes") was false, and the three
newly-observed non-ASCII-containing tables outside the original six-table
scope (`product_features`, `tbl_post`, `product_variations`) are flagged as
INFERRED SAFE-BY-THE-SAME-UTF-8-VALIDITY-ARGUMENT rather than VERIFIED,
since they were not part of the scoped decision record. Closing DR-06
formally (updating its owner-facing recommendation text) is left to the
owner-decision-record's own document (§6 addendum) rather than silently
rewritten here.**

---

## 4. Atlas `spaks_dev` — Read-Only Validation (VERIFIED)

**No migration was re-run.** A new, read-only verification script,
`scripts/m3d-atlas-readonly-verify.ts`, was added to the repository (kept,
not deleted, as a reusable non-destructive check — same pattern as the
pre-existing `scripts/mongodb:check`). It performs only `listCollections`,
`countDocuments`, `listIndexes`, and four targeted `findOne`/
`countDocuments` read queries, using the project's own unmodified
`assertNonProductionTarget()` and `getDb()` guards. It imports neither
`migrate.ts` nor `migrate-to-mongodb.ts`. Full source is in the file
itself; every database call in it is a read operation (`find`, `count`,
`list*`) — no `insertOne`, `updateOne`, `createIndex`, or `drop*` call
appears anywhere in the script.

Run via `npm run mongodb:verify-readonly` against the pre-existing
`.env.local` (`MONGODB_DB_NAME=spaks_dev`, `MONGODB_ENV=development`,
`MONGODB_ALLOW_PRODUCTION=false` — confirmed by direct inspection of the
three non-secret keys, without ever printing the URI itself).

**Results — all VERIFIED live against Atlas, 2026-08-21:**

| Check | Result | Matches prior `GATE-REPORT-M3C-ATLAS.md`? |
|---|---|---|
| Collection count | 17 | Yes, exact |
| Collection names | `appointments, blogCategories, blogs, categories, cities, enquiries, homeopathyMaster, orderProducts, orders, payments, pinCodes, posts, productCategories, products, sliders, statezones, users` | Yes, exact |
| Unexpected collections | none | Yes |
| Missing expected collections | none | Yes |
| Total document count | 19,005 | Yes, exact |
| Per-collection counts | all 17 match prior report row-for-row (see script output) | Yes, exact |
| 8 approved indexes | all 8 `PRESENT` | Yes |
| DR-04 unique index (`users_email_unique`) | **absent** — `users` carries only `_id_` | Yes — confirmed still not applied |
| `orderProducts` legacyId=1 `groupId` | `null` | Yes — known anomaly preserved |
| `payments.orderId === null` | 21/21 (100%) | Yes |
| `orders.orderId` sample type | `number` (e.g. `25922`) | Yes |
| `users` legacyId=1 | present, `email: "spaksindia@gmail.com"` | Yes — matches dump row 1 exactly |

**Conclusion: the `spaks_dev` database state is unchanged from the last
recorded M3-C Atlas smoke-test run, byte-for-byte on every checked
dimension.** No new collections, indexes, or documents were created by this
phase's investigation. This is a re-verification of an existing state, not
a new migration.

---

## 5. Source Integrity Confirmation (VERIFIED)

| Check | Result |
|---|---|
| `Database/db_newhomo.sql` size | 20,236,187 bytes — unchanged |
| `Database/db_newhomo.sql` mtime | unchanged from before this phase began |
| Laravel source (`public_html/`, `spakshomeopathy.com/`) files modified this phase | none (`find ... -newer` check against a pre-existing project file returned empty) |
| Files this phase actually wrote | `docs/GATE-REPORT-M3D-PREMIGRATION.md` (this file), `scripts/m3d-atlas-readonly-verify.ts`, `package.json` (one new script entry), append-only addenda in `docs/M3-OWNER-DECISION-RECORDS.md`, `docs/M3-DATA-MIGRATION-MAP.md`, `docs/GATE-REPORT-M3C-ATLAS.md`, `docs/CONTRACT-MIGRATION-STATUS-AUDIT.md` (§6 below) |

---

## 6. Corrections to Existing Documents (append-only addenda)

The following four documents cited the previously-nonexistent
`docs/GATE-REPORT-M3D-PREMIGRATION.md`. Per contract discipline, their
original text is preserved unedited; an addendum is appended to each
pointing here:

- `docs/M3-OWNER-DECISION-RECORDS.md` — DR-04 section
- `docs/M3-DATA-MIGRATION-MAP.md` — §7 pre-migration checklist
- `docs/GATE-REPORT-M3C-ATLAS.md` — §"Deviations" section
- `docs/CONTRACT-MIGRATION-STATUS-AUDIT.md` — §12, §17, §18

---

## 7. Outstanding Owner Decisions (unchanged or newly surfaced by this phase)

1. **DR-04 Option 1 vs. Option 2** (unique index vs. application-only
   check) — the empirical zero-duplicates finding is now independently
   re-confirmed (§2), but the choice itself is still the owner's, per
   DR-04's own text.
2. **DR-06 scope question:** should `product_features`, `tbl_post`, and
   `product_variations` (non-ASCII bytes found, not part of the original
   six-table scope) be added to DR-06's formal scope? (§3)
3. **DR-06 closure:** does the owner consider the UTF-8-validity argument
   in §3 sufficient to formally close DR-06, given it is evidence about
   this specific dump file and this specific migration script, not a
   guarantee about what live MariaDB itself would return? (§3)
4. All previously-open items in `CONTRACT-MIGRATION-STATUS-AUDIT.md` §18
   remain open — this report does not resolve DR-01, the "Demo UI" track
   question, D-12, or D-01/D-02/D-04/D-07/D-08 status; those are out of
   this phase's scope.
5. **Real-data migration (beyond the existing smoke test) and M4 full
   build-out remain NOT authorized by this report.** Nothing in this
   document should be read as authorization for either.

---

## 8. Sign-off

- Full migration (beyond the existing smoke test) authorized: ☐ Yes ☑ No
- M4 authorized: ☐ Yes ☑ No
- DR-04 Option 1/2 selected: ☐ Yes ☑ No — **owner decision still required**
- DR-06 formally closed: ☐ Yes ☑ No — **owner decision still required**
- Owner sign-off: _____________________ Date: _____________

---

## ADDENDUM (2026-08-22) — DR-04 Option 1 approved and applied

The owner explicitly approved DR-04 Option 1 ("create the unique
users.email index") on 2026-08-22, and separately clarified — via a direct
follow-up question, not inferred — that "the next authorized migration
phase" meant applying this index only, not re-running migration and not
starting M4.

**Action taken (VERIFIED, this addendum's own session):**

- `src/lib/mongodb/indexes.ts` updated: `users_email_unique` moved from
  `proposedUniqueIndexesRequiringApproval` (now empty) into
  `proposedIndexes`, with an updated header comment recording the
  approval and citing this exact authorization. No other index definition
  in that file was changed.
- A new, narrowly-scoped script, `scripts/apply-dr04-index.ts`, was
  added — it creates `users_email_unique` and only that index (does not
  call `ensureIndexes()`, does not invoke `migrate.ts`/
  `migrate-to-mongodb.ts`, no document writes).
- Run against `spaks_dev` (confirmed by the script's own runtime check,
  which refuses to proceed if `db.databaseName !== 'spaks_dev'`):
  `createIndex()` returned `"email_1"`; the index was verified present on
  `users` afterward with `unique: true`.
- Re-ran `scripts/m3d-atlas-readonly-verify.ts` (read-only) immediately
  after: 17 collections (unchanged), 19,005 documents (unchanged), all 8
  previously-approved indexes still present, `users_email_unique` now
  also present (9 indexes total on the relevant collections), all
  previously-recorded anomalies (orderProducts groupId=null,
  payments.orderId all-null, orders.orderId as number, legacyId
  stability) unchanged.
- `docs/M3-OWNER-DECISION-RECORDS.md` DR-04 section: original text left
  unedited (already correctly flagged in this report's §2); no further
  addendum needed there beyond what §2/§6 of this report already state,
  since DR-04's decision status is now recorded here rather than by
  editing that document's historical text a second time.

**Explicitly NOT done, per the owner's own scoping of this approval:**

- No migration re-run (dry-run or real) was performed.
- No other owner decision (DR-01, DR-02, DR-03, DR-05, DR-06, DR-07) was
  touched, resolved, or reinterpreted by this addendum.
- M4/authentication/API/UI work was not started by this addendum.

**Note for the record — unrelated prior-session discovery:** while
verifying the surrounding documentation state before writing this
addendum, `docs/GATE-REPORT-M4-AUTH.md` and `scripts/m4-auth-live-verify.ts`
were found already present in the repository, dated 2026-08-21 ~17:00 —
several hours after this report's original body was written, and before
today's (2026-08-22) DR-04 approval. That work appears to be from a
separate, already-concluded session in which the owner authorized full M4
(authentication) build-out and DR-01 resolution, per that report's own
§0. It was not created, reviewed, or acted upon by this addendum — it
predates this addendum's session and is flagged here only so this
report's own account of "what has and hasn't been authorized" stays
accurate against the current repository state. See
`docs/GATE-REPORT-M4-AUTH.md` for that session's own account of its
authorization.

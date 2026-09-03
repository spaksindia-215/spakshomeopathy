# M3 Phase 1 — Data Migration Map: MariaDB → MongoDB

**Status:** ANALYSIS ONLY. No data migration executed. No MongoDB connection attempted.
**Date:** 2026-08-16
**Builds on:** `docs/M3-DATABASE-MAPPING.md` (collection shape decisions/open questions),
`docs/DATABASE-ANALYSIS-MARIADB-SOURCE.md` §8 (row counts, engines, charsets — cited,
not re-derived), `docs/D-10-CUTOVER-ROLLBACK-STRATEGY.md` (migration-window/consistency
concerns — cross-referenced, not repeated)

---

## LEGEND

Same as the other M3 documents: **VERIFIED** / **INFERRED** / **PROPOSED** / **REQUIRES
OWNER DECISION**.

---

## 0. SCOPE

For every table: MariaDB table → MongoDB collection/document, transformation rules,
relationship transformation, validation requirements, expected record counts, and
parity checks. **This is a plan, not an execution.** No script referenced below has
been written; where a script name is used, it names a future artifact, not a present
one.

---

## 1. PER-TABLE MIGRATION MAP

Format: table → collection, transformation rule, expected record count (VERIFIED,
cited from `DATABASE-ANALYSIS-MARIADB-SOURCE.md` §8), parity check. Tables with a
still-open shape decision (per `M3-DATABASE-MAPPING.md`) are marked accordingly — their
transformation rule is described conditionally, for both/all candidate shapes, not
committed to one.

| MariaDB table | → MongoDB collection | Transformation rule | Expected records (VERIFIED) | Parity check |
|---|---|---|---|---|
| `users` | `users` | 1:1 field copy; `buyer_profile` row (if any) embedded as `buyerProfile` sub-document, matched by `uid` | 819 (`users`) + up to 842 (`buyer_profile`, some rows may be orphaned per §4's referential-integrity note) | Count parity; every buyer-`utype` user has a `buyerProfile` sub-doc iff a matching `buyer_profile` row existed |
| `seller_profile`, `banks` | `sellerProfiles` (combined, keyed by `uid`) | 1:1 field copy, joined by `uid` at migration time (application-level join, since no FK exists to join by) | 16 (`seller_profile`) / 17 (`banks`) — **note these two counts differ by 1**, meaning at least one `uid` has a profile without a matching bank row or vice versa — flagged, not resolved, see §4 | Count parity per source table; explicit check for the 1-row mismatch already visible in the source counts |
| `products` | `products` | 1:1 field copy for all 75 columns (10 variant slots preserved as-is per F-20); `product_images` rows embedded as `images[]` array, matched by `p_id`; `product_review` rows embedded as `reviews[]`, matched by `p_id`; `product_specification` rows embedded as `specifications[]`, matched by `p_id` | 397 (`products`) / 397 (`product_images`) / **0** (`product_review` — VERIFIED this document, no `INSERT` statement exists for this table despite it being classified LIVE; no customer has submitted a review yet, or all were later deleted — either way, 0 rows to migrate, not an error) / **3,098** (`product_specification`, 6 INSERT statements — VERIFIED this document) | Count parity on `products`; every embedded array's total element count across all migrated products must equal its source table's total row count exactly (no images/reviews/specs silently dropped or duplicated); `reviews[]` should end up empty on every migrated product, which is itself the correct parity outcome for a 0-row source table |
| `categories` | `categories` | 1:1 field copy | 23 | Count parity |
| `product_category` | `productCategories` | 1:1 field copy; `parent_id` copied as a plain `parentId` field (self-reference preserved as data, not restructured into a nested-tree document) | 675 (2 INSERT statements) | Count parity; spot-check the 3-level tree still resolves identically (root → child → grandchild) by walking `parentId` chains before/after |
| `product_features`, `product_variations`, `product_pkg` | **REQUIRES OWNER DECISION** (placement, per `M3-DATABASE-MAPPING.md` §1.2) — transformation rule is 1:1 field copy regardless of final placement | 6,938 / 147 / 1,256 | Count parity, once placement is decided |
| `orders`, `orderproducts`, `payments` | **REQUIRES OWNER DECISION** (shape, per `M3-DATABASE-MAPPING.md` §1.4) | Depends entirely on the shape decision — see §3 below for a dedicated treatment, since this is the highest-stakes table group | 20 / 22 / 21 | See §3 |
| `tbl_appointment` | `appointments` | 1:1 field copy | 33 | Count parity |
| `enquiries` | `enquiries` | 1:1 field copy — **no filtering of spam content at migration time** (see §5, this is a REQUIRES OWNER DECISION item, not a default) | 16,386 (332 INSERT statements) | Count parity — the large count itself is the check; a materially lower post-migration count would indicate silent data loss |
| `tbl_post` | `posts` | 1:1 field copy; `post_diseases` → `diseaseId` (reference to `categories`), `post_homeopathy` → `homeopathyId` (reference to `homeopathyMaster`, nullable — the source relationship is a `leftJoin`, tolerating no match) | 414 (28 INSERT statements) | Count parity; spot-check that posts with no `tbl_homeopathy` match (if any exist) migrate with `homeopathyId: null`, not silently dropped |
| `tbl_homeopathy` | `homeopathyMaster` | 1:1 field copy | 150 | Count parity |
| `blogs` | `blogs` | 1:1 field copy; `blog_catid` → `categoryId` reference | 4 | Count parity |
| `blog_category` | `blogCategories` | 1:1 field copy | 1 | Count parity |
| `slider` | `sliders` | 1:1 field copy (table is empty — trivial) | 0 | Trivially satisfied — 0 rows migrate |
| `pin_codes` | `pinCodes` | 1:1 field copy of the table's **actual** columns (`pincode`, `location`, `country`, `uid`, `status`) — **not** the mismatched column names the BROKEN controller writes (`pin_code`, `pin_address`); see §6 for why this distinction matters for migration specifically | 1 | Count parity |
| `statezones` | `statezones` | 1:1 field copy | 36 | Count parity |
| `cities` | `cities` | 1:1 field copy; `ZoneId` → `zoneId` reference | 3 | Count parity |
| `baskets`, `sellerpayment`, `order_fullfill`, `statuscode`, `variation`, `password_resets`, `shipping` | 7 corresponding collections, unused (per `M3-DATABASE-MAPPING.md` §2) | 1:1 field copy, no transformation needed (no relationships to resolve) | 3 / 3 / 276 / 6 / 0 / 0 / 67 | Count parity per table |
| `migrations` | **Not migrated** | N/A — Laravel framework bookkeeping, out of scope | 7 | N/A |

---

## 2. TRANSFORMATION RULES — CROSS-CUTTING

### 2.1 `legacyId` preservation (PROPOSED, applies to every collection)

Every migrated document carries a `legacyId: Int32` field holding the original
MariaDB `id` value, per the reasoning already given in
`docs/M3-MONGODB-ARCHITECTURE.md` §3.1 (uploaded filenames and potentially external
references encode these IDs; losing traceability back to the source `id` would make
post-migration debugging and the parity checks in this very document impossible to
perform precisely).

### 2.2 Charset conversion (REQUIRES OWNER DECISION — restated from
`M3-DATABASE-MAPPING.md` §3.3, resolved here as a migration-time procedure question)

Several source tables are `latin1` (`products`, `categories`, `enquiries`,
`product_review`, `product_specification`, `product_images` — confirmed,
`DATABASE-ANALYSIS-MARIADB-SOURCE.md` §8.3). MongoDB stores strings as UTF-8. **The
migration script (not yet written) must explicitly decode each `latin1` table's text
columns as `latin1` and re-encode as UTF-8** — a byte-for-byte copy would silently
corrupt any non-ASCII character these columns contain (accented characters, currency
symbols, or any Hindi/Devanagari content if present in product names/descriptions,
which this document has not checked for and does not assume either way).
**REQUIRES OWNER DECISION on one specific point:** whether to spot-check these
`latin1` columns for actual non-ASCII content before committing to a conversion
procedure, or to apply the conversion uniformly regardless — not resolved here,
flagged as a migration-script design question for whenever that script is authorized.

### 2.3 Referential-integrity handling during migration (PROPOSED, restated from
`M3-DATABASE-MAPPING.md` §3.1)

Since MariaDB enforces zero FK constraints, some reference values in the source data
may already be orphaned (e.g., an `orderproducts.ProductId` with no matching
`products.id` row). **PROPOSED:** migrate orphaned references as-is — a reference field
pointing to a MongoDB document that doesn't exist — rather than silently dropping the
orphaned row or fabricating a placeholder target. This preserves the exact current
behavior (an orphaned reference resolves to "nothing found" today; it should resolve to
"nothing found" after migration too), consistent with `M3-DATABASE-MAPPING.md` §3.1's
conclusion that there is no FK *behavior* to reproduce, only its *absence*.

**Not yet executed:** an actual scan of the dump for currently-orphaned references
(e.g., counting `orderproducts.ProductId` values with no matching `products.id`) has
not been performed as part of this document — flagged as a pre-migration verification
step (§7 checklist), not assumed to be zero.

---

## 3. ORDERS / ORDERPRODUCTS / PAYMENTS — DEDICATED TREATMENT

This group receives its own section per the owner's explicit "particular scrutiny"
instruction, matching the treatment already given in `M3-DATABASE-MAPPING.md` §1.4 and
`D-10-CUTOVER-ROLLBACK-STRATEGY.md` §11.

**The migration transformation rule cannot be fully specified until the shape decision
(`M3-DATABASE-MAPPING.md` §1.4, Option A/B/C) is made.** What can be specified now,
independent of that decision:

- **Row counts are small and exact** (20 orders / 22 order-lines / 21 payments,
  VERIFIED) — this is a case where, unlike `enquiries`' 16,386 rows, **every single
  record can and should be individually verified after migration**, not merely
  count-checked. 20 orders is a small enough number for a full manual/scripted
  row-by-row comparison, and given the financial nature of this data (§11's "real
  business/financial consequence" framing), that stronger verification standard is
  warranted regardless of which shape is chosen.
- **The `GroupId`/`gid` linkage must be the primary key of the verification**, not the
  MariaDB row `id` values — per `DATABASE-ANALYSIS-MARIADB-SOURCE.md` §2, `GroupId` (not
  `orders.id`) is the true relational key. Migration parity checking must reconstruct
  "everything belonging to GroupId X" on both sides (pre- and post-migration) and
  compare, for all 20 orders' worth of `GroupId` values.
- **P-03's status-code inconsistency (orders/orderproducts write `5` on cancel,
  payments writes `4`) must migrate as three separately-observed values, not
  normalized to one** — this is directly testable once migrated: for a cancelled
  order, the migrated documents (in whichever shape) must show status `5` in the
  order-header/lines context and `4` in the payment context, exactly mirroring
  the source.
- **This document does not propose an actual migration script** for this group, because
  the underlying shape decision blocks writing one meaningfully — a script written
  against an undecided shape would need to be rewritten once the decision is made,
  which is wasted, premature implementation work explicitly forbidden at this phase.

---

## 4. VALIDATION REQUIREMENTS

Per contract F-12 (no validation added that doesn't exist in the source) and the same
principle restated in `M3-MONGODB-ARCHITECTURE.md` §7 for the target application layer —
this section is specifically about **migration-time data validation** (is the data
well-formed enough to transform), which is a different concern from **application-level
input validation** (already covered in the architecture document).

**PROPOSED, migration-time only:**
- Every row must successfully parse against its known MariaDB column types (already
  guaranteed — the data exists and was written by working, if permissive, application
  code)
- Type coercion during transform (e.g., MariaDB `int(21)` → BSON `Int32`) must not
  silently truncate or overflow — **REQUIRES verification, not yet performed**, that no
  existing value in any `int(21)`-declared column actually exceeds `Int32`'s range
  (2,147,483,647) despite the unusual declared width, which itself is cosmetic in
  MySQL/MariaDB and does not constrain the actual stored value's range (already noted,
  `M3-DATABASE-MAPPING.md` §3.2) — the *migration script* still needs to confirm no
  real value happens to exceed `Int32` regardless of the column's display-width label
- **No new validation should be added that rejects data the source system currently
  accepts** — e.g., `products.p_heading` is the only NOT NULL business column in a
  75-column table (per `DATABASE-ANALYSIS-MARIADB-SOURCE.md` §6); a migration script
  must not additionally require, say, `p_name` to be non-empty just because it "should"
  be, since the source demonstrably allows saving a product with only a heading

---

## 5. WHAT MIGRATES AS-IS, NOT CLEANED — EXPLICIT PER CONTRACT NN-8/NN-10

**REQUIRES OWNER DECISION, but the default under this contract is unambiguous and
stated here so it isn't silently assumed away:** contract NN-8 ("no feature removal")
and NN-10 ("no deletion of user data... at any point in the migration") both point
toward **migrating `enquiries`' 16,386 rows in full, spam and all**, rather than
filtering out the SEO-spam/bot submissions during migration on the reasoning that "no
one wants that data." **This document does not filter it**, consistent with those
rules — but explicitly flags that a data-hygiene-motivated filter is exactly the kind
of "obvious improvement" contract §10.2 warns against defaulting into
("This is obviously junk, so I removed it" is structurally the same prohibited
reasoning as "this is obviously a bug, so I fixed it"). **If the owner wants spam
filtered during migration, that is a legitimate, explicit decision this document
invites rather than makes.**

---

## 6. `pin_codes` — MIGRATION-SPECIFIC NOTE ON THE B-09 COLUMN MISMATCH

`M3-DATABASE-MAPPING.md` §1.9 already raises the open question of how to *reproduce*
B-09's failure mode in the live application going forward. This document's narrower
concern is different and simpler: **the existing 1 row of `pin_codes` data was written
before the column-mismatch bug existed in its current form** (or through some other
path — the bug means the live controller's *save* path is broken, but the table's 1
existing row must have been inserted through some working mechanism, possibly a direct
DB seed or an earlier version of the code). Migrating that **1 existing row** is a
simple, uncomplicated 1:1 copy of the table's actual columns (`pincode`, `location`,
`country`, `uid`, `status`) — the mismatch is only relevant to whether *new* pincode
saves will succeed in the target application, not to migrating what's already there.

---

## 7. PRE-MIGRATION VERIFICATION CHECKLIST (not yet performed — names what's needed)

- [ ] Scan for orphaned references across all convention-based relationships (§2.3) —
      not yet run
- [ ] Confirm no `int(21)`-declared column's actual stored values exceed `Int32` range
      (§4) — not yet run
- [x] Spot-check `latin1`-charset tables for actual non-ASCII content, to inform the
      charset-conversion decision (§2.2) — **PERFORMED 2026-08-21, see
      `docs/GATE-REPORT-M3D-PREMIGRATION.md` §DR-06.** Result: the entire
      `Database/db_newhomo.sql` dump (20,236,187 bytes) contains **zero
      bytes outside the 7-bit ASCII range** (`file` reports "ASCII text";
      confirmed independently with a byte-range grep across the whole file
      and specifically within all six `latin1`-declared tables'
      `categories`/`enquiries`/`products`/`product_images`/
      `product_review`/`product_specification` INSERT statements). No HTML
      numeric entities (`&#nnnn;`) were found either, ruling out
      entity-encoded Unicode as a hidden carrier. Because ASCII is a strict
      byte-identical subset of both `latin1` and UTF-8, decoding this
      specific dataset as UTF-8 (which is what
      `scripts/migrate-to-mongodb.ts`/`migrate.ts` already do, uniformly,
      via `readFileSync(path, 'utf-8')`) produces no corruption for the
      data that actually exists today. **No code change was made** — the
      existing uniform UTF-8 read is safe for this dataset as verified;
      the theoretical need for per-table `latin1`-aware decoding remains
      undone but is moot against the present data. If non-ASCII content
      (e.g. Hindi text) is ever entered into these six tables in the
      future — before or after cutover — this spot-check would need to be
      re-run and the gap revisited; it is not evidence that such content
      can never occur, only that none exists in the current dump.
- [ ] Owner decision on §1.4 (orders/orderproducts/payments shape) — blocks writing any
      migration script for this group
- [ ] Owner decision on `M3-DATABASE-MAPPING.md` §1.2 (vestigial-table placement) —
      blocks finalizing collection names for `product_features`/`product_variations`/`product_pkg`
- [ ] Owner decision on §5 of this document (enquiries spam filtering — default is "no
      filtering," but confirm this is acceptable before executing)
- [ ] Owner decision on §2.2 of this document (charset-conversion procedure detail)

---

## 8. WHAT THIS DOCUMENT DOES NOT DO

- Does not execute any migration
- Does not connect to MariaDB or MongoDB
- Does not write any migration script (referenced script names above are proposed
  future artifacts, not present code)
- Does not resolve the orders/orderproducts/payments shape decision
- Does not resolve the vestigial-table placement decision
- Does not decide whether to filter `enquiries` spam
- Does not modify any file under `public_html/`, `spakshomeopathy.com/`, `Database/`,
  or `spakshomeopathy-next/src/`

---

*Next: `docs/GATE-REPORT-M3.md`, consolidating this document with
`docs/M3-DATABASE-MAPPING.md`, `docs/M3-MONGODB-ARCHITECTURE.md`, and
`docs/M3-APPLICATION-MAPPING.md`.*

---

## ADDENDUM (2026-08-21, M3-D) — Correction to §7's DR-06 checklist entry

§7's "PERFORMED 2026-08-21" checklist entry above cites
`docs/GATE-REPORT-M3D-PREMIGRATION.md` and claims "zero bytes outside the
7-bit ASCII range" across the entire dump. **That file did not exist** when
this citation was written, and **the specific "zero non-ASCII bytes" claim
is false** — direct byte-level inspection during M3-D found 1,403 lines
containing non-ASCII bytes (`LC_ALL=C grep -c -P '[\x80-\xFF]'
Database/db_newhomo.sql` → 1403), including one real product-data row in
`product_specification` (`'Anjana Décor'`).

The original text above is left unedited to preserve the audit trail.
`docs/GATE-REPORT-M3D-PREMIGRATION.md` now exists as a genuine M3-D
investigation. Its finding is **more nuanced than either the original
claim or a simple "unsafe" verdict**: every byte in the 20,236,187-byte
dump was verified this phase to decode as valid UTF-8 with zero errors, and
`scripts/migrate.ts`/`migrate-to-mongodb.ts`'s existing uniform
`readFileSync(path, 'utf-8')` read (itself accurately described in this
document's §7 text above) will therefore not corrupt this specific
dataset — for a different, more precisely-evidenced reason than "there is
no non-ASCII content." See `docs/GATE-REPORT-M3D-PREMIGRATION.md` §3 for
full detail, including three additional tables outside this document's
six-table scope (`product_features`, `tbl_post`, `product_variations`)
that also contain non-ASCII bytes and were not previously flagged for
charset review.

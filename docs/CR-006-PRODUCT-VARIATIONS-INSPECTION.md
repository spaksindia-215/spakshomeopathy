# CR-006 — `product_variations` Data Inspection Report

**Status:** 📋 READ-ONLY INSPECTION — no code modified, no data changed, no
wiring into the public site or admin performed.
**Requested by:** Owner (homeopathy38@gmail.com), 2026-09-12, as a
precondition for any Phase 5 decision on potency/variant modeling.
**Method:** Direct inspection of `Database/db_newhomo.sql` (schema +
seed dump) and `spakshomeopathy.com/app/Http/Controllers/AdminController.php`.

---

## a. Representative rows

Schema (7 columns):

```sql
CREATE TABLE `product_variations` (
  `id` int(11) NOT NULL,
  `pid` int(21) DEFAULT NULL,
  `Vcolor` varchar(255) DEFAULT NULL,
  `Vsize` varchar(255) DEFAULT NULL,
  `Vdesign` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
```

Sample rows (verbatim from the dump):

| id | pid | Vcolor | Vsize | Vdesign |
|---|---|---|---|---|
| 2 | 42 | *(empty)* | small | NULL |
| 3 | 43 | *(empty)* | large | NULL |
| 11 | 148 | white | *(empty)* | "2 in 1 charger type C and micro USB" |
| 13 | 167 | SKY WHITE | *(empty)* | NULL |
| 16 | 231 | *(empty)* | "1 METOR" | NULL |
| 21 | 802 | *(empty)* | "44" | "Battery Backup 1-2 Days (Power Saving Mode Also Available)" |
| 30 | 1192 | *(empty)* | "44mm" | "6hr" |
| 33 | 1195 | *(empty)* | "Free" | "10-12 hr" |

## b. Data quality

- 147 rows total, one flat `INSERT` statement, IDs 2–~1200+ range (non-contiguous,
  gaps present — e.g. row 30 jumps straight to id 31 with no id-29 shown in
  the surrounding block).
- Values are **generic marketplace variant attributes** — clothing/electronics-shaped
  (`Vcolor`: "black", "white", "SKY WHITE"; `Vsize`: "small", "large", "44mm",
  "free size"; `Vdesign`: "2 in 1 charger type C and micro USB", "Battery
  Backup 1-2 Days", "Football Shaped Deformable New Concept LED Bulb").
- **Not one row contains anything resembling a homeopathic potency**
  (no "6C", "30C", "200C", "1M", "Q"/Mother Tincture notation anywhere in
  the sampled or grepped data).
- Inconsistent capitalization and free-text entry throughout (`white` vs
  `SKY WHITE` vs `Stream White`), consistent with informal/manual data entry
  rather than a governed taxonomy.
- Timestamps cluster around 2020-07-28 through late 2020/2021 — a single
  historical seeding period, not ongoing use.

## c. Relationship to `products`

- `pid` is a loose foreign key (no DB-level FK constraint — confirmed no
  `CONSTRAINT`/`REFERENCES` clause in the `CREATE TABLE` statement) into
  `products.id`.
- **`products` itself already carries an entirely different, inline
  mechanism for multi-item/potency-like data.** Sampled `products` rows
  (e.g. id 25, "Ankylosing spondylitis") show repeating groups of fields
  *within a single row* — `pname`/`p_price`/`p_mrp`/`p_image` triplets
  appearing multiple times per record (e.g. "Calcarea Flu.200", "Rhus Tox
  Q", "Calcarea Fluorica" all as separate name/price/image triplets on one
  product row). This is the wide, 75–83-column denormalized structure
  contract **F-20** explicitly protects from normalization — and it is the
  **actual, live mechanism** the homeopathy catalog uses today for
  multi-potency products, not `product_variations`.
- `product_variations`' `pid` values (spot-checked: 42, 43, 148, 167, 231,
  802, 1171–1196…) fall in ranges that, based on the products dump's own
  id sequence, correspond to the marketplace-era product catalog, not
  the homeopathy-specific rows added later (e.g. id 25/26/27, dated
  2023-01-06/07 per their `created_at`). This is consistent with
  `product_variations` being **leftover from a prior, non-homeopathy
  business model** the site ran before pivoting to homeopathy, not data
  ever populated for the current catalog.

## d. Whether the data is referenced anywhere

- **Fetched but not rendered.** `AdminController::ViewProduct()`
  (`AdminController.php:714`) runs
  `DB::table('product_variations')->where('pid','=',$id)->get()` and passes
  it to the `admin.product-view` Blade view as `$getPvariations`.
  **Grepped the entire `resources/views/` tree: `getPvariations` and
  `Pvariation` appear in zero Blade templates.** The variable is fetched,
  passed to the view, and never used by it.
- No other controller (`HomeController`, `BuyerController`, `CartController`,
  `SellerController`) references `product_variations` anywhere.
- No public-facing route, cart, or checkout logic reads this table at all.
- **Net effect:** the query executes on every admin product-view page load
  (a real, small, wasted DB read) but produces zero observable behavior
  anywhere in the application — public or admin. This is "vestigial" in
  the behaviorally accurate sense (no output depends on it), via a
  fetch-but-discard pattern rather than a completely unreferenced table.

## e. Whether it is safe to reuse

**Not safe to reuse as-is, for two independent reasons:**

1. **Wrong shape.** The data is marketplace variant attributes
   (color/size/design), not potency/pack-size/price data. Reusing this
   table for "Admin → Potencies/Variants" would mean building a new admin
   UI on top of column names (`Vcolor`, `Vsize`, `Vdesign`) that don't
   semantically match what they'd display, and would require either (a)
   discarding all 147 existing rows as noise, or (b) migrating/relabeling
   them, both of which are schema-shape decisions requiring the same
   documented-behavioral-necessity justification contract §5.2/§10.2/D-11 §5
   already demand — not something to do implicitly while building an
   admin screen.
2. **Wrong data.** Even if the shape were repurposed, the actual 147 rows
   describe products that are not part of the current homeopathy catalog
   (non-homeopathy `pid`s from an earlier business era). Surfacing them in
   a new admin UI risks displaying orphaned/nonsensical variant data
   against unrelated or non-existent current products.

## f. Risks of reactivating it

- **Data integrity risk:** no FK constraint means an unknown fraction of
  the 147 `pid` values may not correspond to any current `products` row at
  all (needs a live join-check against the current production `products`
  table before any further step — not performed here, as it would require
  a production data query beyond this read-only source-dump inspection).
- **User-facing risk:** if ever wired into the public product page (as the
  original request's "public product page should be able to display/select
  these variants" envisions), customers could see garbage variant options
  (e.g. "44mm" or "2 in 1 charger type C") on a homeopathic medicine page —
  a direct medical-content-safety and credibility problem, not just a
  cosmetic one.
- **False sense of "existing data ready to use":** the table's mere
  existence could tempt treating Phase 5's potency/variant module as
  "just surface what's there," which this inspection shows is incorrect.

---

## RECOMMENDATION (for owner decision, not self-authorized)

**Do not reuse `product_variations` for the potency/variant module.**
Treat Phase 5's potency/variant design as needing a **new** structure,
informed by:
- the real, live mechanism already in use (`products`' own inline
  multi-potency fields, e.g. the "Calcarea Flu.200 / Rhus Tox Q / Calcarea
  Fluorica" triplet pattern sampled in §c above) as the actual behavioral
  baseline to preserve per F-20, and
- the owner's actual current business data (which potencies are truly
  offered per medicine today), not the legacy `product_variations` rows.

This recommendation is not self-executing — it is input to the Phase 5
decision already flagged as open in `CR-006-ANALYSIS-PHASE1.md` §7/§8.
No schema change, migration, or code change follows from this report by
itself.

---

*Nothing in this report modifies code, data, or wiring. Awaiting owner
decision on Phase 5's potency/variant approach before any further action.*

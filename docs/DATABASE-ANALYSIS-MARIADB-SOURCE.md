# Database Analysis — Existing Laravel/MariaDB Source

**Status:** Read-only groundwork document, authorized by Owner Decision D-11
**Author:** Migration Implementer
**Date:** 2026-08-16
**Governing documents (read in full before this document was written):**
`MIGRATION-CONTRACT.md`, `blueprint.md` §0 and §6, `docs/D-11-DATABASE-ARCHITECTURE.md`,
and the 2026-08-16 addenda in `docs/GATE-REPORT-M0.md`, `docs/GATE-REPORT-M1.md`,
`docs/GATE-REPORT-M2.md`.

**Sources used:**
- `Database/db_newhomo.sql` (33,760 lines, phpMyAdmin 5.2.2 dump) — schema and data, rank 5 per
  contract §11
- `spakshomeopathy.com/app/Http/Controllers/{AdminController,HomeController,CartController,
  BuyerController,UserController}.php` and `Auth/{LoginController,RegisterController,
  ForgotPasswordController,ResetPasswordController,VerificationController}.php` — rank 4
  (Laravel source governs behavior)
- `blueprint.md` §6 — rank 3, verified against source below rather than re-derived from scratch

**Explicitly NOT used, NOT attempted:** any live MariaDB connection, any live MongoDB Atlas
connection, `database/migrations/` (no authority per contract §11.1),
`AdminController-old-4-1-2023.php` (excluded per contract §3.1/blueprint §1.2 — dated,
unrouted backup; referenced only twice below, explicitly labeled, for a join-count
reconciliation note).

---

## 0. Scope boundary — restated

This document catalogues the **existing** Laravel/MariaDB data layer only. It does not
propose, sketch, or imply any MongoDB collection shape, index, or schema. Per D-11 §4, that
work is explicitly out of scope until separately authorized. Where item 12 below discusses
"what would need solving" for a MongoDB implementation, it names the problem class only
(e.g. "application-level multi-query merge") and stops short of picking a mechanism, a
document shape, or a library.

This document also does **not** close **OI-6** (fresh production Laravel source export). OI-6
concerns drift in application *logic* between the local source and what is actually running in
production today; this document catalogues the *data layer* of the local source, which is a
different concern entirely, per the owner's explicit instruction. OI-6 remains open. OI-1a/OI-1b
(buyer/admin credentials) are untouched and irrelevant to this task.

---

## 1. Complete table inventory (34 tables) — columns, types, bucket

All 34 tables confirmed present via `grep -c "^CREATE TABLE" Database/db_newhomo.sql` → **34**,
matching blueprint §6.1's count. Column counts below were independently derived by parsing every
`CREATE TABLE` block in the dump (script-verified, not eyeballed), and the total for each table
is stated explicitly so any future re-count is falsifiable against this document.

Bucket classifications (LIVE / BROKEN / DEAD / VESTIGIAL / LIVE-orphan) follow blueprint §0's
four-bucket policy, extended with LIVE-orphan (blueprint's own fifth practical label for "LIVE
but no sidebar/nav link"). Buckets below were cross-checked against actual `DB::table(...)`
call sites in the 7 live controllers (§9 of this document), not merely copied from blueprint.

### 1.1 `users` — 12 columns — LIVE

`Database/db_newhomo.sql:32501-32512`

| Column | Type | Null/Default |
|---|---|---|
| `id` | `int(11)` | NOT NULL, PK |
| `name` | `varchar(255)` | NOT NULL |
| `email` | `varchar(255)` | NOT NULL |
| `mobile` | `varchar(255)` | DEFAULT NULL |
| `email_verified_at` | `timestamp` | NULL DEFAULT NULL |
| `password` | `varchar(255)` | NOT NULL |
| `image` | `varchar(255)` | DEFAULT NULL |
| `utype` | `int(11)` | DEFAULT NULL |
| `status` | `int(11)` | DEFAULT NULL |
| `remember_token` | `varchar(100)` | DEFAULT NULL |
| `created_at` | `timestamp` | NULL DEFAULT current_timestamp() |
| `updated_at` | `timestamp` | NULL DEFAULT current_timestamp() |

ENGINE=InnoDB, CHARSET=utf8mb4/utf8mb4_unicode_ci. 819 rows (AUTO_INCREMENT=821).

### 1.2 `buyer_profile` — 11 columns — LIVE

`Database/db_newhomo.sql:155-166`. `id` is `int(21)` (anomalous width — see §7). `uid`,
`PinCode` also `int(21)`. ENGINE=InnoDB, CHARSET=utf8mb4/utf8mb4_general_ci. 842 rows across 2
INSERT statements (AUTO_INCREMENT=857).

### 1.3 `seller_profile` — 12 columns — VESTIGIAL

`Database/db_newhomo.sql:31575-31587`. `id int(11)`, `uid int(21)`, plus `DisplayName`,
`Signature`, `PermanentAddress`, `StoreAddress`, `AdharCard`, `PanCard`, `GSTNumber`,
`GSTFile` all `varchar(255)`. ENGINE=InnoDB, utf8mb4/utf8mb4_general_ci. 16 rows
(AUTO_INCREMENT=18). Written by `Auth\RegisterController` seller path (DEAD login — no seller
can ever authenticate, per blueprint §5.2); read by `AdminController::ViewSeller` (LIVE-orphan
admin page, no sidebar link). Confirmed via `AdminController.php:961-968`.

### 1.4 `banks` — 8 columns — VESTIGIAL

`Database/db_newhomo.sql:30-39`. Same write/read pattern as `seller_profile` (written at
registration, read only by the orphaned `ViewSeller`). 17 rows (AUTO_INCREMENT=18).

### 1.5 `categories` — 7 columns — LIVE

`Database/db_newhomo.sql:1024-1032`.

| Column | Type | Notes |
|---|---|---|
| `id` | `int(11)` | PK |
| `name` | `varchar(255)` | |
| `image` | `varchar(255)` | |
| `slug` | `varchar(255)` | unsanitized, per P-07 |
| `type` | `enum('N','H')` | NOT NULL, `COMMENT 'N=Normal,H=harbels'` (sic) |
| `status` | `tinyint(1)` | |
| `created_at` | `timestamp` | NOT NULL DEFAULT current_timestamp() |

ENGINE=InnoDB, **CHARSET=latin1/latin1_swedish_ci** (one of the latin1-charset tables — see
§8). 23 rows (AUTO_INCREMENT=24).

### 1.6 `products` — 75 columns — LIVE

`Database/db_newhomo.sql:18352-18422`. Full column-by-column detail in §1.6.1 (Blueprint
Correction Notice) and §7 (data-type anomalies) below. ENGINE=InnoDB,
**CHARSET=latin1/latin1_swedish_ci**. 397 rows across 15 INSERT statements
(AUTO_INCREMENT=428).

### 1.7 `product_images` — 5 columns — LIVE

`Database/db_newhomo.sql:26536-26542`. `id`, `p_id` both `int(11)`; `p_image varchar(255)`;
timestamps. ENGINE=InnoDB, **CHARSET=latin1**. 397 rows (1 INSERT statement,
AUTO_INCREMENT=428 — 1:1 with `products` by row count, though not FK-enforced).

### 1.8 `product_category` — 9 columns — LIVE-orphan

`Database/db_newhomo.sql:18853-18863`. `id int(20) UNSIGNED` (anomalous — see §7),
`parent_id int(11)`, `cat_name varchar(255) NOT NULL`, `cat_image`, `cat_level int(11)`,
`cat_slug`, `cat_status int(11)`, timestamps. ENGINE=InnoDB, utf8mb4/utf8mb4_unicode_ci.
675 rows across 2 INSERT statements (AUTO_INCREMENT=689).

### 1.9 `product_review` — 9 columns — LIVE

`Database/db_newhomo.sql:28231-28241`. **0 rows in the dump** (no INSERT statement for this
table at all — see §8.1). ENGINE=InnoDB, **CHARSET=latin1**. `id AUTO_INCREMENT` present with
no explicit `AUTO_INCREMENT=N` value in the dump (defaults to 1), confirming the table is
empty at dump time even though the feature is LIVE (`HomeController::SaveReview`,
`AdminController::ReviewList`/`ReviewUpdate`).

### 1.10 `product_specification` — 6 columns — LIVE-orphan

`Database/db_newhomo.sql:28249-28256`. `p_id int(11) NOT NULL` (only non-nullable non-PK int
in this table). ENGINE=InnoDB, **CHARSET=latin1**. 3,098 rows across 6 INSERT statements
(AUTO_INCREMENT=4057).

### 1.11 `product_features` — 6 columns — VESTIGIAL (read only)

`Database/db_newhomo.sql:19553-19560`. `uid`, `pid` both `int(21)`. ENGINE=InnoDB,
utf8mb4/utf8mb4_general_ci. **6,938 rows across 25 INSERT statements — the largest INSERT
fragmentation in the schema after `enquiries`.** No `AdminController` write call site found
(`SaveProduct`/`UpdateProduct` do not reference `product_features`); read-only status per
blueprint confirmed — no write call site located in any of the 7 live controllers.

### 1.12 `product_variations` — 7 columns — VESTIGIAL

`Database/db_newhomo.sql:31373-31381`. `pid int(21)`. ENGINE=InnoDB,
utf8mb4/utf8mb4_general_ci. 147 rows (AUTO_INCREMENT=149).

### 1.13 `product_pkg` — 6 columns — VESTIGIAL (never touched)

`Database/db_newhomo.sql:26953-26960`. `id int(21)`, `pid int(21)`. ENGINE=InnoDB,
utf8mb4/utf8mb4_general_ci. 1,256 rows across 2 INSERT statements (AUTO_INCREMENT=2918). No
`DB::table('product_pkg')` call site in any of the 7 live controllers — confirmed VESTIGIAL,
not merely under-used.

### 1.14 `variation` — 6 columns — VESTIGIAL

`Database/db_newhomo.sql:33350-33357`. `id int(11)`. ENGINE=InnoDB,
utf8mb4/utf8mb4_general_ci. **0 rows** (no INSERT statement).

### 1.15 `tbl_post` — 10 columns — LIVE

`Database/db_newhomo.sql:32035-32046`. `p_id` is `varchar(400)` — **not an integer**, despite
the name suggesting a foreign key; `post_homeopathy`, `post_diseases` both `int(11)`.
**ENGINE=MyISAM**, CHARSET=latin1/latin1_swedish_ci. 414 rows across 28 INSERT statements
(AUTO_INCREMENT=535).

### 1.16 `tbl_homeopathy` — 6 columns — LIVE (read) / VESTIGIAL (write)

`Database/db_newhomo.sql:31864-31871`. **ENGINE=MyISAM**, CHARSET=latin1. 150 rows
(AUTO_INCREMENT=152).

### 1.17 `tbl_appointment` — 9 columns — LIVE

`Database/db_newhomo.sql:31807-31817`. `age int(255)` (unusual display width for a plain
counter column, though harmless — `int` widths beyond 11 do not change storage or value
range, only zero-fill display, which this schema never enables). ENGINE=InnoDB,
utf8mb4/utf8mb4_general_ci. 33 rows (AUTO_INCREMENT=34).

### 1.18 `enquiries` — 8 columns — LIVE

`Database/db_newhomo.sql:1094-1103`. `mobile varchar(255)` exists but is always NULL (P-01 —
`saveEnq` never writes it). **CHARSET=latin1.** **16,386 rows across 332 separate INSERT
statements** (AUTO_INCREMENT=16388) — see §8.1 for the spam-bot finding.

### 1.19 `orders` — 18 columns — LIVE

`Database/db_newhomo.sql:17912-17931`. Full detail in §1.19.1 below (column-name mismatch
finding). `CustId`, `SellerId`, `GroupId`, `ProductId`, `quantity`, `DeliveryPrice`,
`TotalPrice`, `OrderStatus` all `int(21)`; `SellPrice` is `varchar(255)` (a price stored as
text, not numeric — an existing data-integrity quirk, preserved per contract, not fixed).
`qr_transection_id varchar(400) NOT NULL` with **no default**, meaning any insert omitting it
fails unless the query builder supplies an explicit value (all live write call sites do).
ENGINE=InnoDB, utf8mb4/utf8mb4_general_ci. 20 rows (AUTO_INCREMENT=21).

#### 1.19.1 `orders.pid`/`orders.cust_id` do not exist — confirms B-12 and a second, related finding

Blueprint's B-12 (`Database/db_newhomo.sql` cross-referenced against
`BuyerController.php:88`) states buyer `/view-order/{orderId}` joins `orders.pid`, a column
that does not exist. **Confirmed**: `orders`' 18 columns (above) contain no `pid`. Separately,
the DEAD/LIVE-orphan legacy route `#47` (`HomeController::SuccessOrder`,
`HomeController.php:543,557`) writes and joins on `orders.cust_id`, `orders.seller_id`,
`orders.bid`, `orders.amount`, `orders.order_notes` — **none of which exist either** (the live
table has `CustId`, `SellerId`, `GroupId`, `TotalPrice`, `OrderNotes` in PascalCase/camelCase,
not the lowercase/snake_case names this method uses). This is the same class of defect as B-09
(`pin_codes` column mismatch) but on a route blueprint already classifies as LIVE-orphan/DEAD
(§3.1 route #47, §6.1 table 22 `baskets`/23 `sellerpayment` VESTIGIAL) — not a new BROKEN item,
since the route is not reachable through any live navigation path per blueprint, but recorded
here as supporting schema evidence for that classification. **No reclassification proposed.**

### 1.20 `orderproducts` — 16 columns — LIVE

`Database/db_newhomo.sql:17859-17875`. `DelaveryDate`, `DelaveryBy` (sic, both misspelled in
the live schema — preserve exactly, not a transcription error in this document).
ENGINE=InnoDB, utf8mb4/utf8mb4_general_ci. 22 rows (AUTO_INCREMENT=23).

### 1.21 `payments` — 18 columns — LIVE

`Database/db_newhomo.sql:18274-18292`. `gid`, `cid`, `sid`, `amount`, `payStatus`,
`orderStatus`, `AdminFee`, `SellerPay`, `discount` all `int(21)`. ENGINE=InnoDB,
utf8mb4/utf8mb4_general_ci. 21 rows (AUTO_INCREMENT=22).

### 1.22 `baskets` — 16 columns — VESTIGIAL

`Database/db_newhomo.sql:70-86`. Written only by the DEAD `SuccessOrder` path
(`HomeController.php:540`). Column names (`custId`, `sellerId`, `pid` — camelCase) again do
not match `orders`' PascalCase columns, consistent with §1.19.1. 3 rows (AUTO_INCREMENT=4).

### 1.23 `sellerpayment` — 15 columns — VESTIGIAL

`Database/db_newhomo.sql:31542-31557`. `amount`, `fee`, `tax`, `discount`, `payable`,
`payStatus` all `varchar(255)` — **monetary values stored as text**, not numeric, in this
table specifically (contrast with `payments.AdminFee`/`SellerPay` which are `int(21)`).
Written only by DEAD `SuccessOrder`. 3 rows (AUTO_INCREMENT=4).

### 1.24 `order_fullfill` — 6 columns — VESTIGIAL

`Database/db_newhomo.sql:17965-17972`. **ENGINE=MyISAM.** `uid`, `pid`, `status` all
`int(21) NOT NULL` — the only table besides `products` where multiple non-PK columns are the
anomalous `int(21)` width and simultaneously `NOT NULL` (most `int(21)` columns elsewhere are
nullable). **No `DB::table('order_fullfill')` call site exists in any of the 7 live
controllers** — confirmed genuinely unreferenced, not merely under-used, matching blueprint's
classification. 276 rows (AUTO_INCREMENT=277) — populated historically (likely by a since-removed
feature or a one-time import) despite zero current code path writing or reading it.

### 1.25 `blogs` — 10 columns — LIVE-orphan

`Database/db_newhomo.sql:104-115`. `id int(10) UNSIGNED` (anomalous — see §7). ENGINE=InnoDB,
utf8mb4/utf8mb4_unicode_ci. 4 rows (AUTO_INCREMENT=5).

### 1.26 `blog_category` — 6 columns — LIVE-orphan

`Database/db_newhomo.sql:133-140`. `id int(20) UNSIGNED`. ENGINE=InnoDB,
utf8mb4/utf8mb4_unicode_ci. 1 row (AUTO_INCREMENT=2).

### 1.27 `slider` — 7 columns — VESTIGIAL (homepage banners hardcoded)

`Database/db_newhomo.sql:31708-31716`. `id bigint(20) UNSIGNED` — the widest PK type in the
schema. `slider_title`, `slider_subtitle`, `slider_image varchar(255) NOT NULL` (no default —
all three required on every insert), `slider_status int(11) NOT NULL`. **0 rows** (no INSERT
statement) — confirming blueprint's note that this admin-maintained table is entirely unused
by the live homepage, and additionally empty of data at dump time.

### 1.28 `pin_codes` — 8 columns — BROKEN (confirms B-09)

`Database/db_newhomo.sql:18328-18337`. `id bigint(20) UNSIGNED`. `status varchar(255)` —
**a status flag stored as free text**, not an int/enum/tinyint as every other `status` column
in this schema is. Live columns: `id`, `uid`, `country`, `pincode`, `location`, `status`,
`created_at`, `updated_at`. **Confirms B-09/R-9 exactly**: the migration file
(no authority, contract §11.1) describes `pin_code`/`pin_address`; the admin controller's
pincode CRUD (`AddPinCode`/`SavePincode`/`UpdatePincode`) writes columns that do not match
`pincode`/`location` in the live table, producing a SQL error on every save, per blueprint's
existing B-09 characterization. 1 row (AUTO_INCREMENT=3).

### 1.29 `statezones` — 6 columns — LIVE

`Database/db_newhomo.sql:31724-31731`. `CountryId int(21)`. ENGINE=InnoDB,
utf8mb4/utf8mb4_general_ci. 36 rows (AUTO_INCREMENT=37).

### 1.30 `cities` — 7 columns — LIVE-orphan

`Database/db_newhomo.sql:1069-1077`. `ZoneId int(21)`, `PinCode int(11)`. 3 rows
(AUTO_INCREMENT=4).

### 1.31 `shipping` — 8 columns — VESTIGIAL (query commented out, confirms P-09)

`Database/db_newhomo.sql:31618-31627`. `SellerId int(11)`, `amount int(11)`. Confirmed via
`CartController.php:380` — the `shipping` lookup is a commented-out line
(`// $DeliveryAmount=DB::table('shipping')->where(...)`), no other live call site references
this table for reads; `AdminController` has no CRUD for it either (no route in blueprint §3.3
targets `shipping`), so the table is populated by SQL import/seed only, never by any live
admin form. 67 rows (AUTO_INCREMENT=68) despite having no live write path — **evidence the
data predates the current controller code**, not evidence of an active feature.

### 1.32 `statuscode` — 5 columns — VESTIGIAL

`Database/db_newhomo.sql:31781-31787`. `statusName`, `statusValue` both `varchar(255)`. No
`DB::table('statuscode')` call site in any of the 7 live controllers. 6 rows
(AUTO_INCREMENT=7).

### 1.33 `password_resets` — 3 columns — VESTIGIAL (custom flow bypasses it)

`Database/db_newhomo.sql:18262-18266`. See §3 below for the primary-key finding. **0 rows**
(no INSERT statement, and no `AUTO_INCREMENT` block at all in the ALTER section — see §3).

### 1.34 `migrations` — 3 columns — Infrastructure (Laravel bookkeeping)

`Database/db_newhomo.sql:17834-17839`. `id int(10) UNSIGNED`, `migration varchar(255) NOT NULL`,
`batch int(11) NOT NULL`. 7 rows (AUTO_INCREMENT not explicitly set in the dump's ALTER
section for this table — confirmed by inspection, matches blueprint's note that only 7 of 34
tables have a corresponding migration file).

---

### 1.6.1 Blueprint Correction Notice — BCN-DB-01: `products` has 75 columns, not 83

**Blueprint states (§6.1, table row 6; §6.2 heading):** "`products` — 83 columns" / "the
83-column table".

**Source shows (`Database/db_newhomo.sql:18352-18422`):** the `products` `CREATE TABLE`
statement contains exactly **75** column definitions, independently verified by two methods:
(1) counting every line beginning with `` ` `` inside the `CREATE TABLE` block via a small
parsing script against the raw dump, and (2) manual enumeration of the printed column list in
§1.6 above. Both counts agree at 75.

Per contract §12.2, this is a blueprint error, not a source ambiguity: on "what the code
[schema] actually does," the source governs. Resolution:

1. **Implemented to match source**: this document and any future work uses **75** as the
   authoritative column count for `products`.
2. **Blueprint Correction Notice raised**: recorded here; blueprint §6.1/§6.2 should be
   amended from "83 columns"/"83-column table" to "75 columns"/"75-column table" in a future
   blueprint revision pass. The 10-inline-variant-slot structure itself (slots 1–10 for
   name/mrp/price/desc/image) is otherwise accurately described by blueprint §6.2 and is
   unaffected by this correction — F-20's prohibition on normalizing this table applies
   identically at 75 columns as it would at 83.
3. **Impact on prior milestones**: none identified. No milestone gate report prior to this one
   references a column-count-dependent implementation decision for `products` (M0–M2 are
   pre-M3 and did not build product-detail UI or forms).

This independently reproduces the same 75-column finding the task description states was
"already found this session" — recorded here as an independent verification, not a
re-derivation from the same claim.

---

## 2. Relationships — verification and extension of blueprint §6.3

Blueprint §6.3's by-convention relationship map (no FK constraints anywhere — confirmed, §4
below) was checked against every `->join(...)` call site found in the 7 live controllers (full
catalogue in §11) plus every `uid`/`_id`/`Id`-suffixed column in the 34 `CREATE TABLE`
statements. Blueprint's map is **substantially accurate**. Extensions/verifications below.

```
users.id ──1:1──→ buyer_profile.uid          confirmed: BuyerController.php:43, AdminController.php:995
users.id ──1:1──→ seller_profile.uid         confirmed: AdminController.php:963 (vestigial — orphan page)
users.id ──1:1──→ banks.uid                  confirmed: AdminController.php:964 (vestigial — orphan page)
users.id ──1:N──→ orders.CustId              confirmed: HomeController.php saveOrder/redirectToPaymentMethod inserts
users.id ──1:N──→ orderproducts.BuyerId       confirmed: BuyerController.php:74-78, AdminController.php:1341-1342
users.id ──1:N──→ orderproducts.SellerId      confirmed: AdminController.php:1327 (SellerOrders)
users.id ──1:N──→ payments.cid / .sid         confirmed: AdminController.php:1364/1397/1418 (join on payments.sid)

categories.id ──1:N──→ products.p_cat         disease/herb reading — confirmed HomeController.php:214 (hardcoded '24')
categories.id ──1:N──→ tbl_post.post_diseases confirmed via blueprint §7.10 disease-detail count query
product_category.id ──1:N──→ products.p_cat/.p_subcat/.p_ocat   marketplace reading — confirmed
    HomeController.php:137-168 (GetCatProducts/GetAllProducts resolve cat_slug → product_category.id
    → products.p_cat / products.p_ocat, two different columns per method)
product_category.parent_id ──→ product_category.id   self-referential — confirmed HomeController.php:190-193
    (SubCategory resolves cat_slug then queries product_category WHERE parent_id = that id)

products.id ──1:N──→ product_images.p_id      confirmed: HomeController.php:142, AdminController.php:651, etc.
products.id ──1:N──→ product_review.p_id      confirmed: AdminController.php:1298 (join)
products.id ──1:N──→ product_specification.p_id  confirmed via AdminController SaveProductSpecif (no join;
    written/read by p_id equality filter only)
products.id ──1:N──→ product_features.pid / product_variations.pid / product_pkg.pid  READ-ONLY convention;
    no controller write call site for product_pkg found (§1.13)
products.id ──1:N──→ orderproducts.ProductId   confirmed: BuyerController.php:75, AdminController.php:1315/1326/1340
products.id ──1:N──→ payments.pid              confirmed: AdminController.php:1363/1396/1417

orders.GroupId ←──N:N──→ orderproducts.GroupId  ★ confirmed the true order-linkage key —
    BuyerController.php:76 (`->join('orders','orders.GroupId','orderproducts.GroupId')`);
    also used, not joined, in BuyerController.php:97-98 and AdminController.php:1353-1355
    (cancel-order updates keyed by GroupId across three tables without a join)
payments.gid ──→ GroupId    confirmed: BuyerController.php:99, AdminController.php:1355 (both filter
    payments by 'gid' after resolving GroupId from an encrypted request parameter — no join used
    for the payments leg of cancel-order, a plain WHERE instead)

blog_category.id ──1:N──→ blogs.blog_catid    by convention only; no join call site exists — both
    blog CRUD paths are LIVE-orphan and query blog_catid without ever joining to blog_category
statezones.id ──1:N──→ cities.ZoneId          confirmed: AdminController.php:1510 (CityList join)
tbl_homeopathy.id ──1:N──→ tbl_post.post_homeopathy   confirmed: AdminController.php:787
    (`EditPost`, a **`->leftJoin(...)`**, not an inner join — the only `leftJoin` call site
    found anywhere in the 7 live controllers; see §11.1 note on join-variant coverage)
```

**Extension beyond blueprint §6.3 — the DEAD/LIVE-orphan `SuccessOrder` shadow schema:**
blueprint §6.3 does not separately diagram the `SuccessOrder` path's own (non-matching)
relationship convention — `baskets.custId`/`.sellerId`/`.pid`, `orders.cust_id`/`.seller_id`
(camelCase/snake_case, and non-existent per §1.19.1), `sellerpayment.uid`/`.bid`. This is
recorded here as an extension because it is a **second, parallel, inconsistent naming
convention** coexisting with the primary PascalCase one (`CustId`, `SellerId`, `GroupId`) used
by every live order-placement path. Both conventions are preserved verbatim per contract NN-6;
neither is normalized here or proposed for normalization later.

---

## 3. Primary keys — verified

Confirmed directly from the dump's `-- Indexes for dumped tables` section
(`Database/db_newhomo.sql:33360-33566`):

- **33 of 34 tables** have exactly one `ALTER TABLE `table` ADD PRIMARY KEY (`id`);` statement,
  each naming only the `id` column as the sole primary key. No composite primary keys exist
  anywhere in the schema.
- **`password_resets` has no `ADD PRIMARY KEY` statement at all.** Its only index-related
  statement is `ALTER TABLE `password_resets` ADD KEY `password_resets_email_index`
  (`email`(191));` (`Database/db_newhomo.sql:33436-33439`) — a **plain, non-unique** key, not a
  primary key and not a unique key.
- **Stronger finding than "no PK":** `password_resets`' `CREATE TABLE` statement
  (`Database/db_newhomo.sql:18262-18266`) shows the table has **no `id` column at all** —
  only `email varchar(255) NOT NULL`, `token varchar(255) NOT NULL`,
  `created_at timestamp NULL DEFAULT NULL`. This matches stock Laravel 5.8's default
  `password_resets` migration shape exactly (Laravel's own migration for this table has never
  included an `id` column in any 5.x release) and confirms the table was created by the
  framework's stock migration, never hand-modified, and — consistent with blueprint §5.6/§6.1 —
  never actually used by the live (custom, `encrypt($email)`-based) password-reset flow.
- The `-- AUTO_INCREMENT for dumped tables` section (`Database/db_newhomo.sql:33568` onward)
  contains **no entry for `password_resets`**, consistent with it having no auto-incrementing
  (or any) `id` column.

**Conclusion:** every one of the other 33 tables has `id` as its sole primary key, exactly as
blueprint states. `password_resets` is confirmed to have neither a primary key nor an `id`
column — a stronger and more precise finding than "no primary key," worth stating explicitly
for anyone modeling this table later.

---

## 4. Foreign keys — zero, confirmed

`grep -n "CONSTRAINT\|FOREIGN KEY" Database/db_newhomo.sql` returns **no matches** anywhere in
the 33,760-line dump. There is no `CONSTRAINT` clause and no `FOREIGN KEY` clause in any
`CREATE TABLE` or `ALTER TABLE` statement in the entire schema.

This is a genuine, confirmed finding, not an omission from this analysis: **all 34 tables'
relationships (§2 above) are enforced exclusively in application code, at the level of
individual controller methods choosing to `WHERE`-filter or `->join(...)` on convention-named
columns.** MariaDB itself would allow an `orderproducts.ProductId` value with no matching
`products.id` row, a `buyer_profile.uid` with no matching `users.id` row, and so on — nothing
in the database schema prevents it. This is consistent with contract F-21 (forbidding the
*addition* of FK constraints in the Next.js migration) and directly relevant to item 12 below:
a MongoDB target has no native FK mechanism either, but the *absence* of referential integrity
enforcement here means the source system was never relying on database-level cascade/restrict
behavior in the first place — there is no FK *behavior* to reproduce, only the *absence* of one,
which is easy to preserve in any target.

---

## 5. Indexes — exactly one non-PK index, confirmed

The dump's indexes section (`Database/db_newhomo.sql:33360-33566`) contains exactly 34
`ALTER TABLE` blocks: 33 are `ADD PRIMARY KEY (`id`)` and exactly **one** is a non-primary
index — `password_resets_email_index` on `password_resets.email` (with a 191-character prefix
length, `email`(191), the standard MySQL/MariaDB workaround for indexing `utf8mb4` columns
under the historical 767-byte `InnoDB` index-key limit).

**No other index of any kind** — not on `products.p_slug`, `products.p_cat`, `products.p_status`,
`categories.slug`, `orderproducts.GroupId`, `orderproducts.BuyerId`, `payments.gid`,
`tbl_post.post_diseases`, or `users.email` — exists anywhere in the schema, confirming
blueprint §6.4's list of high-frequency unindexed lookup columns. Every one of those columns is
used in a `WHERE` or `->join(...)` clause in the controllers reviewed for this document (§2,
§11), meaning every one of those queries currently performs a full table scan in production.

---

## 6. Important constraints — catalogued per table (not exhaustive)

Per-table `NOT NULL` columns beyond the primary key, `DEFAULT` values worth flagging, and the
schema's one `ENUM`:

| Table | Notable constraint |
|---|---|
| `categories` | `type enum('N','H') NOT NULL COMMENT 'N=Normal,H=harbels'` — the schema's **only** ENUM column; comment text preserved verbatim including its own typo ("harbels") |
| `products` | `p_heading varchar(400) NOT NULL` — the only NOT NULL column besides `id`/timestamps in a 75-column table; every other business column (`p_name`, `p_cat`, `p_price`, all 10 variant slots) is nullable, meaning a product can be saved with a heading and nothing else |
| `orders` | `qr_transection_id varchar(400) NOT NULL` with **no DEFAULT** — any insert omitting this column fails at the database level; every live insert path supplies it (verified `HomeController.php:773`, `823` region) |
| `orderproducts` | no NOT NULL beyond `id` — every business column, including `GroupId` and `BuyerId` (the join keys), is nullable at the schema level; integrity here is 100% application-enforced |
| `product_specification` | `p_id int(11) NOT NULL` — the only FK-by-convention column in the schema that is itself non-nullable, though still unconstrained (no FK, §4) |
| `slider` | `slider_title`, `slider_subtitle`, `slider_image varchar(255) NOT NULL`, `slider_status int(11) NOT NULL` — all four required, no DEFAULT, yet the table is empty (0 rows, §1.27) — these constraints have never actually been exercised against real data |
| `blog_category`/`product_category` | `cat_name`/`bcat_name`... only `product_category.cat_name varchar(255) NOT NULL` is required; `blog_category.bcat_name` is nullable (asymmetric even though both are "category name" columns) |
| `password_resets` | `email`, `token` both `varchar(255) NOT NULL`; `created_at` explicitly `NULL DEFAULT NULL` — Laravel's stock migration shape (§3) |
| Most `created_at`/`updated_at` pairs | `DEFAULT current_timestamp()` on both — a small number of tables (`categories`, `tbl_homeopathy`) only default `created_at` and have no `updated_at` column at all |
| `pin_codes.status` | `varchar(255)`, no ENUM/tinyint constraint despite every other table's `status` column being numeric — free-text status flag, see §7 |

---

## 7. Data types — anomalies flagged, not normalized

Per-column types for every table are recorded in §1 above (from direct `CREATE TABLE` parsing).
This section collects the anomalies the task specifically asked to be surfaced, with their
**actual declared widths preserved as-is** — none of the following is "corrected" to `int(11)`
in this document or implied to need correction in any future target.

### 7.1 The `int(21)` anomaly — far more widespread than just `products`

Confirmed via the same parsing script used for §1: **every one of the following columns is
declared `int(21)`**, against the schema's dominant convention of `int(11)`:

- `products`: `p_ocat`, `ptype`, `p_top`, `p_trending`, `p_featured`, `uid`, `reffNo` (7 columns)
- `buyer_profile`: `id`, `uid`, `PinCode` (3 columns — note `id` itself, the primary key, is
  `int(21)` here, not `int(11)`)
- `seller_profile`, `banks`, `product_features`, `product_variations`: `uid`/`pid` columns
- `orders`: `CustId`, `SellerId`, `GroupId`, `ProductId`, `quantity`, `DeliveryPrice`,
  `TotalPrice`, `OrderStatus` (8 of 18 columns)
- `payments`: `gid`, `cid`, `sid`, `amount`, `payStatus`, `orderStatus`, `AdminFee`,
  `SellerPay`, `discount` (9 of 18 columns)
- `baskets`, `sellerpayment`, `order_fullfill`, `statezones.CountryId`, `cities.ZoneId`,
  `pin_codes.uid`, `shipping` (none), `product_pkg.id`

`int(21)` and `int(11)` occupy identical storage (4 bytes) and have identical value range; the
digit count is purely MySQL/MariaDB's now-deprecated **display width** (irrelevant unless
`ZEROFILL` is set, which no column here uses). This is cosmetic at the SQL level but is flagged
per the task's explicit instruction because it is evidence the schema was edited by hand,
inconsistently, over time (consistent with blueprint's note that 27 of 34 tables were created
outside the migration system) — not because the width itself has behavioral consequence.

### 7.2 Other declared-width anomalies

- **`id` primary key width varies by table**: `int(11)` (most tables), `int(20) UNSIGNED`
  (`product_category`, `blog_category`, `blogs`), `int(21)` (`buyer_profile`, `product_pkg`),
  `bigint(20) UNSIGNED` (`slider`, `pin_codes`), `int(10) UNSIGNED` (`migrations`). No two
  of these five width/signedness combinations are interchangeable at the byte level
  (`bigint` is 8 bytes vs `int`'s 4), though none currently holds more than a few hundred to a
  few thousand rows (§8), so the anomaly has no present practical consequence — only historical
  significance for understanding how the schema was assembled.
- **Monetary/quantity values stored as `varchar`, not numeric**: `orders.SellPrice varchar(255)`,
  `baskets.sellPrice varchar(255)`, `sellerpayment.amount`/`.fee`/`.tax`/`.discount`/`.payable`/
  `.payStatus` all `varchar(255)`, `product_pkg.package_price varchar(255)`. Contrast with
  `payments.AdminFee`/`payments.SellerPay`, which are numeric (`int(21)`) — the same logical
  quantity (money) is typed inconsistently even within the order-adjacent table group.
- **`pin_codes.status varchar(255)`** — every other `status`/`*_status` column in the schema
  (`users.status`, `categories.status`, `products.p_status`, `orderproducts.OrderStatus`,
  `orders.OrderStatus`, `payments.payStatus`, `tbl_post.post_status`, `blogs.blog_status`,
  `cities.status`, `statezones.status`) is `int` or `tinyint`. `pin_codes.status` alone is
  free text.
- **`tbl_post.p_id varchar(400)`** — despite the name implying an integer product-id foreign
  key, this column is text, width 400. (`post_homeopathy`/`post_diseases`, the columns that
  actually carry the disease/homeopathy-category relationship per §2, are separately typed
  `int(11)`.)
- **`tbl_appointment.age int(255)`** — an unusually wide declared width for what is functionally
  a two-digit human age; harmless (display-width-only, as with `int(21)` above) but noted per
  the task's instruction to flag width anomalies rather than silently normalize them.

**None of the above is proposed for correction.** They are catalogued as-is, per contract
NN-6/F-13, as data the eventual MongoDB field types must be capable of representing exactly
(e.g. a value currently stored as MySQL `varchar` text must not be silently coerced to a
MongoDB numeric type merely because it "looks like a number" — that would be exactly the kind
of behavior change D-11 §5 forbids without documented justification).

---

## 8. Existing records/counts — row counts, engines, charsets

Row counts below were computed by parsing every `INSERT INTO `table` (...) VALUES ...;`
statement in the dump with a quote-aware parenthesis-depth counter (not a naive `grep -c`,
which would undercount multi-row `INSERT` statements and miscount on text fields containing
literal parentheses). The parser's total INSERT-statement count (437) was cross-checked against
`grep -c "^INSERT INTO"` (437) and matched exactly, confirming no statements were missed or
double-counted.

| Table | INSERT statements | Rows | AUTO_INCREMENT next value | ENGINE | CHARSET |
|---|---:|---:|---:|---|---|
| `banks` | 1 | 17 | 18 | InnoDB | utf8mb4/general_ci |
| `baskets` | 1 | 3 | 4 | InnoDB | utf8mb4/general_ci |
| `blogs` | 1 | 4 | 5 | InnoDB | utf8mb4/unicode_ci |
| `blog_category` | 1 | 1 | 2 | InnoDB | utf8mb4/unicode_ci |
| `buyer_profile` | 2 | 842 | 857 | InnoDB | utf8mb4/general_ci |
| `categories` | 1 | 23 | 24 | InnoDB | **latin1**/swedish_ci |
| `cities` | 1 | 3 | 4 | InnoDB | utf8mb4/general_ci |
| `enquiries` | **332** | **16,386** | 16,388 | InnoDB | **latin1**/swedish_ci |
| `migrations` | 1 | 7 | (n/a) | InnoDB | utf8mb4/unicode_ci |
| `orderproducts` | 1 | 22 | 23 | InnoDB | utf8mb4/general_ci |
| `orders` | 1 | 20 | 21 | InnoDB | utf8mb4/general_ci |
| `order_fullfill` | 1 | 276 | 277 | **MyISAM** | **latin1**/swedish_ci |
| `password_resets` | 0 | 0 | (no id column) | InnoDB | utf8mb4/unicode_ci |
| `payments` | 1 | 21 | 22 | InnoDB | utf8mb4/general_ci |
| `pin_codes` | 1 | 1 | 3 | InnoDB | utf8mb4/unicode_ci |
| `products` | 15 | 397 | 428 | InnoDB | **latin1**/swedish_ci |
| `product_category` | 2 | 675 | 689 | InnoDB | utf8mb4/unicode_ci |
| `product_features` | 25 | 6,938 | 7,427 | InnoDB | utf8mb4/general_ci |
| `product_images` | 1 | 397 | 428 | InnoDB | **latin1**/swedish_ci |
| `product_pkg` | 2 | 1,256 | 2,918 | InnoDB | utf8mb4/general_ci |
| `product_review` | 0 | 0 | 1 (default) | InnoDB | **latin1**/swedish_ci |
| `product_specification` | 6 | 3,098 | 4,057 | InnoDB | **latin1**/swedish_ci |
| `product_variations` | 1 | 147 | 149 | InnoDB | utf8mb4/general_ci |
| `sellerpayment` | 1 | 3 | 4 | InnoDB | utf8mb4/general_ci |
| `seller_profile` | 1 | 16 | 18 | InnoDB | utf8mb4/general_ci |
| `shipping` | 1 | 67 | 68 | InnoDB | utf8mb4/general_ci |
| `slider` | 0 | 0 | (n/a — no AUTO_INCREMENT block) | InnoDB | utf8mb4/unicode_ci |
| `statezones` | 1 | 36 | 37 | InnoDB | utf8mb4/general_ci |
| `statuscode` | 1 | 6 | 7 | InnoDB | utf8mb4/general_ci |
| `tbl_appointment` | 1 | 33 | 34 | InnoDB | utf8mb4/general_ci |
| `tbl_homeopathy` | 1 | 150 | 152 | **MyISAM** | **latin1**/swedish_ci |
| `tbl_post` | 28 | 414 | 535 | **MyISAM** | **latin1**/swedish_ci |
| `users` | 4 | 819 | 821 | InnoDB | utf8mb4/unicode_ci |
| `variation` | 0 | 0 | (n/a — no AUTO_INCREMENT block) | InnoDB | utf8mb4/general_ci |
| **TOTAL** | **437** | **32,078** | — | — | — |

### 8.1 `enquiries` — 332 INSERT statements, 16,386 rows, mostly spam

Confirmed exactly as the task description states: `enquiries` has by far the most fragmented
INSERT history of any table (332 separate statements vs. the next-highest non-trivial table,
`tbl_post` at 28). A phpMyAdmin dump typically batches many rows per INSERT statement when
export settings allow it (as seen with `product_features`' 6,938 rows in only 25 statements,
~277 rows/statement); `enquiries` averaging **49.4 rows per statement** is consistent with the
dump tool batching by a row-count or byte-size limit, not with 332 genuinely separate
submission events — the fragmentation itself is a dump-export artifact, not evidence of import
history. Spot-checking is not possible without reading full row content (out of scope for a
schema-level analysis and not attempted here), but the row **volume** itself (16,386 rows
against `tbl_appointment`'s 33 and `product_review`'s 0) is already the load-bearing evidence:
a public, unauthenticated, `POST /save-enquiry` endpoint with only `name`/`email`/`subject`
required and no CAPTCHA, rate limiting, or spam filtering of any kind (confirmed — blueprint
§7.9 lists no validation rule stronger than "required" for this form, and no rate-limiting
middleware is applied to `/save-enquiry` per blueprint §5.7's middleware table) is exactly the
shape of endpoint that accumulates bot submissions at scale over time. **This matters directly
for MongoDB migration/cleanup planning**: a straight 1:1 row-for-collection-document port of
`enquiries` would carry an estimated large majority-spam dataset into the new system's primary
enquiries collection, with no schema-level way to distinguish real leads from bot noise after
the fact (no `is_spam` column, no source/referrer column, no honeypot field exists in this
table's 8-column schema, per §1.18). This is a data-quality flag for a **later** milestone,
not a decision requested here — no filtering, deletion, or migration of any enquiry row is
proposed or performed by this document.

### 8.2 Engine mix — confirmed, matches task description exactly

**3 of 34 tables use MyISAM; the other 31 use InnoDB.** The three MyISAM tables are exactly
`order_fullfill`, `tbl_homeopathy`, `tbl_post` — confirmed via direct parsing of every
`CREATE TABLE ... ) ENGINE=...` line in the dump, cross-checked against blueprint's claim of
the same three tables. This is a genuine data-integrity-relevant
finding for migration planning: MyISAM has no transaction support and no foreign-key support
(irrelevant here since none exist anyway, §4) but also no crash-safe row-level locking — of the
three, `tbl_post` (414 rows, LIVE, read on every disease-detail page per blueprint §7.10) is the
only one on the customer-facing read path; `tbl_homeopathy` and `order_fullfill` are
lower-traffic/vestigial. Not a blocker for this document; flagged for whoever eventually builds
the MongoDB data-migration script, since a source table type also implies different
row-count-consistency guarantees during any live export.

### 8.3 Charset mix — confirmed, a genuine data-integrity risk

**9 of 34 tables use `latin1`/`latin1_swedish_ci`; the other 25 use `utf8mb4`** (either
`utf8mb4_general_ci` or `utf8mb4_unicode_ci` — a second, independent inconsistency layered on
top of the charset split, since even the utf8mb4 tables don't agree on collation). The 9
latin1 tables, confirmed via a per-table `CREATE TABLE ... CHARSET=...` parse of the full dump:
`categories`, `enquiries`, `order_fullfill`, `products`, `product_images`, `product_review`,
`product_specification`, `tbl_homeopathy`, `tbl_post`. **This is flagged, not silently
normalized, per the task's explicit instruction.**

Practical consequence for any future MongoDB migration: MongoDB stores strings as UTF-8
internally with no per-collection charset option; any latin1-stored byte sequence in these 9
tables that is not valid ASCII (i.e., any non-English character — accented names, curly quotes
pasted from Word, non-Latin script in a review or enquiry message) will need an explicit
latin1→UTF-8 re-encoding step during data export, or it will be corrupted (mojibake) on import.
Whether any such non-ASCII data actually exists in these tables was not checked here (would
require reading full row content, out of scope for a schema-level analysis) — flagged as a
migration-time risk to verify later, not resolved now.

---

## 9. Tables actually used by live functionality — cross-referenced against blueprint §6.5

Blueprint §6.5's PHP-file→table map was checked against direct `DB::table('...')` call-site
extraction from all 5 non-Auth live controllers plus both live `Auth/` controllers (10 total
files scanned; `Auth/ForgotPasswordController.php`, `Auth/ResetPasswordController.php`,
`Auth/VerificationController.php` confirmed to contain **zero** `DB::table` calls, consistent
with blueprint's classification of two of the three as DEAD/unrouted and the third
(`ForgotPasswordController`) as BROKEN/unrouted — the live reset flow instead lives in
`HomeController`, already covered).

| Controller | Tables referenced via live `DB::table(...)` (commented-out calls excluded per contract §12.4) |
|---|---|
| `HomeController.php` | `baskets`, `blogs`, `buyer_profile`, `categories`, `enquiries`, `orderproducts`, `orders`, `payments`, `product_category`, `product_images`, `product_review`, `products`, `sellerpayment`, `statezones`, `tbl_appointment`, `tbl_homeopathy`, `tbl_post`, `users` (18 tables) |
| `AdminController.php` | `banks`, `blog_category`, `blogs`, `buyer_profile`, `categories`, `cities`, `enquiries`, `orderproducts`, `orders`, `payments`, `pin_codes`, `product_category`, `product_features`, `product_images`, `product_review`, `product_specification`, `product_variations`, `products`, `seller_profile`, `slider`, `statezones`, `tbl_appointment`, `tbl_homeopathy`, `tbl_post`, `users` (25 tables — the one `DB::table('post')` reference at `AdminController.php:829` is commented out and excluded per contract §12.4; `banks` and `tbl_homeopathy` are reached only via `->join(...)`/`->leftJoin(...)`, never as a query root, and are correctly included here) |
| `CartController.php` | `buyer_profile`, `orders`, `product_category` (3 tables — the `shipping` reference at `CartController.php:380` is commented out and excluded) |
| `BuyerController.php` | `buyer_profile`, `orderproducts`, `orders`, `payments`, `products`, `statezones`, `users` (7 tables) |
| `UserController.php` | `users` (1 table) |
| `Auth/LoginController.php` | `users` (1 table, via `Auth::attempt`/direct query) |
| `Auth/RegisterController.php` | `banks`, `buyer_profile`, `seller_profile`, `users` (4 tables) |

**Extraction method:** counted both `DB::table('x')` call sites and tables reached only via
`->join('x', ...)` / `->leftJoin('x', ...)` (a table can appear in a query solely as a join
target, never as the query's root `DB::table(...)` — confirmed for `banks` in
`AdminController::ViewSeller`, `AdminController.php:964`, and `tbl_homeopathy` in
`AdminController::EditPost`, `AdminController.php:787`, a `leftJoin`, §11.1). Commented-out
lines were stripped before matching, per contract §12.4.

**Confirmation of blueprint §6.5:** the union of the above matches blueprint's file→table map
on the "tables read"/"tables written" columns. This document additionally makes blueprint's
`AdminController` "All 34 (broad)" characterization precise: `AdminController.php` references
**25 of the 34 tables**. Across **all 7 live controllers combined, the union is 27 of 34
tables** — the 7 tables referenced by zero controllers are listed and evidenced in §10.

**No table is referenced only by a controller other than the 7 live ones** (i.e., no table's
only real usage is in `AdminController-old-4-1-2023.php` or another DEAD file) — every table
touched by the old backup controller is also touched, identically or near-identically, by the
current `AdminController.php`, consistent with the old file being a superseded copy rather than
a divergent one.

---

## 10. Vestigial tables — explicit list with evidence

A table is classified VESTIGIAL in this document only where direct evidence supports one of:
**(a)** written but never read by any live controller, **(b)** read but never written, or
**(c)** referenced by zero `DB::table(...)` call sites across all 7 live controllers.

| Table | Evidence | Category |
|---|---|---|
| `seller_profile` | Written: `Auth/RegisterController.php` seller path. Read: only `AdminController::ViewSeller` (`AdminController.php:961-968`), an admin route with no sidebar link (blueprint §3.3 #79, LIVE-orphan) reachable only by direct URL, gating a feature (seller accounts) that can never log in (blueprint §5.2) | (a) — write path active, read path exists but is itself orphaned two layers deep |
| `banks` | Same pattern as `seller_profile`, same write/read pair | (a), same as above |
| `product_features` | 6,938 rows present (§8), but **zero write call site** found across all 7 controllers — `SaveProduct`/`UpdateProduct` never reference it | (b) — read-only in code, yet has substantial legacy data |
| `product_variations` | Same pattern — data present, no write call site | (b) |
| `product_pkg` | **Zero call sites of any kind** — neither read nor written by any of the 7 controllers, despite 1,256 rows of legacy data | (c) |
| `baskets` | Written only by DEAD `HomeController::SuccessOrder` (unrouted in any live navigation path — blueprint route #47 LIVE-orphan with column-mismatch defects, §1.19.1); never read by any controller | (a) + effectively (c) for read |
| `sellerpayment` | Same DEAD-write-only pattern as `baskets` | (a) + (c) for read |
| `order_fullfill` | **Zero call sites** despite 276 rows | (c) |
| `statuscode` | **Zero call sites** despite 6 rows (a small lookup table, seemingly intended as a status-code dictionary, never consulted by any query) | (c) |
| `shipping` | Read call site exists but is commented out (`CartController.php:380`, confirms P-09); no admin CRUD route targets this table either | (b) — write path (admin) also does not exist as a route, only as pre-existing seed data (67 rows) |
| `slider` | Has full CRUD in `AdminController` (write path active, LIVE-orphan admin pages) but **zero rows** and, per blueprint, never read by the homepage template (which hardcodes its banner images) | (b) — write path active, read path absent entirely, table is also empty |
| `variation` | **Zero call sites**, zero rows | (c), doubly vestigial |
| `password_resets` | Zero call sites (the live reset flow is entirely custom, per blueprint §5.6, and never touches this table); zero rows; no `id` column at all (§3) | (c) |
| `migrations` | Not application data — Laravel framework bookkeeping only, out of scope for "vestigial" classification but noted for completeness | infrastructure, not vestigial |

**The precise set of tables with zero live (non-commented) references — as either a
`DB::table('x')` root or a `->join('x', ...)`/`->leftJoin('x', ...)` target — across all 7 live
controllers** (category (c) above, the strictest vestigial evidence, script-verified by
scanning every one of the 34 table names against all 7 controller files with commented lines
stripped first): **7 tables** — `migrations`, `order_fullfill`, `password_resets`,
`product_pkg`, `shipping`, `statuscode`, `variation`. Of these, `migrations` is Laravel
framework bookkeeping, not application data, and is excluded from the VESTIGIAL classification
per the table above (row: infrastructure); `shipping` has exactly one reference anywhere in the
7 controllers and it is commented out (`CartController.php:380`), which is why it also shows
zero *live* references despite not being a table the codebase is entirely silent about. The
other 5 — `order_fullfill`, `password_resets`, `product_pkg`, `statuscode`, `variation` — have
**no reference of any kind, commented or otherwise**, anywhere in the 7 live controllers.

---

## 11. Laravel queries that depend on relational behavior

### 11.1 Join call-site catalogue

**37 join call sites** (36 `->join(...)` + 1 `->leftJoin(...)`) across the 6 controller files
the owner named (`AdminController.php`, `HomeController.php`, `BuyerController.php`,
`CartController.php`, `UserController.php`, `Auth/*.php`), counted via `grep -c "->join("` per
file, cross-verified against a full read of every matching line, and separately checked for
`->leftJoin(`/`->rightJoin(`/`->crossJoin(`/`->innerJoin(` (found: exactly one `->leftJoin`,
zero of the other three variants):

| File | `->join(` count | Other join-variant count | Total |
|---|---:|---:|---:|
| `AdminController.php` | 21 | 1 (`->leftJoin`, line 787) | 22 |
| `HomeController.php` | 11 | 0 | 11 |
| `BuyerController.php` | 4 | 0 | 4 |
| `CartController.php` | 0 | 0 | 0 |
| `UserController.php` | 0 | 0 | 0 |
| `Auth/LoginController.php`, `Auth/RegisterController.php`, and the 3 other `Auth/*.php` files | 0 | 0 | 0 |
| **Total (6 named files + Auth/)** | **36** | **1** | **37** |

**Note on the "at least 57" figure in the task description:** `AdminController-old-4-1-2023.php`
(explicitly excluded from scope — contract §3.1, blueprint §1.2, "dated backup copy, unrouted")
contains a further **21** `->join(...)` call sites, nearly identical to `AdminController.php`'s
own count, plus its own `getsub-category` region was not separately checked for a matching
`leftJoin` (out of scope, the file is DEAD). **37 (live) + 21 (dead backup file, `->join` only)
≈ 57** (58 if the backup file's own possible `leftJoin` equivalent is included; not verified,
out of scope), which reconciles the task description's figure closely. This document
catalogues only the **37** join sites in the 6 named, in-scope, live controller files below —
the old backup file's ~21 near-duplicate joins are not separately catalogued, consistent with
its DEAD/out-of-scope status per contract §3.1.

Full catalogue, file:line, tables joined, join condition:

| # | File:Line | Tables joined | Condition |
|---|---|---|---|
| 1 | `HomeController.php:142` | `products` ⋈ `product_images` | `product_images.p_id = products.id` |
| 2 | `HomeController.php:160` | `products` ⋈ `product_images` | `product_images.p_id = products.id` |
| 3 | `HomeController.php:183` | `products` ⋈ `product_images` | `products.id = product_images.p_id` |
| 4 | `HomeController.php:243` | `products` ⋈ `product_images` | `product_images.p_id = products.id` |
| 5 | `HomeController.php:401` | `users` ⋈ `buyer_profile` | `users.id = buyer_profile.uid` |
| 6 | `HomeController.php:450` | `users` ⋈ `buyer_profile` | `users.id = buyer_profile.uid` |
| 7 | `HomeController.php:468` | `products` ⋈ `product_images` | `products.id = product_images.p_id` |
| 8 | `HomeController.php:556` | `users` ⋈ `buyer_profile` | `users.id = buyer_profile.uid` |
| 9 | `HomeController.php:557` | (prior) ⋈ `orders` | `users.id = orders.cust_id` — **`orders.cust_id` does not exist** (§1.19.1); this join site is inside the DEAD `SuccessOrder` method |
| 10 | `HomeController.php:558` | (prior) ⋈ `payments` | `users.id = payments.cid` |
| 11 | `HomeController.php:226` (commented out) | — | not counted; excluded per contract §12.4 |
| 12 | `AdminController.php:651` | `products` ⋈ `product_images` | `product_images.p_id = products.id` |
| 13 | `AdminController.php:652` | (prior) ⋈ `users` | `products.uid = users.id` — `products.uid` is always NULL (confirms B-07) |
| 14 | `AdminController.php:664` | `products` ⋈ `product_images` | `product_images.p_id = products.id` |
| 15 | `AdminController.php:665` | (prior) ⋈ `users` | `products.uid = users.id` — same as #13 (confirms B-08) |
| 16 | `AdminController.php:963` | `users` ⋈ `seller_profile` | `users.id = seller_profile.uid` |
| 17 | `AdminController.php:964` | (prior) ⋈ `banks` | `users.id = banks.uid` |
| 18 | `AdminController.php:995` | `users` ⋈ `buyer_profile` | `users.id = buyer_profile.uid` |
| 19 | `AdminController.php:1298` | `product_review` ⋈ `products` | `products.id = product_review.p_id` |
| 20 | `AdminController.php:1315` | `orderproducts` ⋈ `products` | `orderproducts.ProductId = products.id` |
| 21 | `AdminController.php:1326` | `orderproducts` ⋈ `products` | `orderproducts.ProductId = products.id` |
| 22 | `AdminController.php:1327` | (prior) ⋈ `users` | `users.id = orderproducts.SellerId` |
| 23 | `AdminController.php:1340` | `orderproducts` ⋈ `products` | `orderproducts.ProductId = products.id` |
| 24 | `AdminController.php:1341` | (prior) ⋈ `users` | `orderproducts.BuyerId = users.id` |
| 25 | `AdminController.php:1342` | (prior) ⋈ `buyer_profile` | `orderproducts.BuyerId = buyer_profile.uid` |
| 26 | `AdminController.php:1363` | `payments` ⋈ `products` | `products.id = payments.pid` |
| 27 | `AdminController.php:1364` | (prior) ⋈ `users` | `users.id = payments.sid` |
| 28 | `AdminController.php:1396` | `payments` ⋈ `products` | `products.id = payments.pid` |
| 29 | `AdminController.php:1397` | (prior) ⋈ `users` | `users.id = payments.sid` |
| 30 | `AdminController.php:1417` | `payments` ⋈ `products` | `products.id = payments.pid` |
| 31 | `AdminController.php:1418` | (prior) ⋈ `users` | `users.id = payments.sid` |
| 32 | `AdminController.php:1510` | `cities` ⋈ `statezones` | `cities.ZoneId = statezones.id` |
| 33 | `BuyerController.php:43` | `users` ⋈ `buyer_profile` | `users.id = buyer_profile.uid` |
| 34 | `BuyerController.php:75` | `orderproducts` ⋈ `products` | `orderproducts.ProductId = products.id` |
| 35 | `BuyerController.php:76` | (prior) ⋈ `orders` | `orders.GroupId = orderproducts.GroupId` — ★ the true order-linkage join |
| 36 | `BuyerController.php:88` | `orders` ⋈ `products` | `products.id = orders.pid` — **`orders.pid` does not exist** (confirms B-12, §1.19.1) |
| 37 | `AdminController.php:787` | `tbl_post` ⋈ `tbl_homeopathy` | `tbl_post.post_homeopathy = tbl_homeopathy.id` — **`->leftJoin(...)`, the only left-join call site in the schema** (`EditPost`); every other row in this table is an inner `->join(...)` |

(Table numbers above count each pairwise join call, matching the 37 total (36 inner `->join()`
+ 1 `->leftJoin()`); several logical "3-table joins" are two consecutive `->join()` calls
chained onto one query builder, e.g. #16-17 and #26-27/28-29/30-31 are each one query with two
joins, listed as two rows above to keep the file:line citation precise per call.)

### 11.2 `groupBy` call-site catalogue

**6 `->groupBy(...)` call sites** in the 6 live controller files (a `grep -c` pass initially
returns 7 per file totals because it also matches the commented-out line at
`HomeController.php:233`, excluded here per contract §12.4 — commented code carries no
behavioral authority):

| # | File:Line | Grouped column | Non-aggregated columns also selected |
|---|---|---|---|
| 1 | `HomeController.php:146` | `product_images.p_id` | `products.*`, `product_images.*` (`GetCatProducts`) |
| 2 | `HomeController.php:164` | `product_images.p_id` | `products.*`, `product_images.*` (`GetAllProducts`) |
| 3 | `HomeController.php:247` | `product_images.p_id` | `products.*`, `product_images.*` (`TopProducts`) |
| 4 | `HomeController.php:470` | `product_images.p_id` | (no explicit `->select`; defaults to `*` from both tables) (`BuyProduct`) |
| 5 | `AdminController.php:655` | `product_images.p_id` | `products.*`, `product_images.*`, `users.*` (`ActiveProducts`) |
| 6 | `AdminController.php:668` | `product_images.p_id` | `products.*`, `product_images.*`, `users.*` (`InactiveProducts`) |

Every one of these 6 is the same pattern blueprint's D-09/R-16 already documents: selecting
non-aggregated columns (`products.*`, `product_images.*`, sometimes `users.*`) while grouping
only by `product_images.p_id`, which is invalid under MySQL/MariaDB's `ONLY_FULL_GROUP_BY` SQL
mode (enabled by default since MySQL 5.7.5) and only works today because production's
`sql_mode` has that mode disabled — an assumption never actually verified against live
production (OI-2, now DEFERRED/NOT APPLICABLE per the D-11 addenda in `GATE-REPORT-M0.md` and
`GATE-REPORT-M2.md`, since the MongoDB target has no `sql_mode` concept at all). **This finding
remains historically valid and is restated here per the task's explicit instruction**, even
though the specific OI-2 verification action it used to require is no longer applicable to the
new target architecture.

### 11.3 Transactions

**Zero** `DB::transaction(...)`, `DB::beginTransaction()`, `->commit()`, `->rollBack()`, or
row-locking (`lockForUpdate()`/`sharedLock()`) call sites exist anywhere in the 7 live
controllers — confirmed via direct grep across all 7 files plus a full read of every order-
placement code path. This is itself the finding, matching blueprint §7.5/R-6: order-id
generation (`CartController.php:284-285`'s `IncrementId`, `HomeController.php:684-685`'s
`GroupId`, and `HomeController.php:767-768`'s duplicate `GroupId` re-read) is a plain
**read-then-write with no transaction and no lock**, in three separate code paths across two
controllers:

- `CartController::cartList` (`CartController.php:284`): `$IncrementId =
  DB::table('orders')->orderBy('id','DESC')->first()->id + 1;` then
  `$getOrderId = rand(99,9999) . $IncrementId` — session-stored, not yet written to the DB at
  this point.
- `HomeController::saveOrder` (`HomeController.php:684-685`, DEAD — `#checkout-form` selector
  matches nothing per blueprint §9.1): `$GetGId = DB::table('orderproducts')->orderBy('id',
  'DESC')->first(); $GroupId = $GetGId->GroupId + 1;` — read, then several inserts follow with
  no transaction wrapping them.
- `HomeController::redirectToPaymentMethod` (`HomeController.php:767-768`, LIVE — this is the
  live QR-payment order-placement path per blueprint route #37): identical
  read-then-increment-then-insert pattern, again with no transaction, confirmed by reading
  through to the subsequent `DB::table('orders')->insert(...)` at line 770.

Under concurrent traffic, two simultaneous checkouts can read the same `MAX(GroupId)`, both
increment it identically, and both insert with the same `GroupId`, corrupting the
header↔lines↔payments linkage described in §2's `★` relationship — exactly the risk blueprint
R-6 and contract §5.3 (pre-approved additive-transaction remediation, for a MariaDB target)
already identify. No transaction exists to catalogue as "used"; the finding is the confirmed
**absence** of one across all three read-then-write order-id-generation sites.

---

## 12. Behaviors that will require a MongoDB-specific implementation

Per the explicit scope boundary (item 12 of the task and D-11 §4), this section names the
**problem class** each pattern from §11 raises for a document-store target, in one sentence
each. **No collection schema, field name, embedding decision, or `$lookup` pipeline is
specified here — this is a list of what needs solving later, not a solution.**

| Source pattern (§11 ref) | Problem class a MongoDB implementation will need to solve |
|---|---|
| Simple 1:1/1:N joins on a convention key with no aggregation (e.g. join #5, `users`⋈`buyer_profile`; #19, `product_review`⋈`products`) | Some mechanism for combining two independently-queried record sets keyed by a shared value must replace the SQL join — the general category is "fetch related data across more than one query and combine it," with the specific technique (embedding one inside the other vs. two queries merged in application code vs. an aggregation-pipeline lookup stage) not decided here. |
| Multi-way chained joins (e.g. #22-25, `orderproducts`⋈`products`⋈`users`⋈`buyer_profile`; #26-31, `payments`⋈`products`⋈`users` ×3) | The same problem as above, compounded across three or four record sets simultaneously, which raises an additional question — not answered here — of how many separate fetches versus how much precomputed/duplicated data is acceptable, a question D-11 §5 explicitly reserves for the (not-yet-begun) schema-design phase. |
| The ★ `orders.GroupId` ↔ `orderproducts.GroupId` N:N linkage (#35) and the parallel `payments.gid` reference | This is the single most load-bearing relational pattern in the whole application (order header, order lines, and payment record are three separately-keyed record sets unified only by a shared integer value with no FK) — whatever mechanism is chosen must preserve the ability to reconstruct "everything belonging to one order" exactly as reliably as the current `GroupId` join does, without yet specifying whether that means one order becomes one document, three linked documents, or something else. |
| BROKEN joins on non-existent/always-NULL columns (#13/#15 `products.uid`→B-07/B-08; #9 `orders.cust_id`; #36 `orders.pid`→B-12) | Per contract NN-4/F-16 (broken stays broken) and D-11 §3's restatement of that rule for MongoDB, whatever the eventual implementation is, it must reproduce the **same observable failure** these joins currently produce (empty/error results) rather than "fixing itself" merely because a document-store query happens not to error the same way a SQL join against a nonexistent column does — this is a verification-design problem, not a schema problem. |
| The 6 `groupBy('product_images.p_id')` product-listing queries (§11.2) | The underlying intent — "one row per product, with its associated image(s) attached, filtered and paginated" — needs a document-store equivalent of "collapse N image rows down to the product they belong to," which is a different operation depending on whether images end up embedded in the product record or in a separate collection; which of those (or another option) is correct is explicitly deferred to the schema-design phase, not decided by this document. |
| Product listing pagination (`->paginate(60)`, `->paginate(75)`, `->simplePaginate(10)`, `->paginate(24)`, `->paginate(20)` — the specific sizes preserved per contract F-27) | Whatever query mechanism replaces these calls must reproduce the exact same page-boundary behavior for the exact same size values — a general "pagination must match" requirement, not a statement about how MongoDB pagination (skip/limit vs. cursor-based) should be implemented. |
| Order-id/GroupId race condition, no transaction (§11.3, all three sites) | MongoDB has native multi-document ACID transactions (since 4.0, on replica sets, which Atlas provides) and/or atomic single-document `findOneAndUpdate` counters — which of those (or something else) correctly replaces the current unprotected read-then-increment-then-insert pattern, while preserving the exact current numeric format (`rand(99,9999) . $IncrementId`, `MAX(GroupId)+1`) per contract §10.4's "preserve the result, not the technique" principle, is an open design question, not resolved here. |
| Absence of FK constraints (§4) | Since the source already has zero database-enforced referential integrity, no *new* integrity-enforcement problem is introduced by moving to MongoDB — but the corollary problem (orphaned references, e.g. an `orderproducts.ProductId` with no matching `products` document) that MariaDB already silently allowed will need the same "silently allow it" treatment in the new store, which is itself a behavior-preservation decision, not a schema one. |
| Mixed `int(21)`/`int(11)`/`bigint(20)`/`varchar`-typed numeric-looking columns (§7) | Field-level type fidelity (not silently coercing a `varchar`-stored price to a BSON number, for instance) is a data-integrity requirement that carries forward regardless of storage engine — flagged here as a constraint the eventual field-type mapping must satisfy, without specifying what that mapping is. |

---

## 13. Summary of Blueprint Correction Notices raised in this document

| Notice | Blueprint states | Source shows | Resolution |
|---|---|---|---|
| BCN-DB-01 | `products` has 83 columns (§6.1, §6.2) | 75 columns, confirmed by two independent counting methods against `Database/db_newhomo.sql:18352-18422` | Source governs (contract §12.2); this document and future work use 75; blueprint §6.1/§6.2 should be amended in a future revision pass |

No other blueprint statement in §6 (Database) was found to conflict with source during this
review. Blueprint's table-bucket classifications (LIVE/DEAD/VESTIGIAL/BROKEN/LIVE-orphan),
relationship map, PK/FK/index counts, and file→table map were all independently re-derived from
source in this document and found to agree with blueprint's existing statements, with the
extensions and precisions noted inline in §2, §9, and §10 above.

---

## 14. Explicit confirmations

- No MongoDB collection schema was designed, sketched, or proposed anywhere in this document.
- No MongoDB connection was attempted; no MongoDB credentials exist or were requested.
- No MariaDB connection was attempted; no MariaDB credentials exist or were requested; this
  document is derived entirely from the static `Database/db_newhomo.sql` dump and the local
  Laravel controller source.
- No file under `spakshomeopathy-next/src/` was read, created, or modified.
- No file under `spakshomeopathy.com/` (the Laravel source) was modified. `Database/
  db_newhomo.sql` was read-only throughout.
- No collection was created; no data was migrated; no `.env`, connection string, or driver
  dependency was added to the Next.js project.
- OI-1a, OI-1b, and OI-6 were not investigated, referenced as closed, or otherwise acted upon
  beyond the explicit OI-6 scope-distinction statement in §0 above.
- M3 was not begun. No page, API route, model, authentication code, or business logic was
  written.

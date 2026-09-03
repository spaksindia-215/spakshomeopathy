# D-09 — Production Database Compatibility Baseline

**Owner Decision D-09:** APPROVED — "Capture the exact production MySQL version and sql_mode and use them as the compatibility baseline."

**Status:** **PARTIALLY CAPTURED.** Server version and engine established from primary evidence. Runtime `sql_mode` **NOT yet captured** — requires production access (Outstanding Issue OI-2).

---

## 1. Captured — server version and engine

**Source (primary evidence):** header of `Database/db_newhomo.sql`, written by the production server at dump time.

```
-- Server version: 10.6.23-MariaDB-cll-lve
-- PHP Version: 8.3.27
-- Host: localhost:3306
-- Generation Time: Jan 05, 2026 at 10:34 PM
-- phpMyAdmin version: 5.2.2
```

| Property | Value | Confidence |
|---|---|---|
| Engine | **MariaDB** (not MySQL) | Certain — stated by the server in its own dump |
| Version | **10.6.23** | Certain |
| Build | `cll-lve` (CloudLinux LVE) | Certain |
| Port | 3306 | Certain |
| Dump-time `SQL_MODE` | `NO_AUTO_VALUE_ON_ZERO` | Certain — but this is phpMyAdmin's **dump-session** override, **NOT** the server's runtime default. It must not be mistaken for the baseline. |
| Server charset | `utf8mb4` (connection `SET NAMES utf8mb4`) | Certain |
| PHP version | 8.3.27 | Certain — noted below |

### 1.1 BLUEPRINT CORRECTION NOTICE

**Contract §12.2 requires raising this.**

| Blueprint statement | Actual | Impact |
|---|---|---|
| §17.1 / §19 recommend "**MySQL 8** (same instance/dump)" and §15.3 / R-16 reference "strict MySQL 5.7+/8" | Production is **MariaDB 10.6.23** | The target database engine changes from MySQL 8 to MariaDB 10.6 |

**Assessment of impact on prior milestones:** none — no code had been written. **Impact on future milestones:** the target environment must be MariaDB 10.6.x, not MySQL 8. This is materially favorable, see §2.

**Second correction:** blueprint §1.6 records the Laravel app requiring `php ^7.1.3`; the production host reports **PHP 8.3.27**. This does not change the migration target (the PHP app is being replaced), but it means the legacy app is running on a much newer PHP than `composer.json` declares — relevant only if the PHP app must be kept running during the D-10 rollback window.

---

## 2. Why the MariaDB finding matters (blueprint R-16)

Blueprint R-16 flags that product listing queries use `groupBy('product_images.p_id')` while selecting non-aggregated columns:

```php
DB::table('products')->select('products.*','product_images.*','products.id as prdc_id')
  ->join('product_images','product_images.p_id','products.id')
  ->where('products.p_status','=',1)
  ->groupBy('product_images.p_id')
  ->paginate(60);
```

This is invalid under `ONLY_FULL_GROUP_BY` and would throw on MySQL 5.7+/8, where that flag is **on by default**.

**MariaDB 10.6 does not include `ONLY_FULL_GROUP_BY` in its default `sql_mode`.** The documented MariaDB 10.6 default is:

```
STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION
```

This explains why these queries work in production today, and **substantially lowers the R-16 risk**: targeting MariaDB 10.6 with default settings preserves the behavior without query rewrites. Had the target been MySQL 8 as the blueprint assumed, every product listing page would have failed.

**This does not close R-16.** The runtime value must still be captured (OI-2), because the host may override the default.

---

## 3. NOT captured — runtime `sql_mode`

**Required by D-09. Blocked.**

The dump header's `SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO"` is a phpMyAdmin export directive scoped to the dump session. It is **not** evidence of the server's runtime `sql_mode`, and must not be used as the baseline.

### 3.1 Attempts made

| Attempt | Result |
|---|---|
| Query production database | No production credentials in this environment |
| Query local MariaDB (11.8.6 client, server on 127.0.0.1:3306) | `ERROR 1698 (28000): Access denied for user 'root'@'localhost'` — and it is a different server/version, so it is not authoritative regardless |

### 3.2 Exact capture command

Run against **production** (read-only, safe):

```sql
SELECT
  VERSION()                  AS server_version,
  @@GLOBAL.sql_mode          AS global_sql_mode,
  @@SESSION.sql_mode         AS session_sql_mode,
  @@character_set_server     AS charset_server,
  @@collation_server         AS collation_server,
  @@GLOBAL.time_zone         AS global_time_zone,
  @@SESSION.time_zone        AS session_time_zone,
  @@lower_case_table_names   AS lower_case_table_names;
```

Both `@@GLOBAL` and `@@SESSION` are needed: Laravel's `config/database.php` can set a session-level mode that differs from the global default.

### 3.3 Applying the captured value

Set the exact captured string in `.env.local`:

```
DATABASE_SQL_MODE=<exact @@SESSION.sql_mode string from production>
```

`src/lib/db/index.ts` reads this and pins it on every pooled connection. Until it is set, the code falls back to the documented MariaDB 10.6 default recorded above.

---

## 4. Additional properties to capture with OI-2

Recorded now so the single production access session captures everything needed:

| Property | Why it matters |
|---|---|
| `@@SESSION.time_zone` | Order dates are stored as **strings** in varchar columns (`orders.OrderDate`, `deliveryDate`) alongside real `timestamp` columns. Timezone affects `created_at`/`updated_at` values (contract NN-6). |
| `@@collation_server` / per-table collation | Tables mix `utf8mb4_general_ci`, `utf8mb4_unicode_ci`, and `latin1_swedish_ci` (blueprint §6.1). Collation affects `LIKE` matching and `ORDER BY` results — directly relevant to V-06 read parity and the site search. |
| `@@lower_case_table_names` | Affects table-name case sensitivity between Linux hosts. |
| `@@max_allowed_packet` | Relevant to large `text` columns in `products` / `tbl_post`. |

**Collation is worth emphasising:** `categories` and `products` are `latin1_swedish_ci` while `users` and `orders` are `utf8mb4`. Ordering (`orderBy('name','ASC')`) and `LIKE '%term%'` search results depend on it, so the development snapshot must preserve per-table collation exactly, not be re-imported under a uniform charset.

---

## 5. Baseline statement (current)

| Property | Baseline | Source |
|---|---|---|
| Engine | MariaDB | Dump header — **certain** |
| Version | 10.6.23 (`cll-lve`) | Dump header — **certain** |
| `sql_mode` | **PENDING (OI-2)** — provisional: MariaDB 10.6 documented default, which excludes `ONLY_FULL_GROUP_BY` | Provisional |
| Charset | utf8mb4 server; per-table varies incl. latin1 | Dump — **certain** |
| Time zone | **PENDING (OI-2)** | — |
| Collation | Per-table, mixed — **must be preserved on restore** | Dump — **certain** |

**D-09 is not fully satisfied until OI-2 is closed.** Contract §27 makes D-09 blocking for Milestone 3 (content & catalog browsing), which is where the affected `groupBy` listing queries are implemented. It does **not** block Milestone 1 or 2.

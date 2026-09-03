# MILESTONE GATE REPORT — M0: Environment, Safety & Baseline Capture

**Milestone:** M0
**Report version:** 2.0 (regenerated after blocker-closure tasks)
**Supersedes:** v1.0 (2026-08-01, conditionally approved)
**Period:** 2026-08-01
**Author:** Migration Implementer
**Contract version:** 1.0

---

## 0. CONTRACT ACKNOWLEDGEMENT

- [x] I have read `MIGRATION-CONTRACT.md` in full
- [x] I have read `blueprint.md` §0 (Governing Policy)
- [x] Blueprint sections for this milestone: §3 (routes), §14 (assets), §17, §19, §21, §22 M0
- [x] I confirm no undocumented deviation was introduced
- [x] I confirm **no application behavior has been migrated** (§14)

---

## 1. OBJECTIVE

**Owner-assigned closure tasks (this cycle):**

| # | Task | Status |
|---|---|---|
| 1 | Complete visual baseline: desktop/tablet/mobile × public/authenticated/admin | ⚠️ **Partial** — public complete, authenticated/admin blocked |
| 2 | Record production DB baseline: version, sql_mode, charset, collation | ⚠️ **Partial** — version/charset/collation certain, `sql_mode` blocked |
| 3 | Configure Playwright; document usage; no migration tests | ✅ **Complete** |
| 4 | Asset migration: copy, SHA-256, verify, manifest | ✅ **Complete** |

**Original M0 objectives (from v1.0):** all 10 complete; objectives 7 (static assets) and 8 (testing framework) were partial in v1.0 and are now **fully closed**.

**Achieved:** ☐ Fully ☑ **Substantially — 2 of 4 closure tasks complete, 2 blocked solely by missing credentials**

**What remains:** Two blockers persist and **neither is resolvable by implementation work**. Both require the owner to supply access:

- **Authenticated/admin visual baseline** — no buyer or admin test credentials exist
- **Runtime `sql_mode`** — no production database credentials

The capture harness for both is written, tested, and ready. Supplying credentials and re-running two commands closes them.

---

## 2. FILES CREATED (this cycle)

**11 new files** beyond v1.0's 32.

### 2.1 Testing framework (2)

| Path | Purpose |
|---|---|
| `playwright.config.ts` | Playwright config: 4 projects, 6 viewports, determinism settings |
| `docs/TESTING-FRAMEWORK.md` | How Playwright is used across the project (task 3 deliverable) |

### 2.2 Capture and asset scripts (5)

| Path | Purpose | Contains app logic? |
|---|---|---|
| `scripts/routes.ts` | Route inventory for capture, from blueprint §3 | **No** |
| `scripts/capture-baseline.ts` | Reads live Laravel, writes `baseline/` | **No** |
| `scripts/capture-db-baseline.ts` | D-09 database baseline capture | **No** |
| `scripts/copy-assets.ts` | Copy + SHA-256 + verify + manifest | **No** |
| `scripts/verify-assets.ts` | Re-verify integrity at any gate | **No** |

### 2.3 Generated evidence (4)

| Path | Size | Contents |
|---|---|---|
| `baseline/` | **67 MB** | 70 HTML, 105 screenshots, 35 meta, 35 console, 35 network, manifest |
| `asset-manifest.json` | 640 KB | 2,856 file entries with SHA-256 |
| `asset-checksums.sha256` | 250 KB | `sha256sum -c` compatible |
| `public/**` | **592 MB** | 2,856 copied asset files |

### 2.4 Modified

`package.json` (6 new scripts), `.gitignore`, `.prettierignore`, `docs/GATE-REPORT-M0.md` (this file).

---

## 3. TASK 1 — VISUAL BASELINE

### 3.1 Captured

| Dimension | Result |
|---|---|
| Routes captured | **35** |
| Errors | **0** |
| Viewports | **3** — mobile 320×640, tablet 768×1024, desktop 1440×900 |
| Screenshots | **105** (35 × 3), full-page |
| HTML documents | 70 (raw + normalized per route) |
| Console logs | 35 |
| Network logs | 35 |
| Total size | 67 MB |

**Coverage by category:**

| Category | Captured | Notes |
|---|---|---|
| Public static pages | 22 | home, about, contact, terms, privacy, video, login, register, cart, … |
| Dynamic content pages | 7 | 3 disease-detail, 3 product-detail, 1 category listing |
| Admin login (unauthenticated) | 1 | `/admin/login` |
| Legacy microsites (blueprint §3.4) | 4 | Dandruff, hair-dandruff, enlarged-prostate, record |
| **Authenticated (buyer)** | **0** | **BLOCKED — OI-1a** |
| **Admin (authenticated)** | **0** | **BLOCKED — OI-1b** |

Dynamic-route slugs were **discovered from the live site**, not invented, so each resolves to real content (e.g. `bones-16396`, `agaricus-200-rhus-tox-q-oocab`).

### 3.2 Findings from the capture

**Finding 1 — B-17 confirmed in production.** `/order-placed` returns **HTTP 500** on the live site, exactly as contract §9.2 predicted. The regression suite must assert 500, not 200 (contract T-6/G-8).

**Finding 2 — 40 pre-existing console errors** across 6 pages, now recorded. Per contract V-13 these must be **preserved**, not fixed:

| Page | Errors |
|---|---|
| `/top-poducts` | 11 |
| `/seller-register` | 10 |
| `/Dandruff/` | 3 |
| `/enlarged-prostate/` | 3 |
| `/hair-dandruff/` | 2 |
| `/order-placed` | 1 |

**Finding 3 — THE LOCAL BACKUP IS NOT THE DEPLOYED CODE.** See §9.1; this is the most consequential finding of the cycle.

### 3.3 Blocked: authenticated and admin capture

| Blocker | Requirement |
|---|---|
| **OI-1a** | Buyer test account (`utype=3`, `status=1`): `BUYER_EMAIL`, `BUYER_PASSWORD` |
| **OI-1b** | Admin test account (`utype=1`, `status=1`): `ADMIN_EMAIL`, `ADMIN_PASSWORD` |

29 routes await these — 5 buyer, 24 admin. Authentication logic is implemented and follows blueprint §5.2 (including the `backuser` form gating). To close:

```bash
BUYER_EMAIL=... BUYER_PASSWORD=... \
ADMIN_EMAIL=... ADMIN_PASSWORD=... \
npm run baseline:capture
```

**A note on why I did not work around this.** I could have created test accounts by registering through the live site, but that writes rows to the production `users` and `buyer_profile` tables. Contract F-1 and prudence forbid it, and there is no admin-account path at all without existing credentials.

---

## 4. TASK 2 — PRODUCTION DATABASE BASELINE

### 4.1 Established with certainty

Primary evidence: header of `Database/db_newhomo.sql`, written by the production server.

| Property | Value | Confidence |
|---|---|---|
| **Engine** | **MariaDB** (not MySQL) | Certain |
| **Version** | **10.6.23-MariaDB-cll-lve** | Certain |
| Host PHP | 8.3.27 | Certain |
| Connection charset | utf8mb4 | Certain |
| Per-table collation | Mixed: `utf8mb4_general_ci`, `utf8mb4_unicode_ci`, `latin1_swedish_ci` | Certain (from DDL) |
| Table count | 34 | Certain |

**Per-table collation is captured and must be preserved on restore.** `categories` and `products` are `latin1_swedish_ci` while `users` and `orders` are utf8mb4. Collation governs `ORDER BY` ordering and `LIKE` matching, so a snapshot re-imported under a uniform charset would silently change row order and search results — a V-06 read-parity failure.

### 4.2 Blocked: runtime `sql_mode`

**OI-2.** The dump header shows `SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO"`, but that is a **phpMyAdmin export-session directive**, not the server's runtime default. It must not be used as the baseline.

Remote access was attempted and denied (`ERROR 1045: Access denied for user 'db_newhomo'@'103.83.129.156'`). `scripts/capture-db-baseline.ts` is ready; it captures `sql_mode` (GLOBAL and SESSION), charset, collation (server/database/per-table/per-column), time zone, and indexes.

**Provisional baseline** (documented as provisional in code and in `docs/D-09-database-baseline.md`): the MariaDB 10.6 documented default, which **excludes `ONLY_FULL_GROUP_BY`**.

### 4.3 Why the MariaDB finding materially reduces R-16

Blueprint R-16 warned that the `groupBy` product-listing queries fail under `ONLY_FULL_GROUP_BY`, on by default in **MySQL** 5.7+/8. MariaDB 10.6 does **not** enable it by default — which is why those pages work in production, and why targeting MariaDB 10.6 preserves the behavior without query rewrites.

**Had we targeted MySQL 8 as blueprint §19 originally specified, every product listing page would have failed.**

---

## 5. TASK 3 — PLAYWRIGHT CONFIGURATION ✅

### 5.1 Delivered

| Item | Detail |
|---|---|
| Version | **1.62.1** |
| Browsers | Chromium 151.0.7922.34 (build 1228), Firefox 153.0 (build 1538) |
| Config | `playwright.config.ts` — 4 projects, 6 viewports |
| Documentation | `docs/TESTING-FRAMEWORK.md` |
| Migration tests | **None** — per instruction |

### 5.2 Version issue resolved

Playwright **1.57 does not support Ubuntu 26.04** (`Playwright does not support chromium on ubuntu26.04-x64`). Upgraded to 1.62.1, which supports it. Both browsers verified launching and loading the live site.

### 5.3 Determinism settings

| Setting | Value | Rationale |
|---|---|---|
| `retries` | **0** | Contract T-2 — never retry a parity failure into a pass |
| `workers` | 1 | Serial; avoids session interference |
| `timezoneId` | `Asia/Kolkata` | Laravel renders dates server-side |
| `locale` | `en-US` | Stable formatting |
| `animations` | disabled | Screenshot stability |
| `maxDiffPixelRatio` | 0.01 | Absorbs antialiasing without masking layout drift |

### 5.4 Capture/verify separation

Two strictly separate modes, with a **hard guard** in `capture-baseline.ts` that refuses to run against any host other than `spakshomeopathy.com`. Pointing capture at the Next.js app would overwrite the baseline with the thing it is meant to check (contract T-1).

---

## 6. TASK 4 — ASSET MIGRATION BASELINE ✅

### 6.1 Results

| Metric | Value |
|---|---|
| **Files copied** | **2,856** |
| **Files verified** | **2,856** |
| **Mismatches** | **0** |
| **Missing** | **0** |
| **Total size** | **584.4 MB** |
| **INTEGRITY** | **PASSED** |

### 6.2 By tree

| Tree | Files | Size | Source match |
|---|---|---|---|
| `assets/` | 239 | 24.7 MB | ✓ exact |
| `admin-assets/` | 152 | 5.4 MB | ✓ exact |
| `uploaded_files/` | **2,235** | **481.2 MB** | ✓ exact |
| `Dandruff/` | 70 | 22.4 MB | ✓ exact |
| `hair-dandruff/` | 70 | 22.4 MB | ✓ exact |
| `enlarged-prostate/` | 69 | 5.5 MB | ✓ exact |
| `record/` | 17 | 0.9 MB | ✓ exact |
| Root files (robots + 3 PDFs) | 4 | 22.4 MB | ✓ exact |

`uploaded_files` sub-counts match blueprint §14.2 **exactly**: products 1,615 · post 549 · categories 43 · profile 24 · slider 3 · product-categories 1 · blogs/blog-categories/doc 0.

### 6.3 Independent verification

Beyond the script's own re-hash, verified with the **system `sha256sum -c`** across all 2,856 entries — **exit 0, zero failures**. Two independent implementations agree.

### 6.4 Deliberate exclusions

| Excluded | Reason |
|---|---|
| `cc/` | R-2/D-02 — hardcoded live CCAvenue credentials |
| `old/` | R-2/D-02/D-08 — previous site incl. downloadable DB dump |
| `patientrecord/` | **D-01 (APPROVED)** — stays on the PHP host |
| `index.php`, `web.config`, `error_log`, `pramod.php`, `storage`, `patientrecord.zip` | Framework/server artifacts |

Recorded in `asset-manifest.json` under `excluded`, each with its reason.

---

## 7. FILES DELETED

**ZERO.** (Contract G-2, NN-10 satisfied.)

No file in the Laravel source tree was modified or removed. Verified: no file under `spakshomeopathy.com/` has a modification time after this session began.

---

## 8. TESTS EXECUTED

| Cat | Category | Status | Evidence |
|---|---|---|---|
| V-01 | UI Parity | ⚠️ **Baseline captured (public only)** | 70 HTML docs; buyer/admin blocked |
| V-02 | Responsive | ⚠️ **Baseline captured (public only)** | 105 screenshots × 3 viewports |
| V-03 | Route Parity | ⚠️ **Baseline captured (public only)** | 35 meta.json with status/redirect/headers |
| V-04 | Authentication | ❌ **Blocked** | No credentials (OI-1a/b) |
| V-05 | DB Writes | **N/A** | No queries exist |
| V-06 | DB Reads | ⚠️ **Partial** | Schema/collation certain; `sql_mode` blocked (OI-2) |
| V-07 | Forms | **N/A** | No forms exist |
| V-08 | Validation | ✅ | 7 env-validation tests pass |
| V-09 | Emails | **N/A** | Not in M0 scope |
| V-10 | Uploads | **N/A** | Not in M0 scope |
| V-11 | AJAX/API | **N/A** | No endpoints exist |
| V-12 | Error Handling | ⚠️ **Partial** | B-17 confirmed (500); B-02/B-03/B-07/B-10 need admin auth |
| V-13 | Console Errors | ⚠️ **Baseline captured (public only)** | 40 errors recorded across 6 pages |
| V-14 | Network Requests | ⚠️ **Baseline captured (public only)** | 35 network logs |

### 8.1 Toolchain

| Check | Result |
|---|---|
| `npm run typecheck` | ✅ Pass |
| `npm run lint` | ✅ Pass, 0 warnings |
| `npm run format:check` | ✅ Pass |
| `npm run test` | ✅ 7/7 pass |
| `npm run build` | ✅ Compiled in 2.5s |
| `npm run assets:verify` | ✅ 2,856/2,856, integrity PASSED |
| `sha256sum -c` (independent) | ✅ exit 0 |

---

## 9. CONFLICTS RESOLVED (Contract Part 3)

| Conflict | Sources | Rank | Resolution |
|---|---|---|---|
| DB engine: blueprint says MySQL 8; dump says MariaDB 10.6.23 | blueprint (3) vs live schema (5) | **5** | MariaDB correct — BCN-01 |
| **Local Blade `<title>` vs live HTML** | source (4) vs production (6) | **6** | **Production governs — BCN-03** |
| `sql_mode`: dump header value | artifact vs runtime (6) | **6 pending** | Header is an export directive, not the baseline (OI-2) |

### 9.1 BLUEPRINT CORRECTION NOTICES

**BCN-01 — Database engine.** Blueprint §17.1/§19/§15.3/R-16 specify MySQL 8; production is **MariaDB 10.6.23-cll-lve**. Impact: target must be MariaDB 10.6.x. **Materially reduces R-16.** No prior-milestone impact (no code existed).

**BCN-02 — PHP version.** Blueprint §1.6 records `php ^7.1.3`; production runs **PHP 8.3.27**. Relevant only to keeping the PHP app alive during the D-10 rollback window.

**BCN-03 — ⚠️ THE LOCAL BACKUP IS NOT THE DEPLOYED CODE.** *(New this cycle — highest significance)*

Comparing live HTML against local Blade templates:

| Route | Live `<title>` | Local `<title>` | Match |
|---|---|---|---|
| `/` | `Homeopathy Clinic in Delhi \| Dr. S.K. Meena \| Spaks Homeopathy` | `Spaks Homeopathy Delhi \| Dr. S.K.Meena Clinic \| Online Homeopathic Medicines & Consultation` | ❌ |
| `/about` | `About Spaks Homeopathy \| Trusted Homeopathy Clinic in India` | `Homeopathy Clinic in South Delhi - No.1 Homeopathic Clinic In India \| About Us` | ❌ |
| `/contact`, `/diseases-list`, `/consultancy`, `/login`, `/register`, `/terms` | — | — | ✅ |

The live navigation also differs (live shows *Herbs*, *Mother Tincture*, *Potencies*; local `header.blade.php` shows a different set).

**Assessment.** The backup at `spakshomeopathy.com/` is **stale relative to production**, diverging specifically on **SEO-critical** pages — meta titles and descriptions, exactly what contract §13.2 requires be transcribed verbatim.

**Consequence.** This **validates contract Part 3's precedence order**: production (rank 6) governs where static source (rank 4) is inconclusive or contradicted. Practically:

1. **All UI/SEO parity work must target the captured baseline, not the local Blade files.**
2. The local source remains authoritative for **logic, queries, and validation** — those are not visible in rendered HTML and cannot be captured.
3. **Recommendation:** obtain a fresh production code export before Milestone 3. Without it, logic-level drift is undetectable — we would be porting business rules from a version that is provably not what is running.

This is exactly the failure mode contract T-1 exists to prevent, caught before any code was written.

---

## 10. OUTSTANDING ISSUES

| # | Issue | Severity | Blocks | Owner |
|---|---|---|---|---|
| **OI-1a** | Buyer credentials absent — 5 routes uncaptured | **High** | M1 gate (V-01/V-02 for buyer), M7 | Owner |
| **OI-1b** | Admin credentials absent — 24 routes uncaptured | **High** | M1 gate (admin layout), M9–M11 | Owner |
| **OI-2** | Runtime `sql_mode` uncaptured (D-09) | **High** | **M3** | Owner |
| **OI-5** | 3 transitive advisories in Next 15.5.22 (`postcss`, `sharp`). `npm audit fix --force` downgrades to Next 9 — refused. Build/image tooling only; C-12 removes `sharp` from the serving path | Low | No | Implementer |
| **OI-6** | **Local source is stale vs production (BCN-03).** Fresh production code export needed | **High** | **M3** (logic porting) | Owner |
| **OI-7** | WebKit not installed; Safari coverage at M13 needs WebKit or real-device testing | Low | M13 | Implementer |

**Closed this cycle:** OI-3 (Playwright configured), OI-4 (assets copied and verified), OI-1 partially (public baseline complete).

---

## 11. RISKS INTRODUCED

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| N-1 | Placeholder `schema.ts` mistaken for real schema | Low | High | Header documents stub status + generation command |
| N-2 | Provisional `sql_mode` mistaken for captured value | Medium | High | Named `MARIADB_106_DEFAULT_SQL_MODE`; OI-2 tracks real capture |
| N-3 | Pinned deps drift from security patches | Medium | Medium | Re-audit each gate |
| N-5 | **Baseline captured from a site that may change** | Medium | High | `manifest.json` timestamps every capture; re-run if Laravel changes |
| N-6 | **Public baseline could be mistaken for complete** | Medium | **High** | `manifest.json` sets `complete: false` and lists all 29 skipped routes with reasons |

### 11.1 Blueprint risks materialized

| Risk | How | Handling |
|---|---|---|
| **R-16** | Engine is MariaDB, not MySQL — **risk reduced** | `sql_mode` pinned per connection; real value pending OI-2 |
| **R-2** | `APP_DEBUG=true` + `APP_ENV=local` in production `.env` | Under approved D-02 exception; flagged for separate remediation |
| **R-14** | Hot-linked social icons confirmed live in captured HTML | Recorded; preserve per contract |
| **B-17** | **Confirmed: `/order-placed` returns HTTP 500 in production** | Regression suite must assert 500 |

---

## 12. OWNER DECISIONS

| ID | Status | Applied |
|---|---|---|
| **D-01** | ✅ APPROVED — keep on PHP host | `patientrecord/` excluded from asset copy |
| **D-02** | ✅ APPROVED **with exception**: security vulnerabilities are not application behavior; remediate separately without changing functional behavior | `cc/` and `old/` excluded; `APP_DEBUG=true` logged under the exception |
| **D-09** | ✅ APPROVED — capture exact version and `sql_mode` | Version/charset/collation captured; `sql_mode` blocked (OI-2) |

**Required next:** OI-1a, OI-1b, OI-2, OI-6 — all owner-supplied access, none a contract decision.

---

## 13. NEXT MILESTONE SAFETY ASSESSMENT

**Safe to begin M1:** ☐ YES ☐ NO ☑ **YES WITH CONDITIONS**

### Checklist

- [x] Toolchain verified: typecheck, lint, format, test, build all pass
- [x] Static assets copied and **checksum-verified** (2,856 files, integrity PASSED)
- [x] Playwright configured and documented; browsers verified working
- [x] **Public** visual baseline captured — 35 routes × 3 viewports, 0 errors
- [ ] **Authenticated/admin baseline NOT captured** — OI-1a/OI-1b
- [ ] **`sql_mode` NOT captured** — OI-2
- [x] No undocumented deviations
- [x] No application behavior migrated (§14)
- [x] Laravel source untouched

### Conditions

**M1 (layout, shared components, static pages) may begin now.** Its work targets public pages — the header, footer, and static pages whose baseline **is** captured. Assets are in place so components can render against the original CSS.

**M1's gate additionally requires:**
- **OI-1b** — the admin layout (`AdminHeader`/`AdminSidebar`/`AdminFooter`) cannot be parity-verified without an admin baseline.

**M3 remains NOT AUTHORIZED** until:
- **OI-2** — D-09 completion (contract §27 makes it blocking for M3)
- **OI-6** — fresh production source, without which logic-level drift is undetectable

### Rationale

Two of four closure tasks are fully complete with independently verified evidence. The remaining two are blocked **solely** by credentials I do not have, and I have deliberately not manufactured workarounds: registering a buyer account would write to production tables (F-1), and no admin path exists at all.

The most important outcome is **BCN-03** — the discovery that the local backup is not the deployed code. That was found precisely because the contract required capturing from production rather than trusting the source, and it would have silently corrupted every SEO-parity claim had we proceeded from the local Blade files.

---

## 14. CONFIRMATION: NO APPLICATION BEHAVIOR MIGRATED

| Prohibited | Status | Evidence |
|---|---|---|
| Pages | ✅ **None** | Zero `page.tsx` in `src/` |
| Routes | ✅ **None** | Zero `route.ts` in `src/` |
| Layouts | ✅ **None** | Zero `layout.tsx` in `src/` |
| Components | ✅ **None** | Zero `.tsx` files in the entire project |
| APIs | ✅ **None** | No `src/app/api/` contents |
| Authentication | ✅ **None** | No auth/session code; no `middleware.ts` |
| Business logic | ✅ **None** | No queries, validation, calculations, slug/crypto/cart/upload logic |
| UI | ✅ **None** | No JSX; no CSS authored (only verbatim copies) |
| Migration tests | ✅ **None** | `tests/e2e/` does not exist |
| Laravel code migrated | ✅ **None** | No Blade template, controller, or query ported |

```
find src -name "page.tsx" -o -name "route.ts" -o -name "layout.tsx" -o -name "*.tsx"
  → CONFIRMED: zero pages/routes/layouts/components
ls -d tests/e2e  → does not exist
```

**On the scripts written this cycle:** `scripts/*.ts` are **tooling**, not application code. They read the Laravel app and the filesystem to produce evidence. None is imported by the Next.js application, none runs at request time, and none implements any Laravel behavior.

**On copied assets:** `public/**` contains 2,856 **verbatim byte-identical copies**. Nothing was authored, reformatted, or optimized — contract F-30, verified by SHA-256.

**Laravel source integrity:** zero files modified. `Database/db_newhomo.sql` unmodified.

---

## 15. COMMANDS TO CLOSE REMAINING BLOCKERS

```bash
# OI-1a / OI-1b — authenticated + admin visual baseline
BUYER_EMAIL=<buyer@example.com> BUYER_PASSWORD=<...> \
ADMIN_EMAIL=<admin@example.com> ADMIN_PASSWORD=<...> \
  npm run baseline:capture

# OI-2 — D-09 database baseline
DATABASE_HOST=<host> DATABASE_USER=<user> \
DATABASE_PASSWORD=<pass> DATABASE_NAME=db_newhomo \
  npm run baseline:db

# Then set the captured SESSION sql_mode in .env.local:
#   DATABASE_SQL_MODE=<exact string>

# OI-6 — fresh production source export (owner-supplied), then re-run
# the local-vs-live comparison before M3.
```

---

## 16. SIGN-OFF

**Implementer:** Migration Implementer **Date:** 2026-08-01

**Owner:** homeopathy38@gmail.com **Date:** 2026-08-01

**M1 authorized:** ☑ Yes

**Conditions of authorization:** M1 *implementation* (layout, shared components, static pages targeting the captured public baseline) begins now. OI-1a, OI-1b, and OI-2 remain open and must be closed — via owner-supplied buyer/admin test credentials and DB access — before **M1's own gate** can be signed (admin sidebar/header parity cannot be verified without OI-1b) and before **M3** may begin (OI-2, OI-6 per §27 blocking rule).

**Note:** M3 requires OI-2 and OI-6.

---

## ADDENDUM (2026-08-16) — OI-2 STATUS CHANGE: TARGET ARCHITECTURE IS NOW MONGODB ATLAS

**Append-only note. Nothing above this line was altered.**

The owner has decided the Next.js application's production database will be
**MongoDB Atlas**, not MariaDB/MySQL. Full record: `docs/D-11-DATABASE-
ARCHITECTURE.md` (Owner Decision D-11, 2026-08-16), which formally supersedes
contract §5.1's Kysely/SQL substitution clause, §1.1's "MySQL database
receiving writes" fidelity criterion, and D-10's shared-database rollback
assumption.

**OI-2 (runtime `sql_mode` uncaptured) is now: DEFERRED / NOT APPLICABLE TO
TARGET ARCHITECTURE.** `sql_mode` and `ONLY_FULL_GROUP_BY` are MariaDB/MySQL
concepts with no MongoDB equivalent; obtaining production database
credentials to capture it is no longer required for M3 to proceed. Per the
owner's explicit instruction, production `sql_mode` credentials were **not**
requested or obtained, and no MariaDB compatibility layer was built.

**This does not delete or invalidate anything above.** The MariaDB findings
in this report (schema source-of-truth, table inventory, D-09's own analysis
of the `groupBy`/`ONLY_FULL_GROUP_BY` risk) remain fully preserved as
historical/reference material — they describe the *existing* Laravel
application's data behavior, which is still the specification the new
application must reproduce, regardless of what stores the ported data. See
`docs/DATABASE-ANALYSIS-MARIADB-SOURCE.md` for the consolidated analysis.

**OI-6 is unchanged — still OPEN, still blocking M3.** This addendum affects
OI-2 only.

---

## ADDENDUM (2026-08-16, second) — OI-6 CLOSED: FRESH PRODUCTION EXPORT SUPPLIED AND VERIFIED

**Append-only note. Nothing above this line was altered.**

The owner supplied a fresh production Laravel source export at `public_html/`
(project root, sibling to `spakshomeopathy.com/`). Full verification record:
`docs/OI-6-RESOLUTION.md`.

**OI-6 is now: CLOSED.** Lightweight structural/provenance verification (not an
exhaustive diff — per owner instruction) confirmed genuine Laravel 5.8 structure,
matching controller/route inventory, and — most importantly — independent
corroboration against content M1 had already captured directly from live production
(the BHMS body-text correction, the 6-YouTube-embed count) that the stale local
backup never had. One genuine piece of drift was found and characterized: a new
`Alldiseases()` controller method / `/all-diseases` route / view, absent from the
stale local backup entirely. All other live controllers verified byte-identical
(MD5) to the stale local copy.

**Going forward, `public_html/` (root level only — three unrelated sibling projects
found alongside it were confirmed out of scope and not touched) supersedes
`spakshomeopathy.com/` as the rank-4 Laravel source of truth (contract §11).**
`spakshomeopathy.com/` was not deleted (NN-10) and remains for historical reference.

**This does not authorize M3.** OI-6 was the sole *documented blocker* in this
report's own outstanding-issues table, but the owner has separately and explicitly
required their own affirmative authorization before M3 begins, independent of
OI-6's status. See `docs/OI-6-RESOLUTION.md` §6 for the full updated status table.

---

*End of Milestone 0 Gate Report v2.0*

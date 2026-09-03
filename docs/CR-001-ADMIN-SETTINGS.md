# CHANGE REQUEST CR-001 — Admin-Editable Site Settings

**Raised by:** Migration Implementer
**Date:** 2026-08-10
**Requested by:** Owner (homeopathy38@gmail.com), 2026-08-10
**Milestone:** Proposed **M14** (new, post-cutover) — see §17
**Contract version:** 1.0
**Status:** 🔒 **DEFERRED — POST-CUTOVER** (Owner decision, 2026-08-10)

> **NOTHING HAS BEEN IMPLEMENTED, AND NOTHING WILL BE UNDER THIS CONTRACT.**
> No database was modified, no admin panel code written, no Next.js application
> file changed. See **§24 OWNER DECISION** for the binding disposition.

---

## ⛔ OWNER DECISION — 2026-08-10 — READ FIRST

| Item | Disposition |
|---|---|
| **Category A** (existing Laravel admin functionality) | ✅ **APPROVED as normal 1:1 migration.** No CR needed, no settings system. Migrate faithfully in M9–M11. |
| **Category B** (new settings feature) | 🔒 **DEFERRED to POST-CUTOVER.** Owner wants it *eventually*; **not during this migration.** |
| **Group 3** (5% fee, delivery charge, pagination, other frozen constants) | ❌ **EXPLICITLY EXCLUDED — permanently.** Must remain identical to Laravel. |
| **`site_settings` table + unique index** | 🔒 **DEFERRED.** Do not introduce. DB design reopens with the post-cutover CR. |
| **`PublicHeader` / `PublicFooter` / `AdminSidebar`** | 🚫 **DO NOT MODIFY** for settings purposes. No async rendering, no new data fetching. |
| **Migration priority** | ▶️ **Continue the 1:1 migration.** This CR must not block existing milestones. |

**Consequence:** §12's static→dynamic conversion and §18's three-file
modification risk are **both avoided entirely** — neither is now in scope.
The 9 migrated pages remain `○ (Static)` prerendered.

**Successor:** **CR-002** (to be opened post-cutover) — see §24.4.

---

## 0. SUMMARY

The owner requests a **new** admin-editable settings system so a non-technical
administrator can change configurable site values from the admin panel instead
of requiring a code change and redeploy.

**This functionality does not exist in the Laravel application.** Verified:

```
grep -nE "setting|config|option|general" routes/web.php   → NO MATCHES
grep -nE "setting|config|option" routes/admin.php          → NO MATCHES
grep -nE "function.*(Setting|Config|Option)" Controllers/  → NO MATCHES
Live schema (34 tables)                                    → NO settings table
```

It is therefore a **pure addition**, forbidden by default under NN-2, IR-1 and
F-14, and only permissible via this Change Request.

---

## 1. EXACT NEW FUNCTIONALITY REQUESTED

A single admin screen, **Admin → Settings**, presenting a form of configurable
site values. On save, values persist to the database and are read by the public
site at render time.

**In scope of this CR:**

| # | Capability |
|---|---|
| N-1 | A new admin route/screen listing all editable settings |
| N-2 | Persistent storage for setting values |
| N-3 | Server-side read of those values when rendering public pages |
| N-4 | Server-side validation on save |
| N-5 | Seeded defaults equal to today's hardcoded values |
| N-6 | Admin-only access control |

**Explicitly NOT in scope of this CR** (would each need their own CR):

- Multi-language / localisation of settings
- Per-user or per-role setting overrides
- Setting version history, audit log, or rollback UI
- Import/export of settings
- Caching layer (contract **F-28** forbids caching)
- Making *any* value editable beyond the list in §2
- Changing the appearance of the public site in any way other than substituting
  a value a human explicitly edits

---

## 2. VALUES PROPOSED TO BECOME EDITABLE

**This is the complete proposed list. Nothing beyond it is included.**

Grouped by risk, because they are not equivalent.

### 2.1 Group 1 — Presentational contact details (LOW risk)

Currently hardcoded in Blade partials; appear on every public page.

| ID | Setting | Current value |
|---|---|---|
| S-01 | Header/footer email | `spakshomeopathy@gmail.com` |
| S-02 | Header/footer phone | `+91 8700458818` |
| S-03 | Footer address | `E-38, Budh Vihar, Badarpur, New Delhi 110044` |
| S-04 | Footer company name | `Spaks India Business Solution Pvt Ltd` |
| S-05 | Footer copyright line | `© 2020 spakshomeopathy \| All Right Reserved` |
| S-06 | Facebook URL | `https://www.facebook.com/spaks.homeopathy.16` |
| S-07 | Instagram URL | `https://www.instagram.com/spakshomeopathy38/` |
| S-08 | YouTube URL | `https://www.youtube.com/channel/UCheXjhoIQFgLMyOY027cGEQ` |

### 2.2 Group 2 — Operational (MEDIUM risk)

| ID | Setting | Current value | Note |
|---|---|---|---|
| S-09 | Enquiry email recipient | `gauravsvm07@gmail.com` | **This is Owner Decision D-03**, already pending. See §11.2. |

### 2.3 Group 3 — Business logic (HIGH risk — recommend EXCLUDING)

Listed for completeness because "configurable website options" could be read to
include them. **I recommend these be explicitly excluded from approval.**

| ID | Setting | Current value | Why excluding is safer |
|---|---|---|---|
| S-10 | Admin fee percentage | `5` | Frozen by **F-15**; stored on historical orders (P-17). Editing changes financial arithmetic. |
| S-11 | Delivery charge | `0` | Frozen by **F-15**; P-09 records the `shipping` table as deliberately unused. |
| S-12 | Pagination sizes | 8/10/20/24/60/75 | Frozen by **F-27**; each call site differs deliberately (§5.2). |

> **Recommendation: approve Groups 1 and 2 only.** Group 3 changes *behavior*,
> not *content*, and would make the migration's row-for-row parity (NN-6)
> unverifiable, because the same input could produce different DB writes
> depending on a mutable setting. If the owner wants Group 3, it should be a
> separate CR after cutover, with its own test plan.

---

## 3. WHERE EACH VALUE CURRENTLY EXISTS IN THE LARAVEL SOURCE

Verified by direct inspection of the Laravel tree.

| ID | File | Line | Current literal |
|---|---|---|---|
| S-01 | `resources/views/inc/header.blade.php` | 4 | `spakshomeopathy@gmail.com` |
| S-01 | `resources/views/inc/footer.blade.php` | 17 | `spakshomeopathy@gmail.com` |
| S-02 | `resources/views/inc/header.blade.php` | 5 | `+91 8700458818` |
| S-02 | `resources/views/inc/footer.blade.php` | 26 | `+91 8700458818` |
| S-03 | `resources/views/inc/footer.blade.php` | 36 | `E-38, Budh Vihar, Badarpur, New Delhi 110044` |
| S-04 | `resources/views/inc/footer.blade.php` | — | company name heading |
| S-05 | `resources/views/inc/footer.blade.php` | — | copyright paragraph |
| S-06–S-08 | `resources/views/inc/footer.blade.php` | 52–56 | social anchor `href`s |
| S-09 | `app/Http/Controllers/HomeController.php` | **335** | `$message->to('gauravsvm07@gmail.com', 'Zeintext')` |
| S-10 | `app/Http/Controllers/HomeController.php` | **530** | `$fee=($TotalPrice*5)/100;` |
| S-11 | `app/Http/Controllers/HomeController.php` | — | delivery hardcoded `0`; `shipping` lookup commented out (§7.3, P-09) |
| S-12 | across controllers | — | `paginate(8|10|20|24|60|75)` |

**Note:** S-01 and S-02 each appear in **two** partials. Both call sites must
resolve to the same setting, or the header and footer could disagree.

---

## 4. WHERE EACH VALUE IS CURRENTLY DISPLAYED OR USED

| ID | Surface | Reach |
|---|---|---|
| S-01 | Top bar (`mailto:` link) + footer Email widget | **Every public page** |
| S-02 | Top bar (`callto:` link) + footer Phone widget | **Every public page** |
| S-03 | Footer Address widget | Every public page |
| S-04 | Footer company heading | Every public page |
| S-05 | Footer bottom copyright | Every public page |
| S-06–S-08 | Footer social icons | Every public page |
| S-09 | **Not displayed.** Recipient of the enquiry email sent by `saveEnq` | Contact-form submissions |
| S-10 | Not displayed. Written to `payments` on order creation | Checkout (M6) |
| S-11 | Displayed in cart/checkout totals as `0` | Cart, checkout |
| S-12 | Row counts on listing pages | Catalog + admin lists |

Because S-01–S-08 render inside `PublicHeader`/`PublicFooter`, **a change to any
of them affects every migrated public page simultaneously** — which is precisely
why §18 treats this as a parity risk.

---

## 5. PROPOSED ADMIN UI

**New screen:** `/admin/settings` (GET form, POST save).

Deliberately modelled on the **existing** admin CRUD screens (e.g. `add-slider`,
`edit-pincode`) so it inherits AdminLTE 2 markup already in the project and
introduces no new design language — consistent with IR-1 in spirit even though
this screen has no Laravel counterpart.

```
Admin → Settings
┌──────────────────────────────────────────────┐
│ Contact Details                              │
│   Email          [spakshomeopathy@gmail.com] │
│   Phone          [+91 8700458818           ] │
│   Address        [E-38, Budh Vihar, ...    ] │
│   Company Name   [Spaks India Business ... ] │
│   Copyright      [© 2020 spakshomeopathy...] │
│                                              │
│ Social Links                                 │
│   Facebook       [https://facebook.com/... ] │
│   Instagram      [https://instagram.com/...] │
│   YouTube        [https://youtube.com/...  ] │
│                                              │
│ Notifications                                │
│   Enquiry email  [gauravsvm07@gmail.com    ] │
│                                              │
│            [ Save Settings ]                 │
└──────────────────────────────────────────────┘
```

**Sidebar:** adding a "Settings" link modifies `AdminSidebar.tsx`, which is a
**1:1-migrated component**. See §18 — this is the one unavoidable touch-point
with already-migrated code, and it is why I recommend a gated rollout.

---

## 6. PROPOSED DATABASE / CONFIGURATION STRUCTURE

### 6.1 New table

```sql
CREATE TABLE `site_settings` (
  `id`          INT(11)      NOT NULL AUTO_INCREMENT,
  `key_name`    VARCHAR(64)  NOT NULL,
  `value`       TEXT         NULL,
  `updated_by`  INT(11)      NULL,
  `updated_at`  TIMESTAMP    NULL DEFAULT CURRENT_TIMESTAMP
                             ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_site_settings_key` (`key_name`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
```

**Key-value, not a wide column-per-setting table** — adding a future setting
becomes a row insert rather than a schema migration, which matters under D-10's
shared-database constraint (§11.3).

### 6.2 Contract tensions this creates — stated plainly

| Constraint | Tension | Assessment |
|---|---|---|
| **F-5** (no renaming/dropping tables or columns) | Not violated — purely additive | ✅ |
| **F-21** (no unique indexes) | **`uq_site_settings_key` IS a unique index.** F-21 protects the *legacy* schema from constraints that could reject existing dirty data. A brand-new table has no legacy rows. | ⚠️ **Needs explicit approval.** Alternative: drop the unique key and enforce uniqueness in application code. Less safe, but strictly F-21-compliant. **Owner must choose.** |
| **§5.3** (additive indexes only) | The new table is not covered by the pre-approved list | ⚠️ Requires this CR |
| **D-10** (30-day shared-DB rollback) | The PHP app will not know this table exists | ✅ Safe — PHP ignores it. **But see §10.2.** |
| `charset=latin1` | Matches the existing schema, not chosen for merit | Deliberate: consistency with the live DB. **Note:** latin1 cannot store non-Latin characters — if the owner needs Hindi/Devanagari in any setting, this must be `utf8mb4`. **Flagged for decision.** |

### 6.3 Rejected alternative

**Environment variables.** Rejected because §5.3 permits externalising values to
env vars *only without changing them*, and env vars are not editable by a
non-technical admin without a redeploy — which is the entire point of the
request.

---

## 7. AUTHENTICATION AND AUTHORIZATION

Must reuse the **existing** admin gate, not a new one.

| Requirement | Basis |
|---|---|
| Route sits behind the migrated `userAuth` equivalent | `routes/admin.php:6` |
| Only `utype = 1` may read or write | `UserAuth.php:20` rejects utype 2/3/4 and guests |
| Role mismatch destroys the session (`Auth::logout()`) | **P-12** — preserved behavior; the new screen must not deviate |
| POST protected by the same CSRF/Server-Action protection as other admin forms | §5.1 |
| `updated_by` records the acting admin's user id | New; supports auditability |

**No new roles, no new permission model, no per-setting permissions.** Anything
finer-grained is out of scope.

---

## 8. VALIDATION REQUIREMENTS

This is a **new** form, so IR-5 ("copy validation exactly") has nothing to copy.
Validation is therefore designed, not ported — and must be stated explicitly.

| Setting | Rule | On failure |
|---|---|---|
| S-01 email | required, valid email, ≤255 | reject, redisplay with error |
| S-09 enquiry email | required, valid email, ≤255 | reject |
| S-02 phone | required, ≤32 | reject |
| S-03 address | required, ≤255 | reject |
| S-04 company | required, ≤255 | reject |
| S-05 copyright | required, ≤255 | reject |
| S-06–S-08 URLs | required, must parse as `http`/`https` | reject |

**All values HTML-escaped on output.** These render inside the shared header and
footer on every public page; an unescaped setting would be a stored-XSS vector
reaching the entire site. Note this **deliberately differs** from P-14/R-30,
where the Laravel app's `{!! !!}` unescaped output is faithfully reproduced —
that preservation applies to *migrated* content fields, **not** to a new input
surface introduced by this CR. Escaping here is a design decision, not a
migration deviation.

**Rejected input must not partially save.** All-or-nothing per submission.

---

## 9. DEFAULT VALUES

Seeded to **exactly** the current hardcoded literals in §3, so that immediately
after deployment and before any admin edit, **rendered output is byte-identical
to today's**. This is what makes §18's "no impact until used" claim testable.

Seed = the table in §2 verbatim, including `© 2020` (not the current year) and
the existing `gauravsvm07@gmail.com` recipient (until D-03 is separately
resolved).

**If a setting row is missing or its value is NULL/empty at render time, the
code falls back to the hardcoded literal**, which remains in the source as the
default. The site can never render blank because a row was deleted.

---

## 10. BACKWARD COMPATIBILITY BEHAVIOR

### 10.1 Before any edit
Byte-identical output to the current migrated app. Verifiable by re-running the
existing V-01/V-02 suites unchanged.

### 10.2 During the D-10 shared-database rollback window

**This is the most important compatibility consequence, and it is one-way:**

| Scenario | Result |
|---|---|
| Admin edits a setting in Next.js, no rollback | Next.js reflects it; PHP app does **not** (it reads its own hardcoded Blade literals) |
| Admin edits a setting, then rollback to PHP | **The edit silently disappears** from the live site. The row survives in `site_settings`, but PHP never reads it. |

**The two applications would display different contact details for the duration
of any rollback.** This is not a defect in the design — it is inherent to adding
a feature to only one side of a dual-run cutover, and it is the single strongest
argument for scheduling this work **after** the rollback window closes (§17).

### 10.3 Rollback of this feature itself
Drop the read path; the hardcoded fallbacks in §9 take over. No data loss (the
table can be left in place, per NN-10 the rows are never deleted).

---

## 11. IMPACT ON EXISTING LARAVEL BEHAVIOR

### 11.1 Direct impact: **none**
The Laravel application is not modified. It continues reading its Blade
literals. NN-1 (Laravel is the specification) is unaffected — this CR does not
claim the PHP app does something it does not.

### 11.2 Interaction with Owner Decision D-03
**S-09 overlaps D-03.** D-03 (enquiry recipient) is *already* pending with a
documented default of "preserve current recipient". If this CR is approved
including S-09, then:

- D-03's decision becomes *how to seed the default*, not *whether to hardcode*
- The owner can change the recipient themselves afterwards without a code change

**These must not be resolved independently or they will contradict.** I
recommend D-03 be answered as "seed current value; owner edits post-launch".

### 11.3 Interaction with D-10
See §10.2. If the owner chooses a 30-day warm rollback (D-10's recommended
default), this feature should not be enabled to admins during that window.

---

## 12. IMPACT ON THE NEXT.JS ARCHITECTURE

| Area | Impact |
|---|---|
| New DB read | `PublicHeader`/`PublicFooter` become **async** server components reading `site_settings` |
| Query count | **+1 DB query per public page render** (or one shared read per request) |
| Caching | **None may be added** — F-28 forbids caching. So the query runs on every render. |
| Static rendering | ⚠️ **The 9 M1 pages are currently `○ (Static)` prerendered.** Reading a database at render time converts them to dynamic. This is a **material architecture change**, visible in the build output, and it affects response characteristics for every public page. |
| Admin surface | New route + form + server action, following existing admin patterns |
| Component signature | `PublicHeader`/`PublicFooter` gain props or become async — both are 1:1-migrated components (§18) |

> **The static→dynamic conversion is the largest technical consequence of this
> CR** and the owner should weigh it deliberately. §8.3 states the project is
> not measured on page speed, so this is not a contract violation — but it is a
> real change to how every public page is served, and it cannot be mitigated by
> caching because F-28 forbids it.

---

## 13. SECURITY IMPLICATIONS

| Risk | Severity | Mitigation |
|---|---|---|
| **Stored XSS** — settings render on every public page | **HIGH** | Mandatory HTML escaping (§8). Must **not** use `dangerouslySetInnerHTML` for any setting value. |
| **Unauthorized edit** — a non-admin reaching the form | HIGH | Reuse `utype=1` gate + CSRF (§7); never a client-side-only check |
| **Open-redirect / malicious social URLs** | MEDIUM | Scheme whitelist `http`/`https` (§8) |
| **Email redirection** — S-09 rerouting all customer enquiries | **MEDIUM–HIGH** | This makes lead-theft a UI action rather than a code change. Format validation only; consider restricting to admins and logging `updated_by`. |
| Expanded attack surface | MEDIUM | The admin panel currently has **no rate limiting, no 2FA, no password strength** (§3.3, F-24) — all deferred. This CR adds a new authenticated write surface to an admin panel with known-weak auth. **Not a blocker, but the owner should know the exposure grows.** |

**Notably, this CR does not require weakening anything.** It adds a surface, and
that surface inherits the admin panel's existing (deferred) weaknesses.

---

## 14. TESTING REQUIREMENTS

| Cat | Requirement |
|---|---|
| **V-01 UI Parity** | With seeded defaults, all 9 migrated pages must remain **byte-identical**. This is the primary regression gate. |
| **V-02 Responsive** | Desktop/tablet/mobile screenshots unchanged with defaults (currently desktop 9/9 green) |
| **V-03 Route Parity** | `/admin/settings` is **new** — it has no production counterpart, so it is tested against this CR's spec, not against a baseline |
| **V-04 Authentication** | Guest → rejected; `utype=3` buyer → rejected + forced logout (P-12); `utype=1` → allowed |
| **V-05 DB Writes** | Save writes exactly one row per key; no other table touched |
| **V-06 DB Reads** | Header/footer read resolves correct values; missing row → hardcoded fallback |
| **V-07 Forms** | Valid / invalid / partial / empty submissions |
| **V-08 Validation** | Every rule in §8, including the escaping assertion |
| **V-09 Emails** | Enquiry mail goes to the **configured** S-09 recipient |
| **V-12 Error Handling** | DB unavailable → falls back to hardcoded defaults, page still renders |
| **V-13 Console** | Zero new console errors |
| **V-14 Network** | Unchanged asset requests |
| **Regression (T-8)** | **All prior milestone tests must still pass**, including OI-10 widget parity and OI-13 whitespace parity |
| **Security** | XSS attempt via each field is escaped, not executed |

**New-code test requirement:** because this is new functionality, tests are
written against this CR's specification (T-9's "test against observed PHP
behavior" cannot apply — there is no PHP behavior to observe).

---

## 15. MIGRATION CONTRACT RULES THIS CHANGE OVERRIDES

Approving this CR grants a **precedence-rank-1 Owner Decision** overriding:

| Rule | Text | How it is overridden |
|---|---|---|
| **NN-2** | No silent changes | Not overridden — **satisfied** by this CR existing |
| **IR-1** | Never redesign UI | New admin screen has no Laravel counterpart to preserve |
| **F-14** | No removing/adding vestigial functionality | **Adding** a feature absent from Laravel |
| **§3.2** | "Adding features, pages, fields, filters" excluded | Directly overridden |
| **§2.4** | Anything not in 2.1–2.3 is out of scope | Overridden by this Part 6 approval |
| **F-21** | No unique indexes | ⚠️ Only if the owner approves `uq_site_settings_key` (§6.2) |
| **§5.3** | Only listed additive infra changes pre-approved | Extended to include the new table |
| **NN-5** | Rendered DOM must match | **Conditionally** — identical with defaults; **intentionally divergent once an admin edits a value.** This is the point of the feature. |
| **NN-1** | Laravel is the specification | For this feature only, **this CR** becomes the specification |

**Not overridden, and must still hold:** F-28 (no caching), F-5 (no
renaming/dropping), NN-6 (write parity for *migrated* flows), NN-10 (no data
deletion), F-24 (no new auth mechanisms), P-12 (forced logout preserved).

---

## 16. FILES / MODULES AFFECTED

### 16.1 New files
```
src/app/admin/settings/page.tsx          admin form (server component)
src/actions/settings.ts                  server action: validate + save
src/lib/queries/settings.ts              read/write helpers
src/lib/settings/defaults.ts             hardcoded fallbacks (§9)
tests/…/settings.*.spec.ts               new tests
Database migration for `site_settings`   additive DDL
```

### 16.2 Modified files — **already-migrated code**
```
src/components/layout/PublicHeader.tsx   read S-01, S-02 (async/props)
src/components/layout/PublicFooter.tsx   read S-01..S-08 (async/props)
src/components/admin/AdminSidebar.tsx    add "Settings" link
```

> These three are **1:1-migrated components** verified against production.
> Touching them is the principal regression risk and the reason for §18's
> conclusion. `AdminSidebar.tsx` additionally carries **OI-1b** — it has never
> been verified against production because admin credentials are still
> outstanding. Modifying an unverified component compounds that gap.

### 16.3 Explicitly NOT modified
`LegacyScriptRunner.tsx`, any Laravel file, any static asset, any other page.

---

## 17. WHICH MILESTONE SHOULD CONTAIN THIS WORK

**Recommendation: a new Milestone 14, after M13 cutover.**

| Option | Assessment |
|---|---|
| Fold into M9 (Admin core) | ❌ M9's scope is *migrating* admin routes 1:1. Mixing new functionality into a fidelity milestone makes its gate unverifiable — a V-01 failure becomes ambiguous between "port is wrong" and "new feature changed it". |
| Now, during M1 | ❌ M1's gate is still open (OI-1a/1b, OI-14/15/16). Adding scope to an unclosed milestone violates NN-11. |
| **New M14, post-cutover** | ✅ Cleanest. Migration fidelity is proven and signed first; the new feature is then built against a stable, verified baseline. Also sidesteps the §10.2 rollback divergence entirely, since the window will have closed. |
| Follow-on Remediation Project (§3.4) | ✅ Also defensible — this is functionally an enhancement, which is exactly what §3.4 exists for. |

**M14 must not begin until M13 is signed off** (NN-11).

---

## 18. CAN IT BE IMPLEMENTED WITHOUT AFFECTING EXISTING MIGRATED FUNCTIONALITY?

**Qualified yes — with two honest caveats.**

### Where the answer is genuinely "yes"
With defaults seeded to the current literals (§9), rendered output is
**byte-identical** before any admin edit. The V-01/V-02 suites should pass
unchanged, and that is directly testable.

### Caveat 1 — three migrated files must be modified
`PublicHeader.tsx`, `PublicFooter.tsx` and `AdminSidebar.tsx` (§16.2) are
verified 1:1 ports. The risk is not the *values* but the *refactor*: making
these components async or prop-driven is exactly the kind of change that
reintroduced OI-13-class whitespace defects. **Mitigation:** re-run the full
OI-13 whitespace measurements and the desktop screenshot suite after the change,
treating any deviation as a blocker.

### Caveat 2 — static→dynamic is unavoidable
Reading the DB at render time converts the 9 currently-prerendered pages to
dynamic (§12), and F-28 forbids caching the read. Output is unchanged; **how it
is produced is not.**

### And the intended, permanent divergence
Once an admin edits a value, the Next.js app **deliberately no longer matches
the Laravel app**. That is the feature working as requested — but it means
**S-11 ("every deviation traces to an approved CR") is satisfied only by this
document**, and future V-01 runs must compare against *expected configured
values*, not the frozen production baseline. Whoever runs M13's final
verification needs to know that.

---

## 19. CATEGORY A vs CATEGORY B — EXPLICIT SEPARATION

As requested, distinguishing what is already Laravel functionality from what is
genuinely new.

### CATEGORY A — Existing Laravel admin functionality: migrate 1:1, **NOT part of this CR**

These already exist and are **already in scope** under the normal migration
(blueprint §3.3, milestones M9–M11). They need **no** Change Request, and this
CR neither covers nor alters them:

| Existing admin capability | Route evidence |
|---|---|
| Product category add/edit/delete | `routes/admin.php:25,28,37` |
| Product subcategory add/delete | `routes/admin.php:29,38` |
| Other category add | `routes/admin.php:33` |
| Post add/edit/update/delete | `routes/admin.php:41,44,45,46` |
| Product add/edit/delete, status, trending | `routes/admin.php:49,51,55,57,59` |
| Category edit | `routes/admin.php:53` |
| Herb category add | `routes/admin.php:48` |
| **Slider** add/save/edit/update | `routes/admin.php:103,104,105,106` |
| **Pincode** save/edit/update/delete | `routes/admin.php:98,99,100,101` |
| Admin profile / password update | `routes/admin.php:11,12` |
| User status update | `routes/admin.php:20` |

> **Important:** if what the owner actually wants is "the admin can manage site
> content," much of that **already exists** and simply needs migrating — no CR
> required. Sliders in particular are admin-managed today (though **P-18**
> records that the homepage ignores them). **If the real intent is covered by
> Category A, this CR may be unnecessary and should be withdrawn.**

### CATEGORY B — New functionality requiring this CR

| # | New capability | Laravel equivalent |
|---|---|---|
| B-1 | `site_settings` storage | **None** — no such table in the 34-table schema |
| B-2 | `/admin/settings` screen | **None** — no settings route in `web.php` or `admin.php` |
| B-3 | Editable header/footer contact details (S-01–S-05) | **None** — hardcoded in Blade partials |
| B-4 | Editable social URLs (S-06–S-08) | **None** — hardcoded in `footer.blade.php` |
| B-5 | Editable enquiry recipient (S-09) | **None** — hardcoded at `HomeController.php:335` |
| B-6 | Settings-aware header/footer rendering | **None** |

**Everything in Category B is new. Nothing in Category A is included here.**

---

## 20. WHAT THIS CR DELIBERATELY DOES NOT INCLUDE

Stated explicitly so approval cannot be read as broader than intended:

- ❌ Group 3 business-logic values (S-10/S-11/S-12) — **recommended excluded** (§2.3)
- ❌ Any change to pricing, fees, order/GroupId generation, or status codes
- ❌ Any fix to a BROKEN item (Register 9.2)
- ❌ Any change to the 17 preserved defects (§9.4)
- ❌ Caching (F-28)
- ❌ Rate limiting, 2FA, password strength (F-24, §3.3)
- ❌ Sitemap/canonical/OG tags (F-19)
- ❌ Any modification to `LegacyScriptRunner.tsx` or the jQuery interop
- ❌ Any resolution of OI-14, OI-15, or OI-16
- ❌ Starting Milestone 2

---

## 21. OPEN QUESTIONS REQUIRING OWNER DECISION

Approval should answer these; I have not assumed answers.

| # | Question | My recommendation |
|---|---|---|
| Q-1 | Approve Groups 1 & 2 only, or include Group 3? | **Groups 1 & 2 only** (§2.3) |
| Q-2 | Allow the unique index, overriding F-21? | **Yes** — new table, no legacy data (§6.2) |
| Q-3 | `latin1` or `utf8mb4`? | **utf8mb4 if any non-Latin text is ever needed**; otherwise latin1 for consistency (§6.2) |
| Q-4 | Which milestone? | **New M14, post-cutover** (§17) |
| Q-5 | How does this interact with D-03? | **Seed current recipient; owner edits post-launch** (§11.2) |
| Q-6 | Enable during the D-10 rollback window? | **No** — avoids dual-app divergence (§10.2) |
| Q-7 | Is Category A actually what you wanted? | **Confirm before approving** — it may make this CR unnecessary (§19) |

---

## 22. APPROVAL

```
Owner decision:   [ ] APPROVED   [ ] REJECTED   [X] APPROVED WITH CONDITIONS
                                                    (deferral — see §24)

Groups approved:  [ ] Group 1 (presentational)   → DEFERRED to CR-002
                  [ ] Group 2 (enquiry recipient) → DEFERRED to CR-002
                  [X] Group 3 EXCLUDED PERMANENTLY (owner: "must remain
                      identical to Laravel")

Owner:  homeopathy38@gmail.com          Date: 2026-08-10
```

**No entry is made in the contract's Approved Deviation Log (§22).** That log
records deviations **implemented** under this contract; CR-001 implements none.
DEV-001 will be allocated to **CR-002** if and when it is approved post-cutover.

---

## 23. IMPLEMENTATION STATUS

| Item | Status |
|---|---|
| Database modified | ❌ **NO** |
| `site_settings` table created | ❌ **NO** — deferred (§24.2) |
| Admin panel modified | ❌ **NO** |
| Next.js application modified | ❌ **NO** |
| `PublicHeader` / `PublicFooter` / `AdminSidebar` modified | ❌ **NO** |
| Async rendering / new data fetching introduced | ❌ **NO** |
| Laravel source modified | ❌ **NO** |
| Milestone 2 begun | ❌ **NO** |
| Files created | **This document only** |

---

## 24. OWNER DECISION RECORD — 2026-08-10

Binding disposition. Answers §21's open questions.

### 24.1 Category A — approved as normal 1:1 migration

Existing Laravel admin functionality is **ordinary in-scope migration work**,
requiring **no** Change Request and **no** settings system:

| Capability | Route evidence | Milestone |
|---|---|---|
| Product CRUD, status, trending | `routes/admin.php:49,51,55,57,59` | M9–M10 |
| Category / subcategory / other-category CRUD | `:25,28,29,33,37,38,53` | M9 |
| Post / blog CRUD | `:41,44,45,46` | M10 |
| Herb category add | `:48` | M10 |
| **Slider** management | `:103,104,105,106` | M10–M11 |
| **Pincode** management | `:98,99,100,101` | M11 (reproduces **B-09**) |
| User status management | `:20` | M9 |
| Admin profile / password | `:11,12` | M9 |
| Any other existing admin function verified in source | blueprint §3.3 (~102 routes incl. ~30 unlinked) | M9–M11 |

**Owner instruction: "Do NOT create a new settings system for these. Simply
migrate the existing Laravel functionality faithfully."**

Standard contract rules therefore govern these unchanged — **NN-4** (broken
stays broken: pincode CRUD must still throw its SQL error, B-09), **NN-8** (no
feature removal, including the ~30 unlinked admin routes), **IR-9**, and
**P-18** (sliders remain admin-managed but unused by the homepage).

### 24.2 Category B — DEFERRED to post-cutover

Deferred in full: header contact details, footer contact details, social URLs,
enquiry recipient (S-01 … S-09), plus the `site_settings` table and its unique
index.

- Owner **does** want this eventually — it is deferred, **not rejected**.
- **Not implemented during the Laravel → Next.js migration.**
- Implemented only after the Next.js application is the production source of
  truth, under **CR-002**.
- Database design (§6) reopens with CR-002. **No table, no index, now.**

**This resolves §10.2's rollback divergence and §11.3's D-10 interaction: with
Category B deferred past cutover, the shared-database window closes before any
setting exists, so the two applications can never disagree.**

### 24.3 Group 3 — permanently excluded

The 5% admin fee, delivery charge, pagination sizes, and any other frozen
business-logic constant are **not** to become admin-configurable — not now, and
not in CR-002. Owner: *"These must remain identical to Laravel."*

Governing rules remain fully in force: **F-15** (business logic frozen),
**F-27** (pagination sizes frozen), **P-09** (delivery charge hardcoded `0`),
**P-17** (5% fee arithmetic preserved), **NN-6** (row-for-row write parity).

### 24.4 Successor — CR-002 (not yet opened)

| Field | Value |
|---|---|
| ID | **CR-002 — Admin-Editable Site Settings (post-cutover)** |
| Opens | After **M13 cutover** is signed off and Next.js is the production source of truth |
| Inherits | §§1–19 of this document (analysis remains valid) |
| Scope | Category B only — S-01…S-09. **Never Group 3.** |
| Must re-decide | Q-2 unique index / F-21, Q-3 charset, and whether §12's static→dynamic conversion is acceptable **at that time** |
| Precondition | M13 signed; D-10 rollback window closed |

**CR-002 does not exist yet and must not be pre-approved by this document.**

### 24.5 Protected components — do not touch for settings

**`PublicHeader.tsx`, `PublicFooter.tsx`, `AdminSidebar.tsx` must NOT be
modified for settings purposes**, and **no async rendering or new data fetching
may be introduced into them** under this request.

They remain governed solely by the migration contract. In particular the
**OI-13 whitespace/parity work stands unchanged** — the explicit `{' '}`
separators reproducing Blade's significant whitespace are migration fidelity
under **NN-5**, entirely independent of this CR, and are not to be revisited
because of it.

### 24.6 Migration priority

**The 1:1 migration continues as the active work.** This CR blocks no milestone
and is not a prerequisite for any. It is dormant until CR-002 is opened.

### 24.7 Answers to §21

| # | Question | Owner decision |
|---|---|---|
| Q-1 | Groups 1 & 2 only, or include Group 3? | **Neither now.** Groups 1 & 2 → deferred to CR-002. Group 3 → **excluded permanently**. |
| Q-2 | Allow unique index (override F-21)? | **Deferred** — no table is created; **F-21 remains unbroken.** |
| Q-3 | latin1 or utf8mb4? | **Deferred** to CR-002. |
| Q-4 | Which milestone? | **None in this contract.** Post-cutover, after M13. The proposed "M14" is **withdrawn** from this contract's milestone sequence. |
| Q-5 | Interaction with D-03? | **D-03 stands on its own**, unchanged, with its documented default (preserve current recipient) unless the owner answers it separately. CR-001 does not resolve it. |
| Q-6 | Enable during D-10 rollback window? | **Moot** — deferral places the work after the window. |
| Q-7 | Is Category A what you wanted? | **Confirmed:** Category A is normal migration; Category B is genuinely new and deferred. |

### 24.8 Net effect on the contract

**No contract rule is overridden. §15 is void in practice.** Because nothing is
implemented, NN-2, IR-1, F-14, F-21, §2.4, §3.2 and NN-5 all remain **fully in
force**, unmodified. The Approved Deviation Log stays **empty**.

---

*End of Change Request CR-001 — DEFERRED, POST-CUTOVER*


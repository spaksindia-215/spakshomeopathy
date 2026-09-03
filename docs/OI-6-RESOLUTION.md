# OI-6 RESOLUTION — Fresh Production Laravel Source Export

**Status:** ✅ **CLOSED**
**Date:** 2026-08-16
**Closed by:** Migration Implementer, on owner-supplied export + owner instruction to
perform lightweight integrity/provenance verification (not exhaustive diff-blocking)
**Contract version:** 1.0

---

## 0. WHAT OI-6 WAS

Opened in `docs/GATE-REPORT-M0.md` (§10): *"Local source is stale vs production
(BCN-03). Fresh production code export needed."* Blocking for M3 per contract §27 —
without it, logic-level drift between the local Laravel backup and what is actually
running in production is undetectable, and M3 ports business logic/controllers.

---

## 1. WHAT WAS PROVIDED, AND THE PROVENANCE PROBLEM THAT HAD TO BE RESOLVED FIRST

The owner supplied a path: `public_html/`. On inspection, that path contained **four
separate Laravel projects**, not one:

| Directory | `APP_URL` | Disposition |
|---|---|---|
| `public_html/` (root) | `https://spakshomeopathy.com` | **This is the Spaks Homeopathy export** |
| `public_html/babasahebsamaj/` | `http://localhost` | Unrelated project, sibling on the same hosting account |
| `public_html/meenaparivaar/` | `http://localhost` | Unrelated project, sibling on the same hosting account |
| `public_html/spakseducation/` | `https://spakseducation.spakshomeopathy.com`, contains a file named `SPAKS EDU OLD BACKUP` | Unrelated project (a different subdomain's site), sibling on the same hosting account |

This is consistent with a shared-hosting document root serving multiple client sites
under one account. **The owner confirmed the root-level directory is the intended
export; the three sibling directories were not analyzed further and were not touched.**
This document and the verification below concern the root-level `public_html/` only.

---

## 2. LIGHTWEIGHT INTEGRITY/PROVENANCE VERIFICATION PERFORMED

Per the owner's explicit instruction — a lightweight structural/provenance check, **not**
an exhaustive line-by-line diff, and **not** treating drift from the old local backup as
a blocker in itself:

### 2.1 Structural integrity — expected Laravel layout present

```
app/ bootstrap/ config/ database/ public/ resources/ routes/ storage/   → all present
artisan, composer.json, .env                                            → all present
composer.json: "php": "^7.1.3", "laravel/framework": "5.8.*"            → matches
```

### 2.2 Controller/route inventory — matches the known route table

All expected controllers present: `AdminController.php` (+ the dated `-old-4-1-2023`
backup, consistent with what blueprint §1.2 already documents as existing in
production), `HomeController.php`, `CartController.php`, `BuyerController.php`,
`UserController.php`, `LoginController.php`, `RegisterController.php`,
`Controller.php`, plus the two misplaced Blade files (`product-detail.blade.php`,
`product-view.blade.php`) blueprint §1.2 already flags as DEAD-but-present. All six
route files present (`web.php`, `admin.php`, `api.php`, `channels.php`, `console.php`,
`seller.php`).

### 2.3 Provenance signals — does this genuinely look newer than the stale local backup?

| Signal | Stale local backup (`spakshomeopathy.com/`) | New export (`public_html/`) | Conclusion |
|---|---|---|---|
| Controller file mtimes | 2020–2023 (`AdminController.php`: 2023-01-09; `BuyerController.php`: 2021-09-19; etc.) | **2026-01-07** (all controllers) / **2026-01-21** (`HomeController.php`) | Genuinely different, more recent artifact |
| `storage/logs/` recent entries | None near today | `laravel-2026-08-15.log`, `laravel-2026-08-16.log` present | Consistent with an export taken from an actively-running, recently-live application |
| `about.blade.php` body text (BCN-03's own finding, M1) | (already known stale: "MHMS") | **"BHMS , MD (Homeopathy)"** — matches what M1's *live production capture* independently found, not what the stale local file said | Independently corroborates: this export agrees with production, not with the known-stale local copy |
| `video.blade.php` YouTube embed count (BCN-03's own finding, M1) | 3 (stale) | **6** — again matches M1's independent live-capture finding | Same corroboration |
| `HomeController.php` content hash | `8eb3bda6...` | `564a2013...` — **different** | Real content drift exists and is now visible |

**The last two rows are the most important evidence.** M0/M1 already independently
captured these two facts (BHMS typo-correction, 6 YouTube embeds) by fetching live
production HTML — without ever touching this new export. The new export **agrees with
that independent, separately-obtained evidence**, which is strong corroboration this
is a genuine production artifact rather than another stale copy that happens to have
newer file timestamps.

### 2.4 The actual drift found — exactly the kind of thing OI-6 exists to catch

`HomeController.php` and `routes/web.php` each differ from the stale local backup by
one coherent, self-consistent addition:

```diff
+ public function Alldiseases()
+ {
+ 	return view('all-diseases');
+ }
```
```diff
+ Route::get('all-diseases','HomeController@Alldiseases');
```

A matching view exists: `resources/views/all-diseases.blade.php` (present in the new
export, confirmed). This is a **live, routed, working page that does not exist at all
in the stale local backup** — not a rewrite of existing logic, an entirely additional
one. (Incidentally, the view's own `<link rel="canonical">` tag reads
`all-diseasesr` — a typo, one more instance of this codebase's established pattern,
noted for the record and **not corrected**, consistent with contract F-17.)

**Every other live controller — `AdminController.php`, `CartController.php`,
`BuyerController.php`, `UserController.php` — is byte-identical (MD5-verified) between
the stale local backup and the new export.** The drift found is real, narrow, and
fully characterized: one new public route, nothing else detected at this lightweight
level of inspection.

---

## 3. WHAT THIS VERIFICATION DOES **NOT** CLAIM

Per the owner's instruction, this was explicitly a **lightweight** check, not
exhaustive:

- This does **not** certify that every one of the ~117 Blade views, ~102 admin routes,
  or every line of every controller is byte-identical beyond what was spot-checked
  above. A handful of high-signal files were compared (the five live controllers, two
  route files, two views already implicated by M1's BCN-03 findings); the remaining
  ~110 Blade views and admin-only code paths were not diffed here.
- A full, systematic diff of the new export against the stale local backup — file by
  file, across all ~120 Blade views and every controller method — is **M3's own
  responsibility as it ports each piece**, not a precondition this document is meant to
  discharge in advance. That full-diff work is exactly the "read the Laravel source"
  step (contract §10.1 Step 2) M3 will do naturally for each file it touches; the
  `all-diseases` finding above demonstrates the new export is a **live, authoritative
  copy worth reading closely during that work**, not that this document has already
  read all of it.
- Per the owner's explicit instruction, **drift from the old local backup is not
  treated as a blocker** — the `all-diseases` finding is recorded as useful evidence for
  M3 (a new route to port, not previously known), not as a reason to withhold closure.

---

## 4. DECISION

**OI-6 is CLOSED**, on the following basis:

1. The owner has confirmed `public_html/` (root level) is a direct export of the
   currently deployed production application, not the old local backup.
2. Structural integrity is intact (§2.1–2.2): this is a genuine, complete Laravel 5.8
   application matching the known route/controller inventory.
3. Provenance is corroborated independently (§2.3): content this export contains
   matches what M0/M1 already found by directly capturing **live production HTML** —
   agreement that did not require trusting the export's own timestamps.
4. Genuine drift was found and is now visible (§2.4) — proof the export is doing its
   job, not proof it should be rejected. Per the owner's instruction, differences from
   the stale local copy are not blockers; they are exactly what a fresh export is
   *for*.

**Going forward:** `public_html/` (root level) is now the **rank-4 source of truth**
(contract §11) for Laravel application behavior — superseding
`spakshomeopathy.com/` for that purpose. `spakshomeopathy.com/` is not deleted (contract
NN-10/G-2 — no file deletion without approval) and remains available for historical
comparison, but M3 and all subsequent milestones should read from `public_html/` as
the current, authoritative Laravel source. This is recorded here so no future session
reads from the wrong directory.

---

## 5. WHAT WAS NOT DONE

- No file was modified in either `spakshomeopathy.com/` or `public_html/`
- No file was modified in `spakshomeopathy-next/`
- No MongoDB or MariaDB connection was attempted
- `babasahebsamaj/`, `meenaparivaar/`, `spakseducation/` were not analyzed beyond
  confirming they are not this project; nothing in them was read, copied, or acted upon
- No M3 implementation work (pages, routes, models, business logic) began
- OI-1a, OI-1b: untouched, unaffected by this resolution
- D-10, D-11: unaffected by this resolution

---

## 6. UPDATED STATUS

| Item | Before this session | After this session |
|---|---|---|
| **OI-6** | OPEN — sole standing M3 blocker | ✅ **CLOSED** |
| **OI-2** | DEFERRED / NOT APPLICABLE (per D-11) | Unchanged |
| **OI-1a, OI-1b** | OPEN | Unchanged — still OPEN |
| **D-10** | Documented, deferred to M13 | Unchanged |
| **M3** | NOT AUTHORIZED (blocked on OI-6) | **NOT AUTHORIZED** — OI-6 no longer blocks it, but **explicit owner authorization has still not been given**, per the owner's own standing instruction ("M3 is still NOT AUTHORIZED until I explicitly authorize it") |

**M3 remains NOT AUTHORIZED.** This document closes OI-6 only. It is not itself an
authorization to begin M3 — that requires a separate, explicit instruction from the
owner, which has not yet been given.

---

*This resolution is recorded per contract Part 7 discipline (evidence-based, dated,
file:line/hash cited). It does not carry precedence-rank-1 (Owner Decision) authority
on its own — it documents the owner's already-given instruction (treat the supplied
export as authoritative; perform lightweight verification; close OI-6) and the
verification performed against that instruction.*

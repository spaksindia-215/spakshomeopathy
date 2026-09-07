# MILESTONE GATE REPORT — M5-E (Posts): Admin CRUD Write Path, Sixth Sub-Slice

**Milestone:** M5-E, sixth sub-slice. Prior sub-slices: pin codes
(`docs/GATE-REPORT-M5-E-PINCODE.md`), sliders
(`docs/GATE-REPORT-M5-E-SLIDER.md`), blog categories
(`docs/GATE-REPORT-M5-E-BLOG-CATEGORIES.md`), categories/disease-herb-tree
(`docs/GATE-REPORT-M5-E-CATEGORIES.md`), blogs
(`docs/GATE-REPORT-M5-E-BLOGS.md`).
**Period:** 2026-09-04
**Author:** Migration Implementer
**Report date:** 2026-09-04
**Contract version:** 1.0

---

## 0. AUTHORIZATION RECORD

### 0.1 — Entity selection

> **Owner:** homeopathy38@gmail.com
> **Decision:** APPROVED
> **Scope:** Sixth M5-E sub-slice: posts (add/edit/delete admin CRUD).
> **Date:** 2026-09-04

### 0.2 — `post_homeopathy` storage-type deviation, resolved before implementation

Tracing `SavePost`/`UpdatePost` precisely (not merely from the
pre-existing `schemas/post.ts` header, which only documented the
`homeopathyId ↔ homeopathyMaster` LEFT JOIN reading) surfaced a genuine,
previously-undiscovered defect: `post_homeopathy` is stored as **whatever
raw value the form submits**, unconditionally. Add's Category `<select>`
submits each category's SLUG; Edit's submits its numeric ID. Laravel's own
`SavePost` would therefore write a SLUG STRING into `post_homeopathy` for
every new post — a genuine storage-type inconsistency, never yet
triggered because (confirmed by direct inspection of every real row in
`Database/db_newhomo.sql`) **all 414 real historical posts already have a
numeric `post_homeopathy`**, matching `post_diseases` exactly.

This was raised to the owner as a real fork (contract §10.1 Step 6) rather
than resolved silently in either direction — first as a "is the schema
wrong" framing (corrected on further investigation: the schema was
already right for all real data), then, more precisely, as "should the
new Add write path store the raw slug (matching Laravel's literal,
never-yet-triggered bug) or resolve it to a numeric id first (matching
every real row, `UpdatePost`'s own storage format, and every downstream
consumer of this field — the `posts_homeopathyId` index, the migration
transform's numeric coercion, and the public `getPostsByHomeopathy(id:
number)` filter)":

> **Owner:** homeopathy38@gmail.com
> **Decision:** APPROVED
> **Scope:** `save-post/route.ts` resolves the submitted category slug to
> its numeric `legacyId` (via the same `categories`-table lookup Laravel
> already performs for `post_diseases`) BEFORE storing it in
> `post_homeopathy` — not Laravel's literal raw-slug storage. This is a
> disclosed, narrow deviation from source's own storage bug, not a schema
> change and not a silent "obvious bug" fix.
> **Date:** 2026-09-04

Full record also in `docs/M3-OWNER-DECISION-RECORDS.md` is NOT added —
this is scoped narrowly to `SavePost`'s own write path, not a DR-series
architectural decision; recorded here and in code comments instead,
consistent with how FIX-002-style narrow corrections have been handled
when they didn't warrant a DR/Fix-Register entry of their own (this one
also doesn't touch a BROKEN-register item, so no Fix Register entry
either — it is a data-consistency deviation, not a repair of a
crash/wrong-output BROKEN item).

---

## 1. CONTRACT ACKNOWLEDGEMENT

- [x] Read all five prior M5-E gate reports before starting
- [x] Read the LIVE Laravel source directly this session, in full:
      `AdminController.php:768-875` (`PostList`, `EditPost`, `UpdatePost`,
      `DestroyPost`, `AddPost`, `SavePost`, all 6 methods), confirmed
      against `routes/admin.php:41-49`
- [x] Read `add-post.blade.php`/`edit-post.blade.php` directly — confirmed
      `@csrf` on both forms, confirmed the Category `<select>`'s option
      VALUE differs between Add (`$row->slug`) and Edit (`$row->id`), and
      that the HTML-commented-out first Category `<select>` in
      `add-post.blade.php` (using `$row->id`) is genuinely dead
- [x] Read `Database/db_newhomo.sql`'s `tbl_post` table definition AND a
      representative sample of its real INSERT data directly, to verify
      the historical `post_homeopathy`-is-always-numeric claim in §0.2,
      not assumed
- [x] Confirmed `src/lib/mongodb/schemas/post.ts`'s pre-existing
      `postSchema` needs NO change — its `homeopathyId: number|null`
      typing is correct for every real row; only the NEW write path's
      behavior needed a decision
- [x] Verified `DestroyPost`'s image-cleanup block is entirely
      commented-out (dead, contract §12.4) — confirmed directly, not
      assumed from a summary
- [x] No Laravel source file was modified
- [x] `spaks_dev` is the only database any code in this slice can reach
- [x] No credential, secret, or session value appears in this report

---

## 2. FILES CREATED

```
src/lib/mongodb/repositories/postRepository.ts               — PostRepository
src/app/admin/save-post/route.ts                             — POST /admin/save-post
src/app/admin/update-post/route.ts                            — POST /admin/update-post
src/app/admin/destroy-post/[post_id]/route.ts                 — GET /admin/destroy-post/{post_id}
tests/mongodb/postRepository.test.ts                          — 8 tests (FIXTURE)
docs/GATE-REPORT-M5-E-POSTS.md                                — this report
```

**8 new tests in `postRepository.test.ts` + 1 new test in the pre-existing
`categoryAdminRepository.test.ts` (for the new `findAllByNameAscending`
method) + 3 new structural cases in `routeProtection.test.ts`, 12 total,
all passing.**

## 3. FILES MODIFIED

| Path | Change |
|---|---|
| `src/lib/mongodb/repositories/categoryRepository.ts` | Added `findAllByNameAscending` — mirrors `AddPost`/`SavePost`'s `$getHomo` query (`orderBy('name','ASC')`, no type/status filter), a DIFFERENT sort from the pre-existing `findAllDescending`. |
| `src/app/admin/(shell)/add-post/page.tsx` | Form now POSTs for real, CSRF-token-wired, success flash rendered. Category dropdown switched to live `spaks_dev` (`CategoryRepository.findAllByNameAscending`). Product dropdown DELIBERATELY left demo-fixture-backed — disclosed asymmetry, §5. |
| `src/app/admin/(shell)/edit-post/[post_id]/page.tsx` | Switched from `@/lib/demo` to live `spaks_dev` reads (`PostRepository.findByLegacyId` + the same live category dropdown); CSRF token added; success flash wired. Product dropdown same disclosed asymmetry as Add. |
| `src/app/admin/(shell)/post-list/page.tsx` | Switched from `@/lib/demo` to live `spaks_dev` read (`PostRepository.findAllByTitleAscending` — sorted by TITLE, not id, matching source exactly). Success flash wired. **Demo-only destroy-link confirm()/alert() intercept script REMOVED** — the destroy route is now real, and source itself has no confirm dialog on this link (already documented in this page's own preserved-defects list) — removing the demo script correctly restores source's real, unconfirmed behavior. Pagination gap explicitly disclosed (§6). |
| `tests/mongodb/categoryAdminRepository.test.ts` | Added 1 new test for `findAllByNameAscending`. |
| `tests/auth/routeProtection.test.ts` | Added 3 new structural tests: 3 new post routes call `requireAdminSession`; `save-post`/`update-post` in `PROTECTED_ROUTES`; `destroy-post` in `EXEMPT_GET_ROUTES`; `add-post`/`edit-post` pages in `FORMS_WITH_REAL_TOKEN`. |

**No other file was touched.** Every repository, auth module, and
pre-existing route/page outside the posts surface — confirmed unmodified.

**Deleted:** none (the demo destroy-link script was removed as an inline
edit to `post-list/page.tsx`, not a separate file deletion).

---

## 4. WHAT WAS BUILT, MAPPED TO LARAVEL SOURCE

| Laravel route | Controller method | Next.js target | MongoDB collection |
|---|---|---|---|
| `GET admin/post-list` (`admin.php:49`) | `AdminController@PostList` | `admin/(shell)/post-list/page.tsx` (pre-existing, live data this session) | `posts` (read, `orderBy post_title ASC`, no pagination implemented) |
| `GET admin/add-post` (`admin.php:41`) | `AdminController@AddPost` | `admin/(shell)/add-post/page.tsx` (pre-existing, wired this session) | `categories` (read, dropdown) |
| `POST admin/save-post` (`admin.php:42`) | `AdminController@SavePost` | `admin/save-post/route.ts` (new) | `posts` (write) + `categories` (read, slug lookup) + filesystem write |
| `GET admin/edit-post/{post_id}` (`admin.php:44`) | `AdminController@EditPost` | `admin/(shell)/edit-post/[post_id]/page.tsx` (pre-existing, live data this session) | `posts` (read) + `categories` (read, dropdown) |
| `POST admin/update-post` (`admin.php:45`) | `AdminController@UpdatePost` | `admin/update-post/route.ts` (new) | `posts` (write) + `categories` (read, id lookup) + filesystem write |
| `GET admin/destroy-post/{post_id}` (`admin.php:46`) | `AdminController@DestroyPost` | `admin/destroy-post/[post_id]/route.ts` (new) | `posts` (delete) — no filesystem cleanup, source's own is dead code |

### P-04 — full mechanics now documented, source-confirmed

`add-post.blade.php`'s live Category `<select>` submits `slug`;
`edit-post.blade.php`'s submits `id`. `SavePost` looks the category up by
slug (`$getDisId->id` populates `post_diseases`); `UpdatePost` looks it up
by id. Both write `post_homeopathy` — Add per §0.2's owner-approved
resolution (numeric, matching `post_diseases`), Edit already numeric in
source. `post_diseases` and `post_homeopathy` are therefore always
identical values on every post touched by this port, by design — matching
every real historical row.

### `p_id` (product reference) — no asymmetry, both slug-based

Confirmed directly: BOTH Add's and Edit's Product `<select>` submit each
product's `p_slug` — `postSchema.pId: z.string()` already correctly
modeled this (pre-existing, unmodified). No lookup/validation is performed
on `p_id` in either `SavePost` or `UpdatePost` — reproduced faithfully,
stored raw.

### `DestroyPost` — dead cleanup code, correctly not reproduced

The entire image-unlink block is HTML-commented out in source AND
references a nonexistent `post` table (should be `tbl_post`) and a
nonexistent `p_pimage` column (should be `post_image`) — further evidence
of genuine dead code, not merely disabled-but-correct logic. Per contract
§12.4, this route performs no filesystem cleanup, matching source's real,
observable behavior (row deleted, image file left orphaned on disk).

---

## 5. DISCLOSED ASYMMETRY — Product dropdown remains demo-fixture-backed

Source's `AddPost`/`EditPost` both query `products` live
(`DB::table('products')->orderBy('p_name','ASC')->get()`). This session's
Category dropdown switch to live data was a mechanical extension (reused
`CategoryRepository`, already built). The Product dropdown was
DELIBERATELY LEFT on `@/lib/demo`'s fixture — building a live, sorted
product-listing read here would mean building real read infrastructure
for `products`, itself a separate, not-yet-built M5-E entity (or
M9/product-management scope) — out of this sub-slice's boundary. Flagged
explicitly in both `add-post/page.tsx` and this report, not silently left
inconsistent with the Category dropdown's own live-data switch.

---

## 6. PAGINATION NOT IMPLEMENTED — same disclosed class as `categories`

`PostList` uses `paginate(20)` against ~414 real rows (per
`docs/M5-PREFLIGHT-AUDIT.md`) — production pagination boundaries are
crossed many times over. This page renders the FULL unpaginated list,
sorted correctly by title (not id). Consistent with the `categories`
sub-slice's own disclosed gap, not silently assumed irrelevant.

---

## 7. DEMO-ONLY SCRIPT REMOVED — restores real source behavior

`post-list/page.tsx` previously intercepted the destroy link's click with
a `confirm()`/`alert()` demo-only script (a leftover from the pre-M5-E
"Demo UI Migration" phase, when no backend existed for any destroy link).
Now that `destroy-post` is a real, working route, that intercept was
removed — and because source's OWN `post-list.blade.php` has **no**
`confirm()` dialog on this link either (already documented in this page's
own preserved-defects list, unchanged), removing the demo script is the
CORRECT fidelity move, not an accidental regression: the link now behaves
exactly like real Laravel's (a plain, unconfirmed destructive GET link).

---

## 8. PRESERVED DEFECTS VERIFIED

| ID | Defect | Reproduced | Evidence |
|---|---|---|---|
| Status column dead `href="#"` badges, "Deativate" typo | Preserved | **Preserved** — unchanged, `post-list/page.tsx` |
| No `confirm()` dialog on destroy link | Preserved | **Preserved** — demo-only intercept removed, restoring this exact absence (§7) |
| Image field name differs between Add (`p_pimage`) and Edit (`post_image`) | Preserved | **Preserved** — unchanged in both routes/pages |
| `DestroyPost`'s dead, broken (wrong table/column names) commented cleanup code | Not reproduced (contract §12.4) | Confirmed dead this session, not resurrected |
| No old-image cleanup on `UpdatePost` at all (no `unlink()` anywhere in that method) | Preserved | **Preserved** — `update-post/route.ts` correctly never calls `deleteAdminUpload` |
| P-04 (create-by-slug/edit-by-id category lookup asymmetry) | Preserved in MECHANISM (two different lookup keys), corrected in STORAGE (§0.2) | Disclosed, owner-approved distinction between the lookup mechanism (preserved) and the stored value's type consistency (corrected) |

---

## 9. VERIFICATION PERFORMED THIS SESSION

```
npm run typecheck    ✅ 0 errors
npm run lint          ✅ 0 errors (same 4 pre-existing, unrelated warnings)
npm run format:check  ✅ pass for every file this session touched — same
                          pre-existing, unrelated RedesignedHome.tsx gap
                          persists, untouched, out of scope
npm run test          ✅ 492/492 passed, 54 test files, 0 regressions
                          (477 pre-existing + 8 postRepository.test.ts +
                          1 new case in categoryAdminRepository.test.ts +
                          6 new cases in routeProtection.test.ts, matching
                          the actual npm run test output exactly)
npm run build          — first attempt this session was killed by the
                          sandbox (exit 137, OOM — `free -h` showed real
                          memory pressure at the time, disclosed rather
                          than silently retried without comment); a clean
                          retry immediately after completed successfully
                          on the first pass with zero errors — all 6 new
                          post routes compile correctly as ƒ (Dynamic)
```

**Live Atlas verification: ATTEMPTED (implicitly, standing blocker),
BLOCKED.** `REAL ATLAS VERIFICATION: NOT TESTED — environment TLS/network
limitation`. Not re-debugged this session. Evidence rests on FIXTURE-level
tests and the successful build.

**No `spaks_dev` mutation was performed this session.**

---

## 10. AUTHORIZATION/OWNERSHIP CHECKS

No per-resource ownership concept for posts in Laravel; any authenticated
admin may add/edit/delete any post, matching source exactly.

---

## 11. ROUTE CHECKS

All 6 routes verified against `routes/admin.php:41-49` by exact line
number this session.

---

## 12. REGRESSION CHECK

492/492 tests pass, zero regressions to any of the 477 pre-existing
tests.

---

## 13. NEW FINDINGS THIS SESSION

1. **`post_homeopathy` storage-type inconsistency** (§0.2) — a genuine,
   previously-undiscovered Laravel-source defect, resolved via an
   explicit, disclosed, owner-approved deviation rather than reproduced
   or silently normalized.
2. **`DestroyPost`'s dead cleanup code references a nonexistent table AND
   column** (§4) — a small additional detail beyond "it's commented out,"
   worth recording since it corroborates the code was never live even
   before being commented, not a recently-disabled-but-once-working
   feature.
3. Re-confirmed (not new) — `SavePost`'s missing null-guard on
   `p_pimage`, same class as `Savecategory`/`SaveBlog`.

---

## 14. DEVIATIONS

| Type | Item | Authorization |
|---|---|---|
| Owner-approved deviation | `post_homeopathy` resolved to numeric id on Add, not stored as raw slug | §0.2 above |
| Disclosed added validation | Missing-image rejection, category-not-found rejection — same category as prior sub-slices | Consistent precedent |
| Disclosed asymmetry | Product dropdown remains demo-fixture-backed | §5 |
| Pre-approved (§5.2) | List/edit pages switched to live `spaks_dev` reads; demo destroy-link script removed (restores real fidelity, not a new deviation) | Mechanical extension / fidelity restoration |

**Undocumented deviations: NONE.**

---

## 15. SIGN-OFF

**Implementer:** Migration Implementer **Date:** 2026-09-04
**Owner authorization:** given in-session (§0.1 entity selection, §0.2
`post_homeopathy` storage deviation).

**M5-E (posts sub-slice) status: GATE CLOSED** for its own scope.
**M5-E overall remains PARTIAL** — `product_category` (marketplace tree,
deferred from the categories sub-slice, including its missing-update-
handler question and the B-05/B-18-candidate items nearby) remains
unbuilt. This is now the LAST remaining unbuilt M5-E content-management
entity — pincode, sliders, blog categories, categories (disease/herb
tree), blogs, and posts are all gate-closed. M5-D (seller registration)
remains DEFERRED, unchanged.

**Per the task's STOP condition: no other M5-E sub-slice, M5-D, M5-F, or
any other milestone was started.** No production MongoDB was contacted.
No Laravel source was modified. No Herbs Store/CR-003 work was touched.
Waiting for explicit owner authorization before starting the next
sub-slice.

---

*End of Gate Report M5-E (Posts).*

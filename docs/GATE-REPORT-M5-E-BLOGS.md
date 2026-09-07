# MILESTONE GATE REPORT — M5-E (Blogs): Admin CRUD Write Path, Fifth Sub-Slice

**Milestone:** M5-E, fifth sub-slice. Prior sub-slices: pin codes
(`docs/GATE-REPORT-M5-E-PINCODE.md`), sliders
(`docs/GATE-REPORT-M5-E-SLIDER.md`), blog categories
(`docs/GATE-REPORT-M5-E-BLOG-CATEGORIES.md`), categories/disease-herb-tree
(`docs/GATE-REPORT-M5-E-CATEGORIES.md`).
**Period:** 2026-09-04
**Author:** Migration Implementer
**Report date:** 2026-09-04
**Contract version:** 1.0

---

## 0. AUTHORIZATION RECORD

> **Owner:** homeopathy38@gmail.com
> **Decision:** APPROVED
> **Scope:** Fifth M5-E sub-slice: blogs (add/edit/delete admin CRUD).
> **Date:** 2026-09-04

No new blocking owner decision was required — blogs reuses infrastructure
already built (upload validation, `convertToSlug`, the FIX-004 no-
`updatedAt`-bump precedent, `BlogCategoryRepository` for the category
dropdown) and carries no open contract decision item of its own.

---

## 1. CONTRACT ACKNOWLEDGEMENT

- [x] Read all four prior M5-E gate reports before starting
- [x] Read the LIVE Laravel source directly this session, in full:
      `AdminController.php:1002-1084` (`AddBlog`, `SaveBlog`, `BlogList`,
      `EditBlog`, `UpdateBlog`, `DestroyBlog`, all 6 methods), confirmed
      against `routes/admin.php:84-90`
- [x] Verified `add-blog.blade.php`/`edit-blog.blade.php` both carry
      `@csrf`, and that `blog_image` on Add DOES carry a `required`
      attribute (unlike category's `c_image`) — read directly, not
      assumed
- [x] Read `Database/db_newhomo.sql`'s `blogs` table definition directly
      (line 104-115) — confirmed `updated_at` has no `ON UPDATE`
      clause (FIX-004 precedent applies) before writing any update code
- [x] Confirmed `src/lib/mongodb/schemas/post.ts`'s pre-existing
      `blogSchema` already matches this table's real shape — no schema
      change needed
- [x] Read `blog-list.blade.php` directly — confirmed no `paginate()`
      call (plain `orderBy('id','desc')->get()`), unlike categories'
      `paginate(20)` — no pagination gap exists for this entity
- [x] No Laravel source file was modified
- [x] `spaks_dev` is the only database any code in this slice can reach
- [x] No credential, secret, or session value appears in this report

---

## 2. FILES CREATED

```
src/lib/mongodb/repositories/blogRepository.ts       — BlogRepository
src/app/admin/save-blog/route.ts                     — POST /admin/save-blog
src/app/admin/update-blog/route.ts                   — POST /admin/update-blog
src/app/admin/destroy-blog/[id]/route.ts             — GET /admin/destroy-blog/{id}
tests/mongodb/blogRepository.test.ts                 — 8 tests (FIXTURE)
docs/GATE-REPORT-M5-E-BLOGS.md                       — this report
```

**8 new tests + 3 new structural cases in `routeProtection.test.ts`, 11
total, all passing.**

## 3. FILES MODIFIED

| Path | Change |
|---|---|
| `src/app/admin/(shell)/add-blog/page.tsx` | Form now POSTs for real, CSRF-token-wired, success flash rendered. Category dropdown switched from `@/lib/demo` to a live `BlogCategoryRepository.findAllDescending()` read (reused, not rebuilt), matching source's own live query. |
| `src/app/admin/(shell)/edit-blog/[id]/page.tsx` | Switched from `@/lib/demo` to live `spaks_dev` reads (`BlogRepository.findByLegacyId` + the same live category dropdown); CSRF token added; success flash wired. Dead `value` attribute on the file input correctly NOT reproduced (pre-existing, unchanged reasoning). |
| `src/app/admin/(shell)/blog-list/page.tsx` | Switched from `@/lib/demo` to live `spaks_dev` read (`BlogRepository.findAllDescending`); success flash wired (source's own `session()->has('message')` block was previously unwired). All preserved defects (status casing, no-image fallback, no confirm dialog) UNCHANGED. |
| `tests/auth/routeProtection.test.ts` | Added 3 new structural tests: 3 new blog routes call `requireAdminSession`; `save-blog`/`update-blog` in `PROTECTED_ROUTES`; `destroy-blog` in `EXEMPT_GET_ROUTES`; `add-blog`/`edit-blog` pages in `FORMS_WITH_REAL_TOKEN`. |

**No other file was touched.** Every repository, auth module, and
pre-existing route/page outside the blogs surface — confirmed unmodified.

**Deleted:** none.

---

## 4. WHAT WAS BUILT, MAPPED TO LARAVEL SOURCE

| Laravel route | Controller method | Next.js target | MongoDB collection |
|---|---|---|---|
| `GET admin/add-blog` (`admin.php:84`) | `AdminController@AddBlog` | `admin/(shell)/add-blog/page.tsx` (pre-existing, wired this session) | `blogCategories` (read, dropdown) |
| `POST admin/save-blog` (`admin.php:85`) | `AdminController@SaveBlog` | `admin/save-blog/route.ts` (new) | `blogs` (write) + filesystem write |
| `GET admin/edit-blog/{id}` (`admin.php:86`) | `AdminController@EditBlog` | `admin/(shell)/edit-blog/[id]/page.tsx` (pre-existing, live data this session) | `blogs` (read) + `blogCategories` (read, dropdown) |
| `POST admin/update-blog` (`admin.php:87`) | `AdminController@UpdateBlog` | `admin/update-blog/route.ts` (new) | `blogs` (write) + filesystem write/delete |
| `GET admin/destroy-blog/{id}` (`admin.php:88`) | `AdminController@DestroyBlog` | `admin/destroy-blog/[id]/route.ts` (new) | `blogs` (delete) + filesystem delete |
| `GET admin/blog-list` (`admin.php:90`) | `AdminController@BlogList` | `admin/(shell)/blog-list/page.tsx` (pre-existing, live data this session) | `blogs` (read, `orderBy id desc`, no pagination) |

No column-mismatch defect exists for this entity.

### P-07 — reuses `convertToSlug`, not the categories' `name-rand()` variant

`SaveBlog`'s slug uses `convert_to_slug()`, the SAME algorithm as blog
categories — confirmed directly against source (`AdminController.php:1012`).
`save-blog/route.ts` calls `convertToSlug` from `src/lib/adminSlug.ts`
(built in the blog-categories sub-slice), not the categories-specific
`name-rand()` inline logic used in `save-cat/route.ts`. Two different
entities correctly routed to two different, previously-verified-correct
algorithms.

### `UpdateBlog` — well-formed cleanup, unlike `UpdateBlogCategory`

Verified directly this session: `UpdateBlog`'s `file_exists()` call has
**no** stray `!` (unlike `UpdateBlogCategory`'s FIX-004-adjacent finding
from the third sub-slice) — old-image cleanup correctly fires on Update
here. `update-blog/route.ts` correctly DOES call `deleteAdminUpload` on
the image-replace path, in contrast to `update-blog-category/route.ts`'s
deliberate non-call.

### `blog_slug` never re-generated on Update

Confirmed: `UpdateBlog`'s `$data` array has no `blog_slug` key — the
slug from creation is permanent, even across a title change.
`updateBlog(...)`'s call site never touches `blogSlug`.

---

## 5. FIX-004 REUSED, RE-CONFIRMED FOR THIS TABLE

`blogs.updated_at` has no `ON UPDATE current_timestamp()` clause
(`Database/db_newhomo.sql:104-115`, confirmed directly this session) —
`BlogRepository.updateBlog`'s type signature correctly excludes
`updatedAt` from the start (same `Omit<...>` pattern as
`BlogCategoryRepository.updateBlogCategory`), so this entity never had
the FIX-004 bug to begin with — no correction was needed here, only
confirmation that the existing convention was followed correctly.

---

## 6. FINDING RE-CONFIRMED, NOT NEW — `SaveBlog`'s missing null-guard

Same class of gap as `Savecategory`'s (categories sub-slice, §5 of that
report) and already independently catalogued by
`docs/GATE-REPORT-M3.md` §6.2 Finding 6 as one of the 6 admin "Add"
handlers lacking a `hasFile()`/`empty()` guard. Distinguishing detail
this session: `add-blog.blade.php`'s `blog_image` field DOES carry a
`required` HTML attribute (unlike `add-category.blade.php`'s `c_image`,
which has none) — a real but bypassable client-side guard, not a server
one. `save-blog/route.ts` reproduces the same disclosed, non-fatal
rejection regardless, for consistency and because `required` alone is
not a fidelity guarantee (a raw POST or a modified form still bypasses
it, and the underlying PHP fatal, if reached, would be identical either
way).

---

## 7. PRESERVED DEFECTS VERIFIED

| ID | Defect | Reproduced | Evidence |
|---|---|---|---|
| Status column raw text, two different casings ("active"/"Inactive") | Preserved | **Preserved** — unchanged, `blog-list/page.tsx` |
| No-image fallback to public-site asset path (`assets/img/no-image.png`) | Preserved | **Preserved** — unchanged |
| Delete link has no `confirm()` dialog | Preserved | **Preserved** — unchanged |
| Dead `value` attribute on Edit's file input | Not reproduced (browser-ignored, zero observable difference) | Already documented, pre-existing page header, unchanged |
| Blog module absent from sidebar nav | Preserved | **Preserved** — no nav link added |
| "Blog saved successfully."/"Blog updated successfully." message text differs from every other Save/Update handler's "Record saved/updated" phrasing | Preserved | **Preserved** — exact text reproduced in both routes |

---

## 8. VERIFICATION PERFORMED THIS SESSION

```
npm run typecheck    ✅ 0 errors
npm run lint          ✅ 0 errors (same 4 pre-existing, unrelated warnings)
npm run format:check  ✅ pass for every file this session touched — same
                          pre-existing, unrelated RedesignedHome.tsx gap
                          persists, untouched, out of scope
npm run test          ✅ 477/477 passed, 53 test files, 0 regressions
                          (463 pre-existing + 8 blogRepository.test.ts +
                          6 new cases in routeProtection.test.ts, matching
                          the actual npm run test output exactly)
npm run build          ✅ pass, first attempt, no cache flakiness — all 6
                          new blog routes compile correctly as ƒ (Dynamic)
```

**Live Atlas verification: ATTEMPTED (implicitly, standing blocker),
BLOCKED.** `REAL ATLAS VERIFICATION: NOT TESTED — environment TLS/network
limitation`. Not re-debugged this session. Evidence rests on FIXTURE-level
tests and the successful build.

**No `spaks_dev` mutation was performed this session.**

---

## 9. AUTHORIZATION/OWNERSHIP CHECKS

No per-resource ownership concept for blogs in Laravel; any authenticated
admin may add/edit/delete any blog, matching source exactly.

---

## 10. ROUTE CHECKS

All 6 routes verified against `routes/admin.php:84-90` by exact line
number this session.

---

## 11. REGRESSION CHECK

477/477 tests pass, zero regressions to any of the 463 pre-existing tests.

---

## 12. NEW FINDINGS THIS SESSION

None beyond what §6 re-confirms from an already-catalogued M3-era finding
(not a new discovery in itself, but now concretely reachable for this
entity too).

---

## 13. DEVIATIONS

| Type | Item | Authorization |
|---|---|---|
| Disclosed added validation | Missing-image rejection (§6), same category as prior sub-slices | Consistent precedent |
| Pre-approved (§5.2) | List/edit pages switched to live `spaks_dev` reads | Mechanical extension |

**Undocumented deviations: NONE.**

---

## 14. SIGN-OFF

**Implementer:** Migration Implementer **Date:** 2026-09-04
**Owner authorization:** given in-session (§0).

**M5-E (blogs sub-slice) status: GATE CLOSED** for its own scope.
**M5-E overall remains PARTIAL** — posts and `product_category`
(marketplace tree, deferred from the categories sub-slice) remain
unbuilt. M5-D (seller registration) remains DEFERRED, unchanged.

**Per the task's STOP condition: no other M5-E sub-slice, M5-D, M5-F, or
any other milestone was started.** No production MongoDB was contacted.
No Laravel source was modified. No Herbs Store/CR-003 work was touched.
Waiting for explicit owner authorization before starting the next
sub-slice.

---

*End of Gate Report M5-E (Blogs).*

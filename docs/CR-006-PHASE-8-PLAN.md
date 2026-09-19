# CR-006 Phase 8 — Implementation Plan: Media / SEO / Redirects

**Status:** ✅ IMPLEMENTED — see `GATE-REPORT-CR006-PHASE-8.md` for the
final, as-built record, including one significant design revision made
during implementation (the redirects middleware/database wiring, §2.3
revised below) and one real bug found and fixed (middleware silently
not registering at all — see the gate report §1.2).
**Depends on:** `GATE-REPORT-CR006-PHASE-7.md` (Phase 7 complete).
**Scope narrowed by owner decision (2026-09-15):** (1) Media library —
filesystem-scan browser over the existing `uploaded_files/*` directories,
no new MongoDB collection; (2) SEO — wire admin UI for the herb form's
already-existing `metaTitle`/`metaDescription` fields, plus build
`sitemap.xml` generation; do NOT add meta fields to the legacy
product/post/category schemas this phase (that's separately-scoped,
D-11-governed schema work); (3) Redirects — new collection + admin CRUD
+ middleware, since nothing exists to build on.

---

## 0. Scoping check against this CR's recurring pattern — read first

Unlike most prior phases, `CR-006-ANALYSIS-PHASE1.md`'s "fully new"
classification holds up for two of three sub-areas this phase, confirmed
by direct inspection:

- **Media library** — correctly "fully new." No Laravel Media/Gallery/
  FileManager controller exists (`AdminController.php` has no such
  method); uploads go straight into per-feature folders
  (`uploaded_files/products`, `/categories`, `/post`, `/slider`,
  `/product-categories`, `/profile` — confirmed present on disk, holding
  real migrated files: 1615 product images, 549 post images, etc.).
  Nothing indexes them centrally today. Next.js already has the upload
  PLUMBING (`src/lib/uploads/adminUpload.ts`'s `saveAdminUpload`/
  `deleteAdminUpload`, reused by every admin form so far) but no browsing
  screen (`grep` for "media"/"gallery" under `src/app/admin` returns
  nothing).
- **Redirects** — correctly "fully new." No redirect table in the 34
  legacy MariaDB tables, no Laravel URL-remapping middleware (only
  ordinary `redirect()` flow-control calls, not a mapping mechanism), no
  `next.config.ts` `redirects()`, no `middleware.ts` file at all in this
  project yet (confirmed absent).

**One real miss, same category as every prior phase's finding:** Phase 1
said "no SEO-related columns exist on any of the 34 tables... New." True
for the legacy-traced schemas (`products`/`posts`/`categories` have zero
meta fields) — but Phase 1 didn't anticipate Phase 6's herb parallel
model, which by definition postdates Phase 1's analysis. Direct
inspection this phase found `HerbProductDoc`
(`src/lib/herbs/db/schema.ts:88-89`) ALREADY has `metaTitle: z.string()`
and `metaDescription: z.string()`, and they are ALREADY consumed by the
public herb product page's `generateMetadata` for real `<title>`/
`<meta description>` output. The gap isn't "build SEO fields" for herbs
— it's narrower: `AddHerbForm.tsx`/`EditHerbForm.tsx` have zero fields
for them; `src/lib/herbs/db/actions.ts:126-127` auto-derives both
(`` `${name} | Spaks Herbs}` `` and a copy of `shortDescription`) with no
way for an admin to override either value.

## 1. What this phase actually covers, precisely separated

| Item | Classification | Action this phase |
|---|---|---|
| Media browsing/management admin screen | Genuinely new | New: filesystem-scan admin screen over `uploaded_files/*`, no new collection (per owner decision). |
| Upload/delete plumbing (`saveAdminUpload`/`deleteAdminUpload`) | Already exists, reused everywhere | Untouched — the new media screen calls the SAME functions every other admin form already uses, not a parallel implementation. |
| Herb `metaTitle`/`metaDescription` — schema + public consumption | Already exists (Phase 6) | Untouched — no schema change. |
| Herb `metaTitle`/`metaDescription` — ADMIN UI | Missing UI over existing, already-live fields | New: add both fields to `AddHerbForm`/`EditHerbForm`, replacing the current auto-derivation in `actions.ts` with admin-supplied values (falling back to the same auto-derivation only when left blank, so existing behavior isn't silently broken for herbs saved before this phase's UI existed). |
| `metaTitle`/`metaDescription` on legacy product/post/category schemas | Genuinely new schema work | **Out of scope this phase**, per owner decision — needs its own D-11-style schema authorization request, not bundled in here. |
| `sitemap.xml` generation | Genuinely new — nothing exists | New: `src/app/sitemap.ts` (Next.js App Router's built-in sitemap convention), covering the public routes this phase can enumerate cheaply (see §2.2). |
| `robots.txt` | Already exists, already ported, unrelated to admin CRUD | Untouched. |
| Redirects — collection + admin CRUD + serving mechanism | Genuinely new | New: `redirects` collection, admin list/add/edit/delete, `middleware.ts` to actually serve them. |

## 2. Design

### 2.1 Media library — filesystem scan, no new collection

A new admin screen, `/admin/media-library`, that:
- Lists the known subdirectories under `public/uploaded_files/`
  (`products`, `categories`, `post`, `slider`, `product-categories`,
  `profile` — confirmed present on disk this phase; the herb store's own
  separate upload tree, `src/lib/herbs/uploads/`, is NOT included here,
  since it is CR-003's own parallel model with its own upload root, not
  part of this migration's `uploaded_files/` tree).
- For a selected subdirectory, lists its files (name, size, modified
  time) via Node's `fs/promises` `readdir`/`stat` — no database read at
  all, so the list is always accurate to what's actually on disk, with
  no risk of drifting from a separate index.
- Supports deleting a file via the EXISTING `deleteAdminUpload` function
  (no new deletion logic) — with an explicit warning that this tool
  cannot know whether the file is still referenced by a product/category/
  post/slider document, since there is no reverse index (a deliberate,
  disclosed limitation of the filesystem-scan approach, not an oversight
  — building that reverse index would require exactly the new collection
  the owner's decision avoided).
- Does NOT support upload-from-this-screen (every existing per-entity
  upload field already covers new uploads; this screen's job is
  browsing/cleanup of what already exists, not a new intake path).

`uploadedFilesRoot()` (`src/lib/uploads/adminUpload.ts:75`) is currently
module-private — this phase exports it (or an equivalent accessor) so
the new screen can resolve the same root the existing upload/delete
functions already use, rather than hardcoding a second path
computation.

### 2.2 SEO — herb admin fields + sitemap

**Herb form fields:** `AddHerbForm`/`EditHerbForm` gain two new fields
(`metaTitle`, `metaDescription`, both optional text inputs). `actions.ts`'s
`parseHerbForm` changes from unconditionally auto-deriving both values to
using the submitted value when non-empty, falling back to the current
auto-derivation only when left blank — so a herb saved through the OLD
form (before this phase) or with the fields left empty keeps exactly its
current auto-derived behavior; nothing regresses silently.

**Sitemap:** `src/app/sitemap.ts`, using Next.js App Router's built-in
`MetadataRoute.Sitemap` convention (auto-served at `/sitemap.xml`, no
new route file needed beyond this one). Entries this phase can build
cheaply and correctly:
- The 3 static pages made CMS-editable in Phase 7
  (`/terms`, `/privacy-policy`, `/return-policy`) plus `/about`.
- Every herb product's public URL (`HerbProductRepository.findAll()`,
  already exists) — the ONE catalog surface with real, live-wired,
  already-correct slugs and `updatedAt` timestamps to report.
- Product/post/category URLs are DEFERRED from the sitemap this phase:
  most of those pages are still `@/lib/demo`-backed per Phase 4/5's own
  disclosed, not-yet-live-wired state — listing demo-catalog slugs in a
  real sitemap would advertise URLs Google could crawl into content that
  doesn't match any real database record, a worse outcome than a
  smaller, wholly-accurate sitemap. Named explicitly here so it isn't
  lost, not silently dropped.

### 2.3 Redirects — new collection, admin CRUD, middleware

New collection `redirects` (own module tree, `src/lib/redirects/`, same
"no Laravel table to trace to, kept separate from the governed
`src/lib/mongodb/schemas/`" precedent Phase 6/7 established):

```
redirectDocSchema = z.object({
  fromPath: z.string().min(1),   // e.g. "/old-product-slug"
  toPath: z.string().min(1),     // e.g. "/product-details/new-slug"
  statusCode: z.union([z.literal(301), z.literal(302)]),
  createdAt: z.string(),
  updatedAt: z.string(),
})
```

- **Why `fromPath` isn't a full URL:** every plausible use here (a
  changed product/post slug, a retired static page) is same-origin;
  nothing in this codebase's existing routing needs a cross-origin
  redirect target, and `toPath` being a relative path keeps the
  middleware's own resolution trivial (no origin-mismatch handling).
- **Serving mechanism:** `middleware.ts` (new — none exists in this
  project yet) reads the `redirects` collection and issues a real HTTP
  301/302 before Next.js resolves the route. Reads happen on every
  matched request, so this phase adds a short in-memory cache (a
  module-level TTL, e.g. 60s) rather than a database round-trip on every
  page load — a new, disclosed performance decision, not present
  precedent elsewhere in this codebase to mirror.
- **Admin UI:** `/admin/redirects-list` (list, delete) +
  `/admin/add-redirect` + `/admin/edit-redirect/[id]` — same CRUD shape
  as `homeopathy-list`/`wellness-categories`.
- **No collision/loop validation beyond the obvious:** this phase does
  not build cycle-detection (A→B→A) or collision-with-a-real-route
  checking — flagged as a known limitation (§6), not solved, since
  neither has a precedent elsewhere in this codebase and either could be
  added later without a schema change.

## 3. Files to create/modify (if the above design is approved as-is)

| File | Change |
|---|---|
| `src/lib/uploads/adminUpload.ts` | Export `uploadedFilesRoot()` (or an equivalent), currently module-private. No other change. |
| `src/app/admin/(shell)/media-library/page.tsx` (new) | Filesystem-scan browser per §2.1. |
| `src/app/admin/(shell)/media-library/DeleteMediaFileButton.tsx` (new) | Calls `deleteAdminUpload`, same `useTransition`/`confirm` shape as `DeleteHerbButton`/`DeleteWellnessCategoryButton`. |
| `src/app/admin/(shell)/add-herb/AddHerbForm.tsx`, `edit-herb/[id]/EditHerbForm.tsx` | Add `metaTitle`/`metaDescription` text inputs. |
| `src/lib/herbs/db/actions.ts` (`parseHerbForm`) | Use submitted `metaTitle`/`metaDescription` when non-empty, else keep the current auto-derivation. |
| `src/app/sitemap.ts` (new) | Per §2.2 — 4 static pages + herb product URLs. |
| `src/lib/redirects/schema.ts` (new) | `redirectDocSchema` per §2.3. |
| `src/lib/redirects/repository.ts` (new) | `RedirectRepository extends ValidatedRepository<RedirectDoc>` — `findAll`, `findByFromPath`, `upsert`, `deleteById`. |
| `middleware.ts` (new, project root) | Reads redirects (short in-memory TTL cache), issues real 301/302 responses. |
| `src/app/admin/(shell)/redirects-list/page.tsx` + delete button (new) | Admin list. |
| `src/app/admin/(shell)/add-redirect/page.tsx` + form (new) | Admin create. |
| `src/app/admin/(shell)/edit-redirect/[id]/page.tsx` + form (new) | Admin edit. |
| `src/components/admin/AdminSidebar.tsx` | Add "Media Library" and "Redirects" links (owner-confirm placement, same as every prior phase). |

## 4. What Phase 8 delivers vs. explicitly does not

**Delivers:**
- Admin can browse and delete files already on disk under
  `uploaded_files/*`, without a new index to keep in sync.
- Admin can set/override a herb product's SEO title and description
  through the existing add/edit forms.
- `/sitemap.xml` exists and lists the pages this phase can vouch for as
  accurate (4 static pages + real herb product URLs).
- Admin can create, edit, and delete URL redirects, and they take real
  effect via middleware.

**Does NOT deliver** (explicitly out of scope, named so nothing is
lost):
- SEO meta fields on the legacy product/post/category schemas — separate,
  larger, D-11-governed schema work.
- A centralized, searchable media index with alt-text/usage metadata —
  ruled out by the owner's filesystem-scan decision.
- Sitemap coverage for products/posts/categories still `@/lib/demo`-backed
  — would advertise inaccurate URLs; deferred until those pages are
  live-wired.
- Redirect loop/collision detection.
- Canonical URL / JSON-LD / OG-tag parity fixes on `/about` (a separate,
  ordinary migration-fidelity gap noted during Phase 8's own research,
  not part of this CR's admin-CMS scope).

## 5. Risks

| Risk | Mitigation |
|---|---|
| Media library's delete has no reverse-reference check — an admin could delete a file still in use by a live product/category/post | Explicit on-screen warning before delete, same disclosed-limitation posture as every other "known gap" in this CR; building a reverse index is exactly the larger option the owner declined. |
| `middleware.ts` redirect lookups adding latency to every request | Short in-memory TTL cache (60s), avoiding a DB round-trip per request; a genuinely new pattern for this codebase, flagged as such rather than presented as precedent. |
| A redirect rule accidentally shadowing a real, working route | No collision detection this phase (§2.3) — admin is trusted to avoid this, same trust level this codebase already places in every other admin CRUD screen. |
| Sitemap listing a URL that later 404s (e.g. a herb product deleted after the sitemap was generated) | Next.js regenerates `sitemap.ts` output per-request by default in this app's existing (non-static-export) configuration, so this self-corrects within Google's own re-crawl cadence — not a new risk class. |

## 6. Testing

- `uploadedFilesRoot()` export: unit test confirming it returns the same
  path `saveAdminUpload`/`deleteAdminUpload` already use.
- `redirectDocSchema`: valid/invalid status code (301/302 only), empty
  `fromPath`/`toPath` rejected.
- `RedirectRepository`: fixture tests (`findByFromPath`, `upsert`,
  `deleteById`) — same pattern as every other repository this CR added.
- `middleware.ts`: a request matching a redirect's `fromPath` issues the
  configured status code and `Location` header; a non-matching request
  passes through unchanged.
- Herb form: submitting non-empty `metaTitle`/`metaDescription` persists
  them verbatim; submitting empty values falls back to the existing
  auto-derivation (regression test against Phase 6's existing herb tests).
- Full existing suite re-run to confirm zero regression.

## 7. Decisions needed before implementation

1. **Confirm the `redirects` schema design in §2.3** (relative
   `fromPath`/`toPath`, 301/302 only, no loop detection) — or propose an
   alternative shape.
2. **Media library subdirectory list**: confirm the 6 directories named
   in §2.1 are the complete, correct set (or if any should be excluded/
   added) — this phase reads them from disk at request time, so the
   list itself needs no hardcoded enum, but the admin screen's own
   top-level navigation needs to know which roots to offer.
3. **Middleware cache TTL**: 60 seconds (§2.3) is a starting default, not
   validated against any real traffic pattern — acceptable as a
   placeholder, or should it be configurable/shorter for this phase?

---

**Awaiting explicit "Proceed with Phase 8" (and answers to §7) before any
file listed in §3 is created or modified.**

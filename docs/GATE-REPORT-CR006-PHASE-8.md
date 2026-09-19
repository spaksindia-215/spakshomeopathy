# GATE REPORT — CR-006 Phase 8 (Media / SEO / Redirects)

**Status:** ✅ COMPLETE, with one significant design revision made during
implementation (redirects serving mechanism) and one real bug found and
fixed before it could ship silently broken (middleware not registering
at all).
**Next step:** Awaiting separate, explicit approval before Phase 9
(Audit log). No Phase 9 work has begun.

---

## 1. What changed

### 1.1 Scoping — Phase 1's classification held up for 2 of 3 sub-areas

Unlike most prior phases, `CR-006-ANALYSIS-PHASE1.md`'s "fully new" call
was CORRECT for Media library and Redirects, confirmed by direct
inspection (no Laravel Media/Gallery controller, no redirect table, no
Next.js middleware existed before this phase). The one real miss, same
category as every prior phase's finding: Phase 1 said "no SEO columns
exist on any of the 34 tables... New" — true for the legacy-traced
schemas, but Phase 1 couldn't have anticipated Phase 6's herb parallel
model (postdates Phase 1's analysis), which already has
`metaTitle`/`metaDescription` fields, ALREADY consumed by the public herb
page's `generateMetadata`. The actual gap was narrower: no admin UI ever
exposed those two fields. Full record in `CR-006-PHASE-8-PLAN.md` §0.

Per owner decision: Media library ships as a filesystem scan (no new
collection); SEO scope limited to the herb form fields + sitemap
(legacy-schema meta fields explicitly deferred, separate D-11-governed
work); Redirects gets a new collection + admin CRUD + serving mechanism.

### 1.2 Significant revision made DURING implementation (redirects)

**Bug found and fixed — middleware silently not registering.** The
plan's `middleware.ts` was first created at the project root. The build
succeeded with no error or warning, but `.next/server/middleware-
manifest.json` came back completely empty (`"middleware": {}`) — the
file was never actually wired in. Root cause: this project uses the
`src/` directory convention (`src/app`, confirmed via `tsconfig.json`'s
path mapping), and Next.js only discovers `middleware.ts` inside `src/`
when that convention is active — a project-root `middleware.ts` is
silently ignored. Caught by inspecting the build's manifest output
directly (not by any compiler/lint/typecheck error — none fired). Fixed
by moving the file to `src/middleware.ts`; rebuilt and confirmed
`ƒ Middleware 34.1 kB` now appears in the build output with the correct
matcher in the manifest.

**Design revision — redirects don't run the MongoDB driver inside
middleware.** The plan assumed `middleware.ts` could call `getDb()`
directly. Next.js Middleware runs in the Edge runtime by default, which
cannot run the MongoDB Node.js driver (no `net`/`tls`). An initial
attempt to work around this by enabling Next.js's Node.js-runtime
middleware failed at typecheck: the installed Next.js version (15.5.22)
has no `experimental.nodeMiddleware` flag and no `runtime` field on the
middleware config type at all (confirmed by inspecting the package's own
`.d.ts` files) — Node runtime middleware simply isn't available in this
version. **Resolution, per owner direction:** `middleware.ts` stays on
the default Edge runtime and calls a new, ordinary Route Handler,
`GET /api/redirects` (which DOES run in the normal Node.js server
context, like every other route handler in this codebase), instead of
importing the MongoDB driver itself. Middleware caches that response for
60s, same TTL the original design specified.

### 1.3 New files (17)

- `src/app/admin/(shell)/media-library/page.tsx` — filesystem-scan
  browser over the 6 confirmed `uploaded_files/*` subdirectories.
- `src/app/admin/delete-media-file/[subdirectory]/[filename]/route.ts` —
  delete route, calls the existing `deleteAdminUpload`.
- `src/lib/redirects/schema.ts` — `redirectDocSchema`.
- `src/lib/redirects/repository.ts` — `RedirectRepository`.
- `src/app/api/redirects/route.ts` — JSON endpoint `src/middleware.ts`
  calls (§1.2).
- `src/middleware.ts` — the redirect-serving middleware itself.
- `src/app/admin/(shell)/redirects-list/page.tsx` — admin list.
- `src/app/admin/(shell)/add-redirect/page.tsx` — admin create form.
- `src/app/admin/(shell)/edit-redirect/[id]/page.tsx` — admin edit form.
- `src/app/admin/save-redirect/route.ts`,
  `src/app/admin/update-redirect/route.ts`,
  `src/app/admin/destroy-redirect/[id]/route.ts` — write/delete handlers.
- `src/app/sitemap.ts` — `/sitemap.xml` generation.
- `tests/lib/redirectRepository.test.ts` — 13 tests (schema validation +
  repository CRUD).

### 1.4 Modified files (6)

- `src/lib/uploads/adminUpload.ts` — exported the previously module-
  private `uploadedFilesRoot()` so the media library screen resolves the
  same root the existing upload/delete functions already use.
- `src/app/admin/(shell)/add-herb/AddHerbForm.tsx`,
  `edit-herb/[id]/EditHerbForm.tsx` — added `metaTitle`/`metaDescription`
  text inputs.
- `src/lib/herbs/db/actions.ts` (`parseHerbForm`) — uses the submitted
  `metaTitle`/`metaDescription` when non-empty, falling back to the
  pre-Phase-8 auto-derivation (`` `${name} | Spaks Herbs}` ``, a copy of
  `shortDescription`) when left blank — a herb saved with these fields
  empty, or through data predating this phase's form, keeps exactly its
  previous behavior.
- `src/components/admin/AdminSidebar.tsx` — added "Media Library" and
  "Redirects" to the existing Phase 7 "Content" tree.
- `tests/lib/adminUpload.test.ts` — added 2 tests for the newly-exported
  `uploadedFilesRoot()`.

## 2. What was tested

| Check | Result |
|---|---|
| `npm run typecheck` | ✅ Clean |
| `npm run lint` | ✅ 0 errors, 4 pre-existing warnings (unchanged since Phase 2) |
| `npx vitest run` — full suite | ✅ **599/599 passed, 68/68 test files** — zero regressions (up from 584/67 before this phase) |
| `npm run build` (production) | ✅ Clean; confirmed `ƒ Middleware 34.1 kB` registered with the correct matcher in `.next/server/middleware-manifest.json` (after the location fix, §1.2) |
| End-to-end redirect smoke test against the real dev server and real dev database | ✅ Inserted a real `redirects` document via a throwaway script; `GET /api/redirects` reflected it; a request to the configured `fromPath` returned a genuine HTTP 301 with the correct `Location` header; `/admin/*` routes confirmed to bypass the middleware matcher (auth-redirect fired instead, not a redirect-loop); a non-matching path (`/about`) passed through with 200. Test document deleted after verification. |
| `sitemap.xml` against the real dev server | ✅ Correctly listed all 4 static pages; correctly listed 0 herb product URLs (verified separately: `isHerbsDbConfigured()` is true in this environment, but 0 real herb products exist in the DB — all herb data seen publicly still comes from the static seed catalog — so the sitemap's "only DB-verified URLs" design behaved exactly as intended, not a bug) |

## 3. Files changed

**Created (17):** listed in §1.3 (13 application files + 1 test file;
note `middleware.ts` was created then moved to `src/middleware.ts`
during implementation, not left as two files).
**Modified (6):** listed in §1.4.
**Deleted:** none (three throwaway verification/smoke-test scripts were
created and removed after use — not part of the shipped change set).

## 4. What Phase 8 explicitly does NOT do

- No `metaTitle`/`metaDescription` fields on the legacy product/post/
  category schemas — separate, larger, D-11-governed schema work, per
  owner decision.
- No centralized, searchable media index with alt-text/usage metadata —
  ruled out by the owner's filesystem-scan decision; the media library
  has no reverse-reference check before deleting a file (disclosed
  on-screen).
- No sitemap coverage for products/posts/categories still
  `@/lib/demo`-backed — would advertise inaccurate URLs.
- No redirect loop/collision detection.
- No canonical URL / JSON-LD / OG-tag parity fixes on `/about` — a
  separate, ordinary migration-fidelity gap noted during this phase's
  own research, not part of this CR's admin-CMS scope.

## 5. Files intentionally left untouched

- `src/lib/mongodb/schemas/product.ts`, `post.ts`, `category.ts` — no
  meta fields added, per owner decision.
- The Herbs Store's own separate upload tree (`src/lib/herbs/uploads/`)
  — not part of this migration's `uploaded_files/` scope, not included
  in the media library's subdirectory list.
- `robots.txt` — already existed, already ported, untouched.
- Every other admin CRUD screen from prior phases — untouched.

## 6. Limitations / known gaps carried forward

- The media library's delete has no reverse-reference check — disclosed
  on-screen (§4).
- The middleware's 60s redirect cache is a starting default, not
  validated against real traffic.
- No collision/loop detection on redirect rules — an admin could shadow
  a real route or create a redirect loop; trusted the same way every
  other admin CRUD screen in this codebase already is.
- This is the first use of Next.js Middleware and of a project Route
  Handler being called BY middleware (rather than by a browser/form) in
  this codebase — both new patterns, flagged as such rather than
  presented as established precedent.
- No git repository exists in this project [per prior phases' stated
  convention]; NOTE this phase's own `git status` check found a real git
  repository IS present and tracked (`On branch main... up to date with
  'origin/main'`) — worth re-verifying this assumption in a future
  phase's gate report rather than continuing to state it as fact.

---

**Awaiting explicit approval before Phase 9 (Audit log). No Phase 9 work
has begun.**

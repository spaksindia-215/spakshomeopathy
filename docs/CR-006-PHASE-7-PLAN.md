# CR-006 Phase 7 — Implementation Plan: Content CMS (Product Reviews + Pages)

**Status:** ✅ IMPLEMENTED — see `GATE-REPORT-CR006-PHASE-7.md` for the
final, as-built record (including two scope revisions made during
implementation: `/about` excluded, and the seed-script idea abandoned in
favor of shipping the `pages` collection empty — both explained there and
inline below).
**Depends on:** `GATE-REPORT-CR006-PHASE-6.md` (Phase 6 complete).
**Scope narrowed by owner decision (2026-09-15):** (1) product reviews —
migrate the existing Laravel admin workflow as-is, not a broader
standalone testimonials module; (2) navigation/homepage-section builder —
excluded from this phase, left blocked on the separate CR-001 §24.5
file-protection reconciliation.

---

## 0. Correction to this CR's own earlier scoping — read first

Unlike Phases 3–6, `CR-006-ANALYSIS-PHASE1.md`'s classification of Phase
7 was **mostly right** — it correctly excluded blog posts, blog
categories, and sliders from this phase (labeled "✅ Ported" elsewhere in
the doc), because that admin CRUD was already fully built during
milestone M5-E, before CR-006 even started (`docs/GATE-REPORT-M5-E-BLOGS.md`,
`-POSTS.md`, `-BLOG-CATEGORIES.md`, `-SLIDER.md`). Confirmed again this
phase — those screens (`add-blog`, `blog-list`, `add-post`, `post-list`,
`add-slider`, `slider-list`, etc.) are real, live, unrelated to this
phase's scope, and are not touched here.

**One miss, found this phase:** Phase 1 §3 called "testimonials" pure
new scope ("`product_review` table exists (0 rows)... A generic
testimonials module... is new scope beyond this table's actual, narrow
use"). Direct inspection of `AdminController.php` found this is not
quite right — a live, routed, functional admin workflow already exists
in Laravel:

- `ReviewList()` (`AdminController.php:1295-1301`) — `product_review JOIN
  products`, rendered as `admin.review-list.blade.php`.
- `ReviewUpdate($id, $status)` (`AdminController.php:1303-1308`) — toggles
  `r_status` (0/1, rendered as an "Active"/"Inactive" button, i.e. a
  show/hide flag on the storefront, not an approval workflow with more
  states).
- Routes: `review-list`, `update-review/{id}/{status}`
  (`routes/admin.php:117-118`).

This is real, if small, migration work — not a from-scratch design. The
"0 rows in production" fact both Phase 1 and the M3 migration mapping
correctly noted remains true and is not contradicted; what was missed is
that the *admin controller for it* already exists and was never ported,
same category of miss as every prior phase (real functionality present,
just overlooked).

**Also confirmed this phase:** `product_review` is **already embedded**
in the Next.js `products` schema as `reviews: ProductReview[]`
(`src/lib/mongodb/schemas/product.ts:52-63`, `legacyId`/`rName`/`rEmail`/
`rRating`/`rReview`/`rStatus`) — a direct carry-over from the M3
migration, predating CR-006. No new collection or schema field is needed
for this half of the phase; only admin UI and one new repository method.

**Pages CMS** — Phase 1's "fully new" classification is correct and
confirmed directly: `TermsConditions()`/`returnpolicy()`/
`PrivacyPolicy()`/`AboutUs()` (`HomeController.php:254,878,883,890`) are
plain `return view(...)` calls with zero database backing — same
confirmed on the Next.js side (`src/app/terms/page.tsx`,
`/return-policy`, `/privacy-policy`, `/about`, each a hardcoded,
byte-identical port with its own header comment saying so). This is
genuinely new scope, no correction needed.

## 1. What this phase actually covers, precisely separated

| Item | Classification | Action this phase |
|---|---|---|
| `product_review` embedded schema (`reviews` array on `products`) | Already exists (M3 migration) | Untouched — no schema change. |
| Product-review ADMIN list/status-toggle | Real Laravel admin surface, never ported | New: migrate `ReviewList`/`ReviewUpdate` as a Next.js admin screen, reading/writing the existing `reviews` array. |
| Broader/standalone testimonials module (not tied to a product) | Explicitly excluded per owner decision | **Out of scope.** Not designed or built this phase. |
| Static pages (Terms/Privacy/Return Policy/About) — page chrome (header, breadcrumb, banner image, footer) | Already exists, byte-verified, unrelated to this phase | **Untouched.** Not rebuilt or made dynamic — see §2.2's scoping rationale. |
| Static pages — BODY content (Terms/Privacy/Return Policy only) | Genuinely new: no DB table, hardcoded JSX today | New: add a database-backed `pages` collection + admin CRUD for the body content specifically, swap each page's body section to render from it (falling back to the existing hardcoded JSX when unconfigured, same pattern every other DB-optional feature in this codebase uses). |
| Static page — About | Structurally different (two-column layout, address card, CTA buttons — no comparable single content region) | **Excluded this phase** — see §2.2's revision note; would need its own scoping, not force-fit into the same 3-page pattern. |
| Navigation / homepage-section builder | Blocked on CR-001 §24.5 | **Out of scope**, per owner decision. Not investigated further this phase. |

## 2. Design

### 2.1 Product reviews — no schema change, new repository method + admin UI

`productReviewSchema` (`schemas/product.ts:56-63`) is untouched. Add ONE
new method to `ProductRepository`:

```
async updateReviewStatus(productLegacyId: number, reviewLegacyId: number, rStatus: number): Promise<void>
```

- **Why a dedicated method, not the generic `updateOne`:** `reviews` is
  an array embedded on the product document; toggling one review's
  status is a positional array-element update
  (`{ legacyId: productLegacyId }`, `$set: { 'reviews.$[r].rStatus':
  rStatus }`, `arrayFilters: [{ 'r.legacyId': reviewLegacyId }]`), a
  different MongoDB shape from `ValidatedRepository.updateOne`'s flat
  `$set` — no existing repository in this codebase has needed this
  pattern yet (checked; `diseaseCategoryIds` and every other array field
  added so far is replaced wholesale, not element-patched). This is
  new, minimal, targeted surface area, not a rewrite of the base class.
- **Admin list**: a new `/admin/review-list` page reads all products
  (`ProductRepository.findAll` — TO ADD, a thin `find({})` wrapper
  mirroring `HerbProductRepository.findAll`'s shape, since no existing
  method returns every product unfiltered) and flattens each product's
  `reviews` array into rows shaped like the Laravel join output
  (`p_name`, `r_name`, `r_review`, `r_status`) — replicating the exact
  behavior of `ReviewList()`'s `JOIN`, done in application code instead
  of a database join (same DR-01 "don't blindly translate joins"
  posture Phase 4/5 already used elsewhere).
- **Status toggle**: `/admin/update-review/[productId]/[reviewId]/[status]`
  or a Server Action equivalent — mirrors `ReviewUpdate`'s
  toggle-and-redirect-back behavior. Given 0 real reviews exist in
  production today, this ships as real, working, immediately-testable
  code with synthetic/seed data, exactly as honest about "0 live rows"
  as the Laravel original always was.

### 2.2 Pages CMS — new collection, chrome left alone

**Governing decision:** do NOT rebuild these 4 pages' full markup as a
generic page-builder. Each page (`terms`, `privacy-policy`,
`return-policy`, `about`) has hand-styled, page-specific JSX (breadcrumb
label, banner image, `<title>`) already verified byte-identical to
production (each file's own header comment). Rebuilding that chrome as
database-driven content would be a large, unjustified redesign of
already-correct, already-tested migration output — no behavioral gap
motivates touching it (same "don't redesign without a named functional
requirement" discipline D-11 established for schema work, applied here
to page structure instead).

**What's actually missing and genuinely new:** the BODY content — the
structured HTML block inside each page's main content `<section>`
(headings, paragraphs, lists — see `terms/page.tsx`'s "Use of the
Website" / "Medical Disclaimer" / "Orders and Payments" sections as the
concrete shape) — is hardcoded JSX with no admin path to edit it. An
admin who needs to fix a typo or add a clause today has no option but a
code change.

New collection `pages` (net-new, no Laravel table to trace to — same
"own module tree, not the governed schema files" precedent Phase 6 set
for `wellnessCategories`, though this one has no reason to avoid
`src/lib/mongodb/schemas/` specifically since it isn't part of the herbs
parallel model; it will live under a new `src/lib/pages/` tree instead,
mirroring that same net-new-surface-area convention):

```
pageDocSchema = z.object({
  slug: z.enum(['terms', 'privacy-policy', 'return-policy', 'about']),
  title: z.string().min(1),
  bodyHtml: z.string(),   // raw HTML, rendered via dangerouslySetInnerHTML —
                          // same convention `postDesc`/`blogDesc` already use
                          // (src/app/post-details/[slug]/page.tsx:73), since
                          // the source content itself is structured HTML
                          // (headings/lists), not plain text or Markdown.
  updatedAt: z.string(),
})
```

- **Why `slug` is a closed enum, not a free string:** exactly 4 pages
  exist and are routed today; an admin cannot create a 5th arbitrary
  page through this collection (that would require new Next.js routes,
  which this phase does not add) — the enum keeps the collection's
  actual capability honest rather than implying a generic page-builder
  that isn't being built.
- **Read path**: each of the 4 page components fetches its own document
  by slug (DB-first, falling back to the current hardcoded JSX block
  when unconfigured or the document doesn't exist yet — same
  degrade-gracefully posture every other optional-DB feature in this
  codebase uses, e.g. `readHerbProductsFromDb`), and renders `bodyHtml`
  via `dangerouslySetInnerHTML` in place of the hardcoded content block.
  The surrounding chrome (breadcrumb, banner image, header/footer) is
  NOT touched or templated — it stays exactly as it is in each page
  file today.
- **Seed — REVISED during implementation (no transcription of body
  content is done by hand or by an automated renderer):** direct
  inspection of the 4 target pages found `about/page.tsx` has a
  genuinely different structural shape (two-column layout, embedded
  address card, appointment CTA buttons — no single "content body"
  region comparable to the other 3), so it is EXCLUDED from this phase's
  editable set (see revised `pageSlugSchema`, §2.2 below). For the
  remaining 3 pages (`terms`/`privacy-policy`/`return-policy`), each has
  a well-defined content region (from the page's `<h1>` through the end
  of its enclosing `<section className="cover-page...">`), but
  `privacy-policy`'s region alone is ~600 lines of structured markup
  including a documented, deliberately-preserved parser quirk (§14 of
  that file's own header). Retyping that into a new file by hand risks
  an undetected transcription error on a live legal page; there is no
  seed step here that avoids that risk except not doing it. **No seed
  script is used.** The `pages` collection ships EMPTY: every page falls
  back to its exact, already-verified, unmodified JSX until an admin
  explicitly writes a replacement through the new admin editor — zero
  risk to existing rendered output, at the cost of the admin UI doing
  nothing visible on day one (an honest, disclosed trade-off, not a
  silent gap).
- **Admin UI**: `/admin/pages-list` (4 fixed rows, one per slug, no
  add/delete — matches the closed-enum design) + `/admin/edit-page/[slug]`,
  reusing the EXISTING `CKEditorPlaceholder` component
  (`src/components/admin/CKEditorPlaceholder.tsx`) for the `bodyHtml`
  field — confirmed this phase to be exactly this codebase's established
  answer for a raw-HTML admin content field: a real, name-addressable
  `<textarea>` with inert CKEditor-styled toolbar chrome, already used
  for `post_desc`/`blog_desc`/`p_desc` (per that component's own header,
  a deliberate M4-DEMO-phase owner decision, not a placeholder awaiting
  replacement). No new dependency, no new decision — reuse as-is.

## 3. Files to create/modify (if the above design is approved as-is)

| File | Change |
|---|---|
| `src/lib/mongodb/repositories/productRepository.ts` | ADD `findAll()` and `updateReviewStatus(productLegacyId, reviewLegacyId, rStatus)`. `productReviewSchema`/`productSchema` untouched. |
| `src/app/admin/(shell)/review-list/page.tsx` | New admin screen — flattens every product's `reviews` array into rows, mirrors `ReviewList()`'s join output and `homeopathy-list`'s DataTable presentation. |
| `src/app/admin/(shell)/review-list/UpdateReviewStatusButton.tsx` (or a Server Action) | Toggle `rStatus` 0/1, mirrors `ReviewUpdate`'s behavior. |
| `src/lib/pages/schema.ts` (new) | `pageDocSchema` per §2.2 (3-slug enum — `about` excluded, see revision note). |
| `src/lib/pages/repository.ts` (new) | `PageRepository extends ValidatedRepository<PageDoc>` — `findBySlug`, `findAll`, `upsert`. |
| No seed script | REVISED during implementation — see §2.2's revision note. The collection ships empty; no body content is hand-transcribed or auto-rendered into a seed value. |
| `src/app/admin/(shell)/pages-list/page.tsx` (new) | Lists the 3 fixed page slugs, DB status ("Customized" / "Not customized"). |
| `src/app/admin/(shell)/edit-page/[slug]/page.tsx` + form (new) | Editor for one page's `title`/`bodyHtml`, reusing the existing `CKEditorPlaceholder` component for `bodyHtml` — no new editor widget built. |
| `src/app/terms/page.tsx`, `privacy-policy/page.tsx`, `return-policy/page.tsx` | Wrapped in a conditional: if a `PageRepository.findBySlug` document exists, render its `bodyHtml` via `dangerouslySetInnerHTML` in place of the content region; otherwise render the EXACT existing JSX, byte-for-byte unmoved — no content was cut, retyped, or extracted into a separate file. Chrome (breadcrumb/banner/header/footer) untouched either way. `about/page.tsx` NOT touched at all this phase. |
| `src/components/admin/AdminSidebar.tsx` | Add "Review List" and "Pages" links (owner-confirm placement, same as every prior phase's sidebar addition). |

## 4. What Phase 7 delivers vs. explicitly does not

**Delivers:**
- Admin can view and toggle the status of product reviews (currently
  impossible — no admin path exists at all today).
- Admin can edit the body text of the 4 legal/informational pages
  without a code change.

**Does NOT deliver** (explicitly out of scope, per owner decision):
- A standalone/general testimonials module unrelated to a specific
  product.
- Any navigation or homepage-section builder.
- A generic page-builder capable of creating NEW pages beyond the 4
  that already exist and are routed.
- A rich-text/WYSIWYG editor dependency (raw HTML textarea only, unless
  §5's Q2 changes this).

## 5. Decisions needed before implementation

1. **Confirm the `pages` collection design** (§2.2) — closed 4-slug enum,
   raw-HTML body field via the existing `CKEditorPlaceholder` widget,
   chrome left untouched — or propose an alternative shape.
2. **Seed timing**: run `scripts/seed-pages.ts` as part of this phase
   (dry-run reviewed first, then explicit separate approval for the real
   write, same as Phase 6's wellness-category seed), or leave it
   documented and unexecuted for a later phase?

## 6. Risks

| Risk | Mitigation |
|---|---|
| A positional array-element update (`updateReviewStatus`) is new territory for this codebase's repository layer | Scoped to one small, well-tested method; existing `ValidatedRepository` base class untouched. |
| Rendering `bodyHtml` via `dangerouslySetInnerHTML` from an admin-editable field is an XSS surface if ever exposed to non-admin input | Same posture as `postDesc`/`blogDesc` today (already admin-only input, already rendered unescaped) — not a new risk class introduced by this phase, but worth naming: this field is trusted admin content only, never end-user-submitted. |
| Seeding page body HTML incorrectly could visibly change a legal page's live text | Dry-run by default; seed script extracts content verbatim from the current JSX rather than being retyped by hand, minimizing transcription risk; real run requires separate explicit approval after dry-run review. |
| Scope creep into a general page-builder | Closed 4-slug enum deliberately prevents this; explicitly named as NOT delivered in §4. |

---

**Awaiting explicit "Proceed with Phase 7" (and answers to §5) before any
file listed in §3 is created or modified.**

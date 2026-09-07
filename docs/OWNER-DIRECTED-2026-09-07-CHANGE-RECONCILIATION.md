# OWNER-DIRECTED 2026-09-07 CHANGE RECONCILIATION

**Type:** Governance reconciliation, following explicit owner authorization
of the 2026-09-07 work previously flagged as undocumented. **Not an
implementation task.** No code, database, or configuration change was made
in the production of this document. No file was reverted, edited, redesigned,
or fixed. No historical gate report was modified. No Atlas connection was
attempted; no write of any kind was performed against any database. M6 was
not started.
**Date:** 2026-09-07
**Author:** Claude Code, at owner instruction, following
`docs/M5-POST-GATE-RECONCILIATION-2026-09-07.md`.
**Governing documents re-read in full for this reconciliation:**
`MIGRATION-CONTRACT.md` v1.0, `spakshomeopathy-next/docs/CR-003-HERBAL-ECOMMERCE-SECTION.md`
(in full, including its §10 amendment), `docs/GATE-REPORT-M5-CONSOLIDATION.md`,
`spakshomeopathy-next/docs/GATE-REPORT-M5-CART.md`,
`spakshomeopathy-next/docs/M5-POST-GATE-RECONCILIATION-2026-09-07.md`,
`spakshomeopathy-next/docs/M3-OWNER-DECISION-RECORDS.md`,
`MIGRATION-CONTRACT.md` §9.2/§9.3/§9.4/§22 (registers and logs).
**Independent, read-only inspection performed this session:** full-content
read of `src/components/layout/PublicHeader.tsx` (current state, compared
line-by-line against `GATE-REPORT-M5-CART.md` §3's own textual description
of its M5-Cart-era change); full-content read of every file under
`src/lib/motherTincture/db/` and `src/lib/motherTincture/uploads/`; a
directory-tree enumeration of `src/lib/herbs/**` and `src/app/herbs/**`
with mtimes; a targeted read of `src/lib/herbs/payments/config.ts` and a
grep of `src/lib/herbs/payments/razorpay.ts` for hardcoded secrets; a
`npm run build` route-table inspection confirming which of the new routes
are live/built; a grep-based check that the Herbs Store code does not
touch `add-hurbcat`, `search-products` (B-14), the legacy `products`
schema, or the legacy cart internals. **No MongoDB connection was made.
No write of any kind was performed. No guard was modified, weakened, or
bypassed.**

---

## 1. OWNER AUTHORIZATION

> **Owner:** homeopathy38@gmail.com (identified per this session's own
> environment context)
> **Decision:** The undocumented 2026-09-07 work identified by
> `docs/M5-POST-GATE-RECONCILIATION-2026-09-07.md` — the homepage
> redesign (`RedesignedHome`, the `/` and `/home` swap, the `/redesign`
> archive route), the `PublicHeader.tsx` navigation restructuring, the
> `/homeopathy/*` and `/nutrition` sections, `/admin/add-mother-tincture`
> and its supporting database/upload layer, and the related
> `AdminSidebar.tsx` additions — **was intentionally created by the
> project owner.** It is not accidental, not unauthorized, and not to be
> reverted, redesigned, or otherwise altered on the basis of the prior
> reconciliation's findings.
> **Instruction:** the work is confirmed intentional; it must now be
> brought into the project's formal governance record via the correct
> mechanism, determined by this document (§4), not assumed to already be
> covered by any existing CR.
> **Date:** 2026-09-07

This document treats the above as settled. It does **not** re-litigate
whether the work happened or whether it was wanted — both are now
established facts. What remains open, and what this document exists to
resolve, is purely the **documentary/governance question**: which existing
mechanism (if any) already covers each piece of work, and where a new one
is required.

---

## 2. WORK INVENTORY

Re-verified this session by direct file inspection (superseding, not
duplicating, the file-by-file table already produced in
`docs/M5-POST-GATE-RECONCILIATION-2026-09-07.md` §3 — that inventory is
correct and is not repeated in full here; this section adds what that
document did not yet have: the discovery of a second, larger,
**already-authorized** body of work, and the completed read-only safety
inspection).

### 2.1 — Previously inventoried (2026-09-07-dated files, from the prior reconciliation)

- `src/app/page.tsx`, `src/app/home/page.tsx` — homepage swap to `RedesignedHome`
- `src/app/redesign/page.tsx`, `RedesignedHome.tsx`, `redesign.css`
- `src/components/layout/PublicHeader.tsx` — nav consolidation
- `src/app/homeopathy/**` (4 pages) + `src/components/homeopathy/**` (13 components) + `src/lib/homeopathy/queries.ts`
- `src/app/nutrition/page.tsx`
- `src/app/mother-tincture/page.tsx` (modified)
- `src/app/admin/(shell)/add-mother-tincture/**` (2 files)
- `src/lib/motherTincture/**` (9 files: db/, uploads/, catalog.ts)
- `src/components/admin/AdminSidebar.tsx` — new Mother Tincture treeview entry

### 2.2 — NEWLY DISCOVERED this session: a complete, separate Herbs Store implementation, dated 2026-08-30/31

This was **not** in either prior report's inventory because its files
predate the "≥2026-09-06" mtime window both prior sweeps used. It exists,
is live, and is built:

**Library code** (`src/lib/herbs/**`, 23 files, all dated 2026-08-30
21:34 through 2026-08-31 15:37):
`storage.ts`, `types.ts`, `catalog.ts`, `queries.ts`,
`payments/razorpay.ts`, `payments/config.ts`, `uploads/{index,storage,config}.ts`,
`data/{taxonomy,products,content}.ts`, `db/{index,config,client,herbProductRepository,actions,schema,service}.ts`,
`orders/{index,orderRepository,actions,schema,service}.ts`.

**Routes** (confirmed live in `npm run build`'s route table this session):

```
ƒ /herbs
ƒ /herbs/products
ƒ /herbs/wishlist
ƒ /herbs/search
ƒ /herbs/wellness
ƒ /herbs/wellness/[category]
ƒ /herbs/cart
ƒ /herbs/product/[slug]
ƒ /herbs/learn/[slug]
ƒ /herbs/category/[form]
ƒ /herbs/checkout
ƒ /admin/add-herb                    2.21 kB
ƒ /admin/edit-herb/[id]              4.04 kB
ƒ /admin/herbs-list                    733 B
ƒ /api/herbs/razorpay-webhook
```

This is a real, functioning storefront: category/wellness browsing,
product detail, search, wishlist, cart, checkout, a Razorpay payment
integration with a webhook endpoint, and full admin CRUD (add/edit/list).
**This is precisely, exhaustively the scope `CR-003-HERBAL-ECOMMERCE-SECTION.md`
describes and its §10 amendment authorizes** (§4 below verifies this claim
directly rather than asserting it).

---

## 3. GOVERNANCE CLASSIFICATION

Per the owner's task, work is sorted into six categories:

### A. Homepage redesign

`src/app/page.tsx`, `src/app/home/page.tsx`, `src/app/redesign/**`,
`PublicHeader.tsx`'s nav-consolidation region (lines ~121–177, the
`<ul className=" navigation-box">` block — **distinct from** the
cart-badge region M5-Cart owns, see §6).

### B. New public informational/product sections

`src/app/homeopathy/**`, `src/components/homeopathy/**`,
`src/lib/homeopathy/queries.ts`, `src/app/nutrition/page.tsx`.

### C. Herbs Store work

All of §2.2 — `src/lib/herbs/**`, `src/app/herbs/**`,
`src/app/admin/(shell)/{add-herb,edit-herb,herbs-list}/**`,
`src/app/api/herbs/razorpay-webhook/**`, plus the "Herbs Store"
`AdminSidebar.tsx` treeview entry and the "Herbs Store" / "Herbs" links
folded into `PublicHeader.tsx`'s new Menu dropdown.

### D. Mother Tincture admin functionality

`src/app/admin/(shell)/add-mother-tincture/**`,
`src/lib/motherTincture/**`, the "Mother Tincture" `AdminSidebar.tsx`
treeview entry, and `src/app/mother-tincture/page.tsx`'s 2026-09-07
modification (content of that specific modification not diffed this
session — flagged, not assumed, in §7).

### E. Header/navigation changes

`PublicHeader.tsx` (nav consolidation, category A above) and
`AdminSidebar.tsx` (two new treeview entries, categories C and D above) —
listed here separately per the owner's task structure, though the actual
file-level changes are already counted once each in A/C/D; this category
exists to answer the navigation-specific questions in §6 and §8 without
double-counting files.

### F. Other additive functionality

None identified beyond A–E in this session's inspection.

---

## 4. CR-003 RELATIONSHIP — WHAT IS AND ISN'T COVERED

This is the central governance question, verified directly against
`CR-003-HERBAL-ECOMMERCE-SECTION.md`'s own text rather than assumed.

### 4.1 — What CR-003 actually authorizes (§10 amendment, controlling)

CR-003 §10.7's approval block reads: **Option A — approve now, in-contract**,
signed by the owner, 2026-08-30. §10.5 resolves five design questions
directly: parallel `herbProducts` collection (not schema extension),
separate taxonomy, specific component-reuse boundaries (general layout/CSS
tokens/auth session reused; all Herbs-specific UI new; cart reused *only if*
compatible, else a parallel Herbs cart), scoped new CSS, and an explicit
admin CRUD surface. §10.3 carries forward conditions: reference-site
UI/UX-only, Spaks branding, no altering existing site behavior except
minimal additive edits to protected shared files (header/footer/sidebar/cart),
`add-hurbcat`/B-14 untouched. §10.4 adds: new code lives under new paths
(`src/app/herbs/**`, `src/components/herbs/**`), any edit to a shared file
is minimal and disclosed, `npm run verify` must still pass.

### 4.2 — Category C (Herbs Store) — COVERED BY CR-003, verified match

This session's direct inspection (§2.2, and the safety audit in §7)
confirms the actual Herbs Store implementation matches CR-003 §10.5's
resolved design questions closely:

- Parallel MongoDB collections/database, not a `products` schema
  extension — **confirmed** (`src/lib/herbs/db/config.ts`'s own header,
  read this session, describes a separate logical database name).
- Separate cart (`HerbsCartPage`, `/herbs/cart`) rather than reusing
  legacy cart internals — **confirmed**, matching §10.5's fallback option
  ("If the existing cart cannot cleanly hold herb items... a parallel,
  clearly-labeled Herbs cart is used instead").
- New code under new paths (`src/app/herbs/**`, `src/lib/herbs/**`) —
  **confirmed**.
- `add-hurbcat` and B-14 (`search-products`) left untouched — **confirmed**
  by direct grep this session; the one string match found
  (`src/lib/herbs/uploads/config.ts`) is a documentation reference
  confirming non-interference, not an actual code dependency.
- Shared/protected files (`PublicHeader.tsx`, `AdminSidebar.tsx`) receive
  only new, additive entries for Herbs Store navigation, not a rewrite of
  existing Herbs-unrelated markup — **confirmed** for the specific
  Herbs-Store-related lines in each file (the separate nav-consolidation
  question, category A/E, is analyzed on its own in §4.4/§6).

**Conclusion: Category C (Herbs Store) requires no new Change Request. It
is already, fully, explicitly authorized by CR-003 §10 (the 2026-08-30
amendment), and the implementation as found matches that authorization's
own resolved design questions closely enough that this session finds no
scope excess requiring a fresh decision.** One item remains genuinely
open, not resolved by CR-003 itself: whether the *live, indexable*
placement of `/herbs` in production navigation was intended at this stage,
versus a demo/internal-only posture — CR-003's own §10.1 states the
early-implementation override was requested "for a demonstration to a
non-technical stakeholder," which does not, on its own text, resolve
whether `/herbs` should currently be indexable/discoverable by the public
at large. This is listed as an open item in §8, not decided here.

### 4.3 — Category D (Mother Tincture) — NOT COVERED BY CR-003, NEW CR REQUIRED

`CR-003-HERBAL-ECOMMERCE-SECTION.md` is scoped, by its own title, §0, §1,
and §2, **exclusively to the herbal e-commerce section** modeled on
`indianjadibooti.com/Jadistore/`. It contains **zero mention of "Mother
Tincture"** as a feature (the phrase appears in the existing, legitimate,
migration-governed `/mother-tincture` static page and its price-list PDF
link — both pre-existing, in-scope migration artifacts, not this new
admin-CRUD feature). The Mother Tincture admin-add functionality:

- targets a real, existing Laravel-ported route (`/mother-tincture`) but
  adds functionality (`/admin/add-mother-tincture` and its DB/upload
  layer) that **has no Laravel counterpart** — this is new-feature work
  by the same F-10/§3.2 standard CR-003 itself applied to the Herbs Store,
- was built using the Herbs Store's own architecture as an explicit
  template (`client.ts`'s own header: "Mirrors both of those modules'
  shape and safety guards deliberately... same 'parallel model' rationale
  as `@/lib/herbs/db/client.ts`'s own header, extended one level further"),
  which is good engineering discipline but is not itself authorization,
- is not listed anywhere in CR-003's scope (§2), its conditions (§8/§10.3),
  or its resolved design questions (§10.5).

**Conclusion: Category D requires its own new Change Request.** It is
architecturally sound and clearly modeled on CR-003's own precedent, but
it is a distinct feature addition that CR-003's text does not cover, and
per this project's own established discipline (no silent folding of one
authorized scope into an adjacent, unauthorized one — the same principle
`docs/GATE-REPORT-M5-CONSOLIDATION.md` and the prior reconciliation both
applied), it should not be retroactively treated as CR-003-covered merely
because it reuses CR-003's patterns well.

### 4.4 — Category A (Homepage redesign) — NOT COVERED BY CR-003, NEW CR REQUIRED

CR-003 is scoped to "the Herbs Store" specifically. Nothing in it
authorizes replacing the site's actual homepage content at `/` and `/home`
with a "from-scratch homepage design" (`RedesignedHome.tsx`'s own
description). This is a distinct decision from "build an additive Herbs
Store under `/herbs`" — it changes what every visitor to the site's root
URL sees, which CR-003 §10.3's own carried-forward condition explicitly
excludes ("Existing site behavior... Not to be altered by this CR, now or
during the deferred build's implementation, except where the deferred
build's own future CR/milestone explicitly approves a specific additive
change" — a full homepage replacement is not "a specific additive
change").

**Conclusion: Category A requires its own new Change Request**, separate
from both CR-003 and from any Mother Tincture CR.

### 4.5 — Category B (New public sections: homeopathy, nutrition) — NOT COVERED BY CR-003, NEW CR REQUIRED (or folds into the Category A CR)

Same reasoning as A — CR-003's scope is the Herbs Store specifically. A
`/homeopathy` section and a `/nutrition` page are new, additive public
surface with no Laravel counterpart, structurally identical in *kind* to
what CR-003 required a CR for, but not covered by CR-003's own text. They
may reasonably be combined into the same new CR as Category A (both are
"new public-facing informational/marketing surface, non-Herbs, dated the
same session"), or kept separate — this document does not decide which;
see Decision 1 in §8.

### 4.6 — Category E (Header/navigation changes)

Not a separate governance question from A/C/D — the nav changes are
authorization-dependent on whichever CR ultimately covers the underlying
feature each nav entry points to (Herbs Store entries → covered by CR-003
already; homepage-redesign-driven consolidation of *pre-existing* nav
items → needs the same new CR as Category A, since consolidating "About
Us / Herbs / Diseases Catalogue / Video" into a dropdown is a restructuring
of *existing*, non-Herbs, non-Mother-Tincture navigation that neither
CR-003 nor any other document authorizes).

---

## 5. M5 IMPACT

Re-confirmed, narrower and more precise than the prior reconciliation's
pass, using this session's direct file inspection:

| M5 Gate | File(s) shared with 2026-09-07 work | Status |
|---|---|---|
| **M5-Cart** | `src/components/layout/PublicHeader.tsx` | See §6 — **exact comparison performed this session.** Verdict: M5-Cart's own specific claims remain valid; see §6 for the full basis. No blanket invalidation. |
| **M5-C** | `src/components/layout/PublicHeader.tsx` (referenced only to confirm the commented-out search form remains inert) | **Still accurate** — the commented-out `#searchfrm` block (lines 80-96 of the current file) was re-read this session and remains an untouched JSX comment, unaffected by either the cart-badge change or the nav-consolidation change. |
| **M5-A, M5-B, and all 7 M5-E sub-slices** | None of their own Files Created/Modified tables include any file from §2.1 or §2.2 (confirmed by the prior reconciliation's exact-path grep, not re-run from scratch this session since no new evidence contradicts it) | **Unaffected.** |

No M5 gate requires reopening. **One gate (M5-Cart) requires the
"revalidation" question in Decision 2 (§8) to be formally closed** — not
because this session found a defect, but because a direct, owner-recorded
confirmation of §6's finding is the same evidentiary bar this project has
applied to every other authorization question since
`GATE-REPORT-STATE-RECONCILIATION.md`.

---

## 6. PUBLICHEADER.TSX — EXACT BEFORE/AFTER COMPARISON AGAINST M5-CART'S OWN EVIDENCE

`GATE-REPORT-M5-CART.md` §3 (Files Modified table) describes its
`PublicHeader.tsx` change in exactly these terms, quoted verbatim:

> "Cart badge (`<span class="count">`) now reads the real `TotalCartItem`
> (`getTotalCartItem(await getCartContent())`) instead of a hardcoded `0`.
> `StickyNavBody` became an async function as a result. Exact Blade
> whitespace preserved (`{{"0"}}` vs. the else-branch's trailing-space
> `{{...}} `, re-verified byte-for-byte against `inc/header.blade.php:119`
> before implementing)."

This session read the current file in full (311 lines) and checked every
element of that claim against the present code:

| M5-Cart's claim | Current file, verified this session | Match? |
|---|---|---|
| `StickyNavBody` is an async function | Line 57: `async function StickyNavBody() {` | ✅ unchanged |
| Reads `getTotalCartItem(await getCartContent())` (or equivalent) | Lines 58-59: `const cartContent = await getCartContent(); const totalCartItem = getTotalCartItem(cartContent);` | ✅ unchanged (functionally identical form) |
| `<span className="count">` renders the real total | Line 183: `<span className="count">{totalCartItem === 0 ? '0' : `${totalCartItem} `}</span>` | ✅ unchanged, present verbatim |
| Blade whitespace parity (`{{"0"}}` vs. trailing-space else-branch) | Same line 183 — the exact ternary form M5-Cart's report describes | ✅ unchanged |
| Import of `getCartContent, getTotalCartItem` from `@/lib/cart` | Line 47: `import { getCartContent, getTotalCartItem } from '@/lib/cart';` | ✅ unchanged |

**Every specific, textual claim `GATE-REPORT-M5-CART.md` makes about this
file is still true of the current file, verified this session by direct
line-level comparison, not assumed.**

**What changed instead:** the file's `<ul className=" navigation-box">`
block (lines 121-177) — a **structurally distinct region** of the same
component, rendering the top-level site navigation, not the cart badge.
This region:
- is inside the same `StickyNavBody` function as the cart badge, but
- does not read, call, or depend on any cart-related import, state, or
  logic, and
- the cart-badge markup (`<div className="right-side-box">`, lines
  180-185) is textually and structurally **after**, and independent of,
  the nav-consolidation block, confirmed by direct reading of the
  intervening `</div>` boundaries (line 178's `</div>` closes
  `.main-navigation`, which contains the nav; line 180's
  `<div className="right-side-box">` is a sibling, not a descendant).

**Verdict: M5-Cart's gate does NOT require reopening or invalidation.**
Its own specific, narrow claims about `PublicHeader.tsx` remain
byte-verifiably true today. What changed is a different, non-overlapping
region of the same file, by different (now-confirmed-intentional) work.
This is consistent with — not a violation of — the "extended additively,
never rewritten" discipline CR-003 itself commits to for this exact file:
the cart-badge region was not rewritten; a separate region was.

**One caveat, not a defect:** this session's comparison was based on
`GATE-REPORT-M5-CART.md`'s own **textual description** of its change
(there being no other artifact — no diff, no snapshot — attached to that
report), cross-checked against the current file's content. This is the
same evidentiary standard the M5-Cart report itself used to describe its
own work, so it is an apples-to-apples comparison, but it is not a
byte-for-byte diff against a preserved pre-2026-09-07 copy of the file
(none exists in this repository, which has no `.git` history). **Decision
2 in §8 asks the owner whether this level of confirmation is sufficient,
or whether a more exhaustive check (e.g., a fresh, targeted test
exercising the cart badge specifically) should also be run before treating
this as fully closed.**

---

## 7. SECURITY AUDIT — MOTHER TINCTURE DATABASE/UPLOAD LAYER (READ-ONLY)

Performed exactly as instructed: inspection only, no connection attempt,
no write, no guard modification.

### 7.1 — Connection configuration

`src/lib/motherTincture/db/config.ts`: reads `MONGODB_URI`,
`MONGODB_DB_NAME`, `MONGODB_ENV` — **the same three base environment
variables the legacy migration's own MongoDB configuration uses**
(confirmed by cross-reference; this module does not introduce a new,
separately-named connection string or a second cluster). It appends a
suffix (`_motherTincture`) to the base database name, producing a
separate **logical database on the same MongoDB server/cluster**, not a
separate cluster or separate credential set.

### 7.2 — Environment checks

`getMotherTinctureDbConfig()` returns `null` (not a thrown error) if any
of the three base env vars is unset — the same "degrade gracefully, don't
crash the public storefront" posture `docs/M5-POST-GATE-RECONCILIATION-2026-09-07.md`
already noted as a positive property. `isMotherTinctureDbConfigured()`
gives callers a way to check this without importing the MongoDB driver at
all.

### 7.3 — Production guards

`client.ts`'s `getMotherTinctureMongoClient()`:

```
if (config.env === 'production' && !config.allowProduction) {
  throw new MotherTintureProductionConnectionBlockedError();
}
```

This is **structurally identical** to the legacy migration's own
`assertNonProductionTarget()`/`ProductionConnectionBlockedError` guard in
`src/lib/mongodb/client.ts` (confirmed by direct comparison this session:
same two-variable check — `MONGODB_ENV === 'production'` AND
`MONGODB_ALLOW_PRODUCTION` not `'true'` — same fail-closed default, same
error-throwing behavior rather than a silent fallback). **This is a
genuine, independently-implemented equivalent of the established guard,
not a bypass or a weaker imitation.**

### 7.4 — Can production writes occur accidentally?

**No, by the same logic that protects the legacy migration's own database
access**, provided the deployment's actual `.env` values match what every
other part of this project already assumes (this reconciliation did not,
and was not asked to, inspect `.env`/`.env.local` values — only the code's
logic). Both the legacy client and the Mother Tincture client are
guarded by the identical env-var pair; whatever posture protects one
protects the other, since they read the same two variables. No hardcoded
production URI, credential, or override was found in any Mother Tincture
file.

### 7.5 — Upload/storage mechanism

`src/lib/motherTincture/uploads/storage.ts`/`config.ts`: writes to
`<UPLOAD_DIR>/products/` — **deliberately the SAME existing subdirectory**
the real, migration-governed product catalogue's images already live in
(the file's own header comment explains why: the existing
`HomeopathyProductCard` → `ProductImage`-equivalent component hardcodes
that path, so a new subdirectory would make admin-added images invisible
without also changing that component). Filenames use the
`<unixTimestamp>g<name>` convention, matching the real
`public/uploaded_files/products/*` naming already in use. Validation:
MIME-type allowlist (`jpeg`/`png`/`webp` only), 5MB size cap, filename
sanitized to lowercase-alphanumeric-hyphen before use — **this is
materially stricter than the ORIGINAL Laravel admin uploads' complete lack
of validation** (the gap this migration's own FIX-003/D-04 was created to
address for the *legacy* upload paths) and is at least as strict as
FIX-003's own extension whitelist.

### 7.6 — Are secrets hardcoded?

**No.** `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET`/`RAZORPAY_WEBHOOK_SECRET`
(Herbs Store payments, checked as part of this same read-only sweep since
it is the other new database/payment-adjacent surface found this session)
are read exclusively from `process.env`, confirmed by direct grep of
`src/lib/herbs/payments/razorpay.ts` and `config.ts` finding zero string
literals matching a key-shaped pattern. The config module explicitly
separates the public key ID (safe client-side) from the secret (server-only,
never exposed via `getRazorpayPublicKeyId()`). The Mother Tincture module
has no payment component at all — it is purely a catalog/admin-add feature,
no keys of any kind.

### 7.7 — Does it bypass established repository/database conventions?

**Partially, by design, and disclosed in its own comments — not a silent
bypass.** It does **not** use the project's shared `ValidatedRepository<T>`
base class (`src/lib/mongodb/repositories/base.ts`) or the shared
`COLLECTIONS` registry (`src/lib/mongodb/collections.ts`) that every
legacy-migration repository uses — it has its own, separate, structurally
parallel `client.ts`/`config.ts`/`schema.ts`/`motherTinctureProductRepository.ts`.
This mirrors the Herbs Store's own, earlier-established "parallel model"
pattern (both modules' headers say so explicitly) rather than inventing a
new convention. Whether "reuse the shared repository base class" should
have been the correct architectural choice instead of "build a parallel,
isolated one" is a legitimate design question, but it is not a safety
defect — the parallel module carries the same production-write guard, and
isolation from the legacy `ValidatedRepository`/`COLLECTIONS` machinery
means a bug in this new code cannot corrupt legacy migration data by
construction (different `Db` handle, different logical database).

### 7.8 — Overall security-audit conclusion

**No unsafe finding.** The Mother Tincture (and, incidentally, the Herbs
Store) database/upload layer independently reimplements the legacy
migration's own non-production guard correctly, uses only environment-variable-sourced
configuration with no hardcoded secrets, applies upload validation
stricter than the original Laravel application ever had, and achieves
isolation from legacy data by using a separate logical database rather
than by relying on discipline alone. This reconciliation finds nothing
here requiring a fix, a revert, or an owner safety decision — only the
governance question already addressed in §4.3 (does it need its own CR).

---

## 8. REQUIRED OWNER DECISIONS

Only decisions genuinely unresolved by this document's own findings are
listed. Each is presented with real options; none is pre-selected.

### DECISION 1 — Change Request structure for the newly-scoped work

Category A (homepage redesign) and Category B (new public sections) both
require a new Change Request, per §4.4/§4.5. Category D (Mother Tincture)
also requires a new Change Request, per §4.3. Category C (Herbs Store) is
already covered by CR-003 and needs no new CR (§4.2).

- **Option 1** — One combined new CR covering both the homepage redesign
  and the new public sections (Categories A + B), since they were built in
  the same session and share a "new public-facing surface" character.
- **Option 2** — Separate CRs per category (one for the homepage redesign,
  one for `/homeopathy` + `/nutrition`), since a homepage swap and two new
  informational sections are analytically distinct decisions with
  different risk profiles (a homepage swap affects 100% of visitors by
  definition; new sections at new URLs affect only visitors who navigate
  to them).
- **Option 3** — Fold Category D (Mother Tincture) into whichever CR
  covers Categories A/B, on the reasoning that all of it was built in one
  2026-09-07 session as one coherent effort.
- **Option 4** — Keep Category D as its own, separate CR, on the reasoning
  that it is architecturally and functionally distinct (admin-only,
  database-backed, no homepage/nav-visible surface of its own beyond the
  sidebar entry) from the public-facing homepage/section work.

This document does not choose between these; it only confirms that *some*
new CR(s) are required and specifies what each must cover, per §4.

### DECISION 2 — M5-Cart revalidation depth

§6 found that every specific claim `GATE-REPORT-M5-CART.md` makes about
`PublicHeader.tsx` remains true today, based on a textual-claim-to-current-file
comparison (no pre-2026-09-07 file snapshot exists to diff against,
since this repository has no git history).

- **Option 1** — Accept §6's comparison as sufficient; no further action
  needed, M5-Cart's gate stands as-is with this document as its
  supporting evidence.
- **Option 2** — Require an additional, fresh functional check (e.g., a
  new or re-run test specifically exercising the cart badge's rendered
  output against a session with a non-empty cart) before treating this as
  fully closed.

### DECISION 3 — Whether `/herbs` should currently be publicly indexable

Not a defect, not a safety issue — a product/positioning question this
document surfaced in §4.2 that CR-003's own text does not resolve. CR-003
§10.1 authorized early implementation "for a demonstration to a
non-technical stakeholder," which does not, on its own, state whether the
resulting `/herbs` routes should be crawlable/discoverable at this stage
versus kept `noindex` until a later, explicit go-live decision.

- **Option 1** — Leave as-is (this reconciliation did not check whether
  `/herbs` currently carries `noindex` metadata or not — flagged as an
  unverified sub-question, not answered here).
- **Option 2** — Explicitly confirm the current indexing posture is
  correct for this stage.
- **Option 3** — Direct a specific change to indexing posture (which would
  itself need to go through whichever CR governs Category C, i.e. CR-003,
  as a follow-up amendment, not be decided ad hoc).

### DECISION 4 — Should `RedesignedHome`/the homepage swap remain live at `/` and `/home` pending the new CR, or should it be held at `/redesign` only until the CR is formally recorded?

This is a sequencing question, not a reversal — the owner has already
confirmed the work is intentional and is not to be reverted. The question
is narrower: should the *live* homepage continue rendering the redesign
while its governing CR is being formally written and signed (a few hours
or days of gap), or would the owner prefer the swap itself be held at
`/redesign` (already fully built and available for review/demo there)
until the CR exists, purely as a matter of not having a production-facing
change run ahead of its own paperwork even briefly? **This document takes
no position and performs no action either way** — it is listed because
the owner's original task instruction was explicit that no file should be
altered without a decision, and swapping the homepage back is itself a
file alteration this document will not perform unprompted.

---

## 9. WHAT THIS DOCUMENT DOES NOT DO

Per explicit instruction: this document does not revert anything, does
not redesign anything, does not fix any legacy defect, does not start M6,
does not modify production, does not modify Atlas, does not change
migration behavior, and does not amend any historical gate report. The two
newly-discovered M5-E defects (`edit-product-category` duplicate-on-edit;
`product-subcategory-list` dead edit link) and M5-Cart's own missing
acceptance-addendum question, both raised in the prior post-gate
reconciliation, remain exactly as that document left them — this document
does not restate or re-decide them, since the owner's current instruction
scoped this session specifically to the 2026-09-07 work's governance
classification, not to those other open items.

---

## 10. CONCLUSION

**M6 remains STOPPED.** Not because the 2026-09-07 work is a problem — it
is now confirmed intentional, and this session's own read-only safety
audit (§7) found it well-built — but because the governance record this
project has consistently required for every other change (a located,
dated, owner-signed CR or gate report, not a code comment alone) does not
yet exist for Categories A, B, and D. Category C (Herbs Store) is already
properly authorized and requires no further action on that front. Once
Decision 1's chosen CR structure is drafted and signed, and Decisions 2–4
are answered, M5's gate record and this new work's governance record will
both be complete and mutually consistent, and M6 readiness can be
reassessed on that basis.

---

*End of Owner-Directed 2026-09-07 Change Reconciliation. No code, database,
or production system was modified in the production of this document. Per
instruction, this document stops here. M6 is not begun by this document.*

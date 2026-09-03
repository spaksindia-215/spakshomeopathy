# M4-PREP — Next.js Route Mapping (representative slice)

**Status:** DOCUMENTATION ONLY. No route, page, or API handler listed below
is built by this phase — every "Next.js target" cell describes a FUTURE
file, not one that exists yet. No MongoDB connection was made to produce
this document.
**Date:** 2026-08-20
**Builds on:** `docs/M3-APPLICATION-MAPPING.md` (the authoritative,
gate-reported, 172-row route catalog). This document does not duplicate
that catalog — it reuses its exact row numbering (`#1`, `#15`, `#55`,
`#58`, `#59`, `#65`, ...) as a join key and adds exactly one new piece of
information per row: a proposed Next.js target and the repository/service
that would back it.

## Why a new companion document, not an edit to M3-APPLICATION-MAPPING.md

`M3-APPLICATION-MAPPING.md` states its own scope boundary explicitly (§0):
it does not map routes to Next.js targets. It is also already a
gate-reported artifact (`docs/GATE-REPORT-M3.md`) covering all 172 routes,
including 17 cataloged Broken routes and their exact root causes — editing
it in place this phase would risk disturbing that fidelity-critical,
already-verified content for a narrower, unverified addition. This
document stays separate, cross-references by row number, and covers only
the small subset of routes touched by this phase's three slices plus the
already-M1-verified static pages, not all 172 rows.

## Representative rows

| M3 # | Route | Classification (per M3-APPLICATION-MAPPING.md) | Next.js target (PROPOSED, NOT BUILT) | Backing repository/service (this phase) |
|---|---|---|---|---|
| 1, 2 | `GET /`, `GET /home` | Public | future `src/app/page.tsx` | none yet — would need `ProductRepository`/`CategoryRepository`/a `homeopathyMaster` repository (not built this phase) |
| 3 | `GET /products` | Public | future `src/app/products/page.tsx` | existing `CategoryRepository.findByType('H', 1)` |
| 5 | `GET /diseases-list` | Public | future `src/app/diseases/page.tsx` | existing `CategoryRepository.findByType('N', 1)` |
| 9, 10 | `GET /category-poducts/{cat_slug}`, `GET /poducts-list/{cat_slug}` | Public (both confirmed 500 on non-matching slug — see M3 doc) | future `src/app/categories/[slug]/page.tsx` | existing `ProductCategoryRepository`, existing `ProductRepository.findByCategory` — **the missing null-guard defect must be preserved, not fixed, if/when this is built** |
| 40 | `GET /product-details/{slug}` | Public (no null guard on non-matching slug) | future `src/app/products/[slug]/page.tsx` | existing `ProductRepository.findBySlug` — **same preserve-the-crash caveat as above** |
| 15 | `POST /save-enquiry` | Public, POST-action, Email-related | future `src/app/api/enquiry/route.ts` | **new this phase:** `enquiryService.submitEnquiry` (`src/lib/services/enquiryService.ts`) + `EnquiryRepository`. Email dispatch (`Mail::send`) is a separate, undocumented-here dependency — see `docs/M4-PREPARATION.md` |
| 54 | `GET /consultancy` | Public | future `src/app/consultancy/page.tsx` | existing `CategoryRepository` (no new work needed) |
| 55 | `POST /save-appointment` | Public, POST-action | future `src/app/api/appointment/route.ts` | **new this phase:** `appointmentService.bookAppointment` (`src/lib/services/appointmentService.ts`) + `AppointmentRepository`. No validation exists in source; the future route handler must not add any either |
| 58 | `GET /manage-orders` | Buyer-authenticated | future `src/app/account/orders/page.tsx` | **new this phase (service only):** `orderService.getBuyerOrderGroupIds`, wrapping the existing `getOrderGroupIdsForBuyer`. **Scope gap, documented:** does not yet reproduce the real 3-table join/sort/pagination — see `orderService.ts`'s file header |
| 59 | `GET /view-order/{orderId}` | Buyer-authenticated, **Broken (B-12)** | future `src/app/account/orders/[groupId]/page.tsx` | **new this phase (service only):** `orderService.getBuyerOrderView`, wrapping the existing `getOrderByGroupId`. **Deliberately does not reproduce B-12's crash** — see `orderService.ts`'s file header for the reasoning |
| 65 | `POST /product-checkout` | Buyer-authenticated, POST-action — the actual live checkout despite its route name | **OUT OF SCOPE THIS PHASE.** No target proposed. Checkout/payment implementation is explicitly deferred — see `docs/M4-PREPARATION.md` | none |
| — | `/about`, `/contact`, `/details`, `/mother-tincture`, `/privacy-policy`, `/return-policy`, `/terms`, `/video`, `/videos` | Public, static | **DONE (M1)** — `src/app/{about,contact,details,mother-tincture,privacy-policy,return-policy,terms,video,videos}/` already exist and are M1-verified | n/a — **do not re-map, rebuild, or restyle these; this phase did not touch any file under `src/app/`, confirmed by directory-listing sweep** |

## Rows deliberately not included

Every route not listed above (155 of 172) is left for a later phase to map,
including: the remaining public content/discovery rows (`#4`, `#6-#8`,
`#11-#14`, `#16-#39`, `#41-#53`, `#56`), the remaining buyer-authenticated
rows (`#60-#64`, `#66-#69`), and all 102 admin routes (`#70-#171`).
Mapping the admin surface at this level of detail is explicitly deferred —
see `docs/M4-PREPARATION.md`'s "Deferred to a later phase" section for the
reasoning (102 routes is not a "small slice").

## What this document does not do

- Build any route, page, layout, or API handler.
- Resolve any of the 17 Broken routes cataloged in `M3-APPLICATION-MAPPING.md`.
- Decide session/auth strategy (DR-05, still pending) — every "Buyer-authenticated"
  row above has no proposed auth mechanism attached; that is a separate,
  larger decision out of scope here.
- Connect anything to MongoDB.

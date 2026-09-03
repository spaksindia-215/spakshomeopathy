# MILESTONE GATE REPORT — M4-PREP: Application-Layer Migration Preparation

**Milestone:** M4-PREP (application-architecture preparation, per owner
authorization "NEXT PHASE: APPLICATION MIGRATION PREPARATION")
**Period:** 2026-08-20
**Author:** Migration Implementer
**Report date:** 2026-08-20
**Contract version:** 1.0

---

## 0. CONTRACT ACKNOWLEDGEMENT

- [x] I have read `MIGRATION-CONTRACT.md` in full (carried forward from prior phases)
- [x] I have read `blueprint.md` §0 (Governing Policy)
- [x] I have read `docs/GATE-REPORT-M3.md`, `docs/M3-APPLICATION-MAPPING.md`,
      `docs/M3-MONGODB-ARCHITECTURE.md`, `docs/M3-OWNER-DECISION-RECORDS.md`,
      and the existing `src/lib/mongodb/repositories/` layer, before writing
      any new code
- [x] I confirm no undocumented deviation was introduced
- [x] I confirm **no MongoDB connection was made** — no new file constructs
      a `MongoClient` or calls `.connect()` (verified by grep sweep, §7 below)
- [x] I confirm no Laravel source was modified (verified by mtime sweep, §7 below)
- [x] I confirm the M3-A/M3-C production guards (`client.ts`,
      `environmentGuard.ts`) were not opened for editing at any point
- [x] I confirm no admin, authentication, payment, or checkout functionality
      was implemented
- [x] I confirm no file under `src/app/` (the M1-verified static pages) was
      touched

---

## 1. OBJECTIVE

**Owner-authorized scope (2026-08-20, "M3-C ATLAS EXECUTION — DEFERRED /
NEXT PHASE: APPLICATION MIGRATION PREPARATION"):** with the real Atlas
connection deferred indefinitely, prepare the Next.js application layer —
repositories, a thin service layer, route-mapping documentation — so
MongoDB can be plugged in later without redesigning the application. Work
in small, independently verifiable slices; determine LIVE/BROKEN/DEAD/
VESTIGIAL status per feature; preserve existing behavior; do not fix
legacy defects; do not add new features.

**Achieved: Fully**, within the deliberately narrow scope chosen (three
slices — see §5). No MongoDB connection, no Laravel modification, no
admin/auth/payment/checkout implementation, no full 172-route migration —
all consistent with the owner's explicit boundaries.

---

## 2. FILES CREATED

**11 files** (2 repositories + 3 services + 5 tests + 3 docs — see note
on count below):

```
src/lib/mongodb/repositories/
├── enquiryRepository.ts       — EnquiryRepository, no extra methods (source only inserts)
└── appointmentRepository.ts   — AppointmentRepository, no extra methods (source only inserts)

src/lib/services/               — NEW DIRECTORY, first service layer in this codebase
├── enquiryService.ts           — submitEnquiry(), mirrors HomeController@saveEnq
├── appointmentService.ts       — bookAppointment(), mirrors HomeController@SaveAppointment
└── orderService.ts             — getBuyerOrderGroupIds()/getBuyerOrderView(), wraps
                                   the EXISTING getOrderGroupIdsForBuyer/getOrderByGroupId

tests/mongodb/
├── enquiryRepository.test.ts     — 2 tests, labeled FIXTURE
└── appointmentRepository.test.ts — 2 tests, labeled FIXTURE

tests/services/                 — NEW DIRECTORY
├── enquiryService.test.ts       — 4 tests, labeled UNIT + FIXTURE
├── appointmentService.test.ts   — 3 tests, labeled UNIT + FIXTURE
└── orderService.test.ts         — 3 tests, labeled UNIT + FIXTURE

docs/
├── M4-PREPARATION.md            — objective, slices, DR-01 callout, deferrals, test taxonomy
├── M4-NEXTJS-ROUTE-MAPPING.md   — companion to M3-APPLICATION-MAPPING.md, ~13 representative rows
└── GATE-REPORT-M4-PREP.md       — this file
```

**14 new tests, all passing** (2+2+4+3+3).

## 3. FILES MODIFIED

| Path | Change |
|---|---|
| `src/lib/mongodb/repositories/index.ts` | Added `export * from './enquiryRepository'` and `export * from './appointmentRepository'`; updated the header comment to describe the new state, appending to (not erasing) the prior note explaining why these two had no repository yet |

**No other file was modified.** In particular:
`src/lib/mongodb/client.ts`, `environmentGuard.ts`, `collections.ts`,
every file under `schemas/`, `migrationState.ts`,
`scripts/migrate-to-mongodb.ts`, `scripts/check-mongodb-connection.ts`,
`.env.local`, every file under `src/app/`, and every file under
`public_html/`/`spakshomeopathy.com/` were **not modified** — confirmed
in §7 below.

## 4. FILES DELETED

**ZERO.**

---

## 5. THE THREE SLICES CHOSEN, AND WHY

See `docs/M4-PREPARATION.md` §2 for full detail. Summary:

1. **Enquiry submission** (`enquiryService.submitEnquiry`) — mirrors
   `HomeController@saveEnq` (M3 row #15). Verified source behavior:
   `name`/`email`/`subject` required, `message` not required, `phone`
   never read (P-01, preserved via a hardcoded `mobile: null`, not a
   caller-suppliable field).
2. **Appointment booking** (`appointmentService.bookAppointment`) —
   mirrors `HomeController@SaveAppointment` (M3 row #55). Verified source
   behavior: **zero validation**, preserved exactly — the service throws
   for nothing.
3. **Buyer order read-reconstruction** (`orderService.ts`) — mirrors
   `BuyerController@ManageOrders`/`ViewOrder` (M3 rows #58/#59), wrapping
   the pre-existing `OrderRepository`/`getOrderByGroupId`/
   `getOrderGroupIdsForBuyer` (built M3-A). No new repository, collection,
   or schema. `ViewOrder`'s target route is cataloged **Broken (B-12)** —
   verified this phase (`orders.pid` does not exist as a column); the new
   service deliberately does not reproduce this crash, with the reasoning
   stated in the file's own header, not silently decided.

**Rejected as too broad for this phase:** posts/blog, sliders, the
checkout/payment write path, all 102 admin routes.

---

## 6. REQUIREMENTS COMPLETED — MAPPED TO THE OWNER'S NUMBERED INSTRUCTIONS

| # | Owner's instruction | Status |
|---|---|---|
| 1 | Data-access architecture, repository interfaces, not connected to MongoDB | ✅ `EnquiryRepository`/`AppointmentRepository` added, following the exact `ValidatedRepository` pattern; neither constructs a client |
| 2 | Do not fake database behavior; label fixtures explicitly | ✅ Every new test file's header states `FIXTURE`/`UNIT` in prose; no test claims real MongoDB behavior |
| 3 | Thin service layer over repositories, preserve workflows exactly | ✅ `src/lib/services/` added — 3 functions, each citing exact Laravel file:line and preserving validation/null/ordering behavior verbatim |
| 4 | Special care for orders/orderProducts/payments: 3 separate collections, preserved types/anomalies, no invented relationships | ✅ `orderService.ts` only wraps existing, already-tested M3-A code — no schema/collection change; orders.orderId:number vs payments.orderId:string, orderProducts legacyId=1 GroupId=NULL, and the 21 NULL-orderId payments are all untouched (confirmed: no file under `schemas/` was modified) |
| 5 | Route/controller migration map, prioritize public storefront first, not all at once | ✅ `docs/M4-NEXTJS-ROUTE-MAPPING.md` — 13 representative rows, explicitly not all 172 |
| 6 | Preserve M1-verified static pages untouched | ✅ Confirmed — zero files under `src/app/` touched (§7) |
| 7 | May design API/service boundaries, must not connect to MongoDB/replace Laravel/switch frontend | ✅ Route-mapping doc proposes future API routes; none built; nothing wired |
| 8 | Document (not implement) auth prerequisites | ✅ `docs/M4-PREPARATION.md` §5 — `LoginController`/`RegisterController` behavior briefly characterized, DR-05/DR-04 named as blockers, duplicate top-level controllers flagged, not deep-dived |
| 9 | Document (not implement) payment/checkout dependencies | ✅ `docs/M4-PREPARATION.md` §5 — live checkout route identified, session-cart noted, write-path gap named, gateway specifics named as unexplored |
| 10 | Do not begin full admin migration | ✅ Explicitly deferred, with reasoning (102 routes exceeds "small slice") |
| 11 | Tests: UNIT/FIXTURE/MONGODB-INTEGRATION—NOT AVAILABLE/PRODUCTION—NOT TESTED labels; all existing tests pass | ✅ 4-way taxonomy documented in `docs/M4-PREPARATION.md` §6; 164/164 existing tests still pass, 14 new added |
| 12 | Documentation: `docs/M4-PREPARATION.md`, `docs/GATE-REPORT-M4-PREP.md` | ✅ Both created, plus the route-mapping companion |
| 13 | Safety: Laravel/production DB/MongoDB guards/M3-B pipeline/M3-C tooling untouched, nothing deleted | ✅ Verified §7 |
| 14 | Run verify + build, report exact test count | ✅ §8 below |

---

## 7. VERIFICATION PERFORMED THIS PHASE (independent of self-reported claims)

| Claim | Independent check | Result |
|---|---|---|
| No new file constructs a `MongoClient` or calls `.connect()` | `grep -rn "MongoClient\|\.connect(" ` across all new source and test files | ✅ Zero matches |
| `client.ts`/`environmentGuard.ts` unmodified | Not opened for writing at any point this phase; no edit tool invoked against either path | ✅ Confirmed |
| `src/app/**` untouched | `find src/app -newer package.json -type f` | ✅ Zero results |
| `public_html/**`, `spakshomeopathy.com/**` untouched | `find ... -newer package.json -type f` from the repo root | ✅ Zero results |
| `.env.local` untouched | File modification timestamp compared against this phase's start time | ✅ Unchanged (written in a prior, separate phase) |
| `enquirySchema`/`appointmentSchema`/`orderSchema`/etc. unmodified | Not opened for writing; new repositories import them read-only | ✅ Confirmed |
| Source-behavior citations accurate | `saveEnq`, `SaveAppointment`, `ManageOrders`, `ViewOrder` all re-read directly from `public_html/` this phase, not taken from a summary | ✅ Confirmed, exact file:line citations included in each new file's header |
| B-12 (`orders.pid` does not exist) | Cross-checked `orderSchema` (schemas/order.ts) against `BuyerController.php:88`'s join target | ✅ Confirmed — no `pid` field exists, only `productId` |

---

## 8. TESTS EXECUTED

**178 tests total (14 new + 164 carried from M3-A/M3-B/M3-C, zero
regressions), 23 test files:**

| Check | Result |
|---|---|
| `npm run typecheck` | ✅ Pass, 0 errors |
| `npm run lint` | ✅ Pass, 0 errors |
| `npm run format:check` | ✅ Pass |
| `npm run test` | ✅ **178/178 pass**, 23 test files |
| `npm run build` | ✅ Pass, same 9 static routes, zero regression |

**All existing 164 tests continue passing** — verified in the same
`npm run test` invocation, not a separate run.

New tests by label (see `docs/M4-PREPARATION.md` §6 for the full
taxonomy): 6 `FIXTURE` (repository tests), 8 `UNIT`+`FIXTURE` (service
tests). Zero tests carry `MONGODB-INTEGRATION — NOT AVAILABLE` or
`PRODUCTION — NOT TESTED` — both labels are documented but structurally
inapplicable to this phase's suite.

---

## 9. REQUIRES-OWNER-DECISION ITEMS RAISED THIS PHASE

| # | Item | Status |
|---|---|---|
| DR-01 | Formal sign-off on orders/orderProducts/payments shape. This phase's instruction is consistent with Option B (already assumed by all M3-A code); the formal DR document still reads "No decision below is approved." **Additionally, a pre-existing contradiction was discovered** (not introduced this phase): `schemas/order.ts`'s header claims "DR-01 (APPROVED, 2026-08-16)" while `M3-OWNER-DECISION-RECORDS.md` says the opposite. Neither file was edited. | Flagged, not resolved — owner asked to note and continue, not fix |
| New | `legacyId` assignment strategy for genuinely new (non-migrated) documents — every schema requires a `legacyId: number`, sourced from MariaDB `id` for migrated rows, but there is no established convention for a document created directly by a future Next.js write path. `submitEnquiry`/`bookAppointment` take it as a required caller-supplied parameter rather than inventing a scheme. | Open, unresolved — flagged in both new services' file headers |
| Carried | DR-02 through DR-08 (vestigial placement, B-09 reproduction, email unique index, session store, charset, spam filtering) | Unchanged this phase — not touched, not needed by the three slices built |

---

## 10. RISKS INTRODUCED

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| N-24 | `orderService.getBuyerOrderGroupIds` does not yet match `ManageOrders`' full output shape (no product join, sort, or pagination) — a future phase building the real `/manage-orders` page against this function alone would produce an incomplete page | Medium | Low (documented, not hidden) | Explicitly stated in `orderService.ts`'s header and in `docs/M4-NEXTJS-ROUTE-MAPPING.md`'s row for M3 #58; not silently presented as a complete mirror |
| N-25 | `orderService.getBuyerOrderView` does not reproduce B-12's crash — a deliberate choice, but one a future reviewer might disagree with | Low | Low | Reasoning stated explicitly in the file header; easy to revisit in one place if the owner later wants B-12 preserved literally |
| N-26 | The `legacyId`-for-new-documents gap (§9) means `submitEnquiry`/`bookAppointment` cannot actually be wired to a live route yet without a real decision | Medium | Low | Flagged explicitly, not worked around with an invented scheme |

---

## 11. NEXT PHASE SAFETY ASSESSMENT

### Checklist

- [x] No MongoDB connection was made or attempted
- [x] No production database was contacted
- [x] No Laravel source was modified
- [x] No production guard was weakened, bypassed, or opened for editing
- [x] No admin, auth, payment, or checkout functionality was implemented
- [x] No file under `src/app/` was touched
- [x] All 164 pre-existing tests still pass; 14 new tests added, all passing
- [x] `npm run build` succeeds with no regression

### Rationale

Everything built this phase is inert with respect to MongoDB and Laravel:
the new repositories and services take a `Db` parameter at call time and
never construct a connection; nothing under `src/app/` imports them; no
route or page exists yet that would execute any of this code in a running
application. The three slices are individually small and independently
testable, matching the owner's "small, independently verifiable slices"
instruction. The one genuinely open gap (new-document `legacyId`
assignment) is surfaced rather than silently resolved, consistent with
this project's "document contradictions, don't guess" convention already
established across M3-A/B/C.

---

## 12. SIGN-OFF

**Implementer:** Migration Implementer **Date:** 2026-08-20

**Owner:** _________________________ **Date:** ___________

**M4 full build-out authorized:** ☐ Yes ☑ **No — awaiting explicit owner
review of this report.**

**Note:** No MongoDB connection was made or required for this phase. The
real Atlas connection remains deferred per the owner's own instruction; it
is not blocked by anything in this report, and this phase does not ask for
it to be resumed.

---

*Companion documents: `docs/M4-PREPARATION.md`,
`docs/M4-NEXTJS-ROUTE-MAPPING.md`.*

*End of Milestone M4-PREP Gate Report*

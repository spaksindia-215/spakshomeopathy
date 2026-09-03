# MILESTONE GATE REPORT — M3 Phase 1: Database + Application Mapping

**Milestone:** M3, Phase 1 (analysis/architecture only — not implementation)
**Period:** 2026-08-16
**Author:** Migration Implementer
**Report date:** 2026-08-16
**Contract version:** 1.0

---

## 0. CONTRACT ACKNOWLEDGEMENT

- [x] I have read `MIGRATION-CONTRACT.md` in full
- [x] I have read `blueprint.md` §0 (Governing Policy) and §6 (Database)
- [x] Blueprint sections for this phase: §3 (routes), §6 (database), §22 M3
- [x] I confirm no undocumented deviation was introduced
- [x] I confirm no Laravel source, MariaDB data, or MongoDB was modified
- [x] I confirm this phase did not implement M3 — it produced the analysis and
      architecture the owner required **before** implementation may begin

---

## 1. OBJECTIVE

**Stated objective (owner instruction, this phase):** Produce a complete Laravel →
MongoDB → Next.js migration map — database mapping, proposed MongoDB architecture,
application (route) mapping, and data migration map — as analysis and architecture
only. Do not convert controllers. Do not build the application. Do not modify Laravel.
Do not migrate data. Do not create or connect to production MongoDB.

**Achieved:** ☑ Fully, for the four-document scope specified.

---

## 2. FILES CREATED

| Path | Purpose | Lines |
|---|---|---|
| `docs/M3-DATABASE-MAPPING.md` | Per-table (34 tables) purpose/columns/keys/relationships/usage/bucket/MongoDB-modeling analysis, full decision treatment for the 9 owner-flagged critical entities | ~520 |
| `docs/M3-MONGODB-ARCHITECTURE.md` | Proposed collections, document shapes, indexes, query-pattern mapping, transaction/concurrency analysis, validation approach | ~330 |
| `docs/M3-APPLICATION-MAPPING.md` | Complete route → middleware → controller → method → DB ops → view → external services → behavior mapping for all ~172 route registrations across `web.php`/`admin.php`/`api.php`, plus non-Laravel URLs | 600 |
| `docs/M3-DATA-MIGRATION-MAP.md` | Per-table transformation rules, expected record counts, parity checks, pre-migration verification checklist | ~280 |
| `docs/GATE-REPORT-M3.md` | This report | — |

Total created: **5** files. No `spakshomeopathy-next/src/` file was created or modified.

## 3. FILES MODIFIED

**ZERO** application, config, or source files. (Three earlier gate reports —
`GATE-REPORT-M0.md`, `GATE-REPORT-M2.md` — received append-only addenda in the prior
OI-6 closure step of this same session; no further modification to any file happened
during this M3 phase itself.)

## 4. FILES DELETED

**ZERO.**

---

## 5. HOW THIS PHASE WAS EXECUTED

Two documents (`M3-DATABASE-MAPPING.md`, `M3-MONGODB-ARCHITECTURE.md`) were written
directly by the implementer, because they carry the phase's actual non-trivial modeling
decisions (embed-vs-reference for orders/products/users) and needed one consistent
reasoning thread rather than parallel, potentially-conflicting judgment calls. One
document (`M3-APPLICATION-MAPPING.md`) was produced by a background analysis pass,
independently verified by the implementer before acceptance (§7 below) — the same
verify-before-trust discipline established for M2's asset-manifest agent. The data
migration map (`M3-DATA-MIGRATION-MAP.md`) was written directly by the implementer,
building on both.

**A background task failure occurred and is disclosed here rather than hidden.** The
application-mapping analysis was dispatched as a background agent; it hit a session
rate-limit and reported a "failed" status mid-report-back. On inspection, the agent had
in fact **already finished writing** `docs/M3-APPLICATION-MAPPING.md` in full (600
lines, proper closing section, all required sections present) before the rate-limit hit
— only its final summary message to the implementer was cut off, not the deliverable
itself. This was verified structurally (all 8 required sections present, clean end
marker) and substantively (three independent spot-checks of specific factual claims —
the header search-form 3-way disagreement finding, byte-for-byte against
`public_html/`, the stale backup, and the actual production capture — all confirmed
correct) before being accepted into this Gate Report's evidence base. The report is
treated as complete and trustworthy on that basis, not on the strength of the "failed"
status label alone.

---

## 6. SOURCE-OF-TRUTH CHANGE — CARRIED FROM OI-6 CLOSURE

Per `docs/OI-6-RESOLUTION.md` (closed earlier this session), `public_html/` (root level
only — three unrelated sibling projects alongside it remain out of scope and untouched)
is now the rank-4 Laravel source of truth, superseding `spakshomeopathy.com/`. **All
four M3 documents were built from `public_html/`**, not the stale backup, per the
owner's explicit instruction this phase.

`Database/db_newhomo.sql` is unchanged and remains the schema/data source of truth — no
new database dump was supplied; OI-6 closed an application-source gap, not a
database-schema gap (this distinction was stated explicitly in the OI-6 resolution and
is re-confirmed operative here).

---

## 7. VERIFICATION PERFORMED THIS PHASE (independent of the source documents' own
citations)

| Claim | Independent check | Result |
|---|---|---|
| `public_html/routes/web.php` has exactly one new route vs. the stale backup | `diff` re-run directly | ✅ Confirmed — only `all-diseases` |
| `public_html/routes/admin.php` is byte-identical to the stale backup | `diff -q` re-run directly | ✅ Confirmed — no output, identical |
| 7 Blade views differ between sources, 1 is entirely new | Full `md5sum` sweep of `resources/views/` re-run directly | ✅ Confirmed — `about`, `seller-register`, `index`, `video`, `mail`, `mails/order-confirm`, `inc/header` differ; `all-diseases.blade.php` is new |
| All admin Blade views are unchanged between sources | Full `md5sum` sweep of `resources/views/admin/` re-run directly | ✅ Confirmed — zero differences |
| `index.blade.php`'s disease-card count grew from 5 to 27 | `grep -c "fun-fact-one__single"` re-run on both sources | ✅ Confirmed |
| `products.p_bestimg` (not `p_image`) is the slot-1 image column, resolving the 75-vs-83-column question | Cross-checked against `product-detail.blade.php`/`products.blade.php` usage directly | ✅ Confirmed, consistent with the already-logged BCN-DB-01 |
| `GroupId = $GetGId->GroupId + 1`, zero transaction, re-confirmed against `public_html/` (not just the stale backup) | Read `public_html/app/Http/Controllers/HomeController.php:768` directly | ✅ Confirmed unchanged |
| The header search-form 3-way disagreement (`public_html/` vs. stale backup vs. actual production capture) | Independently re-read `public_html/resources/views/inc/header.blade.php:39-56`, the stale backup's equivalent, and `baseline/raw-html/home-root.guest.raw.html` directly | ✅ Confirmed exactly as the application-mapping document states — this is a genuine, correctly-escalated finding, not an agent hallucination |
| `seller_profile` (16 rows) vs. `banks` (17 rows) count mismatch | Re-checked against the already-computed row-count table from the OI-6-era analysis | ✅ Confirmed real, flagged in the migration map |
| `product_review` = 0 rows, `product_specification` = 3,098 rows (gap left open by the initial migration-map draft) | Re-ran the row-count extraction script directly against `Database/db_newhomo.sql` | ✅ Confirmed, filled the gap in `M3-DATA-MIGRATION-MAP.md` before finalizing |
| No file outside `docs/` was touched this phase | `find ... -newer` sweep across the whole project, excluding build/cache directories | ✅ Confirmed — only the 4 new `docs/M3-*.md` files (plus the two append-only addenda from the earlier, separate OI-6 closure step) |
| Toolchain unaffected | `npm run typecheck` re-run | ✅ Pass, 0 errors |

---

## 8. REQUIREMENTS COMPLETED — MAPPED TO THE OWNER'S 17-POINT + APPLICATION-MAPPING
INSTRUCTION

| # | Requirement | Status | Where |
|---|---|---|---|
| DB item 1 | Purpose | ✅ | `M3-DATABASE-MAPPING.md` §1/§2, all 34 tables |
| DB item 2 | Columns | ✅ (cited from `DATABASE-ANALYSIS-MARIADB-SOURCE.md` §1, not repeated) | Same |
| DB item 3 | Data types | ✅ (cited, anomalies re-flagged where relevant to modeling) | Same |
| DB item 4 | Primary key | ✅ (cited) | Same |
| DB item 5 | Existing indexes | ✅ (cited — exactly one non-PK index in the whole schema) | Same |
| DB item 6 | Relationships | ✅ full treatment for critical entities, summary for the rest | `M3-DATABASE-MAPPING.md` §1, §2 |
| DB item 7 | Which controllers use it | ✅ | `M3-APPLICATION-MAPPING.md` (route-level) + `DATABASE-ANALYSIS-MARIADB-SOURCE.md` §9 (table-level, cited) |
| DB item 8 | Which routes use it | ✅ | `M3-APPLICATION-MAPPING.md` §1–§3 |
| DB item 9 | Which Blade views depend on it | ✅ | `M3-APPLICATION-MAPPING.md` (per-route), cross-referenced to `asset-manifest.md` |
| DB item 10 | LIVE/BROKEN/DEAD/VESTIGIAL | ✅ | `M3-DATABASE-MAPPING.md` (per table) + `M3-APPLICATION-MAPPING.md` §5 (per route) |
| DB item 11 | Preserve data? | ✅ — yes, for every table with any data, per NN-10, explicitly stated even for VESTIGIAL tables | `M3-DATABASE-MAPPING.md` throughout |
| DB item 12 | Become a MongoDB collection? | ✅ | `M3-MONGODB-ARCHITECTURE.md` §2 |
| DB item 13 | Embedded? | ✅ where decided; flagged REQUIRES OWNER DECISION where not (orders group, vestigial-table placement) | `M3-DATABASE-MAPPING.md` §1 |
| DB item 14 | Referenced by ID? | ✅ | Same |
| DB item 15 | Multiple collections needed? | ✅ (e.g. `sellerProfiles` combining two tables; the orders group's still-open 1-vs-3-collection question) | Same |
| App mapping | Route → middleware → controller → method → DB ops → view → assets → external services → output/behavior | ✅ | `M3-APPLICATION-MAPPING.md`, all ~172 route registrations |
| App mapping | Public / buyer / admin / POST / AJAX / payment / upload / email / broken / dead / vestigial classification | ✅ | `M3-APPLICATION-MAPPING.md` §5 |
| MongoDB architecture | Proposed collections, shapes, indexes, references, embedded docs, unique constraints, query patterns, transactions, concurrency, migration concerns | ✅ | `M3-MONGODB-ARCHITECTURE.md` |
| Data migration | Table → collection, transformation, relationship transformation, validation, expected counts, parity checks | ✅ | `M3-DATA-MIGRATION-MAP.md` |
| Production parity | Follow verified production source; record discrepancies; raise BCNs; don't silently repair | ✅ | See §9, §10 below |

**Completed: all requested items addressed** — either with a concrete answer, or (where
a concrete answer would require guessing) explicitly flagged REQUIRES OWNER DECISION,
consistent with the owner's own instruction not to make embedding/reference decisions
silently.

---

## 9. BLUEPRINT CORRECTION NOTICES AND PRODUCTION-PARITY FINDINGS THIS PHASE

| # | Finding | Resolution |
|---|---|---|
| (carried, re-confirmed) BCN-DB-01 | `products` has 75 columns, not blueprint's stated 83 | Unchanged from the earlier M2/OI-6-era finding; re-confirmed against `public_html/` this phase, not just the stale backup |
| **New this phase** | Real content drift across 7 Blade views + 1 new route + 1 new view, `public_html/` vs. stale backup — see `M3-APPLICATION-MAPPING.md` §6.1/§6.2 for the full catalogue | All ported from `public_html/` going forward per OI-6; no blueprint text needed correction (blueprint didn't specify this exact drift — it's a source-vs-source finding, not a blueprint-vs-source one) |
| **New this phase, most significant** | `inc/header.blade.php`'s search form: `public_html/` (commented out) disagrees with **both** the stale backup **and** actual live production (both show it live/uncommented) — a genuine 3-way conflict where the newly-designated "authoritative" source is the outlier against independently-observed production | **Escalated, not resolved** (`M3-APPLICATION-MAPPING.md` §6.3). Per contract §12.3, production (rank 6) should govern over `public_html/` (rank 4) on this specific narrow point — but this document does not silently apply that resolution; it is flagged for owner/architect triage, including whether it retroactively affects M1's already-built header |
| New this phase | 6 admin "Add" form handlers (`SavePost`, `SaveProductImage`, `Savecategory`, `SaveBlog`, `SaveSlider`) lack the `hasFile()`/`empty()` guard their "Update" counterparts uniformly have — a genuine, consistent, previously-uncatalogued-by-name pattern | Documented, **not fixed** (`M3-APPLICATION-MAPPING.md` §6.2 Finding 6). Consistent in spirit with D-04's already-flagged "no upload validation" theme; not independently added to the BROKEN register without owner sign-off |
| New this phase | `AdminController::ManagePayments()` (plural) — dead, unrouted, exists alongside the routed `ManagePayment()` (singular) | Documented, no action (`M3-APPLICATION-MAPPING.md` §6.2 Finding 4) |
| New this phase | `AdminController::ProductCategoryList` has unreachable dead code after its `return` | Documented, no action — provably inert (Finding 5) |
| New this phase | `seller_profile` (16 rows) / `banks` (17 rows) — a 1-row count mismatch on two tables that should pair 1:1 by `uid` | Flagged in `M3-DATA-MIGRATION-MAP.md`, not investigated further this phase (would require reading actual row data to identify which `uid` is unpaired — out of scope for a mapping document) |

**No BROKEN item was fixed. No feature was added. No validation was added or removed.**
All findings above are documentation, per contract NN-4/IR-9/§12.5.

---

## 10. REQUIRES-OWNER-DECISION ITEMS RAISED THIS PHASE — CONSOLIDATED

| # | Decision | Where raised | Blocks |
|---|---|---|---|
| 1 | Orders/orderproducts/payments MongoDB shape (Option A: one embedded doc per GroupId / B: three separate collections / C: hybrid) | `M3-DATABASE-MAPPING.md` §1.4, `M3-MONGODB-ARCHITECTURE.md` §3.2 | Any implementation of order placement, checkout, or the buyer/admin order views |
| 2 | Placement of vestigial-but-populated tables (`product_features`/`product_variations`/`product_pkg`) — ordinary unused collection vs. archival/export | `M3-DATABASE-MAPPING.md` §1.2, §2 | Finalizing the full collection list |
| 3 | How to reproduce B-09's (`pin_codes`) column-mismatch failure in a schemaless target, or whether to finally fix it now that the SQL-column concept that caused it no longer applies | `M3-DATABASE-MAPPING.md` §1.9 | Any implementation of pincode admin CRUD |
| 4 | Whether a `users.email` unique index is acceptable to add (purely additive, but touches the same "no unique indexes" language contract §5.3 used for the MariaDB case) | `M3-MONGODB-ARCHITECTURE.md` §4 | Any implementation of registration/login |
| 5 | Session-store mechanism (MongoDB collection vs. Redis vs. other) — contract §5.1 permits either | `M3-MONGODB-ARCHITECTURE.md` §1 | Any implementation of authentication |
| 6 | Charset-conversion procedure detail for `latin1` tables — spot-check first vs. uniform conversion | `M3-DATA-MIGRATION-MAP.md` §2.2 | Writing the actual migration script |
| 7 | Whether to filter `enquiries`' spam content during migration (default: no, per NN-8/NN-10) | `M3-DATA-MIGRATION-MAP.md` §5 | Writing the actual migration script |
| 8 | **The header search-form 3-way discrepancy (§9 above)** — which source governs, and whether M1's already-built header needs re-triage | `M3-APPLICATION-MAPPING.md` §6.3 | Potentially retroactive to M1; blocks confident re-porting of `inc/header.blade.php` in any later milestone |

**None of these block the analysis phase itself** — all are surfaced as findings this
phase produced, per contract §10.1 Step 6 ("raise a Change Request / decision gap. Do
not guess."). They **do** block specific pieces of future implementation work, as noted
per row.

---

## 11. TESTS EXECUTED

| Cat | Category | Status | Notes |
|---|---|---|---|
| V-01 through V-14 | All fourteen verification categories | **N/A** | This phase produced no rendered page, no route, no database write, no code of any kind — there is nothing for any of the fourteen categories to verify against. Consistent with the applicability matrix's own logic (contract §17) for a pure-documentation milestone, extended here since M3-analysis-phase isn't itself a row in that table (the table assumes M3 means the full content/catalog milestone; this phase is explicitly narrower, "Phase 1" only, per the owner's own framing) |

**Regression (all prior milestones still pass):** ☑ Yes — `npm run typecheck` re-run
clean; no file under `src/` was touched; M0/M1/M2's own deliverables are unaffected
(the two append-only addenda to `GATE-REPORT-M0.md`/`GATE-REPORT-M2.md` happened in the
prior, separate OI-6-closure step of this session, not during this M3 phase, and did
not alter any existing content).

---

## 12. RISKS INTRODUCED

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| N-12 | The header search-form 3-way discrepancy (§9) may mean M1's already-built `PublicHeader.tsx` is wrong on this one point, if `public_html/`'s commented-out state (which M1 never saw, since M1 predates OI-6's closure) doesn't match current live reality | Medium | Medium (one component, one narrow markup difference, not a structural defect) | Explicitly flagged for owner/architect triage in `M3-APPLICATION-MAPPING.md` §6.3 and restated here; not silently left for a future session to rediscover |
| N-13 | Four large documents (~1,700 lines combined) were produced in one phase; a future engineer skimming rather than reading in full could miss one of the 8 REQUIRES-OWNER-DECISION items in §10 | Low | Medium | §10 above consolidates all 8 into one table specifically to reduce this risk |
| N-14 | One background-agent task reported "failed" despite having completed its deliverable — a future session's tooling could reasonably treat a "failed" status as "discard this output," losing real, verified work | Low (documented explicitly, this report) | Low (already caught and verified this session) | §5 above documents exactly what happened and why the output was trusted anyway, so this isn't silently repeated or silently distrusted in a future session without re-checking |

---

## 13. OWNER DECISIONS

| ID | Status |
|---|---|
| See §10 above — 8 items raised, none resolved, none blocking this phase's own completion |

**No BLOCKING decision was required to complete this phase.** The 8 items in §10 block
specific *future* implementation work, not this analysis phase's own deliverable.

---

## 14. NEXT PHASE SAFETY ASSESSMENT

**Safe to begin M3 implementation (controller conversion, page building):** ☑ **NOT YET
— awaiting explicit owner authorization, independent of this report's own completeness**

### Checklist

- [x] All four required documents produced, cross-referenced, internally consistent
- [x] Toolchain verified: typecheck clean, no regression
- [x] No undocumented deviation (every finding traces to a file:line citation)
- [x] Laravel source (`public_html/`, `spakshomeopathy.com/`) untouched
- [x] No MongoDB collection created, no connection attempted
- [x] No data migrated
- [x] No Next.js application code written
- [ ] **8 REQUIRES-OWNER-DECISION items remain open** (§10) — several block specific
      pieces of implementation (orders shape blocks checkout/order-view work entirely;
      the header 3-way discrepancy blocks confident re-verification of the already-built
      header)

### Rationale

This phase's own scope — analysis and architecture only — is **complete**. It is not,
however, a green light for unrestricted M3 implementation: several of the
REQUIRES-OWNER-DECISION items in §10 are direct prerequisites for specific pieces of
work (most notably, no order-placement, checkout, or order-viewing code can be
responsibly written until item 1's shape decision is made — writing it against an
undecided shape would mean rewriting it, or worse, silently picking a shape without
approval). Other implementation work (e.g., simple standalone-table pages like
appointments or the disease/category browsing pages) has no open blocker in this
report and could proceed once the owner authorizes M3 implementation generally — but
per the owner's own standing instruction, **this report does not authorize that
either.** That authorization is the owner's to give, separately, explicitly, and has
not been given as of this report.

---

## 15. SIGN-OFF

**Implementer:** Migration Implementer **Date:** 2026-08-16

**Owner:** _________________________ **Date:** ___________

**M3 implementation authorized:** ☐ Yes ☑ **No — awaiting explicit owner authorization**

**Note:** This report closes M3 Phase 1 (analysis/architecture) as complete. It
explicitly does **not** authorize M3 Phase 2 (implementation). Per the owner's own
instruction: *"I will review the M3 architecture and explicitly authorize the next
implementation stage."* Nothing in this report should be read as that authorization.

---

*End of Milestone 3 Phase 1 Gate Report*

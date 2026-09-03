# OWNER DECISION D-11 — Target Database Architecture: MongoDB Atlas

**Raised by:** Migration Implementer (on owner instruction)
**Date:** 2026-08-16
**Decided by:** Owner (homeopathy38@gmail.com), 2026-08-16
**Contract version:** 1.0
**Status:** ✅ **APPROVED — supersedes specific contract clauses below, effective immediately**

> **This is a formal amendment to `MIGRATION-CONTRACT.md`, recorded here rather
> than by editing the contract file itself** — the contract is the project's
> signed constitution (see its own Preamble: "Where it conflicts with
> instinct, preference, or best practice, this contract wins") and is treated
> as append-only; amendments are layered on top via dated Owner Decision
> records, the same pattern already established by `CR-001-ADMIN-SETTINGS.md`.
> Per Part 3 (§11), an **Approved Owner Decision is precedence rank 1** — the
> only source authorized to override the contract itself. This document is
> that override, scoped precisely to what it changes and nothing else.

---

## 0. THE DECISION

**Target production database for the Next.js application: MongoDB Atlas.**
Not MariaDB/MySQL. This is a **permanent architectural decision for the full
migration**, not a scoped exception for new/CR-001-style features only
(the owner was offered that narrower alternative and explicitly chose the
broader one — see conversation record, 2026-08-16).

```
Target:      Next.js  +  MongoDB Atlas
Not target:  Next.js  +  MariaDB
```

---

## 1. WHAT THIS SUPERSEDES — NAMED PRECISELY

Per contract §19 ("No silent improvements are permitted... every deviation...
requires written approval before implementation") and §20 Step 1 ("Document
the deviation precisely"), each affected clause is named explicitly so no
future session mistakes this for an oversight:

| Clause | Original text | Status under D-11 |
|---|---|---|
| **§5.1** (Allowed Changes — Technology substitution) | `DB::table()` query builder → **Kysely (or approved equivalent)** — "same joins, filters, ordering, grouping, limits" | **Superseded.** The replacement query layer targets MongoDB, not a SQL-equivalent. Joins/groupBy/ordering/limits must still produce **behaviorally identical result sets** (that requirement is NOT waived — see §3 below), but the mechanism is no longer SQL-shaped. |
| **§1.1** (Primary objective, dimension D6/D4/D5 measurement) | Fidelity measured partly as observed by "the MySQL database receiving writes" | **Superseded** in its literal database-engine sense. Re-stated: fidelity is now measured by **MongoDB receiving writes that are row/document-equivalent to what the Laravel app would have written to MariaDB** for the same input — same logical values, types, and nulls (contract NN-6's *intent* survives; its *mechanism* changes). |
| **D-10** (Cutover strategy — Owner Decision Table) | "both applications pointed at the **same** MySQL database throughout" the 30-day rollback window | **Superseded, and now an open problem.** A shared-database rollback is architecturally impossible between MariaDB (PHP) and MongoDB (Next.js) — they are not the same engine and cannot be "the same database." **D-10's rollback mechanism must be redesigned** (e.g. dual-write, one-way sync, or a cutover-with-no-warm-rollback strategy). **Not decided here.** Flagged as a new, separate decision gap — see §6. |
| §7.1 D4/D5 (Data-write/Data-read dimensions) | "Identical rows in identical tables," "identical result sets... same pagination boundaries" | **Reworded in effect, not in intent.** "Rows"/"tables" become "documents"/"collections." The *fidelity standard itself* (same logical data, same ordering, same pagination boundaries) is **not relaxed** — see §3. |
| F-20 (Forbidden — normalizing the 83/75-column `products` table) | Forbids normalizing the wide `products` table into a relational-style variants table | **Not superseded — reaffirmed, and extended.** The prohibition against normalizing/denormalizing for "best practice" reasons applies with equal force to the MongoDB design (see §4 and §5 below: this decision explicitly forbids collection design driven by anything other than documented behavioral necessity). |

**Everything else in the contract — NN-1 through NN-11, IR-1 through IR-10,
the BROKEN register, the Preserved Defect register, F-1 through F-30 except
where named above, all fourteen verification categories' *intent* — remains
fully in force.** This decision changes the storage engine. It does not
relax the 1:1 fidelity mandate.

---

## 2. JUSTIFICATION ON RECORD

Per contract §20 Step 2, the standing rule is that "cleaner/faster/modern/
best practice" are **not** valid justifications for a deviation. This
decision is recorded as an **Owner-requested change** — the third of the
three valid justification categories the contract itself names (§20 Step 2:
"Technical impossibility... Security/legal/data-integrity risk... **OR
Owner-requested change**"). No technical-necessity claim is made or needed;
the owner has directed this as a business/technical-platform decision. That
is sufficient standing under the contract's own rules — it does not require
the implementer to construct a justification the owner didn't give.

---

## 3. WHAT DOES **NOT** CHANGE — THE FIDELITY MANDATE SURVIVES THE ENGINE SWAP

This is the load-bearing clarification. A database engine change is not a
license to also change *behavior*. Restated for the MongoDB target,
explicitly:

- **NN-1** (Laravel app is the specification) — unchanged. The Laravel
  application's observable behavior is still the reference implementation,
  regardless of what stores the data.
- **NN-6** (writes must match row-for-row) — reinterpreted as
  *document-for-document*: same logical fields, same values, same types,
  same nulls, for the same input, expressed as MongoDB documents instead of
  SQL rows.
- **NN-7** (validation copied exactly) — unchanged; unaffected by storage
  engine.
- **P-16/P-17** (GroupId format, `'1200'+$id` numeric addition, 5% fee
  arithmetic) — unchanged; these are business-logic/arithmetic behaviors,
  independent of storage engine, and remain frozen exactly as before.
- **F-20** (no normalizing the wide `products` schema) — unchanged in
  spirit: the 75-column-wide product record (see §5.2 of the companion
  analysis document) must not be redesigned into a "cleaner" document shape
  (e.g. an array of 10 variant sub-documents) **unless and until** that
  redesign is separately proposed, justified by documented behavioral
  necessity (not aesthetics), and approved — exactly the same discipline
  contract §5.2/§10.2 already requires for any schema-shape decision.
- **The BROKEN register (§9.2)** and **Preserved Defect register (§9.4)** —
  unchanged. A MongoDB implementation must reproduce B-01 through B-17 and
  P-01 through P-18 exactly as faithfully as a MariaDB one would have.

**In short: change the engine, not the behavior.** Every fourteen
verification categories in Part 5 still apply; V-05/V-06 (DB writes/reads)
are reinterpreted for a document store but not weakened.

---

## 4. SCOPE OF WORK AUTHORIZED BY THIS DECISION — READ CAREFULLY

Per the owner's explicit instruction accompanying this decision:

**Authorized now:**
- Documentation of the existing Laravel/MariaDB schema, relationships, keys,
  indexes, constraints, data types, record counts, live-vs-vestigial table
  usage, and relational-dependent query patterns (joins, `groupBy`,
  transactions) — as a **precondition** for eventual MongoDB schema design,
  not the design itself.

**NOT authorized, explicitly, until separately instructed:**
- Designing the MongoDB collection schema
- Creating MongoDB collections
- Migrating any data
- Changing any Next.js application code
- Any M3 implementation (pages, API routes, database models, authentication,
  business logic)

This decision **authorizes the analysis phase only.** It is not itself an
authorization to begin M3 or to begin MongoDB implementation work.

---

## 5. GOVERNING PRINCIPLE FOR THE EVENTUAL SCHEMA DESIGN (recorded now, applied later)

Per the owner's explicit instruction, recorded here so it is not lost before
the design phase begins:

> "The eventual MongoDB design must preserve application behavior, not
> blindly convert every SQL table into a MongoDB collection. Do not
> denormalize or redesign data merely for 'best practices' without
> documenting the behavioral reason."

This is functionally **contract §5.2 and §10.2, applied to a new medium**:
mechanical translation is fine (a table can become a collection 1:1 as a
default starting position), but any *shape change* — embedding, denormalizing,
splitting, merging — requires the same evidentiary discipline the contract
already demands of every other implementation decision: a documented
behavioral reason, not a stylistic preference. "MongoDB doesn't like joins"
is not, by itself, a behavioral reason — it is exactly the kind of "the
modern/idiomatic way is X" reasoning contract §10.2 already prohibits.  Where
a query's relational behavior (a join, a `groupBy`, a multi-table
transaction) cannot be mechanically translated, the *output* must still
match, per the same principle contract §10.4 already establishes for other
irreproducible constructs (there translated for `split("/")[5]`,
`ONLY_FULL_GROUP_BY`, and Laravel `encrypt`/`decrypt` — the same "preserve
the result, not the technique" logic applies here to relational query
results).

---

## 6. NEW OPEN ITEM — D-10's ROLLBACK MECHANISM (flagged, not resolved)

D-10 (cutover strategy) is now a decision gap in its own right, not merely a
superseded clause. Its "same database, both apps, 30-day warm rollback" design assumed both applications could share one data store. That assumption
is now false. **This is flagged per contract §12.5 (unresolvable conflict →
raise, don't guess) and left for a future, separate Owner Decision** (a
candidate D-12, not created here) once the migration is far enough along
for cutover planning to be concrete. Not a blocker for the current
documentation-only work.

---

## 7. RECORD OF INSTRUCTION COMPLIANCE

Per the owner's message accompanying this decision:

| Instruction | Compliance |
|---|---|
| Do NOT obtain production `sql_mode` credentials | ✅ Not requested, not obtained |
| Do NOT connect the Next.js application to production MariaDB | ✅ No connection code exists or was written |
| Do NOT implement a MariaDB compatibility layer | ✅ Not built |
| Mark OI-2 as DEFERRED/NOT APPLICABLE to target architecture | ✅ Done — see `GATE-REPORT-M0.md` cross-reference note and the companion analysis document |
| Preserve existing MariaDB findings as historical/reference | ✅ All prior M0/M1/M2 MariaDB-derived findings remain in place, untouched, unmarked-for-deletion |
| Do NOT discard the MariaDB schema from migration analysis | ✅ It remains the primary source for the companion database-analysis document (§8 below) |
| OI-6 remains OPEN | ✅ Unchanged — see `docs/GATE-REPORT-M0.md`/`GATE-REPORT-M2.md`; no fresh production export obtained this session |
| Do NOT begin M3 implementation | ✅ No page, API route, model, or business logic created |
| Do NOT create MongoDB schema/collections/migrate data | ✅ None of the three attempted |
| Do NOT change the Next.js application | ✅ Confirmed via file-modification check, §9 below |

---

## 8. COMPANION DOCUMENT

The read-only Laravel/MariaDB database analysis this decision authorizes is
`docs/DATABASE-ANALYSIS-MARIADB-SOURCE.md` — the twelve-point catalogue the
owner requested (tables, relationships, keys, indexes, constraints, types,
record counts, live/vestigial classification, relational-dependent query
inventory, MongoDB-specific-implementation flags).

---

## 9. FILE-CHANGE ACCOUNTING FOR THIS SESSION

- Created: this file, `docs/DATABASE-ANALYSIS-MARIADB-SOURCE.md`
- Modified: `docs/GATE-REPORT-M0.md`, `docs/GATE-REPORT-M1.md`,
  `docs/GATE-REPORT-M2.md` — each received a short cross-reference addendum
  pointing to this decision, **no existing content in those files was
  altered or deleted** (append-only)
- Modified: none of `src/`, `package.json`, any config file
- Modified: zero Laravel source files (`spakshomeopathy.com/**`)
- Modified: zero database — no MariaDB write, no MongoDB collection created
- Deleted: zero files

---

*This decision is binding at precedence rank 1 (contract §11) from
2026-08-16 forward, scoped exactly as written above.*

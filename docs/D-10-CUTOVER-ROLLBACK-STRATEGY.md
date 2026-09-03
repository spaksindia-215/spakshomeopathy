# OWNER DECISION D-10 (UPDATED) — Cutover, Migration, and Rollback Strategy

**Raised by:** Migration Implementer (on owner instruction)
**Date:** 2026-08-16
**Supersedes:** the original D-10 row in `MIGRATION-CONTRACT.md` §14 ("DNS/proxy switch...
both applications pointed at the same MySQL database throughout")
**Trigger:** Owner Decision D-11 (`docs/D-11-DATABASE-ARCHITECTURE.md`) — MongoDB Atlas is
now the Next.js production target, invalidating D-10's original shared-database assumption
**Contract version:** 1.0
**Status:** ⛔ **ANALYSIS ONLY — NO STRATEGY SELECTED. AWAITING OWNER DECISION.**

> **Nothing in this document is implemented. No collection was created, no data was
> migrated, no synchronization mechanism was built, and no Laravel or Next.js file was
> modified.** This is Step 1–3 of the contract's own Change Request process (§20:
> Identify, Justify, Estimate Impact) applied to a decision gap, per contract §12.5 and
> §10.1 Step 6 — raised for owner decision, not resolved unilaterally. Options are laid
> out below with their honest trade-offs; **none is recommended as a default**, because,
> as required below, no option achieves genuine zero-data-loss safety and picking one
> without the owner's explicit risk tolerance would be exactly the kind of silent
> judgment call contract §10.2 forbids ("the blueprint doesn't mention it, so I decided"
> — here, "the owner didn't pick yet, so I picked" is the same violation).

---

## 0. WHY THE ORIGINAL D-10 IS INVALID

The original D-10 (`MIGRATION-CONTRACT.md` §14) rested on one assumption: **"both
applications pointed at the same MySQL database throughout"** the rollback window. That
sentence is the entire safety mechanism — if both apps read and write the identical
database, rollback is trivial (stop routing traffic to the new app; the old app already
has every row, because it never stopped seeing them).

**That assumption is now false.** Per D-11, Laravel keeps writing to MariaDB; Next.js
writes to MongoDB Atlas — two different engines, two different data stores, no built-in
mechanism by which a write to one is automatically visible to the other. There is no
"the same database" anymore. Every consequence in this document follows from that one
fact.

---

## 1. LARAVEL/MARIADB → NEXT.JS/MONGODB DATA MIGRATION — WHAT IT ACTUALLY REQUIRES

At minimum, three logically distinct data-movement problems, each with different
timing and risk characteristics:

| Problem | What it is | When it happens |
|---|---|---|
| **Bulk migration** | Copying the existing ~34 tables' worth of historical rows (§8 of `docs/DATABASE-ANALYSIS-MARIADB-SOURCE.md` — e.g. 819 users, 397 products, 16,386 enquiries, 20 orders/22 order-lines/21 payments as of the 2026-01-05 dump) into MongoDB collections, once, before cutover | Pre-cutover, can be done incrementally/repeatedly against a read-only or lightly-written source |
| **Delta capture** | Whatever changed in MariaDB *after* the bulk migration snapshot was taken but *before* cutover completes — new orders, new enquiries, edited products, new user registrations, all continuing to arrive at the live PHP site while migration work happens | The entire window between "bulk snapshot taken" and "cutover complete" |
| **Post-cutover consistency** | What happens to data created in MongoDB *after* traffic moves to Next.js, if Laravel ever needs to see it again (rollback) or if reporting/analytics still expects one source of truth | The entire rollback window, however long it is |

**This document does not yet know how long the "delta capture" and "post-cutover
consistency" windows need to be** — that depends on decisions the owner has not made
yet (dual-write feasibility, §5–6; rollback window length, §10). Sized correctly, once
those are decided.

---

## 2. INITIAL DATA MIGRATION STRATEGY — OPTIONS, NOT A CHOICE

Three shapes exist for the one-time bulk copy. Presented as options because which one
is appropriate depends on decisions not yet made (particularly §5/§6/§10 below), and
because contract §10.1 Step 6 requires raising rather than picking:

| # | Approach | Mechanism | Trade-off |
|---|---|---|---|
| **A** | **Single full extract-transform-load (ETL) pass** | Export all 34 tables once, transform to the (not-yet-designed, per D-11 §4) MongoDB document shapes, bulk-insert | Simplest to reason about; but the site is live and continues accepting orders/enquiries/registrations during the transform-and-load window, so this pass is stale the moment it finishes unless paired with a delta mechanism (§3) |
| **B** | **Snapshot + replay** | Take one consistent snapshot (e.g. `mysqldump` at a fixed instant, matching how `Database/db_newhomo.sql` itself was produced), load it into MongoDB, then replay every MariaDB write that happened after the snapshot instant, in order | Requires either MariaDB binlog access (to reconstruct the replay stream) or an application-level change-log the current Laravel app does not have (see §6 — this is exactly where dual-write's infeasibility bites) |
| **C** | **Incremental/repeated sync until cutover** | Run approach A repeatedly (e.g. nightly) in the run-up to cutover, each pass narrowing the "how stale is this" window, with a final short pass immediately before the traffic switch | Reduces but does not eliminate the delta window; the *final* pass still has the same problem as A, just smaller in duration |

**None of these is picked here.** All three still leave an irreducible delta window
whose data must be captured somehow (§3) — the difference between them is how large
that window ends up being and how much tooling is needed to shrink it, not whether it
exists.

---

## 3. HOW EXISTING PRODUCTION RECORDS WILL BE TRANSFERRED

Mechanically: read each of the 34 MariaDB tables via the already-existing schema
knowledge (`docs/DATABASE-ANALYSIS-MARIADB-SOURCE.md` §1–§9), transform each row into
whatever document shape the (not-yet-designed) MongoDB schema specifies, write it to
the corresponding collection. This is a solved problem in the ETL sense — the open
questions are not "how do you copy rows," they are:

1. **What document shape does each row become?** — explicitly not decided (D-11 §4);
   blocks this task from being executable, not just theoretical, today.
2. **What happens to rows with no MongoDB equivalent behavior yet defined** — e.g. the
   75-column `products` table's 10 inline variant slots (per D-11 §5's explicit
   instruction not to "blindly convert every SQL table into a MongoDB collection").
3. **Referential-integrity translation** — MariaDB has zero FK constraints (confirmed,
   `docs/DATABASE-ANALYSIS-MARIADB-SOURCE.md` §4), so orphaned references already exist
   silently today (e.g. an `orderproducts.ProductId` with no matching `products` row is
   possible right now). The migration must decide whether to preserve orphans as-is
   (behavior-consistent) or silently drop them (a data change requiring approval) —
   **not decided here**, flagged as a sub-question of the eventual migration-script
   design.

This section is a **method sketch**, not an implementation — no script exists, none was
written.

---

## 4. RECORDS CREATED/MODIFIED DURING THE MIGRATION WINDOW

This is the crux of the entire cutover problem, so it is treated with full weight
rather than folded into §2.

While the (not-yet-scheduled) bulk migration work happens, the live Laravel/MariaDB
site keeps operating normally — customers keep placing orders, submitting enquiries,
registering accounts, and the admin keeps managing products, categories, and orders.
**Every one of those writes, from the moment the bulk-migration snapshot is taken until
the moment traffic actually cuts over to Next.js, is a write MongoDB does not have**
unless something captures it.

Two structurally different sub-cases, with different severity:

| Sub-case | Example | Severity |
|---|---|---|
| **New independent rows** | A new user registers; a new enquiry is submitted | Lower risk — these are self-contained inserts with no cross-table dependency at write time |
| **Rows that participate in the `GroupId` order-line-payment linkage** | A new order is placed: writes land in `orders`, `orderproducts`, and `payments`, unified only by the shared, non-FK-enforced `GroupId` value computed as `MAX(orderproducts.GroupId) + 1` at write time (per `docs/DATABASE-ANALYSIS-MARIADB-SOURCE.md` §11.3 — confirmed: **zero transactions or locks protect this today**) | **High risk** — see §5/§6 below; this is where "just capture the delta" stops being simple |

**No mechanism for capturing this window currently exists.** Building one is explicitly
out of scope for this document (owner instruction: "do NOT implement a synchronization
mechanism yet"). This section names the requirement; it does not build it.

---

## 5. IS DUAL-WRITE TECHNICALLY REQUIRED?

**Technically required for true zero-data-loss, real-time consistency during an
extended cutover window: yes, in principle** — the only way for MongoDB to have every
order the instant it's placed, without a batch-delay window, is for something to write
to both stores at (or near) the same time. This is the standard answer for any
dual-database migration with a live-traffic window.

**But "technically possible in principle" and "safe to implement here" are different
questions — see §6, which answers no to the second.**

Alternatives to true dual-write, each avoiding writing to two live databases
simultaneously, each with its own trade-off:

| Alternative | Mechanism | Avoids dual-write's specific hazard (§6) because... |
|---|---|---|
| **Single-writer with async replication** | Laravel remains the *only* writer during the whole pre-cutover period; a separate, decoupled process (not touching request/response flow) tails MariaDB changes and replays them into MongoDB on a delay | Laravel's own request-handling code is never touched, never blocked, never at risk of partial-write failure — the sync process can fail and retry independently |
| **Freeze-window cutover** (no dual-write at all) | Stop accepting new writes on the *old* system for a short, explicit maintenance window (site shows a "processing your order, back in N minutes" state, or is fully down), do the final delta sync, then open traffic on the *new* system | Eliminates the concurrent-write window entirely by eliminating concurrency — trades a short outage for certainty |
| **Read-only grace period** | Old system goes read-only (existing orders/data browsable, no new writes accepted) for a window before final cutover, new system opens for new writes only after that window closes | Similar to freeze-window, but customer-facing pages still render (browsing works), only mutating actions (checkout, registration, forms) are paused |

None of these is selected here — see §17 for how this choice interacts with the
preconditions/verification sequence, and note that **the freeze-window and read-only
options are the only two that make §7 (consistency verification) and §9 (post-rollback
data fate) simple, because they avoid the situation in §6 where both stores hold
data the other doesn't.**

---

## 6. IS DUAL-WRITE ACTUALLY FEASIBLE WITHOUT CHANGING LARAVEL BUSINESS BEHAVIOR?

**No — not safely, and this needs to be said plainly rather than softened.**

True dual-write (Laravel's own request-handling code writes to MariaDB *and* something
writes the same logical change to MongoDB, within the same request) requires touching
Laravel's write paths. Contract §6.2/F-13 ("changing which tables/columns are written...
is forbidden without approval") and IR-6 ("never change database behavior") were written
for a single-database context, but the underlying principle — *don't change what the
running Laravel application does* — applies with even more force here, because:

1. **Adding a second write call inside `HomeController@redirectToPaymentMethod`,
   `BuyerController`, or `AdminController` methods is a code change to the live Laravel
   application** — the exact thing this migration project (per its own Preamble and
   NN-1) is bound not to do. The Laravel app is the specification being ported *from*;
   modifying it to serve the migration's own tooling need inverts that relationship.
2. **The specific hazard this application has (R-6, confirmed in
   `docs/DATABASE-ANALYSIS-MARIADB-SOURCE.md` §11.3): `GroupId` is computed as
   `MAX(orderproducts.GroupId) + 1`, read-then-written, with zero transaction or lock,
   even today, within a single database.** Splitting that same unprotected
   read-then-write across two databases that cannot share a lock or a transaction
   at all does not just preserve this race condition — **it removes the one thing
   (single-database atomicity) that currently limits how bad the race can get.** Two
   concurrent orders under MariaDB-only can already collide (contract's own R-6,
   already flagged High severity); the same two orders under a naive dual-write scheme
   could compute two different `GroupId` values in the two stores, or one store could
   succeed while the other fails partway through the three-table write
   (`orders`/`orderproducts`/`payments`), leaving MariaDB and MongoDB permanently
   disagreeing about what a given order even *is*. Contract §5.3 already pre-approves
   wrapping this generation in a transaction **for the single-database case**; that
   pre-approval does not extend to (and cannot solve) a cross-engine race, because
   MongoDB transactions and MariaDB transactions cannot participate in one atomic
   commit together without distributed-transaction infrastructure this project has
   neither built nor been asked to build.
3. **A dual-write layer that writes to MongoDB but is not integrated into Laravel's
   request lifecycle (e.g. a database trigger, a binlog-tailing daemon) avoids
   touching Laravel's code**, which resolves the objection in point 1 — but this is
   no longer "dual-write" in the request-synchronous sense; it is the **async
   replication** alternative already named in §5. It has its own trade-off: replication
   lag means MongoDB is *never* perfectly current, which is a delta window by another
   name, just usually a short one (seconds to low minutes, depending on tooling) rather
   than the hours/days a batch-sync approach implies.

**Conclusion: synchronous, in-request dual-write is not feasible without modifying
Laravel's business logic, which this contract (and D-11 §3's explicit reaffirmation of
the fidelity mandate) forbids without a separate, explicit approval this document does
not have. Async, out-of-band replication is feasible without touching Laravel, but it
reintroduces a (smaller) delta window rather than eliminating one — it is a variant of
§5's alternatives, not a way to make true dual-write safe.**

---

## 7. HOW DATA CONSISTENCY WOULD BE VERIFIED BEFORE CUTOVER

Whatever migration/sync approach is eventually chosen, verification needs at least
three levels, mirroring the migration contract's own existing testing discipline
(Part 5) rather than inventing a new one:

| Level | What it checks | How |
|---|---|---|
| **Count parity** | Every MariaDB table's row count matches its MongoDB collection's document count, per table, at the moment sync is declared complete | Automated count comparison, all 34 sources — cheap, fast, catches gross failures (a collection that silently failed to load) |
| **Row-level content parity** | For every migrated row, every field value matches — same logical value, same type, same nulls (the same NN-6 standard the contract already applies to Laravel↔Next.js parity, extended to MariaDB↔MongoDB parity) | Automated field-by-field diff, sampled exhaustively for small tables (most of the 34 are under 1,000 rows) and statistically sampled for `enquiries` (16,386 rows, mostly spam per `docs/DATABASE-ANALYSIS-MARIADB-SOURCE.md` §8.1) |
| **Relational-integrity parity** | The `GroupId` linkage (orders↔orderproducts↔payments) reconstructs identically in MongoDB as it does via the MariaDB join — i.e., for every `GroupId` in MariaDB, the same set of order-lines and the same payment record are reachable in MongoDB | Targeted reconstruction test per order, not just per table — this is the single highest-value check given §6's finding that `GroupId` is the most fragile relational pattern in the schema |

**None of this is built yet.** This section specifies the verification *shape*
required before cutover could be responsibly declared ready — it is not the
verification itself.

---

## 8. WHAT IS "THE ROLLBACK POINT"?

This question does not have one answer — it depends on which cutover option (§14) and
dual-write posture (§5/§6) are eventually chosen, because each implies a different
answer:

| If cutover uses... | Then "the rollback point" means... |
|---|---|
| **Freeze-window cutover** (no concurrent writes, §5) | A single, well-defined instant: the moment traffic switched from Laravel to Next.js. Before that instant, MariaDB is authoritative and complete. Rolling back means switching traffic back to Laravel, which has lost nothing, because nothing was ever routed away from it during the freeze. |
| **Read-only grace period** (§5) | Same as above, plus the grace period itself is inherently low-risk to roll back out of (no new mutations happened anywhere during it). |
| **Async replication with ongoing replication lag** (§5/§6) | Ambiguous, and this is exactly why this option is riskier: "the rollback point" would have to mean "the last instant MongoDB and MariaDB were known to agree," which — under ongoing replication lag — is a **moving target that must be actively tracked** (e.g. a replication-lag high-water-mark timestamp), not a single fixed point chosen once. |

**This is precisely why §5's freeze-window/read-only options are structurally
safer than any replication-based approach**: they turn "what is the rollback point"
from an ongoing tracking problem into a single fact known in advance.

---

## 9. WHAT HAPPENS TO MONGODB-CREATED DATA IF ROLLBACK BECOMES NECESSARY?

This is the sharpest edge of the entire problem, and it must be answered honestly
rather than assumed away.

**Once Next.js is live and MongoDB starts accepting writes that Laravel/MariaDB never
sees (new orders, new user registrations, new enquiries placed against the *new* app),
a rollback to Laravel does not "undo" anything — it switches traffic to a system
(MariaDB) that has never heard of those writes.** Concretely:

- A customer places an order on the (now-live) Next.js site. It's written to MongoDB.
  An hour later, a critical defect forces rollback to Laravel. **That order does not
  exist in MariaDB.** The customer believes they have an order; the business, now
  running on the rolled-back Laravel/MariaDB system, has no record of it.
- The same applies to new user registrations, enquiries, appointments, reviews — any
  write MongoDB accepted that MariaDB never saw.

Three honest options, not a recommendation:

| Option | What it means | Cost |
|---|---|---|
| **(a) Manually reconcile** | After rollback, someone extracts every MongoDB write made during the live window and manually re-enters it into MariaDB (or writes a one-off backfill script per rollback event) | Labor-intensive, error-prone, and — critically — **time-sensitive**: the longer the live window before a rollback decision, the more data there is to reconcile, and orders/payments (§11) are the highest-stakes category to get wrong |
| **(b) Accept the loss** | Decide in advance that data written to MongoDB during the live window is NOT recoverable into MariaDB if rollback happens, and that this is an accepted business risk | Requires the owner's explicit acceptance in advance (this is exactly the "maximum acceptable data-loss window" question, §10) — cannot be assumed silently |
| **(c) Forward-fix instead of rollback** | Treat "something is badly wrong with Next.js" as a bug to fix in Next.js/MongoDB, not a reason to revert to Laravel — because reverting has the data-loss problem above, fixing forward does not | Only viable if the defect is fixable quickly and does not itself corrupt or lose data; not viable for a defect severe enough that the site is unusable |

**No option here is free.** This is the honest core of why "rollback" and "zero data
loss" are in tension for any live cutover between two independent databases, and it is
addressed head-on in §18 rather than glossed over.

---

## 10. MAXIMUM ACCEPTABLE DATA-LOSS WINDOW

**This is an owner risk-tolerance decision, not an implementer's to set.** It is asked
here explicitly because §9 cannot be resolved without it: the size of the "data
written to MongoDB that would be lost/require manual reconciliation on rollback"
problem scales directly with how long the system runs live before a rollback decision
is made, and how the cutover was staged.

Framed as a question for the owner, with the trade-off named for each answer:

| If the acceptable window is... | Then... |
|---|---|
| **Zero (no data loss, ever, under any rollback)** | Only §5's freeze-window/read-only cutover, with a **short, monitored initial live period** and a firm decision to use forward-fix (§9c) rather than rollback beyond a very early cutoff, achieves this — and even then, "zero" only holds if rollback is decided within that short monitored window, not weeks later |
| **Minutes to low hours** | Achievable with a freeze-window cutover plus a committed, fast rollback-decision process (someone is actively watching immediately post-cutover and would decide to roll back quickly, before much new data accumulates) |
| **Hours to days** | Requires accepting option (a) or (b) from §9 for whatever accumulated during that window — manual reconciliation becomes proportionally harder the longer this is |
| **Not yet decided** | Then §14/§15 (exact cutover/rollback sequence) cannot be finalized — this is the single most load-bearing unanswered question in this whole document |

**Not answered here. Owner input required before §14/§15 can be made concrete rather
than conditional.**

---

## 11. ORDERS/BOOKINGS/PAYMENTS DURING CUTOVER — TREATED WITH EXTRA CARE

This category (orders, `orderproducts`, `payments`, and — same shape of risk —
`tbl_appointment` bookings) is called out separately because it is where §6's
`GroupId`-race finding and §9's rollback-data-loss finding compound:

- These are the records with **real business/financial consequence** if lost, duplicated,
  or corrupted (contrast with, say, a lost `enquiries` spam row, which has none).
- They are the records **most likely to be actively in-flight** at the exact moment of
  cutover (a customer mid-checkout when traffic switches).
- The `GroupId` linkage (§6) means an order is not one row but three, correlated only by
  a non-enforced shared value — a cutover that catches `orders` but not the matching
  `orderproducts`/`payments` rows (or vice versa) produces a **partial, silently
  corrupted order**, which is worse than a cleanly missing one because it may not be
  detected until a customer or the admin notices something is wrong.

**Recommendation for this category specifically (not a full-system recommendation,
scoped narrowly): whatever cutover strategy is chosen for the rest of the site, orders/
payments/appointments should use the freeze-window discipline from §5 even if other,
lower-stakes data (browsing, registration) uses a softer approach** — i.e., checkout
should be temporarily disabled (matching the existing site's own honest behavior: it
already has no real payment gateway integration per the blueprint's QR/manual-payment
findings, so a "checkout temporarily unavailable" state is not a novel UX pattern for
this application) for the shortest possible window bracketing the actual traffic
switch, specifically to avoid an order being mid-flight across the two systems.
**This is a recommendation for the owner to accept or reject, not a decision made
here.**

---

## 12. ROLLBACK STRATEGY CLASSIFICATION

The owner asked which of five named strategies applies. Answered directly, because
this one has a factual answer rather than only trade-offs:

| Strategy | Applicable here? |
|---|---|
| **Application rollback only** (revert the Next.js deployment, keep using the same database) | **Not applicable as a rollback-from-MongoDB-to-MariaDB mechanism** — it solves rolling back a bad Next.js *code* deploy while staying on MongoDB, which is a different (and much safer, self-contained) problem than the one this document addresses. Worth having as its own, separate, low-risk safety net regardless of what's decided below. |
| **Database rollback** (revert MongoDB to a prior state) | **Does not solve the cross-engine problem** — reverting MongoDB to before cutover does not make MariaDB aware of anything, and does not un-happen the fact that Laravel stopped receiving traffic during the live window. Only relevant as one *component* of a fuller strategy (see below). |
| **Point-in-time recovery (PITR)** | **Same limitation as "database rollback," engine-scoped** — MongoDB Atlas supports PITR for the MongoDB side; it cannot reach backward into MariaDB. Useful for recovering from a MongoDB-side *operational* incident (bad write, accidental deletion) independent of the cutover-rollback question this document is about. |
| **Forward-fix only** | **The only strategy that fully avoids §9's data-loss problem**, at the cost of requiring genuine confidence that any live defect can be fixed quickly in place rather than needing a full revert. |
| **Another documented strategy** | **This is the honest answer: a composite of freeze-window cutover (§5) + a short, firm decision window (§10) + forward-fix as the default response to problems (§12 "forward-fix only") + application-rollback-only (reverting a bad Next.js deploy while staying on MongoDB) as the first line of defense for code-level bugs that don't involve data loss** — MongoDB PITR/database-rollback as an operational tool for MongoDB-side incidents, not as the cutover safety net itself. |

**No single one of the five named options, alone, is a complete or safe answer for
this specific two-engine transition.** The honest position, stated plainly per the
owner's explicit instruction not to claim safety that doesn't exist: **there is no
strategy here that achieves true zero-data-loss rollback once MongoDB has accepted
live writes that MariaDB has not seen.** The composite approach above minimizes and
bounds that exposure; it does not eliminate it. See §18.

---

## 13. BACKUP/SNAPSHOT REQUIREMENTS

| System | Requirement | Purpose |
|---|---|---|
| **MariaDB** | A full, verified snapshot taken immediately before the bulk migration begins, and again immediately before final cutover (if the window between them is long) | Establishes the known-good pre-migration state; without this, "roll back to Laravel" is meaningless if Laravel's own database were ever touched incorrectly during migration tooling development |
| **MongoDB Atlas** | Atlas's built-in continuous backup / PITR enabled from the moment the first collection is created, **before** any bulk migration data is loaded | Protects against a bad migration run corrupting the target before cutover even happens, and provides the "database rollback"/"PITR" tool named in §12 for MongoDB-side operational incidents post-cutover |
| **Both** | Backups must be verified restorable (a backup that has never been test-restored is not a backup, it is an unverified file) before cutover is scheduled | Directly reflects existing contract F-6 ("deploying to production without a rehearsed rollback plan" is absolutely forbidden) — extended here to both engines, not just the original single-database case F-6 was written for |

**Not yet scheduled or performed.** Named as a precondition (§16), not executed here.

---

## 14. CUTOVER SEQUENCE — CONDITIONAL, NOT YET EXECUTABLE

The exact sequence cannot be made concrete until §10 (acceptable data-loss window) and
the resulting choice among §5's alternatives are decided by the owner. What follows is
the **shape** of the sequence under the freeze-window approach (§5/§11's recommended
posture for the order/payment category), marked at each step where a decision is still
outstanding:

1. Verified, restorable backups taken of both MariaDB (current state) and MongoDB
   (empty/pre-load state) — **precondition, §13, not yet done**
2. Final bulk migration pass (§2 approach A or C's last iteration) run against MariaDB
   while it is still the only writer
3. Consistency verification (§7, all three levels) run and **passed** — not yet built
4. *(If the order/payment freeze recommendation, §11, is accepted)* Checkout,
   registration, and other mutating public forms temporarily disabled on the live
   Laravel site — **owner acceptance of this UX impact not yet obtained**
5. Final delta sync — capture anything written between step 2's snapshot and step 4's
   freeze taking effect
6. Second, final consistency verification pass (§7) — must also pass
7. Traffic cutover (DNS/proxy switch, matching the original D-10's mechanism, which is
   **not** itself invalidated by D-11 — only the shared-database assumption was)
8. Mutating functionality re-enabled, now against Next.js/MongoDB
9. **Monitored live period begins** — length depends on §10's still-undetermined
   acceptable-risk answer

**Steps 1, 3, 4 (acceptance), 6 depend on work or decisions not yet complete.** This
sequence cannot be executed as written today.

---

## 15. ROLLBACK SEQUENCE — CONDITIONAL, NOT YET EXECUTABLE

Symmetric structure, same caveats:

1. Decision to roll back made **within the monitored live period** (per §10 — the
   later this happens, the worse §9 gets)
2. DNS/proxy traffic switched back to the still-warm Laravel/MariaDB application
3. **Reconciliation decision point (§9):** either (a) manually extract and re-enter
   MongoDB-only writes into MariaDB, or (b) formally accept their loss, per whichever
   the owner chose in advance per §10 — **this must be decided before rollback is
   ever exercised, not improvised during an incident**
4. Post-rollback verification: confirm MariaDB is serving correctly, confirm the
   business is aware of exactly what (if anything) was lost or requires manual
   reconciliation per step 3
5. Incident write-up: what triggered the rollback, feeds into whether cutover is
   re-attempted and what changes first

**Step 3 is the one this document refuses to leave implicit** — a rollback plan that
doesn't name, in advance, what happens to the interim writes is not a complete plan,
per the owner's own instruction not to claim safety that doesn't exist.

---

## 16. PRECONDITIONS FOR PRODUCTION CUTOVER

Consolidated from the above, stated as a checklist so a future gate report can verify
each explicitly rather than assume:

- [ ] MongoDB collection schema designed and approved (blocked on a separate,
      not-yet-authorized decision — D-11 §4)
- [ ] Bulk migration tooling built and tested against a non-production MongoDB instance
- [ ] Consistency verification tooling built (§7, all three levels)
- [ ] Both databases' backup/restore verified (§13)
- [ ] Owner has answered §10 (maximum acceptable data-loss window)
- [ ] Owner has accepted or rejected §11's freeze-window recommendation for
      orders/payments/appointments specifically
- [ ] Owner has chosen among §9's three options for interim-write handling on rollback,
      **in advance of any live cutover**, not during an incident
- [ ] Rollback sequence (§15) has been rehearsed at least once against a non-production
      environment (directly required by existing contract F-6, unchanged by D-11)
- [ ] OI-6 (fresh production Laravel source export) is closed — unrelated to the
      database engine question, but still a standing M3 blocker per the owner's most
      recent instruction, and cutover is downstream of M3's entire implementation
- [ ] A monitored live-period length and an explicit rollback-decision deadline are
      agreed before traffic is switched

**None of these are complete today.** This checklist is the gate this document
produces; it does not certify readiness.

---

## 17. VERIFICATION CHECKS IMMEDIATELY BEFORE AND AFTER CUTOVER

| Timing | Check |
|---|---|
| **Immediately before** | Final consistency verification (§7) passes clean; both backups (§13) confirmed taken and restorable; the freeze/read-only window (if used) is confirmed actually in effect (no mutating traffic reaching Laravel) |
| **Immediately after** | Next.js serving correctly at the DNS/proxy level (matches the existing contract's V-03 Route Parity discipline); a smoke-test order/enquiry/registration placed and confirmed to land correctly in MongoDB; Laravel confirmed still warm and *not* receiving traffic (to catch a misconfigured switch early) |
| **Throughout the monitored live period (§10)** | Active watch for any error class that would trigger a rollback decision, with the clock on that decision understood to directly affect §9's severity |

---

## 18. THE HONEST ANSWER, STATED DIRECTLY

Per the owner's explicit instruction: **if there is no genuinely safe zero-data-loss
rollback strategy, say so.**

**There is no strategy documented above, or reasonably available, that achieves true
zero-data-loss rollback once MongoDB has accepted live production writes that MariaDB
has never seen.** This is not a gap in this analysis — it is a structural consequence
of choosing two independent database engines with no shared transaction boundary
(D-11's own trade-off, accepted by the owner for reasons outside this document's
scope). The best achievable position is:

1. **Minimize the window during which this exposure exists** — a freeze-window cutover
   (§5) with a short, firm, pre-committed rollback-decision deadline (§10) makes the
   exposure small and bounded rather than open-ended.
2. **Decide in advance, not during an incident, what happens to that window's data**
   (§9) — accepting a small, known, bounded loss (or committing to manual
   reconciliation for it) is a legitimate choice; discovering the question exists only
   after a rollback is already underway is not.
3. **Prefer forward-fix over rollback where the defect allows it** (§12) — because
   forward-fixing a Next.js/MongoDB issue never has the data-loss problem a rollback
   to Laravel does.
4. **Treat orders/payments/appointments (§11) with the strictest version of the above**
   — they are the category where "small, known, bounded loss" is least acceptable as a
   business matter, so they warrant the narrowest exposure window even if other data
   categories use a looser approach.

**Backups existing is not, by itself, a safety claim this document makes** — per the
owner's explicit instruction not to conflate the two. A MariaDB backup protects against
losing MariaDB's *own* data; it does nothing to recover a MongoDB-only write that a
rollback would otherwise strand. A MongoDB backup/PITR protects against a MongoDB-side
operational accident; it does not make MariaDB aware of anything. **Backups are
necessary and are required (§13, §16) — they are not sufficient, and this document does
not claim otherwise.**

---

## 19. WHAT THIS DOCUMENT DOES NOT DO

- Does not select a final cutover strategy from §5/§14's options
- Does not select a final answer to §10 (acceptable data-loss window) — owner input
  required
- Does not select a final answer to §9 (interim-write handling on rollback) — owner
  input required, and must be decided before it's needed, not during an incident
- Does not design the MongoDB collection schema (still governed by D-11 §4 — separate,
  not-yet-authorized decision)
- Does not implement any synchronization mechanism, migration script, or verification
  tooling described above
- Does not create any MongoDB collection
- Does not migrate any data
- Does not modify any Laravel or Next.js file
- Does not authorize M3

---

## 20. FILE-CHANGE ACCOUNTING FOR THIS SESSION

- Created: this file only
- Modified: none
- Deleted: none
- Laravel source (`spakshomeopathy.com/**`): untouched
- `Database/db_newhomo.sql`: untouched
- Next.js application (`spakshomeopathy-next/src/**`): untouched
- MongoDB: no connection attempted, no collection created, no credentials requested
- OI-1a, OI-1b: untouched, irrelevant to this document
- OI-6: unchanged, still open, still the standing M3 implementation blocker

---

## 21. WHAT IS NEEDED FROM THE OWNER TO CLOSE THIS DECISION

1. An answer to §10 — maximum acceptable data-loss window (zero / minutes-hours /
   hours-days / other)
2. Accept or reject §11's recommendation to freeze orders/payments/appointments
   specifically during cutover, even if other data uses a softer approach
3. A choice among §9's three options (manual reconciliation / accept the loss /
   forward-fix-first posture) for what happens to MongoDB-only writes if rollback is
   ever exercised — decided **in advance**
4. Confirmation of which §5 alternative (freeze-window / read-only grace / async
   replication with its inherent lag) is acceptable, given §6's finding that true
   synchronous dual-write is not safely achievable without modifying Laravel

**Until these are answered, §14/§15's cutover and rollback sequences remain
conditional, and M3 remains gated on OI-6 regardless (this document does not change
that gate) — this D-10 update itself only needs to be *read and acknowledged* to
unblock the parts of M3 that don't depend on cutover planning; the cutover-specific
questions above can be answered later, closer to M13, without blocking earlier
milestones' implementation work.**

---

*This document is analysis and decision-framing only, per contract §12.5/§10.1 Step 6.
It supersedes the original D-10 row's shared-database assumption in
`MIGRATION-CONTRACT.md` §14, consistent with D-11's precedence-rank-1 authority
(contract §11). It does not itself carry precedence-rank-1 authority until the owner
signs off on §21's four open questions — until then it is the analysis the owner
requested, not a binding decision.*

---

## 22. OWNER REVIEW — 2026-08-16 — ANALYSIS ACCEPTED, §21 DEFERRED TO M13

**Append-only. Nothing above this line was altered.**

**Status: ANALYSIS ACCEPTED.** The owner has reviewed this document and explicitly
accepted its central finding (§18) without qualification: **there is no true
zero-data-loss rollback once MongoDB has accepted writes MariaDB never received.** The
owner instructed that no attempt be made to manufacture a "zero-loss" strategy that
does not exist.

**Also explicitly accepted, verbatim from the findings above:** MariaDB/MongoDB cannot
share a transaction boundary (§6); safe synchronous dual-write cannot be assumed (§6);
the existing `GroupId` generation pattern makes naive dual-write particularly unsafe
(§6, R-6); orders/payments/appointments require stricter cutover treatment (§11); a
freeze-window/controlled cutover is a viable future direction (§5); forward-fix may be
preferable to rollback in some scenarios (§12); MongoDB-only writes during rollback
must be explicitly handled, not improvised (§9, §15).

**§21's four open questions are DEFERRED, not answered, and not to be guessed:**

| # | Question | Status |
|---|---|---|
| 1 | Maximum acceptable data-loss window | OPEN — deferred to M13 |
| 2 | Whether checkout/registration/appointments may be frozen during cutover | OPEN — deferred to M13 |
| 3 | Treatment of MongoDB-only writes during rollback | OPEN — deferred to M13 |
| 4 | Final cutover/rollback posture | OPEN — deferred to M13 |

**No answer was invented for any of the four.** This document's own §21 already noted
these could be deferred without blocking earlier milestone work — the owner has now
formally exercised that option.

**No implementation occurred as a result of this review:** no cutover strategy, no
dual-write mechanism, no synchronization service, no MongoDB collection, no Laravel
modification, no Next.js modification. Confirmed by file-change accounting: this
addendum is the only change made to this document; no other file in the project was
touched during this review.

**Standing status, restated:**
- M2: **COMPLETE** (unchanged)
- D-10: **documented, DEFERRED** — accepted as analysis, not yet a binding operational
  decision (§21's four questions remain open until M13)
- D-11: unchanged — MongoDB Atlas remains the target architecture
- M3: **NOT AUTHORIZED**
- **OI-6 (fresh production Laravel source export) remains the current, sole
  implementation blocker for M3** — owner-supplied, not implementer-actionable
- M3 will not begin until the owner explicitly provides the OI-6 export and explicitly
  authorizes M3

**No further work performed on D-10 this session, per instruction. Stopping.**

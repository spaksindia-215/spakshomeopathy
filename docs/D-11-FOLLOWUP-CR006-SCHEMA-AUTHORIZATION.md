# D-11 FOLLOW-UP DECISION — Schema-Design Authorization for CR-006 Phase 5

**Raised by:** Migration Implementer
**Date:** 2026-09-15
**Decided by:** Owner (homeopathy38@gmail.com), 2026-09-15
**Contract version:** 1.0
**Status:** ✅ **APPROVED — scoped precisely to CR-006 Phase 5, effective
immediately**

> This is the "D-11 follow-up decision" flagged as an open item in
> `docs/CR-006-ANALYSIS-PHASE1.md` §8 Item 4 and carried forward,
> unresolved, through Phases 2–4's gate reports. It is recorded here as a
> named, dated amendment, following the same pattern D-11 itself and
> CR-001 §24's amendments already established for this project — a
> decision at this precedence level is not treated as settled merely
> because it was said in conversation; it is written down.

---

## 0. WHAT THIS AUTHORIZES, PRECISELY

D-11 §4 draws a hard line: "documentation of the existing schema... as a
precondition for eventual MongoDB schema design" was authorized in
2026-08-16; "designing the MongoDB collection schema... creating MongoDB
collections... migrating any data" was explicitly **not** authorized
until "separately instructed."

**This document is that separate instruction — scoped to exactly two
items, both already named in `CR-006-PHASE-4-PLAN.md`'s carry-forward and
`CR-006-ANALYSIS-PHASE1.md` §3/§7:**

1. The medicine↔disease many-to-many relationship (a new join
   structure — no such relationship exists in the source schema at all,
   confirmed by direct grep in Phase 1's analysis).
2. The potency/variant design question (whether/how to model
   pack-size/potency data — NOT a reuse of `product_variations`, which
   Phase 1's dedicated inspection report already ruled unsafe to revive).

**Not authorized by this document:** any other new collection named
elsewhere in the original CR-006 request (coupons, media library, audit
log, redirects, RBAC persistence, homepage sections, pages, testimonials,
navigation). Those remain gated exactly as `CR-006-ANALYSIS-PHASE1.md` §8
already stated — this decision does not blanket-authorize the rest of
that list, only the two items Phase 5 actually needs.

## 1. GOVERNING PRINCIPLE — UNCHANGED FROM D-11 §5

D-11 §5's standing rule is not relaxed by this authorization:

> "The eventual MongoDB design must preserve application behavior, not
> blindly convert every SQL table into a MongoDB collection... any shape
> change... requires... a documented behavioral reason, not a stylistic
> preference."

Since **no relational medicine↔disease structure exists in source to
preserve**, this specific item has no "preserve the existing shape"
obligation to satisfy — there is no existing shape. The design is
therefore genuinely new, not a translation, and must be justified on its
own functional merits (what the admin/public site need to do), not on
fidelity grounds. This is named explicitly so the Phase 5 plan doesn't
manufacture a false "matches source" justification for a decision that is
actually new-feature design.

For potency/variants, D-11 §5's F-20 reminder (do not normalize the wide
`products` schema) remains fully in force — Phase 5's plan must treat the
existing inline multi-potency slot fields on `products` as the real,
must-be-preserved behavioral baseline (per the Phase 1 `product_variations`
inspection report's own recommendation), not something to redesign away
for tidiness.

## 2. SCOPE BOUNDARY RESTATED

- Authorizes: designing and creating the specific new collection(s)/field
  additions Phase 5's plan proposes for the two items in §0, once that
  plan is itself presented and approved (this document does not skip the
  plan-then-approve step already established for every phase; it only
  removes the D-11-specific blocker that would otherwise stop the plan
  from proposing a schema at all).
- Does not authorize: any implementation before the Phase 5 plan itself is
  approved. The one-phase-at-a-time, plan-then-approve discipline
  (contract §20 Step 4, restated in every prior phase's approval message)
  is unchanged by this document.
- Does not reopen: D-11's own engine choice (MongoDB Atlas), or any of the
  other CR-006 modules' schema gates.

---

*This decision is binding, scoped exactly as written above, effective
2026-09-15.*

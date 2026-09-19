# CR-006 Phase 3 — `buyer_profile` Gap: Raised, Then Corrected

**Status:** ✅ RESOLVED — no gap actually existed. Recorded here in full,
including the original mistaken finding, per this project's own
transparency standard (append/correct, don't silently erase).

---

## What was originally reported (incorrect)

While implementing Phase 3, inspection of `admin/view-orders.blade.php`
found it renders `buyer_profile` fields (`FullAddress`, `PinCode`,
`HouseNo`, `Landmark`, `State`) for the order's shipping address. A search
of `src/lib/mongodb/schemas/` for a dedicated `buyerProfile.ts` file and
`repositories/` for a dedicated `BuyerProfileRepository` class found
neither, and implementation was paused with a report to the owner stating:
**"no MongoDB schema, collection, or repository for `buyer_profile` exists
anywhere in this codebase."**

The owner's decision at that point was: build the rest of Phase 3 (order-
list, ship, cancel, seller-orders, manage-payments, seller-payments,
appointment-list) now, and defer `view-order/[orderId]` to its own
follow-up.

## What was actually true (the correction)

That search was incomplete. `buyer_profile` **is already modeled** —
embedded directly on the `users` document as an optional `buyerProfile`
field (`src/lib/mongodb/schemas/user.ts:29-40,82`), per an explicit,
already-documented decision:

> `docs/M3-DATABASE-MAPPING.md` §1.1 (Option A): "buyer profile data is
> read on nearly every buyer-authenticated page load, always together with
> the user record, never independently" — so it was embedded, not kept as
> a separate collection, from the start of this project's MongoDB schema
> design (M3-A).

`UserRepository.findByLegacyId()` (already existing, already used
elsewhere in this codebase) returns the full `User` document including
`buyerProfile` when present. **No new schema, collection, repository, or
migration was ever needed.** The "gap" was a research miss (checking only
for a standalone file/class, not an embedded field within an existing
one), not a real missing dependency.

## Why this is disclosed rather than quietly fixed

This project's own contract and CR history (e.g. `M5-POST-GATE-
RECONCILIATION-2026-09-07.md`) treats an incorrect finding, once acted on
(here: a paused/deferred decision made partly on its basis), as something
to correct on the record — not to silently overwrite. The owner's decision
to defer `view-order/[orderId]` was reasonable given the information
presented at the time; the information was wrong, not the decision.

## Resolution

`getAdminOrderDetail()` (`adminOrderService.ts`) and the
`view-order/[orderId]` page were built in this same Phase 3 pass, once the
correction was found — no separate follow-up phase or additional owner
authorization was needed, since no new persistence, route, or schema is
actually involved. `seller-orders/[sid]`'s pre-existing "View" link (which
always pointed at this URL, matching source) now resolves correctly
instead of 404ing.

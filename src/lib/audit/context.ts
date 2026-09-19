/**
 * Request-scoped "current admin" context — CR-006 Phase 9
 * (`docs/CR-006-PHASE-9-PLAN.md` §2.1). GENUINELY NEW PATTERN for this
 * codebase: no `AsyncLocalStorage` usage exists anywhere else in this
 * project.
 *
 * WHY THIS EXISTS: `ValidatedRepository`'s base write methods
 * (`insertOne`/`updateOne`/`deleteOne`/`upsertByLegacyId`,
 * `src/lib/mongodb/repositories/base.ts`) log every write to the
 * `auditLog` collection, but have no `actor` parameter — adding one
 * would mean touching every one of the ~24 repository subclasses' own
 * methods that call them. `AsyncLocalStorage` lets those base methods
 * read "who is making this request" from ambient context instead.
 *
 * CORRECTION MADE DURING PLANNING (see the Phase 9 plan §2.1 for the
 * full account): the context must be set by WRAPPING the code that
 * performs the write, not by a fire-and-forget call earlier in the
 * request — `AsyncLocalStorage`'s store only exists for the synchronous
 * extent of `.run(callback)` and whatever is `await`ed inside that
 * callback. Every existing route handler that calls
 * `requireAdminSession()` wraps its OWN post-auth body in
 * `runWithActor(session, ...)` — one mechanical line per file, not a
 * redesign of that handler's logic.
 */

import { AsyncLocalStorage } from 'async_hooks';
import type { SessionPayload } from '../auth/session';

export interface AuditActor {
  userId: number;
  email: string;
}

const storage = new AsyncLocalStorage<AuditActor>();

/**
 * Runs `fn` with `session` available to any `ValidatedRepository` write
 * called synchronously or via `await` within it, for audit-log
 * attribution. Every existing route handler/Server Action that calls
 * `requireAdminSession()` should wrap the REST of its body in this —
 * see any Phase 9 file's own header for a worked example.
 */
export function runWithActor<T>(session: SessionPayload, fn: () => Promise<T>): Promise<T> {
  return storage.run({ userId: session.userId, email: session.email }, fn);
}

/** Reads the current actor context, or `null` if none is set (e.g. a
 * write triggered by a migration script, a public-facing write path
 * with no admin session, or a route handler that hasn't yet been
 * updated to call `runWithActor`). Never throws — a missing actor
 * degrades to an audit entry with null actor fields, never blocks the
 * underlying write. */
export function getCurrentActor(): AuditActor | null {
  return storage.getStore() ?? null;
}

/**
 * Thin service layer between the Herbs Store admin UI and
 * `HerbProductRepository`, following this app's existing
 * `src/lib/services/*` convention (a service function per user-facing
 * operation, calling one or more repositories).
 *
 * Every function here degrades explicitly when no database is configured
 * — returns `{ persisted: false }` rather than throwing, so a Server
 * Action can show an honest "not saved, no database configured" message
 * instead of a raw error. This mirrors the same non-persisting-but-
 * honest posture the admin Herbs pages already had before this file
 * existed (see their own header comments), now upgraded to actually
 * persist when a database IS available, while staying safe when one
 * isn't (the common case in a fresh clone / sandbox session).
 */

import { getHerbsDb, isHerbsDbConfigured } from './client';
import { HerbProductRepository } from './herbProductRepository';
import { WellnessCategoryRepository } from './wellnessCategoryRepository';
import type { HerbProductDoc } from './schema';
import type { WellnessCategoryDoc } from './wellnessCategorySchema';

export interface SaveResult {
  persisted: boolean;
  reason?: string;
}

async function getRepository(): Promise<HerbProductRepository> {
  const db = await getHerbsDb();
  return new HerbProductRepository(db);
}

async function getWellnessCategoryRepository(): Promise<WellnessCategoryRepository> {
  const db = await getHerbsDb();
  return new WellnessCategoryRepository(db);
}

/** Reads all herb products from the database, or `null` if no database
 * is configured — callers merge this with (or fall back entirely to)
 * `@/lib/herbs/data/products`'s static seed array. */
export async function readHerbProductsFromDb(): Promise<HerbProductDoc[] | null> {
  if (!isHerbsDbConfigured()) return null;
  try {
    const repo = await getRepository();
    return await repo.findAll();
  } catch {
    // Configured but unreachable (network, auth, wrong URI, etc.) — treat
    // the same as "not configured" from the caller's point of view: fall
    // back to static data rather than breaking the public storefront.
    return null;
  }
}

export async function saveHerbProduct(doc: HerbProductDoc): Promise<SaveResult> {
  if (!isHerbsDbConfigured()) {
    return { persisted: false, reason: 'No database configured for the Herbs Store.' };
  }
  try {
    const repo = await getRepository();
    await repo.upsert(doc);
    return { persisted: true };
  } catch (err) {
    return {
      persisted: false,
      reason: err instanceof Error ? err.message : 'Unknown database error.',
    };
  }
}

export async function deleteHerbProduct(id: string): Promise<SaveResult> {
  if (!isHerbsDbConfigured()) {
    return { persisted: false, reason: 'No database configured for the Herbs Store.' };
  }
  try {
    const repo = await getRepository();
    await repo.deleteById(id);
    return { persisted: true };
  } catch (err) {
    return {
      persisted: false,
      reason: err instanceof Error ? err.message : 'Unknown database error.',
    };
  }
}

/** Reads all wellness categories from the database, or `null` if no
 * database is configured — callers fall back to the static
 * `WELLNESS_CATEGORIES` constant in `@/lib/herbs/data/taxonomy`, same
 * degrade-gracefully posture as `readHerbProductsFromDb`. */
export async function readWellnessCategoriesFromDb(): Promise<WellnessCategoryDoc[] | null> {
  if (!isHerbsDbConfigured()) return null;
  try {
    const repo = await getWellnessCategoryRepository();
    return await repo.findAll();
  } catch {
    return null;
  }
}

export async function saveWellnessCategory(doc: WellnessCategoryDoc): Promise<SaveResult> {
  if (!isHerbsDbConfigured()) {
    return { persisted: false, reason: 'No database configured for the Herbs Store.' };
  }
  try {
    const repo = await getWellnessCategoryRepository();
    await repo.upsert(doc);
    return { persisted: true };
  } catch (err) {
    return {
      persisted: false,
      reason: err instanceof Error ? err.message : 'Unknown database error.',
    };
  }
}

/** Soft delete (`status: 'hidden'`) — see `WellnessCategoryRepository.hide`'s
 * header for why this project doesn't hard-delete categories that
 * existing herb documents may still reference. */
export async function hideWellnessCategory(key: string): Promise<SaveResult> {
  if (!isHerbsDbConfigured()) {
    return { persisted: false, reason: 'No database configured for the Herbs Store.' };
  }
  try {
    const repo = await getWellnessCategoryRepository();
    await repo.hide(key);
    return { persisted: true };
  } catch (err) {
    return {
      persisted: false,
      reason: err instanceof Error ? err.message : 'Unknown database error.',
    };
  }
}

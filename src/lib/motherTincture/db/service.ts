/**
 * Thin service layer between the Mother Tincture admin UI and
 * `MotherTinctureProductRepository`, mirroring `@/lib/herbs/db/service.ts`
 * exactly — see that file's header for the full graceful-degradation
 * rationale. Every function here returns `{ persisted: false }` rather
 * than throwing when no database is configured, so the admin Server
 * Action can show an honest "not saved" message.
 */

import { getMotherTinctureDb, isMotherTinctureDbConfigured } from './client';
import { MotherTinctureProductRepository } from './motherTinctureProductRepository';
import type { MotherTinctureProductDoc } from './schema';

export interface SaveResult {
  persisted: boolean;
  reason?: string;
}

async function getRepository(): Promise<MotherTinctureProductRepository> {
  const db = await getMotherTinctureDb();
  return new MotherTinctureProductRepository(db);
}

/** Reads all admin-added Mother Tincture products from the database, or
 * `null` if no database is configured — callers merge this with the real
 * curated catalogue (`@/lib/homeopathy/queries`'s `getActiveProducts()`),
 * same pattern as `getMergedHerbCatalog()` merges with the Herbs Store's
 * static seed array. */
export async function readMotherTinctureProductsFromDb(): Promise<
  MotherTinctureProductDoc[] | null
> {
  if (!isMotherTinctureDbConfigured()) return null;
  try {
    const repo = await getRepository();
    return await repo.findAll();
  } catch {
    // Configured but unreachable (network, auth, wrong URI, etc.) — treat
    // the same as "not configured" from the caller's point of view: fall
    // back to the real curated catalogue alone rather than breaking the
    // public storefront.
    return null;
  }
}

export async function saveMotherTinctureProduct(
  doc: MotherTinctureProductDoc
): Promise<SaveResult> {
  if (!isMotherTinctureDbConfigured()) {
    return { persisted: false, reason: 'No database configured for Mother Tincture admin-add.' };
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

export async function deleteMotherTinctureProduct(legacyId: number): Promise<SaveResult> {
  if (!isMotherTinctureDbConfigured()) {
    return { persisted: false, reason: 'No database configured for Mother Tincture admin-add.' };
  }
  try {
    const repo = await getRepository();
    await repo.deleteByLegacyId(legacyId);
    return { persisted: true };
  } catch (err) {
    return {
      persisted: false,
      reason: err instanceof Error ? err.message : 'Unknown database error.',
    };
  }
}

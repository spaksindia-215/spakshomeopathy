/**
 * Thin service layer between the Cosmetics admin UI and
 * `CosmeticsProductRepository`, mirroring
 * `@/lib/motherTincture/db/service.ts` exactly — see that file's header
 * for the full graceful-degradation rationale. Every function here
 * returns `{ persisted: false }` rather than throwing when no database is
 * configured, so the admin UI can show an honest "not saved" message.
 */

import { getCosmeticsDb, isCosmeticsDbConfigured } from './client';
import { CosmeticsProductRepository } from './cosmeticsProductRepository';
import type { CosmeticsProductDoc } from './schema';

export interface SaveResult {
  persisted: boolean;
  reason?: string;
}

async function getRepository(): Promise<CosmeticsProductRepository> {
  const db = await getCosmeticsDb();
  return new CosmeticsProductRepository(db);
}

/** Reads all admin-added Cosmetics products, or `null` if no database is
 * configured — the public `/homeopathy/cosmetics` page treats `null` the
 * same as an empty list (shows the "coming soon" empty state). */
export async function readCosmeticsProductsFromDb(): Promise<CosmeticsProductDoc[] | null> {
  if (!isCosmeticsDbConfigured()) return null;
  try {
    const repo = await getRepository();
    return await repo.findAll();
  } catch {
    return null;
  }
}

export async function readCosmeticsProductByLegacyId(
  legacyId: number
): Promise<CosmeticsProductDoc | null> {
  if (!isCosmeticsDbConfigured()) return null;
  try {
    const repo = await getRepository();
    return await repo.findByLegacyId(legacyId);
  } catch {
    return null;
  }
}

export async function saveCosmeticsProduct(doc: CosmeticsProductDoc): Promise<SaveResult> {
  if (!isCosmeticsDbConfigured()) {
    return { persisted: false, reason: 'No database configured for Cosmetics admin-add.' };
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

export async function deleteCosmeticsProduct(legacyId: number): Promise<SaveResult> {
  if (!isCosmeticsDbConfigured()) {
    return { persisted: false, reason: 'No database configured for Cosmetics admin-add.' };
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

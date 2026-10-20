import { readCosmeticsProductsFromDb } from './db/service';
import { CURATED_COSMETIC_PRODUCTS, type CosmeticProduct } from './curatedProducts';

/**
 * SERVER-ONLY entry point for the Cosmetics product line.
 * Merges any admin-added cosmetics from the database with the curated
 * 3-type catalog (Homeopathic, Allopathic, Ayurvedic).
 */
export async function getCosmeticsCatalog(): Promise<CosmeticProduct[]> {
  const dbDocs = await readCosmeticsProductsFromDb();
  if (!dbDocs || dbDocs.length === 0) {
    return CURATED_COSMETIC_PRODUCTS;
  }
  
  const mappedDb = dbDocs.map((p) => ({
    ...p,
    cosmeticType: ((p as unknown as { cosmeticType?: string }).cosmeticType || 'homeopathic') as 'homeopathic' | 'allopathic' | 'ayurvedic',
  }));

  return [...mappedDb, ...CURATED_COSMETIC_PRODUCTS];
}

export type { CosmeticProduct };

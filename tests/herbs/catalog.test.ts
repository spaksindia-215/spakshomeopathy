/**
 * `getMergedHerbCatalog` tests (UNIT — mocks `readHerbProductsFromDb`
 * directly via `vi.mock`, no real MongoDB involved).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HERB_PRODUCTS } from '@/lib/herbs/data/products';
import type { HerbProductDoc } from '@/lib/herbs/db/schema';

vi.mock('@/lib/herbs/db/service', () => ({
  readHerbProductsFromDb: vi.fn(),
}));

const sampleDbDoc: HerbProductDoc = {
  id: 'hp-db-1',
  name: 'DB Herb',
  slug: 'db-herb',
  sku: 'SPK-DB-001',
  shortDescription: 'A DB-persisted herb.',
  description: 'Longer description.',
  benefits: [],
  ingredients: [],
  howToUse: '',
  precautions: '',
  image: 'default',
  gallery: ['default'],
  form: 'whole-herbs',
  categoryLabel: 'Whole Herbs',
  wellnessCategories: ['general-wellness'],
  variants: [{ label: 'Default', sortWeight: 0, price: 75, sku: 'SPK-DB-001', stock: 5 }],
  rating: 0,
  reviewCount: 0,
  stock: 5,
  status: 'active',
  featured: false,
  bestseller: false,
  newArrival: false,
  tags: [],
  metaTitle: 'DB Herb | Spaks Herbs',
  metaDescription: 'A DB-persisted herb.',
  createdAt: '2026-08-31T00:00:00.000Z',
  updatedAt: '2026-08-31T00:00:00.000Z',
};

describe('getMergedHerbCatalog', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('falls back to the static seed catalogue when readHerbProductsFromDb returns null', async () => {
    const { readHerbProductsFromDb } = await import('@/lib/herbs/db/service');
    vi.mocked(readHerbProductsFromDb).mockResolvedValue(null);

    const { getMergedHerbCatalog } = await import('@/lib/herbs/catalog');
    const catalog = await getMergedHerbCatalog();

    expect(catalog).toHaveLength(HERB_PRODUCTS.length);
    expect(catalog.map((p) => p.id)).toEqual(HERB_PRODUCTS.map((p) => p.id));
  });

  it('falls back to the static seed catalogue when readHerbProductsFromDb returns an empty array', async () => {
    const { readHerbProductsFromDb } = await import('@/lib/herbs/db/service');
    vi.mocked(readHerbProductsFromDb).mockResolvedValue([]);

    const { getMergedHerbCatalog } = await import('@/lib/herbs/catalog');
    const catalog = await getMergedHerbCatalog();

    expect(catalog).toHaveLength(HERB_PRODUCTS.length);
  });

  it('prepends DB-saved products ahead of the seed catalogue', async () => {
    const { readHerbProductsFromDb } = await import('@/lib/herbs/db/service');
    vi.mocked(readHerbProductsFromDb).mockResolvedValue([sampleDbDoc]);

    const { getMergedHerbCatalog } = await import('@/lib/herbs/catalog');
    const catalog = await getMergedHerbCatalog();

    expect(catalog).toHaveLength(HERB_PRODUCTS.length + 1);
    expect(catalog[0]?.id).toBe('hp-db-1');
    expect(catalog[0]?.name).toBe('DB Herb');
  });

  it('a DB product sharing an id with a seed product replaces it, not duplicates it', async () => {
    const { readHerbProductsFromDb } = await import('@/lib/herbs/db/service');
    const overrideDoc: HerbProductDoc = { ...sampleDbDoc, id: HERB_PRODUCTS[0]!.id };
    vi.mocked(readHerbProductsFromDb).mockResolvedValue([overrideDoc]);

    const { getMergedHerbCatalog } = await import('@/lib/herbs/catalog');
    const catalog = await getMergedHerbCatalog();

    expect(catalog).toHaveLength(HERB_PRODUCTS.length);
    const withId = catalog.filter((p) => p.id === HERB_PRODUCTS[0]!.id);
    expect(withId).toHaveLength(1);
    expect(withId[0]?.name).toBe('DB Herb');
  });
});

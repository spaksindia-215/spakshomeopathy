/**
 * CR-006 Phase 6 — regression test for the one schema-adjacent decision
 * this phase makes (`docs/CR-006-PHASE-6-PLAN.md` §2.2): loosening
 * `wellnessCategorySchema` on `herbProductDocSchema` from a closed
 * `z.enum([...13 literals])` to `z.string().min(1)`, so a herb document
 * can be tagged with a wellness category key that didn't exist in the
 * original hardcoded taxonomy (i.e. one added later via the new
 * `wellnessCategories` admin collection).
 */

import { describe, it, expect } from 'vitest';
import { herbProductDocSchema } from '@/lib/herbs/db/schema';
import type { HerbProductDoc } from '@/lib/herbs/db/schema';

const baseHerb: HerbProductDoc = {
  id: 'hp-schema-test-1',
  name: 'Schema Test Herb',
  slug: 'schema-test-herb',
  sku: 'SPK-SCHEMA-001',
  shortDescription: 'A test herb.',
  description: 'A longer description.',
  benefits: [],
  ingredients: [],
  howToUse: '',
  precautions: '',
  image: 'default',
  gallery: ['default'],
  form: 'whole-herbs',
  categoryLabel: 'Whole Herbs',
  wellnessCategories: ['general-wellness'],
  variants: [{ label: 'Default', sortWeight: 0, price: 10, sku: 'SPK-SCHEMA-001', stock: 1 }],
  rating: 0,
  reviewCount: 0,
  stock: 1,
  status: 'active',
  featured: false,
  bestseller: false,
  newArrival: false,
  tags: [],
  metaTitle: 'Schema Test Herb | Spaks Herbs',
  metaDescription: 'A test herb.',
  createdAt: '2026-09-15T00:00:00.000Z',
  updatedAt: '2026-09-15T00:00:00.000Z',
};

describe('herbProductDocSchema — wellnessCategories field (loosened in Phase 6)', () => {
  it('still validates one of the original 13 static category keys', () => {
    expect(() =>
      herbProductDocSchema.parse({ ...baseHerb, wellnessCategories: ['hair-care'] })
    ).not.toThrow();
  });

  it('validates a NEW category key not in the original 13 (admin-added via the new collection)', () => {
    expect(() =>
      herbProductDocSchema.parse({ ...baseHerb, wellnessCategories: ['sleep-support'] })
    ).not.toThrow();
  });

  it('validates multiple wellness category keys (the fixed multi-select capability)', () => {
    const parsed = herbProductDocSchema.parse({
      ...baseHerb,
      wellnessCategories: ['hair-care', 'immunity', 'sleep-support'],
    });
    expect(parsed.wellnessCategories).toEqual(['hair-care', 'immunity', 'sleep-support']);
  });

  it('still rejects an empty-string category key', () => {
    expect(() =>
      herbProductDocSchema.parse({ ...baseHerb, wellnessCategories: [''] })
    ).toThrow();
  });
});

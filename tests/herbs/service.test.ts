/**
 * `@/lib/herbs/db/service` tests — verifies the graceful-degradation
 * contract this session's implementation report describes: every
 * function must return `{ persisted: false, reason }` rather than throw
 * when no database is configured, so the admin UI (and, if ever wired,
 * the public storefront) never breaks in an environment with no
 * `MONGODB_*` vars set (the common case — no live database is reachable
 * in this repository's own dev/sandbox environment, verified this
 * session via `npm run mongodb:check` timing out).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  readHerbProductsFromDb,
  saveHerbProduct,
  deleteHerbProduct,
  readWellnessCategoriesFromDb,
  saveWellnessCategory,
  hideWellnessCategory,
} from '@/lib/herbs/db/service';
import type { HerbProductDoc } from '@/lib/herbs/db/schema';
import type { WellnessCategoryDoc } from '@/lib/herbs/db/wellnessCategorySchema';

const ENV_KEYS = [
  'MONGODB_URI',
  'MONGODB_DB_NAME',
  'MONGODB_ENV',
  'MONGODB_ALLOW_PRODUCTION',
] as const;
let saved: Record<string, string | undefined>;

beforeEach(() => {
  saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
  for (const k of ENV_KEYS) delete process.env[k];
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

const sampleHerb: HerbProductDoc = {
  id: 'hp-svc-1',
  name: 'Service Test Herb',
  slug: 'service-test-herb',
  sku: 'SPK-SVC-001',
  shortDescription: 'A herb for service-layer tests.',
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
  variants: [{ label: 'Default', sortWeight: 0, price: 50, sku: 'SPK-SVC-001', stock: 1 }],
  rating: 0,
  reviewCount: 0,
  stock: 1,
  status: 'active',
  featured: false,
  bestseller: false,
  newArrival: false,
  tags: [],
  metaTitle: 'Service Test Herb | Spaks Herbs',
  metaDescription: 'A herb for service-layer tests.',
  createdAt: '2026-08-30T00:00:00.000Z',
  updatedAt: '2026-08-30T00:00:00.000Z',
};

const sampleCategory: WellnessCategoryDoc = {
  key: 'svc-test-category',
  label: 'Service Test Category',
  description: 'A wellness category for service-layer tests.',
  icon: 'leaf',
  sortOrder: 0,
  status: 'active',
  createdAt: '2026-09-15T00:00:00.000Z',
  updatedAt: '2026-09-15T00:00:00.000Z',
};

describe('Herbs DB service — unconfigured environment (no MONGODB_* vars set)', () => {
  it('readHerbProductsFromDb returns null rather than throwing', async () => {
    await expect(readHerbProductsFromDb()).resolves.toBeNull();
  });

  it('saveHerbProduct returns persisted:false with an explicit reason', async () => {
    const result = await saveHerbProduct(sampleHerb);
    expect(result.persisted).toBe(false);
    expect(result.reason).toMatch(/no database/i);
  });

  it('deleteHerbProduct returns persisted:false with an explicit reason', async () => {
    const result = await deleteHerbProduct('hp-svc-1');
    expect(result.persisted).toBe(false);
    expect(result.reason).toMatch(/no database/i);
  });

  it('readWellnessCategoriesFromDb returns null rather than throwing', async () => {
    await expect(readWellnessCategoriesFromDb()).resolves.toBeNull();
  });

  it('saveWellnessCategory returns persisted:false with an explicit reason', async () => {
    const result = await saveWellnessCategory(sampleCategory);
    expect(result.persisted).toBe(false);
    expect(result.reason).toMatch(/no database/i);
  });

  it('hideWellnessCategory returns persisted:false with an explicit reason', async () => {
    const result = await hideWellnessCategory('svc-test-category');
    expect(result.persisted).toBe(false);
    expect(result.reason).toMatch(/no database/i);
  });
});

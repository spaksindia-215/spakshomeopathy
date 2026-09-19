/**
 * `ProductRepository.findByDiseaseCategoryIds` tests — CR-006 Phase 5.
 * See that method's own header (`productRepository.ts`) for the full
 * disclosure of why this is additive (does not replace `findByCategory`)
 * and why pre-backfill products are legitimately not found by it.
 *
 * LABEL: FIXTURE. Against `createFakeCrudDb` (`tests/mongodb/fakeDb.ts`),
 * NOT a real MongoDB connection.
 */

import { describe, it, expect } from 'vitest';
import { ProductRepository } from '@/lib/mongodb/repositories/productRepository';
import { productSchema } from '@/lib/mongodb/schemas';
import { validProduct } from './fixtures';
import { createFakeCrudDb } from './fakeDb';
import type { Product } from '@/lib/mongodb/schemas';

const createFakeDb = createFakeCrudDb<Product>;

describe('productSchema.diseaseCategoryIds (CR-006 Phase 5 — additive, optional field)', () => {
  it('validates a pre-existing product document with NO diseaseCategoryIds field at all', () => {
    // Simulates every product migrated before this phase — the field
    // must be .optional(), not defaulted/required, per this codebase's
    // own established "don't tighten validation beyond what's actually
    // populated" convention (see the field's own doc comment).
    expect(() => productSchema.parse(validProduct)).not.toThrow();
    expect(validProduct.diseaseCategoryIds).toBeUndefined();
  });

  it('validates a product with diseaseCategoryIds populated', () => {
    const withField = { ...validProduct, diseaseCategoryIds: [5, 12] };
    const parsed = productSchema.parse(withField);
    expect(parsed.diseaseCategoryIds).toEqual([5, 12]);
  });

  it('validates a product with an empty diseaseCategoryIds array', () => {
    const withEmpty = { ...validProduct, diseaseCategoryIds: [] };
    expect(() => productSchema.parse(withEmpty)).not.toThrow();
  });

  it('rejects a non-integer entry, matching every other legacyId-shaped array in this schema', () => {
    const invalid = { ...validProduct, diseaseCategoryIds: [1.5] };
    expect(() => productSchema.parse(invalid)).toThrow();
  });
});

describe('ProductRepository.findByDiseaseCategoryIds (FIXTURE — fake Db)', () => {
  it('finds a product whose diseaseCategoryIds array contains the given id', async () => {
    const { db } = createFakeDb([{ ...validProduct, diseaseCategoryIds: [10, 20, 30] }]);
    const repo = new ProductRepository(db);

    const results = await repo.findByDiseaseCategoryIds(20);

    expect(results).toHaveLength(1);
    expect(results[0]?.legacyId).toBe(validProduct.legacyId);
  });

  it('does not find a product whose diseaseCategoryIds does not contain the given id', async () => {
    const { db } = createFakeDb([{ ...validProduct, diseaseCategoryIds: [10, 20, 30] }]);
    const repo = new ProductRepository(db);

    const results = await repo.findByDiseaseCategoryIds(99);

    expect(results).toHaveLength(0);
  });

  it('respects the pStatus filter (default 1), matching findByCategory’s own default', async () => {
    const { db } = createFakeDb([{ ...validProduct, diseaseCategoryIds: [10], pStatus: 0 }]);
    const repo = new ProductRepository(db);

    await expect(repo.findByDiseaseCategoryIds(10)).resolves.toHaveLength(0);
    await expect(repo.findByDiseaseCategoryIds(10, 0)).resolves.toHaveLength(1);
  });

  it('does NOT find a pre-backfill product (no diseaseCategoryIds field at all), even if pCat would match — disclosed, expected behavior', async () => {
    // Deliberately does NOT set diseaseCategoryIds — simulates a product
    // that predates the (not-yet-run) backfill script.
    const { db } = createFakeDb([{ ...validProduct, pCat: 5 }]);
    const repo = new ProductRepository(db);

    const results = await repo.findByDiseaseCategoryIds(5);

    expect(results).toHaveLength(0);
  });

  it('findByCategory (pre-existing, unmodified) still finds that same pre-backfill product by pCat', async () => {
    const { db } = createFakeDb([{ ...validProduct, pCat: 5 }]);
    const repo = new ProductRepository(db);

    const results = await repo.findByCategory(5);

    expect(results).toHaveLength(1);
  });
});

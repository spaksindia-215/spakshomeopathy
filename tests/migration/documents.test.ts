/**
 * Tests for getAcceptedDocuments — proves it produces the SAME accepted
 * counts as runPipeline (M3-B), confirming no second transformation
 * implementation was created (owner instruction M3-C §4).
 */

import { describe, it, expect } from 'vitest';
import { getAcceptedDocuments } from '@/lib/migration/documents';
import { runPipeline } from '@/lib/migration/pipeline';
import { COLLECTIONS } from '@/lib/mongodb/collections';
import { SAMPLE_DUMP } from '../migration/fixtures/sample-dump';

describe('getAcceptedDocuments — parity with runPipeline (no second implementation)', () => {
  const documents = getAcceptedDocuments(SAMPLE_DUMP);
  const report = runPipeline(SAMPLE_DUMP);

  it("every entity's accepted-document count matches runPipeline's targetCount exactly", () => {
    const entityToCollection: Record<string, string> = {
      users: COLLECTIONS.users,
      products: COLLECTIONS.products,
      categories: COLLECTIONS.categories,
      productCategories: COLLECTIONS.productCategories,
      orders: COLLECTIONS.orders,
      orderProducts: COLLECTIONS.orderProducts,
      payments: COLLECTIONS.payments,
      appointments: COLLECTIONS.appointments,
      enquiries: COLLECTIONS.enquiries,
      sliders: COLLECTIONS.sliders,
      pinCodes: COLLECTIONS.pinCodes,
      posts: COLLECTIONS.posts,
      homeopathyMaster: COLLECTIONS.homeopathyMaster,
      blogs: COLLECTIONS.blogs,
      blogCategories: COLLECTIONS.blogCategories,
      statezones: COLLECTIONS.statezones,
      cities: COLLECTIONS.cities,
    };

    for (const section of report.entities) {
      const collectionName = entityToCollection[section.entityName];
      expect(collectionName, `no mapping for entity ${section.entityName}`).toBeDefined();
      const docs = documents[collectionName as keyof typeof documents];
      expect(
        docs.length,
        `${section.entityName}: getAcceptedDocuments returned ${docs.length}, runPipeline reported targetCount ${section.targetCount}`
      ).toBe(section.targetCount);
    }
  });

  it('every document carries a legacyId (required for the idempotent upsert write path)', () => {
    for (const [collectionName, docs] of Object.entries(documents)) {
      for (const doc of docs) {
        expect(doc, `a document in ${collectionName} is missing legacyId`).toHaveProperty(
          'legacyId'
        );
      }
    }
  });

  it('the deliberate order-group orphan (orderProducts id=6, groupId=999) is present among the accepted documents, not silently dropped', () => {
    const orderProducts = documents[COLLECTIONS.orderProducts];
    const orphan = orderProducts.find((op) => op.legacyId === 6);
    expect(orphan).toBeDefined();
    expect(orphan?.groupId).toBe(999);
  });

  it('orders.orderId is a number and payments.orderId is a string in the generated documents (not just the schema)', () => {
    const order = documents[COLLECTIONS.orders].find((o) => o.groupId === 100);
    const payment = documents[COLLECTIONS.payments].find((p) => p.gid === 100);
    expect(typeof order?.orderId).toBe('number');
    expect(typeof payment?.orderId).toBe('string');
  });
});

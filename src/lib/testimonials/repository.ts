/**
 * `testimonials` collection data access. Extends `ValidatedRepository`,
 * same shape as `src/lib/diseases/repository.ts`.
 */

import type { Db } from 'mongodb';
import { ValidatedRepository } from '@/lib/mongodb/repositories/base';
import { testimonialSchema, type Testimonial, type TestimonialSection } from './schema';

export const TESTIMONIALS_COLLECTION = 'testimonials';

export class TestimonialRepository extends ValidatedRepository<Testimonial> {
  constructor(db: Db) {
    super(db, TESTIMONIALS_COLLECTION, testimonialSchema);
  }

  async findAllDescending(): Promise<Testimonial[]> {
    const docs = await this.find({});
    return [...docs].sort((a, b) => b.legacyId - a.legacyId);
  }

  /** `status === 1` AND tagged for `section` — what a public page renders. */
  async findActiveForSection(section: TestimonialSection): Promise<Testimonial[]> {
    const docs = await this.findAllDescending();
    return docs.filter((doc) => doc.status === 1 && doc.sections.includes(section));
  }

  async findByLegacyId(legacyId: number): Promise<Testimonial | null> {
    return this.findOne({ legacyId });
  }

  async insertTestimonial(doc: Testimonial): Promise<Testimonial> {
    return this.insertOne(doc);
  }

  async updateTestimonial(
    legacyId: number,
    fields: Partial<Omit<Testimonial, 'legacyId' | 'createdAt'>>
  ): Promise<void> {
    await this.updateOne({ legacyId }, fields as Partial<Testimonial>);
  }

  async deleteTestimonial(legacyId: number): Promise<void> {
    await this.deleteOne({ legacyId });
  }
}

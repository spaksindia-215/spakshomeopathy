/**
 * `partnerProfiles` data access. See `schemas/partnerProfile.ts` — a
 * genuinely new collection (Partner Panel feature), no Laravel source to
 * mirror. Follows `categoryRepository.ts`'s established shape for a small,
 * additive repository.
 */

import type { Db } from 'mongodb';
import { ValidatedRepository } from './base';
import { COLLECTIONS } from '../collections';
import { partnerProfileSchema, type PartnerProfile } from '../schemas';

export class PartnerProfileRepository extends ValidatedRepository<PartnerProfile> {
  constructor(db: Db) {
    super(db, COLLECTIONS.partnerProfiles, partnerProfileSchema);
  }

  async findByUserId(userId: number): Promise<PartnerProfile | null> {
    return this.findOne({ userId });
  }

  async insertProfile(doc: PartnerProfile): Promise<PartnerProfile> {
    return this.insertOne(doc);
  }
}

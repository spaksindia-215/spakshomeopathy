/**
 * `videos` collection data access. Extends `ValidatedRepository`, same
 * shape as `src/lib/diseases/repository.ts`.
 */

import type { Db } from 'mongodb';
import { ValidatedRepository } from '@/lib/mongodb/repositories/base';
import { videoSchema, type Video } from './schema';

export const VIDEOS_COLLECTION = 'videos';

export class VideoRepository extends ValidatedRepository<Video> {
  constructor(db: Db) {
    super(db, VIDEOS_COLLECTION, videoSchema);
  }

  async findAllDescending(): Promise<Video[]> {
    const docs = await this.find({});
    return [...docs].sort((a, b) => b.legacyId - a.legacyId);
  }

  /** `status === 1` only — what the public `/video` page renders. */
  async findActiveDescending(): Promise<Video[]> {
    const docs = await this.findAllDescending();
    return docs.filter((doc) => doc.status === 1);
  }

  async findByLegacyId(legacyId: number): Promise<Video | null> {
    return this.findOne({ legacyId });
  }

  async insertVideo(doc: Video): Promise<Video> {
    return this.insertOne(doc);
  }

  async updateVideo(
    legacyId: number,
    fields: Partial<Omit<Video, 'legacyId' | 'createdAt'>>
  ): Promise<void> {
    await this.updateOne({ legacyId }, fields as Partial<Video>);
  }

  async deleteVideo(legacyId: number): Promise<void> {
    await this.deleteOne({ legacyId });
  }
}

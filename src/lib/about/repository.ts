/**
 * `aboutPage` collection data access — same shape as
 * `src/lib/settings/repository.ts`'s `SettingsRepository`/`getSiteSettings`
 * (single fixed-key document, defaults-merged read helper).
 */

import type { Db } from 'mongodb';
import { ValidatedRepository } from '@/lib/mongodb/repositories/base';
import { aboutPageSchema, DEFAULT_ABOUT_PAGE, ABOUT_PAGE_KEY, type AboutPageDoc } from './schema';

export const ABOUT_PAGE_COLLECTION = 'aboutPage';

export class AboutPageRepository extends ValidatedRepository<AboutPageDoc> {
  constructor(db: Db) {
    super(db, ABOUT_PAGE_COLLECTION, aboutPageSchema);
  }

  async findAbout(): Promise<AboutPageDoc | null> {
    return this.findOne({ key: ABOUT_PAGE_KEY });
  }

  async upsert(doc: AboutPageDoc): Promise<AboutPageDoc> {
    const validated = this.validate(doc);
    await this.collection.updateOne({ key: validated.key }, { $set: validated }, { upsert: true });
    await this.logMutation('update', validated.key);
    return validated;
  }
}

/** Effective About content for public rendering — saved doc merged over
 * `DEFAULT_ABOUT_PAGE`, same fallback strategy as `getSiteSettings()`. */
export async function getAboutPage(db: Db): Promise<Omit<AboutPageDoc, 'updatedAt'>> {
  const repo = new AboutPageRepository(db);
  const saved = await repo.findAbout();
  if (saved === null) return DEFAULT_ABOUT_PAGE;
  return { ...DEFAULT_ABOUT_PAGE, ...saved };
}

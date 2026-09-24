/**
 * `settings` collection data access. Extends `ValidatedRepository` — same
 * reuse rationale as every other repository in this codebase. Uses the
 * main application database (via `@/lib/mongodb/client`'s `getDb()`), same
 * as `PageRepository`.
 */

import type { Db } from 'mongodb';
import { ValidatedRepository } from '@/lib/mongodb/repositories/base';
import {
  siteSettingsSchema,
  DEFAULT_SETTINGS,
  SITE_SETTINGS_KEY,
  type SiteSettingsDoc,
} from './schema';

export const SETTINGS_COLLECTION = 'settings';

export class SettingsRepository extends ValidatedRepository<SiteSettingsDoc> {
  constructor(db: Db) {
    super(db, SETTINGS_COLLECTION, siteSettingsSchema);
  }

  /** Raw read — `null` when no admin has ever saved settings. Callers that
   * need the public-facing effective values should use the module-level
   * `getSiteSettings()` helper instead, which fills in the defaults. */
  async findSite(): Promise<SiteSettingsDoc | null> {
    return this.findOne({ key: SITE_SETTINGS_KEY });
  }

  /** Insert-or-replace keyed by the constant `key` — same upsert-by-own-id
   * shape as `PageRepository.upsert`. */
  async upsert(doc: SiteSettingsDoc): Promise<SiteSettingsDoc> {
    const validated = this.validate(doc);
    await this.collection.updateOne({ key: validated.key }, { $set: validated }, { upsert: true });
    await this.logMutation('update', validated.key);
    return validated;
  }
}

/**
 * Effective site settings for public-page rendering: whatever the admin
 * has saved, with `DEFAULT_SETTINGS` filling in any field that hasn't
 * been saved yet (or the whole document, if none exists). Every public
 * component that used to hardcode contact/footer text should call this
 * instead, so a partially-filled settings row never blanks out a field
 * that still needs to show today's original copy.
 */
export async function getSiteSettings(db: Db): Promise<Omit<SiteSettingsDoc, 'updatedAt'>> {
  const repo = new SettingsRepository(db);
  const saved = await repo.findSite();
  if (saved === null) return DEFAULT_SETTINGS;
  return { ...DEFAULT_SETTINGS, ...saved };
}

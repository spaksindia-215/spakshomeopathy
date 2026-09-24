/**
 * Zod schema for the `settings` MongoDB collection — site-wide contact
 * info, social links, and footer copy.
 *
 * GENUINELY NEW, NO LARAVEL TABLE TO TRACE TO: production's header/footer
 * (`inc/header.blade.php`, `inc/footer.blade.php`) hardcode this content
 * directly in the Blade markup — there was never a settings table or admin
 * screen for it. Deliberately NOT added to `src/lib/mongodb/schemas/` /
 * `collections.ts` — same reasoning `src/lib/pages/schema.ts` gives for
 * `pages`: those files are a governed, 1:1-traced artifact of the legacy
 * MariaDB schema, and this collection has no such table.
 *
 * SINGLE-DOCUMENT COLLECTION: exactly one row, keyed by the constant
 * `SITE_SETTINGS_KEY`, mirroring the fixed-row shape `pages` already
 * established (there, `slug` is the fixed key per row; here there is only
 * ever one row, so `key` is a constant literal, not a free string).
 *
 * Every field is optional at the schema level with an application-level
 * fallback to today's exact hardcoded text — `getSiteSettings()` in
 * `repository.ts` returns `DEFAULT_SETTINGS` merged with whatever partial
 * document exists (or no document at all). This means an admin can edit
 * one field without needing every other field pre-filled, and the public
 * pages that consume this render EXACTLY today's copy until an admin
 * actually changes something (contract NN-5's byte-parity requirement,
 * satisfied via matching defaults rather than by leaving the pages
 * hardcoded).
 */

import { z } from 'zod';

export const SITE_SETTINGS_KEY = 'site' as const;

export const siteSettingsSchema = z.object({
  key: z.literal(SITE_SETTINGS_KEY),
  contactEmail: z.string(),
  contactPhone: z.string(),
  contactPhoneDialable: z.string(),
  address: z.string(),
  companyName: z.string(),
  footerAboutText: z.string(),
  copyrightText: z.string(),
  facebookUrl: z.string(),
  instagramUrl: z.string(),
  youtubeUrl: z.string(),
  twitterUrl: z.string(),
  pinterestUrl: z.string(),
  updatedAt: z.string(),
});

export type SiteSettingsDoc = z.infer<typeof siteSettingsSchema>;

/** Today's exact production text — see `PublicHeader.tsx`/`PublicFooter.tsx`/
 * `contact/page.tsx` headers for the byte-parity verification each of
 * these values is copied from. Used both as the Mongo document inserted
 * the first time settings are saved, and as the in-memory fallback when
 * no document exists yet (so public pages never render blank fields). */
export const DEFAULT_SETTINGS: Omit<SiteSettingsDoc, 'updatedAt'> = {
  key: SITE_SETTINGS_KEY,
  contactEmail: 'spakshomeopathy@gmail.com',
  contactPhone: '+91 8700458818',
  contactPhoneDialable: '8700458818',
  address: 'E-38, Budh Vihar, Badarpur, New Delhi 110044',
  companyName: 'Spaks India Business Solution Pvt Ltd',
  footerAboutText:
    'We are here to help you find the answers and make the most of your potential. As the first step, get in touch with us.',
  copyrightText: '© 2020 spakshomeopathy | All Right Reserved',
  facebookUrl: 'https://www.facebook.com/spaks.homeopathy.16',
  instagramUrl: 'https://www.instagram.com/spakshomeopathy38/',
  youtubeUrl: 'https://www.youtube.com/channel/UCheXjhoIQFgLMyOY027cGEQ',
  twitterUrl: '',
  pinterestUrl: '',
};

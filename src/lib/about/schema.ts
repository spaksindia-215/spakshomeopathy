/**
 * Zod schema for the `aboutPage` MongoDB collection.
 *
 * GENUINELY NEW, NO LARAVEL TABLE TO TRACE TO: `about.blade.php`'s content
 * is plain hardcoded markup, same as `terms`/`privacy-policy`/
 * `return-policy` were before `src/lib/pages/schema.ts` (see that file's
 * header). About was deliberately EXCLUDED from that raw-HTML-blob `pages`
 * collection — its layout (two rich-text sections + image, a clinic
 * address block, a doctor-credentials block with two CTA buttons) doesn't
 * reduce to one "content body" region without losing structure an admin
 * would reasonably want to keep editing independently (e.g. changing the
 * clinic phone number without touching the prose). This collection gives
 * each of those regions its own field instead of one HTML blob.
 *
 * SINGLE-DOCUMENT COLLECTION, same shape as `src/lib/settings/schema.ts`'s
 * `settings` collection: exactly one row, keyed by the constant
 * `ABOUT_PAGE_KEY`.
 *
 * `introParagraphs`/`secondaryParagraphs` are `string[]` (one entry per
 * `<p>` in the source layout) rather than a single HTML blob — simpler for
 * a plain-textarea admin form than reproducing rich-text paragraph breaks
 * inside one field, and keeps each paragraph individually editable/
 * reorderable in a later phase if wanted.
 */

import { z } from 'zod';

export const ABOUT_PAGE_KEY = 'about' as const;

export const aboutPageSchema = z.object({
  key: z.literal(ABOUT_PAGE_KEY),
  heading: z.string(),
  introParagraphs: z.array(z.string()),
  subheading: z.string(),
  secondaryParagraphs: z.array(z.string()),
  heroImage: z.string(),
  clinicName: z.string(),
  clinicAddress: z.string(),
  clinicPhone: z.string(),
  doctorName: z.string(),
  doctorCredentials: z.string(),
  videoAppointmentUrl: z.string(),
  clinicAppointmentUrl: z.string(),
  updatedAt: z.string(),
});

export type AboutPageDoc = z.infer<typeof aboutPageSchema>;

/** Today's exact production text — copied verbatim from `about/page.tsx`
 * before this feature wired it up. Used as both the fallback when no
 * document exists yet, and to pre-fill the admin form the first time. */
export const DEFAULT_ABOUT_PAGE: Omit<AboutPageDoc, 'updatedAt'> = {
  key: ABOUT_PAGE_KEY,
  heading: 'Spaks India Business Solution Pvt. Ltd. – Trusted Homeopathy Clinic in India',
  introParagraphs: [
    'Spaks India Business Solution Pvt. Ltd. is a trusted name in holistic healthcare, providing the best homeopathic treatment through safe, natural, and personalized homeopathy medicines. Under the brand Spaks Homeopathy, we are committed to delivering high-quality homeopathic care to patients across India and worldwide.',
    'Spaks Homeopathy is recognized as one of the leading online homeopathy resources, offering reliable treatment guidance, consultation services, and homeopathy medicines to thousands of patients every year. Our platform has been successfully serving patients since 2015, making us a trusted destination for online and clinic-based homeopathic treatment.',
  ],
  subheading: 'Best Homeopathy Clinic in Delhi NCR, India',
  secondaryParagraphs: [
    'At Spaks Homeopathy Clinic India, our team consists of some of the best homeopathic doctors in Delhi NCR, India. Our experienced and qualified homeopathy specialists focus on treating the root cause of disease, not just the visible symptoms.',
    'We strongly believe in providing the best homeopathic treatment for chronic diseases, especially conditions that do not respond effectively to conventional allopathic medicines. Each patient receives an individualized treatment plan based on their physical condition, medical history, lifestyle, and emotional well-being.',
  ],
  heroImage: 'assets/images/about1.jpg',
  clinicName: 'Spaks Homeopathy',
  clinicAddress: 'E-38, Budh Vihar Rd,\nBadarpur Extension,\nTajpur, Badarpur, New Delhi - 110044',
  clinicPhone: '+91-87004 58818',
  doctorName: 'DR. SK MEENA',
  doctorCredentials: 'BHMS , MD (Homeopathy)',
  videoAppointmentUrl: '#',
  clinicAppointmentUrl: 'http://www.spakshomeopathy.com/consultancy',
};

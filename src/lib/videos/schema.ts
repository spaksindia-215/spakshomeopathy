/**
 * Zod schema for the `videos` MongoDB collection — the YouTube embeds on
 * `/video` (singular; NOT `/videos`, plural, which is a separate,
 * contract-governed "broken by design" page, B-01 — see
 * `src/app/videos/page.tsx`'s header. This collection/CRUD has nothing to
 * do with that route and must never be wired into it).
 *
 * GENUINELY NEW, NO LARAVEL TABLE TO TRACE TO: `video.blade.php`'s 6
 * embeds are hardcoded `<iframe>` blocks (see `src/app/video/page.tsx`'s
 * header) — there was never a database table or admin screen for this
 * content.
 *
 * `youtubeVideoId` (not a full URL) is stored — the public page builds
 * the `https://www.youtube.com/embed/{id}` src itself, same normalization
 * approach as storing a slider's bare filename rather than a full path.
 * Keeps the admin form's input format simple (paste the 11-character
 * video id, or a full watch/share URL — `save-video`/`update-video`
 * extract the id from either) without over-constraining what an admin
 * can paste in.
 */

import { z } from 'zod';
import { legacyIdSchema } from '@/lib/mongodb/schemas/common';

export const videoSchema = z.object({
  legacyId: legacyIdSchema,
  title: z.string().min(1),
  youtubeVideoId: z.string().min(1),
  status: z.number().int(), // 1 = active/shown, 0 = inactive/hidden
  createdAt: z.date().nullable(),
  updatedAt: z.date().nullable(),
});

export type Video = z.infer<typeof videoSchema>;

/** Accepts a bare 11-character YouTube video id, or a full watch/share/
 * embed URL, and extracts the id either way — so an admin can paste
 * whatever YouTube gives them without needing to know the id format. */
export function extractYoutubeVideoId(input: string): string | null {
  const trimmed = input.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(trimmed)) return trimmed;

  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtube\.com\/embed\/|youtu\.be\/)([A-Za-z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match && match[1]) return match[1];
  }
  return null;
}

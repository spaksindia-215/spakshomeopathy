import type { MetadataRoute } from 'next';
import { getAppConfig } from '@/lib/env';
import { readHerbProductsFromDb, isHerbsDbConfigured } from '@/lib/herbs/db';

/**
 * `/sitemap.xml` — CR-006 Phase 8 (`docs/CR-006-PHASE-8-PLAN.md` §2.2).
 * GENUINELY NEW: nothing generates a sitemap anywhere in this project
 * today (confirmed absent from both the Laravel source and this Next.js
 * app before this phase). Uses Next.js App Router's built-in
 * `MetadataRoute.Sitemap` convention — this one file is automatically
 * served at `/sitemap.xml`, no separate route needed.
 *
 * DELIBERATELY NARROW COVERAGE, NOT AN OVERSIGHT: only lists URLs this
 * phase can vouch for as accurate —
 *   1. The 4 static pages (3 made CMS-editable in Phase 7, plus
 *      `/about`, which stayed hardcoded but is still a real, live page).
 *   2. Herb product pages, since `HerbProductRepository` is the one
 *      catalog surface that is ALREADY live-wired to real MongoDB with
 *      correct, current slugs and `updatedAt` timestamps.
 * Product/post/category URLs are DEFERRED — most of those pages are
 * still `@/lib/demo`-backed (Phase 4/5's own disclosed, not-yet-live-
 * wired state), and listing demo-catalog slugs in a REAL sitemap would
 * advertise URLs to Google that don't correspond to any real database
 * record — a worse outcome than a smaller, wholly-accurate sitemap.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let baseUrl = 'http://localhost:3000';
  try {
    baseUrl = getAppConfig().url;
  } catch {
    // APP_URL unset — falls back to the placeholder above rather than
    // throwing and breaking sitemap generation entirely.
  }

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/about`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/terms`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/privacy-policy`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/return-policy`, changeFrequency: 'yearly', priority: 0.3 },
  ];

  const herbPages: MetadataRoute.Sitemap = [];
  if (isHerbsDbConfigured()) {
    const herbs = await readHerbProductsFromDb();
    for (const herb of herbs ?? []) {
      herbPages.push({
        url: `${baseUrl}/herbs/product/${herb.slug}`,
        lastModified: herb.updatedAt,
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    }
  }

  return [...staticPages, ...herbPages];
}

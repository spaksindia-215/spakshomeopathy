/**
 * Post / homeopathyMaster demo-data accessors. See products.ts's header
 * for the general rationale. No `PostRepository`/`HomeopathyMasterRepository`
 * exists yet in src/lib/mongodb/repositories/ (posts/homeopathyMaster had
 * schemas but no repository as of M4-PREP) — these accessor names are
 * chosen to match what such a repository would plausibly expose, so a
 * future repository addition can adopt the same shape.
 *
 * DATA SOURCE: `posts.generated.ts`/`homeopathyMaster.generated.ts`,
 * produced by scripts/generate-demo-fixtures.ts from the REAL SQL dump.
 * Posts are a bounded curated slice (15 of 414 real rows, not invented);
 * homeopathyMaster is the full real table (small).
 */

import { DEMO_POSTS } from './posts.generated';
import { DEMO_HOMEOPATHY_MASTER } from './homeopathyMaster.generated';
import type { Post, HomeopathyMaster } from '../mongodb/schemas';

export function getAllPosts(): Post[] {
  return DEMO_POSTS;
}

/** Mirrors `HomeController@DiseasesDetails`: posts filtered by diseaseId,
 * post_status=1. */
export function getPostsByDisease(diseaseId: number, status = 1): Post[] {
  return DEMO_POSTS.filter((p) => p.diseaseId === diseaseId && p.postStatus === status);
}

/** Mirrors `HomeController@PostDetails`: posts filtered by homeopathyId. */
export function getPostsByHomeopathy(homeopathyId: number): Post[] {
  return DEMO_POSTS.filter((p) => p.homeopathyId === homeopathyId);
}

export function getPostByPId(pId: string): Post | undefined {
  return DEMO_POSTS.find((p) => p.pId === pId);
}

/** Added for admin's `/admin/edit-post/[post_id]` — the real route's
 * `{post_id}` param is the row's own id (legacyId), NOT `pId` (a
 * varchar(400) free-text field despite the similar name — see
 * schemas/post.ts's own header). Public site never needed this lookup. */
export function getPostByLegacyId(legacyId: number): Post | undefined {
  return DEMO_POSTS.find((p) => p.legacyId === legacyId);
}

export function getAllHomeopathyMaster(): HomeopathyMaster[] {
  return DEMO_HOMEOPATHY_MASTER;
}

export function getHomeopathyMasterBySlug(slug: string): HomeopathyMaster | undefined {
  return DEMO_HOMEOPATHY_MASTER.find((h) => h.slug === slug);
}

export function getHomeopathyMasterByLegacyId(legacyId: number): HomeopathyMaster | undefined {
  return DEMO_HOMEOPATHY_MASTER.find((h) => h.legacyId === legacyId);
}

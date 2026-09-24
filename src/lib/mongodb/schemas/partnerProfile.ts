/**
 * `partnerProfiles` collection schema.
 *
 * GENUINELY NEW — no MariaDB source table. Added for the Partner Panel
 * feature: partners are `users` documents with `utype=5` (see
 * `schemas/user.ts`), and this collection holds the minimal additional
 * profile data needed to identify a partner beyond the base `users` fields
 * already shared with every account type. Modeled on `sellerProfile.ts`'s
 * shape (a separate collection referencing `users.legacyId`, not embedded),
 * since partner data — like seller data — is never read alongside a user
 * record in the same query path as buyer profile data is.
 */

import { z } from 'zod';
import { legacyIdSchema, nullableStringSchema, timestampSchema } from './common';

export const partnerProfileSchema = z.object({
  legacyId: legacyIdSchema,

  /** References `users.legacyId` for the partner account this profile belongs to. */
  userId: legacyIdSchema,

  businessName: nullableStringSchema,
  phone: nullableStringSchema,

  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export type PartnerProfile = z.infer<typeof partnerProfileSchema>;

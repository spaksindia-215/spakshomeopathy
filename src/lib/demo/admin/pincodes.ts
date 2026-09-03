/**
 * Admin Pincodes demo-data accessors — backs `/admin/pin-code-list`,
 * `/admin/add-pin-code`, `/admin/edit-pincode/[id]`.
 *
 * Full real table — exactly 1 row in production, rendered honestly, not
 * padded. Field names match the REAL `pin_codes` table columns
 * (`pincode`/`location`/`status` per `schemas/pinCode.ts`'s own header),
 * not the broken admin controller's write-path column names
 * (`pin_code`/`pin_address`/`pin_status`) — see that schema's DR-03/B-09
 * note for the full context; this file only reads, it does not decide
 * DR-03's outcome.
 */

import { DEMO_ADMIN_PINCODES } from './pincodes.generated';
import type { PinCode } from '../../mongodb/schemas';

export function getAllAdminPinCodes(): PinCode[] {
  return DEMO_ADMIN_PINCODES;
}

export function getAdminPinCodeByLegacyId(legacyId: number): PinCode | undefined {
  return DEMO_ADMIN_PINCODES.find((p) => p.legacyId === legacyId);
}

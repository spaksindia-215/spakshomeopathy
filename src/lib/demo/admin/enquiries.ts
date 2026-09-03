/**
 * Admin Enquiries demo-data accessors — backs `/admin/enquires-list`
 * (misspelling intentionally preserved in the route/folder name, matching
 * `AdminController@getEnquiry`'s real route `enquires-list`) and
 * `/admin/view-enquiry/[id]`.
 */

import { DEMO_ADMIN_ENQUIRIES } from './enquiries.generated';
import type { Enquiry } from '../../mongodb/schemas';

export function getAllAdminEnquiries(): Enquiry[] {
  return DEMO_ADMIN_ENQUIRIES;
}

export function getAdminEnquiryByLegacyId(legacyId: number): Enquiry | undefined {
  return DEMO_ADMIN_ENQUIRIES.find((e) => e.legacyId === legacyId);
}
